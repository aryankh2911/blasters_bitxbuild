"""
Deterministic script and structure detector.

Four responsibilities, all zero-cost (no LLM, no external libraries):
  1. Unicode classification  — labels each character by script block.
  2. Language proportion     — rough estimate of Latin-English vs Latin-vernacular
                               vs non-Latin script share across the token list.
  3. Echo reduplication      — detects X-shayi / X-wayi / rhyme-echo patterns
                               using known-idiom lookup first, regex fallback second.
  4. Token list              — returns a clean whitespace-split token list that
                               idiom_retriever.py uses to generate n-gram candidates.

Outputs feed the LLM analysis call (step 4 of the pipeline) as metadata,
and the frontend dashboard for the language-proportion bar.
"""

from __future__ import annotations

import re
import unicodedata
from collections import Counter
from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# Unicode script ranges
# ---------------------------------------------------------------------------

def _script_of(char: str) -> str:
    """Return a broad script label for a single character."""
    cp = ord(char)
    if 0x0041 <= cp <= 0x007A or 0x00C0 <= cp <= 0x024F:
        return "latin"
    if 0x0900 <= cp <= 0x097F:
        return "devanagari"
    if 0x0600 <= cp <= 0x06FF or 0x0750 <= cp <= 0x077F:
        return "arabic_urdu"
    if 0x0A00 <= cp <= 0x0A7F:
        return "gurmukhi"
    if 0x0980 <= cp <= 0x09FF:
        return "bengali"
    if char.isdigit():
        return "digit"
    if unicodedata.category(char) in ("Po", "Ps", "Pe", "Pd", "Pc"):
        return "punctuation"
    return "other"


# ---------------------------------------------------------------------------
# Common English vocabulary set for proportion estimation
# (Latin-script tokens NOT in this set are counted as vernacular candidates)
# ---------------------------------------------------------------------------

_ENGLISH_WORDS: frozenset[str] = frozenset({
    # articles, pronouns, prepositions, conjunctions
    "a", "an", "the", "and", "or", "but", "if", "in", "on", "at", "to",
    "for", "of", "with", "by", "from", "up", "about", "into", "through",
    "during", "before", "after", "above", "below", "between", "out", "off",
    "over", "under", "again", "then", "once", "here", "there", "when",
    "where", "why", "how", "all", "both", "each", "few", "more", "most",
    "other", "some", "such", "no", "nor", "not", "only", "own", "same",
    "so", "than", "too", "very", "just", "now", "i", "me", "my", "myself",
    "we", "our", "ours", "ourselves", "you", "your", "yours", "yourself",
    "he", "him", "his", "himself", "she", "her", "hers", "herself", "it",
    "its", "itself", "they", "them", "their", "theirs", "themselves", "what",
    "which", "who", "whom", "this", "that", "these", "those", "am", "is",
    "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "will", "would", "could", "should", "may", "might",
    "must", "shall", "can", "need", "dare", "ought", "used",
    # common verbs
    "go", "get", "got", "make", "made", "know", "think", "take", "come",
    "came", "see", "say", "said", "look", "want", "give", "use", "find",
    "tell", "ask", "work", "seem", "feel", "try", "leave", "call", "keep",
    "let", "begin", "show", "hear", "play", "run", "move", "live", "believe",
    "hold", "bring", "happen", "write", "provide", "sit", "stand", "lose",
    "pay", "meet", "include", "continue", "set", "learn", "change", "lead",
    "start", "send", "build", "stay", "fall", "cut", "reach", "kill", "remain",
    "suggest", "raise", "pass", "sell", "require", "report", "decide", "pull",
    # common adjectives
    "good", "new", "first", "last", "long", "great", "little", "own", "right",
    "big", "high", "different", "small", "large", "next", "early", "young",
    "important", "public", "bad", "same", "able", "old", "real", "best",
    "free", "sure", "true", "false", "hard", "easy", "clear", "possible",
    "sure", "open", "full", "special", "strong", "whole", "local", "late",
    # common nouns
    "time", "year", "people", "way", "day", "man", "woman", "child", "world",
    "life", "hand", "part", "place", "case", "week", "company", "system",
    "program", "question", "government", "number", "night", "point", "home",
    "water", "room", "mother", "area", "money", "story", "fact", "month",
    "lot", "right", "study", "book", "eye", "job", "word", "business", "issue",
    "side", "kind", "head", "house", "service", "friend", "father", "power",
    "hour", "game", "line", "end", "form", "car", "city", "community", "name",
    # common adverbs / discourse markers
    "also", "back", "even", "still", "way", "well", "already", "never",
    "always", "often", "maybe", "perhaps", "actually", "probably", "really",
    "okay", "ok", "yes", "no", "yeah", "hey", "hi", "hello", "bye", "please",
    "thanks", "thank", "sorry", "excuse",
    # digital / messaging
    "lol", "omg", "brb", "haha", "hehe", "btw", "imo", "asap", "fyi",
    "wow", "oh", "ah", "uh", "hmm", "send", "message", "phone", "call",
    "tomorrow", "today", "tonight", "morning", "evening", "night",
    "plan", "party", "work", "meeting", "team", "class", "college",
    "school", "office", "home", "food", "done", "wait", "check",
})

