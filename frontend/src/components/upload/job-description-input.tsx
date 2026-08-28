"use client";

import { Textarea } from "@/components/ui/textarea";
import { MAX_JD_LENGTH, MIN_JD_LENGTH } from "@/lib/validation/upload";
import { cn } from "@/lib/utils";

interface JobDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function JobDescriptionInput({ value, onChange, disabled }: JobDescriptionInputProps) {
  const tooShort = value.trim().length > 0 && value.trim().length < MIN_JD_LENGTH;

  return (
    <div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Paste the full job description here - the more detail, the more accurate the keyword and skills analysis."
        rows={10}
        maxLength={MAX_JD_LENGTH}
        aria-label="Job description"
        className="resize-y"
      />
      <div className="mt-1.5 flex items-center justify-between text-xs">
        <span className={cn("text-slate-400 dark:text-slate-500", tooShort && "text-amber-600 dark:text-amber-400")}>
          {tooShort ? `At least ${MIN_JD_LENGTH} characters needed` : " "}
        </span>
        <span className="text-slate-400 dark:text-slate-500 tabular-nums">
          {value.length.toLocaleString()} / {MAX_JD_LENGTH.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
