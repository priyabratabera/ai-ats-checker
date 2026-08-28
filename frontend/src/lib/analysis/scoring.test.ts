import { describe, expect, it } from "vitest";
import { computeScoreBreakdown } from "./scoring";

describe("computeScoreBreakdown", () => {
  it("computes a weighted overall score across the 5 categories", () => {
    const breakdown = computeScoreBreakdown({
      keywordMatch: 88,
      skillsMatch: 91,
      experienceMatch: 84,
      formatting: 72,
      structure: 90,
    });

    expect(breakdown.categories).toHaveLength(5);
    // 88*.25 + 91*.25 + 84*.2 + 72*.15 + 90*.15 = 85.5
    expect(breakdown.overall).toBe(86);
  });

  it("returns 100 when every category is perfect", () => {
    const breakdown = computeScoreBreakdown({
      keywordMatch: 100,
      skillsMatch: 100,
      experienceMatch: 100,
      formatting: 100,
      structure: 100,
    });
    expect(breakdown.overall).toBe(100);
  });

  it("returns 0 when every category is zero", () => {
    const breakdown = computeScoreBreakdown({
      keywordMatch: 0,
      skillsMatch: 0,
      experienceMatch: 0,
      formatting: 0,
      structure: 0,
    });
    expect(breakdown.overall).toBe(0);
  });
});
