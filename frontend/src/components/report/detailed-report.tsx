import { Sparkles } from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function KeywordChip({ label, count, variant }: { label: string; count?: number; variant: "success" | "warning" | "neutral" }) {
  return (
    <Badge variant={variant}>
      {label}
      {count !== undefined && count > 1 ? ` ×${count}` : ""}
    </Badge>
  );
}

export function DetailedReport({ result }: { result: AnalysisResult }) {
  const { keywordAnalysis, semanticInsights, resumeMeta, jdMeta } = result;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand-600 dark:text-brand-400" />
            Semantic analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">{semanticInsights.summary}</p>
          {semanticInsights.strengths.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">Strengths</p>
              <ul className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
                {semanticInsights.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-emerald-500">+</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {semanticInsights.gaps.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">Gaps</p>
              <ul className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
                {semanticInsights.gaps.map((g, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-amber-500">−</span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keyword breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              Matched ({keywordAnalysis.matched.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {keywordAnalysis.matched.map((m) => (
                <KeywordChip key={m.term} label={m.term} count={m.count} variant="success" />
              ))}
              {keywordAnalysis.matched.length === 0 && (
                <span className="text-sm text-slate-400">None found</span>
              )}
            </div>
          </div>
          {keywordAnalysis.partial.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                Partial match ({keywordAnalysis.partial.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {keywordAnalysis.partial.map((p) => (
                  <KeywordChip key={p.term} label={p.term} variant="neutral" />
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              Missing ({keywordAnalysis.missing.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {keywordAnalysis.missing.map((m) => (
                <KeywordChip key={m.term} label={m.term} variant="warning" />
              ))}
              {keywordAnalysis.missing.length === 0 && (
                <span className="text-sm text-slate-400">None - great coverage</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document stats</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Resume words</dt>
              <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">{resumeMeta.wordCount}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">JD words</dt>
              <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">{jdMeta.wordCount}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">File type</dt>
              <dd className="text-lg font-semibold uppercase text-slate-900 dark:text-slate-100">{resumeMeta.fileKind}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Analysis mode</dt>
              <dd className="text-lg font-semibold capitalize text-slate-900 dark:text-slate-100">{semanticInsights.source}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
