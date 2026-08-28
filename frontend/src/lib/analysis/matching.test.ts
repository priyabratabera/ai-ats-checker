import { describe, expect, it } from "vitest";
import { keywordScore, matchKeywords } from "./matching";

describe("matchKeywords", () => {
  it("matches exact terms and synonyms", () => {
    const resume = "Built scalable services in JavaScript and worked with AWS and PostgreSQL.";
    const result = matchKeywords(resume, [
      { term: "javascript", weight: 1 },
      { term: "amazon web services", weight: 0.8 },
      { term: "postgresql", weight: 0.5 },
    ]);
    expect(result.matched.map((m) => m.term)).toEqual(
      expect.arrayContaining(["javascript", "aws", "postgresql"]),
    );
    expect(result.missing).toHaveLength(0);
  });

  it("reports missing terms that never appear", () => {
    const resume = "Built scalable services in Python.";
    const result = matchKeywords(resume, [{ term: "kubernetes", weight: 0.9 }]);
    expect(result.missing).toEqual([{ term: "kubernetes", weight: 0.9 }]);
  });

  it("scores 100 when everything matches", () => {
    const resume = "Python Python Python";
    const result = matchKeywords(resume, [{ term: "python", weight: 1 }]);
    expect(keywordScore(result)).toBe(100);
  });

  it("scores 0 when nothing matches", () => {
    const result = matchKeywords("irrelevant text", [{ term: "kubernetes", weight: 1 }]);
    expect(keywordScore(result)).toBe(0);
  });

  it("does not false-match a short abbreviation inside an unrelated compound token", () => {
    // "js" must not match inside "Node.js" when the resume separately and
    // genuinely contains the word "JavaScript".
    const resume = "Skills: JavaScript, TypeScript, Node.js";
    const result = matchKeywords(resume, [{ term: "javascript", weight: 1 }]);
    expect(result.matched).toEqual([{ term: "javascript", count: 1, weight: 1 }]);
  });

  it("still matches a term immediately followed by sentence punctuation", () => {
    const resume = "Experience with PostgreSQL.";
    const result = matchKeywords(resume, [{ term: "postgresql", weight: 1 }]);
    expect(result.matched).toEqual([{ term: "postgresql", count: 1, weight: 1 }]);
  });
});
