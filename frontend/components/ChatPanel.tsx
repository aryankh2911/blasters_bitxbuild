"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, Loader2, History, Pencil, X } from "lucide-react";
import { ExampleInputs } from "@/components/ExampleInputs";
import { analyzeText, streamChat } from "@/lib/api";
import type { AnalysisResponse, ChatMessage } from "@/types/analysis";
import { useEngineTheme } from "@/components/EngineThemeContext";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  analysisResult: AnalysisResponse | null;
  onAnalysisResult: (result: AnalysisResponse) => void;
  onAnalyzing: (v: boolean) => void;
}

const PLACEHOLDERS = [
  "chai shai peena hai yaar…",
  "kya scene hai bhai, seedha bato…",
  "dimag ka dahi mat kar yaar…",
  "larka bahut smart hai meeting mein…",
  "bahut zyada kaam hai, mood off hai…",
  "chill maar, koi tension nahi…",
];

// Generate 3 contextual follow-up suggestions from the last analysis
function getSuggestions(analysis: AnalysisResponse | null): string[] {
  if (!analysis) return [];
  const suggestions: string[] = [];
  const redup = analysis.script_metadata.echo_reduplications;
  const idioms = analysis.matched_idioms;
  const tokens = analysis.tokens;

  if (redup.length > 0) {
    suggestions.push(`What does "${redup[0]}" actually mean?`);
  } else if (idioms.length > 0) {
    suggestions.push(`Explain "${idioms[0].phrase}" more`);
  } else {
    const v = tokens.find(t => t.category === "vernacular");
    if (v) suggestions.push(`What does "${v.token}" mean here?`);
  }

  const dialects = tokens.filter(t => t.category === "dialect_variant");
  if (dialects.length > 0) {
    suggestions.push(`How would this differ in formal Urdu?`);
  } else {
    suggestions.push(`Give me a more formal way to say this`);
  }

  suggestions.push(`What is the register of this phrase?`);
  return suggestions.slice(0, 3);
}

