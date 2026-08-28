import type { AnalysisStage, AnalysisStreamEvent } from "@/types/analysis";

export function progressEvent(
  stage: AnalysisStage,
  status: "start" | "complete",
  message: string,
  pct: number,
): AnalysisStreamEvent {
  return { type: "progress", data: { stage, status, message, progress: pct } };
}
