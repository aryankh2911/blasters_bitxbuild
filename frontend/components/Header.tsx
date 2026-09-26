"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sun, Moon } from "lucide-react";
import { fetchHealth } from "@/lib/api";
import type { EngineTheme } from "@/components/EngineThemeContext";

const C = { bg: "#F0F0F0", ink: "#121212", red: "#D02020", blue: "#1040C0", yellow: "#F0C020" };

const badgeBase: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8,
  padding: "8px 16px",
  fontFamily: "var(--font-outfit)",
  fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em",
  textTransform: "uppercase",
  border: `2px solid ${C.ink}`,
  boxShadow: `3px 3px 0 ${C.ink}`,
};

interface HeaderProps {
  theme?: EngineTheme;
  onToggleTheme?: () => void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  const [mockMode, setMockMode] = useState<boolean | null>(null);

  useEffect(() => {
    fetchHealth().then((h) => setMockMode(h ? h.mock_mode : null));
  }, []);

  return (
    <header style={{
      height: 64, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 clamp(16px, 4vw, 32px)",
      background: C.bg,
      borderBottom: `4px solid ${C.ink}`,
      color: C.ink,
    }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: C.ink }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.red }} />
          <div style={{ width: 10, height: 10, background: C.blue }} />
          <div style={{ width: 10, height: 10, background: C.yellow, transform: "rotate(45deg)" }} />
        </div>
        <span style={{ fontFamily: "var(--font-instrument-serif)", fontSize: 22, fontStyle: "italic", fontWeight: 400 }}>
          Samajh
        </span>
        <span style={{ fontFamily: "var(--font-outfit)", fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#555", marginLeft: 4 }}>
          समझ · سمجھ
        </span>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontFamily: "var(--font-outfit)", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.ink }}>
            ← Home
          </span>
        </Link>

        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            style={{
              width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: theme === "light" ? C.ink : C.bg,
              color: theme === "light" ? C.bg : C.ink,
              border: `2px solid ${C.ink}`,
              boxShadow: `2px 2px 0 ${C.ink}`,
              cursor: "pointer", flexShrink: 0,
            }}
          >
            {theme === "light" ? <Moon size={13} /> : <Sun size={13} />}
          </button>
        )}

        {mockMode === null ? (
          <span style={{ ...badgeBase, background: C.bg, color: "#777", boxShadow: "none", border: "2px solid rgba(18,18,18,0.25)" }}>
            Connecting…
          </span>
        ) : mockMode ? (
          <span style={{ ...badgeBase, background: C.yellow, color: C.ink }}>
            <span style={{ width: 7, height: 7, background: C.ink }} />
            Samajh · Demo
          </span>
        ) : (
          <span style={{ ...badgeBase, background: C.ink, color: C.bg }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", animation: "glass-pulse 1.5s ease-in-out infinite" }} />
            Samajh · Live
          </span>
        )}
      </div>
    </header>
  );
}
