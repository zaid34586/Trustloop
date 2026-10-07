import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ------------------------------------------------------------
// Content-Disposition helpers. questionnaire.file_name is the
// original client-supplied upload name, so it must be sanitised
// before going into a response header.
// ------------------------------------------------------------

/** Drop directory parts, then quotes, separators, control and
 *  non-printable characters. `asciiOnly` also drops non-ASCII. */
function stripUnsafe(value: string, asciiOnly: boolean): string {
  // No directory components, whichever separator was used.
  const base = value
    .substring(value.lastIndexOf("/") + 1)
    .substring(value.lastIndexOf("\\") + 1);
  let out = "";
  for (let i = 0; i < base.length; i++) {
    const code = base.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) continue; // control chars / DEL
    if (code > 0x7e && asciiOnly) continue;
    const ch = base.charAt(i);
    if (ch === '"' || ch === "'" || ch === "\\" || ch === "/" || ch === ";") {
      continue;
    }
    out += ch;
  }
  return out.trim();
}

/** Cap the length while keeping the file extension. */
function capLength(name: string): string {
  const MAX = 100;
  if (name.length <= MAX) return name;
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 && name.length - dot <= 12 ? name.slice(dot) : "";
  return name.slice(0, MAX - ext.length) + ext;
}

/** RFC 5987 percent-encoding (UTF-8, plus the chars encodeURIComponent
 *  leaves bare but attr-char does not allow). */
function encodeRfc5987(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*]/g,
    (ch) => "%" + ch.charCodeAt(0).toString(16).toUpperCase()
  );
}

/**
 * attachment header with an ASCII-safe quoted filename (fallback for
 * old clients) and the RFC 5987 filename* form for non-ASCII names.
 */
function buildContentDisposition(rawName: string): string {
  const fallback = "export.xlsx";
  const ascii = capLength(stripUnsafe(rawName, true)) || fallback;
  const utf8 = capLength(stripUnsafe(rawName, false)) || fallback;
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeRfc5987(utf8)}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const { data: questionnaire, error: qError } = await supabase
    .from("questionnaires")
    .select("file_name, file_path, sheet_name, header_rows, question_col")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (qError || !questionnaire) {
    return NextResponse.json(
      { error: "Questionnaire not found." },
      { status: 404 }
    );
  }

  let includeDrafts = false;
  try {
    const body = await request.json();
    includeDrafts = body?.include_drafts === true;
  } catch {
    // No body — default to approved only.
  }

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("row_number, answer_text, status")
    .eq("questionnaire_id", id)
    .eq("user_id", user.id);

  if (questionsError) {
    return NextResponse.json(
      { error: "Could not load the questions." },
      { status: 500 }
    );
  }

  // Approved answers always export. Drafted ones only when the user
  // ticked "Include drafts". Not found / failed / pending are skipped
  // entirely — their Excel cells stay empty.
  const included = (questions ?? []).filter((q) => {
    if (!q.answer_text) return false;
    if (q.status === "approved") return true;
    if (includeDrafts && q.status === "drafted") return true;
    return false;
  });

  if (included.length === 0) {
    return NextResponse.json(
      {
        error: includeDrafts
          ? "There are no approved or drafted answers to export yet."
          : "Approve some answers first, or tick Include drafts.",
      },
      { status: 422 }
    );
  }

  // Download the ORIGINAL file from the private bucket.
  const { data: file, error: downloadError } = await supabase.storage
    .from("questionnaires")
    .download(questionnaire.file_path);

  if (downloadError || !file) {
    return NextResponse.json(
      { error: "Could not read the original questionnaire file." },
      { status: 500 }
    );
  }

  try {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());

    const sheet = questionnaire.sheet_name
      ? workbook.getWorksheet(questionnaire.sheet_name)
      : workbook.worksheets[0];
    if (!sheet) {
      return NextResponse.json(
        { error: "Could not find the original sheet in the file." },
        { status: 500 }
      );
    }

    // Last used column across all rows.
    let lastCol = 0;
    sheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        if (cell.value !== null && cell.value !== undefined && colNumber > lastCol) {
          lastCol = colNumber;
        }
      });
    });
    const newCol = lastCol + 1;

    // Header: copy the style of the question column header cell.
    const headerRowNumber = Math.max(1, questionnaire.header_rows ?? 1);
    const headerRow = sheet.getRow(headerRowNumber);
    const questionCol = (questionnaire.question_col ?? 0) + 1;
    const headerCell = headerRow.getCell(questionCol);
    const newHeaderCell = headerRow.getCell(newCol);
    newHeaderCell.value = "Trustloop Answer";
    newHeaderCell.style = JSON.parse(JSON.stringify(headerCell.style ?? {}));

    // Write answers into their original rows.
    for (const q of included) {
      let text: string = q.answer_text;
      if (q.status !== "approved") {
        text = `DRAFT: ${text}`;
      }
      // Prevent Excel formula injection.
      if (/^[=+\-@]/.test(text)) {
        text = `'${text}`;
      }
      const row = sheet.getRow(q.row_number);
      const cell = row.getCell(newCol);
      cell.value = text;
      cell.alignment = { ...cell.alignment, wrapText: true, vertical: "top" };
    }
    sheet.getColumn(newCol).width = 60;

    const outBuffer = Buffer.from(
      (await workbook.xlsx.writeBuffer()) as ArrayBuffer
    );

    const outputName = /\.xlsx$/i.test(questionnaire.file_name)
      ? questionnaire.file_name.replace(/\.xlsx$/i, "-trustloop.xlsx")
      : `${questionnaire.file_name}-trustloop.xlsx`;

    return new NextResponse(new Uint8Array(outBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": buildContentDisposition(outputName),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not build the Excel export. Please try again." },
      { status: 500 }
    );
  }
}
