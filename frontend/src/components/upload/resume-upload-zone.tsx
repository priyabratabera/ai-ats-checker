"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { FileText, Upload, X } from "lucide-react";
import { ACCEPTED_RESUME_TYPES, validateResumeFile } from "@/lib/validation/upload";
import { formatBytes, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ResumeUploadZoneProps {
  file: File | null;
  onFileSelected: (file: File | null) => void;
  disabled?: boolean;
}

export function ResumeUploadZone({ file, onFileSelected, disabled }: ResumeUploadZoneProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      setError(null);
      if (rejections.length > 0) {
        setError(
          rejections[0].errors[0]?.message ?? "This file couldn't be accepted.",
        );
        return;
      }
      const candidate = accepted[0];
      if (!candidate) return;
      const validation = validateResumeFile(candidate);
      if (!validation.valid) {
        setError(validation.error ?? "Invalid file.");
        return;
      }
      onFileSelected(candidate);
    },
    [onFileSelected],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_RESUME_TYPES,
    maxFiles: 1,
    multiple: false,
    disabled,
  });

  if (file) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{file.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</p>
          </div>
        </div>
        {!disabled && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Remove resume file"
            onClick={() => onFileSelected(null)}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          isDragActive
            ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
            : "border-slate-300 hover:border-brand-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <input {...getInputProps()} aria-label="Upload resume" />
        <div className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
          <Upload className="size-5" />
        </div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {isDragActive ? "Drop your resume here" : "Drag & drop your resume, or click to browse"}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">PDF, DOCX, or TXT · up to 5 MB</p>
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
