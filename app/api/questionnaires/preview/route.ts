import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readSheetPreview } from "@/lib/excel";

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
    .select("id, file_path, status")
    .eq("id", body.questionnaire_id)
    .eq("user_id", user.id)
    .single();

  if (qError || !questionnaire) {
    return NextResponse.json(
      { error: "Questionnaire not found." },
      { status: 404 }
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

  try {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());

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
