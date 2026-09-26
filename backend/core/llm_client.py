"""
Claude API client for the Samajh backend.

Two public async callables:
  analyze_text_llm()      — structured JSON output for the /analyze pipeline
  stream_chat_response()  — async generator yielding text chunks for SSE /chat

Both respect MOCK_LLM: when True (the default), they return canned responses
without touching the Anthropic API so development stays zero-cost.
"""

from __future__ import annotations

import dataclasses
import json
import logging
from collections.abc import AsyncGenerator
from typing import Optional

import anthropic

from core.config import settings
from models.schemas import (
    AnalysisResponse,
    IdiomMatchSchema,
    ScriptMetadata,
    ThreeTierBreakdown,
    TokenClassification,
)
from prompts.analysis_prompt import SYSTEM_PROMPT, build_user_payload

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Mock responses — realistic enough for UI development without API calls
# ---------------------------------------------------------------------------

_MOCK_ANALYSIS_TEXT = "chai shai peena hai yaar"

_MOCK_ANALYSIS = AnalysisResponse(
    original_text=_MOCK_ANALYSIS_TEXT,
    preprocessed_text=_MOCK_ANALYSIS_TEXT,
    script_metadata=ScriptMetadata(
        latin_pct=100.0,
        devanagari_pct=0.0,
        arabic_urdu_pct=0.0,
        other_pct=0.0,
        english_pct=0.0,
        vernacular_pct=80.0,
        non_latin_pct=0.0,
        ambiguous_pct=20.0,
        has_devanagari=False,
        has_arabic_urdu=False,
        echo_reduplications=["chai shai"],
        preprocessor_changes=[],
    ),
    matched_idioms=[
        IdiomMatchSchema(
            phrase="chai shai",
            canonical_form="chai (aur kuch bhi)",
            literal="tea and such things",
            pragmatic_intent=(
                "Casual invitation for tea or a relaxed social break. "
                "Signals low-pressure hospitality."
            ),
            cultural_note=(
                "Echo reduplication in South Asian languages signals casual "
                "plurality and informality. 'Shai' carries no independent meaning."
            ),
            category="reduplication",
            matched_text="chai shai",
            token_color="purple",
        )
    ],
    tokens=[
        TokenClassification(
            token="chai",
            category="vernacular",
            explanation="Transliterated Hindi/Urdu word for tea; core vernacular vocabulary.",
        ),
        TokenClassification(
            token="shai",
            category="reduplication",
            explanation=(
                "Echo rhyme of 'chai' with no independent meaning; "
                "signals casual plurality in the X-shayi pattern."
            ),
        ),
        TokenClassification(
            token="peena",
            category="vernacular",
            explanation="Hindi infinitive 'to drink'; standard transliterated vernacular.",
        ),
        TokenClassification(
            token="hai",
            category="vernacular",
            explanation="Hindi copula 'is/are'; ubiquitous in Hinglish.",
        ),
        TokenClassification(
            token="yaar",
            category="vernacular",
            explanation=(
                "Intimate address term (friend/buddy); "
                "signals informal register and close relationship."
            ),
        ),
    ],
    three_tier=ThreeTierBreakdown(
        literal_translation="Tea and such things to drink is, friend.",
        pragmatic_intent=(
            "A casual, low-pressure invitation to pause and have tea together. "
            "The speaker is signaling they want company or a break from activity."
        ),
        cultural_subtext=(
            "The 'chai shai' echo reduplication marks intimate, informal register "
            "and is distinctly pan-South-Asian. 'Yaar' confirms close friendship. "
            "The combination reads as an unspoken invitation — the speaker would "
            "welcome you joining them but won't press the point."
        ),
    ),
    register_tone="Casual / Friendly",
)

_MOCK_CHAT_REPLY = (
    "arre yaar, bilkul! chai shai toh banta hai — "
    "kya scene hai aaj? "
    "bata, kuch interesting chal raha hai kya?"
)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _idiom_match_to_dict(m) -> dict:
    """Convert an IdiomMatch dataclass (from idiom_retriever) to a plain dict."""
    if dataclasses.is_dataclass(m) and not isinstance(m, type):
        return dataclasses.asdict(m)
    return dict(m)  # already a dict or Pydantic model


def _get_client() -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)


def _is_mock() -> bool:
    return settings.mock_llm or not settings.anthropic_api_key


# ---------------------------------------------------------------------------
# Analysis call — structured JSON output
# ---------------------------------------------------------------------------

