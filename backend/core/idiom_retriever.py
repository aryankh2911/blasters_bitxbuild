"""
Idiom retriever — phrase-level matching against data/idioms.json.

Designed as a Supabase-ready interface: the public `retrieve()` function
returns the same structure whether the backend is a local JSON file (now)
or a pgvector similarity search (post-hackathon swap). Only this module
needs to change when the backend is upgraded.

Matching strategy:
  - Generates overlapping 1-gram, 2-gram, 3-gram, and 4-gram candidates
    from the input token list.
  - Checks each candidate against the cached idiom phrase index.
  - Returns all matches, deduplicated, sorted by phrase length (longest first)
    so that "dimag ka dahi" (3-gram) is preferred over its sub-phrases.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

# Max n-gram size to check (4 covers all phrases in our idioms.json)
_MAX_NGRAM = 4

# Path to the seed dictionary, relative to this file
_IDIOMS_PATH = Path(__file__).resolve().parent.parent / "data" / "idioms.json"


# ---------------------------------------------------------------------------
# Output type
# ---------------------------------------------------------------------------

@dataclass
class IdiomMatch:
    phrase: str
    canonical_form: str
    literal: str
    pragmatic_intent: str
    cultural_note: str
    category: str
    matched_text: str   # exact substring from the input that triggered the match
    token_color: str    # derived from category; ready for the frontend


# ---------------------------------------------------------------------------
# Category → token colour mapping (single source of truth)
# ---------------------------------------------------------------------------

_CATEGORY_COLOR: dict[str, str] = {
    "reduplication": "purple",
    "idiom":         "orange",
    "slang":         "orange",
    "cross_dialect": "red",
}

_DEFAULT_COLOR = "orange"


# ---------------------------------------------------------------------------
# Internal cache
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _load_idioms() -> tuple[list[dict], dict[str, dict], set[str]]:
    """
    Load idioms.json once and build two lookup structures:
      - phrase_index: normalized_phrase → idiom dict  (for O(1) matching)
      - reduplication_phrases: set of phrases with category="reduplication"
        (exported to script_detector for its known-idiom fast path)

    Returns (raw_list, phrase_index, reduplication_phrases).
    """
    with _IDIOMS_PATH.open(encoding="utf-8") as f:
        idioms: list[dict] = json.load(f)

    phrase_index: dict[str, dict] = {}
    reduplication_phrases: set[str] = set()

    for entry in idioms:
        key = _normalize(entry["phrase"])
        phrase_index[key] = entry
        if entry.get("category") == "reduplication":
            reduplication_phrases.add(key)

    return idioms, phrase_index, reduplication_phrases


def _normalize(text: str) -> str:
    """Lowercase and collapse whitespace for consistent matching."""
    return re.sub(r"\s+", " ", text.lower().strip())


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_reduplication_phrases() -> set[str]:
    """
    Return the set of known reduplication phrases for script_detector.py.
    Called once at startup; result is cached.
    """
    _, _, reduplication_phrases = _load_idioms()
    return reduplication_phrases


def retrieve(tokens: list[str]) -> list[IdiomMatch]:
    """
    Find all idiom matches in the given token list.

    Args:
        tokens: Whitespace-split tokens from DetectorResult.tokens
                (already preprocessed and lowercased is fine).

    Returns:
        List of IdiomMatch objects, longest phrase first, deduplicated.
        An empty list if no idioms are found.
    """
    _, phrase_index, _ = _load_idioms()

    if not tokens:
        return []

    # Normalise tokens once
    clean_tokens = [_normalize(t) for t in tokens]

    # Collect all candidate n-grams (longest first to prefer specificity)
    matches: list[IdiomMatch] = []
    covered_positions: set[int] = set()  # track which token positions are matched

    for n in range(_MAX_NGRAM, 0, -1):
        for start in range(len(clean_tokens) - n + 1):
            # Skip positions already covered by a longer match
            span = set(range(start, start + n))
            if span & covered_positions:
                continue

            candidate = " ".join(clean_tokens[start : start + n])
            entry = phrase_index.get(candidate)

            if entry:
                matched_text = " ".join(tokens[start : start + n])
                color = _CATEGORY_COLOR.get(entry.get("category", ""), _DEFAULT_COLOR)
                matches.append(IdiomMatch(
                    phrase=entry["phrase"],
                    canonical_form=entry.get("canonical_form", ""),
                    literal=entry["literal"],
                    pragmatic_intent=entry["pragmatic_intent"],
                    cultural_note=entry["cultural_note"],
                    category=entry["category"],
                    matched_text=matched_text,
                    token_color=color,
                ))
                covered_positions |= span

    # Sort: longer phrases first, then alphabetically for determinism
    matches.sort(key=lambda m: (-len(m.phrase.split()), m.phrase))
    return matches


def retrieve_from_text(text: str) -> list[IdiomMatch]:
    """Convenience wrapper: splits text into tokens then calls retrieve()."""
    return retrieve(text.split())
