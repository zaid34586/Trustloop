import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readSheetPreview } from "@/lib/excel";
import {
  QUESTIONNAIRE_MAX_BYTES,
  checkDownloadedSize,
  checkMagicBytes,
  verifyStoredFile,
} from "@/lib/upload-checks";

const PREVIEW_ROW_COUNT = 8;

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  let body: { questionnaire_id?: string; sheet_name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.questionnaire_id) {
    return NextResponse.json(
      { error: "questionnaire_id is required." },
      { status: 400 }
    );
  }

  const { data: questionnaire, error: qError } = await supabase
    .from("questionnaires")
    .select("id, file_name, file_path, status")
    .eq("id", body.questionnaire_id)
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

    const sheetNames = workbook.worksheets.map((ws) => ws.name);
    const sheet = body.sheet_name
      ? workbook.getWorksheet(body.sheet_name)
      : workbook.worksheets[0];

    if (!sheet) {
      return NextResponse.json(
        { error: "Could not find that sheet in the file." },
        { status: 404 }
      );
    }

    const { rows, guessCol } = readSheetPreview(sheet, PREVIEW_ROW_COUNT);

    return NextResponse.json({
      sheets: sheetNames,
      sheet_name: sheet.name,
      preview_rows: rows,
      guess_col: guessCol,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not parse this Excel file. Is it a valid .xlsx file?" },
      { status: 422 }
    );
  }
}
