import type {
  AnalysisResult,
  FileKind,
  KeywordAnalysis,
  Recommendation,
  SemanticInsights,
} from "@/types/analysis";
import type {
  BackendAnalysisResult,
  BackendJobDescription,
  BackendKeywordAnalysis,
  BackendLLMAnalysisResult,
  BackendResume,
} from "@/types/backend";
import { runFormattingChecks } from "@/lib/analysis/formatting-rules";
import { buildHighlights } from "@/lib/analysis/highlights";

function adaptKeywordAnalysis(ka: BackendKeywordAnalysis): KeywordAnalysis {
  return {
    matched: ka.matched.map((m) => ({ term: m.term, count: m.count, weight: m.weight })),
    missing: ka.missing.map((m) => ({ term: m.term, weight: m.weight })),
    partial: ka.partial.map((p) => ({ term: p.term, matchedAs: p.matched_as })),
  };
}

function adaptSemanticInsights(
  ai: BackendLLMAnalysisResult | null,
  keywordAnalysis: KeywordAnalysis,
): SemanticInsights {
  if (ai) {
    const gaps = [
      ...ai.missing_skills,
      ...ai.partial_matches.map((p) => `${p.requirement}: ${p.evidence}`),
    ].slice(0, 6);
    return {
      summary: ai.summary || `AI-assessed job match: ${ai.job_match_score}/100.`,
      strengths: ai.matched_skills.slice(0, 6),
      gaps,
      source: "llm",
    };
  }

  // The backend's AI engine was unavailable too - fall back to a keyword-only heuristic.
  const total = keywordAnalysis.matched.length + keywordAnalysis.missing.length;
  const matchRate = total > 0 ? keywordAnalysis.matched.length / total : 1;
  const summary =
    matchRate >= 0.7
      ? `Strong keyword alignment - ${Math.round(matchRate * 100)}% of key job description terms are present.`
      : matchRate >= 0.4
        ? `Partial keyword alignment - ${Math.round(matchRate * 100)}% of key job description terms are present.`
        : `Limited keyword alignment - only ${Math.round(matchRate * 100)}% of key job description terms appear in your resume.`;

  return {
    summary,
    strengths: keywordAnalysis.matched
      .slice(0, 3)
      .map((m) => `Demonstrated experience with "${m.term}", a term the job description calls out directly.`),
    gaps: keywordAnalysis.missing
      .slice(0, 3)
      .map((m) => `No mention of "${m.term}", which the job description weights heavily.`),
    source: "heuristic",
  };
}

function adaptRecommendations(result: BackendAnalysisResult): Recommendation[] {
  return result.recommendations.map((r) => ({
    id: r.id,
    category: r.category,
    priority: r.priority,
    source: r.source,
    title: r.title,
    description: r.description,
    before: r.before_text ?? undefined,
    after: r.after_text ?? undefined,
  }));
}

/**
 * Maps the backend's authoritative analysis result into this app's
 * engine-agnostic AnalysisResult shape. Highlighting has no backend
 * equivalent (the backend doesn't return resume-text positions), so it's
 * rebuilt locally from the already-extracted resume text plus the
 * backend's real keyword analysis, reusing the same tested
 * formatting-rules/highlights logic the local fallback engine uses.
 */
export function adaptBackendResult(params: {
  backendResume: BackendResume;
  backendJd: BackendJobDescription;
  backendResult: BackendAnalysisResult;
  resumeText: string;
  fileKind: FileKind;
}): AnalysisResult {
  const { backendResume, backendJd, backendResult, resumeText, fileKind } = params;

  const keywordAnalysis = adaptKeywordAnalysis(backendResult.keyword_analysis);
  const formatting = runFormattingChecks(resumeText, fileKind);
  const highlights = buildHighlights(resumeText, keywordAnalysis, formatting);

  return {
    id: backendResult.id,
    createdAt: backendResult.created_at,
    resumeMeta: {
      fileName: backendResume.file_name,
      fileKind,
      fileSizeBytes: backendResume.file_size_bytes,
      wordCount: backendResume.word_count,
    },
    jdMeta: { wordCount: backendJd.word_count },
    resumeText,
    score: backendResult.score,
    highlights,
    recommendations: adaptRecommendations(backendResult),
    keywordAnalysis,
    semanticInsights: adaptSemanticInsights(backendResult.ai_engine_output, keywordAnalysis),
    engineSource: "backend",
    aiProvider: backendResult.ai_provider,
    aiModel: backendResult.ai_model,
  };
}
