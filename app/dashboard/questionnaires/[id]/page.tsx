"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Questionnaire = {
  id: string;
  file_name: string;
  status: string;
  total_questions: number;
  error_message: string | null;
  created_at: string;
};

type Question = {
  id: string;
  row_number: number;
  question_text: string;
  answer_text: string | null;
  confidence: string | null;
  sources: { file_name: string; excerpt: string }[];
  status: string;
};

type PreviewData = {
  sheets: string[];
  sheet_name: string;
  preview_rows: string[][];
  guess_col: number;
};

type AnswerResult = {
  id: string;
  status: string;
  answer_text: string | null;
  confidence: string | null;
  sources: { file_name: string; excerpt: string }[];
};

const questionnaireStatusStyles: Record<string, string> = {
  uploaded: "bg-gray-100 text-gray-700",
  parsed: "bg-blue-50 text-blue-700",
  answering: "bg-amber-50 text-amber-700",
  ready: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
};

const confidenceStyles: Record<string, string> = {
  high: "bg-green-50 text-green-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-orange-50 text-orange-700",
  none: "bg-gray-100 text-gray-600",
};

const questionStatusStyles: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  drafted: "bg-blue-50 text-blue-700",
  not_found: "bg-gray-100 text-gray-500",
  failed: "bg-red-50 text-red-700",
  approved: "bg-green-50 text-green-700",
};

