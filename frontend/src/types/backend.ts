/**
 * Mirrors the FastAPI backend's Pydantic response schemas verbatim
 * (snake_case, as returned on the wire) - see backend/app/schemas/*.py.
 * Only backend-adapter.ts should import these; everything else in the app
 * works against the engine-agnostic types in types/analysis.ts.
 */

export interface BackendUser {
  id: string;
  name: string | null;
  email: string | null;
  created_at: string;
}

/** One row per completed ATS check (not one row per unique user) - see
 * GET /api/v1/analyses. */
export interface BackendAnalysisListItem {
  id: string;
  name: string | null;
  email: string | null;
  resume_file_name: string;
  status: string;
  overall_score: number | null;
  created_at: string;
}

export interface BackendContactInfo {
  has_email: boolean;
  has_phone: boolean;
  has_url: boolean;
  emails: string[];
  urls: string[];
}

export interface BackendLayoutFindings {
  page_count: number | null;
  has_tables: boolean;
  table_count: number;
  has_images: boolean;
  image_count: number;
  likely_multi_column: boolean;
}

export interface BackendResume {
  id: string;
  file_name: string;
  file_kind: "pdf" | "docx" | "txt";
  file_size_bytes: number;
  word_count: number;
  page_count: number | null;
  extracted_data: {
    contact: BackendContactInfo;
    layout: BackendLayoutFindings;
  };
  created_at: string;
}

export interface BackendJobDescription {
  id: string;
  title: string | null;
  raw_text: string;
  word_count: number;
  extracted_requirements: {
    keywords: { term: string; weight: number }[];
    required_years: number | null;
  };
  created_at: string;
}

export interface BackendScoreCategory {
  key: string;
  label: string;
  score: number;
  weight: number;
  summary: string;
}

export interface BackendScoreBreakdown {
  overall: number;
  categories: BackendScoreCategory[];
}

export interface BackendKeywordAnalysis {
  matched: { term: string; count: number; weight: number }[];
  missing: { term: string; weight: number }[];
  partial: { term: string; matched_as: string }[];
}

export interface BackendPartialMatch {
  requirement: string;
  evidence: string;
}

export interface BackendAiRecommendation {
  priority: string;
  section: string;
  recommendation: string;
}

export interface BackendLLMAnalysisResult {
  job_match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  partial_matches: BackendPartialMatch[];
  recommendations: BackendAiRecommendation[];
  summary: string;
}

export interface BackendRecommendation {
  id: string;
  category: string;
  priority: "high" | "medium" | "low";
  source: "rule_engine" | "ai_engine";
  title: string;
  description: string;
  before_text: string | null;
  after_text: string | null;
}

/** Backend now processes checks asynchronously (see worker/) - POST
 * /api/v1/analyze returns this immediately with status "pending"; poll GET
 * /api/v1/analyses/{id} until status is "complete" (score/keyword_analysis
 * populated) or "failed" (error_message populated). See
 * lib/api/backend-client.ts::runBackendAnalysis, which does that polling
 * and only ever resolves once status is "complete". */
export type BackendAnalysisStatus = "pending" | "processing" | "complete" | "failed";

export interface BackendAnalysisResult {
  id: string;
  resume_id: string;
  job_description_id: string;
  status: BackendAnalysisStatus;
  error_message: string | null;
  score: BackendScoreBreakdown | null;
  keyword_analysis: BackendKeywordAnalysis | null;
  ai_engine_output: BackendLLMAnalysisResult | null;
  ai_provider: string | null;
  ai_model: string | null;
  recommendations: BackendRecommendation[];
  created_at: string;
}

/** The narrowed shape returned by a successful runBackendAnalysis() poll -
 * status is always "complete" and the score/keyword fields are guaranteed
 * non-null, so callers don't need to re-check them. */
export interface CompletedBackendAnalysisResult extends BackendAnalysisResult {
  status: "complete";
  score: BackendScoreBreakdown;
  keyword_analysis: BackendKeywordAnalysis;
}

export interface BackendErrorBody {
  detail: string | { msg: string }[];
}
