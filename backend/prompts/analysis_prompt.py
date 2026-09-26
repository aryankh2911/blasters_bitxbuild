"""
System prompt and user payload builder for the /analyze LLM call.

The system prompt instructs Claude to act as a South Asian sociolinguist and
return strict JSON matching our AnalysisResponse schema. It explicitly tells
Claude to trust and reuse the deterministic pre-processor outputs (idiom
definitions, echo reduplications, script metadata) rather than re-deriving them,
which prevents hallucination on known phrases.

The `build_user_payload()` helper formats those pre-processor outputs alongside
the raw and preprocessed text into a single JSON string that becomes the user
message in the API call.
"""

from __future__ import annotations

import json


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are an expert computational sociolinguist specialising in \
South Asian code-switching, with deep expertise in Hinglish (Hindi-English) and \
Roman Urdu (Urdu written in Latin script). Your task is to analyse informal \
South Asian digital text and return a structured JSON response.

## STRICT OUTPUT REQUIREMENT
You MUST return ONLY a valid JSON object. No markdown fences, no commentary, \
no apologies. The JSON must conform exactly to this structure:

{
  "tokens": [
    {
      "token": "<exact word or punctuation from the preprocessed text>",
      "category": "<one of: english | vernacular | dialect_variant | reduplication | idiom_slang>",
      "explanation": "<one sentence tooltip explaining why this category was assigned>"
    }
  ],
  "three_tier": {
    "literal_translation": "<word-for-word translation into plain English>",
    "pragmatic_intent": "<what the speaker actually means — the subtext, vibe, or social function>",
    "cultural_subtext": "<sociolinguistic nuance: politeness register, regional origin, implied relationship>"
  },
  "register_tone": "<a short label, e.g. Casual / Friendly | Frustrated / Venting | Playful / Teasing | Soft Refusal | Formal | Sarcastic>"
}

## TOKEN CATEGORIES — use exactly these values:
- english          : Standard English word used without code-switching intent (e.g. "meeting", "okay", "plan")
- vernacular       : A Hindi or Urdu word written in Latin script (e.g. "yaar", "bhai", "ghar", "matlab")
- dialect_variant  : A word whose spelling reflects a cross-dialect phonetic shift (e.g. "larka" for ladka, "fir" for phir)
- reduplication    : An echo rhyme word with no independent meaning (e.g. "shai" in "chai shai", "phumna" in "ghumna phumna")
- idiom_slang      : A culturally loaded idiom, slang term, or fixed expression (e.g. "dimag ka dahi", "kya scene hai")

## CRITICAL RULES:
1. Classify EVERY token individually. Do not skip tokens, punctuation, or digits.
2. For phrases matched as idioms in the PRE-DETECTED IDIOMS section below, \
   classify all their constituent tokens as "idiom_slang" and use the provided \
   literal meaning — do NOT invent a different definition.
3. For echo reduplications listed in PRE-DETECTED REDUPLICATIONS, classify the \
   echo word as "reduplication" and note that it carries no independent meaning.
4. Do NOT invent words, do NOT hallucinate meanings, do NOT translate proper nouns.
5. The literal_translation must be word-for-word, even if awkward in English.
6. The pragmatic_intent must go beyond the literal — capture what a native \
   speaker would understand this message to mean socially.
7. The cultural_subtext must identify the register (formal/informal/intimate), \
   any regional markers, and the implied relationship between speakers.
8. The register_tone label must be short (2–4 words, "/" separated if dual).
"""


# ---------------------------------------------------------------------------
# User payload builder
# ---------------------------------------------------------------------------

def build_user_payload(
    raw_text: str,
    preprocessed_text: str,
    script_meta: dict,
    matched_idioms: list[dict],
    echo_reduplications: list[str],
    preprocessor_changes: list[dict],
) -> str:
    """
    Format deterministic pre-processor outputs into a JSON context string
    to send as the user message in the analysis LLM call.

    Bundling this context alongside the text means Claude never has to guess
    what the pre-processor already resolved — it only needs to classify tokens
    and generate the 3-tier breakdown.

    Args:
        raw_text:              The original user input, unmodified.
        preprocessed_text:     Text after preprocessor.py normalisations.
        script_meta:           ScriptStats + LanguageProportion as a dict.
        matched_idioms:        IdiomMatch dicts from idiom_retriever.retrieve().
        echo_reduplications:   List of detected echo phrases (e.g. ["chai shai"]).
        preprocessor_changes:  Change log from preprocessor.py.

    Returns:
        A JSON string to use as the user message content.
    """
    # Trim idiom data to only what Claude needs — avoid sending the full
    # cultural_note (which Claude should not paraphrase) as prompt bloat.
    idiom_summaries = [
        {
            "phrase":           m.get("phrase") or m.get("matched_text", ""),
            "literal":          m.get("literal", ""),
            "pragmatic_intent": m.get("pragmatic_intent", ""),
            "category":         m.get("category", ""),
        }
        for m in matched_idioms
    ]

    payload = {
        "raw_input": raw_text,
        "preprocessed_input": preprocessed_text,
        "script_metadata": {
            "latin_pct":       script_meta.get("latin_pct", 0),
            "devanagari_pct":  script_meta.get("devanagari_pct", 0),
            "arabic_urdu_pct": script_meta.get("arabic_urdu_pct", 0),
            "english_pct":     script_meta.get("english_pct", 0),
            "vernacular_pct":  script_meta.get("vernacular_pct", 0),
        },
        "pre_detected_idioms": idiom_summaries,
        "pre_detected_reduplications": echo_reduplications,
        "preprocessor_normalizations": [
            {
                "original":   c.get("original", ""),
                "normalized": c.get("normalized", ""),
                "rule":       c.get("rule", ""),
            }
            for c in preprocessor_changes
        ],
        "instruction": (
            "Analyse the preprocessed_input. Use the pre-detected idioms and "
            "reduplications exactly as provided. Return only the JSON object "
            "described in the system prompt."
        ),
    }

    return json.dumps(payload, ensure_ascii=False, indent=2)
