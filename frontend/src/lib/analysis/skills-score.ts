import type { KeywordAnalysis } from "@/types/analysis";
import { KNOWN_PHRASES, SYNONYMS } from "./skill-taxonomy";

const SKILL_TERMS = new Set([...KNOWN_PHRASES, ...Object.keys(SYNONYMS)]);

function isSkillTerm(term: string): boolean {
  if (SKILL_TERMS.has(term)) return true;
  // Short, non-generic single tokens (e.g. "figma", "kubernetes") read as tools/skills too.
  return !term.includes(" ") && term.length >= 3 && term.length <= 20;
}

/**
 * Narrows the keyword match down to skill-shaped terms (tools, platforms,
 * competencies) rather than every JD word, so "Skills Match" reads
 * differently from the broader "Keyword Match" score.
 */
export function scoreSkillsMatch(analysis: KeywordAnalysis): number {
  const matched = analysis.matched.filter((m) => isSkillTerm(m.term));
  const missing = analysis.missing.filter((m) => isSkillTerm(m.term));
  const partial = analysis.partial.filter((p) => isSkillTerm(p.term));

  const total = matched.length + missing.length + partial.length;
  if (total === 0) return 85;

  const earned = matched.length + partial.length * 0.5;
  return Math.round((earned / total) * 100);
}
