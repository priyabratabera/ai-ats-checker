import type { KeywordAnalysis } from "@/types/analysis";
import type { ExtractedKeyword } from "./keyword-extraction";
import { SYNONYMS, canonicalize } from "./skill-taxonomy";
import { escapeRegExp, findTokenOccurrences, stem, tokenize } from "./text-utils";

function countOccurrences(lowerText: string, term: string): number {
  if (term.includes(" ") || term.includes(".") || term.includes("-")) {
    const pattern = new RegExp(escapeRegExp(term), "g");
    return (lowerText.match(pattern) ?? []).length;
  }
  return findTokenOccurrences(lowerText, term).length;
}

function termVariants(term: string): string[] {
  const canonical = canonicalize(term);
  const variants = new Set([canonical, term]);
  const alts = SYNONYMS[canonical];
  if (alts) alts.forEach((alt) => variants.add(alt));
  return [...variants];
}

/**
 * Compares JD keywords against the resume text: exact/synonym matches count
 * as "matched", stemmed overlap counts as "partial", everything else is
 * reported as "missing" so recommendations can point at real gaps.
 */
export function matchKeywords(
  resumeText: string,
  keywords: ExtractedKeyword[],
): KeywordAnalysis {
  const lowerResume = resumeText.toLowerCase();
  const resumeStems = new Set(tokenize(resumeText).map(stem));

  const matched: KeywordAnalysis["matched"] = [];
  const missing: KeywordAnalysis["missing"] = [];
  const partial: KeywordAnalysis["partial"] = [];

  for (const { term, weight } of keywords) {
    const variants = termVariants(term);
    let totalCount = 0;
    let matchedAs = "";
    for (const variant of variants) {
      const count = countOccurrences(lowerResume, variant);
      if (count > totalCount) {
        totalCount = count;
        matchedAs = variant;
      }
    }

    if (totalCount > 0) {
      matched.push({ term: matchedAs, count: totalCount, weight });
      continue;
    }

    const termStem = stem(term.includes(" ") ? term.split(" ").pop()! : term);
    if (resumeStems.has(termStem)) {
      partial.push({ term, matchedAs: termStem });
      continue;
    }

    missing.push({ term, weight });
  }

  return { matched, missing, partial };
}

export function keywordScore(analysis: KeywordAnalysis): number {
  const all = [
    ...analysis.matched.map((m) => ({ weight: m.weight, credit: 1 })),
    ...analysis.partial.map(() => ({ weight: 0.3, credit: 0.6 })),
    ...analysis.missing.map((m) => ({ weight: m.weight, credit: 0 })),
  ];
  if (all.length === 0) return 100;

  const totalWeight = all.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return 100;

  const earned = all.reduce((sum, item) => sum + item.weight * item.credit, 0);
  return Math.round((earned / totalWeight) * 100);
}
