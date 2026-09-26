"""
Pipeline orchestrator for the Samajh analysis pipeline.

Wires all deterministic steps (preprocessor → script detector → idiom retriever)
into a single async function that feeds their outputs to the LLM analysis call.
This is the only file that imports from every pipeline module — routers only
import `run_pipeline` and `run_chat_stream` from here.

Pipeline order:
  Step 1 — Guardrails       (core/guardrails.py)
  Step 2 — Preprocessor     (core/preprocessor.py)
  Step 3 — Script Detector  (core/script_detector.py)
  Step 4 — Idiom Retriever  (core/idiom_retriever.py)
  Step 5 — LLM Analysis     (core/llm_client.py)
"""

from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from typing import Optional

from core.guardrails import input_guardrail
from core.idiom_retriever import get_reduplication_phrases, retrieve_from_text
from core.llm_client import analyze_text_llm, stream_chat_response
from core.preprocessor import preprocess
from core.script_detector import detect
from models.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    ChatMessage,
    IdiomMatchSchema,
    ScriptMetadata,
)

logger = logging.getLogger(__name__)


async def run_pipeline(request: AnalysisRequest) -> AnalysisResponse:
    """
    Execute the full 5-step Samajh analysis pipeline.

    Args:
        request: Validated AnalysisRequest from the /analyze endpoint.

    Returns:
        A fully populated AnalysisResponse (deterministic fields + LLM output).

    Raises:
        HTTPException: If guardrails reject the input (propagated from step 1).
    """
    # ------------------------------------------------------------------
    # Step 1 — Guardrails
    # ------------------------------------------------------------------
    clean_text = input_guardrail(request.text)
    logger.debug("pipeline step 1 done | length=%d", len(clean_text))

    # ------------------------------------------------------------------
    # Step 2 — Phonetic Pre-processor
    # ------------------------------------------------------------------
    preprocessor_result = preprocess(clean_text)
    preprocessed_text = preprocessor_result.normalized
    changes_as_dicts = [
        {
            "original": c.original,
            "normalized": c.normalized,
            "rule": c.rule,
            "position": c.position,
        }
        for c in preprocessor_result.changes
    ]
    logger.debug(
        "pipeline step 2 done | changes=%d", len(preprocessor_result.changes)
    )

    # ------------------------------------------------------------------
    # Step 3 — Script & Structure Detector
    # ------------------------------------------------------------------
    known_reduplications = get_reduplication_phrases()
    detector_result = detect(preprocessed_text, known_reduplications)

    echo_phrases = [m.phrase for m in detector_result.echo_matches]

    script_metadata = ScriptMetadata(
        latin_pct=detector_result.script_stats.latin_pct,
        devanagari_pct=detector_result.script_stats.devanagari_pct,
        arabic_urdu_pct=detector_result.script_stats.arabic_urdu_pct,
        other_pct=detector_result.script_stats.other_pct,
        english_pct=detector_result.language_proportion.english_pct,
        vernacular_pct=detector_result.language_proportion.vernacular_pct,
        non_latin_pct=detector_result.language_proportion.non_latin_pct,
        ambiguous_pct=detector_result.language_proportion.ambiguous_pct,
        has_devanagari=detector_result.has_devanagari,
        has_arabic_urdu=detector_result.has_arabic_urdu,
        echo_reduplications=echo_phrases,
        preprocessor_changes=changes_as_dicts,
    )
    logger.debug(
        "pipeline step 3 done | echo=%d vernacular_pct=%.1f",
        len(echo_phrases),
        script_metadata.vernacular_pct,
    )

    # ------------------------------------------------------------------
    # Step 4 — Idiom Retriever
    # ------------------------------------------------------------------
    matched_idioms = retrieve_from_text(preprocessed_text)
    logger.debug("pipeline step 4 done | idioms=%d", len(matched_idioms))

    # ------------------------------------------------------------------
    # Step 5 — LLM Analysis (or mock)
    # ------------------------------------------------------------------
    response = await analyze_text_llm(
        raw_text=clean_text,
        preprocessed_text=preprocessed_text,
        script_metadata=script_metadata,
        matched_idioms=matched_idioms,
        echo_reduplications=echo_phrases,
        preprocessor_changes=changes_as_dicts,
    )
    logger.debug("pipeline step 5 done | tokens=%d", len(response.tokens))

    return response


async def run_chat_stream(
    message: str,
    history: list[ChatMessage],
    previous_breakdown: Optional[dict] = None,
) -> AsyncGenerator[str, None]:
    """
    Thin wrapper around llm_client.stream_chat_response for the /chat router.

    Runs the guardrail on the incoming message before streaming begins so
    injection attempts are blocked before any LLM call is made.

    Args:
        message:            Raw user chat message.
        history:            Prior conversation turns.
        previous_breakdown: Optional dashboard analysis dict for context.

    Yields:
        Text chunks from the LLM (or mock) as they arrive.
    """
    clean_message = input_guardrail(message)
    async for chunk in stream_chat_response(clean_message, history, previous_breakdown):
        yield chunk
