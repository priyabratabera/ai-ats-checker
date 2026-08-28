import type { Recommendation } from "@/types/analysis";
import { RecommendationCard } from "./recommendation-card";

export function RecommendationsList({ recommendations }: { recommendations: Recommendation[] }) {
  if (recommendations.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No major issues found - this resume is in great shape for this role.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {recommendations.map((rec) => (
        <RecommendationCard key={rec.id} recommendation={rec} />
      ))}
    </div>
  );
}
