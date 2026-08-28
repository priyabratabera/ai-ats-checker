import { stem, tokenize } from "./text-utils";

function termFrequency(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const token of tokens) {
    const key = stem(token);
    freq.set(key, (freq.get(key) ?? 0) + 1);
  }
  return freq;
}

/**
 * Cosine similarity between the stemmed term-frequency vectors of two texts.
 * This is a classic bag-of-words "semantic" comparison: it rewards
 * conceptual/vocabulary overlap even when exact keyword matching (see
 * matching.ts) misses it, without depending on an external embeddings API.
 */
export function cosineSimilarity(textA: string, textB: string): number {
  const freqA = termFrequency(tokenize(textA));
  const freqB = termFrequency(tokenize(textB));

  if (freqA.size === 0 || freqB.size === 0) return 0;

  let dot = 0;
  for (const [term, countA] of freqA) {
    const countB = freqB.get(term);
    if (countB) dot += countA * countB;
  }

  const magnitude = (freq: Map<string, number>) =>
    Math.sqrt([...freq.values()].reduce((sum, count) => sum + count * count, 0));

  const denom = magnitude(freqA) * magnitude(freqB);
  return denom === 0 ? 0 : dot / denom;
}

const YEARS_REQUIRED_PATTERN = /(\d{1,2})\+?\s*(?:-\s*\d{1,2}\s*)?years?/gi;
const YEAR_TOKEN_PATTERN = /\b(19|20)\d{2}\b/g;

export function extractRequiredYears(jdText: string): number | null {
  const matches = [...jdText.matchAll(YEARS_REQUIRED_PATTERN)];
  if (matches.length === 0) return null;
  const values = matches
    .map((m) => Number.parseInt(m[1], 10))
    .filter((n) => n > 0 && n <= 40);
  return values.length > 0 ? Math.max(...values) : null;
}

/** Best-effort estimate of total years of experience from year tokens found in the resume. */
export function estimateResumeYears(resumeText: string): number | null {
  const years = [...resumeText.matchAll(YEAR_TOKEN_PATTERN)]
    .map((m) => Number.parseInt(m[0], 10))
    .filter((y) => y >= 1970 && y <= new Date().getFullYear() + 1);
  if (years.length < 2) return null;
  return Math.max(...years) - Math.min(...years);
}

export interface ExperienceMatchResult {
  score: number;
  requiredYears: number | null;
  estimatedYears: number | null;
  semanticOverlap: number;
}

export function scoreExperienceMatch(
  resumeText: string,
  jdText: string,
): ExperienceMatchResult {
  const semanticOverlap = cosineSimilarity(resumeText, jdText);
  const requiredYears = extractRequiredYears(jdText);
  const estimatedYears = estimateResumeYears(resumeText);

  let yearsScore = 70;
  if (requiredYears !== null && estimatedYears !== null) {
    yearsScore = estimatedYears >= requiredYears
      ? 100
      : Math.round(Math.max(30, (estimatedYears / requiredYears) * 100));
  }

  const semanticScore = Math.round(semanticOverlap * 100);
  const score = Math.round(semanticScore * 0.6 + yearsScore * 0.4);

  return {
    score: Math.min(100, Math.max(0, score)),
    requiredYears,
    estimatedYears,
    semanticOverlap,
  };
}
