import { nanoid } from "nanoid";
import type { Highlight, KeywordAnalysis } from "@/types/analysis";
import type { FormattingCheckResult } from "./formatting-rules";
import { findTokenOccurrences } from "./text-utils";

const MAX_MATCHED_HIGHLIGHTS = 40;

function findFirstIndex(text: string, term: string): number {
  if (term.includes(" ")) {
    return text.toLowerCase().indexOf(term.toLowerCase());
  }
  const indices = findTokenOccurrences(text, term);
  return indices.length > 0 ? indices[0] : -1;
}

export function buildHighlights(
  resumeText: string,
  keywordAnalysis: KeywordAnalysis,
  formatting: FormattingCheckResult,
): Highlight[] {
  const highlights: Highlight[] = [];

  for (const match of keywordAnalysis.matched.slice(0, MAX_MATCHED_HIGHLIGHTS)) {
    const start = findFirstIndex(resumeText, match.term);
    if (start === -1) continue;
    highlights.push({
      id: nanoid(8),
      type: "matched-keyword",
      severity: "low",
      snippet: resumeText.slice(start, start + match.term.length),
      startIndex: start,
      endIndex: start + match.term.length,
      message: `Matches job description keyword "${match.term}".`,
    });
  }

  for (const missing of keywordAnalysis.missing.slice(0, 12)) {
    highlights.push({
      id: nanoid(8),
      type: "missing-keyword",
      severity: missing.weight >= 0.6 ? "high" : "medium",
      snippet: missing.term,
      startIndex: -1,
      endIndex: -1,
      message: `"${missing.term}" appears in the job description but not in your resume.`,
    });
  }

  for (const { phrase, index } of formatting.weakPhrases) {
    highlights.push({
      id: nanoid(8),
      type: "weak-phrase",
      severity: "medium",
      snippet: phrase,
      startIndex: index,
      endIndex: index + phrase.length,
      message: `"${phrase}" reads as passive. Lead with a strong action verb instead.`,
    });
  }

  for (const bullet of formatting.lowQuantificationBullets.slice(0, 8)) {
    const start = resumeText.indexOf(bullet);
    if (start === -1) continue;
    highlights.push({
      id: nanoid(8),
      type: "quantify-suggestion",
      severity: "low",
      snippet: bullet,
      startIndex: start,
      endIndex: start + bullet.length,
      message: "Add a number or metric to quantify this achievement.",
    });
  }

  const sorted = highlights.sort((a, b) => {
    if (a.startIndex === -1 && b.startIndex === -1) return 0;
    if (a.startIndex === -1) return 1;
    if (b.startIndex === -1) return -1;
    return a.startIndex - b.startIndex;
  });

  // Resolve overlaps among positioned highlights so the resume preview can
  // slice the text into non-overlapping segments (first non-overlapping span wins).
  const positioned: Highlight[] = [];
  let lastEnd = -1;
  for (const h of sorted) {
    if (h.startIndex === -1) continue;
    if (h.startIndex < lastEnd) continue;
    positioned.push(h);
    lastEnd = h.endIndex;
  }
  const unpositioned = sorted.filter((h) => h.startIndex === -1);

  return [...positioned, ...unpositioned];
}
