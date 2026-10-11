// 엑셀 내려받기 공통 — 시트 여러 개, 머리줄 굵게·고정
import { todayKST } from './util';
export interface Sheet { name: string; head: string[]; rows: (string | number | null)[][]; widths?: number[] }
export async function downloadXlsx(fileBase: string, sheets: Sheet[]) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  sheets.forEach((sh) => {
    const ws = wb.addWorksheet(sh.name, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.addRow(sh.head); sh.rows.forEach((r) => ws.addRow(r));
    ws.getRow(1).font = { bold: true }; ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6EFE9' } };
    ws.columns.forEach((c, i) => { c.width = sh.widths?.[i] ?? Math.max(8, Math.min(28, (sh.head[i] ?? '').length * 2 + 4)); });
  });
  const buf = await wb.xlsx.writeBuffer();
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf])); a.download = `${fileBase}_${todayKST()}.xlsx`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
