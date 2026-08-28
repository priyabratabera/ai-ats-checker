import type { FileKind } from "@/types/analysis";
import { normalizeWhitespace } from "@/lib/analysis/text-utils";

export class UnsupportedFileTypeError extends Error {
  constructor(fileName: string) {
    super(`Unsupported file type for "${fileName}". Please upload a PDF, DOCX, or TXT file.`);
    this.name = "UnsupportedFileTypeError";
  }
}

export class EmptyResumeError extends Error {
  constructor() {
    super("We couldn't find any readable text in this file. If it's a scanned image, try exporting a text-based PDF or DOCX instead.");
    this.name = "EmptyResumeError";
  }
}

function detectFileKind(fileName: string, mimeType: string): FileKind | null {
  const extension = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  if (extension === ".pdf" || mimeType.includes("pdf")) return "pdf";
  if (extension === ".docx" || mimeType.includes("wordprocessingml")) return "docx";
  if (extension === ".txt" || mimeType.startsWith("text/plain")) return "txt";
  return null;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  // unpdf ships its own worker-free build of pdf.js specifically for
  // serverless/Node environments, sidestepping pdfjs-dist's "fake worker"
  // fallback (which dynamically import()s a path that isn't statically
  // analyzable and breaks under Turbopack's server bundle).
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

export async function extractResumeText(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<{ text: string; kind: FileKind }> {
  const kind = detectFileKind(fileName, mimeType);
  if (!kind) throw new UnsupportedFileTypeError(fileName);

  let raw: string;
  switch (kind) {
    case "pdf":
      raw = await extractPdfText(buffer);
      break;
    case "docx":
      raw = await extractDocxText(buffer);
      break;
    case "txt":
      raw = buffer.toString("utf-8");
      break;
  }

  const text = normalizeWhitespace(raw);
  if (text.length < 30) throw new EmptyResumeError();

  return { text, kind };
}
