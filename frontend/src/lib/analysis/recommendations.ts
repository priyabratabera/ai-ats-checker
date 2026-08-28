import { nanoid } from "nanoid";
import type {
  KeywordAnalysis,
  Recommendation,
  RecommendationPriority,
  SemanticInsights,
} from "@/types/analysis";
import type { FormattingCheckResult } from "./formatting-rules";
import type { StructureCheckResult } from "./structure-rules";
import { STRONG_VERB_SUGGESTIONS } from "./skill-taxonomy";

function priorityForWeight(weight: number): RecommendationPriority {
  if (weight >= 0.65) return "high";
  if (weight >= 0.35) return "medium";
  return "low";
}

export function buildRecommendations(params: {
  keywordAnalysis: KeywordAnalysis;
  formatting: FormattingCheckResult;
  structure: StructureCheckResult;
  semanticInsights: SemanticInsights;
}): Recommendation[] {
  const { keywordAnalysis, formatting, structure, semanticInsights } = params;
  const recs: Recommendation[] = [];

  const topMissing = [...keywordAnalysis.missing]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6);
  for (const missing of topMissing) {
    recs.push({
      id: nanoid(8),
      category: "keywords",
      priority: priorityForWeight(missing.weight),
      title: `Add the keyword "${missing.term}"`,
      description: `The job description emphasizes "${missing.term}" but it doesn't appear anywhere in your resume. If it genuinely applies to your background, work it into a bullet point or your skills list in the same wording the job description uses.`,
    });
  }

  for (const issue of structure.issues) {
    recs.push({
      id: nanoid(8),
      category: "structure",
      priority: issue.severity === "high" ? "high" : issue.severity === "medium" ? "medium" : "low",
      title: issue.id.startsWith("missing-") ? `Add a clear "${issue.id.replace("missing-", "")}" section heading` : "Fix section structure",
      description: issue.message,
    });
  }

  for (const issue of formatting.issues) {
    if (issue.id === "weak-language") continue; // covered by dedicated weak-phrase recs below
    recs.push({
      id: nanoid(8),
      category: "formatting",
      priority: issue.severity === "high" ? "high" : issue.severity === "medium" ? "medium" : "low",
      title: formattingTitleFor(issue.id),
      description: issue.message,
    });
  }

  const seenPhrases = new Set<string>();
  for (const { phrase } of formatting.weakPhrases) {
    const key = phrase.toLowerCase();
    if (seenPhrases.has(key)) continue;
    seenPhrases.add(key);
    const suggestions = STRONG_VERB_SUGGESTIONS[key] ?? ["Led", "Built", "Drove"];
    recs.push({
      id: nanoid(8),
      category: "content",
      priority: "medium",
      title: `Replace "${phrase}" with a stronger action verb`,
      description: `Passive phrasing undersells your ownership. Try "${suggestions[0]}" or "${suggestions[1]}" instead.`,
      before: `${phrase} managing the migration...`,
      after: `${suggestions[0]} the migration...`,
    });
  }

  if (formatting.lowQuantificationBullets.length > 0) {
    recs.push({
      id: nanoid(8),
      category: "content",
      priority: "medium",
      title: "Quantify your achievements",
      description: `${formatting.lowQuantificationBullets.length} bullet point(s) have no numbers. Recruiters and ATS scoring both respond well to measurable impact.`,
      before: "Improved team onboarding process",
      after: "Redesigned onboarding process, cutting new-hire ramp time by 35%",
    });
  }

  if (semanticInsights.source === "llm" && semanticInsights.gaps.length > 0) {
    recs.push({
      id: nanoid(8),
      category: "experience",
      priority: "medium",
      title: "AI-identified gap",
      description: semanticInsights.gaps[0],
    });
  }

  const priorityOrder: Record<RecommendationPriority, number> = { high: 0, medium: 1, low: 2 };
  return recs
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 15);
}

function formattingTitleFor(issueId: string): string {
  const titles: Record<string, string> = {
    "too-short": "Expand your resume with more detail",
    "too-long": "Tighten your resume length",
    "few-bullets": "Convert paragraphs into bullet points",
    "no-email": "Add a plain-text email address",
    "no-phone": "Add a plain-text phone number",
    "low-quantification": "Quantify more of your bullet points",
    "plain-text-upload": "Export as PDF or DOCX for the real submission",
  };
  return titles[issueId] ?? "Fix a formatting issue";
}
