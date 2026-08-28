"use client";

import { useAnalysisStore } from "@/store/analysis-store";
import { AnalysisForm } from "./analysis-form";
import { ResultsView } from "./results-view";
import { AnalysisProgress } from "@/components/progress/analysis-progress";

export function AtsCheckerApp() {
  const status = useAnalysisStore((s) => s.status);
  const progressEvents = useAnalysisStore((s) => s.progressEvents);
  const result = useAnalysisStore((s) => s.result);

  if (status === "done" && result) {
    return <ResultsView result={result} />;
  }

  if (status === "analyzing") {
    return <AnalysisProgress events={progressEvents} />;
  }

  return <AnalysisForm />;
}
