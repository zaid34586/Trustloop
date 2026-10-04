"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchUserChunks, rankChunks, type RankedChunk } from "@/lib/retrieval";
import {
  Badge,
  ErrorCard,
  btnPrimary,
  inputClass,
} from "@/components/dashboard/ui";

// Debug helper: runs the exact retrieval the API routes use (session
// client -> RLS-scoped chunks -> app-side keyword ranking) and shows
// the top 3 matches. Read-only.
export default function RetrievalTest() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [matches, setMatches] = useState<RankedChunk[] | null>(null);

  async function runTest() {
    const query = question.trim();
    if (!query) return;
    setLoading(true);
    setError(null);
    setMatches(null);
    setTotal(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You are not logged in. Please log in again.");
        return;
      }
      const chunks = await fetchUserChunks(supabase, user.id);
      setTotal(chunks.length);
      setMatches(rankChunks(chunks, query, 3));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Retrieval failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">Retrieval test</p>
      <p className="mt-1 text-xs leading-5 text-gray-500">
        Reads your chunks with your session (RLS applies), ranks them in
        application code and shows the top 3 matches for a test query.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") runTest();
          }}
          placeholder='e.g. "incident response plan"'
          className={inputClass}
        />
        <button
          type="button"
          onClick={runTest}
          disabled={loading || !question.trim()}
          className={`${btnPrimary} shrink-0`}
        >
          {loading ? "Running…" : "Run retrieval"}
        </button>
      </div>

      {error ? (
        <div className="mt-4">
          <ErrorCard>{error}</ErrorCard>
        </div>
      ) : null}

      {total !== null && matches ? (
        <div className="mt-4">
          <p className="text-xs text-gray-500">
            {total} chunk{total === 1 ? "" : "s"} in your account · top{" "}
            {matches.length} match{matches.length === 1 ? "" : "es"}
          </p>
          {matches.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600">
              No chunks yet — upload and process a document first.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {matches.map((match) => (
                <li
                  key={match.id}
                  className="rounded-xl border border-gray-200 bg-gray-50/50 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <Badge tone="primary">score {match.score}</Badge>
                    <span className="font-medium text-gray-700">
                      {match.file_name}
                    </span>
                    <span>chunk #{match.chunk_index + 1}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-gray-600">
                    {match.content.length > 320
                      ? `${match.content.slice(0, 320)}…`
                      : match.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