export function ChatPanel({
  analysisResult,
  onAnalysisResult,
  onAnalyzing,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  // Cycle placeholder when idle
  useEffect(() => {
    if (messages.length > 0) return;
    const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length), 3200);
    return () => clearInterval(t);
  }, [messages.length]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Close history dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Show suggestions after streaming finishes
  useEffect(() => {
    if (!isStreaming && messages.length > 0 && analysisResult) {
      setShowSuggestions(true);
    }
  }, [isStreaming, messages.length, analysisResult]);

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  const send = useCallback(
    (textOverride?: string) => {
      const text = (textOverride ?? input).trim();
      if (!text || isStreaming) return;

      setShowSuggestions(false);

      // If editing a message, remove from that point onwards
      let historySnapshot: ChatMessage[];
      if (editingIdx !== null) {
        const truncated = messages.slice(0, editingIdx);
        historySnapshot = truncated;
        setMessages(truncated);
        setEditingIdx(null);
      } else {
        historySnapshot = [...messages];
      }

      const userMsg: ChatMessage = { role: "user", content: text };
      const newHistory = [...historySnapshot, userMsg];

      setMessages(newHistory);
      setInput("");
      setIsStreaming(true);
      setStreamingText("");
      onAnalyzing(true);

      // Save to query history
      setHistory(prev => {
        const deduped = prev.filter(q => q !== text);
        return [text, ...deduped].slice(0, 12);
      });

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      const previousBreakdown = analysisResult
        ? (analysisResult as unknown as Record<string, unknown>)
        : undefined;

      analyzeText(text)
        .then(result => { onAnalysisResult(result); onAnalyzing(false); })
        .catch(() => onAnalyzing(false));

      let accumulated = "";
      streamChat(
        { message: text, history: historySnapshot, previous_breakdown: previousBreakdown },
        chunk => { accumulated += chunk; setStreamingText(accumulated); },
        () => {
          setMessages(prev => [...prev, { role: "assistant", content: accumulated }]);
          setStreamingText("");
          setIsStreaming(false);
        },
        () => {
          if (accumulated) setMessages(prev => [...prev, { role: "assistant", content: accumulated }]);
          setStreamingText("");
          setIsStreaming(false);
        },
      );
    },
    [input, messages, isStreaming, analysisResult, onAnalysisResult, onAnalyzing, editingIdx],
  );

  function handleEdit(idx: number, content: string) {
    setInput(content);
    setEditingIdx(idx);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const canSend = input.trim().length > 0 && !isStreaming;
  const suggestions = getSuggestions(analysisResult);
  const engineTheme = useEngineTheme();
  const isLight = engineTheme === "light";

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden", position: "relative", zIndex: 1 }}>
      {/* Message history — constrained scroll container */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
        <div className="flex flex-col gap-5 p-5">

          {/* Empty state */}
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col gap-6 mt-8">
              <div className="text-center space-y-1.5">
                <p style={{ fontSize: 14, fontWeight: 600, color: isLight ? "#222" : "rgba(255,255,255,0.85)" }}>South Asian Vernacular Engine</p>
                <p style={{ fontSize: 12, lineHeight: 1.65, color: isLight ? "#777" : "rgba(255,255,255,0.4)", maxWidth: 260, margin: "0 auto" }}>
                  Type a Hinglish or Roman Urdu phrase. The dashboard will break down every token and decode the cultural subtext.
                </p>
              </div>
              <ExampleInputs onSelect={text => send(text)} />
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex flex-col gap-1 group", msg.role === "user" ? "items-end" : "items-start")}>
              <div className="flex items-center gap-2">
                {msg.role === "user" && (
                  <button
                    onClick={() => handleEdit(i, msg.content)}
                    style={{ opacity: 0, color: isLight ? "#999" : "rgba(255,255,255,0.35)", cursor: "pointer" }}
                    className="group-hover:!opacity-100 transition-opacity"
                    title="Edit message"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: isLight ? "#999" : "rgba(255,255,255,0.35)", padding: "0 4px" }}>
                  {msg.role === "user" ? "You" : "Samajh"}
                </span>
              </div>
              {msg.role === "user" ? (
                <div style={{
                  background: isLight ? "#121212" : "rgba(255,255,255,0.07)",
                  border: isLight ? "2px solid #121212" : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: isLight ? "3px 3px 0 rgba(208,32,32,0.25)" : "none",
                  color: isLight ? "#F0F0F0" : "rgba(255,255,255,0.9)",
                  fontFamily: "var(--font-geist-mono)",
                  fontSize: 13, lineHeight: 1.55, padding: "10px 14px",
                  maxWidth: "88%", borderRadius: 0,
                }}>
                  {msg.content}
                </div>
              ) : (
                <div style={{ fontSize: 14, lineHeight: 1.65, color: isLight ? "#2a2a2a" : "rgba(255,255,255,0.75)", maxWidth: "88%" }}>
                  {msg.content}
                </div>
              )}
            </div>
          ))}

          {/* Streaming reply */}
          {streamingText && (
            <div className="flex flex-col gap-1 items-start">
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: isLight ? "#999" : "rgba(255,255,255,0.35)", padding: "0 4px" }}>Samajh</span>
              <div style={{ fontSize: 14, lineHeight: 1.65, color: isLight ? "#2a2a2a" : "rgba(255,255,255,0.75)", maxWidth: "88%" }}>
                {streamingText}
                <span style={{ color: isLight ? "#bbb" : "rgba(255,255,255,0.3)" }} className="animate-cursor ml-0.5">▋</span>
              </div>
            </div>
          )}

          {/* Follow-up suggestion chips */}
          {showSuggestions && !isStreaming && suggestions.length > 0 && (
            <div className="flex flex-col gap-2 mt-1">
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: isLight ? "rgba(18,18,18,0.4)" : "rgba(255,255,255,0.3)", padding: "0 4px" }}>Follow up</span>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setShowSuggestions(false); send(s); }}
                    style={{
                      fontFamily: "var(--font-geist-mono)", fontSize: 11.5,
                      padding: "6px 12px", borderRadius: 0,
                      border: isLight ? "1.5px solid rgba(18,18,18,0.18)" : "1px solid rgba(255,255,255,0.1)",
                      background: isLight ? "rgba(18,18,18,0.04)" : "rgba(255,255,255,0.04)",
                      color: isLight ? "#555" : "rgba(255,255,255,0.45)",
                      cursor: "pointer", textAlign: "left",
                      boxShadow: isLight ? "2px 2px 0 rgba(18,18,18,0.08)" : "none",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div style={{ padding: "12px 16px 16px", flexShrink: 0, borderTop: isLight ? "2px solid rgba(18,18,18,0.1)" : "1px solid rgba(255,255,255,0.06)" }}>

        {/* Quick chips on first load */}
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {["chai shai peena hai", "kya scene hai yaar", "dimag ka dahi mat kar", "larka bahut smart hai"].map(chip => (
              <button key={chip} onClick={() => send(chip)} style={{
                fontFamily: "var(--font-geist-mono)", fontSize: 10.5, padding: "4px 10px",
                border: isLight ? "1.5px solid rgba(18,18,18,0.18)" : "1px solid rgba(255,255,255,0.08)",
                background: isLight ? "rgba(18,18,18,0.04)" : "rgba(255,255,255,0.04)",
                color: isLight ? "#666" : "rgba(255,255,255,0.4)",
                cursor: "pointer", borderRadius: 0,
              }}>
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Edit mode banner */}
        {editingIdx !== null && (
          <div className="flex items-center justify-between mb-2 px-1">
            <span style={{ fontSize: 10, fontFamily: "var(--font-geist-mono)", textTransform: "uppercase", letterSpacing: "0.12em", color: "#D09020" }}>Editing message</span>
            <button onClick={() => { setEditingIdx(null); setInput(""); }} style={{ color: "#999", cursor: "pointer" }}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div style={{
          display: "flex", alignItems: "flex-end", gap: 8,
          border: editingIdx !== null
            ? "2px solid rgba(208,144,32,0.4)"
            : isLight ? "2px solid rgba(18,18,18,0.15)" : "1px solid rgba(255,255,255,0.1)",
          background: editingIdx !== null
            ? "rgba(208,144,32,0.04)"
            : isLight ? "#fff" : "rgba(255,255,255,0.05)",
          boxShadow: isLight ? "3px 3px 0 rgba(18,18,18,0.08)" : "none",
          padding: "10px 14px",
          borderRadius: 0,
        }}>
          {/* History button */}
          <div ref={historyRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowHistory(v => !v)}
              style={{ marginBottom: 2, color: isLight ? "#bbb" : "rgba(255,255,255,0.25)", cursor: "pointer" }}
              title="Query history"
            >
              <History className="h-4 w-4" />
            </button>

            {showHistory && history.length > 0 && (
              <div style={{
                position: "absolute", bottom: "100%", left: 0, marginBottom: 8, width: 288,
                border: isLight ? "2px solid #121212" : "1px solid rgba(255,255,255,0.1)",
                background: isLight ? "#fff" : "rgba(18,18,18,0.97)",
                boxShadow: isLight ? "4px 4px 0 rgba(18,18,18,0.15)" : "0 8px 32px rgba(0,0,0,0.6)",
                overflow: "hidden", zIndex: 50,
              }}>
                <div style={{ padding: "8px 12px", borderBottom: isLight ? "1px solid rgba(18,18,18,0.1)" : "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontFamily: "var(--font-outfit)", fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: isLight ? "#999" : "rgba(255,255,255,0.3)" }}>Recent queries</span>
                </div>
                <div style={{ maxHeight: 208, overflowY: "auto" }}>
                  {history.map((q, i) => (
                    <button key={i} onClick={() => { setInput(q); setShowHistory(false); textareaRef.current?.focus(); }}
                      style={{ width: "100%", textAlign: "left", padding: "10px 12px", fontFamily: "var(--font-geist-mono)", fontSize: 12, color: isLight ? "#444" : "rgba(255,255,255,0.4)", borderBottom: isLight ? "1px solid rgba(18,18,18,0.06)" : "1px solid rgba(255,255,255,0.04)", cursor: "pointer", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={PLACEHOLDERS[placeholderIdx]}
            rows={1}
            disabled={isStreaming}
            style={{
              flex: 1, resize: "none", background: "transparent", maxHeight: 120,
              fontFamily: "var(--font-geist-mono)", fontSize: 14, lineHeight: 1.55,
              color: isLight ? "#121212" : "rgba(255,255,255,0.9)",
              border: "none", outline: "none",
            }}
            className={isLight ? "placeholder:text-zinc-400" : "placeholder:text-zinc-600"}
          />
          <button
            onClick={() => send()}
            disabled={!canSend}
            style={{
              width: 28, height: 28, flexShrink: 0, marginBottom: 2,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: canSend ? "#121212" : (isLight ? "rgba(18,18,18,0.08)" : "rgba(255,255,255,0.05)"),
              color: canSend ? "#F0F0F0" : (isLight ? "rgba(18,18,18,0.3)" : "rgba(255,255,255,0.2)"),
              border: "none", cursor: canSend ? "pointer" : "not-allowed",
              borderRadius: 0,
            }}
            aria-label="Send"
          >
            {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-3.5 w-3.5" />}
          </button>
        </div>
        <p style={{ marginTop: 8, textAlign: "center", fontSize: 10, color: isLight ? "rgba(18,18,18,0.3)" : "rgba(255,255,255,0.18)", fontFamily: "var(--font-outfit)" }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
