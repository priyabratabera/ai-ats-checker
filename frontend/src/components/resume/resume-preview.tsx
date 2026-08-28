"use client";

import { Fragment } from "react";
import type { Highlight, HighlightType } from "@/types/analysis";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const HIGHLIGHT_STYLES: Record<HighlightType, string> = {
  "matched-keyword":
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  "missing-keyword": "",
  "weak-phrase": "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  "quantify-suggestion": "bg-brand-100 text-brand-900 dark:bg-brand-900/40 dark:text-brand-200",
};

interface Segment {
  text: string;
  highlight: Highlight | null;
}

function buildSegments(text: string, highlights: Highlight[]): Segment[] {
  const positioned = highlights
    .filter((h) => h.startIndex >= 0)
    .sort((a, b) => a.startIndex - b.startIndex);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const highlight of positioned) {
    if (highlight.startIndex > cursor) {
      segments.push({ text: text.slice(cursor, highlight.startIndex), highlight: null });
    }
    segments.push({ text: text.slice(highlight.startIndex, highlight.endIndex), highlight });
    cursor = highlight.endIndex;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), highlight: null });
  }
  return segments;
}

export function ResumePreview({ resumeText, highlights }: { resumeText: string; highlights: Highlight[] }) {
  const segments = buildSegments(resumeText, highlights);

  return (
    <div className="max-h-[32rem] overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
      {segments.map((segment, idx) => {
        if (!segment.highlight) {
          return <Fragment key={idx}>{segment.text}</Fragment>;
        }
        const { highlight } = segment;
        return (
          <Tooltip key={idx} delayDuration={150}>
            <TooltipTrigger asChild>
              <mark
                className={cn("rounded px-0.5 py-px cursor-help", HIGHLIGHT_STYLES[highlight.type])}
              >
                {segment.text}
              </mark>
            </TooltipTrigger>
            <TooltipContent side="top">{highlight.message}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