# Known Hinglish / Roman Urdu function words that appear in Latin script
# but should NOT be counted as English
_VERNACULAR_MARKERS: frozenset[str] = frozenset({
    "yaar", "bhai", "arre", "kya", "hai", "hain", "nahi", "na", "haan",
    "acha", "achha", "theek", "tha", "thi", "the", "raha", "rahi", "rahe",
    "gaya", "gayi", "gaye", "karo", "karna", "karta", "karti", "karte",
    "mujhe", "tumhe", "usse", "hume", "unhe", "mere", "tere", "uska",
    "matlab", "bas", "abhi", "phir", "jab", "tab", "kyun", "kaise",
    "kitna", "kitne", "kaafi", "thoda", "bahut", "zyada", "kam", "bilkul",
    "pakka", "seedha", "sidha", "wahan", "yahan", "idhar", "udhar",
    "aur", "lekin", "toh", "bhi", "hi", "ko", "se", "mein", "pe", "par",
    "wala", "wali", "wale", "waala", "waali", "waale",
})


# ---------------------------------------------------------------------------
# Echo reduplication patterns
# ---------------------------------------------------------------------------

# Vowel skeleton: strip consonants, keep vowels to compare rhyme structure
_VOWEL_RE = re.compile(r"[aeiou]+", re.I)

# Known reduplication onset replacements in South Asian languages
_RHYME_ONSETS = ("sh", "v", "w", "f", "p", "b", "t", "d", "kh", "ch")


def _vowel_skeleton(word: str) -> str:
    """Return the vowel sequence of a word (its 'rhyme fingerprint')."""
    return "".join(_VOWEL_RE.findall(word.lower()))


def _is_echo_reduplication(word1: str, word2: str) -> bool:
    """
    Return True if word2 is likely an echo rhyme of word1.

    Criteria (either is sufficient):
      A) word2 starts with one of the canonical rhyme onsets AND
         shares the same vowel skeleton as word1.
      B) word2 equals word1 with its first 1-2 consonants replaced.
    """
    w1, w2 = word1.lower(), word2.lower()

    # Must be similar length (echo rhymes are never wildly different)
    if abs(len(w1) - len(w2)) > 3:
        return False

    skel1 = _vowel_skeleton(w1)
    skel2 = _vowel_skeleton(w2)

    # Vowel skeletons must match and be non-trivial (at least one vowel)
    if not skel1 or skel1 != skel2:
        return False

    # Check if word2 starts with a known rhyme onset
    for onset in _RHYME_ONSETS:
        if w2.startswith(onset) and not w1.startswith(onset):
            return True

    return False


# ---------------------------------------------------------------------------
# Output types
# ---------------------------------------------------------------------------

@dataclass
class ScriptStats:
    """Per-character script breakdown as percentages (0–100)."""
    latin_pct: float = 0.0
    devanagari_pct: float = 0.0
    arabic_urdu_pct: float = 0.0
    other_pct: float = 0.0


@dataclass
class LanguageProportion:
    """Rough token-level language estimate for the dashboard proportion bar."""
    english_pct: float = 0.0      # Latin tokens likely English
    vernacular_pct: float = 0.0   # Latin tokens likely transliterated vernacular
    non_latin_pct: float = 0.0    # Devanagari / Arabic-Urdu tokens
    ambiguous_pct: float = 0.0    # Digits, punctuation, single chars, unknowns


@dataclass
class EchoMatch:
    phrase: str          # full matched phrase, e.g. "chai shai"
    base_word: str       # e.g. "chai"
    echo_word: str       # e.g. "shai"
    source: str          # "known_idiom" or "regex_pattern"


