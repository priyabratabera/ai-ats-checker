import { nanoid } from "nanoid";
import type {
  AnalysisResult,
  AnalysisStreamEvent,
  FileKind,
} from "@/types/analysis";
import { countWords } from "./text-utils";
import { extractKeywords } from "./keyword-extraction";
import { matchKeywords, keywordScore } from "./matching";
import { scoreSkillsMatch } from "./skills-score";
import { scoreExperienceMatch } from "./semantic-similarity";
import { runFormattingChecks } from "./formatting-rules";
import { runStructureChecks } from "./structure-rules";
import { computeScoreBreakdown } from "./scoring";
import { buildHighlights } from "./highlights";
import { buildRecommendations } from "./recommendations";
import { generateLlmSemanticInsights } from "./semantic/llm-enhancer";
import { buildHeuristicInsights } from "./semantic/heuristic-insights";
import { progressEvent } from "./progress-event";

export interface PipelineInput {
  resumeText: string;
  fileName: string;
  fileKind: FileKind;
  fileSizeBytes: number;
  jdText: string;
}

const STAGE_TARGETS: Record<string, number> = {
  parsing: 10,
  keywords: 25,
  semantic: 45,
  formatting: 60,
  structure: 75,
  scoring: 88,
  recommendations: 100,
};

export async function* runAnalysisPipeline(
  input: PipelineInput,
): AsyncGenerator<AnalysisStreamEvent> {
  const { resumeText, fileName, fileKind, fileSizeBytes, jdText } = input;

  yield progressEvent("parsing", "start", "Reading resume content...", 2);
  const wordCount = countWords(resumeText);
  yield progressEvent("parsing", "complete", `Parsed ${wordCount} words from ${fileName}.`, STAGE_TARGETS.parsing);

  yield progressEvent("keywords", "start", "Extracting job description keywords...", STAGE_TARGETS.parsing + 2);
  const keywords = extractKeywords(jdText);
  const keywordAnalysis = matchKeywords(resumeText, keywords);
  yield progressEvent(
    "keywords",
    "complete",
    `Matched ${keywordAnalysis.matched.length} of ${keywords.length} job description keywords.`,
    STAGE_TARGETS.keywords,
  );

  yield progressEvent("semantic", "start", "Running semantic experience analysis...", STAGE_TARGETS.keywords + 2);
  const experience = scoreExperienceMatch(resumeText, jdText);
  const llmInsights = await generateLlmSemanticInsights(resumeText, jdText);
  const semanticInsights = llmInsights ?? buildHeuristicInsights({ keywordAnalysis, experience });
  yield progressEvent(
    "semantic",
    "complete",
    semanticInsights.source === "llm" ? "AI semantic analysis complete." : "Heuristic semantic analysis complete.",
    STAGE_TARGETS.semantic,
  );

  yield progressEvent("formatting", "start", "Checking ATS formatting rules...", STAGE_TARGETS.semantic + 2);
  const formatting = runFormattingChecks(resumeText, fileKind);
  yield progressEvent("formatting", "complete", `Formatting score: ${formatting.score}/100.`, STAGE_TARGETS.formatting);

  yield progressEvent("structure", "start", "Checking resume structure...", STAGE_TARGETS.formatting + 2);
  const structure = runStructureChecks(resumeText);
  yield progressEvent("structure", "complete", `Structure score: ${structure.score}/100.`, STAGE_TARGETS.structure);

  yield progressEvent("scoring", "start", "Calculating overall ATS score...", STAGE_TARGETS.structure + 2);
  const score = computeScoreBreakdown({
    keywordMatch: keywordScore(keywordAnalysis),
    skillsMatch: scoreSkillsMatch(keywordAnalysis),
    experienceMatch: experience.score,
    formatting: formatting.score,
    structure: structure.score,
  });
  yield progressEvent("scoring", "complete", `Overall ATS score: ${score.overall}/100.`, STAGE_TARGETS.scoring);

  yield progressEvent("recommendations", "start", "Generating recommendations...", STAGE_TARGETS.scoring + 2);
  const highlights = buildHighlights(resumeText, keywordAnalysis, formatting);
  const recommendations = buildRecommendations({
    keywordAnalysis,
    formatting,
    structure,
    semanticInsights,
  });
  yield progressEvent(
    "recommendations",
    "complete",
    `Generated ${recommendations.length} recommendations.`,
    STAGE_TARGETS.recommendations,
  );

  const result: AnalysisResult = {
    id: nanoid(12),
    createdAt: new Date().toISOString(),
    resumeMeta: { fileName, fileKind, fileSizeBytes, wordCount },
    jdMeta: { wordCount: countWords(jdText) },
    resumeText,
    score,
    highlights,
    recommendations,
    keywordAnalysis,
    semanticInsights,
    engineSource: "local-fallback",
    aiProvider: semanticInsights.source === "llm" ? "anthropic" : null,
    aiModel: semanticInsights.source === "llm" ? "claude-opus-5" : null,
  };

  yield { type: "result", data: result };
}
