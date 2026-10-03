"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Questionnaire = {
  id: string;
  file_name: string;
  status: string;
  total_questions: number;
  created_at: string;
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const statusStyles: Record<string, string> = {
  uploaded: "bg-gray-100 text-gray-700",
  parsed: "bg-blue-50 text-blue-700",
  answering: "bg-amber-50 text-amber-700",
  ready: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
};

function StatusBadge({ status }: { status: string }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        statusStyles[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {label}
    </span>
  );
}

function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_{2,}/g, "_");
  return safe && safe !== "." ? safe : "file";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
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
      setQuestionnaires(data ?? []);
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
      await supabase.storage
        .from("questionnaires")
        .remove([questionnaire.file_path]);
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
      <h1 className="text-2xl font-bold text-gray-900">Questionnaires</h1>
      <p className="mt-1 text-sm text-gray-600">
        Upload a customer questionnaire spreadsheet and let Trustloop draft
        answers from your documents.
      </p>

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
        className={`mt-6 cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? "border-primary-500 bg-primary-50"
            : "border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50/50"
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
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            <p className="text-sm font-medium text-gray-900">
              Uploading {uploadingName ? `"${uploadingName}"` : "..."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-900">
              Click to upload or drag and drop
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Excel (.xlsx) only, up to 5 MB
            </p>
          </>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* List */}
      <div className="mt-8">
        {loadingList ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : questionnaires.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
            <p className="text-sm font-medium text-gray-900">
              No questionnaires yet
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Upload a customer security questionnaire above to get started.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Questions</th>
                    <th className="px-4 py-3 font-medium">Answered</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {questionnaires.map((qnr) => (
                    <tr key={qnr.id} className="hover:bg-gray-50">
                      <td className="max-w-[240px] px-4 py-3 font-medium text-gray-900">
                        <Link
                          href={`/dashboard/questionnaires/${qnr.id}`}
                          className="block truncate hover:text-primary-700"
                        >
                          {qnr.file_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(qnr.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={qnr.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {counts[qnr.id]?.total ?? qnr.total_questions}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {counts[qnr.id]?.answered ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/dashboard/questionnaires/${qnr.id}`}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Open
                          </Link>
                          <button
                            onClick={() => {
                              setDeleteTarget(qnr);
                              setDeleteError(null);
                            }}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
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
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/questionnaires/${qnr.id}`}
                        className="block truncate text-sm font-medium text-gray-900 hover:text-primary-700"
                      >
                        {qnr.file_name}
                      </Link>
                      <p className="mt-1 text-xs text-gray-500">
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
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Open
                    </Link>
                    <button
                      onClick={() => {
                        setDeleteTarget(qnr);
                        setDeleteError(null);
                      }}
                      className="flex-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
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
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900">
              Delete questionnaire?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              This will permanently delete{" "}
              <span className="font-medium text-gray-900">
                {deleteTarget.file_name}
              </span>{" "}
              and all its questions and answers. This action cannot be undone.
            </p>
            {deleteError && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {deleteError}
              </div>
            )}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
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
