"use client";

import { ScanLine } from "lucide-react";
import { useAnalysisStore } from "@/store/analysis-store";
import { ResumeUploadZone } from "@/components/upload/resume-upload-zone";
import { JobDescriptionInput } from "@/components/upload/job-description-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MIN_JD_LENGTH, emailSchema, nameSchema } from "@/lib/validation/upload";

export function AnalysisForm() {
  const name = useAnalysisStore((s) => s.name);
  const email = useAnalysisStore((s) => s.email);
  const resumeFile = useAnalysisStore((s) => s.resumeFile);
  const jobDescription = useAnalysisStore((s) => s.jobDescription);
  const error = useAnalysisStore((s) => s.error);
  const setName = useAnalysisStore((s) => s.setName);
  const setEmail = useAnalysisStore((s) => s.setEmail);
  const setResumeFile = useAnalysisStore((s) => s.setResumeFile);
  const setJobDescription = useAnalysisStore((s) => s.setJobDescription);
  const startAnalysis = useAnalysisStore((s) => s.startAnalysis);

  const nameValid = nameSchema.safeParse(name).success;
  const emailValid = emailSchema.safeParse(email).success;
  const canSubmit =
    !!resumeFile && jobDescription.trim().length >= MIN_JD_LENGTH && nameValid && emailValid;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Your details</CardTitle>
          <CardDescription>Used to attribute and save your analysis - never shared.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              autoComplete="email"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>2. Upload your resume</CardTitle>
            <CardDescription>PDF, DOCX, or TXT - up to 5 MB.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResumeUploadZone file={resumeFile} onFileSelected={setResumeFile} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Paste the job description</CardTitle>
            <CardDescription>We&apos;ll extract keywords and requirements from this.</CardDescription>
          </CardHeader>
          <CardContent>
            <JobDescriptionInput value={jobDescription} onChange={setJobDescription} />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col items-center gap-3">
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
