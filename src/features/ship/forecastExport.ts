// 원료돈 예상물량 내보내기 — ① 원료돈 엑셀(비육3팀 출하계획 양식) ② 농장별 출하물량 예상(농장 블록 양식)
import type { FcRow, FcSeg } from '@/lib/calc/forecast';
import planUrl from '@/assets/templates/plan-template.xlsx?url';
import { todayKST } from '@/lib/util';

const yymmdd = () => todayKST().replace(/-/g, '').slice(2);
const toDate = (d: string) => new Date(d + 'T00:00:00Z');
async function save(wb: { xlsx: { writeBuffer: () => Promise<ArrayBuffer> } }, name: string) {
  const buf = await wb.xlsx.writeBuffer();
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); a.download = name + '.xlsx';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const segLabel = (s: FcSeg) => `${s.k}주(${s.days}일)`;

// ① 비육3팀 출하계획 양식 그대로 — 계획시작월부터 3개월, 내 담당농장 행만 채움 (신동영 행은 빈칸)
export async function exportPlan(segs: (FcSeg | null)[], table: Record<string, number[]>, myFarms: string[]) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await (await fetch(planUrl)).arrayBuffer());
  const ws = wb.worksheets[0];
  const first = segs.slice(0, 15);
  const mo = [0, 5, 10].map((a) => first.slice(a, a + 5).find(Boolean)!);
  const y = (s: FcSeg) => s.y ?? 2026;
  ws.name = `${mo[0].month}~${mo[2].month}월`;
  ws.getCell('B1').value = `비육계열3팀 ${mo[0].month}~${mo[2].month}월 출하계획`;
  ws.getCell('B3').value = `${mo[0].month}~${mo[2].month}월 계획`;
  const COLS = [4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20];
  [4, 10, 16].forEach((c, i) => (ws.getCell(4, c).value = `${mo[i].month}월`));
  COLS.forEach((c, i) => {
    const s = first[i];
    ws.getCell(5, c).value = s ? segLabel(s) : '-';
    const d = ws.getCell(6, c); d.value = s ? toDate(s.start) : '-'; if (s) d.numFmt = 'mm"월" dd"일"';
  });
  for (let r = 7; r <= 27; r++) {
    if (r === 14) continue;
    const farm = String(ws.getCell(r, 3).value ?? '');
    COLS.forEach((c, i) => { ws.getCell(r, c).value = myFarms.includes(farm) && first[i] ? (table[farm]?.[i] ?? 0) : null; });
  }
  wb.calcProperties = { ...(wb.calcProperties ?? {}), fullCalcOnLoad: true };
  const ys = (n: number) => String(n).slice(2);
  await save(wb, `비육3팀 ${ys(y(mo[0]))}년 ${mo[0].month}월-${ys(y(mo[2]))}년 ${mo[2].month}월 출하계획(${yymmdd()})`);
}

