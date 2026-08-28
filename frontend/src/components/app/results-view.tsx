"use client";

import { CloudOff, RotateCcw, Server } from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreDashboard } from "@/components/dashboard/score-dashboard";
import { ResumePreview } from "@/components/resume/resume-preview";
import { HighlightLegend, MissingKeywordsPanel } from "@/components/resume/highlight-legend";
import { RecommendationsList } from "@/components/recommendations/recommendations-list";
import { DetailedReport } from "@/components/report/detailed-report";
import { DownloadReportButton } from "@/components/report/download-report-button";
import { useAnalysisStore } from "@/store/analysis-store";

function EngineSourceBadge({ result }: { result: AnalysisResult }) {
  if (result.engineSource === "backend") {
    return (
      <Badge variant="neutral">
        <Server className="size-3" />
        Backend{result.aiProvider ? ` · ${result.aiProvider}/${result.aiModel}` : " · rule engine only"}
      </Badge>
    );
  }
  return (
    <Badge variant="warning">
      <CloudOff className="size-3" />
      Local fallback · backend unreachable
    </Badge>
  );
}

export function ResultsView({ result }: { result: AnalysisResult }) {
  const reset = useAnalysisStore((s) => s.reset);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Analysis results</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">{result.resumeMeta.fileName}</p>
            <EngineSourceBadge result={result} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DownloadReportButton result={result} />
          <Button variant="ghost" onClick={reset}>
            <RotateCcw className="size-4" />
            Analyze another
          </Button>
        </div>
      </div>

      <ScoreDashboard score={result.score} />

      <Tabs defaultValue="resume">
        <TabsList>
          <TabsTrigger value="resume">Highlighted resume</TabsTrigger>
          <TabsTrigger value="report">Detailed report</TabsTrigger>
          <TabsTrigger value="recommendations">
            Recommendations ({result.recommendations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resume">
          <div className="flex flex-col gap-4">
            <HighlightLegend />
            <ResumePreview resumeText={result.resumeText} highlights={result.highlights} />
            <MissingKeywordsPanel highlights={result.highlights} />
          </div>
        </TabsContent>

        <TabsContent value="report">
          <DetailedReport result={result} />
        </TabsContent>

        <TabsContent value="recommendations">
          <RecommendationsList recommendations={result.recommendations} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
