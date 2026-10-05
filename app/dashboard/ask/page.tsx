"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  CardSkeleton,
  EmptyState,
  ErrorCard,
  PageHeader,
  Skeleton,
  btnPrimary,
} from "@/components/dashboard/ui";

type Source = {
  file_name: string;
  content: string;
};

const MAX_CHARS = 500;

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingDocs, setCheckingDocs] = useState(true);
  const [hasReadyDocs, setHasReadyDocs] = useState(true);

  useEffect(() => {
    async function checkReadyDocuments() {
      const supabase = createClient();
      const { count } = await supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("status", "ready");
      setHasReadyDocs((count ?? 0) > 0);
      setCheckingDocs(false);
    }
    checkReadyDocuments();
  }, []);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setAnswer(null);
    setSources([]);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          data?.message ??
            data?.error ??
            "Something went wrong. Please try again."
        );
      } else {
        setAnswer(data.answer);
        setSources(data.sources ?? []);
      }
    } catch {
      setError("Could not reach the server. Please check your connection and try again.");
    }

    setLoading(false);
  }

  return (
    <div>
      <PageHeader
        title="Ask"
        subtitle="Ask a question about your uploaded security documents."
      />

      {checkingDocs ? (
        <div className="mt-6">
          <CardSkeleton rows={4} />
        </div>
      ) : !hasReadyDocs ? (
        <div className="mt-6">
          <EmptyState
            title="No processed documents yet"
            description="Trustloop can only answer from your own files. Upload a document first and wait until its status is Ready."
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            }
          >
            <Link href="/dashboard/documents" className={btnPrimary}>
              Go to Documents
            </Link>
          </EmptyState>
        </div>
      ) : (
        <>
          <form
            onSubmit={handleAsk}
            className="mt-6 app-card sm:p-6"
          >
            <label
              htmlFor="question"
              className="mb-2 block text-sm font-medium text-navy"
            >
              Your question
            </label>
            <textarea
              id="question"
              value={question}
              maxLength={MAX_CHARS}
              rows={4}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Do we have a documented incident response plan?"
              className="w-full resize-none rounded-xl border border-border px-3.5 py-2.5 text-sm text-navy placeholder-muted-foreground transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {question.length}/{MAX_CHARS}
              </span>
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className={`${btnPrimary} px-6`}
              >
                {loading ? "Searching..." : "Ask"}
              </button>
            </div>
          </form>

          {error && <ErrorCard className="mt-4">{error}</ErrorCard>}

          {loading && (
            <div className="mt-4 app-card">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary-600" />
                </span>
                <p className="text-sm font-medium text-navy">
                  Searching your documents and drafting an answer...
                </p>
              </div>
              <div className="mt-4 space-y-2.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          )}

          {answer && !loading && (
            <div className="mt-4 app-card">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                    />
                  </svg>
                </span>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Answer
                </h2>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-navy">
                {answer}
              </p>
              <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                AI draft - please review. Not legal advice.
              </p>
            </div>
          )}

          {sources.length > 0 && !loading && (
            <div className="mt-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Sources
              </h2>
              <div className="mt-3 flex flex-col gap-3">
                {sources.map((source, index) => (
                  <div
                    key={index}
                    className="app-card"
                  >
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-primary-700">
                      <svg
                        className="h-4 w-4 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.8}
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                        />
                      </svg>
                      {source.file_name}
                    </p>
                    <p className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                      {source.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
