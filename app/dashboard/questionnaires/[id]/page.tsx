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
  edited_by_user: boolean | null;
  approved_at: string | null;
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

function StatusBadge({ status }: { status: string | null }) {
  const value = status ?? "";
  if (!value) return null;
  return (
    <Badge
      label={value.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
      style={questionStatusStyles[value] ?? "bg-gray-100 text-gray-600"}
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

type FilterKey = "all" | "drafted" | "approved" | "not_found" | "failed";

const FILTERS: { key: FilterKey; label: string; statuses: string[] | null }[] = [
  { key: "all", label: "All", statuses: null },
  { key: "drafted", label: "Drafted", statuses: ["drafted"] },
  { key: "approved", label: "Approved", statuses: ["approved"] },
  { key: "not_found", label: "Not found", statuses: ["not_found"] },
  { key: "failed", label: "Failed", statuses: ["failed"] },
];

const MAX_EDIT_CHARS = 2000;

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

  // Review state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [showApproveAll, setShowApproveAll] = useState(false);
  const [approvingAll, setApprovingAll] = useState(false);

  // Export state
  const [includeDrafts, setIncludeDrafts] = useState(false);
  const [exporting, setExporting] = useState(false);

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
          "id, row_number, question_text, answer_text, confidence, sources, status, edited_by_user, approved_at"
        )
        .eq("questionnaire_id", questionnaireId)
        .order("row_number", { ascending: true }),
    ]);

    if (!qnr) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    // Normalise every field the UI relies on. The questions table on the
    // live database can return null for optional columns (most importantly
    // `sources`), and rendering `q.sources.length` on null crashed the page.
    const questionnaireRow: Questionnaire = {
      id: (qnr as Questionnaire).id ?? questionnaireId,
      file_name: (qnr as Questionnaire).file_name ?? "Untitled questionnaire",
      status: (qnr as Questionnaire).status ?? "uploaded",
      total_questions: (qnr as Questionnaire).total_questions ?? 0,
      error_message: (qnr as Questionnaire).error_message ?? null,
      created_at: (qnr as Questionnaire).created_at ?? "",
    };
    const questionRows: Question[] = ((qs ?? []) as Question[]).map((q) => ({
      id: q.id,
      row_number: q.row_number ?? 0,
      question_text: q.question_text ?? "",
      answer_text: q.answer_text ?? null,
      confidence: q.confidence ?? null,
      sources: Array.isArray(q.sources)
        ? q.sources.map((s) => ({
            file_name: s?.file_name ?? "",
            excerpt: s?.excerpt ?? "",
          }))
        : [],
      status: q.status ?? "pending",
      edited_by_user: q.edited_by_user ?? false,
      approved_at: q.approved_at ?? null,
    }));

    setQuestionnaire(questionnaireRow);
    setQuestions(questionRows);
    setLoading(false);

    if (questionnaireRow.status === "uploaded") {
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
        setNotice(
          data?.message ??
            (typeof data?.total === "number"
              ? `Extracted ${data.total} questions. They are listed below — review them, then generate answers.`
              : "Questions extracted.")
        );
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
              status: r.status ?? q.status,
              answer_text: r.answer_text ?? null,
              confidence: r.confidence ?? null,
              sources: Array.isArray(r.sources) ? r.sources : [],
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

  // ---------- Review ----------

  function startEdit(q: Question) {
    setEditingId(q.id);
    setEditText(q.answer_text ?? "");
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  async function handleSaveEdit(q: Question) {
    const text = editText.trim();
    if (!text) {
      setError("The answer cannot be empty. Use Cancel to discard the edit.");
      return;
    }
    setSavingEdit(true);
    setError(null);

    // Optimistic update.
    const manual = q.status === "not_found" || q.status === "failed";
    const wasApproved = q.status === "approved";
    const updates = {
      answer_text: text.slice(0, MAX_EDIT_CHARS),
      edited_by_user: true,
      status: "drafted",
      approved_at: null,
      confidence: manual ? "none" : q.confidence,
    };
    setQuestions((prev) =>
      prev.map((item) => (item.id === q.id ? { ...item, ...updates } : item))
    );
    cancelEdit();

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("questions")
      .update(updates)
      .eq("id", q.id);

    if (updateError) {
      await loadAll();
      setError(
        wasApproved
          ? "Could not save the edit. The answer is back to its approved state."
          : "Could not save the edit. Please try again."
      );
    }
    setSavingEdit(false);
  }

  async function handleApprove(q: Question) {
    setError(null);
    const updates = { status: "approved", approved_at: new Date().toISOString() };
    setQuestions((prev) =>
      prev.map((item) => (item.id === q.id ? { ...item, ...updates } : item))
    );

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("questions")
      .update(updates)
      .eq("id", q.id);

    if (updateError) {
      await loadAll();
      setError("Could not approve the answer. Please try again.");
    }
  }

  async function handleUnapprove(q: Question) {
    setError(null);
    const updates = { status: "drafted", approved_at: null };
    setQuestions((prev) =>
      prev.map((item) => (item.id === q.id ? { ...item, ...updates } : item))
    );

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("questions")
      .update(updates)
      .eq("id", q.id);

    if (updateError) {
      await loadAll();
      setError("Could not unapprove the answer. Please try again.");
    }
  }

  const draftedWithAnswers = questions.filter(
    (q) => q.status === "drafted" && q.answer_text
  );

  async function handleApproveAll() {
    if (draftedWithAnswers.length === 0) return;
    setApprovingAll(true);
    setError(null);

    const ids = draftedWithAnswers.map((q) => q.id);
    const updates = { status: "approved", approved_at: new Date().toISOString() };

    // Optimistic update.
    setQuestions((prev) =>
      prev.map((item) => (ids.includes(item.id) ? { ...item, ...updates } : item))
    );
    setShowApproveAll(false);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("questions")
      .update(updates)
      .in("id", ids);

    if (updateError) {
      await loadAll();
      setError("Could not approve all answers. Please try again.");
    }
    setApprovingAll(false);
  }

  // ---------- Export ----------

  async function handleExport() {
    setExporting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/questionnaires/${questionnaireId}/export`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ include_drafts: includeDrafts }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "Export failed. Please try again.");
        setExporting(false);
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const fileName = match?.[1] ?? "questionnaire-trustloop.xlsx";

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not export the questionnaire. Please try again.");
    }

    setExporting(false);
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
  const approvedCount = questions.filter((q) => q.status === "approved").length;
  const draftedCount = questions.filter((q) => q.status === "drafted").length;
  const notFoundCount = questions.filter((q) => q.status === "not_found").length;
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

      {/* Step B — answers and review */}
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

          {/* Review progress summary */}
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Review progress
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                <span>
                  Total <span className="font-semibold text-gray-900">{questions.length}</span>
                </span>
                <span>
                  Approved <span className="font-semibold text-green-700">{approvedCount}</span>
                </span>
                <span>
                  Drafted <span className="font-semibold text-blue-700">{draftedCount}</span>
                </span>
                <span>
                  Not found <span className="font-semibold text-gray-500">{notFoundCount}</span>
                </span>
                <span>
                  Failed <span className="font-semibold text-red-600">{failedCount}</span>
                </span>
              </div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-green-600 transition-all"
                style={{
                  width: questions.length
                    ? `${Math.round((approvedCount / questions.length) * 100)}%`
                    : "0%",
                }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {approvedCount} of {questions.length} approved
            </p>
          </div>

          {/* Export */}
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={includeDrafts}
                  onChange={(e) => setIncludeDrafts(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Include drafts (marked as DRAFT)
              </label>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {exporting ? "Building Excel..." : "Download Excel"}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              By default only approved answers are exported into the original
              file.
            </p>
          </div>

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

          {/* Bulk approve */}
          {draftedWithAnswers.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowApproveAll(true)}
                disabled={generating}
                className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:opacity-60"
              >
                Approve all drafted ({draftedWithAnswers.length})
              </button>
            </div>
          )}

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
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {q.edited_by_user && (
                        <Badge
                          label="Edited"
                          style="bg-primary-50 text-primary-700"
                        />
                      )}
                      <ConfidenceBadge confidence={q.confidence} />
                      <StatusBadge status={q.status} />
                    </div>
                  </div>

                  {editingId === q.id ? (
                    <div className="mt-2">
                      <textarea
                        value={editText}
                        maxLength={MAX_EDIT_CHARS}
                        rows={4}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {editText.length}/{MAX_EDIT_CHARS}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={cancelEdit}
                            disabled={savingEdit}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(q)}
                            disabled={savingEdit}
                            className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                          >
                            {savingEdit ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    q.answer_text && (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                        {q.answer_text}
                      </p>
                    )
                  )}

                  {q.status === "failed" && editingId !== q.id && (
                    <p className="mt-2 text-xs text-red-600">
                      Answer generation failed. Use Retry, or write an answer
                      manually with Edit.
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {editingId === q.id ? null : (
                      <>
                        {q.status !== "failed" && (
                          <button
                            onClick={() => startEdit(q)}
                            disabled={generating || savingEdit}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                          >
                            {q.answer_text ? "Edit" : "Write answer"}
                          </button>
                        )}
                        {q.answer_text && q.status !== "approved" && (
                          <button
                            onClick={() => handleApprove(q)}
                            disabled={generating || savingEdit}
                            className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-60"
                          >
                            Approve
                          </button>
                        )}
                        {q.status === "approved" && (
                          <button
                            onClick={() => handleUnapprove(q)}
                            disabled={generating || savingEdit}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                          >
                            Unapprove
                          </button>
                        )}
                        <button
                          onClick={() => handleRegenerate(q.id)}
                          disabled={generating || savingEdit}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                          Regenerate
                        </button>
                        {q.sources.length > 0 && (
                          <button
                            onClick={() => toggleSources(q.id)}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            {expanded.has(q.id)
                              ? "Hide sources"
                              : `Sources (${q.sources.length})`}
                          </button>
                        )}
                      </>
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

      {/* Approve all confirmation */}
      {showApproveAll && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowApproveAll(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm approve all"
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900">
              Approve all drafted answers?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              This will approve{" "}
              <span className="font-medium text-gray-900">
                {draftedWithAnswers.length}
              </span>{" "}
              drafted answer
              {draftedWithAnswers.length === 1 ? "" : "s"}. Questions without
              a drafted answer (not found, failed or pending) are skipped.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setShowApproveAll(false)}
                disabled={approvingAll}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveAll}
                disabled={approvingAll}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {approvingAll ? "Approving..." : "Approve all"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