// ② 농장별 출하물량 예상 — 농장마다 [주차 | 그룹들 | 합계 | 월합계] 블록, 위 4줄 = 전입일·출하예정일·전입체중·예상두수
export async function exportFarm(rows: FcRow[], segs: (FcSeg | null)[], myFarms: string[]) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const S = segs.map((s, i) => ({ s, i })).filter((x) => x.s) as { s: FcSeg; i: number }[];
  const first = S[0].s;
  const ws = wb.addWorksheet(`${first.month}월`, { views: [{ state: 'frozen', ySplit: 6, xSplit: 0 }] });
  const font = (b = false, color?: string, size = 11) => ({ name: '맑은 고딕', size, bold: b, ...(color ? { color: { argb: color } } : {}) });
  const thin = { style: 'thin' as const, color: { argb: 'FFBFBFBF' } };
  const box = { top: thin, left: thin, bottom: thin, right: thin };
  const HEAD = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFDDEBF7' } };
  const SUB = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF2F2F2' } };
  const NUM = '_-* #,##0_-;\\-* #,##0_-;_-* "-"_-;_-@_-';
  ws.getColumn(1).width = 4;
  const R0 = 7, RL = R0 + S.length - 1, RT = RL + 1;
  const monthEnd = new Set(S.filter((x, j) => j === S.length - 1 || S[j + 1].s.month !== x.s.month).map((x) => x.i));
  let col = 2;
  myFarms.forEach((farm) => {
    const gs = rows.filter((r) => r.farm === farm).sort((a, b) => (a.indate < b.indate ? -1 : 1));
    if (!gs.length) return;
    const c0 = col, cS = col + gs.length + 1, cM = cS + 1;
    ws.mergeCells(2, c0, 2, cM);
    const h = ws.getCell(2, c0); h.value = farm; h.font = font(true, undefined, 12); h.alignment = { horizontal: 'center' }; h.fill = HEAD; h.border = box;
    const lab = ['전입일', '출하예정일', '전입체중', '주차/두수'];
    lab.forEach((l, k) => { const c = ws.getCell(3 + k, c0); c.value = l; c.font = font(true); c.fill = SUB; c.border = box; c.alignment = { horizontal: 'center' }; });
    gs.forEach((g, j) => {
      const c = c0 + 1 + j;
      const v: [unknown, string][] = [[toDate(g.indate), 'yy"-"m"-"d'], [toDate(g.t1), 'yy"-"m"-"d'], [Math.round(g.w0 * 10) / 10, '0.0'], [Math.round(g.total), '#,##0']];
      v.forEach(([val, fmt], k) => { const x = ws.getCell(3 + k, c); x.value = val as never; x.numFmt = fmt; x.font = font(true); x.fill = SUB; x.border = box; x.alignment = { horizontal: 'center' }; });
      const note = ws.getCell(3, c); note.note = `${g.group}\n현재고 ${g.stock}두${g.shipped ? ` · 출하누계 ${g.shipped}두` : ''}\n${g.status}`;
      ws.getColumn(c).width = 10.5;
    });
    [cS, cM].forEach((c) => { for (let k = 0; k < 4; k++) { const x = ws.getCell(3 + k, c); x.fill = SUB; x.border = box; } });
    const sL = ws.getColumn(c0 + 1).letter, eL = ws.getColumn(c0 + gs.length).letter;
    ws.getCell(6, cS).value = { formula: `SUM(${sL}6:${eL}6)` }; ws.getCell(6, cS).numFmt = '#,##0'; ws.getCell(6, cS).font = font(true);
    let mStart = R0;
    S.forEach(({ s, i }, j) => {
      const r = R0 + j;
      const l = ws.getCell(r, c0); l.value = `${s.month}월${s.k}주${s.days < 5 ? `(${s.days}일)` : ''}`; l.font = font(); l.border = box;
      gs.forEach((g, k) => { const x = ws.getCell(r, c0 + 1 + k); const v = Math.round(g.heads[i] / 10) * 10; x.value = v || null; x.font = font(); x.border = box; x.numFmt = NUM; });
      const sum = ws.getCell(r, cS); sum.value = { formula: `SUM(${sL}${r}:${eL}${r})` }; sum.font = font(true, 'FFFF0000'); sum.numFmt = NUM; sum.border = box; sum.alignment = { horizontal: 'center' };
      if (monthEnd.has(i)) { const m = ws.getCell(r, cM); const L = ws.getColumn(cS).letter; m.value = { formula: `SUM(${L}${mStart}:${L}${r})` }; m.numFmt = NUM; m.font = font(true); mStart = r + 1; }
    });
    for (let c = c0 + 1; c <= cS; c++) { const L = ws.getColumn(c).letter; const x = ws.getCell(RT, c); x.value = { formula: `SUM(${L}${R0}:${L}${RL})` }; x.font = font(true, 'FF0000CC'); x.numFmt = NUM; x.border = box; }
    ws.getCell(RT, c0).value = '합계'; ws.getCell(RT, c0).font = font(true); ws.getCell(RT, c0).border = box;
    ws.getColumn(c0).width = 13; ws.getColumn(cS).width = 9; ws.getColumn(cM).width = 9;
    col = cM + 1;
  });
  ws.getRow(2).height = 21.6;
  ws.getCell(RT + 2, 2).value = '숫자 = 주차별 예상 출하두수(10두 단위). 출하예정일 = 첫출하 예정(출하 중이면 실제 첫출하일). 주차/두수 = 예상 추가폐사 반영 출하 예정 두수. 전입일 칸 메모에 그룹명.';
  ws.getCell(RT + 2, 2).font = font(false, 'FF595959', 10);
  wb.calcProperties = { fullCalcOnLoad: true };
  await save(wb, `농장별 출하물량 예상(${yymmdd()})`);
}
