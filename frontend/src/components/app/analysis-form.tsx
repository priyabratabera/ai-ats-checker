"use client";

import { ScanLine } from "lucide-react";
import { useAnalysisStore } from "@/store/analysis-store";
import { ResumeUploadZone } from "@/components/upload/resume-upload-zone";
import { JobDescriptionInput } from "@/components/upload/job-description-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MIN_JD_LENGTH } from "@/lib/validation/upload";

export function AnalysisForm() {
  const resumeFile = useAnalysisStore((s) => s.resumeFile);
  const jobDescription = useAnalysisStore((s) => s.jobDescription);
  const error = useAnalysisStore((s) => s.error);
  const setResumeFile = useAnalysisStore((s) => s.setResumeFile);
  const setJobDescription = useAnalysisStore((s) => s.setJobDescription);
  const startAnalysis = useAnalysisStore((s) => s.startAnalysis);

  const canSubmit = !!resumeFile && jobDescription.trim().length >= MIN_JD_LENGTH;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>1. Upload your resume</CardTitle>
          <CardDescription>PDF, DOCX, or TXT - up to 5 MB.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResumeUploadZone file={resumeFile} onFileSelected={setResumeFile} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Paste the job description</CardTitle>
          <CardDescription>We&apos;ll extract keywords and requirements from this.</CardDescription>
        </CardHeader>
        <CardContent>
          <JobDescriptionInput value={jobDescription} onChange={setJobDescription} />
        </CardContent>
      </Card>

      <div className="flex flex-col items-center gap-3 md:col-span-2">
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        <Button size="lg" onClick={startAnalysis} disabled={!canSubmit}>
          <ScanLine className="size-5" />
          Analyze my resume
        </Button>
      </div>
    </div>
  );
}
