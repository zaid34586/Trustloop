"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Badge,
  EmptyState,
  ErrorCard,
  ListSkeleton,
  PageHeader,
  btnSecondary,
  btnSmDanger,
  btnSmSecondary,
} from "@/components/dashboard/ui";

type Questionnaire = {
  id: string;
  file_name: string;
  status: string;
  total_questions: number;
  created_at: string | null;
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const statusTones: Record<string, string> = {
  uploaded: "gray",
  parsed: "blue",
  answering: "amber",
  ready: "green",
  failed: "red",
};

function StatusBadge({ status }: { status: string | null }) {
  const value = status ?? "";
  const label = value ? value.charAt(0).toUpperCase() + value.slice(1) : "—";
  return <Badge tone={statusTones[value] ?? "gray"}>{label}</Badge>;
}

function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_{2,}/g, "_");
  return safe && safe !== "." ? safe : "file";
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function QuestionnairesPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [counts, setCounts] = useState<Record<string, { total: number; answered: number }>>({});
  const [loadingList, setLoadingList] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Questionnaire | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadQuestionnaires = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("questionnaires")
      .select("id, file_name, status, total_questions, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setError("Could not load your questionnaires. Please try again.");
    } else {
      // Guard against missing/null fields so one bad row can never
      // crash the whole list.
      setQuestionnaires(
        (data ?? []).map((qnr) => ({
          id: qnr.id,
          file_name: qnr.file_name ?? "Untitled questionnaire",
          status: qnr.status ?? "uploaded",
          total_questions: qnr.total_questions ?? 0,
          created_at: qnr.created_at ?? null,
        })) as Questionnaire[]
      );
      setCounts({});
    }
    setLoadingList(false);
  }, []);

  useEffect(() => {
    loadQuestionnaires();
  }, [loadQuestionnaires]);

  // Total and answered counts come from head:true count queries, so no
  // question rows are ever loaded into the browser.
  useEffect(() => {
    if (questionnaires.length === 0) {
      setCounts({});
      return;
    }
    let cancelled = false;

    async function loadCounts() {
      const supabase = createClient();
      const entries = await Promise.all(
        questionnaires.map(async (qnr) => {
          const [totalRes, answeredRes] = await Promise.all([
            supabase
              .from("questions")
              .select("id", { count: "exact", head: true })
              .eq("questionnaire_id", qnr.id),
            supabase
              .from("questions")
              .select("id", { count: "exact", head: true })
              .eq("questionnaire_id", qnr.id)
              .in("status", ["drafted", "not_found", "approved"]),
          ]);
          return [
            qnr.id,
            {
              total: totalRes.count ?? 0,
              answered: answeredRes.count ?? 0,
            },
          ] as const;
        })
      );
      if (cancelled) return;
      setCounts(Object.fromEntries(entries));
    }

    loadCounts();
    return () => {
      cancelled = true;
    };
  }, [questionnaires]);

  async function handleFile(file: File) {
    setError(null);

    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (extension !== ".xlsx") {
      setError("Only Excel (.xlsx) files are allowed.");
      return;
    }
    if (file.type && !file.type.includes("spreadsheetml")) {
      setError("This file type is not allowed. Please upload a .xlsx file.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("File is too large. Maximum size is 5 MB.");
      return;
    }
    if (file.size === 0) {
      setError("This file is empty.");
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You are not logged in. Please log in again.");
      return;
    }

    setUploading(true);
    setUploadingName(file.name);

    const safeName = sanitizeFileName(file.name);
    const filePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("questionnaires")
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      setError("Upload failed. Please try again.");
      setUploading(false);
      setUploadingName(null);
      return;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("questionnaires")
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        status: "uploaded",
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      await supabase.storage.from("questionnaires").remove([filePath]);
      setError("Upload failed. Please try again.");
      setUploading(false);
      setUploadingName(null);
      return;
    }

    // Go straight to the column picker for the new questionnaire.
    router.push(`/dashboard/questionnaires/${inserted.id}`);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleting(true);
    const supabase = createClient();

    const { data: questionnaire } = await supabase
      .from("questionnaires")
      .select("file_path")
      .eq("id", deleteTarget.id)
      .single();

    if (questionnaire) {
      const { error: storageError } = await supabase.storage
        .from("questionnaires")
        .remove([questionnaire.file_path]);

      if (storageError) {
        setDeleting(false);
        setDeleteError(
          "Could not delete the file from storage. Please try again."
        );
        return;
      }
    }

    // Cascade removes the questions rows.
    const { error: deleteError } = await supabase
      .from("questionnaires")
      .delete()
      .eq("id", deleteTarget.id);

    setDeleting(false);

    if (deleteError) {
      setDeleteError("Could not delete the questionnaire. Please try again.");
      return;
    }

    setQuestionnaires((items) => items.filter((q) => q.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <div>
      <PageHeader
        title="Questionnaires"
        subtitle="Upload a customer questionnaire spreadsheet and let Trustloop draft answers from your documents."
      />

      {/* Upload area */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload questionnaire"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!uploading && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
          }
        }}
        className={`mt-6 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? "border-primary-500 bg-primary-50"
            : "border-border bg-surface-tint hover:border-primary-400 hover:bg-primary-50/50"
        } ${uploading ? "pointer-events-none opacity-70" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary-600" />
            </span>
            <p className="text-sm font-medium text-navy">
              Uploading {uploadingName ? `"${uploadingName}"` : "..."}
            </p>
            <p className="text-xs text-muted-foreground">Please keep this tab open</p>
          </div>
        ) : (
          <>
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-navy">
              Click to upload or drag and drop
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Excel (.xlsx) only, up to 5 MB
            </p>
          </>
        )}
      </div>

      {error && <ErrorCard className="mt-4">{error}</ErrorCard>}

      {/* List */}
      <div className="mt-8">
        {loadingList ? (
          <ListSkeleton rows={5} />
        ) : questionnaires.length === 0 ? (
          <EmptyState
            title="No questionnaires yet"
            description="Upload a customer security questionnaire above to get started."
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
              />
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden app-card md:block">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Questions</th>
                    <th>Answered</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questionnaires.map((qnr) => (
                    <tr key={qnr.id}>
                      <td className="max-w-[240px] font-medium text-navy">
                        <Link
                          href={`/dashboard/questionnaires/${qnr.id}`}
                          className="block truncate hover:text-primary-700"
                        >
                          {qnr.file_name}
                        </Link>
                      </td>
                      <td className="text-muted-foreground">
                        {formatDate(qnr.created_at)}
                      </td>
                      <td>
                        <StatusBadge status={qnr.status} />
                      </td>
                      <td className="text-muted-foreground">
                        {counts[qnr.id]?.total ?? qnr.total_questions}
                      </td>
                      <td className="text-muted-foreground">
                        {counts[qnr.id]?.answered ?? 0}
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/dashboard/questionnaires/${qnr.id}`}
                            className={btnSmSecondary}
                          >
                            Open
                          </Link>
                          <button
                            onClick={() => {
                              setDeleteTarget(qnr);
                              setDeleteError(null);
                            }}
                            className={btnSmDanger}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {questionnaires.map((qnr) => (
                <div
                  key={qnr.id}
                  className="app-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/questionnaires/${qnr.id}`}
                        className="block truncate text-sm font-medium text-navy hover:text-primary-700"
                      >
                        {qnr.file_name}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(qnr.created_at)} ·{" "}
                        {counts[qnr.id]?.total ?? qnr.total_questions}{" "}
                        questions · {counts[qnr.id]?.answered ?? 0} answered
                      </p>
                    </div>
                    <StatusBadge status={qnr.status} />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/dashboard/questionnaires/${qnr.id}`}
                      className={`${btnSmSecondary} flex-1`}
                    >
                      Open
                    </Link>
                    <button
                      onClick={() => {
                        setDeleteTarget(qnr);
                        setDeleteError(null);
                      }}
                      className={`${btnSmDanger} flex-1`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm delete"
            className="w-full max-w-sm app-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-navy">
              Delete questionnaire?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This will permanently delete{" "}
              <span className="font-medium text-navy">
                {deleteTarget.file_name}
              </span>{" "}
              and all its questions and answers. This action cannot be undone.
            </p>
            {deleteError && <ErrorCard className="mt-4">{deleteError}</ErrorCard>}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className={btnSecondary}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