function Badge({ label, style }: { label: string; style: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      label={status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
      style={questionStatusStyles[status] ?? "bg-gray-100 text-gray-600"}
    />
  );
}

function ConfidenceBadge({ confidence }: { confidence: string | null }) {
  if (!confidence) return null;
  return (
    <Badge
      label={confidence.charAt(0).toUpperCase() + confidence.slice(1)}
      style={confidenceStyles[confidence] ?? "bg-gray-100 text-gray-600"}
    />
  );
}

type FilterKey = "all" | "drafted" | "not_found" | "failed";

const FILTERS: { key: FilterKey; label: string; statuses: string[] | null }[] = [
  { key: "all", label: "All", statuses: null },
  { key: "drafted", label: "Drafted", statuses: ["drafted"] },
  { key: "not_found", label: "Not found", statuses: ["not_found"] },
  { key: "failed", label: "Failed", statuses: ["failed"] },
];

export default function QuestionnaireDetailPage() {
  const params = useParams<{ id: string }>();
  const questionnaireId = params.id;

  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Column picker state
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [selectedCol, setSelectedCol] = useState<number>(0);
  const [headerRows, setHeaderRows] = useState(1);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Answer generation state
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [hasReadyDocs, setHasReadyDocs] = useState<boolean | null>(null);
  const stopRef = useRef(false);

  const loadPreview = useCallback(
    async (sheetName?: string) => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const response = await fetch("/api/questionnaires/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionnaire_id: questionnaireId,
            sheet_name: sheetName || undefined,
          }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          setPreviewError(data?.error ?? "Could not read the file.");
          setPreview(null);
        } else {
          setPreview(data as PreviewData);
          setSelectedSheet(data.sheet_name);
          setSelectedCol(data.guess_col);
        }
      } catch {
        setPreviewError("Could not reach the server. Please try again.");
      }
      setPreviewLoading(false);
    },
    [questionnaireId]
  );

  const loadAll = useCallback(async () => {
    const supabase = createClient();
    const [{ data: qnr }, { data: qs }] = await Promise.all([
      supabase
        .from("questionnaires")
        .select(
          "id, file_name, status, total_questions, error_message, created_at"
        )
        .eq("id", questionnaireId)
        .single(),
      supabase
        .from("questions")
        .select(
          "id, row_number, question_text, answer_text, confidence, sources, status"
        )
        .eq("questionnaire_id", questionnaireId)
        .order("row_number", { ascending: true }),
    ]);

    if (!qnr) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setQuestionnaire(qnr as Questionnaire);
    setQuestions((qs ?? []) as Question[]);
    setLoading(false);

    if ((qnr as Questionnaire).status === "uploaded") {
      loadPreview();
    }
  }, [questionnaireId, loadPreview]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Check for ready documents (needed to enable answer generation).
  useEffect(() => {
    async function checkDocs() {
      const supabase = createClient();
      const { count } = await supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("status", "ready");
      setHasReadyDocs((count ?? 0) > 0);
    }
    checkDocs();
  }, []);

  async function handleConfirmColumns() {
    setConfirming(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/questionnaires/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionnaire_id: questionnaireId,
          sheet_name: selectedSheet,
          question_col: selectedCol,
          header_rows: headerRows,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Could not extract the questions.");
      } else {
        if (data.message) setNotice(data.message);
        await loadAll();
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    }

    setConfirming(false);
  }

  function applyResults(results: AnswerResult[]) {
    setQuestions((prev) =>
      prev.map((q) => {
        const r = results.find((x) => x.id === q.id);
        return r
          ? {
              ...q,
              status: r.status,
              answer_text: r.answer_text,
              confidence: r.confidence,
              sources: r.sources,
            }
          : q;
      })
    );
  }

  async function runGeneration(ids: string[]) {
    if (ids.length === 0) return;
    setGenerating(true);
    setError(null);
    setProgress({ done: 0, total: ids.length });
    stopRef.current = false;

    let done = 0;
    for (let i = 0; i < ids.length; i += 3) {
      if (stopRef.current) break;
      const batch = ids.slice(i, i + 3);
      try {
        const response = await fetch("/api/questions/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question_ids: batch }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          setError(data?.error ?? "Answer generation failed. Please try again.");
          break;
        }
        applyResults(data.results ?? []);
      } catch {
        setError("Could not reach the server. Please try again.");
        break;
      }
      done += batch.length;
      setProgress({ done, total: ids.length });
    }

    setGenerating(false);
    await loadAll();
  }

  function handleGenerateAnswers() {
    const ids = questions
      .filter((q) => q.status === "pending" || q.status === "failed")
      .map((q) => q.id);
    if (ids.length === 0) {
      setNotice("All questions already have answers. Use Regenerate to redo any of them.");
      return;
    }
    runGeneration(ids);
  }

  function handleRetryFailed() {
    const ids = questions
      .filter((q) => q.status === "failed")
      .map((q) => q.id);
    runGeneration(ids);
  }

  function handleRegenerate(id: string) {
    runGeneration([id]);
  }

  function toggleSources(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function reopenColumnPicker() {
    const supabase = createClient();
    await supabase
      .from("questionnaires")
      .update({ status: "uploaded" })
      .eq("id", questionnaireId);
    await loadAll();
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (notFound || !questionnaire) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
        <p className="text-sm font-medium text-gray-900">
          Questionnaire not found
        </p>
        <Link
          href="/dashboard/questionnaires"
          className="mt-4 inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          Back to Questionnaires
        </Link>
      </div>
    );
  }

  const failedCount = questions.filter((q) => q.status === "failed").length;
  const filtered =
    filter === "all"
      ? questions
      : questions.filter((q) =>
          (FILTERS.find((f) => f.key === filter)?.statuses ?? []).includes(q.status)
        );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-gray-900">
            {questionnaire.file_name}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                questionnaireStatusStyles[questionnaire.status] ??
                "bg-gray-100 text-gray-700"
              }`}
            >
              {questionnaire.status.charAt(0).toUpperCase() +
                questionnaire.status.slice(1)}
            </span>
            <span className="text-xs text-gray-500">
              {questionnaire.total_questions} questions
            </span>
          </div>
        </div>
        <Link
          href="/dashboard/questionnaires"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back
        </Link>
      </div>

      {notice && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {notice}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Step A — column picker */}
      {questionnaire.status === "uploaded" && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Choose where the questions are
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Pick the sheet and the column that contains the questions.
          </p>

          {previewLoading ? (
            <div className="py-10 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            </div>
          ) : previewError ? (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {previewError}
            </div>
          ) : preview ? (
            <>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="sheet"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Sheet
                  </label>
                  <select
                    id="sheet"
                    value={selectedSheet}
                    onChange={(e) => loadPreview(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    {preview.sheets.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="column"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Question column
                  </label>
                  <select
                    id="column"
                    value={selectedCol}
                    onChange={(e) => setSelectedCol(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    {(preview.preview_rows[0] ?? []).map((header, i) => (
                      <option key={i} value={i}>
                        Column {i + 1}
                        {header ? ` — ${header.slice(0, 30)}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="headerRows"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Header rows to skip
                  </label>
                  <input
                    id="headerRows"
                    type="number"
                    min={0}
                    max={50}
                    value={headerRows}
                    onChange={(e) =>
                      setHeaderRows(Math.max(0, Number(e.target.value)))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y divide-gray-100">
                    {preview.preview_rows.map((row, r) => (
                      <tr key={r} className={r < headerRows ? "bg-gray-50 text-gray-400" : ""}>
                        {row.map((cell, c) => (
                          <td
                            key={c}
                            className={`max-w-[220px] truncate px-3 py-2 ${
                              c === selectedCol && r >= headerRows
                                ? "bg-primary-50 font-medium text-primary-700"
                                : "text-gray-700"
                            }`}
                          >
                            {cell || "\u00A0"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Preview of the first {preview.preview_rows.length} rows.
                Rows marked as headers are skipped.
              </p>

              <button
                onClick={handleConfirmColumns}
                disabled={confirming}
                className="mt-4 w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 sm:w-auto"
              >
                {confirming ? "Extracting questions..." : "Confirm and extract questions"}
              </button>
            </>
          ) : null}
        </div>
      )}

      {/* Failed state */}
      {questionnaire.status === "failed" && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-red-700">
            {questionnaire.error_message ??
              "Something went wrong while processing this questionnaire."}
          </p>
          <button
            onClick={reopenColumnPicker}
            className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Re-open column picker
          </button>
        </div>
      )}

      {/* Step B — answers */}
      {["parsed", "answering", "ready"].includes(questionnaire.status) && (
        <div className="mt-6">
          {hasReadyDocs === false ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
              <p className="text-sm font-medium text-gray-900">
                No processed documents yet
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Trustloop answers from your own security documents. Upload and
                process at least one document first.
              </p>
              <Link
                href="/dashboard/documents"
                className="mt-4 inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
              >
                Go to Documents
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
              {generating ? (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">
                      {progress
                        ? `${progress.done} of ${progress.total} done`
                        : "Working..."}
                    </p>
                    <button
                      onClick={() => {
                        stopRef.current = true;
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Stop
                    </button>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-primary-600 transition-all"
                      style={{
                        width: progress
                          ? `${Math.round((progress.done / progress.total) * 100)}%`
                          : "0%",
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    onClick={handleGenerateAnswers}
                    className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
                  >
                    Generate answers
                  </button>
                  {failedCount > 0 && (
                    <button
                      onClick={handleRetryFailed}
                      className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Retry failed ({failedCount})
                    </button>
                  )}
                  <p className="text-xs text-gray-500 sm:ml-auto">
                    {questions.filter((q) => q.status === "pending").length}{" "}
                    of {questions.length} still pending
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="mt-6 flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const count = f.statuses
                ? questions.filter((q) => f.statuses!.includes(q.status)).length
                : questions.length;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${
                    filter === f.key
                      ? "bg-primary-600 text-white"
                      : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {f.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Questions list */}
          <div className="mt-4 flex flex-col gap-3">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <p className="text-sm text-gray-500">
                  No questions match this filter.
                </p>
              </div>
            ) : (
              filtered.map((q) => (
                <div
                  key={q.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 text-sm font-medium text-gray-900">
                      <span className="mr-2 text-gray-400">#{q.row_number}</span>
                      {q.question_text}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      <ConfidenceBadge confidence={q.confidence} />
                      <StatusBadge status={q.status} />
                    </div>
                  </div>

                  {q.answer_text && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                      {q.answer_text}
                    </p>
                  )}

                  {q.status === "failed" && (
                    <p className="mt-2 text-xs text-red-600">
                      Answer generation failed. Use Retry to try again.
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleRegenerate(q.id)}
                      disabled={generating}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      Regenerate
                    </button>
                    {q.sources.length > 0 && (
                      <button
                        onClick={() => toggleSources(q.id)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        {expanded.has(q.id) ? "Hide sources" : `Sources (${q.sources.length})`}
                      </button>
                    )}
                  </div>

                  {expanded.has(q.id) && q.sources.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3">
                      {q.sources.map((source, i) => (
                        <div key={i}>
                          <p className="text-xs font-medium text-primary-700">
                            {source.file_name}
                          </p>
                          <p className="mt-0.5 text-xs leading-5 text-gray-600">
                            {source.excerpt.length > 400
                              ? `${source.excerpt.slice(0, 400)}...`
                              : source.excerpt}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <p className="mt-6 text-center text-xs text-gray-500">
            AI drafts - please review before sending. Not legal advice.
          </p>
        </div>
      )}
    </div>
  );
}
