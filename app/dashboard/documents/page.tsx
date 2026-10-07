"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { pingWarmup } from "@/lib/warmup";
import {
  Badge,
  EmptyState,
  ErrorCard,
  ListSkeleton,
  PageHeader,
  btnSecondary,
  btnSmDanger,
  btnSmOutlinePrimary,
  btnSmSecondary,
} from "@/components/dashboard/ui";

type Document = {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  status: string;
  error_message: string | null;
  created_at: string;
};

const statusTones: Record<string, string> = {
  uploaded: "gray",
  processing: "amber",
  ready: "green",
  failed: "red",
  parsed: "blue",
};

function StatusBadge({ status }: { status: string }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <Badge tone={statusTones[status] ?? "gray"}>{label}</Badge>;
}

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = [".pdf", ".docx"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_{2,}/g, "_");
  return safe && safe !== "." ? safe : "file";
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function typeLabel(mime: string): string {
  if (mime === "application/pdf") return "PDF";
  if (mime.includes("wordprocessing")) return "Word";
  return mime;
}

function validateFile(file: File): string | null {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return `"${file.name}": only PDF and Word (.docx) files are allowed.`;
  }
  if (
    file.type &&
    !ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())
  ) {
    return `"${file.name}": this file type is not allowed.`;
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `"${file.name}" is too large. Maximum size is 10 MB.`;
  }
  if (file.size === 0) {
    return `"${file.name}" is empty.`;
  }
  return null;
}

