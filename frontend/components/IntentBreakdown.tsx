"use client";

import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { AnalysisResponse } from "@/types/analysis";
import { useEngineTheme } from "@/components/EngineThemeContext";

interface IntentBreakdownProps {
  data: AnalysisResponse;
}

// Bauhaus dark: thick colored top border per tier, hard shadow
const TIERS = [
  {
    num: "01",
    label: "Literal Translation",
    key: "literal_translation" as const,
    topColor: "rgba(255,255,255,0.15)",
    numColor: "rgba(255,255,255,0.35)",
    shadow: "3px 3px 0px rgba(255,255,255,0.06)",
    tts: false,
  },
  {
    num: "02",
    label: "Pragmatic Intent",
    key: "pragmatic_intent" as const,
    topColor: "#1040C0",
    numColor: "#4d82ff",
    shadow: "3px 3px 0px rgba(16,64,192,0.3)",
    tts: true,
  },
  {
    num: "03",
    label: "Cultural Subtext",
    key: "cultural_subtext" as const,
    topColor: "#9B3418",
    numColor: "#d4705a",
    shadow: "3px 3px 0px rgba(155,52,24,0.35)",
    tts: false,
  },
] as const;

export function IntentBreakdown({ data }: IntentBreakdownProps) {
  const [speaking, setSpeaking] = useState(false);
  const engineTheme = useEngineTheme();
  const isLight = engineTheme === "light";

  function handleTTS() {
    if (!("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(data.three_tier.pragmatic_intent);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="space-y-3">

      {/* Register badge — Bauhaus style */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span style={{
          fontFamily: "var(--font-outfit)",
          fontSize: 9, fontWeight: 700, letterSpacing: "0.16em",
          textTransform: "uppercase", color: isLight ? "rgba(18,18,18,0.5)" : "rgba(255,255,255,0.3)",
        }}>Register</span>
        <span style={{
          fontFamily: "var(--font-outfit)",
          fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase",
          border: isLight ? "2px solid rgba(160,96,0,0.35)" : "2px solid rgba(240,192,32,0.25)",
          background: isLight ? "rgba(160,96,0,0.08)" : "rgba(240,192,32,0.06)",
          color: isLight ? "#A06000" : "#F0C020",
          padding: "3px 10px",
          borderRadius: 0,
        }}>
          {data.register_tone}
        </span>
      </div>

      {/* Tier cards */}
      <div className="flex flex-col gap-2.5">
        {TIERS.map((tier, idx) => (
          <div
            key={tier.key}
            className="animate-tier"
            style={{
              animationDelay: `${idx * 60}ms`,
              background: isLight ? "rgba(18,18,18,0.04)" : "rgba(255,255,255,0.03)",
              // Use individual border properties to avoid React's border/borderTop conflict warning
              borderTopWidth: 3, borderTopStyle: "solid", borderTopColor: tier.topColor,
              borderRightWidth: 2, borderRightStyle: "solid", borderRightColor: isLight ? "rgba(18,18,18,0.1)" : "rgba(255,255,255,0.07)",
              borderBottomWidth: 2, borderBottomStyle: "solid", borderBottomColor: isLight ? "rgba(18,18,18,0.1)" : "rgba(255,255,255,0.07)",
              borderLeftWidth: 2, borderLeftStyle: "solid", borderLeftColor: isLight ? "rgba(18,18,18,0.1)" : "rgba(255,255,255,0.07)",
              boxShadow: tier.shadow,
              padding: "14px 16px",
              borderRadius: 0,
            }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontFamily: "var(--font-outfit)",
                  fontSize: 10, fontWeight: 900, letterSpacing: "0.1em",
                  // tier 01 numColor is white — swap to ink in light mode
                  color: isLight && tier.numColor.startsWith("rgba(255") ? "rgba(18,18,18,0.55)" : tier.numColor,
                }}>
                  {tier.num}
                </span>
                <span style={{
                  fontFamily: "var(--font-outfit)",
                  fontSize: 9.5, fontWeight: 700, letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: isLight ? "rgba(18,18,18,0.5)" : "rgba(255,255,255,0.4)",
                }}>
                  {tier.label}
                </span>
              </div>
              {tier.tts && (
                <button
                  onClick={handleTTS}
                  className="text-zinc-600 hover:text-zinc-300 transition-colors"
                  title={speaking ? "Stop" : "Read aloud"}
                >
                  {speaking ? (
                    <VolumeX className="h-3.5 w-3.5" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: isLight ? "#444" : "rgba(255,255,255,0.75)" }}>
              {data.three_tier[tier.key]}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
}
