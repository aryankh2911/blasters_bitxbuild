"use client";

import { useState } from "react";
import Link from "next/link";

const C = {
  bg:     "#F0F0F0",
  ink:    "#121212",
  red:    "#D02020",
  blue:   "#1040C0",
  yellow: "#F0C020",
  muted:  "#E0E0E0",
};

const TOKEN_CATS = [
  { num: "01", label: "English",         eg: "meeting, plan, okay",       color: C.blue },
  { num: "02", label: "Vernacular",      eg: "yaar, ghar, bahut",         color: "#1a7a4a" },
  { num: "03", label: "Dialect Variant", eg: "larka ↔ ladka",             color: C.red },
  { num: "04", label: "Reduplication",   eg: "chai shai, ghumna phumna",  color: "#6B2F9E" },
  { num: "05", label: "Idiom / Slang",   eg: "dimag ka dahi, kya scene",  color: "#A06020" },
];

const STEPS = [
  { num: "01", label: "Input your phrase",  desc: "Type anything in Hinglish or Roman Urdu — no transliteration needed.", shape: "circle", color: C.blue },
  { num: "02", label: "Tokens classified",  desc: "Every word is tagged across 5 categories before the LLM sees it.",    shape: "square", color: C.red },
  { num: "03", label: "3-tier breakdown",   desc: "Literal meaning → pragmatic intent → cultural subtext.",               shape: "circle", color: C.yellow },
];

const CITY_CARDS = [
  {
    city: "Varanasi",  phrase: "Ganga kinare chai shai",  accentBg: "#D02020",
    svgContent: (
      // Ghats: stacked rectangles + steps + circle sun
      <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
        <rect x="0" y="0" width="200" height="240" fill="#F0C020"/>
        {/* Water */}
        <rect x="0" y="180" width="200" height="60" fill="#1040C0"/>
        {/* Ghat steps */}
        {[0,1,2,3,4].map(i => <rect key={i} x={i*8} y={160-i*12} width={200-i*16} height={24} fill="#121212" rx="0"/>)}
        {/* Temple spires */}
        <rect x="30" y="60" width="18" height="100" fill="#121212"/>
        <polygon points="30,60 39,30 48,60" fill="#D02020"/>
        <rect x="80" y="80" width="14" height="80" fill="#121212"/>
        <polygon points="80,80 87,55 94,80" fill="#D02020"/>
        <rect x="130" y="50" width="22" height="110" fill="#121212"/>
        <polygon points="130,50 141,18 152,50" fill="#D02020"/>
        {/* Sun */}
        <circle cx="170" cy="40" r="20" fill="#121212"/>
        <circle cx="170" cy="40" r="14" fill="#F0C020"/>
      </svg>
    ),
  },
  {
    city: "Mumbai",  phrase: "Kya scene hai bhai",  accentBg: "#1040C0",
    svgContent: (
      // Skyline: vertical rectangles of varying heights
      <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
        <rect x="0" y="0" width="200" height="240" fill="#1040C0"/>
        {/* Sea */}
        <rect x="0" y="190" width="200" height="50" fill="#121212" opacity="0.5"/>
        {/* Buildings */}
        {[
          {x:5,y:80,w:28,h:160},{x:38,y:100,w:20,h:140},{x:63,y:60,w:32,h:180},
          {x:100,y:110,w:18,h:130},{x:123,y:40,w:36,h:200},{x:164,y:90,w:22,h:150},
        ].map((b,i) => (
          <g key={i}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={i%2===0?"#F0F0F0":"#F0C020"}/>
            {/* windows */}
            {Array.from({length:6}).map((_,r) => Array.from({length:2}).map((_,c) => (
              <rect key={`${r}-${c}`} x={b.x+4+c*(b.w/2-2)} y={b.y+12+r*18} width={b.w/2-6} height={10} fill="#121212" opacity="0.5"/>
            )))}
          </g>
        ))}
        {/* Moon */}
        <circle cx="30" cy="35" r="16" fill="#F0C020"/>
        <circle cx="40" cy="28" r="13" fill="#1040C0"/>
      </svg>
    ),
  },
  {
    city: "Jaipur",  phrase: "Bilkul sahi hai yaar",  accentBg: "#F0C020",
    svgContent: (
      // Palace: arch + geometric ornament
      <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
        <rect x="0" y="0" width="200" height="240" fill="#D02020"/>
        {/* Ground */}
        <rect x="0" y="200" width="200" height="40" fill="#121212"/>
        {/* Palace base */}
        <rect x="20" y="120" width="160" height="80" fill="#F0C020"/>
        {/* Arched facade */}
        {[0,1,2,3,4].map(i => (
          <g key={i}>
            <rect x={28+i*30} y="130" width="18" height="60" fill="#121212"/>
            <path d={`M ${28+i*30} 130 Q ${37+i*30} 112 ${46+i*30} 130`} fill="#121212"/>
          </g>
        ))}
        {/* Centre dome */}
        <rect x="76" y="60" width="48" height="60" fill="#F0C020"/>
        <path d="M 76 60 Q 100 20 124 60" fill="#F0C020"/>
        <path d="M 80 60 Q 100 24 120 60" fill="#D02020"/>
        {/* Finials */}
        <circle cx="100" cy="22" r="6" fill="#121212"/>
        <rect x="98" y="10" width="4" height="14" fill="#121212"/>
        {/* Top towers */}
        {[40,160].map((x,i) => <g key={i}><rect x={x-8} y="80" width="16" height="40" fill="#F0C020"/><path d={`M ${x-8} 80 Q ${x} 60 ${x+8} 80`} fill="#F0C020"/></g>)}
      </svg>
    ),
  },
  {
    city: "Old Delhi",  phrase: "Seedha baat karo",  accentBg: "#121212",
    svgContent: (
      // Bazaar street: repeating arch shapes + geometric crowd
      <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
        <rect x="0" y="0" width="200" height="240" fill="#121212"/>
        {/* Sky stripe */}
        <rect x="0" y="0" width="200" height="70" fill="#D02020"/>
        {/* Fort silhouette */}
        <rect x="40" y="20" width="120" height="50" fill="#121212"/>
        {[50,70,90,110,130].map((x,i) => <rect key={i} x={x} y="10" width="10" height="18" fill="#121212"/>)}
        {/* Arched corridor */}
        <rect x="0" y="140" width="200" height="100" fill="#1040C0"/>
        {[0,1,2,3].map(i => (
          <g key={i}>
            <rect x={i*52} y="100" width="40" height="140" fill="#F0C020"/>
            <path d={`M ${i*52} 100 Q ${i*52+20} 72 ${i*52+40} 100`} fill="#F0C020"/>
            <rect x={i*52+8} y="110" width="24" height="40" fill="#D02020"/>
            <path d={`M ${i*52+8} 110 Q ${i*52+20} 94 ${i*52+32} 110`} fill="#D02020"/>
          </g>
        ))}
        {/* Geometric figures (people) */}
        {[30,80,130,170].map((x,i) => (
          <g key={i}>
            <circle cx={x} cy="195" r="7" fill="#F0F0F0"/>
            <rect x={x-5} y="202" width="10" height="20" fill="#F0F0F0"/>
          </g>
        ))}
      </svg>
    ),
  },
];

