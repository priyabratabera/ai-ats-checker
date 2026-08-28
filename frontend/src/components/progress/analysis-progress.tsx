"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import type { AnalysisProgressEvent, AnalysisStage } from "@/types/analysis";
import { ANALYSIS_STAGE_LABELS } from "@/types/analysis";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STAGE_ORDER: AnalysisStage[] = [
  "parsing",
  "keywords",
  "semantic",
  "formatting",
  "structure",
  "scoring",
  "recommendations",
];

export function AnalysisProgress({ events }: { events: AnalysisProgressEvent[] }) {
  const latestByStage = new Map<AnalysisStage, AnalysisProgressEvent>();
  for (const event of events) latestByStage.set(event.stage, event);

  const currentProgress = events.length > 0 ? events[events.length - 1].progress : 4;
  const currentMessage = events.length > 0
    ? events[events.length - 1].message
    : "Preparing analysis...";

  return (
    <Card>
      <CardContent className="p-6 sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{currentMessage}</p>
          <Progress value={currentProgress} className="mt-3" />
        </div>

        <ol className="flex flex-col gap-3">
          {STAGE_ORDER.map((stage) => {
            const event = latestByStage.get(stage);
            const isComplete = event?.status === "complete";
            const isActive = event?.status === "start" && !isComplete;

            return (
              <li key={stage} className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full",
                    isComplete && "text-emerald-600 dark:text-emerald-400",
                    isActive && "text-brand-600 dark:text-brand-400",
                    !event && "text-slate-300 dark:text-slate-700",
                  )}
                >
                  {isComplete ? (
                    <CheckCircle2 className="size-5" />
                  ) : isActive ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <span className="block size-2 rounded-full bg-current" />
                  )}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    isComplete && "text-slate-500 dark:text-slate-400",
                    isActive && "font-medium text-slate-900 dark:text-slate-100",
                    !event && "text-slate-400 dark:text-slate-600",
                  )}
                >
                  {ANALYSIS_STAGE_LABELS[stage]}
                </span>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
