import { ScanSearch } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80 sticky top-0 z-10">
      <div className="mx-auto flex max-w-5xl items-center gap-2.5 px-4 py-4 sm:px-6">
        <div className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <ScanSearch className="size-4.5" />
        </div>
        <span className="text-base font-semibold text-slate-900 dark:text-slate-50">ATS Checker</span>
      </div>
    </header>
  );
}
