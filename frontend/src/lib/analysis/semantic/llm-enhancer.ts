import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { SemanticInsights } from "@/types/analysis";

const MODEL = "claude-opus-5";
const MAX_INPUT_CHARS = 6000;

const llmInsightsSchema = z.object({
  summary: z.string(),
  gaps: z.array(z.string()).max(5),
  strengths: z.array(z.string()).max(5),
});

function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return text;
}

/**
 * Optional enhancement layer: if ANTHROPIC_API_KEY is configured, ask Claude
 * for a short narrative gap analysis on top of the rule-based scoring.
 * Returns null on any failure (missing key, network, bad JSON) so the caller
 * can fall back to the heuristic summary without breaking the pipeline.
 */
export async function generateLlmSemanticInsights(
  resumeText: string,
  jdText: string,
): Promise<SemanticInsights | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system:
        "You are an expert technical recruiter and resume coach. Compare a resume against a job description and respond with ONLY a JSON object matching this shape: " +
        '{"summary": string, "gaps": string[], "strengths": string[]}. ' +
        "\"summary\" is 1-2 sentences on overall fit. \"gaps\" lists up to 5 concrete, specific things missing or weak relative to the job description (skills, experience depth, domain knowledge) - each a single actionable sentence. \"strengths\" lists up to 5 genuine strengths relative to the role. No markdown, no prose outside the JSON object.",
      messages: [
        {
          role: "user",
          content: `JOB DESCRIPTION:\n${jdText.slice(0, MAX_INPUT_CHARS)}\n\nRESUME:\n${resumeText.slice(0, MAX_INPUT_CHARS)}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") return null;

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    const parsed = llmInsightsSchema.parse(JSON.parse(extractJson(textBlock.text)));
    return { ...parsed, source: "llm" };
  } catch {
    return null;
  }
}
