import type ExcelJS from "exceljs";

// Convert an ExcelJS cell value into a plain string (handles rich text,
// formulas and hyperlinks).
export function cellToText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "object") {
    const obj = value as unknown as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.result === "string") return obj.result;
    if (Array.isArray(obj.richText)) {
      return (obj.richText as Array<{ text?: string }>)
        .map((part) => part.text ?? "")
        .join("");
    }
    if (obj.hyperlink && typeof obj.hyperlink === "string") {
      return typeof obj.text === "string" ? obj.text : obj.hyperlink;
    }
    return "";
  }
  return String(value);
}

// Read a worksheet and return the first `maxRows` non-empty rows as string
// arrays, trimmed to the last used column, plus the column index with the
// longest average text length as a question-column guess.
export function readSheetPreview(
  sheet: ExcelJS.Worksheet,
  maxRows: number
): { rows: string[][]; guessCol: number } {
  const scanRows = Math.min(sheet.rowCount, 100);
  let maxCol = 0;
  const rawRows: string[][] = [];

  for (let r = 1; r <= scanRows; r++) {
    const row = sheet.getRow(r);
    const texts: string[] = [];
    for (let c = 1; c <= sheet.columnCount; c++) {
      const text = cellToText(row.getCell(c).value).trim();
      texts.push(text);
    }
    // Trim trailing empty cells.
    let lastUsed = -1;
    texts.forEach((t, i) => {
      if (t) lastUsed = i;
    });
    if (lastUsed === -1) continue; // skip fully empty rows
    maxCol = Math.max(maxCol, lastUsed + 1);
    rawRows.push(texts.slice(0, lastUsed + 1));
    if (rawRows.length >= scanRows) break;
  }

  // Guess: column with the longest average non-empty text length.
  let guessCol = 0;
  let bestAvg = -1;
  for (let c = 0; c < maxCol; c++) {
    let total = 0;
    let count = 0;
    for (const row of rawRows) {
      const text = row[c] ?? "";
      if (text) {
        total += text.length;
        count += 1;
      }
    }
    const avg = count > 0 ? total / count : -1;
    if (avg > bestAvg) {
      bestAvg = avg;
      guessCol = c;
    }
  }

  const rows = rawRows.slice(0, maxRows);
  return { rows, guessCol };
}
