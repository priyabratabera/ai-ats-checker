import Link from "next/link";
import { ArrowLeft, Users as UsersIcon } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Card } from "@/components/ui/card";
import { scoreBand, SCORE_BAND_COLORS } from "@/components/dashboard/score-band";
import {
  listAnalysesFromBackend,
  BackendRequestError,
  BackendUnavailableError,
} from "@/lib/api/backend-client";
import type { BackendAnalysisListItem } from "@/types/backend";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

async function loadChecks(): Promise<{ checks: BackendAnalysisListItem[] } | { error: string }> {
  try {
    return { checks: await listAnalysesFromBackend() };
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      return { error: "Could not reach the backend. Start it (see backend/README.md) and reload this page." };
    }
    if (err instanceof BackendRequestError) {
      return { error: `Backend rejected the request: ${err.message}` };
    }
    return { error: "Something went wrong loading the visitor list." };
  }
}

export default async function UsersPage() {
  const result = await loadChecks();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>

          <div className="mb-8 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              <UsersIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Visitors</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Every ATS check performed, most recent first - a returning visitor appears once per check.
              </p>
            </div>
          </div>

          {"error" in result && (
            <Card className="p-6 text-sm text-red-600 dark:text-red-400">{result.error}</Card>
          )}

          {"checks" in result && result.checks.length === 0 && (
            <Card className="p-6 text-sm text-slate-500 dark:text-slate-400">
              No checks yet - once someone checks their ATS score via the backend, they&apos;ll show up here.
            </Card>
          )}

          {"checks" in result && result.checks.length > 0 && (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3">Email</th>
                      <th className="px-6 py-3">Resume</th>
                      <th className="px-6 py-3">Score</th>
                      <th className="px-6 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {result.checks.map((check) => (
                      <tr key={check.id}>
                        <td className="px-6 py-3 font-medium text-slate-900 dark:text-slate-100">
                          {check.name || <span className="text-slate-400 dark:text-slate-600">-</span>}
                        </td>
                        <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                          {check.email || <span className="text-slate-400 dark:text-slate-600">-</span>}
                        </td>
                        <td className="max-w-[220px] truncate px-6 py-3 text-slate-600 dark:text-slate-400">
                          {check.resume_file_name}
                        </td>
                        <td className="px-6 py-3">
                          {check.overall_score !== null ? (
                            <span
                              className="font-semibold tabular-nums"
                              style={{ color: SCORE_BAND_COLORS[scoreBand(check.overall_score)] }}
                            >
                              {check.overall_score}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 capitalize dark:text-slate-600">
                              {check.status}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                          {dateFormatter.format(new Date(check.created_at))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
