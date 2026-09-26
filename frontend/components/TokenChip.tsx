"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CHIP_CLASSES, CHIP_CLASSES_LIGHT, CATEGORY_LABELS } from "@/types/analysis";
import { useEngineTheme } from "@/components/EngineThemeContext";
import type { TokenClassification } from "@/types/analysis";
import { cn } from "@/lib/utils";

interface TokenChipProps {
  token: TokenClassification;
  index: number;
  dimmed?: boolean;
}

export function TokenChip({ token, index, dimmed = false }: TokenChipProps) {
  const engineTheme = useEngineTheme();
  const chipClass = engineTheme === "light" ? CHIP_CLASSES_LIGHT[token.category] : CHIP_CLASSES[token.category];
  const label = CATEGORY_LABELS[token.category];

  // Hard-shadow color per category (Bauhaus dark translation)
  const SHADOWS: Record<string, string> = {
    english:         "2px 2px 0px rgba(14,165,233,0.35)",
    vernacular:      "2px 2px 0px rgba(20,184,166,0.35)",
    dialect_variant: "2px 2px 0px rgba(234,88,12,0.4)",
    reduplication:   "2px 2px 0px rgba(168,85,247,0.35)",
    idiom_slang:     "2px 2px 0px rgba(217,119,6,0.4)",
  };

  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          "inline-flex items-center px-2.5 py-1 text-[12px] font-mono font-medium cursor-default select-none animate-chip transition-opacity duration-150",
          chipClass,
          dimmed && "opacity-15"
        )}
        style={{
          animationDelay: `${index * 50}ms`,
          borderRadius: 0,
          boxShadow: dimmed ? "none" : SHADOWS[token.category],
          fontFamily: "var(--font-geist-mono)",
          letterSpacing: "0.02em",
        }}
      >
        {token.token}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-xs text-xs"
        style={{
          fontFamily: "var(--font-outfit)",
          borderRadius: 0,
          border: engineTheme === "light" ? "2px solid rgba(18,18,18,0.15)" : "2px solid rgba(255,255,255,0.12)",
          background: engineTheme === "light" ? "#fff" : "#09090b",
          color: engineTheme === "light" ? "#121212" : undefined,
        }}
      >
        <p className="font-semibold mb-0.5" style={{ textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 9 }}>{label}</p>
        <p className="text-muted-foreground">{token.explanation}</p>
      </TooltipContent>
    </Tooltip>
  );
}
