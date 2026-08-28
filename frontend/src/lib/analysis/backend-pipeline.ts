import type { AnalysisStreamEvent, FileKind } from "@/types/analysis";
import { countWords } from "./text-utils";
import { progressEvent } from "./progress-event";
import { adaptBackendResult } from "./backend-adapter";
import {
  createJobDescriptionOnBackend,
  identifyUserOnBackend,
  runBackendAnalysis,
  uploadResumeToBackend,
} from "@/lib/api/backend-client";

export interface BackendPipelineInput {
  resumeFile: File;
  resumeText: string;
  fileKind: FileKind;
  jdText: string;
  name: string;
  email: string;
}

/**
 * Orchestrates the backend's API (identify user -> create resume -> create
 * job description -> analyze) behind the same streamed-progress shape the
 * local fallback engine produces, so the UI doesn't need to know which
 * engine ran. The backend computes everything atomically in /analyze, so
 * the later "stages" here are emitted as a fast sequence right after that
 * call resolves rather than genuinely streamed - still an honest signal,
 * since that's really where the time is spent (the AI call can take
 * 10-20s+).
 */
export async function* runBackendAnalysisPipeline(
  input: BackendPipelineInput,
): AsyncGenerator<AnalysisStreamEvent> {
  const { resumeFile, resumeText, fileKind, jdText, name, email } = input;

  yield progressEvent(
    "parsing",
    "complete",
    `Parsed ${countWords(resumeText)} words from ${resumeFile.name}.`,
    8,
  );

  // Best-effort: identifying the visitor (name/email -> a users row) is not
  // essential to producing an analysis, so a failure here degrades to an
  // anonymous save rather than failing the whole request.
  let userId: string | undefined;
  try {
    const user = await identifyUserOnBackend(name, email);
    userId = user.id;
  } catch (err) {
    console.error("Backend user identification failed - continuing anonymously:", err);
  }

  yield progressEvent("keywords", "start", "Sending resume and job description to the backend...", 12);
  const [backendResume, backendJd] = await Promise.all([
    uploadResumeToBackend(resumeFile, userId),
    createJobDescriptionOnBackend(jdText, userId),
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
