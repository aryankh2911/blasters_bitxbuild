"use client";

import { CATEGORY_LABELS } from "@/types/analysis";
import type { TokenCategory } from "@/types/analysis";
import { useEngineTheme } from "@/components/EngineThemeContext";
import { cn } from "@/lib/utils";

const LEGEND_ITEMS: { category: TokenCategory; dot: string }[] = [
  { category: "english",         dot: "bg-blue-500" },
  { category: "vernacular",      dot: "bg-emerald-500" },
  { category: "dialect_variant", dot: "bg-rose-500" },
  { category: "reduplication",   dot: "bg-violet-500" },
  { category: "idiom_slang",     dot: "bg-amber-500" },
];

interface LanguageLegendProps {
  activeFilter: TokenCategory | null;
  onFilterChange: (category: TokenCategory | null) => void;
}

export function LanguageLegend({ activeFilter, onFilterChange }: LanguageLegendProps) {
  const engineTheme = useEngineTheme();
  const baseColor = engineTheme === "light" ? "text-zinc-600" : "text-zinc-400";
  const dimColor  = engineTheme === "light" ? "text-zinc-400" : "text-zinc-600";

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {LEGEND_ITEMS.map(({ category, dot }) => {
        const isActive = activeFilter === null || activeFilter === category;
        return (
          <button
            key={category}
            onClick={() => onFilterChange(activeFilter === category ? null : category)}
            className={cn(
              "flex items-center gap-1.5 text-[11px] transition-all duration-150",
              isActive ? `opacity-100 ${baseColor}` : `opacity-30 ${dimColor}`
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dot)} />
            <span>{CATEGORY_LABELS[category]}</span>
          </button>
        );
      })}
    </div>
  );
}
