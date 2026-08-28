import type { Severity } from "@/types/analysis";
import { SECTION_HEADERS } from "./skill-taxonomy";
import { splitLines } from "./text-utils";

export interface StructureIssue {
  id: string;
  message: string;
  severity: Severity;
  deduction: number;
}

export interface StructureCheckResult {
  score: number;
  issues: StructureIssue[];
  sectionsFound: string[];
  sectionsMissing: string[];
}

const REQUIRED_SECTIONS: (keyof typeof SECTION_HEADERS)[] = [
  "experience",
  "education",
  "skills",
];

function isLikelyHeading(line: string): boolean {
  return line.length <= 40 && !/[.!?]$/.test(line);
}

export function runStructureChecks(resumeText: string): StructureCheckResult {
  const lines = splitLines(resumeText);
  const lowerLines = lines.map((l) => l.toLowerCase());

  const sectionsFound: string[] = [];
  for (const [section, headings] of Object.entries(SECTION_HEADERS)) {
    const found = lowerLines.some(
      (line, idx) => isLikelyHeading(lines[idx]) && headings.some((h) => line === h || line.startsWith(`${h}:`)),
    );
    if (found) sectionsFound.push(section);
  }

  const sectionsMissing = REQUIRED_SECTIONS.filter((s) => !sectionsFound.includes(s));

  const issues: StructureIssue[] = sectionsMissing.map((section) => ({
    id: `missing-${section}`,
    message: `No clearly labeled "${section}" section found. Standard section headings help ATS parsers map your content correctly.`,
    severity: "high" as const,
    deduction: 18,
  }));

  if (!sectionsFound.includes("summary")) {
    issues.push({
      id: "missing-summary",
      message: "Consider adding a brief professional summary at the top - it helps both ATS keyword scanning and recruiter skim-reading.",
      severity: "low",
      deduction: 5,
    });
  }

  const dateFormats = new Set<string>();
  const datePatterns: [string, RegExp][] = [
    ["MM/YYYY", /\b\d{1,2}\/\d{4}\b/g],
    ["Month YYYY", /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\b/gi],
    ["YYYY-YYYY", /\b\d{4}\s*[-–]\s*\d{4}\b/g],
    ["YYYY", /\b(19|20)\d{2}\b/g],
  ];
  for (const [label, pattern] of datePatterns) {
    if (pattern.test(resumeText)) dateFormats.add(label);
  }
  if (dateFormats.size > 2) {
    issues.push({
      id: "inconsistent-dates",
      message: "Multiple date formats detected. Use one consistent format (e.g. \"Jan 2022 - Present\") throughout.",
      severity: "low",
      deduction: 6,
    });
  }

  const deduction = issues.reduce((sum, issue) => sum + issue.deduction, 0);
  const score = Math.max(0, Math.min(100, 100 - deduction));

  return { score, issues, sectionsFound, sectionsMissing };
}
