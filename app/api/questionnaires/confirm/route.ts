import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cellToText } from "@/lib/excel";

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
    .select("id, file_path, status")
    .eq("id", questionnaire_id)
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

    const sheet = workbook.getWorksheet(sheet_name);
    if (!sheet) {
      return NextResponse.json(
        { error: "Could not find that sheet in the file." },
        { status: 404 }
      );
    }

    const rows: {
      questionnaire_id: string;
      user_id: string;
      row_number: number;
      question_text: string;
      status: "pending";
      answer_text: null;
      confidence: null;
      sources: { file_name: string; excerpt: string }[];
      edited_by_user: boolean;
      approved_at: null;
    }[] = [];
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
        questionnaire_id,
        user_id: user.id,
        row_number: rowNumber,
        question_text: text,
        status: "pending",
        answer_text: null,
        confidence: null,
        // Written explicitly so rows never depend on a column default.
        sources: [],
        edited_by_user: false,
        approved_at: null,
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
    // Idempotent write: re-running this endpoint REPLACES the old
    // questions instead of failing or duplicating them.
    //   1. delete any existing questions for this questionnaire
    //   2. insert the freshly extracted rows
    //   3. one UPDATE sets status + question count together
    // On a failed insert we restore an empty, consistent state so a
    // retry starts clean; a failed UPDATE leaves the rows in place
    // and a retry re-runs the whole replace safely.
    // ------------------------------------------------------------
    const { error: deleteError } = await supabase
      .from("questions")
      .delete()
      .eq("questionnaire_id", questionnaire_id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Could not replace the existing questions. Please try again." },
        { status: 500 }
      );
    }

    const { error: insertError } = await supabase
      .from("questions")
      .insert(rows);

    if (insertError) {
      // Keep the questionnaire consistent with "no questions yet".
      await supabase
        .from("questionnaires")
        .update({
          status: "uploaded",
          total_questions: 0,
          error_message: "Could not save the extracted questions.",
        })
        .eq("id", questionnaire_id);
      return NextResponse.json(
        { error: "Could not save the questions. Please try again." },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabase
      .from("questionnaires")
      .update({
        sheet_name,
        question_col,
        header_rows,
        status: "parsed",
        total_questions: rows.length,
        error_message: null,
      })
      .eq("id", questionnaire_id);

    if (updateError) {
      return NextResponse.json(
        {
          error:
            "Questions were extracted but the questionnaire status could not be updated. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      total: rows.length,
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
