export type ScoreBand = "good" | "warning" | "critical";

/**
 * Validated status palette (dataviz skill reference palette) - fixed, never
 * themed. Each color is always paired with a direct numeric/text label, so a
 * band is never conveyed by hue alone.
 */
export const SCORE_BAND_COLORS: Record<ScoreBand, string> = {
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
};

export const SCORE_BAND_LABELS: Record<ScoreBand, string> = {
  good: "Strong",
  warning: "Needs work",
  critical: "Weak",
};

export function scoreBand(score: number): ScoreBand {
  if (score >= 80) return "good";
  if (score >= 60) return "warning";
  return "critical";
}
