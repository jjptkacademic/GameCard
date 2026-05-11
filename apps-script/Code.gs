// Google Apps Script — เกมจับคู่บุคลากร
// Deploy: Extensions > Apps Script > Deploy > New deployment
// Type: Web app | Execute as: Me | Who has access: Anyone

const SHEET_NAME = "Rankings";

function doGet(e) {
  const action = e.parameter.action;

  if (action === "submit") {
    return handleSubmit(e);
  }
  return handleRanking();
}

function handleRanking() {
  const sheet = getSheet();
  const rows  = sheet.getDataRange().getValues();

  const data = rows.slice(1).map(row => ({
    timestamp : row[0] instanceof Date
                  ? Utilities.formatDate(row[0], "Asia/Bangkok", "dd/MM/yyyy HH:mm")
                  : String(row[0]),
    name      : String(row[1] || ""),
    class     : String(row[2] || ""),   // force string — ป้องกัน Sheets แปลงเป็น Date
    score     : Number(row[3]) || 0,
    time      : Number(row[4]) || 0
  }));

  data.sort((a, b) => b.score - a.score || a.time - b.time);

  return jsonResponse({ rows: data.slice(0, 30) });
}

function handleSubmit(e) {
  const p     = e.parameter;
  const sheet = getSheet();

  const lastRow = sheet.getLastRow() + 1;

  sheet.appendRow([
    new Date(),
    p.name  || "",
    p.class || "",
    Number(p.score) || 0,
    Number(p.time)  || 0
  ]);

  // บังคับให้ column Class (C) เป็น plain text ไม่ให้ Sheets แปลงเป็น Date
  sheet.getRange(lastRow, 3).setNumberFormat("@");

  return jsonResponse({ success: true });
}

function getSheet() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["Timestamp", "Name", "Class", "Score", "Time (s)"]);
    sheet.setFrozenRows(1);

    // ตั้ง column Class (C) ทั้งคอลัมน์เป็น plain text
    sheet.getRange(1, 3, sheet.getMaxRows(), 1).setNumberFormat("@");

    const header = sheet.getRange(1, 1, 1, 5);
    header.setBackground("#1a56db").setFontColor("#ffffff").setFontWeight("bold");
    sheet.setColumnWidths(1, 5, [160, 140, 80, 80, 80]);
  }

  return sheet;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
