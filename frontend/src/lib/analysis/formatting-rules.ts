import type { FileKind, Severity } from "@/types/analysis";
import {
  containsNumber,
  countWords,
  findWeakPhrases,
  splitIntoBullets,
} from "./text-utils";

export interface FormattingIssue {
  id: string;
  message: string;
  severity: Severity;
  deduction: number;
}

export interface FormattingCheckResult {
  score: number;
  issues: FormattingIssue[];
  bullets: string[];
  weakPhrases: { phrase: string; index: number }[];
  lowQuantificationBullets: string[];
  wordCount: number;
}

const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i;
const PHONE_PATTERN = /(\+?\d[\d\s().-]{8,}\d)/;

export function runFormattingChecks(
  resumeText: string,
  fileKind: FileKind,
): FormattingCheckResult {
  const issues: FormattingIssue[] = [];
  const wordCount = countWords(resumeText);
  const bullets = splitIntoBullets(resumeText);
  const weakPhrases = findWeakPhrases(resumeText);

  if (wordCount < 300) {
    issues.push({
      id: "too-short",
      message: `Resume is only ${wordCount} words - it may be too thin to demonstrate impact. Aim for 400-800 words.`,
      severity: "medium",
      deduction: 12,
    });
  } else if (wordCount > 1200) {
    issues.push({
      id: "too-long",
      message: `Resume is ${wordCount} words - consider tightening it. Most ATS-friendly resumes run 400-800 words.`,
      severity: "low",
      deduction: 6,
    });
  }

  if (bullets.length < 3) {
    issues.push({
      id: "few-bullets",
      message:
        "Few or no bullet points detected. ATS parsers and recruiters both favor scannable bullet points over dense paragraphs.",
      severity: "high",
      deduction: 18,
    });
  }

  if (!EMAIL_PATTERN.test(resumeText)) {
    issues.push({
      id: "no-email",
      message: "No email address detected. Make sure your contact info is in plain text, not an image.",
      severity: "high",
      deduction: 15,
    });
  }

  if (!PHONE_PATTERN.test(resumeText)) {
    issues.push({
      id: "no-phone",
      message: "No phone number detected in plain text.",
      severity: "low",
      deduction: 5,
    });
  }

  const lowQuantificationBullets = bullets.filter((b) => !containsNumber(b));
  const quantifiedRatio = bullets.length > 0
    ? (bullets.length - lowQuantificationBullets.length) / bullets.length
    : 0;
  if (bullets.length >= 3 && quantifiedRatio < 0.3) {
    issues.push({
      id: "low-quantification",
      message:
        `Only ${Math.round(quantifiedRatio * 100)}% of bullet points include numbers or metrics. Quantified achievements ("increased X by 30%") score higher with both ATS and recruiters.`,
      severity: "medium",
      deduction: 12,
    });
  }

  if (weakPhrases.length > 0) {
    issues.push({
      id: "weak-language",
      message: `Found ${weakPhrases.length} instance(s) of passive/weak phrasing (e.g. "responsible for"). Replace with strong action verbs.`,
      severity: "medium",
      deduction: Math.min(15, weakPhrases.length * 4),
    });
  }

  if (fileKind === "txt") {
    issues.push({
      id: "plain-text-upload",
      message: "Uploaded as a .txt file - double check your real submission preserves section formatting when exported as PDF/DOCX.",
      severity: "low",
      deduction: 3,
    });
  }

  const deduction = issues.reduce((sum, issue) => sum + issue.deduction, 0);
  const score = Math.max(0, Math.min(100, 100 - deduction));

  return { score, issues, bullets, weakPhrases, lowQuantificationBullets, wordCount };
}
