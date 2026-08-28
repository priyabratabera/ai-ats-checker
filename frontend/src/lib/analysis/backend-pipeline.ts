import type { AnalysisStreamEvent, FileKind } from "@/types/analysis";
import { countWords } from "./text-utils";
import { progressEvent } from "./progress-event";
import { adaptBackendResult } from "./backend-adapter";
import {
  createJobDescriptionOnBackend,
  runBackendAnalysis,
  uploadResumeToBackend,
} from "@/lib/api/backend-client";

export interface BackendPipelineInput {
  resumeFile: File;
  resumeText: string;
  fileKind: FileKind;
  jdText: string;
}

/**
 * Orchestrates the backend's 3-step API (create resume -> create job
 * description -> analyze) behind the same streamed-progress shape the local
 * fallback engine produces, so the UI doesn't need to know which engine
 * ran. The backend computes everything atomically in /analyze, so the
 * later "stages" here are emitted as a fast sequence right after that call
 * resolves rather than genuinely streamed - still an honest signal, since
 * that's really where the time is spent (the AI call can take 10-20s+).
 */
export async function* runBackendAnalysisPipeline(
  input: BackendPipelineInput,
): AsyncGenerator<AnalysisStreamEvent> {
  const { resumeFile, resumeText, fileKind, jdText } = input;

  yield progressEvent(
    "parsing",
    "complete",
    `Parsed ${countWords(resumeText)} words from ${resumeFile.name}.`,
    8,
  );

  yield progressEvent("keywords", "start", "Sending resume and job description to the backend...", 12);
  const [backendResume, backendJd] = await Promise.all([
    uploadResumeToBackend(resumeFile),
    createJobDescriptionOnBackend(jdText),
  ]);
  yield progressEvent(
    "keywords",
    "complete",
    `Backend extracted ${backendJd.extracted_requirements.keywords.length} job description keywords.`,
    30,
  );

  yield progressEvent(
    "semantic",
    "start",
    "Running the deterministic rule engine and AI semantic engine on the backend...",
    35,
  );
  const backendResult = await runBackendAnalysis(backendResume.id, backendJd.id);
  yield progressEvent(
    "semantic",
    "complete",
    backendResult.ai_provider
      ? `AI semantic analysis complete (${backendResult.ai_provider}/${backendResult.ai_model}).`
      : "Rule-engine analysis complete (AI engine was unavailable on the backend).",
    70,
  );

  yield progressEvent("formatting", "complete", "Formatting checks complete.", 80);
  yield progressEvent("structure", "complete", "Structure checks complete.", 86);
  yield progressEvent("scoring", "complete", `Overall ATS score: ${backendResult.score.overall}/100.`, 93);
  yield progressEvent(
    "recommendations",
    "complete",
    `Generated ${backendResult.recommendations.length} recommendations.`,
    100,
  );

  const result = adaptBackendResult({
    backendResume,
    backendJd,
    backendResult,
    resumeText,
    fileKind,
  });

  yield { type: "result", data: result };
}
