export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 py-6 dark:border-slate-800">
      <div className="mx-auto max-w-5xl px-4 text-center text-xs text-slate-400 dark:text-slate-600 sm:px-6">
        Your name, email, resume, and analysis are saved to our database so we can attribute and revisit your
        results; if the analysis backend is unreachable, your resume is analyzed locally for that request only
        and nothing is stored.
      </div>
    </footer>
  );
}
