import type { Highlight } from "@/types/analysis";
import { Badge } from "@/components/ui/badge";

const LEGEND_ITEMS: { type: Highlight["type"]; label: string; dotClassName: string }[] = [
  { type: "matched-keyword", label: "Matched keyword", dotClassName: "bg-emerald-500" },
  { type: "weak-phrase", label: "Weak phrasing", dotClassName: "bg-amber-500" },
  { type: "quantify-suggestion", label: "Needs a metric", dotClassName: "bg-brand-500" },
];

export function HighlightLegend() {
  return (
    <div className="flex flex-wrap gap-4">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.type} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className={`size-2.5 rounded-full ${item.dotClassName}`} />
          {item.label}
        </div>
      ))}
    </div>
  );
}

export function MissingKeywordsPanel({ highlights }: { highlights: Highlight[] }) {
  const missing = highlights.filter((h) => h.type === "missing-keyword");
  if (missing.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        Missing keywords ({missing.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {missing.map((h) => (
          <Badge key={h.id} variant={h.severity === "high" ? "danger" : "warning"}>
            {h.snippet}
          </Badge>
        ))}
      </div>
    </div>
  );
}
