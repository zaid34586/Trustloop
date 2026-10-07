"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Badge,
  EmptyState,
  ErrorCard,
  NoticeCard,
  Skeleton,
  btnDanger,
  btnPrimary,
  btnSecondary,
  btnSmOutlinePrimary,
  btnSmPrimary,
  btnSmSecondary,
  btnSmSuccess,
  btnSuccess,
  selectClass,
} from "@/components/dashboard/ui";

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
  error?: string | null;
};

const questionnaireStatusTones: Record<string, string> = {
  uploaded: "gray",
  parsed: "blue",
  answering: "amber",
  ready: "green",
  failed: "red",
};

const confidenceTones: Record<string, string> = {
  high: "green",
  medium: "amber",
  low: "orange",
  none: "gray",
};

const questionStatusTones: Record<string, string> = {
  pending: "gray",
  drafted: "blue",
  not_found: "amber",
  failed: "red",
  approved: "green",
};

function StatusBadge({ status }: { status: string | null }) {
  const value = status ?? "";
  if (!value) return null;
  const label = value
    .replace("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <Badge tone={questionStatusTones[value] ?? "gray"}>{label}</Badge>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string | null }) {
  if (!confidence) return null;
  return (
    <Badge tone={confidenceTones[confidence] ?? "gray"}>
      {confidence.charAt(0).toUpperCase() + confidence.slice(1)}
    </Badge>
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
  const abortRef = useRef<AbortController | null>(null);

  // Review state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [showApproveAll, setShowApproveAll] = useState(false);
  const [approvingAll, setApprovingAll] = useState(false);
  // Error for ONE question — shown inside that question's card only.
  const [itemError, setItemError] = useState<{
    id: string;
    message: string;
  } | null>(null);
  // Short failure reason per question from answer generation, shown
  // inside that question's card.
  const [questionErrors, setQuestionErrors] = useState<
    Record<string, string>
  >({});

  // Export state
  const [includeDrafts, setIncludeDrafts] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Every new action starts with a clean slate: both global banners
  // (blue info + red error) are cleared, and they only reappear if
  // that action itself fails or has something to report.
  function clearBanners() {
    setError(null);
    setNotice(null);
    setQuestionErrors({});
  }

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
    clearBanners();

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
        if (!r) return q;
        // A failed result only flips the status: the previous answer
        // (e.g. a "not found" answer) survives until a run succeeds.
        if (r.status === "failed") {
          return { ...q, status: r.status };
        }
        return {
          ...q,
          status: r.status ?? q.status,
          answer_text: r.answer_text ?? null,
          confidence: r.confidence ?? null,
          sources: Array.isArray(r.sources) ? r.sources : [],
        };
      })
    );
  }

  async function runGeneration(ids: string[], itemId?: string) {
    if (ids.length === 0) return;
    // A new action clears every banner: global info, global error and
    // any per-question errors. They only reappear if this action fails.
    clearBanners();
    setGenerating(true);
    setProgress({ done: 0, total: ids.length });
    stopRef.current = false;

    // Errors from a single-item action (Regenerate / Retry of one item)
    // stay on that item; bulk actions report through the global banner.
    let bannerShown = false;
    const reportError = (message: string) => {
      if (itemId) {
        setQuestionErrors((prev) =>
          prev[itemId] ? prev : { ...prev, [itemId]: message }
        );
      } else {
        setError(message);
        bannerShown = true;
      }
    };

    // One controller per run so Stop aborts the in-flight requests too.
    const controller = new AbortController();
    abortRef.current = controller;

    let done = 0;
    let next = 0;
    let stopDispatching = false;
    const failedReasons: string[] = [];

    const advance = (result: AnswerResult) => {
      applyResults([result]);
      done += 1;
      setProgress({ done, total: ids.length });
      if (result.status === "failed") {
        const reason = result.error ?? "Answer generation failed.";
        setQuestionErrors((prev) => ({ ...prev, [result.id]: reason }));
        failedReasons.push(reason);
      }
    };

    // Up to 3 questions generate concurrently; progress updates after
    // EACH question instead of after a whole batch of three.
    async function worker() {
      while (!stopRef.current && !stopDispatching) {
        const i = next++;
        if (i >= ids.length) return;
        const id = ids[i];
        try {
          const response = await fetch("/api/questions/answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question_ids: [id] }),
            signal: controller.signal,
          });
          const data = await response.json().catch(() => null);
          const results: AnswerResult[] = Array.isArray(data?.results)
            ? data.results
            : [];
          results.forEach(advance);

          if (!response.ok) {
            const message: string =
              data?.error ??
              data?.message ??
              "Answer generation failed. Please try again.";
            // 429 means the question was never attempted - it stays
            // pending. Any other error stops the run so one outage
            // cannot burn the whole questionnaire; questions that were
            // not attempted stay pending for a later retry.
            if (results.length === 0 && response.status >= 500) {
              advance({
                id,
                status: "failed",
                answer_text: null,
                confidence: null,
                sources: [],
                error: message,
              });
            }
            stopDispatching = true;
            reportError(message);
          }
        } catch (err) {
          // Stopped by the user - not an error.
          if (
            stopRef.current ||
            (err instanceof DOMException && err.name === "AbortError")
          ) {
            return;
          }
          stopDispatching = true;
          reportError("Could not reach the server. Please try again.");
        }
      }
    }

    await Promise.all([worker(), worker(), worker()]);

    abortRef.current = null;
    setGenerating(false);

    // Bulk runs: summarise the per-question failure reasons in the banner.
    if (!itemId && !bannerShown && failedReasons.length > 0) {
      const unique = [...new Set(failedReasons)];
      setError(
        `${failedReasons.length} question${failedReasons.length === 1 ? "" : "s"} failed. ${unique
          .slice(0, 2)
          .join(" ")}${unique.length > 2 ? " ..." : ""}`
      );
    }
    await loadAll();
  }

  function handleGenerateAnswers() {
    clearBanners();
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
    clearBanners();
    const ids = questions
      .filter((q) => q.status === "failed")
      .map((q) => q.id);
    if (ids.length === 0) return;
    runGeneration(ids);
  }

  function handleRegenerate(id: string) {
    runGeneration([id], id);
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
    clearBanners();
    setItemError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  async function handleSaveEdit(q: Question) {
    const text = editText.trim();
    if (!text) {
      clearBanners();
      setItemError({
        id: q.id,
        message: "The answer cannot be empty. Use Cancel to discard the edit.",
      });
      return;
    }
    clearBanners();
    setItemError(null);
    setSavingEdit(true);

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
      setItemError({
        id: q.id,
        message: wasApproved
          ? "Could not save the edit. The answer is back to its approved state."
          : "Could not save the edit. Please try again.",
      });
    }
    setSavingEdit(false);
  }

  async function handleApprove(q: Question) {
    // Only drafted answers (AI-drafted or written manually with Edit)
    // can be approved — never Not found / Failed / Pending.
    if (q.status !== "drafted" || !q.answer_text) return;
    clearBanners();
    setItemError(null);
    const updates = { status: "approved", approved_at: new Date().toISOString() };
    setQuestions((prev) =>
      prev.map((item) => (item.id === q.id ? { ...item, ...updates } : item))
    );

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("questions")
      .update(updates)
      .eq("id", q.id)
      .eq("status", "drafted");

    if (updateError) {
      await loadAll();
      setItemError({
        id: q.id,
        message: "Could not approve the answer. Please try again.",
      });
    }
  }

  async function handleUnapprove(q: Question) {
    clearBanners();
    setItemError(null);
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
      setItemError({
        id: q.id,
        message: "Could not unapprove the answer. Please try again.",
      });
    }
  }

  const draftedWithAnswers = questions.filter(
    (q) => q.status === "drafted" && q.answer_text
  );

  async function handleApproveAll() {
    // Only Drafted items — recomputed here so a stale list can never
    // approve a Not found / Failed / Pending question.
    const ids = questions
      .filter((q) => q.status === "drafted" && q.answer_text)
      .map((q) => q.id);
    if (ids.length === 0) {
      setShowApproveAll(false);
      return;
    }
    clearBanners();
    setApprovingAll(true);

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
      .in("id", ids)
      .eq("status", "drafted");

    if (updateError) {
      await loadAll();
      setError("Could not approve all answers. Please try again.");
    }
    setApprovingAll(false);
  }

  // ---------- Export ----------

  async function handleExport() {
    clearBanners();
    setExporting(true);

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
      <div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="mt-8 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="app-card"
            >
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="mt-4 h-16 w-full" />
              <div className="mt-4 flex gap-2">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-7 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !questionnaire) {
    return (
      <EmptyState
        title="Questionnaire not found"
        description="It may have been deleted, or you may not have access to it."
        icon={
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        }
      >
        <Link href="/dashboard/questionnaires" className={`${btnPrimary} mt-5`}>
          Back to Questionnaires
        </Link>
      </EmptyState>
    );
  }

  const failedCount = questions.filter((q) => q.status === "failed").length;
  const pendingCount = questions.filter((q) => q.status === "pending").length;
  const approvedCount = questions.filter((q) => q.status === "approved").length;
  const filtered =
    filter === "all"
      ? questions
      : questions.filter((q) =>
          (FILTERS.find((f) => f.key === filter)?.statuses ?? []).includes(q.status)
        );

  // Display numbers start at #1 in list order (the real Excel row
  // number stays in q.row_number and is used for the export).
  const displayNumbers = new Map<string, number>();
  questions.forEach((q, index) => displayNumbers.set(q.id, index + 1));

  const reviewActive = ["parsed", "answering", "ready"].includes(
    questionnaire.status
  );

  return (
    <div>
      {/* Sticky top bar: back, title, progress, export */}
      <div className="sticky top-14 z-20 -mx-4 border-b border-border bg-card/95 px-4 py-3 shadow-sm backdrop-blur sm:-mx-6 sm:px-6 md:top-0 md:mx-0 md:px-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href="/dashboard/questionnaires"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-muted-foreground hover:bg-surface-tint"
            aria-label="Back to questionnaires"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
          </Link>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-navy sm:text-base">
              {questionnaire.file_name}
            </h1>
            <div className="mt-0.5 flex items-center gap-2">
              <Badge
                tone={
                  questionnaireStatusTones[questionnaire.status] ?? "gray"
                }
              >
                {questionnaire.status.charAt(0).toUpperCase() +
                  questionnaire.status.slice(1)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {questionnaire.total_questions} questions
              </span>
            </div>
          </div>

          {reviewActive && (
            <div className="flex w-full items-center gap-3 sm:w-auto">
              <div className="min-w-0 flex-1 sm:flex-none">
                <p className="text-xs font-medium text-muted-foreground">
                  <span className="font-semibold text-navy">
                    {approvedCount}
                  </span>{" "}
                  of {questions.length} approved
                </p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted sm:w-32">
                  <div
                    className="h-full rounded-full bg-primary-600 transition-all duration-500"
                    style={{
                      width: questions.length
                        ? `${Math.round((approvedCount / questions.length) * 100)}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                className={`${btnPrimary} shrink-0 px-3.5 py-2 sm:px-4`}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
                {exporting ? "Building..." : "Download Excel"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5">
        {notice && <NoticeCard>{notice}</NoticeCard>}
        {error && <ErrorCard className="mt-3">{error}</ErrorCard>}
      </div>

      {/* Step A — column picker */}
      {questionnaire.status === "uploaded" && (
        <div className="mt-6 app-card sm:p-6">
          <h2 className="text-lg font-semibold text-navy">
            Choose where the questions are
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick the sheet and the column that contains the questions.
          </p>

          {previewLoading ? (
            <div className="mt-4 space-y-3">
              <div className="grid gap-4 sm:grid-cols-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2 rounded-xl border border-border p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ) : previewError ? (
            <ErrorCard className="mt-4">{previewError}</ErrorCard>
          ) : preview ? (
            <>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="sheet"
                    className="mb-1 block text-sm font-medium text-navy"
                  >
                    Sheet
                  </label>
                  <select
                    id="sheet"
                    value={selectedSheet}
                    onChange={(e) => loadPreview(e.target.value)}
                    className={selectClass}
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
                    className="mb-1 block text-sm font-medium text-navy"
                  >
                    Question column
                  </label>
                  <select
                    id="column"
                    value={selectedCol}
                    onChange={(e) => setSelectedCol(Number(e.target.value))}
                    className={selectClass}
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
                    className="mb-1 block text-sm font-medium text-navy"
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
                    className={selectClass}
                  />
                </div>
              </div>

              <div className="mt-6 app-table-scroll">
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y divide-border">
                    {preview.preview_rows.map((row, r) => (
                      <tr key={r} className={r < headerRows ? "bg-surface-tint text-muted-foreground" : ""}>
                        {row.map((cell, c) => (
                          <td
                            key={c}
                            className={`max-w-[220px] truncate px-3 py-2 ${
                              c === selectedCol && r >= headerRows
                                ? "bg-primary-50 font-medium text-primary-700"
                                : "text-navy"
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
              <p className="mt-2 text-xs text-muted-foreground">
                Preview of the first {preview.preview_rows.length} rows.
                Rows marked as headers are skipped.
              </p>

              <button
                onClick={handleConfirmColumns}
                disabled={confirming}
                className={`${btnPrimary} mt-4 w-full sm:w-auto`}
              >
                {confirming ? "Extracting questions..." : "Confirm and extract questions"}
              </button>
            </>
          ) : null}
        </div>
      )}

      {/* Failed state */}
      {questionnaire.status === "failed" && (
        <div className="mt-6 app-alert app-alert-error">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card text-red-600 shadow-sm">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-800">
                This questionnaire could not be processed
              </p>
              <p className="mt-1 text-sm text-red-700">
                {questionnaire.error_message ??
                  "Something went wrong while processing this questionnaire."}
              </p>
              <button
                onClick={reopenColumnPicker}
                className={`${btnPrimary} mt-4`}
              >
                Re-open column picker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step B — answers and review */}
      {["parsed", "answering", "ready"].includes(questionnaire.status) && (
        <div className="mt-6">
          {hasReadyDocs === false ? (
            <EmptyState
              title="No processed documents yet"
              description="Trustloop answers from your own security documents. Upload and process at least one document first."
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
          ) : (
            <div className="app-card sm:p-6">
              {generating ? (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex items-center gap-2 text-sm font-medium text-navy">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-600" />
                      </span>
                      {progress
                        ? `${progress.done} of ${progress.total} done`
                        : "Working..."}
                    </p>
                    <button
                      onClick={() => {
                        stopRef.current = true;
                        // Abort the in-flight batch too, so Stop takes
                        // effect immediately instead of after the request.
                        abortRef.current?.abort();
                      }}
                      className={btnSmSecondary}
                    >
                      Stop
                    </button>
                  </div>
                  <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary-600 transition-all duration-300"
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
                    disabled={pendingCount === 0}
                    className={btnPrimary}
                  >
                    Generate answers
                  </button>
                  {failedCount > 0 && (
                    <button
                      onClick={handleRetryFailed}
                      className={btnDanger}
                    >
                      Retry failed ({failedCount})
                    </button>
                  )}
                  <p className="text-xs text-muted-foreground sm:ml-auto">
                    {pendingCount} of {questions.length} still pending
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Export options */}
          <div className="mt-4 app-card px-4 py-4 sm:px-6">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-navy">
              <input
                type="checkbox"
                checked={includeDrafts}
                onChange={(e) => setIncludeDrafts(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
              />
              Include drafts in the export (marked as DRAFT)
            </label>
            <p className="mt-2 text-xs text-muted-foreground">
              By default only approved answers are exported into the original
              file. Use{" "}
              <span className="font-medium text-navy">Download Excel</span>{" "}
              in the top bar to export.
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
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                    filter === f.key
                      ? "bg-primary-600 text-white shadow-sm"
                      : "border border-border bg-card text-muted-foreground hover:border-muted-foreground hover:bg-surface-tint"
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
                className={btnSuccess}
              >
                Approve all drafted ({draftedWithAnswers.length})
              </button>
            </div>
          )}

          {/* Questions list */}
          <div className="mt-4 flex flex-col gap-4">
            {filtered.length === 0 ? (
              <EmptyState
                title="No questions match this filter"
                description="Try a different filter to see more answers."
                icon={
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
                  />
                }
              />
            ) : (
              filtered.map((q) => (
                <div
                  key={q.id}
                  className="app-card transition-colors duration-150 hover:border-border sm:p-5"
                >
                  {/* Question + badges */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 text-sm font-semibold leading-6 text-navy">
                      <span className="mr-2 inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 align-middle text-[11px] font-medium text-muted-foreground">
                        #{displayNumbers.get(q.id) ?? 1}
                      </span>
                      {q.question_text}
                    </p>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {q.edited_by_user && <Badge tone="primary">Edited</Badge>}
                      <ConfidenceBadge confidence={q.confidence} />
                      <StatusBadge status={q.status} />
                    </div>
                  </div>

                  {/* Answer */}
                  {editingId === q.id ? (
                    <div className="mt-3">
                      <textarea
                        value={editText}
                        maxLength={MAX_EDIT_CHARS}
                        rows={4}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full resize-none rounded-xl border border-border px-3.5 py-2.5 text-sm text-navy transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {editText.length}/{MAX_EDIT_CHARS}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={cancelEdit}
                            disabled={savingEdit}
                            className={btnSmSecondary}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(q)}
                            disabled={savingEdit}
                            className={btnSmPrimary}
                          >
                            {savingEdit ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : q.answer_text ? (
                    <div className="mt-3 rounded-xl border border-border bg-surface-tint px-4 py-3.5">
                      <p className="whitespace-pre-wrap text-sm leading-6 text-navy">
                        {q.answer_text}
                      </p>
                    </div>
                  ) : q.status === "pending" ? (
                    <p className="mt-3 text-sm italic text-muted-foreground">
                      No answer yet — generate answers to draft one.
                    </p>
                  ) : null}

                  {q.status === "failed" && editingId !== q.id && (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      Answer generation failed. Use Retry, or write an answer
                      manually with Edit.
                    </p>
                  )}

                  {/* Error for this item only — never a global banner. */}
                  {(itemError?.id === q.id || questionErrors[q.id]) && (
                    <ErrorCard className="mt-3">
                      {itemError?.id === q.id
                        ? itemError.message
                        : questionErrors[q.id]}
                    </ErrorCard>
                  )}

                  {/* Sources expander, directly under the answer */}
                  {editingId !== q.id && q.sources.length > 0 && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => toggleSources(q.id)}
                        aria-expanded={expanded.has(q.id)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg border-t border-border pt-3 text-left text-xs font-semibold text-primary-700 transition-colors hover:text-primary-800"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                            />
                          </svg>
                          Sources ({q.sources.length})
                        </span>
                        <svg
                          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                            expanded.has(q.id) ? "rotate-180" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                          />
                        </svg>
                      </button>
                      {expanded.has(q.id) && (
                        <div className="mt-2 space-y-2">
                          {q.sources.map((source, i) => (
                            <div
                              key={i}
                              className="rounded-xl border border-border bg-surface-tint px-3.5 py-3"
                            >
                              <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-700">
                                <svg
                                  className="h-3 w-3 shrink-0"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
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
                              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                {source.excerpt}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  {editingId !== q.id && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => startEdit(q)}
                        disabled={generating || savingEdit}
                        className={btnSmSecondary}
                      >
                        {q.answer_text ? "Edit" : "Write answer"}
                      </button>
                      {/* Approve only for Drafted answers — AI drafts or
                          manual edits. Not found / Failed / Pending have
                          no approve action at all. */}
                      {q.status === "drafted" && q.answer_text && (
                        <button
                          onClick={() => handleApprove(q)}
                          disabled={generating || savingEdit}
                          className={btnSmSuccess}
                        >
                          Approve
                        </button>
                      )}
                      {q.status === "approved" && (
                        <button
                          onClick={() => handleUnapprove(q)}
                          disabled={generating || savingEdit}
                          className={btnSmSecondary}
                        >
                          Unapprove
                        </button>
                      )}
                      {q.status === "failed" && (
                        <button
                          onClick={() => handleRegenerate(q.id)}
                          disabled={generating || savingEdit}
                          className={btnSmOutlinePrimary}
                        >
                          Retry
                        </button>
                      )}
                      <button
                        onClick={() => handleRegenerate(q.id)}
                        disabled={generating || savingEdit}
                        className={btnSmSecondary}
                      >
                        Regenerate
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
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
            className="w-full max-w-sm app-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-navy">
              Approve all drafted answers?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This will approve{" "}
              <span className="font-medium text-navy">
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
                className={btnSecondary}
              >
                Cancel
              </button>
              <button
                onClick={handleApproveAll}
                disabled={approvingAll}
                className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
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