@dataclass
class DetectorResult:
    tokens: list[str]                          # whitespace-split token list
    script_stats: ScriptStats
    language_proportion: LanguageProportion
    echo_matches: list[EchoMatch] = field(default_factory=list)
    has_devanagari: bool = False
    has_arabic_urdu: bool = False


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect(
    text: str,
    known_reduplications: set[str] | None = None,
) -> DetectorResult:
    """
    Run all four detection passes on preprocessed text.

    Args:
        text: The preprocessed (post-preprocessor.py) input string.
        known_reduplications: Optional set of known reduplication phrases
            (e.g. {"chai shai", "ghumna phumna"}) from idioms.json for
            fast lookup before the regex fallback.

    Returns:
        DetectorResult with tokens, script stats, language proportion,
        and any echo reduplication matches found.
    """
    if not text or not text.strip():
        return DetectorResult(
            tokens=[],
            script_stats=ScriptStats(),
            language_proportion=LanguageProportion(),
        )

    known_reduplications = known_reduplications or set()

    # --- Pass 1: Unicode script classification ---
    char_counts: Counter[str] = Counter()
    for char in text:
        if char.isspace():
            continue
        char_counts[_script_of(char)] += 1

    total_chars = sum(char_counts.values()) or 1
    script_stats = ScriptStats(
        latin_pct=round(char_counts["latin"] / total_chars * 100, 1),
        devanagari_pct=round(char_counts["devanagari"] / total_chars * 100, 1),
        arabic_urdu_pct=round(char_counts["arabic_urdu"] / total_chars * 100, 1),
        other_pct=round(
            (char_counts["other"] + char_counts["punctuation"] + char_counts["digit"])
            / total_chars * 100,
            1,
        ),
    )

    # --- Pass 2: Token-level language proportion ---
    tokens = text.split()
    english_count = vernacular_count = non_latin_count = ambiguous_count = 0

    for token in tokens:
        # Strip punctuation for lookup
        word = token.strip(".,!?;:\"'()[]{}").lower()

        if not word or len(word) == 1:
            ambiguous_count += 1
            continue

        # Check script of majority of characters in the word
        word_scripts = Counter(_script_of(c) for c in word if not c.isspace())
        dominant = word_scripts.most_common(1)[0][0] if word_scripts else "other"

        if dominant in ("devanagari", "arabic_urdu", "gurmukhi", "bengali"):
            non_latin_count += 1
        elif dominant == "latin":
            if word in _VERNACULAR_MARKERS:
                vernacular_count += 1
            elif word in _ENGLISH_WORDS:
                english_count += 1
            elif any(c in word for c in ("aa", "ii", "uu", "kh", "gh", "ph", "dh", "bh")):
                # Digraph heuristic: likely transliterated vernacular
                vernacular_count += 1
            else:
                # Unknown Latin word — could be either; call it ambiguous
                ambiguous_count += 1
        else:
            ambiguous_count += 1

    total_tokens = len(tokens) or 1
    language_proportion = LanguageProportion(
        english_pct=round(english_count / total_tokens * 100, 1),
        vernacular_pct=round(vernacular_count / total_tokens * 100, 1),
        non_latin_pct=round(non_latin_count / total_tokens * 100, 1),
        ambiguous_pct=round(ambiguous_count / total_tokens * 100, 1),
    )

    # --- Pass 3: Echo reduplication detection ---
    echo_matches: list[EchoMatch] = []
    _REAL_WORDS = _ENGLISH_WORDS | _VERNACULAR_MARKERS

    for i in range(len(tokens) - 1):
        w1 = tokens[i].strip(".,!?;:\"'").lower()
        w2 = tokens[i + 1].strip(".,!?;:\"'").lower()
        phrase = f"{w1} {w2}"

        if phrase in known_reduplications:
            echo_matches.append(EchoMatch(
                phrase=phrase,
                base_word=w1,
                echo_word=w2,
                source="known_idiom",
            ))
        elif (
            _is_echo_reduplication(w1, w2)
            # Exclude pairs where word2 is independently a real/meaningful word —
            # those are regular word sequences, not echo rhymes.
            and w2 not in _REAL_WORDS
        ):
            echo_matches.append(EchoMatch(
                phrase=phrase,
                base_word=w1,
                echo_word=w2,
                source="regex_pattern",
            ))

    return DetectorResult(
        tokens=tokens,
        script_stats=script_stats,
        language_proportion=language_proportion,
        echo_matches=echo_matches,
        has_devanagari=script_stats.devanagari_pct > 0,
        has_arabic_urdu=script_stats.arabic_urdu_pct > 0,
    )
