// 출하실적종합(新) 올리기 → 그룹별 정산실적. 줄마다 그룹을 고칠 수 있다(자동 배정은 피그온 출하 → 선입선출 순).
import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { useHerd } from '@/lib/ui';
import { useSettle } from '@/lib/useSettle';
import { makeResolver } from '@/lib/names';
import { mergeTotal, packTotal, parseTotalSheet, totAgg, type TotRow } from '@/lib/shipTotal';
import { shortDest } from '@/lib/calc/ship';
import { fmt, md } from '@/lib/calc/dates';
import { TODAY } from '@/lib/calc/herd';
import { Sheet } from '@/components/Sheet';
import { useIsPhone } from '@/lib/useIsPhone';
import { nowIso } from '@/lib/util';

const won = (n: number) => (n >= 1e8 ? (n / 1e8).toFixed(2) + '억' : n >= 1e4 ? fmt(Math.round(n / 1e4)) + '만' : fmt(n));
const HOW: Record<string, string> = { manual: '직접', pigon: '피그온', auto: '자동', '': '' };

export function ShipTotalCard() {
  const { repo } = useAuth();
  const { data, up } = useData();
  const { all, saved, save, farms } = useHerd();
  const { tot, asg, rowsOf } = useSettle();
  const phone = useIsPhone();
  const ref = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null); // 그룹 who 또는 '미배정'
  const doc = up.total.doc;

  const load = async (file: File) => {
    setBusy(true); setMsg(null);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const rf = makeResolver(farms, data?.nameMap);
      const per = wb.SheetNames.map((n) => parseTotalSheet(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: true }) as unknown[][], rf, n));
      const L = mergeTotal(per);
      if (!L.length) throw new Error("담당농장 출하를 찾지 못했습니다 — '날짜·팀·담당자·농가명·출하처·출하두수' 머리줄이 있는 출하실적종합(新) 파일인지 확인하세요");
      await repo!.put('config', 'shipTotal', { file: file.name, at: nowIso(), rows: packTotal(L) });
      setMsg({ ok: true, t: `${L.length}건 (${L[0].date} ~ ${L[L.length - 1].date}) 반영 — 이 기간 출하성적·정산실적은 이 파일 값을 씁니다` });
    } catch (e) { setMsg({ ok: false, t: (e as Error).message }); } finally { setBusy(false); }
  };

  // 지금 있는 그룹 중 배정된 출하가 있는 그룹
  const gs = useMemo(() => all.map((g) => ({ g, L: rowsOf(g) })).filter((x) => x.L.length), [all, rowsOf]);
  // 못 정한 출하: 그 날 140일령이 넘은 지금 그룹이 있는데도 배정되지 않은 줄만 (옛 그룹 출하는 빼고)
  const ageOn = (g: { age: number }, d: string) => g.age - (Date.parse(TODAY) - Date.parse(d)) / 864e5;
  const unassigned = tot.filter((r) => !asg[r.key]?.group && saved.shipGroup?.[r.key] !== '-' && all.some((g) => g.farm === r.farm && r.date > g.date && ageOn(g, r.date) >= 140));
  const setGroup = (r: TotRow, g: string) => save({ shipGroup: { ...(saved.shipGroup ?? {}), [r.key]: g } });
  const resetGroup = (r: TotRow) => { const m = { ...(saved.shipGroup ?? {}) }; delete m[r.key]; save({ shipGroup: m }); };
  const cur = open === '미배정' ? unassigned : gs.find((x) => x.g.who === open)?.L ?? [];

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <h2 className="h2" style={{ flex: 1 }}>출하실적종합 → 그룹별 정산실적</h2>
        <input ref={ref} type="file" accept=".xlsx,.xls" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) load(f); e.target.value = ''; }} />
        <button className="btn pri sm" disabled={busy} onClick={() => ref.current?.click()}>{busy ? '읽는 중…' : '출하실적종합 올리기'}</button>
      </div>
      <div className="muted small" style={{ marginTop: 4 }}>
        {doc ? `${doc.file} · ${tot.length}건 · ${tot[0]?.date ?? ''} ~ ${tot[tot.length - 1]?.date ?? ''} · ${md(new Date(Date.parse(doc.at) + 9 * 3600e3).toISOString().slice(0, 10))} 올림` : '월별 시트(202511·202512·1~12) 담당농장 출하를 모읍니다. 그룹은 피그온 출하 자료 → 먼저 들어온 그룹 순으로 자동 배정, 줄마다 고칠 수 있습니다.'}
      </div>
      {msg && <div className={msg.ok ? 'chip ok' : 'chip bad'} style={{ marginTop: 8, whiteSpace: 'normal' }}>{msg.t}</div>}
      {gs.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {!phone && <div className="gr gh small muted" style={{ gridTemplateColumns: 'minmax(110px,1.2fr) 46px 60px 60px 60px 60px 60px 90px 64px' }}><div>농장 · 그룹</div><div className="r">회</div><div className="r">두수</div><div className="r">평체</div><div className="r">지육율</div><div className="r">지급율</div><div className="r">1+·1</div><div className="r">정산금액</div><div className="r">지육단가</div></div>}
          {gs.map(({ g, L }) => { const a = totAgg(L), man = L.some((r) => asg[r.key]?.how === 'manual'); return phone ? (
            <button key={g.who} onClick={() => setOpen(g.who)} style={{ width: '100%', display: 'flex', gap: 10, alignItems: 'center', padding: '10px 4px', background: 'transparent', border: 0, borderBottom: '1px solid #EFEBE3', font: 'inherit', textAlign: 'left', color: 'inherit', cursor: 'pointer' }}>
              <div style={{ flex: 1, minWidth: 0 }}><b>{g.farm}</b> {g.group}{man && <span className="muted small"> · 직접 고침</span>}<div className="muted" style={{ fontSize: 12 }}>{a.trucks}회 · 평체 {a.avgw}kg · 지육 {a.yld}% · 지급 {a.pay}% · 1+·1 {a.g11}%</div></div>
              <div style={{ textAlign: 'right' }}><b>{fmt(a.n)}두</b><div className="muted" style={{ fontSize: 12 }}>{won(a.amount)}원</div></div>
            </button>
          ) : (
            <button key={g.who} className="gr" onClick={() => setOpen(g.who)} style={{ gridTemplateColumns: 'minmax(110px,1.2fr) 46px 60px 60px 60px 60px 60px 90px 64px', width: '100%', background: 'transparent', border: 0, borderBottom: '1px solid #EFEBE3', font: 'inherit', textAlign: 'left', color: 'inherit', cursor: 'pointer' }}>
              <div><b>{g.farm}</b> {g.group}{man && <span className="muted small"> · 직접</span>}</div><div className="r">{a.trucks}</div><div className="r b">{fmt(a.n)}</div><div className="r">{a.avgw}</div><div className="r">{a.yld}%</div><div className="r">{a.pay}%</div><div className="r">{a.g11}%</div><div className="r">{fmt(a.amount)}</div><div className="r">{fmt(a.price)}</div>
            </button>
          ); })}
          {unassigned.length > 0 && <button className="btn sm ghost" style={{ marginTop: 10 }} onClick={() => setOpen('미배정')}>그룹 못 정한 출하 {unassigned.length}건 보기</button>}
        </div>
      )}
      {open && (
        <Sheet title={open === '미배정' ? '그룹 못 정한 출하' : open + ' 출하'} onClose={() => setOpen(null)}>
          {cur.length === 0 && <div className="muted">없습니다</div>}
          {cur.map((r) => { const a = asg[r.key]; const opts = all.filter((g) => g.farm === r.farm); return (
            <div key={r.key} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #EFEBE3', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 180px', minWidth: 0 }}><b>{md(r.date)}</b> {r.farm} · {shortDest(r.dest)} · <b>{r.n}두</b><div className="muted" style={{ fontSize: 12 }}>평체 {Math.round((r.live / r.n) * 10) / 10}kg · 지급 {Math.round(r.pay * 1000) / 10}% · {fmt(r.amount)}원{a?.how ? ' · ' + HOW[a.how] : ''}</div></div>
              <select aria-label="그룹" value={saved.shipGroup?.[r.key] ?? a?.group ?? ''} onChange={(e) => setGroup(r, e.target.value || '-')} style={{ minHeight: 40 }}>
                <option value="-">그룹 아님</option>{!a?.group && <option value="">정하지 않음</option>}
                {opts.map((g) => <option key={g.group} value={g.group}>{g.group}</option>)}
              </select>
              {saved.shipGroup?.[r.key] !== undefined && <button className="btn sm ghost" onClick={() => resetGroup(r)}>자동으로</button>}
            </div>
          ); })}
        </Sheet>
      )}
    </div>
  );
}
