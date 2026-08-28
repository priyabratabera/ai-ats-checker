"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AnalysisResult } from "@/types/analysis";
import { Button } from "@/components/ui/button";
import { generateReportPdf } from "@/lib/report/generate-pdf";

export function DownloadReportButton({ result }: { result: AnalysisResult }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await generateReportPdf(result);
    } catch {
      toast.error("Couldn't generate the PDF report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button variant="secondary" onClick={handleDownload} disabled={isGenerating}>
      {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      Download report
    </Button>
  );
}
