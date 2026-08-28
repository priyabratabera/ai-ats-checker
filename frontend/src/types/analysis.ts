export type FileKind = "pdf" | "docx" | "txt";

export interface ResumeMeta {
  fileName: string;
  fileKind: FileKind;
  fileSizeBytes: number;
  wordCount: number;
}

export interface JdMeta {
  wordCount: number;
}

/**
 * A stable category identifier. Kept as `string` rather than a closed union
 * because the backend engine (6 categories, snake_case-derived keys) and
 * the local fallback TS engine (5 categories) don't produce identical sets -
 * the UI renders whatever the active engine returned.
 */
export type ScoreCategoryKey = string;

export interface ScoreCategory {
  key: ScoreCategoryKey;
  label: string;
  score: number;
  weight: number;
  summary: string;
}

export interface ScoreBreakdown {
  overall: number;
  categories: ScoreCategory[];
}

export type HighlightType =
  | "matched-keyword"
  | "missing-keyword"
  | "weak-phrase"
  | "quantify-suggestion";

export type Severity = "low" | "medium" | "high";

export interface Highlight {
  id: string;
  type: HighlightType;
  severity: Severity;
  snippet: string;
  /** -1 when the highlight has no position in the resume text (e.g. a missing keyword). */
  startIndex: number;
  endIndex: number;
  message: string;
}

/**
 * The local fallback engine only ever produces "keywords" | "experience" |
 * "formatting" | "structure" | "content", but the backend's AI engine
 * derives categories from free-text JD sections (e.g. "summary", "skills"),
 * so this stays a plain string - components fall back to a default icon for
 * anything they don't recognize.
 */
export type RecommendationCategory = string;

export type RecommendationPriority = "high" | "medium" | "low";
export type RecommendationSource = "rule_engine" | "ai_engine";

export interface Recommendation {
  id: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  /** Absent for results from the local fallback engine, which has no AI/rule split. */
  source?: RecommendationSource;
  title: string;
  description: string;
  before?: string;
  after?: string;
}

export interface KeywordMatch {
  term: string;
  count: number;
  weight: number;
}

export interface KeywordMissing {
  term: string;
  weight: number;
}

export interface KeywordPartial {
  term: string;
  matchedAs: string;
}

export interface KeywordAnalysis {
  matched: KeywordMatch[];
  missing: KeywordMissing[];
  partial: KeywordPartial[];
}

export interface SemanticInsights {
  summary: string;
  gaps: string[];
  strengths: string[];
  source: "llm" | "heuristic";
}

export interface AnalysisResult {
  id: string;
  createdAt: string;
  resumeMeta: ResumeMeta;
  jdMeta: JdMeta;
  resumeText: string;
  score: ScoreBreakdown;
  highlights: Highlight[];
  recommendations: Recommendation[];
  keywordAnalysis: KeywordAnalysis;
  semanticInsights: SemanticInsights;
  /**
   * "backend" = the FastAPI + Postgres + Ollama/OpenAI/Claude backend
   * produced this result (authoritative). "local-fallback" = the backend
   * was unreachable and this app's own self-contained TS engine ran
   * instead - still a complete result, just without DB persistence or the
   * backend's PyMuPDF-based table/image/column detection.
   */
  engineSource: "backend" | "local-fallback";
  aiProvider?: string | null;
  aiModel?: string | null;
}

export type AnalysisStage =
  | "parsing"
  | "keywords"
  | "semantic"
  | "formatting"
  | "structure"
  | "scoring"
  | "recommendations"
  | "done";

export interface AnalysisProgressEvent {
  stage: AnalysisStage;
  status: "start" | "complete" | "error";
  message: string;
  progress: number;
}

export type AnalysisStreamEvent =
  | { type: "progress"; data: AnalysisProgressEvent }
  | { type: "result"; data: AnalysisResult }
  | { type: "error"; data: { message: string } };

export const ANALYSIS_STAGE_LABELS: Record<AnalysisStage, string> = {
  parsing: "Parsing resume",
  keywords: "Extracting keywords",
  semantic: "Running semantic analysis",
  formatting: "Checking formatting",
  structure: "Checking structure",
  scoring: "Calculating score",
  recommendations: "Generating recommendations",
  done: "Done",
};
