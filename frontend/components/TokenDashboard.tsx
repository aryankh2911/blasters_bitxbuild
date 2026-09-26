"use client";

import React, { useState, useEffect } from "react";
import { TokenChip } from "@/components/TokenChip";
import { LanguageLegend } from "@/components/LanguageLegend";
import { IntentBreakdown } from "@/components/IntentBreakdown";
import type { AnalysisResponse, TokenCategory } from "@/types/analysis";
import { useEngineTheme } from "@/components/EngineThemeContext";

// ── Slot machine loading ──────────────────────────────────────────────────────
const SLOT_COLUMNS = [
  ["yaar", "bhai", "boss", "jaan", "dost", "yaar"],
  ["chai", "pani", "khana", "roti", "chai"],
  ["dimag", "dil", "akal", "mann", "dimag"],
  ["seedha", "bilkul", "ekdum", "poora", "seedha"],
  ["sahi", "theek", "accha", "badiya", "sahi"],
  ["kya", "kyun", "kaisa", "kahan", "kya"],
  ["scene", "baat", "kaam", "hal", "scene"],
];

const SLOT_COLORS = [
  "#5ba8d0", "#4db896", "#e07b4a", "#9b72cf", "#d4a843", "#5ba8d0", "#e07b4a",
];

function SlotWord({ words, color, delay }: { words: string[]; color: string; delay: number }) {
  const [pos, setPos] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      const id = setInterval(() => setPos((p) => (p + 1) % words.length), 130 + delay * 20);
      return () => clearInterval(id);
    }, delay * 60);
    return () => clearTimeout(t);
  }, [words, delay]);

  return (
    <div style={{ height: 26, overflow: "hidden", position: "relative", borderRadius: 6 }}>
      <div
        style={{
          transform: `translateY(-${pos * 26}px)`,
          transition: "transform 0.1s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {words.map((w, i) => (
          <div
            key={i}
            style={{
              height: 26,
              display: "flex",
              alignItems: "center",
              padding: "0 8px",
              fontSize: 12,
              fontFamily: "var(--font-geist-mono)",
              color,
              background: `${color}18`,
              border: `1px solid ${color}30`,
              borderRadius: 6,
              letterSpacing: "0.01em",
            }}
          >
            {w}
          </div>
        ))}
      </div>
    </div>
  );
}

function SlotMachineLoader() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-zinc-600">
          Decoding tokens
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", maxWidth: 280 }}>
          {SLOT_COLUMNS.map((words, i) => (
            <SlotWord key={i} words={words} color={SLOT_COLORS[i]} delay={i} />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2.5 w-full max-w-xs">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-white/6 bg-white/3 p-4 space-y-2 animate-glass-pulse">
            <div className="h-2 rounded bg-white/8 w-24" />
            <div className="h-3 rounded bg-white/5 w-full" />
            <div className="h-3 rounded bg-white/5 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface TokenDashboardProps {
  analysisResult: AnalysisResponse | null;
  isAnalyzing: boolean;
}

const PROPORTION_COLORS: {
  key: keyof AnalysisResponse["script_metadata"];
  label: string;
  color: string;
}[] = [
  { key: "english_pct",    label: "English",    color: "bg-blue-500" },
  { key: "vernacular_pct", label: "Vernacular",  color: "bg-emerald-500" },
  { key: "non_latin_pct",  label: "Non-Latin",   color: "bg-violet-500" },
  { key: "ambiguous_pct",  label: "Ambiguous",   color: "bg-zinc-500" },
];

export function TokenDashboard({ analysisResult, isAnalyzing }: TokenDashboardProps) {
  const [activeFilter, setActiveFilter] = useState<TokenCategory | null>(null);
  const engineTheme = useEngineTheme();
  const isLight = engineTheme === "light";

  const outer: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column" };

  /* ── Slot machine loading ── */
  if (isAnalyzing) {
    return <div style={outer}><SlotMachineLoader /></div>;
  }

  /* ── Empty state ── */
  if (!analysisResult) {
    return (
      <div style={{ ...outer, alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
        <div style={{
          fontFamily: "var(--font-instrument-serif)",
          fontSize: 52, fontStyle: "italic",
          color: isLight ? "rgba(18,18,18,0.06)" : "rgba(255,255,255,0.04)",
          lineHeight: 1, userSelect: "none",
        }}>
          समझ
        </div>
        <p style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.14em", color: isLight ? "rgba(18,18,18,0.35)" : "rgba(255,255,255,0.2)", lineHeight: 1.6, maxWidth: 200, marginTop: 20 }}>
          Send a phrase to decode every token
        </p>
      </div>
    );
  }

  const { tokens, script_metadata } = analysisResult;

  return (
    <div style={outer}>
      <div className="flex flex-col gap-5 p-5">

        {/* Language composition bar */}
        <div className="space-y-2">
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: isLight ? "rgba(18,18,18,0.45)" : "rgba(255,255,255,0.3)", margin: 0 }}>
            Language Composition
          </p>
          <div style={{ height: 6, width: "100%", overflow: "hidden", background: isLight ? "rgba(18,18,18,0.08)" : "rgba(255,255,255,0.06)", display: "flex", borderRadius: 9999 }}>
            {PROPORTION_COLORS.map(({ key, color }) => {
              const pct = script_metadata[key] as number;
              if (pct <= 0) return null;
              return (
                <div
                  key={key}
                  className={color}
                  style={{ width: `${pct}%` }}
                  title={`${pct}%`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {PROPORTION_COLORS.map(({ key, label, color }) => {
              const pct = script_metadata[key] as number;
              if (pct <= 0) return null;
              return (
                <span key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-outfit)", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: isLight ? "rgba(18,18,18,0.55)" : "rgba(255,255,255,0.4)" }}>
                  <span className={`h-1.5 w-1.5 ${color}`} style={{ borderRadius: 0 }} />
                  {label} {pct}%
                </span>
              );
            })}
          </div>
        </div>

        <div style={{ height: 1, background: isLight ? "rgba(18,18,18,0.08)" : "rgba(255,255,255,0.06)" }} />

        {/* Token chips */}
        <div className="space-y-2.5">
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: isLight ? "rgba(18,18,18,0.45)" : "rgba(255,255,255,0.3)", margin: 0 }}>
            Token Deconstruction
          </p>
          <div className="flex flex-wrap gap-2">
            {tokens.map((token, i) => (
              <TokenChip
                key={`${token.token}-${i}`}
                token={token}
                index={i}
                dimmed={activeFilter !== null && token.category !== activeFilter}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <LanguageLegend
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        <div style={{ height: 1, background: isLight ? "rgba(18,18,18,0.08)" : "rgba(255,255,255,0.06)" }} />

        {/* 3-tier breakdown */}
        <IntentBreakdown data={analysisResult} />

      </div>
    </div>
  );
}
