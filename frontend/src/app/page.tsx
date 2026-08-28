import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { AtsCheckerApp } from "@/components/app/ats-checker-app";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="mb-10 max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
              See your resume the way an ATS does
            </h1>
            <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
              Upload your resume and a job description to get a rule-based and
              semantic ATS score, keyword-level highlighting, and prioritized
              recommendations - in seconds.
            </p>
          </div>
          <AtsCheckerApp />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
