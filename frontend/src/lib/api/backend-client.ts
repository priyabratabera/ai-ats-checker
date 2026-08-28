import type {
  BackendAnalysisResult,
  BackendErrorBody,
  BackendJobDescription,
  BackendResume,
} from "@/types/backend";

export class BackendUnavailableError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "BackendUnavailableError";
  }
}

/** A request that reached the backend but that it rejected (4xx/5xx) - distinct
 * from BackendUnavailableError, which means the backend couldn't be reached at all. */
export class BackendRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "BackendRequestError";
  }
}

function backendBaseUrl(): string {
  return process.env.BACKEND_API_URL ?? "http://localhost:8000";
}

async function parseErrorDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as BackendErrorBody;
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) return body.detail.map((d) => d.msg).join("; ");
  } catch {
    // response wasn't JSON - fall through to the generic message
  }
  return `Backend request failed with status ${response.status}.`;
}

async function backendFetch(path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${backendBaseUrl()}${path}`, { ...init, signal: controller.signal });
  } catch (err) {
    throw new BackendUnavailableError(
      `Could not reach the backend at ${backendBaseUrl()}${path}.`,
      err,
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fast, short-timeout reachability check used to decide - before streaming
 * anything to the client - whether to run the backend pipeline or the local
 * fallback, so the UI never has to switch engines mid-stream.
 */
export async function isBackendReachable(): Promise<boolean> {
  try {
    const response = await backendFetch("/api/v1/health", { method: "GET" }, 2_500);
    return response.ok;
  } catch {
    return false;
  }
}

export async function uploadResumeToBackend(file: File): Promise<BackendResume> {
  const formData = new FormData();
  formData.set("file", file);

  const response = await backendFetch("/api/v1/resumes", { method: "POST", body: formData }, 15_000);
  if (!response.ok) {
    throw new BackendRequestError(await parseErrorDetail(response), response.status);
  }
  return (await response.json()) as BackendResume;
}

export async function createJobDescriptionOnBackend(
  rawText: string,
): Promise<BackendJobDescription> {
  const response = await backendFetch(
    "/api/v1/job-descriptions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw_text: rawText }),
    },
    15_000,
  );
  if (!response.ok) {
    throw new BackendRequestError(await parseErrorDetail(response), response.status);
  }
  return (await response.json()) as BackendJobDescription;
}

export async function runBackendAnalysis(
  resumeId: string,
  jobDescriptionId: string,
): Promise<BackendAnalysisResult> {
  // The AI engine call (Ollama/OpenAI/Claude) can genuinely take 10-20s+ -
  // give it real room rather than racing the upload/JD timeouts above.
  const response = await backendFetch(
    "/api/v1/analyze",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_id: resumeId, job_description_id: jobDescriptionId }),
    },
    60_000,
  );
  if (!response.ok) {
    throw new BackendRequestError(await parseErrorDetail(response), response.status);
  }
  return (await response.json()) as BackendAnalysisResult;
}
