import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type RowData = Record<string, string | number | boolean | null | undefined>;

const PRIMARY_RGB: [number, number, number] = [15, 76, 151];
const BO_TIMEZONE = "America/La_Paz";

function boDate() {
  return new Date().toLocaleDateString("es-BO", { timeZone: BO_TIMEZONE });
}

export function exportToExcel(
  data: RowData[],
  filename: string,
  groupBy?: string
): void {
  if (data.length === 0) return;

  const sorted = groupBy
    ? [...data].sort((a, b) => String(a[groupBy] ?? "").localeCompare(String(b[groupBy] ?? "")))
    : data;

  const columns = Object.keys(sorted[0]);

  const flatData = sorted.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col) => {
      obj[col] = row[col] ?? "";
    });
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(flatData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");

  ws["!cols"] = columns.map((col) => {
    const maxLen = flatData.reduce((acc, row) => {
      const val = String(row[col] ?? "");
      return Math.max(acc, val.length);
    }, col.length);
    const width = Math.min(Math.max(maxLen + 3, 12), 40);
    return { wch: width };
  });

  XLSX.writeFile(wb, `${filename}.xlsx`);
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

  const body: (string[] | { content: string; colSpan: number; styles: Record<string, unknown> })[] = [];
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
