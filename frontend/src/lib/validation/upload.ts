import { z } from "zod";

export const ACCEPTED_RESUME_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "text/plain": [".txt"],
} as const;

export const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;
export const MIN_JD_LENGTH = 40;
export const MAX_JD_LENGTH = 20000;

export const jobDescriptionSchema = z
  .string()
  .trim()
  .min(
    MIN_JD_LENGTH,
    `Job description must be at least ${MIN_JD_LENGTH} characters so we can extract meaningful requirements.`,
  )
  .max(MAX_JD_LENGTH, `Job description must be under ${MAX_JD_LENGTH} characters.`);

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateResumeFile(file: File): FileValidationResult {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const allowedExtensions = [".pdf", ".docx", ".txt"];

  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: "Unsupported file type. Please upload a PDF, DOCX, or TXT file.",
    };
  }

  if (file.size === 0) {
    return { valid: false, error: "The selected file is empty." };
  }

  if (file.size > MAX_RESUME_SIZE_BYTES) {
    return {
      valid: false,
      error: `File is too large. Maximum size is ${
        MAX_RESUME_SIZE_BYTES / (1024 * 1024)
      } MB.`,
    };
  }

  return { valid: true };
}
