"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type RecentQuestionnaire = {
  id: string;
  file_name: string;
  status: string;
  created_at: string;
};

const statusStyles: Record<string, string> = {
  uploaded: "bg-gray-100 text-gray-700",
  parsed: "bg-blue-50 text-blue-700",
  answering: "bg-amber-50 text-amber-700",
  ready: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        statusStyles[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | null;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      {value === null ? (
        <div className="mt-2 h-8 w-14 animate-pulse rounded bg-gray-100" />
      ) : (
        <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      )}
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [docsTotal, setDocsTotal] = useState<number | null>(null);
  const [docsReady, setDocsReady] = useState<number | null>(null);
  const [qnrTotal, setQnrTotal] = useState<number | null>(null);
  const [qDrafted, setQDrafted] = useState<number | null>(null);
  const [qApproved, setQApproved] = useState<number | null>(null);
  const [recent, setRecent] = useState<RecentQuestionnaire[] | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function loadStats() {
      const [docsAll, docsReadyRes, qnrs, drafted, approved, recentQnrs] =
        await Promise.all([
          supabase
            .from("documents")
            .select("id", { count: "exact", head: true }),
          supabase
            .from("documents")
            .select("id", { count: "exact", head: true })
            .eq("status", "ready"),
          supabase
            .from("questionnaires")
            .select("id", { count: "exact", head: true }),
          supabase
            .from("questions")
            .select("id", { count: "exact", head: true })
            .eq("status", "drafted"),
          supabase
            .from("questions")
            .select("id", { count: "exact", head: true })
            .eq("status", "approved"),
          supabase
            .from("questionnaires")
            .select("id, file_name, status, created_at")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

      setDocsTotal(docsAll.count ?? 0);
      setDocsReady(docsReadyRes.count ?? 0);
      setQnrTotal(qnrs.count ?? 0);
      setQDrafted(drafted.count ?? 0);
      setQApproved(approved.count ?? 0);
      setRecent((recentQnrs.data ?? []) as RecentQuestionnaire[]);
    }

    loadStats();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-600">
        An overview of your documents, questionnaires and answers.
      </p>

      {/* Stats cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Documents"
          value={docsTotal}
          sub={docsReady !== null ? `${docsReady} ready` : undefined}
        />
        <StatCard label="Questionnaires" value={qnrTotal} />
        <StatCard label="Drafted answers" value={qDrafted} />
        <StatCard label="Approved answers" value={qApproved} />
      </div>

      {/* Quick actions */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/dashboard/documents"
          className="rounded-lg bg-primary-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-primary-700"
        >
          Upload document
        </Link>
        <Link
          href="/dashboard/questionnaires"
          className="rounded-lg bg-primary-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-primary-700"
        >
          Upload questionnaire
        </Link>
        <Link
          href="/dashboard/ask"
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Ask
        </Link>
      </div>

      {/* Recent questionnaires */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Recent questionnaires
          </h2>
        </div>
        {recent === null ? (
          <div className="p-5">
            <div className="h-6 w-full animate-pulse rounded bg-gray-100" />
          </div>
        ) : recent.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-gray-900">
              No questionnaires yet
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Upload your first customer questionnaire to get started.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recent.map((qnr) => (
              <li key={qnr.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <Link
                  href={`/dashboard/questionnaires/${qnr.id}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 hover:text-primary-700"
                >
                  {qnr.file_name}
                </Link>
                <StatusBadge status={qnr.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
