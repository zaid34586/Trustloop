import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cellToText } from "@/lib/excel";
import {
  QUESTIONNAIRE_MAX_BYTES,
  checkDownloadedSize,
  checkMagicBytes,
  verifyStoredFile,
} from "@/lib/upload-checks";

const MAX_QUESTIONS = 200;
const MAX_QUESTION_CHARS = 1000;

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  let body: {
    questionnaire_id?: string;
    sheet_name?: string;
    question_col?: number;
    header_rows?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { questionnaire_id, sheet_name, question_col, header_rows } = body;
  if (
    !questionnaire_id ||
    !sheet_name ||
    typeof question_col !== "number" ||
    question_col < 0 ||
    typeof header_rows !== "number" ||
    header_rows < 0 ||
    header_rows > 50
  ) {
    return NextResponse.json(
      { error: "Missing or invalid settings. Please pick a sheet and column." },
      { status: 400 }
    );
  }

  const { data: questionnaire, error: qError } = await supabase
    .from("questionnaires")
    .select("id, file_name, file_path, status")
    .eq("id", questionnaire_id)
    .eq("user_id", user.id)
    .single();

  if (qError || !questionnaire) {
    return NextResponse.json(
      { error: "Questionnaire not found." },
      { status: 404 }
    );
  }

  const tooLargeMessage = "This file is too large. Maximum size is 5 MB.";

  // Server-side validation BEFORE downloading or parsing: .xlsx only
  // and the object's size from storage metadata (UI checks are
  // advisory only and can be bypassed).
  const storedFailure = await verifyStoredFile(supabase, {
    bucket: "questionnaires",
    path: questionnaire.file_path,
    fileName: questionnaire.file_name,
    allowedExtensions: [".xlsx"],
    maxBytes: QUESTIONNAIRE_MAX_BYTES,
    tooLargeMessage,
  });
  if (storedFailure) {
    return NextResponse.json(
      { error: storedFailure.message },
      { status: storedFailure.status }
    );
  }

  const { data: file, error: downloadError } = await supabase.storage
    .from("questionnaires")
    .download(questionnaire.file_path);

  if (downloadError || !file) {
    return NextResponse.json(
      { error: "Could not read the questionnaire file." },
      { status: 500 }
    );
  }

  // Re-check size on the blob itself, still before any parsing.
  const sizeFailure = checkDownloadedSize(file.size, {
    maxBytes: QUESTIONNAIRE_MAX_BYTES,
    tooLargeMessage,
  });
  if (sizeFailure) {
    return NextResponse.json(
      { error: sizeFailure.message },
      { status: sizeFailure.status }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // .xlsx files are ZIP containers starting with "PK" — a renamed
  // file of any other type is rejected before it reaches the parser.
  if (!checkMagicBytes(new Uint8Array(buffer), "zip")) {
    return NextResponse.json(
      {
        error:
          "This file's content does not match its type. Please upload a valid Excel (.xlsx) file.",
      },
      { status: 400 }
    );
  }

  try {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const sheet = workbook.getWorksheet(sheet_name);
    if (!sheet) {
      return NextResponse.json(
        { error: "Could not find that sheet in the file." },
        { status: 404 }
      );
    }

    const rows: { row_number: number; question_text: string }[] = [];
    let totalFound = 0;

    for (let rowNumber = header_rows + 1; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      let text = cellToText(row.getCell(question_col + 1).value).trim();
      if (!text) continue;

      totalFound += 1;
      if (rows.length >= MAX_QUESTIONS) continue; // keep counting, don't import

      if (text.length > MAX_QUESTION_CHARS) {
        text = text.slice(0, MAX_QUESTION_CHARS);
      }
      rows.push({
        row_number: rowNumber,
        question_text: text,
      });
    }

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "No questions found in that column. Check the column choice and header rows, then try again.",
        },
        { status: 422 }
      );
    }

    // ------------------------------------------------------------
    // One SECURITY INVOKER database function (see
    // supabase/confirm_questionnaire.sql) does the whole write in a
    // single transaction: verify ownership, delete the old questions,
    // insert the new ones, and update the questionnaire status/count.
    // Any failure rolls everything back, so a retry re-runs the
    // replace safely and old questions are never half-deleted.
    // ------------------------------------------------------------
    const { data: savedCount, error: rpcError } = await supabase.rpc(
      "confirm_questionnaire",
      {
        p_questionnaire_id: questionnaire_id,
        p_sheet_name: sheet_name,
        p_question_col: question_col,
        p_header_rows: header_rows,
        p_questions: rows,
      }
    );

    if (rpcError) {
      const detail = rpcError.message || "";
      if (detail.includes("questionnaire not found")) {
        return NextResponse.json(
          { error: "Questionnaire not found." },
          { status: 404 }
        );
      }
      if (detail.includes("too many questions")) {
        return NextResponse.json(
          {
            error: "This questionnaire has too many questions (max 200).",
          },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { error: "Could not save the questions. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      total: typeof savedCount === "number" ? savedCount : rows.length,
      truncated: totalFound > MAX_QUESTIONS,
      message:
        totalFound > MAX_QUESTIONS
          ? `The file has more than ${MAX_QUESTIONS} questions — only the first ${MAX_QUESTIONS} were imported.`
          : null,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not parse this Excel file. Is it a valid .xlsx file?" },
      { status: 422 }
    );
  }
}
