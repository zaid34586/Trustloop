import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  DOCUMENT_MAX_BYTES,
  checkDownloadedSize,
  checkMagicBytes,
  verifyStoredFile,
} from "@/lib/upload-checks";

const MAX_CHUNK_CHARS = 1000;
const TARGET_CHUNK_CHARS = 900;
const OVERLAP_CHARS = 150;
const NO_TEXT_MESSAGE =
  "No readable text found. Scanned PDFs are not supported yet.";

/**
 * Cut `text` at the last word boundary at or before `limit` so pieces
 * never start or end in the middle of a word. Falls back to the raw
 * cut only when there is no usable space (a single giant token).
 */
function cutAtWordBoundary(text: string, limit: number): number {
  if (limit >= text.length) return text.length;
  const slice = text.slice(0, limit);
  const lastSpace = slice.lastIndexOf(" ");
  // Keep at least ~40% of the window to avoid tiny pieces.
  if (lastSpace > slice.length * 0.4) return lastSpace;
  return limit;
}

/**
 * Overlap tail for the next chunk: the last OVERLAP_CHARS of the
 * current chunk, trimmed so it starts on a word boundary.
 */
function overlapTail(current: string): string {
  if (current.length <= OVERLAP_CHARS) return current;
  let tail = current.slice(-OVERLAP_CHARS);
  const firstSpace = tail.indexOf(" ");
  if (firstSpace >= 0 && firstSpace < tail.length - 1) {
    tail = tail.slice(firstSpace + 1);
  }
  return tail;
}

