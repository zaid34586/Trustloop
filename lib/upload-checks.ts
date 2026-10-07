import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Server-side upload validation. The UI validates files before
// uploading, but client checks are advisory only — these helpers
// enforce the same limits in the API routes that parse files.
// ============================================================

/** Matches the UI limit on the documents page (10 MB). */
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
/** Matches the UI limit on the questionnaires page (5 MB). */
export const QUESTIONNAIRE_MAX_BYTES = 5 * 1024 * 1024;

export type FileCheckFailure = {
  status: 400 | 413 | 500;
  message: string;
};

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
}

/**
 * Checks to run BEFORE downloading the file:
 *  1. the file name must have an allowed extension;
 *  2. the object's size, read from server-trusted storage metadata
 *     (bucket.info), must fit the limit — so a huge file is rejected
 *     without being downloaded first.
 *
 * Returns null when the file passes.
 */
export async function verifyStoredFile(
  supabase: SupabaseClient,
  opts: {
    bucket: string;
    path: string;
    fileName: string;
    allowedExtensions: string[];
    maxBytes: number;
    tooLargeMessage: string;
  }
): Promise<FileCheckFailure | null> {
  if (!opts.allowedExtensions.includes(extensionOf(opts.fileName))) {
    return {
      status: 400,
      message: `Unsupported file type. Allowed: ${opts.allowedExtensions.join(
        ", "
      )} files only.`,
    };
  }

  const { data: info, error: infoError } = await supabase.storage
    .from(opts.bucket)
    .info(opts.path);

  if (infoError || !info) {
    // Cannot verify size without metadata — do not download blindly.
    return {
      status: 500,
      message: "Could not verify the file. Please try again.",
    };
  }
  if (info.size === 0) {
    return { status: 400, message: "This file is empty." };
  }
  if (typeof info.size === "number" && info.size > opts.maxBytes) {
    return { status: 413, message: opts.tooLargeMessage };
  }
  return null;
}

/**
 * Belt-and-braces size check on the downloaded blob, before any
 * parsing happens (covers storage metadata being unavailable).
 */
export function checkDownloadedSize(
  size: number,
  opts: { maxBytes: number; tooLargeMessage: string }
): FileCheckFailure | null {
  if (size === 0) return { status: 400, message: "This file is empty." };
  if (size > opts.maxBytes) {
    return { status: 413, message: opts.tooLargeMessage };
  }
  return null;
}

/**
 * Verifies the file content actually matches its type so a renamed
 * file cannot reach the parsers:
 *  - "pdf" must contain the "%PDF" header within the first 1024 bytes;
 *  - "zip" (docx/xlsx are ZIP containers) must start with "PK".
 * Never throws — corrupt content simply fails the check.
 */
export function checkMagicBytes(bytes: Uint8Array, kind: "pdf" | "zip"): boolean {
  if (bytes.length < 4) return false;
  if (kind === "zip") {
    return bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK"
  }
  const head = Buffer.from(bytes.subarray(0, 1024)).toString("latin1");
  return head.includes("%PDF");
}
