"""
Phonetic pre-processor for South Asian code-switched text.

Runs three deterministic normalization passes on raw input before the LLM sees it:
  1. Retroflex d/r shift  — unifies cross-dialect spellings (ladka / larka)
  2. H-variation          — normalizes dropped or altered aspirates (fir→phir, h→hai)
  3. Vowel compression    — expands text-speak shortenings (mtlb→matlab, nhi→nahi)

Returns both the normalized string and a structured change log so the frontend
can show exactly what the pre-processor corrected.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# Output types
# ---------------------------------------------------------------------------

@dataclass
class TokenChange:
    original: str
    normalized: str
    rule: str
    position: int  # 0-indexed word position in the original token list


@dataclass
class PreprocessorResult:
    original: str
    normalized: str
    changes: list[TokenChange] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Lookup tables
# ---------------------------------------------------------------------------

# Retroflex d/r shift
# Maps Roman Urdu spellings (where /ɽ/ → "r") to the canonical Hinglish spelling
# (where /ɽ/ → "d"). Only documented retroflex pairs — never a blanket r↔d swap.
RETROFLEX_MAP: dict[str, str] = {
    # boy/girl and inflected forms
    "larka":    "ladka",
    "larke":    "ladke",
    "larkon":   "ladkon",
    "larki":    "ladki",
    "larkian":  "ladkiyan",
    "larkiyan": "ladkiyan",
    # big / large
    "bara":     "bada",
    "bari":     "badi",
    "bare":     "bade",
    "baron":    "badon",
    # fell / is lying
    "para":     "pada",
    "pari":     "padi",
    "pare":     "pade",
    # old (person)
    "bura":     "buda",   # bura = bad vs buda = old — flagged but common confusion
    # gave
    "dara":     "dada",
    # road / path (less common)
    "sara":     "saada",
    # put / placed
    "rakh dara": "rakh diya",
}

# H-variation
# Maps h-dropped or aspirate-shifted forms to their standard spellings.
# Operates on exact whole-word matches only to avoid false positives.
H_VARIATION_MAP: dict[str, str] = {
    # copula "hai"
    "h":      "hai",
    "he":     "hai",
    "hei":    "hai",
    # past tense markers (aspirated)
    "ta":     "tha",
    "ti":     "thi",
    "te":     "the",
    "gya":    "gaya",
    "gyi":    "gayi",
    "gye":    "gaye",
    # phir (then/again)
    "fir":    "phir",
    # bhai (brother / address particle)
    "bai":    "bhai",
    # kyun (why) — h often dropped
    "kyu":    "kyun",
    "ku":     "kyun",
    # raha/rahi/rahe (progressive marker)
    "rha":    "raha",
    "rhi":    "rahi",
    "rhe":    "rahe",
    # karo variants
    "kro":    "karo",
    "kru":    "karun",
}

# Vowel compression
# Maps common South Asian text-speak to their expanded forms.
# Ordered from longest to shortest to prefer specific matches.
VOWEL_COMPRESSION_MAP: dict[str, str] = {
    # classic compression
    "mtlb":    "matlab",
    "mltb":    "matlab",
    "ghr":     "ghar",
    "smjh":    "samajh",
    "smjha":   "samjha",
    "smjhao":  "samjhao",
    "smjho":   "samjho",
    # nahi variants
    "nhi":     "nahi",
    "ni":      "nahi",
    "nai":     "nahi",
    "nh":      "nahi",
    # kal (yesterday / tomorrow)
    "kl":      "kal",
    # batao/bata
    "btao":    "batao",
    "bta":     "bata",
    "bto":     "bato",
    # pata
    "pta":     "pata",
    "pta":     "pata",
    # achha
    "acha":    "achha",
    "accha":   "achha",
    "achaa":   "achha",
    # theek
    "thk":     "theek",
    "thik":    "theek",
    "tik":     "theek",
    # kiya (did)
    "kia":     "kiya",
    "kyaa":    "kya",
    # yaar (friend / address)
    "yr":      "yaar",
    "yrr":     "yaar",
    "yrrr":    "yaar",
    # aao/jao
    "aaoo":    "aao",
    "jao":     "jao",
    # short forms used in WhatsApp
    "msg":     "message",
    "msgs":    "messages",
    "snd":     "send",
    "tmrw":    "tomorrow",
    "tmr":     "tomorrow",
    # thanks
    "thnx":    "thanks",
    "tnx":     "thanks",
    "thx":     "thanks",
    # okay
    "okk":     "okay",
    "okayy":   "okay",
    # please
    "plz":     "please",
    "pls":     "please",
    # dekh/dekho
    "dkh":     "dekh",
    "dkho":    "dekho",
    # rona (cry)
    "rn":      "rona",
}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_PUNCT_RE = re.compile(r"^([^\w]*)(\w+)([^\w]*)$")


def _split_token(token: str) -> tuple[str, str, str]:
    """Split a token into (leading_punct, word, trailing_punct)."""
    m = _PUNCT_RE.match(token)
    if m:
        return m.group(1), m.group(2), m.group(3)
    return "", token, ""


def _apply_map(
    word: str,
    lookup: dict[str, str],
    rule: str,
    position: int,
    changes: list[TokenChange],
) -> str:
    """Look up word (case-insensitive) in lookup; record change if found."""
    key = word.lower()
    if key in lookup and lookup[key] != key:
        normalized = lookup[key]
        # Preserve original capitalisation style (Title, UPPER, lower)
        if word.istitle():
            normalized = normalized.capitalize()
        elif word.isupper():
            normalized = normalized.upper()
        changes.append(TokenChange(
            original=word,
            normalized=normalized,
            rule=rule,
            position=position,
        ))
        return normalized
    return word


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def preprocess(text: str) -> PreprocessorResult:
    """
    Run all three normalization passes on text.

    Returns a PreprocessorResult with the cleaned string and a detailed
    change log suitable for display in the token dashboard.
    """
    if not text or not text.strip():
        return PreprocessorResult(original=text, normalized=text)

    changes: list[TokenChange] = []

    # Tokenize on whitespace while preserving whitespace runs for reconstruction
    raw_tokens = text.split()
    result_tokens: list[str] = []

    for position, token in enumerate(raw_tokens):
        leading, word, trailing = _split_token(token)

        # Pass 1 — retroflex d/r shift
        word = _apply_map(word, RETROFLEX_MAP, "retroflex_shift", position, changes)

        # Pass 2 — h-variation / dropped aspirate
        word = _apply_map(word, H_VARIATION_MAP, "h_variation", position, changes)

        # Pass 3 — vowel compression
        word = _apply_map(word, VOWEL_COMPRESSION_MAP, "vowel_compression", position, changes)

        result_tokens.append(f"{leading}{word}{trailing}")

    normalized = " ".join(result_tokens)
    return PreprocessorResult(
        original=text,
        normalized=normalized,
        changes=changes,
    )


def preprocess_batch(texts: list[str]) -> list[PreprocessorResult]:
    """Convenience wrapper for processing multiple strings."""
    return [preprocess(t) for t in texts]
