import { KNOWN_PHRASES, canonicalize } from "./skill-taxonomy";
import { STOP_WORDS, splitLines, tokenize } from "./text-utils";

export interface ExtractedKeyword {
  term: string;
  weight: number;
}

const REQUIREMENT_HEADING = /^(requirements?|qualifications?|must[ -]haves?|what you('| wi)ll need|skills? (required|needed)|responsibilities)/i;
const REQUIREMENT_CUE = /\b(required|must have|proficien(t|cy)|experience with|expertise in|knowledge of|familiarity with|strong (understanding|command) of)\b/i;

const GENERIC_NOISE = new Set([
  "job", "role", "position", "company", "team", "candidate", "candidates",
  "years", "year", "work", "working", "ability", "skills", "skill",
  "experience", "experienced", "knowledge", "strong", "excellent",
  "including", "such", "etc", "environment", "opportunity", "looking",
  "join", "including", "plus", "preferred", "required", "responsibilities",
  "requirements", "qualifications",
]);

function findPhraseOccurrences(lowerText: string, phrase: string): number {
  let count = 0;
  let fromIndex = 0;
  while (true) {
    const idx = lowerText.indexOf(phrase, fromIndex);
    if (idx === -1) break;
    count += 1;
    fromIndex = idx + phrase.length;
  }
  return count;
}

/**
 * Rule-based keyword/skill extraction from a job description: known multi-word
 * phrases first, then significant unigrams, weighted by frequency and by
 * whether they appear near a "required/must have" cue or under a
 * requirements-style heading.
 */
export function extractKeywords(jdText: string, limit = 30): ExtractedKeyword[] {
  const lower = jdText.toLowerCase();
  const lines = splitLines(jdText);
  const scores = new Map<string, number>();

  const bump = (term: string, amount: number) => {
    const canonical = canonicalize(term);
    scores.set(canonical, (scores.get(canonical) ?? 0) + amount);
  };

  for (const phrase of KNOWN_PHRASES) {
    const occurrences = findPhraseOccurrences(lower, phrase);
    if (occurrences > 0) bump(phrase, occurrences * 2);
  }

  let underRequirementsHeading = false;
  for (const line of lines) {
    if (REQUIREMENT_HEADING.test(line)) {
      underRequirementsHeading = true;
      continue;
    }
    if (line.length < 40 && /^[A-Z][A-Za-z /&-]*:?$/.test(line)) {
      underRequirementsHeading = false;
    }

    const hasCue = REQUIREMENT_CUE.test(line) || underRequirementsHeading;
    const tokens = tokenize(line);
    for (const token of tokens) {
      if (GENERIC_NOISE.has(token) || STOP_WORDS.has(token)) continue;
      if (/^\d+$/.test(token)) continue;
      bump(token, hasCue ? 1.5 : 1);
    }
  }

  const ranked = [...scores.entries()]
    .filter(([term]) => term.length > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  const maxScore = ranked.length > 0 ? ranked[0][1] : 1;
  return ranked.map(([term, score]) => ({
    term,
    weight: Math.max(0.15, Math.round((score / maxScore) * 100) / 100),
  }));
}
