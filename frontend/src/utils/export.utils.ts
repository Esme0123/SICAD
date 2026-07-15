import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type RowData = Record<string, string | number | boolean | null | undefined>;

const PRIMARY_RGB: [number, number, number] = [15, 76, 151];
const PRIMARY_LIGHT = "0F4C97";
const BO_TIMEZONE = "America/La_Paz";

function boDate() {
  return new Date().toLocaleDateString("es-BO", { timeZone: BO_TIMEZONE });
}

export async function exportToExcel(
  data: RowData[],
  filename: string,
  groupBy?: string
): Promise<void> {
  if (data.length === 0) return;

  const columns = Object.keys(data[0]);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Datos");

  const headerRow = sheet.addRow(columns);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PRIMARY_LIGHT } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "CCCCCC" } },
      bottom: { style: "thin", color: { argb: "CCCCCC" } },
      left: { style: "thin", color: { argb: "CCCCCC" } },
      right: { style: "thin", color: { argb: "CCCCCC" } },
    };
  });

  const sorted = groupBy
    ? [...data].sort((a, b) => String(a[groupBy] ?? "").localeCompare(String(b[groupBy] ?? "")))
    : data;

  let mergeStart: number | null = null;
  let prevGroupValue: string | null = null;

  sorted.forEach((row, idx) => {
    const values = columns.map((col) => row[col] ?? "");
    const rowRef = sheet.addRow(values);
    rowRef.eachCell((cell, colIdx) => {
      cell.alignment = { vertical: "middle", horizontal: colIdx === 0 ? "left" : "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "EEEEEE" } },
        bottom: { style: "thin", color: { argb: "EEEEEE" } },
        left: { style: "thin", color: { argb: "EEEEEE" } },
        right: { style: "thin", color: { argb: "EEEEEE" } },
      };
    });

    const excelRow = idx + 2; // +1 for header, +1 for 1-indexed
    if (groupBy) {
      const currentVal = String(row[groupBy] ?? "");
      if (currentVal !== prevGroupValue) {
        if (mergeStart !== null && excelRow - 1 > mergeStart) {
          sheet.mergeCells(mergeStart, 1, excelRow - 1, 1);
        }
        mergeStart = excelRow;
        prevGroupValue = currentVal;
      }
    }
  });

  if (groupBy && mergeStart !== null && sorted.length + 1 > mergeStart) {
    sheet.mergeCells(mergeStart, 1, sorted.length + 1, 1);
  }

  columns.forEach((_, i) => {
    const maxLen = sorted.reduce((acc, row) => {
      const val = String(row[columns[i]] ?? "");
      return Math.max(acc, val.length);
    }, columns[i].length);
    sheet.getColumn(i + 1).width = Math.min(Math.max(maxLen + 3, 12), 40);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToPDF(
  data: string[][],
  columns: string[],
  filename: string,
  title: string,
  groupBy?: number
): void {
  if (data.length === 0) return;

  const sorted = groupBy !== undefined
    ? [...data].sort((a, b) => (a[groupBy] ?? "").localeCompare(b[groupBy] ?? ""))
    : data;

  const doc = new jsPDF(sorted.length > 15 ? "landscape" : "portrait");
  doc.setFontSize(16);
  doc.setTextColor(PRIMARY_RGB[0], PRIMARY_RGB[1], PRIMARY_RGB[2]);
  doc.text(title, 14, 20);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generado: ${boDate()}`, 14, 27);

  const body: (string[] | { content: string; colSpan: number; styles: any })[] = [];
  let prevGroup: string | null = null;

  sorted.forEach((row) => {
    if (groupBy !== undefined) {
      const currentGroup = row[groupBy] ?? "";
      if (currentGroup !== prevGroup) {
        body.push({
          content: currentGroup,
          colSpan: columns.length,
          styles: {
            fillColor: [230, 240, 255],
            textColor: PRIMARY_RGB,
            fontStyle: "bold",
            fontSize: 8,
            halign: "left",
          },
        });
        prevGroup = currentGroup;
      }
      body.push(row);
    } else {
      body.push(row);
    }
  });

  autoTable(doc, {
    startY: 32,
    head: [columns],
    body: body as any,
    styles: { fontSize: 7 },
    headStyles: {
      fillColor: PRIMARY_RGB,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { top: 38 },
  });

  doc.save(`${filename}.pdf`);
}
