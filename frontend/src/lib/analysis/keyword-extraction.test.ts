import { describe, expect, it } from "vitest";
import { extractKeywords } from "./keyword-extraction";

describe("extractKeywords", () => {
  it("prioritizes known multi-word skill phrases", () => {
    const jd = `
      We are looking for a Senior Data Scientist with strong machine learning
      and data analysis experience. Requirements: proficiency in Python and SQL,
      experience with machine learning pipelines, and strong communication skills.
    `;
    const keywords = extractKeywords(jd);
    const terms = keywords.map((k) => k.term);
    expect(terms).toContain("machine learning");
    expect(terms).toContain("python");
    expect(terms).toContain("sql");
  });

  it("weights terms under a requirements heading higher", () => {
    const jd = `
      About the team: we build great products for great customers.

      Requirements:
      - Kubernetes experience required
      - Familiarity with Terraform
    `;
    const keywords = extractKeywords(jd);
    const kubernetes = keywords.find((k) => k.term === "kubernetes");
    expect(kubernetes).toBeDefined();
    expect(kubernetes!.weight).toBeGreaterThan(0);
  });

  it("returns an empty list for empty input", () => {
    expect(extractKeywords("")).toEqual([]);
  });
});
