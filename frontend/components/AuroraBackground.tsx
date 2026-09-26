// Pure CSS aurora — no canvas, no RAF, no stacking-context issues.
// Each beam is an absolutely-positioned div with a radial gradient + keyframe drift.

const BEAMS = [
  {
    // Large terracotta bloom — top-left
    style: {
      width: "70%", height: "55%",
      top: "-15%", left: "-5%",
      background: "radial-gradient(ellipse at center, rgba(155,52,24,0.72) 0%, rgba(155,52,24,0.3) 40%, transparent 70%)",
      filter: "blur(55px)",
      animation: "aurora-drift-1 14s ease-in-out infinite",
    },
  },
  {
    // Wide amber sweep — top-right
    style: {
      width: "75%", height: "45%",
      top: "-8%", right: "-10%",
      background: "radial-gradient(ellipse at center, rgba(184,132,78,0.65) 0%, rgba(184,132,78,0.25) 45%, transparent 70%)",
      filter: "blur(65px)",
      animation: "aurora-drift-2 18s ease-in-out infinite",
    },
  },
  {
    // Deep violet / rose undertone — centre
    style: {
      width: "60%", height: "40%",
      top: "5%", left: "20%",
      background: "radial-gradient(ellipse at center, rgba(107,47,74,0.55) 0%, rgba(107,47,74,0.2) 50%, transparent 72%)",
      filter: "blur(70px)",
      animation: "aurora-drift-3 22s ease-in-out infinite",
    },
  },
  {
    // Terracotta accent — far left edge
    style: {
      width: "45%", height: "35%",
      top: "10%", left: "-8%",
      background: "radial-gradient(ellipse at center, rgba(155,52,24,0.45) 0%, transparent 68%)",
      filter: "blur(50px)",
      animation: "aurora-drift-4 16s ease-in-out infinite",
    },
  },
  {
    // Amber whisper — right
    style: {
      width: "50%", height: "38%",
      top: "15%", right: "2%",
      background: "radial-gradient(ellipse at center, rgba(184,132,78,0.4) 0%, transparent 65%)",
      filter: "blur(60px)",
      animation: "aurora-drift-5 20s ease-in-out infinite",
    },
  },
];

export function AuroraBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {BEAMS.map((beam, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            ...beam.style,
          }}
        />
      ))}
    </div>
  );
}
