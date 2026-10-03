"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
      <h1 className="text-2xl font-bold text-gray-900">Ask</h1>
      <p className="mt-1 text-sm text-gray-600">
        Ask a question about your uploaded security documents.
      </p>

      {checkingDocs ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        </div>
      ) : !hasReadyDocs ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <p className="text-sm font-medium text-gray-900">
            No processed documents yet
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Trustloop can only answer from your own files. Upload a document
            first and wait until its status is Ready.
          </p>
          <Link
            href="/dashboard/documents"
            className="mt-4 inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Go to Documents
          </Link>
        </div>
      ) : (
        <>
          <form
            onSubmit={handleAsk}
            className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
          >
            <label
              htmlFor="question"
              className="mb-2 block text-sm font-medium text-gray-700"
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
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {question.length}/{MAX_CHARS}
              </span>
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Searching..." : "Ask"}
              </button>
            </div>
          </form>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {loading && (
            <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                <p className="text-sm text-gray-600">
                  Searching your documents and drafting an answer...
                </p>
              </div>
            </div>
          )}

          {answer && !loading && (
            <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Answer
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-900">
                {answer}
              </p>
              <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
                AI draft - please review. Not legal advice.
              </p>
            </div>
          )}

          {sources.length > 0 && !loading && (
            <div className="mt-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Sources
              </h2>
              <div className="mt-3 flex flex-col gap-3">
                {sources.map((source, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <p className="text-sm font-medium text-primary-700">
                      {source.file_name}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-gray-600">
                      {source.content.length > 500
                        ? `${source.content.slice(0, 500)}...`
                        : source.content}
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
