import type { AnalysisStreamEvent } from "@/types/analysis";

export class AnalysisRequestError extends Error {}

/**
 * Posts the resume + job description to /api/analyze and yields each
 * newline-delimited JSON event as it streams in, so the UI can drive a
 * real progress indicator instead of a fake timer.
 */
export async function* streamAnalysis(params: {
  resumeFile: File;
  jobDescription: string;
  name: string;
  email: string;
  signal?: AbortSignal;
}): AsyncGenerator<AnalysisStreamEvent> {
  const formData = new FormData();
  formData.set("resume", params.resumeFile);
  formData.set("jobDescription", params.jobDescription);
  formData.set("name", params.name);
  formData.set("email", params.email);

  const response = await fetch("/api/analyze", {
    method: "POST",
    body: formData,
    signal: params.signal,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // response wasn't JSON - keep the generic message
    }
    throw new AnalysisRequestError(message);
  }

  if (!response.body) {
    throw new AnalysisRequestError("The server response had no body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line) yield JSON.parse(line) as AnalysisStreamEvent;
      newlineIndex = buffer.indexOf("\n");
    }
  }

  const trailing = buffer.trim();
  if (trailing) yield JSON.parse(trailing) as AnalysisStreamEvent;
}