async def analyze_text_llm(
    raw_text: str,
    preprocessed_text: str,
    script_metadata: ScriptMetadata,
    matched_idioms: list,
    echo_reduplications: list[str],
    preprocessor_changes: list[dict],
) -> AnalysisResponse:
    """
    Run the LLM analysis step of the Samajh pipeline.

    In mock mode (MOCK_LLM=True or no API key), returns a canned AnalysisResponse
    instantly with zero cost.  In live mode, calls Claude with the structured
    JSON system prompt and parses the response into AnalysisResponse.

    Args:
        raw_text:             Original user input.
        preprocessed_text:    Text after preprocessor.py normalisations.
        script_metadata:      ScriptMetadata object from script_detector.py.
        matched_idioms:       List of IdiomMatch dataclasses from idiom_retriever.py.
        echo_reduplications:  Echo phrases detected by script_detector.py.
        preprocessor_changes: Change-log dicts from preprocessor.py.

    Returns:
        A fully populated AnalysisResponse.
    """
    if _is_mock():
        logger.debug("analyze_text_llm: mock mode — returning canned response")
        mock = _MOCK_ANALYSIS.model_copy(deep=True)
        mock.original_text = raw_text
        mock.preprocessed_text = preprocessed_text
        mock.script_metadata = script_metadata
        return mock

    idioms_as_dicts = [_idiom_match_to_dict(m) for m in matched_idioms]
    user_payload = build_user_payload(
        raw_text=raw_text,
        preprocessed_text=preprocessed_text,
        script_meta=script_metadata.model_dump(),
        matched_idioms=idioms_as_dicts,
        echo_reduplications=echo_reduplications,
        preprocessor_changes=preprocessor_changes,
    )

    try:
        client = _get_client()
        response = await client.messages.create(
            model=settings.model_id,
            max_tokens=settings.max_tokens,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_payload}],
        )

        raw_json = response.content[0].text.strip()
        # Strip markdown code fences Claude sometimes wraps around JSON
        if raw_json.startswith("```"):
            raw_json = raw_json.split("\n", 1)[1] if "\n" in raw_json else raw_json
            raw_json = raw_json.rsplit("```", 1)[0].strip()
        data = json.loads(raw_json)

        # Build IdiomMatchSchema list from matched_idioms (already deterministic)
        idiom_schemas = [
            IdiomMatchSchema(**_idiom_match_to_dict(m)) for m in matched_idioms
        ]

        return AnalysisResponse(
            original_text=raw_text,
            preprocessed_text=preprocessed_text,
            script_metadata=script_metadata,
            matched_idioms=idiom_schemas,
            tokens=[TokenClassification(**t) for t in data["tokens"]],
            three_tier=ThreeTierBreakdown(**data["three_tier"]),
            register_tone=data["register_tone"],
        )

    except Exception as exc:
        logger.error("analyze_text_llm failed: %s — falling back to mock", exc)
        mock = _MOCK_ANALYSIS.model_copy(deep=True)
        mock.original_text = raw_text
        mock.preprocessed_text = preprocessed_text
        mock.script_metadata = script_metadata
        return mock


# ---------------------------------------------------------------------------
# Chat call — streaming SSE
# ---------------------------------------------------------------------------

async def stream_chat_response(
    message: str,
    history: list,
    previous_breakdown: Optional[dict] = None,
) -> AsyncGenerator[str, None]:
    """
    Async generator that yields text chunks for the SSE /chat endpoint.

    In mock mode, yields a canned Hinglish reply word-by-word to simulate
    streaming.  In live mode, streams from Claude using the chat system prompt.

    Args:
        message:            The user's new message (guardrail-cleaned).
        history:            Prior ChatMessage objects, oldest first.
        previous_breakdown: Optional AnalysisResponse dict from the dashboard.
    """
    from prompts.chat_prompt import CHAT_SYSTEM_PROMPT, build_chat_messages

    if _is_mock():
        logger.debug("stream_chat_response: mock mode — yielding canned reply")
        for chunk in _MOCK_CHAT_REPLY.split(" "):
            yield chunk + " "
        return

    messages = build_chat_messages(
        user_message=message,
        previous_breakdown=previous_breakdown,
        chat_history=history,
    )

    try:
        client = _get_client()
        async with client.messages.stream(
            model=settings.model_id,
            max_tokens=settings.chat_max_tokens,
            system=CHAT_SYSTEM_PROMPT,
            messages=messages,
        ) as stream:
            async for text in stream.text_stream:
                yield text

    except Exception as exc:
        logger.error("stream_chat_response failed: %s — yielding mock reply", exc)
        for chunk in _MOCK_CHAT_REPLY.split(" "):
            yield chunk + " "
