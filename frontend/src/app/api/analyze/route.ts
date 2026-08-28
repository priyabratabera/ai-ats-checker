import type { AnalysisStreamEvent } from "@/types/analysis";
import { runAnalysisPipeline } from "@/lib/analysis/pipeline";
import { runBackendAnalysisPipeline } from "@/lib/analysis/backend-pipeline";
import { isBackendReachable } from "@/lib/api/backend-client";
import {
  EmptyResumeError,
  UnsupportedFileTypeError,
  extractResumeText,
} from "@/lib/parsing/extract-text";
import {
  MAX_RESUME_SIZE_BYTES,
  jobDescriptionSchema,
} from "@/lib/validation/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Expected multipart/form-data with a resume file and job description.", 400);
  }

  const file = formData.get("resume");
  const jdRaw = formData.get("jobDescription");

  if (!(file instanceof File)) {
    return jsonError("Missing resume file.", 400);
  }
  if (file.size === 0) {
    return jsonError("The uploaded resume file is empty.", 400);
  }
  if (file.size > MAX_RESUME_SIZE_BYTES) {
    return jsonError(
      `Resume file is too large. Maximum size is ${MAX_RESUME_SIZE_BYTES / (1024 * 1024)} MB.`,
      400,
    );
  }

  const jdParse = jobDescriptionSchema.safeParse(typeof jdRaw === "string" ? jdRaw : "");
  if (!jdParse.success) {
    return jsonError(jdParse.error.issues[0]?.message ?? "Invalid job description.", 400);
  }
  const jdText = jdParse.data;

  let resumeText: string;
  let fileKind: Awaited<ReturnType<typeof extractResumeText>>["kind"];
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const extracted = await extractResumeText(buffer, file.name, file.type);
    resumeText = extracted.text;
    fileKind = extracted.kind;
  } catch (error) {
    if (error instanceof UnsupportedFileTypeError || error instanceof EmptyResumeError) {
      return jsonError(error.message, 400);
    }
    console.error("Resume parsing failed:", error);
    return jsonError("We couldn't read this resume file. Please try a different PDF, DOCX, or TXT.", 422);
  }

  // Decided once, before any event is streamed, so the client never sees a
  // mid-stream switch between the backend and the local fallback engine.
  const useBackend = await isBackendReachable();

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AnalysisStreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        const pipeline = useBackend
          ? runBackendAnalysisPipeline({ resumeFile: file, resumeText, fileKind, jdText })
          : runAnalysisPipeline({
              resumeText,
              fileName: file.name,
              fileKind,
              fileSizeBytes: file.size,
              jdText,
            });

        for await (const event of pipeline) {
          send(event);
        }
      } catch (error) {
        console.error(
          `Analysis pipeline failed (engine=${useBackend ? "backend" : "local-fallback"}):`,
          error,
        );
        send({
          type: "error",
          data: { message: "Analysis failed unexpectedly. Please try again." },
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
