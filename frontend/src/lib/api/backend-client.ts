import type {
  BackendAnalysisListItem,
  BackendAnalysisResult,
  BackendErrorBody,
  BackendJobDescription,
  BackendResume,
  BackendUser,
  CompletedBackendAnalysisResult,
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

/**
 * Get-or-create by email - not authentication, just enough to attribute a
 * resume/analysis to a name + email in the `users` table (see the backend's
 * POST /api/v1/users).
 */
export async function identifyUserOnBackend(name: string, email: string): Promise<BackendUser> {
  const response = await backendFetch(
    "/api/v1/users",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    },
    10_000,
  );
  if (!response.ok) {
    throw new BackendRequestError(await parseErrorDetail(response), response.status);
  }
  return (await response.json()) as BackendUser;
}

/** Read-only listing of distinct identified users (one row per email), most recent first. */
export async function listUsersFromBackend(): Promise<BackendUser[]> {
  const response = await backendFetch("/api/v1/users", { method: "GET", cache: "no-store" }, 10_000);
  if (!response.ok) {
    throw new BackendRequestError(await parseErrorDetail(response), response.status);
  }
  return (await response.json()) as BackendUser[];
}

/**
 * Read-only listing for the /users page - one row per completed ATS check
 * (not one row per unique user), most recent first. No filtering/editing.
 */
export async function listAnalysesFromBackend(): Promise<BackendAnalysisListItem[]> {
  const response = await backendFetch("/api/v1/analyses", { method: "GET", cache: "no-store" }, 10_000);
  if (!response.ok) {
    throw new BackendRequestError(await parseErrorDetail(response), response.status);
  }
  return (await response.json()) as BackendAnalysisListItem[];
}

export async function uploadResumeToBackend(file: File, userId?: string): Promise<BackendResume> {
  const formData = new FormData();
  formData.set("file", file);
  if (userId) formData.set("user_id", userId);

  const response = await backendFetch("/api/v1/resumes", { method: "POST", body: formData }, 15_000);
  if (!response.ok) {
    throw new BackendRequestError(await parseErrorDetail(response), response.status);
  }
  return (await response.json()) as BackendResume;
}

export async function createJobDescriptionOnBackend(
  rawText: string,
  userId?: string,
): Promise<BackendJobDescription> {
  const response = await backendFetch(
    "/api/v1/job-descriptions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw_text: rawText, user_id: userId }),
    },
    15_000,
  );
  if (!response.ok) {
    throw new BackendRequestError(await parseErrorDetail(response), response.status);
  }
  return (await response.json()) as BackendJobDescription;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAnalysisFromBackend(analysisId: string): Promise<BackendAnalysisResult> {
  const response = await backendFetch(`/api/v1/analyses/${analysisId}`, { method: "GET" }, 10_000);
  if (!response.ok) {
    throw new BackendRequestError(await parseErrorDetail(response), response.status);
  }
  return (await response.json()) as BackendAnalysisResult;
}

const POLL_INTERVAL_MS = 1_500;
const POLL_TIMEOUT_MS = 120_000;

/**
 * The backend processes checks asynchronously (see worker/): POST
 * /api/v1/analyze just creates a "pending" row and returns immediately, so
 * this polls GET /api/v1/analyses/{id} until the worker settles it. The AI
 * engine call it's waiting on can genuinely take 10-20s+, hence the
 * generous overall timeout - a real job taking that long is expected, not
 * an error.
 */
export async function runBackendAnalysis(
  resumeId: string,
  jobDescriptionId: string,
): Promise<CompletedBackendAnalysisResult> {
  const created = await backendFetch(
    "/api/v1/analyze",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_id: resumeId, job_description_id: jobDescriptionId }),
    },
    10_000,
  );
  if (!created.ok) {
    throw new BackendRequestError(await parseErrorDetail(created), created.status);
  }
  const { id: analysisId } = (await created.json()) as BackendAnalysisResult;

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const current = await getAnalysisFromBackend(analysisId);

    if (current.status === "complete" && current.score && current.keyword_analysis) {
      return current as CompletedBackendAnalysisResult;
    }
    if (current.status === "failed") {
      throw new BackendRequestError(
        current.error_message ?? "Analysis failed on the backend.",
        500,
      );
    }
    // "pending" / "processing" - keep polling.
  }

  throw new BackendRequestError(
    "Timed out waiting for the backend worker to finish this analysis.",
    504,
  );
}
