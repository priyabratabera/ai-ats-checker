"use client";

import type { ScoreCategory } from "@/types/analysis";
import { scoreBand, SCORE_BAND_COLORS } from "./score-band";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function CategoryMeter({ category }: { category: ScoreCategory }) {
  const band = scoreBand(category.score);
  const color = SCORE_BAND_COLORS[band];

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <div className="flex flex-col gap-1.5 py-2 text-left w-full">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {category.label}
            </span>
            <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-50">
              {category.score}%
            </span>
          </div>
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
            role="meter"
            aria-valuenow={category.score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={category.label}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${category.score}%`,
                backgroundColor: color,
                transition: "width 700ms ease-out",
              }}
            />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">{category.summary}</TooltipContent>
    </Tooltip>
  );
}
