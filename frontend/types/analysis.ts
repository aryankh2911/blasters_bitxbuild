/**
 * TypeScript interfaces mirroring the backend Pydantic v2 schemas exactly.
 * Source of truth: backend/models/schemas.py
 * Do not add fields here that don't exist on the backend — they will silently
 * be undefined at runtime.
 */

// ---------------------------------------------------------------------------
// Token classification
// ---------------------------------------------------------------------------

export type TokenCategory =
  | "english"
  | "vernacular"
  | "dialect_variant"
  | "reduplication"
  | "idiom_slang";

export interface TokenClassification {
  token: string;
  category: TokenCategory;
  explanation: string;
}

// ---------------------------------------------------------------------------
// 3-tier pragmatic breakdown
// ---------------------------------------------------------------------------

export interface ThreeTierBreakdown {
  literal_translation: string;
  pragmatic_intent: string;
  cultural_subtext: string;
}

// ---------------------------------------------------------------------------
// Script and language metadata
// ---------------------------------------------------------------------------

export interface ScriptMetadata {
  latin_pct: number;
  devanagari_pct: number;
  arabic_urdu_pct: number;
  other_pct: number;
  english_pct: number;
  vernacular_pct: number;
  non_latin_pct: number;
  ambiguous_pct: number;
  has_devanagari: boolean;
  has_arabic_urdu: boolean;
  echo_reduplications: string[];
  preprocessor_changes: Record<string, string>[];
}

// ---------------------------------------------------------------------------
// Matched idiom (from idiom_retriever)
// ---------------------------------------------------------------------------

export interface IdiomMatch {
  phrase: string;
  canonical_form: string;
  literal: string;
  pragmatic_intent: string;
  cultural_note: string;
  category: string;
  matched_text: string;
  token_color: string;
}

// ---------------------------------------------------------------------------
// Full analysis response — returned by POST /api/v1/analyze
// ---------------------------------------------------------------------------

export interface AnalysisResponse {
  original_text: string;
  preprocessed_text: string;
  script_metadata: ScriptMetadata;
  matched_idioms: IdiomMatch[];
  tokens: TokenClassification[];
  three_tier: ThreeTierBreakdown;
  register_tone: string;
}

// ---------------------------------------------------------------------------
// Chat types — used by POST /api/v1/chat
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
  previous_breakdown?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Health endpoint — GET /health
// ---------------------------------------------------------------------------

export interface HealthResponse {
  status: string;
  mock_mode: boolean;
  model: string;
}

// ---------------------------------------------------------------------------
// Token category → Tailwind chip classes (single source of truth for UI)
// ---------------------------------------------------------------------------

export const CHIP_CLASSES: Record<TokenCategory, string> = {
  english:         "bg-sky-500/12 text-sky-300 border border-sky-500/25",
  vernacular:      "bg-teal-500/12 text-teal-300 border border-teal-500/25",
  dialect_variant: "bg-orange-600/20 text-orange-300 border border-orange-600/35",
  reduplication:   "bg-purple-500/12 text-purple-300 border border-purple-500/25",
  idiom_slang:     "bg-amber-600/20 text-amber-300 border border-amber-600/35",
};

export const CHIP_CLASSES_LIGHT: Record<TokenCategory, string> = {
  english:         "bg-sky-100 text-sky-700 border border-sky-300",
  vernacular:      "bg-teal-100 text-teal-700 border border-teal-300",
  dialect_variant: "bg-orange-100 text-orange-700 border border-orange-300",
  reduplication:   "bg-purple-100 text-purple-700 border border-purple-300",
  idiom_slang:     "bg-amber-100 text-amber-700 border border-amber-300",
};

export const CATEGORY_LABELS: Record<TokenCategory, string> = {
  english: "English",
  vernacular: "Vernacular",
  dialect_variant: "Dialect Variant",
  reduplication: "Reduplication",
  idiom_slang: "Idiom / Slang",
};
