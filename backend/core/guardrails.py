"""
Input guardrails for the Samajh backend.

Two responsibilities:
  1. input_guardrail() — validates and sanitizes every incoming text payload.
  2. log_api_mode()     — called once at startup to log whether the app is running
                          in zero-cost Mock Mode or live Anthropic API Mode.
"""

import logging
import re

from fastapi import HTTPException, status

from core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prompt injection patterns (English-only, deliberately narrow)
# We do NOT flag Hinglish or Roman Urdu content — only explicit LLM control phrases.
# ---------------------------------------------------------------------------
_INJECTION_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions?", re.I),
    re.compile(r"disregard\s+(all\s+)?(previous|prior|above)\s+instructions?", re.I),
    re.compile(r"you\s+are\s+now\s+a", re.I),
    re.compile(r"act\s+as\s+(a|an)\s+\w+", re.I),
    re.compile(r"forget\s+(everything|all)\s+(you|i)", re.I),
    re.compile(r"new\s+system\s+prompt", re.I),
    re.compile(r"<\s*system\s*>", re.I),            # XML-style system tag injection
    re.compile(r"\[INST\]|\[/?SYS\]", re.I),        # Llama-style control tokens
]

# Repeated-character junk (e.g. "aaaaaaaaaaaaaaaa" spammed to waste tokens)
_SPAM_RE = re.compile(r"(.)\1{19,}")  # same character 20+ times in a row


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def input_guardrail(text: str) -> str:
    """
    Validate and lightly sanitize raw user input.

    Returns the cleaned text on success.
    Raises HTTPException 400 for empty / oversized / suspicious input.
    """
    # Strip surrounding whitespace
    cleaned = text.strip()

    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Input cannot be empty.",
        )

    if len(cleaned) > settings.max_input_characters:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Input exceeds the maximum allowed length of "
                f"{settings.max_input_characters} characters "
                f"(received {len(cleaned)})."
            ),
        )

    # Block repeated-character spam
    if _SPAM_RE.search(cleaned):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Input contains suspicious repeating character sequences.",
        )

    # Block English-language prompt injection attempts
    for pattern in _INJECTION_PATTERNS:
        if pattern.search(cleaned):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Input contains disallowed content.",
            )

    return cleaned


def log_api_mode() -> None:
    """
    Log the current API mode at startup.
    Call this once from the FastAPI lifespan handler — not on every request.
    """
    if settings.mock_llm:
        logger.info(
            "Running in MOCK MODE ($0 — no Anthropic API calls). "
            "Set MOCK_LLM=false in .env to enable live responses."
        )
    else:
        key_preview = (
            settings.anthropic_api_key[:8] + "..."
            if settings.anthropic_api_key
            else "NOT SET"
        )
        logger.info(
            "Running in LIVE API MODE (Anthropic). "
            f"Key prefix: {key_preview}"
        )
