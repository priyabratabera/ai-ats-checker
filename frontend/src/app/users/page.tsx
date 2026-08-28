import Link from "next/link";
import { ArrowLeft, Users as UsersIcon } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Card } from "@/components/ui/card";
import { listUsersFromBackend, BackendRequestError, BackendUnavailableError } from "@/lib/api/backend-client";
import type { BackendUser } from "@/types/backend";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

async function loadUsers(): Promise<{ users: BackendUser[] } | { error: string }> {
  try {
    return { users: await listUsersFromBackend() };
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
  const result = await loadUsers();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
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
                Everyone who has checked their ATS score, from the backend&apos;s <code>users</code> table.
              </p>
            </div>
          </div>

          {"error" in result && (
            <Card className="p-6 text-sm text-red-600 dark:text-red-400">{result.error}</Card>
          )}

          {"users" in result && result.users.length === 0 && (
            <Card className="p-6 text-sm text-slate-500 dark:text-slate-400">
              No visitors yet - once someone checks their ATS score via the backend, they&apos;ll show up here.
            </Card>
          )}

          {"users" in result && result.users.length > 0 && (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3">Email</th>
                      <th className="px-6 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {result.users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-3 font-medium text-slate-900 dark:text-slate-100">
                          {user.name || <span className="text-slate-400 dark:text-slate-600">-</span>}
                        </td>
                        <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                          {user.email || <span className="text-slate-400 dark:text-slate-600">-</span>}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                          {dateFormatter.format(new Date(user.created_at))}
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