export default function LandingPage() {
  const [hoveredCity, setHoveredCity] = useState<number | null>(null);

  return (
    <div style={{ background: C.bg, color: C.ink, fontFamily: "var(--font-outfit), system-ui, sans-serif", overflowX: "hidden" }}>

      {/* NAV */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: C.bg, borderBottom: `4px solid ${C.ink}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 clamp(16px,5vw,64px)", height: 64,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.red }} />
            <div style={{ width: 10, height: 10, background: C.blue }} />
            <div style={{ width: 10, height: 10, background: C.yellow, transform: "rotate(45deg)" }} />
          </div>
          <span style={{ fontFamily: "var(--font-instrument-serif)", fontSize: 22, fontStyle: "italic", fontWeight: 400 }}>Samajh</span>
          <span style={{ fontFamily: "var(--font-outfit)", fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#555", marginLeft: 4 }}>समझ · سمجھ</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {[{ label: "HOW IT WORKS", target: "how-it-works" }, { label: "EXAMPLES", target: "examples" }].map(({ label, target }) => (
            <span
              key={label}
              onClick={() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth" })}
              style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: C.ink, cursor: "pointer", textTransform: "uppercase" }}
            >{label}</span>
          ))}
          <Link href="/app">
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
              background: C.red, color: "#fff", padding: "10px 22px",
              border: `2px solid ${C.ink}`, boxShadow: `4px 4px 0 ${C.ink}`,
              cursor: "pointer", display: "inline-block",
            }}>OPEN ENGINE</span>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "calc(100vh - 64px)", borderBottom: `4px solid ${C.ink}` }}>
        <div style={{ padding: "clamp(40px,6vw,80px)", display: "flex", flexDirection: "column", justifyContent: "center", borderRight: `4px solid ${C.ink}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.red, marginBottom: 24 }}>South Asian Vernacular Engine</div>
          <h1 style={{ fontSize: "clamp(36px,5.5vw,76px)", fontWeight: 900, lineHeight: 0.92, letterSpacing: "-0.03em", textTransform: "uppercase", marginBottom: 32 }}>
            The gap between<br />
            <span style={{ color: C.red }}>what&apos;s said</span><br />
            and what&apos;s meant.
          </h1>
          <p style={{ fontSize: "clamp(14px,1.2vw,17px)", fontWeight: 500, lineHeight: 1.7, color: "#444", marginBottom: 40, maxWidth: 420 }}>
            Samajh decodes Hinglish and Roman Urdu — not just the words, but the intent behind them and the culture they carry.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/app">
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", background: C.ink, color: C.bg, padding: "14px 32px", border: `2px solid ${C.ink}`, boxShadow: `4px 4px 0 ${C.red}`, cursor: "pointer", display: "inline-block" }}>OPEN THE ENGINE →</span>
            </Link>
            <span onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })} style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", background: "transparent", color: C.ink, padding: "14px 32px", border: `2px solid ${C.ink}`, boxShadow: `4px 4px 0 ${C.ink}`, cursor: "pointer", display: "inline-block" }}>HOW IT WORKS</span>
          </div>
        </div>
        <div style={{ background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", minHeight: 480 }}>
          <div style={{ position: "absolute", width: "70%", aspectRatio: "1", borderRadius: "50%", border: `4px solid rgba(255,255,255,0.18)`, top: "10%", left: "10%" }} />
          <div style={{ position: "absolute", width: "40%", aspectRatio: "1", border: `4px solid rgba(255,255,255,0.22)`, transform: "rotate(45deg)", bottom: "12%", right: "8%" }} />
          <div style={{ position: "absolute", width: 24, height: 24, background: C.yellow, top: "22%", right: "25%" }} />
          <div style={{ position: "absolute", width: 16, height: 16, borderRadius: "50%", background: C.red, bottom: "28%", left: "20%" }} />
          <div style={{ fontFamily: "var(--font-instrument-serif)", fontSize: "clamp(80px,14vw,180px)", fontStyle: "italic", fontWeight: 400, color: "rgba(255,255,255,0.92)", lineHeight: 1, userSelect: "none", zIndex: 1, textShadow: `6px 6px 0 rgba(0,0,0,0.22)` }}>समझ</div>
        </div>
      </section>

      {/* STATS BAR */}
      <section style={{ background: C.yellow, borderBottom: `4px solid ${C.ink}`, display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
        {[{ n: "5", label: "Token Categories" }, { n: "3", label: "Analysis Tiers" }, { n: "2", label: "Language Scripts" }, { n: "∞", label: "Cultural Contexts" }].map((s, i) => (
          <div key={i} style={{ padding: "clamp(24px,3vw,40px)", borderRight: i < 3 ? `4px solid ${C.ink}` : "none", display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "clamp(36px,4.5vw,64px)", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.04em" }}>{s.n}</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#333" }}>{s.label}</span>
          </div>
        ))}
      </section>

      {/* THE PROBLEM */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `4px solid ${C.ink}` }}>
        {/* Left — problem statement */}
        <div style={{ padding: "clamp(40px,5vw,72px) clamp(16px,5vw,64px)", borderRight: `4px solid ${C.ink}`, display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.red }}>The Problem</div>
          <h2 style={{ fontSize: "clamp(22px,3vw,40px)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.03em", lineHeight: 0.95, color: C.ink }}>
            1.5 billion people speak<br />
            <span style={{ color: C.blue }}>between two languages.</span><br />
            No tool understands them.
          </h2>
          <p style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.7, color: "#444", maxWidth: 420 }}>
            Hinglish and Roman Urdu are not broken English. They are a complete register — with grammar, idiom, and cultural subtext that standard NLP tools simply cannot see. A literal translation of &ldquo;chai shai peena hai&rdquo; misses everything that actually matters.
          </p>
        </div>
        {/* Right — what Samajh does */}
        <div style={{ padding: "clamp(40px,5vw,72px) clamp(16px,5vw,64px)", background: C.muted, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.blue }}>What Samajh Does</div>
          {[
            { num: "01", label: "Phonetic pre-processing", desc: "Normalises retroflex variants, vowel compressions, and h-drops before the LLM sees anything." },
            { num: "02", label: "5-category token tagging", desc: "Every word is classified: English · Vernacular · Dialect Variant · Reduplication · Idiom." },
            { num: "03", label: "3-tier pragmatic breakdown", desc: "Literal meaning → pragmatic intent → cultural subtext. The full picture, not just the words." },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, flexShrink: 0, background: i === 0 ? C.red : i === 1 ? C.blue : C.yellow, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.ink}` }}>
                <span style={{ fontSize: 10, fontWeight: 900, color: i === 2 ? C.ink : "#fff" }}>{item.num}</span>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.02em", marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#555", lineHeight: 1.55 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: "clamp(48px,6vw,88px) clamp(16px,5vw,64px)", borderBottom: `4px solid ${C.ink}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.red, marginBottom: 32 }}>How it works</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 0 }}>
          {STEPS.map((step, i) => (
            <div key={i} style={{ padding: "clamp(24px,3vw,40px)", border: `2px solid ${C.ink}`, borderRight: i < 2 ? "none" : `2px solid ${C.ink}`, boxShadow: i === 1 ? `8px 8px 0 ${C.ink}` : "none", background: i === 1 ? C.muted : C.bg, position: "relative" }}>
              <div style={{ width: 48, height: 48, borderRadius: step.shape === "circle" ? "50%" : 0, background: step.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, border: `2px solid ${C.ink}` }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: step.color === C.yellow ? C.ink : "#fff" }}>{step.num}</span>
              </div>
              <h3 style={{ fontSize: "clamp(16px,1.6vw,22px)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em", marginBottom: 12 }}>{step.label}</h3>
              <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.65, color: "#444" }}>{step.desc}</p>
              {i < 2 && <div style={{ position: "absolute", right: -18, top: "50%", transform: "translateY(-50%)", fontSize: 24, fontWeight: 900, color: C.ink, zIndex: 2 }}>→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* TOKEN CATEGORIES */}
      <section id="examples" style={{ background: C.red, padding: "clamp(48px,6vw,88px) clamp(16px,5vw,64px)", borderBottom: `4px solid ${C.ink}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 12 }}>Five token categories</div>
        <h2 style={{ fontSize: "clamp(28px,4vw,54px)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.03em", color: "#fff", marginBottom: 40, lineHeight: 0.95 }}>Every word classified<br />before meaning is decoded.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
          {TOKEN_CATS.map((cat, i) => (
            <div key={i} style={{ background: "#fff", border: `2px solid ${C.ink}`, boxShadow: `4px 4px 0 ${C.ink}`, padding: "20px 16px", position: "relative" }}>
              <div style={{ position: "absolute", top: 8, right: 8, width: 10, height: 10, borderRadius: i % 2 === 0 ? "50%" : 0, background: cat.color }} />
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: cat.color, marginBottom: 10 }}>{cat.num}</div>
              <div style={{ fontSize: "clamp(12px,1vw,15px)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.01em", marginBottom: 10 }}>{cat.label}</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#555", fontFamily: "var(--font-geist-mono)", lineHeight: 1.5 }}>{cat.eg}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 3-TIER EXPLAINER */}
      <section style={{ padding: "clamp(48px,6vw,88px) clamp(16px,5vw,64px)", borderBottom: `4px solid ${C.ink}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.red, marginBottom: 12 }}>Three-tier pragmatic breakdown</div>
        <h2 style={{ fontSize: "clamp(24px,3.5vw,48px)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.03em", marginBottom: 48, lineHeight: 0.95 }}>&ldquo;Chai shai peena hai&rdquo;<br />is not about tea.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 0 }}>
          {[
            { num: "01", label: "Literal",          text: "Tea and such things, there is a desire to drink.",                                                                                 bg: C.bg,   accent: C.ink, italic: true },
            { num: "02", label: "Pragmatic Intent",  text: "Exhaustion signal. An indirect invitation to pause together — social comfort sought, not a beverage order.",                       bg: C.blue, accent: "#fff", italic: false },
            { num: "03", label: "Cultural Subtext",  text: "'Chai shai' is echo reduplication. 'Shai' has no meaning — it signals casual plurality and pan-South-Asian warmth.",              bg: C.ink,  accent: C.yellow, italic: false },
          ].map((t, i) => (
            <div key={i} style={{ background: t.bg, border: `2px solid ${C.ink}`, borderRight: i < 2 ? "none" : `2px solid ${C.ink}`, padding: "clamp(24px,3vw,40px)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ width: 32, height: 32, borderRadius: i === 1 ? 0 : "50%", background: i === 2 ? C.yellow : C.red, border: i === 0 ? `2px solid ${C.ink}` : "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: C.ink }}>{t.num}</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: i === 0 ? C.red : i === 1 ? "rgba(255,255,255,0.65)" : C.yellow }}>{t.label}</span>
              </div>
              <p style={{ fontSize: "clamp(14px,1.2vw,17px)", fontWeight: 500, lineHeight: 1.65, color: t.accent, fontFamily: t.italic ? "var(--font-instrument-serif)" : "var(--font-outfit)", fontStyle: t.italic ? "italic" : "normal" }}>{t.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CITY GALLERY — Bauhaus SVG illustrations */}
      <section id="examples" style={{ borderBottom: `4px solid ${C.ink}`, display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
        {CITY_CARDS.map((card, i) => (
          <div key={i}
            style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden", borderRight: i < 3 ? `4px solid ${C.ink}` : "none", cursor: "pointer", transition: "transform 0.3s ease" }}
            onMouseEnter={() => setHoveredCity(i)}
            onMouseLeave={() => setHoveredCity(null)}
          >
            <div style={{ width: "100%", height: "100%", transform: hoveredCity === i ? "scale(1.04)" : "scale(1)", transition: "transform 0.5s ease" }}>
              {card.svgContent}
            </div>
            <div style={{
              position: "absolute", inset: 0,
              background: hoveredCity === i ? `linear-gradient(transparent 50%, ${card.accentBg}cc)` : `linear-gradient(transparent 55%, rgba(18,18,18,0.88))`,
              transition: "background 0.4s ease",
              display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 16,
            }}>
              <div style={{ fontFamily: "var(--font-outfit)", fontSize: 15, fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.01em", color: "#fff" }}>{card.city}</div>
              <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>&ldquo;{card.phrase}&rdquo;</div>
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section style={{ background: C.yellow, borderBottom: `4px solid ${C.ink}`, padding: "clamp(48px,7vw,96px) clamp(16px,5vw,64px)", display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 40, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: "18%", top: "-30%", width: "30vw", height: "30vw", borderRadius: "50%", border: `4px solid rgba(18,18,18,0.1)`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: "8%", bottom: "-40%", width: "20vw", height: "20vw", border: `4px solid rgba(18,18,18,0.08)`, transform: "rotate(45deg)", pointerEvents: "none" }} />
        <div style={{ zIndex: 1 }}>
          <h2 style={{ fontSize: "clamp(32px,5vw,72px)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.03em", lineHeight: 0.92, marginBottom: 16 }}>
            Samajh karo.<br /><span style={{ color: C.red }}>Understand.</span>
          </h2>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#333", maxWidth: 360 }}>Type anything in Hinglish or Roman Urdu. The engine decodes it — token by token, layer by layer.</p>
        </div>
        <Link href="/app" style={{ zIndex: 1 }}>
          <span style={{ display: "inline-block", fontSize: 13, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", background: C.ink, color: C.bg, padding: "18px 40px", border: `2px solid ${C.ink}`, boxShadow: `6px 6px 0 ${C.red}`, cursor: "pointer", whiteSpace: "nowrap" }}>OPEN ENGINE →</span>
        </Link>
      </section>

      {/* FOOTER */}
      <footer style={{ background: C.ink, color: C.bg, padding: "0 clamp(16px,5vw,64px)", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.red }} />
              <div style={{ width: 8, height: 8, background: C.blue }} />
              <div style={{ width: 8, height: 8, background: C.yellow, transform: "rotate(45deg)" }} />
            </div>
            <span style={{ fontFamily: "var(--font-instrument-serif)", fontSize: 16, fontStyle: "italic" }}>Samajh</span>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>Hinglish · Roman Urdu · Code-switching</span>
        </div>
        <div style={{ fontFamily: "var(--font-outfit)", fontSize: "clamp(72px,18vw,260px)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.05em", lineHeight: 0.82, color: "rgba(255,255,255,0.04)", transform: "translateY(0.14em)", userSelect: "none" }}>SAMAJH</div>
      </footer>
    </div>
  );
}