function chunkText(text: string): string[] {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Split on paragraph boundaries, then on sentence boundaries inside
  // oversized paragraphs, so units never begin or end mid-word.
  const units: string[] = [];
  for (const paragraph of normalized.split(/\n{2,}/)) {
    const p = paragraph.trim();
    if (!p) continue;
    if (p.length <= MAX_CHUNK_CHARS) {
      units.push(p);
      continue;
    }
    // Long paragraph: split on sentence boundaries where possible.
    const sentences =
      p.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [p];
    let buffer = "";
    for (const sentence of sentences) {
      if (buffer && (buffer + sentence).length > MAX_CHUNK_CHARS) {
        units.push(buffer.trim());
        buffer = sentence;
      } else {
        buffer += sentence;
      }
    }
    if (buffer.trim()) units.push(buffer.trim());
  }

  // Pack units into chunks with word-aligned overlap between them.
  const chunks: string[] = [];
  let current = "";
  for (const unit of units) {
    if (!current) {
      current = unit;
      continue;
    }
    if (current.length + unit.length + 1 <= MAX_CHUNK_CHARS) {
      current += "\n" + unit;
    } else {
      chunks.push(current);
      // Start the next chunk with (at most) ~150 chars of the
      // previous one, trimmed to a word boundary and to whatever
      // still fits so chunks stay within ~800-1000 chars.
      let tail = overlapTail(current);
      const maxTail = MAX_CHUNK_CHARS - unit.length - 1;
      if (tail.length > maxTail) {
        tail = tail.slice(0, Math.max(0, maxTail));
        const lastSpace = tail.lastIndexOf(" ");
        if (lastSpace > tail.length * 0.4) tail = tail.slice(0, lastSpace);
      }
      current = tail ? `${tail}\n${unit}` : unit;
    }
  }
  if (current.trim()) chunks.push(current);

  // Hard-split anything that is still oversized, always at a word
  // boundary (only a token longer than the window is cut raw).
  const result: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length <= MAX_CHUNK_CHARS) {
      result.push(chunk);
      continue;
    }
    let pos = 0;
    while (pos < chunk.length) {
      const end = pos + cutAtWordBoundary(chunk.slice(pos), TARGET_CHUNK_CHARS);
      const piece = chunk.slice(pos, end).trim();
      if (piece) result.push(piece);
      if (end <= pos) break; // safety: never loop forever
      pos = end;
    }
  }

  return result.map((c) => c.trim()).filter((c) => c.length > 0);
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  let body: { document_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const documentId = body.document_id;
  if (!documentId) {
    return NextResponse.json(
      { error: "document_id is required." },
      { status: 400 }
    );
  }

  // The document must exist and belong to the current user (RLS also
  // enforces this, but we need the row anyway).
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, file_name, file_path, file_type")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .single();

  if (docError || !doc) {
    return NextResponse.json(
      { error: "Document not found." },
      { status: 404 }
    );
  }

  async function fail(message: string) {
    await supabase
      .from("documents")
      .update({ status: "failed", error_message: message })
      .eq("id", documentId);
  }

  const tooLargeMessage = "This file is too large. Maximum size is 10 MB.";
  const dot = doc.file_name.lastIndexOf(".");
  const extension = dot === -1 ? "" : doc.file_name.slice(dot).toLowerCase();

  // Server-side validation BEFORE downloading or parsing: allowed
  // extension plus the object's size from storage metadata (the UI
  // checks are advisory only and can be bypassed).
  const storedFailure = await verifyStoredFile(supabase, {
    bucket: "documents",
    path: doc.file_path,
    fileName: doc.file_name,
    allowedExtensions: [".pdf", ".docx"],
    maxBytes: DOCUMENT_MAX_BYTES,
    tooLargeMessage,
  });
  if (storedFailure) {
    await fail(storedFailure.message);
    return NextResponse.json(
      { error: storedFailure.message },
      { status: storedFailure.status }
    );
  }

  // Mark as processing and clear any previous error.
  await supabase
    .from("documents")
    .update({ status: "processing", error_message: null })
    .eq("id", documentId);

  // Reprocessing: remove old chunks first.
  await supabase
    .from("document_chunks")
    .delete()
    .eq("document_id", documentId);

  try {
    // Download from the private bucket (RLS restricts this to the
    // user's own folder).
    const { data: file, error: downloadError } = await supabase.storage
      .from("documents")
      .download(doc.file_path);

    if (downloadError || !file) {
      await fail("Could not download the file from storage.");
      return NextResponse.json(
        { error: "Could not download the file from storage." },
        { status: 500 }
      );
    }

    // Re-check size on the blob itself (covers metadata being stale),
    // still before any parsing.
    const sizeFailure = checkDownloadedSize(file.size, {
      maxBytes: DOCUMENT_MAX_BYTES,
      tooLargeMessage,
    });
    if (sizeFailure) {
      await fail(sizeFailure.message);
      return NextResponse.json(
        { error: sizeFailure.message },
        { status: sizeFailure.status }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Content must match the declared type: PDFs carry "%PDF",
    // DOCX files are ZIP containers starting with "PK".
    const magicKind = extension === ".pdf" ? "pdf" : "zip";
    if (!checkMagicBytes(buffer, magicKind)) {
      const message =
        "This file's content does not match its type. Please upload a valid PDF or Word (.docx) file.";
      await fail(message);
      return NextResponse.json({ error: message }, { status: 400 });
    }

    let text = "";
    if (extension === ".pdf" || doc.file_type === "application/pdf") {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text: extracted } = await extractText(pdf, {
        mergePages: true,
      });
      text = extracted;
    } else if (extension === ".docx") {
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      await fail("Unsupported file type.");
      return NextResponse.json(
        { error: "Unsupported file type." },
        { status: 400 }
      );
    }

    text = text.trim();
    if (!text) {
      await fail(NO_TEXT_MESSAGE);
      return NextResponse.json({ error: NO_TEXT_MESSAGE }, { status: 422 });
    }

    const chunks = chunkText(text);
    if (chunks.length === 0) {
      await fail(NO_TEXT_MESSAGE);
      return NextResponse.json({ error: NO_TEXT_MESSAGE }, { status: 422 });
    }

    const rows = chunks.map((content, index) => ({
      document_id: documentId,
      user_id: user.id,
      chunk_index: index,
      content,
    }));

    const { error: insertError } = await supabase
      .from("document_chunks")
      .insert(rows);

    if (insertError) {
      await fail("Could not save the extracted text. Please try again.");
      return NextResponse.json(
        { error: "Could not save the extracted text. Please try again." },
        { status: 500 }
      );
    }

    const { error: readyError } = await supabase
      .from("documents")
      .update({ status: "ready", error_message: null })
      .eq("id", documentId);

    if (readyError) {
      return NextResponse.json(
        { error: "Document processed but status could not be updated." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, chunks: chunks.length });
  } catch (err) {
    const message =
      err instanceof Error && err.message
        ? `Processing failed: ${err.message}`
        : "Processing failed. Please try again.";
    await fail(message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
