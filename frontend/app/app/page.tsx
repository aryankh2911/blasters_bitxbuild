"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { ChatPanel } from "@/components/ChatPanel";
import { TokenDashboard } from "@/components/TokenDashboard";
import { AuroraBackground } from "@/components/AuroraBackground";
import { EngineThemeContext, type EngineTheme } from "@/components/EngineThemeContext";
import type { AnalysisResponse } from "@/types/analysis";

const LIGHT = { bg: "#F0F0F0", panelR: "#F0F0F0", panelL: "#E8E8E8", border: "#121212", panelBorder: "rgba(18,18,18,0.12)", red: "#D02020", blue: "#1040C0" };
const DARK  = { bg: "#09090b", panelR: "rgba(9,9,11,0.7)", panelL: "rgba(9,9,11,0.65)", border: "rgba(255,255,255,0.08)", panelBorder: "rgba(255,255,255,0.06)", red: "#9B3418", blue: "#1040C0" };

export default function EnginePage() {
  const [theme, setTheme] = useState<EngineTheme>("light");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Persist preference
  useEffect(() => {
    try { const saved = localStorage.getItem("samajh-theme"); if (saved === "dark" || saved === "light") setTheme(saved); } catch {}
  }, []);
  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try { localStorage.setItem("samajh-theme", next); } catch {}
  }

  const T = theme === "light" ? LIGHT : DARK;

  return (
    <EngineThemeContext.Provider value={theme}>
      <div style={{
        display: "flex", flexDirection: "column",
        height: "100vh", overflow: "hidden",
        background: T.bg,
        fontFamily: "var(--font-outfit), system-ui, sans-serif",
        position: "relative",
      }}>
        {theme === "dark" && <AuroraBackground />}

        <Header theme={theme} onToggleTheme={toggleTheme} />

        <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative", zIndex: 1 }}>

          {/* Left — Chat */}
          <div style={{
            display: "flex", flexDirection: "column",
            width: "55%", overflow: "hidden",
            borderRight: `4px solid ${T.border}`,
            background: T.panelR,
          }}>
            <div style={{ height: 4, background: T.red, flexShrink: 0 }} />
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 20px",
              borderBottom: `2px solid ${T.panelBorder}`,
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "var(--font-outfit)", fontSize: 9, fontWeight: 900, color: T.red, letterSpacing: "0.12em" }}>01</span>
                <span style={{ fontFamily: "var(--font-outfit)", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: theme === "light" ? "rgba(18,18,18,0.45)" : "rgba(255,255,255,0.4)" }}>Chat</span>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: "50%", border: `1.5px solid ${T.red}`, opacity: 0.5 }} />
            </div>
            <ChatPanel analysisResult={analysisResult} onAnalysisResult={setAnalysisResult} onAnalyzing={setIsAnalyzing} />
          </div>

          {/* Right — Dashboard */}
          <div style={{
            display: "flex", flexDirection: "column",
            width: "45%", overflow: "hidden",
            background: T.panelL,
          }}>
            <div style={{ height: 4, background: T.blue, flexShrink: 0 }} />
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 20px",
              borderBottom: `2px solid ${T.panelBorder}`,
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "var(--font-outfit)", fontSize: 9, fontWeight: 900, color: T.blue, letterSpacing: "0.12em" }}>02</span>
                <span style={{ fontFamily: "var(--font-outfit)", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: theme === "light" ? "rgba(18,18,18,0.45)" : "rgba(255,255,255,0.4)" }}>Subtext Dashboard</span>
              </div>
              <div style={{ width: 8, height: 8, border: `1.5px solid ${T.blue}`, opacity: 0.5 }} />
            </div>
            <TokenDashboard analysisResult={analysisResult} isAnalyzing={isAnalyzing} />
          </div>
        </div>

        {/* Bottom Bauhaus border — fixed so no flex/overflow clipping can hide it */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 4, background: theme === "light" ? "#121212" : "rgba(255,255,255,0.15)", zIndex: 50 }} />
      </div>
    </EngineThemeContext.Provider>
  );
}
