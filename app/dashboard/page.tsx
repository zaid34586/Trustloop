"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  PageHeader,
  ListSkeleton,
  Skeleton,
  btnPrimary,
  btnSecondary,
} from "@/components/dashboard/ui";

type RecentQuestionnaire = {
  id: string;
  file_name: string;
  status: string;
  created_at: string;
};

type RecentDocument = {
  id: string;
  file_name: string;
  status: string;
  created_at: string;
};

type ActivityItem = {
  key: string;
  kind: "document" | "questionnaire";
  href: string;
  title: string;
  status: string;
  created_at: string;
};

const statusTones: Record<string, string> = {
  uploaded: "gray",
  processing: "amber",
  parsed: "blue",
  answering: "amber",
  ready: "green",
  failed: "red",
};

function toneFor(status: string): string {
  return statusTones[status] ?? "gray";
}

function labelFor(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const statIcons = {
  documents: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
    />
  ),
  questionnaires: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75"
    />
  ),
  drafted: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
    />
  ),
  approved: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  ),
};

function StatCard({
  label,
  value,
  sub,
  icon,
  iconClass,
}: {
  label: string;
  value: number | null;
  sub?: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow duration-150 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.7}
            stroke="currentColor"
            aria-hidden="true"
          >
            {icon}
          </svg>
        </span>
      </div>
      {value === null ? (
        <Skeleton className="mt-2 h-9 w-16" />
      ) : (
        <p className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
          {value}
        </p>
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
  const [recentDocs, setRecentDocs] = useState<RecentDocument[] | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function loadStats() {
      const [
        docsAll,
        docsReadyRes,
        qnrs,
        drafted,
        approved,
        recentQnrs,
        recentDocsRes,
      ] = await Promise.all([
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
        supabase
          .from("documents")
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
      setRecentDocs((recentDocsRes.data ?? []) as RecentDocument[]);
    }

    loadStats();
  }, []);

  const statsLoaded =
    docsTotal !== null &&
    docsReady !== null &&
    qnrTotal !== null &&
    qDrafted !== null &&
    qApproved !== null;

  // Get-started checklist — ticks off automatically from the counts above.
  const checklist = [
    {
      title: "Upload a document",
      description: "Add your security policies as a PDF or Word file.",
      href: "/dashboard/documents",
      done: docsTotal !== null && docsTotal > 0,
    },
    {
      title: "Upload a questionnaire",
      description: "Drop in the customer's Excel questionnaire.",
      href: "/dashboard/questionnaires",
      done: qnrTotal !== null && qnrTotal > 0,
    },
    {
      title: "Generate answers",
      description: "Let Trustloop draft answers from your documents.",
      href: "/dashboard/questionnaires",
      done:
        qDrafted !== null &&
        qApproved !== null &&
        (qDrafted > 0 || qApproved > 0),
    },
    {
      title: "Approve and export",
      description: "Review the drafts, approve them and download the Excel.",
      href: "/dashboard/questionnaires",
      done: qApproved !== null && qApproved > 0,
    },
  ];
  const doneCount = checklist.filter((item) => item.done).length;

  // Recent activity — questionnaires and documents merged, newest first.
  const activity: ActivityItem[] =
    recent === null || recentDocs === null
      ? []
      : [
          ...recent.map((qnr) => ({
            key: `qnr-${qnr.id}`,
            kind: "questionnaire" as const,
            href: `/dashboard/questionnaires/${qnr.id}`,
            title: qnr.file_name,
            status: qnr.status ?? "uploaded",
            created_at: qnr.created_at,
          })),
          ...recentDocs.map((doc) => ({
            key: `doc-${doc.id}`,
            kind: "document" as const,
            href: "/dashboard/documents",
            title: doc.file_name,
            status: doc.status ?? "uploaded",
            created_at: doc.created_at,
          })),
        ]
          .sort((a, b) =>
            (b.created_at ?? "").localeCompare(a.created_at ?? "")
          )
          .slice(0, 7);

  const activityLoaded = recent !== null && recentDocs !== null;

  return (
    <div>
      <PageHeader
        title="Welcome back"
        subtitle="Here's an overview of your documents, questionnaires and answers."
      />

      {/* Stats cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Documents"
          value={docsTotal}
          sub={docsReady !== null ? `${docsReady} ready` : undefined}
          icon={statIcons.documents}
          iconClass="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Questionnaires"
          value={qnrTotal}
          icon={statIcons.questionnaires}
          iconClass="bg-primary-50 text-primary-600"
        />
        <StatCard
          label="Drafted answers"
          value={qDrafted}
          icon={statIcons.drafted}
          iconClass="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Approved answers"
          value={qApproved}
          icon={statIcons.approved}
          iconClass="bg-green-50 text-green-600"
        />
      </div>

      {/* Quick actions */}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link href="/dashboard/documents" className={btnPrimary}>
          Upload document
        </Link>
        <Link href="/dashboard/questionnaires" className={btnSecondary}>
          Upload questionnaire
        </Link>
        <Link href="/dashboard/ask" className={btnSecondary}>
          Ask a question
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        {/* Get started checklist */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Get started
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {statsLoaded
                  ? `${doneCount} of ${checklist.length} complete`
                  : " "}
              </p>
            </div>
            {statsLoaded && doneCount < checklist.length && (
              <Link
                href={checklist.find((item) => !item.done)?.href ?? "/dashboard"}
                className="text-sm font-semibold text-primary-700 transition-colors hover:text-primary-800"
              >
                Continue →
              </Link>
            )}
          </div>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-primary-600 transition-all duration-500"
              style={{
                width: statsLoaded
                  ? `${Math.round((doneCount / checklist.length) * 100)}%`
                  : "0%",
              }}
            />
          </div>

          <ul className="mt-5 space-y-3">
            {!statsLoaded
              ? Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-40" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                  </li>
                ))
              : checklist.map((item, index) => (
                  <li key={item.title}>
                    <Link
                      href={item.href}
                      className="group flex items-center gap-3 rounded-xl p-2 -m-2 transition-colors hover:bg-gray-50"
                    >
                      <span
                        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                          item.done
                            ? "bg-primary-600 text-white"
                            : "border-2 border-gray-200 bg-white text-gray-400 group-hover:border-primary-300"
                        }`}
                      >
                        {item.done ? (
                          <svg
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={3}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4.5 12.75l6 6 9-13.5"
                            />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-sm font-medium ${
                            item.done
                              ? "text-gray-400 line-through"
                              : "text-gray-900"
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="block truncate text-xs text-gray-500">
                          {item.description}
                        </span>
                      </span>
                      <svg
                        className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-primary-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8.25 4.5l7.5 7.5-7.5 7.5"
                        />
                      </svg>
                    </Link>
                  </li>
                ))}
          </ul>
        </div>

        {/* Recent activity */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Recent activity
          </h2>

          {!activityLoaded ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="mt-6 text-center">
              <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-400">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.6}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="mt-3 text-sm font-medium text-gray-900">
                No activity yet
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Upload a document or questionnaire to get things moving.
              </p>
            </div>
          ) : (
            <ul className="mt-4 space-y-1">
              {activity.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-gray-50"
                  >
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        item.kind === "document"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-primary-50 text-primary-600"
                      }`}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.7}
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        {item.kind === "document" ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                          />
                        ) : (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75"
                          />
                        )}
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900 transition-colors group-hover:text-primary-700">
                        {item.title}
                      </span>
                      <span className="block text-xs text-gray-500">
                        {formatDate(item.created_at)}
                      </span>
                    </span>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        {
                          gray: "bg-gray-100 text-gray-600",
                          blue: "bg-blue-50 text-blue-700",
                          green: "bg-green-50 text-green-700",
                          amber: "bg-amber-50 text-amber-700",
                          red: "bg-red-50 text-red-700",
                        }[toneFor(item.status)]
                      }`}
                    >
                      {labelFor(item.status)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
