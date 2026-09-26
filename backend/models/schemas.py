"""
Pydantic v2 request and response models for the Samajh API.

All models used by both the /analyze and /chat endpoints live here so
routers never import from each other and the TypeScript type generator
has a single source to pull from.

Token category → frontend colour mapping (single source of truth):
    english          → Blue
    vernacular       → Green
    dialect_variant  → Red
    reduplication    → Purple
    idiom_slang      → Orange
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Shared / reusable sub-models
# ---------------------------------------------------------------------------

class IdiomMatchSchema(BaseModel):
    """Mirrors IdiomMatch from core/idiom_retriever.py for API serialisation."""
    phrase: str
    canonical_form: str
    literal: str
    pragmatic_intent: str
    cultural_note: str
    category: str
    matched_text: str
    token_color: str


class TokenClassification(BaseModel):
    """
    Classification for a single token (word or punctuation unit).

    Categories map directly to dashboard chip colours:
        english          → Blue   (standard English vocabulary)
        vernacular       → Green  (transliterated Hindi / Urdu in Latin script)
        dialect_variant  → Red    (cross-dialect / phonetic shift, e.g. larka vs ladka)
        reduplication    → Purple (echo rhyme with no independent meaning, e.g. shai)
        idiom_slang      → Orange (idiom, slang, or culturally loaded phrase)
    """
    token: str
    category: Literal[
        "english",
        "vernacular",
        "dialect_variant",
        "reduplication",
        "idiom_slang",
    ]
    explanation: str = Field(
        description="One-sentence reason for this classification, shown in chip tooltip."
    )


class ThreeTierBreakdown(BaseModel):
    """The core analytical output — three levels of meaning for the input text."""
    literal_translation: str = Field(
        description="Word-for-word translation into plain English."
    )
    pragmatic_intent: str = Field(
        description="What the speaker actually means — subtext, vibe, social function."
    )
    cultural_subtext: str = Field(
        description="Sociolinguistic nuance: politeness level, regional register, implied relationship."
    )


class ScriptMetadata(BaseModel):
    """Script and language proportion stats produced by script_detector.py."""
    latin_pct: float
    devanagari_pct: float
    arabic_urdu_pct: float
    other_pct: float
    english_pct: float
    vernacular_pct: float
    non_latin_pct: float
    ambiguous_pct: float
    has_devanagari: bool
    has_arabic_urdu: bool
    echo_reduplications: list[str] = Field(
        default_factory=list,
        description="Echo reduplication phrases detected (e.g. ['chai shai']).",
    )
    preprocessor_changes: list[dict] = Field(
        default_factory=list,
        description="Change log from preprocessor.py (original → normalised, rule name).",
    )


# ---------------------------------------------------------------------------
# Analysis endpoint — /analyze
# ---------------------------------------------------------------------------

class AnalysisRequest(BaseModel):
    """
    Inbound payload for POST /analyze.
    Whitespace is stripped automatically; length is validated against config.
    """
    text: str = Field(min_length=1, max_length=1000)

    @field_validator("text", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()


class AnalysisResponse(BaseModel):
    """
    Full structured output returned by POST /analyze.
    Every field is populated by the deterministic pipeline before the LLM call,
    then enriched by the LLM's token classification and 3-tier breakdown.
    """
    original_text: str
    preprocessed_text: str
    script_metadata: ScriptMetadata
    matched_idioms: list[IdiomMatchSchema]
    tokens: list[TokenClassification]
    three_tier: ThreeTierBreakdown
    register_tone: str = Field(
        description='Overall tone label, e.g. "Casual / Friendly" or "Frustrated / Venting".'
    )


# ---------------------------------------------------------------------------
# Chat endpoint — /chat
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    """A single turn in the conversation history."""
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    """
    Inbound payload for POST /chat.
    Sends the new user message plus prior conversation history so the
    backend can pass full context to the LLM without server-side session state.
    """
    message: str = Field(min_length=1, max_length=1000)
    history: list[ChatMessage] = Field(
        default_factory=list,
        max_length=40,      # cap history to ~20 turns to bound token cost
        description="Prior conversation turns, oldest first.",
    )

    @field_validator("message", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()


class ChatResponse(BaseModel):
    """Returned by POST /chat for non-streaming responses (used in tests)."""
    reply: str
    role: Literal["assistant"] = "assistant"
