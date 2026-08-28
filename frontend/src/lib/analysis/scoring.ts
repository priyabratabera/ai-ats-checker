import type { ScoreBreakdown, ScoreCategory } from "@/types/analysis";

export interface CategoryScores {
  keywordMatch: number;
  skillsMatch: number;
  experienceMatch: number;
  formatting: number;
  structure: number;
}

const WEIGHTS: Record<keyof CategoryScores, number> = {
  keywordMatch: 0.25,
  skillsMatch: 0.25,
  experienceMatch: 0.2,
  formatting: 0.15,
  structure: 0.15,
};

const LABELS: Record<keyof CategoryScores, string> = {
  keywordMatch: "Keyword Match",
  skillsMatch: "Skills Match",
  experienceMatch: "Experience Match",
  formatting: "Formatting",
  structure: "Structure",
};

function summarize(key: keyof CategoryScores, score: number): string {
  const tier = score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Needs work" : "Weak";
  const detail: Record<keyof CategoryScores, string> = {
    keywordMatch: "how many job-description terms appear in your resume",
    skillsMatch: "overlap between listed skills/tools and what the role asks for",
    experienceMatch: "how closely your experience matches the role's requirements",
    formatting: "ATS-readability: bullet usage, contact info, quantified impact",
    structure: "presence and ordering of standard resume sections",
  };
  return `${tier} - ${detail[key]}.`;
}

export function computeScoreBreakdown(categoryScores: CategoryScores): ScoreBreakdown {
  const categories: ScoreCategory[] = (Object.keys(WEIGHTS) as (keyof CategoryScores)[]).map(
    (key) => ({
      key,
      label: LABELS[key],
      score: Math.round(categoryScores[key]),
      weight: WEIGHTS[key],
      summary: summarize(key, categoryScores[key]),
    }),
  );

  const overall = Math.round(
    categories.reduce((sum, c) => sum + c.score * c.weight, 0),
  );

  return { overall, categories };
}
