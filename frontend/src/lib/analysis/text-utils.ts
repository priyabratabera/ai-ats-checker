export const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "so", "as", "of", "at",
  "by", "for", "with", "about", "against", "between", "into", "through",
  "during", "before", "after", "above", "below", "to", "from", "up", "down",
  "in", "out", "on", "off", "over", "under", "again", "further", "once",
  "here", "there", "when", "where", "why", "how", "all", "any", "both",
  "each", "few", "more", "most", "other", "some", "such", "no", "nor",
  "not", "only", "own", "same", "than", "too", "very", "s", "t", "can",
  "will", "just", "don", "should", "now", "is", "are", "was", "were", "be",
  "been", "being", "have", "has", "had", "having", "do", "does", "did",
  "doing", "we", "you", "your", "our", "their", "they", "it", "its",
  "this", "that", "these", "those", "i", "he", "she", "him", "her", "his",
  "who", "whom", "which", "what", "will", "would", "could", "shall",
  "must", "may", "might", "etc", "e.g", "i.e",
]);

const WEAK_PHRASES = [
  "responsible for",
  "duties included",
  "worked on",
  "helped with",
  "in charge of",
  "tasked with",
  "assisted with",
  "involved in",
  "participated in",
];

export function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
}

export function countWords(text: string): number {
  const matches = text.trim().match(/[\p{L}\p{N}'-]+/gu);
  return matches ? matches.length : 0;
}

export function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}+.#-]*/gu);
  return matches ? matches.filter((t) => !STOP_WORDS.has(t) && t.length > 1) : [];
}

/** A light suffix stripper - not a real stemmer, just enough to fuzzy-match resume/JD wording. */
export function stem(word: string): string {
  const w = word.toLowerCase();
  if (w.endsWith("ies") && w.length > 4) return `${w.slice(0, -3)}y`;
  if (w.endsWith("ing") && w.length > 5) return w.slice(0, -3);
  if (w.endsWith("ed") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("es") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) return w.slice(0, -1);
  return w;
}

export function splitLines(text: string): string[] {
  return normalizeWhitespace(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function splitIntoBullets(text: string): string[] {
  const lines = normalizeWhitespace(text).split("\n");
  const bulletPattern = /^([•▪◦●○*\-–]|\d+[.)])\s+/;
  return lines
    .filter((line) => bulletPattern.test(line.trim()))
    .map((line) => line.trim().replace(bulletPattern, ""));
}

export function findWeakPhrases(text: string): { phrase: string; index: number }[] {
  const lower = text.toLowerCase();
  const found: { phrase: string; index: number }[] = [];
  for (const phrase of WEAK_PHRASES) {
    let fromIndex = 0;
    while (true) {
      const idx = lower.indexOf(phrase, fromIndex);
      if (idx === -1) break;
      found.push({ phrase: text.slice(idx, idx + phrase.length), index: idx });
      fromIndex = idx + phrase.length;
    }
  }
  return found;
}

export function containsNumber(text: string): boolean {
  return /\d/.test(text);
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Finds every standalone occurrence of a short, punctuation-free term (e.g.
 * "js") in text. A plain \b...\b would also match it inside a compound token
 * like "Node.js", because "." reads as a boundary to the regex engine even
 * though it isn't one semantically - so matches immediately preceded by a
 * "mid-word dot" (a "." itself preceded by a letter/digit) are discarded.
 */
export function findTokenOccurrences(text: string, term: string): number[] {
  const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, "gi");
  const indices: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const start = match.index;
    const precededByMidWordDot =
      start >= 2 && text[start - 1] === "." && /[\p{L}\p{N}]/u.test(text[start - 2]);
    if (!precededByMidWordDot) indices.push(start);
  }
  return indices;
}
