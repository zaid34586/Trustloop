"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

const statusStyles: Record<string, string> = {
  uploaded: "bg-gray-100 text-gray-700",
  processing: "bg-amber-50 text-amber-700",
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
        setError(`Upload failed for "${file.name}". Please try again.`);
        setUploading(false);
        setUploadingName(null);
        continue;
      }

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
      <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
      <p className="mt-1 text-sm text-gray-600">
        Upload your security documents so Trustloop can draft answers from
        them.
      </p>

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
        className={`mt-6 cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors sm:p-10 ${
          dragOver
            ? "border-primary-500 bg-primary-50"
            : "border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50/50"
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
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            <p className="text-sm font-medium text-gray-900">
              Uploading {uploadingName ? `"${uploadingName}"` : "..."}
            </p>
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
            <p className="text-sm font-medium text-gray-900">
              Click to upload or drag and drop
            </p>
            <p className="mt-1 text-xs text-gray-500">
              PDF or Word (.docx) only, up to 10 MB per file
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

      {/* Document list */}
      <div className="mt-8">
        {loadingList ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
            <p className="text-sm font-medium text-gray-900">
              No documents uploaded yet
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Upload your security policies and documentation above to get
              started.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">File name</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Size</th>
                    <th className="px-4 py-3 font-medium">Uploaded</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="max-w-[220px] truncate px-4 py-3 font-medium text-gray-900">
                        {doc.file_name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {typeLabel(doc.file_type)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatSize(doc.file_size)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(doc.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={doc.status} />
                        {doc.status === "failed" && doc.error_message && (
                          <p className="mt-1 max-w-[160px] text-xs text-red-600">
                            {doc.error_message}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {doc.status === "failed" && (
                            <button
                              onClick={() => handleRetry(doc)}
                              disabled={busyAction === doc.id}
                              className="rounded-lg border border-primary-200 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-60"
                            >
                              {busyAction === doc.id ? "..." : "Retry"}
                            </button>
                          )}
                          <button
                            onClick={() => handleDownload(doc)}
                            disabled={busyAction === doc.id}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                          >
                            {busyAction === doc.id ? "..." : "Download"}
                          </button>
                          <button
                            onClick={() => {
                              setDeleteTarget(doc);
                              setDeleteError(null);
                            }}
                            disabled={busyAction === doc.id}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
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
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {doc.file_name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
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
                        className="flex-1 rounded-lg border border-primary-200 px-3 py-2 text-xs font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-60"
                      >
                        Retry
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={busyAction === doc.id}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTarget(doc);
                        setDeleteError(null);
                      }}
                      disabled={busyAction === doc.id}
                      className="flex-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
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
              Delete document?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              This will permanently delete{" "}
              <span className="font-medium text-gray-900">
                {deleteTarget.file_name}
              </span>{" "}
              from your storage. This action cannot be undone.
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
                disabled={busyAction === deleteTarget.id}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
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
