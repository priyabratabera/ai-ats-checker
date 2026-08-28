import type { KeywordAnalysis, SemanticInsights } from "@/types/analysis";
import type { ExperienceMatchResult } from "../semantic-similarity";

/**
 * Template-based fallback for semantic insights when no LLM key is
 * configured. Built entirely from the rule-based analysis so the app is
 * fully functional without any external API dependency.
 */
export function buildHeuristicInsights(params: {
  keywordAnalysis: KeywordAnalysis;
  experience: ExperienceMatchResult;
}): SemanticInsights {
  const { keywordAnalysis, experience } = params;

  const matchRate = keywordAnalysis.matched.length /
    Math.max(1, keywordAnalysis.matched.length + keywordAnalysis.missing.length);

  const overlapPct = Math.round(experience.semanticOverlap * 100);
  const summary = matchRate >= 0.7
    ? `Strong alignment with the role - ${Math.round(matchRate * 100)}% of key job description terms are present, with ${overlapPct}% conceptual overlap between your experience and the requirements.`
    : matchRate >= 0.4
      ? `Partial alignment with the role - ${Math.round(matchRate * 100)}% of key terms are present. There's room to tailor your resume language more closely to this job description.`
      : `Limited alignment with the role as written - only ${Math.round(matchRate * 100)}% of key job description terms appear in your resume. Consider whether your experience section speaks directly to this role's requirements.`;

  const gaps: string[] = [];
  const topMissing = [...keywordAnalysis.missing].sort((a, b) => b.weight - a.weight).slice(0, 3);
  for (const m of topMissing) {
    gaps.push(`No mention of "${m.term}", which the job description weights heavily.`);
  }
  if (experience.requiredYears && experience.estimatedYears !== null && experience.estimatedYears < experience.requiredYears) {
    gaps.push(`The role suggests ~${experience.requiredYears}+ years of experience; your resume timeline reads closer to ${experience.estimatedYears}.`);
  }

  const strengths: string[] = keywordAnalysis.matched
    .slice(0, 3)
    .map((m) => `Demonstrated experience with "${m.term}", a term the job description calls out directly.`);

  return { summary, gaps, strengths, source: "heuristic" };
}