export default function DocumentsPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setError("Could not load your documents. Please try again.");
    } else {
      setDocuments(data ?? []);
    }
    setLoadingList(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  async function handleFiles(files: FileList | File[]) {
    setError(null);
    const supabase = createClient();

    for (const file of Array.from(files)) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }

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
        .from("documents")
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        setError(`Upload failed for "${file.name}". Please try again.`);
        setUploading(false);
        setUploadingName(null);
        continue;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type || "application/octet-stream",
          status: "uploaded",
        })
        .select("id")
        .single();

      if (insertError) {
        await supabase.storage.from("documents").remove([filePath]);
        // Plan quota trigger (see supabase/no_free_plan.sql).
        if (insertError.message?.includes("PLAN_LIMIT_DOCUMENTS")) {
          setError(
            "You have reached your plan's document limit. Upgrade your plan to upload more."
          );
          setUploading(false);
          setUploadingName(null);
          break;
        }
        setError(`Upload failed for "${file.name}". Please try again.`);
        setUploading(false);
        setUploadingName(null);
        continue;
      }

      // Activity: reboot/keep-alive the AI server (fire-and-forget).
      pingWarmup();

      // Process the document (extract text and build search chunks).
      try {
        await fetch("/api/documents/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ document_id: inserted.id }),
        });
      } catch {
        // Ignore network errors here — the user can retry from the list.
      }

      setUploading(false);
      setUploadingName(null);
    }

    await loadDocuments();

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function handleRetry(doc: Document) {
    setBusyAction(doc.id);
    setError(null);

    try {
      const response = await fetch("/api/documents/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: doc.id }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(
          data?.error ?? `Could not process "${doc.file_name}". Please try again.`
        );
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    }

    setBusyAction(null);
    await loadDocuments();
  }

  async function handleDownload(doc: Document) {
    setBusyAction(doc.id);
    setError(null);
    const supabase = createClient();

    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.file_path, 60);

    setBusyAction(null);

    if (error || !data) {
      setError(`Could not generate a download link for "${doc.file_name}".`);
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = data.signedUrl;
    anchor.download = doc.file_name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setBusyAction(deleteTarget.id);
    const supabase = createClient();

    const { error: storageError } = await supabase.storage
      .from("documents")
      .remove([deleteTarget.file_path]);

    if (storageError) {
      setBusyAction(null);
      setDeleteError(
        `Could not delete the file from storage. Please try again.`
      );
      return;
    }

    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", deleteTarget.id);

    setBusyAction(null);

    if (deleteError) {
      setDeleteError("File deleted, but the record could not be removed. Please try again.");
      return;
    }

    setDocuments((docs) => docs.filter((d) => d.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="Upload your security documents so Trustloop can draft answers from them."
      />

      {/* Upload area */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload documents"
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
            handleFiles(e.dataTransfer.files);
          }
        }}
        className={`mt-6 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors sm:p-10 ${
          dragOver
            ? "border-primary-500 bg-primary-50"
            : "border-border bg-surface-tint hover:border-primary-400 hover:bg-primary-50/50"
        } ${uploading ? "pointer-events-none opacity-70" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files);
            }
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
              PDF or Word (.docx) only, up to 10 MB per file
            </p>
          </>
        )}
      </div>

      {error && <ErrorCard className="mt-4">{error}</ErrorCard>}

      {/* Document list */}
      <div className="mt-8">
        {loadingList ? (
          <ListSkeleton rows={5} />
        ) : documents.length === 0 ? (
          <EmptyState
            title="No documents uploaded yet"
            description="Upload your security policies and documentation above to get started."
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
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
                    <th>File name</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Uploaded</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td className="max-w-[220px] truncate font-medium text-navy">
                        {doc.file_name}
                      </td>
                      <td className="text-muted-foreground">
                        {typeLabel(doc.file_type)}
                      </td>
                      <td className="text-muted-foreground">
                        {formatSize(doc.file_size)}
                      </td>
                      <td className="text-muted-foreground">
                        {formatDate(doc.created_at)}
                      </td>
                      <td>
                        <StatusBadge status={doc.status} />
                        {doc.status === "failed" && doc.error_message && (
                          <p className="mt-1 max-w-[160px] text-xs text-red-600">
                            {doc.error_message}
                          </p>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          {doc.status === "failed" && (
                            <button
                              onClick={() => handleRetry(doc)}
                              disabled={busyAction === doc.id}
                              className={btnSmOutlinePrimary}
                            >
                              {busyAction === doc.id ? "..." : "Retry"}
                            </button>
                          )}
                          {(doc.status === "ready" ||
                            doc.status === "uploaded") && (
                            <button
                              onClick={() => handleRetry(doc)}
                              disabled={busyAction === doc.id}
                              className={btnSmSecondary}
                              title="Rebuild this document's search chunks"
                            >
                              {busyAction === doc.id ? "..." : "Reprocess"}
                            </button>
                          )}
                          <button
                            onClick={() => handleDownload(doc)}
                            disabled={busyAction === doc.id}
                            className={btnSmSecondary}
                          >
                            {busyAction === doc.id ? "..." : "Download"}
                          </button>
                          <button
                            onClick={() => {
                              setDeleteTarget(doc);
                              setDeleteError(null);
                            }}
                            disabled={busyAction === doc.id}
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
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="app-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-navy">
                        {doc.file_name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {typeLabel(doc.file_type)} · {formatSize(doc.file_size)}{" "}
                        · {formatDate(doc.created_at)}
                      </p>
                    </div>
                    <span className="shrink-0">
                      <StatusBadge status={doc.status} />
                    </span>
                  </div>
                  {doc.status === "failed" && doc.error_message && (
                    <p className="mt-2 text-xs text-red-600">
                      {doc.error_message}
                    </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    {doc.status === "failed" && (
                      <button
                        onClick={() => handleRetry(doc)}
                        disabled={busyAction === doc.id}
                        className={`${btnSmOutlinePrimary} flex-1`}
                      >
                        Retry
                      </button>
                    )}
                    {(doc.status === "ready" || doc.status === "uploaded") && (
                      <button
                        onClick={() => handleRetry(doc)}
                        disabled={busyAction === doc.id}
                        className={`${btnSmSecondary} flex-1`}
                      >
                        {busyAction === doc.id ? "..." : "Reprocess"}
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={busyAction === doc.id}
                      className={`${btnSmSecondary} flex-1`}
                    >
                      Download
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTarget(doc);
                        setDeleteError(null);
                      }}
                      disabled={busyAction === doc.id}
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
              Delete document?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This will permanently delete{" "}
              <span className="font-medium text-navy">
                {deleteTarget.file_name}
              </span>{" "}
              from your storage. This action cannot be undone.
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
                disabled={busyAction === deleteTarget.id}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {busyAction === deleteTarget.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
