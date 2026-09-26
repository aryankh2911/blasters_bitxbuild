"use client";

import { useEngineTheme } from "@/components/EngineThemeContext";

interface ExampleInputsProps {
  onSelect: (text: string) => void;
}

const EXAMPLES = [
  { text: "chai shai peena hai yaar",            label: "chai shai peena hai yaar" },
  { text: "larka bahut smart hai, meeting mein", label: "larka bahut smart hai" },
  { text: "dimag ka dahi mat kar yaar",           label: "dimag ka dahi mat kar" },
  { text: "mtlb kya hai, ghr pe hai kya",         label: "mtlb kya hai, ghr pe" },
  { text: "chill maar, koi tension nahi",         label: "chill maar, koi tension nahi" },
  { text: "bahut zyada kaam hai, mood off hai",   label: "mood off hai aaj" },
  { text: "seedha baat kar, bakwaas band kar",    label: "seedha baat kar" },
  { text: "kya scene hai yaar, sab theek hai na", label: "kya scene hai yaar" },
];

export function ExampleInputs({ onSelect }: ExampleInputsProps) {
  const engineTheme = useEngineTheme();
  const isLight = engineTheme === "light";

  return (
    <div className="flex flex-col gap-2">
      <p style={{ fontFamily: "var(--font-outfit)", fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: isLight ? "rgba(18,18,18,0.4)" : "rgba(255,255,255,0.35)", textAlign: "center" }}>
        Try an example
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {EXAMPLES.map(({ text, label }) => (
          <button
            key={text}
            onClick={() => onSelect(text)}
            style={{
              fontFamily: "var(--font-geist-mono)",
              fontSize: 12,
              borderRadius: 0,
              border: isLight ? "1.5px solid rgba(18,18,18,0.18)" : "1.5px solid rgba(255,255,255,0.08)",
              background: isLight ? "rgba(18,18,18,0.04)" : "rgba(255,255,255,0.04)",
              color: isLight ? "#444" : "rgba(255,255,255,0.45)",
              padding: "6px 12px",
              cursor: "pointer",
              boxShadow: isLight ? "2px 2px 0 rgba(18,18,18,0.1)" : "none",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
