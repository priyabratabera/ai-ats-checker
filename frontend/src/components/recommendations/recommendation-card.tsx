import { ArrowRight, Layers, ListChecks, Sparkles, Type, Wrench } from "lucide-react";
import type { Recommendation } from "@/types/analysis";
import { Badge, priorityToBadgeVariant } from "@/components/ui/badge";

const CATEGORY_ICON: Record<string, typeof Sparkles> = {
  keywords: ListChecks,
  skills: ListChecks,
  experience: Layers,
  formatting: Wrench,
  structure: Layers,
  content: Type,
};

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const Icon = CATEGORY_ICON[recommendation.category] ?? Sparkles;

  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {recommendation.title}
          </h4>
          <Badge variant={priorityToBadgeVariant(recommendation.priority)}>
            {recommendation.priority} priority
          </Badge>
          {recommendation.source === "ai_engine" && (
            <Badge variant="brand">
              <Sparkles className="size-3" />
              AI
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">{recommendation.description}</p>
        {recommendation.before && recommendation.after && (
          <div className="mt-3 flex flex-col gap-1.5 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-900">
            <div className="flex items-start gap-2 text-slate-400 line-through decoration-slate-300 dark:decoration-slate-600">
              <span className="shrink-0 font-medium">Before</span>
              <span>{recommendation.before}</span>
            </div>
            <div className="flex items-start gap-2 text-emerald-700 dark:text-emerald-400">
              <ArrowRight className="mt-0.5 size-3 shrink-0" />
              <span>{recommendation.after}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
