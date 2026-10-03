import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_CHUNK_CHARS = 1000;
const TARGET_CHUNK_CHARS = 900;
const OVERLAP_CHARS = 150;
const NO_TEXT_MESSAGE =
  "No readable text found. Scanned PDFs are not supported yet.";

function chunkText(text: string): string[] {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

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

  // Pack units into chunks with overlap between consecutive chunks.
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
      const tail = current.slice(-OVERLAP_CHARS);
      current = tail + "\n" + unit;
    }
  }
  if (current.trim()) chunks.push(current);

  // Hard-split anything that is still oversized.
  const result: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length <= MAX_CHUNK_CHARS) {
      result.push(chunk);
      continue;
    }
    for (let i = 0; i < chunk.length; i += TARGET_CHUNK_CHARS) {
      result.push(chunk.slice(i, i + TARGET_CHUNK_CHARS));
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

    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = doc.file_name
      .slice(doc.file_name.lastIndexOf("."))
      .toLowerCase();

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
