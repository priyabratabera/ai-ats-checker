import type { ScoreBreakdown } from "@/types/analysis";
import { Card, CardContent } from "@/components/ui/card";
import { ScoreGauge } from "./score-gauge";
import { CategoryMeter } from "./category-meter";

export function ScoreDashboard({ score }: { score: ScoreBreakdown }) {
  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-8 p-6 sm:grid-cols-[176px_1fr] sm:items-center sm:p-8">
        <div className="flex justify-center sm:justify-start">
          <ScoreGauge score={score.overall} />
        </div>
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {score.categories.map((category) => (
            <CategoryMeter key={category.key} category={category} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
