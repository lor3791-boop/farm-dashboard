// 폐사현황 — 기간(기본 이번 달) 요약 띠, 일자별 표(날짜·머리줄·합계 고정) 또는 달력 히트맵, 농장별 접고 펼치기.
// 날짜를 누르면 그날 기록이 아래에서 올라온다.
import { useMemo, useState } from 'react';
import { useHerd } from '@/lib/ui';
import { fmt, md, addIso } from '@/lib/calc/dates';
import { todayKST } from '@/lib/util';
import { downloadXlsx } from '@/lib/xlsx';
import { Sheet } from '@/components/Sheet';
import type { DeathRow } from '@/lib/repo';

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const wd = (d: string) => WD[new Date(d + 'T00:00:00Z').getUTCDay()];
const tone = (v: number) => (v === 0 ? { background: 'transparent', color: '#B3AEA3' } : v <= 2 ? { background: '#FBE7C6', color: '#5A3A00' } : v <= 5 ? { background: '#F2B27E', color: '#3D1F00' } : { background: '#D9773F', color: '#fff' });
const monStart = (d: string) => d.slice(0, 8) + '01';
const monEnd = (d: string) => addIso(monStart(addIso(monStart(d), 32)), -1);
const dg = (r: DeathRow) => (r.dong ? r.dong + '동 · ' : '') + r.group;
type P = 'm0' | 'm1' | 'd7' | 'd30' | 'custom';

export function DeathDaily() {
  const { deaths, farms, split } = useHerd();
  const today = todayKST();
  const [per, setPer] = useState<P>('m0');
  const [from, setFrom] = useState(monStart(today));
  const [to, setTo] = useState(today);
  const [farm, setFarm] = useState('');
  const [view, setView] = useState<'table' | 'cal'>('table');
  const [day, setDay] = useState<string | null>(null);
  const [exp, setExp] = useState<Record<string, boolean>>({});
  const pick = (p: P) => {
    setPer(p);
    if (p === 'm0') { setFrom(monStart(today)); setTo(today); }
    if (p === 'm1') { const s = monStart(addIso(monStart(today), -1)); setFrom(s); setTo(monEnd(s)); }
    if (p === 'd7') { setFrom(addIso(today, -6)); setTo(today); }
    if (p === 'd30') { setFrom(addIso(today, -29)); setTo(today); }
  };
  const rows = deaths.filter((r) => r.date >= from && r.date <= to && (!farm || r.farm === farm));
  const cols = useMemo(() => (farm ? [...new Set(rows.map((r) => r.group))].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true })) : farms.filter((f) => rows.some((r) => r.farm === f))), [rows, farm, farms]);
  const keyOf = (r: DeathRow) => (farm ? r.group : r.farm);
  const dates: string[] = [];
  for (let d = to; d >= from && dates.length < 92; d = addIso(d, -1)) dates.push(d);
  const byDay = useMemo(() => { const m: Record<string, number> = {}; rows.forEach((r) => { m[r.date] = (m[r.date] ?? 0) + r.count; }); return m; }, [rows]);
  const cell = (d: string, c: string) => rows.filter((r) => r.date === d && keyOf(r) === c).reduce((a, r) => a + r.count, 0);
  const colTot = (c: string) => rows.filter((r) => keyOf(r) === c).reduce((a, r) => a + r.count, 0);
  const total = rows.reduce((a, r) => a + r.count, 0);
  const claimTot = rows.reduce((a, r) => a + (split[r.id]?.claim ?? 0), 0);
  const unreg = rows.filter((r) => !r.checked).reduce((a, r) => a + r.count, 0);
  const grid = `70px repeat(${cols.length}, minmax(54px, 1fr)) 54px`;
  const xl = () => downloadXlsx('폐사현황', [{ name: '일자별', head: ['날짜', ...cols, '합계'], rows: dates.map((d) => [d, ...cols.map((c) => cell(d, c)), byDay[d] ?? 0]) }, { name: '기록', head: ['날짜', '농장', '동', '그룹', '두수', '크레임', '폐사', '피그온'], rows: [...rows].sort((a, b) => (a.date < b.date ? -1 : 1)).map((r) => [r.date, r.farm, r.dong, r.group, r.count, split[r.id]?.claim ?? 0, split[r.id]?.death ?? r.count, r.checked ? '등록완료' : '미등록']) }]);

  // 농장별 → 동·그룹별 합계
  const farmSum = useMemo(() => {
    const m = new Map<string, { n: number; claim: number; unreg: number; g: Map<string, number> }>();
    rows.forEach((r) => { const x = m.get(r.farm) ?? { n: 0, claim: 0, unreg: 0, g: new Map() }; x.n += r.count; x.claim += split[r.id]?.claim ?? 0; if (!r.checked) x.unreg += r.count; x.g.set(dg(r), (x.g.get(dg(r)) ?? 0) + r.count); m.set(r.farm, x); });
    return [...m].sort((a, b) => b[1].n - a[1].n);
  }, [rows, split]);

  // 달력: 기간에 걸친 달마다
  const months: string[] = [];
  for (let m = monStart(from); m <= to; m = monStart(addIso(m, 32))) months.push(m);

  return (
    <>
      <div className="card">
        <div className="hscroll" style={{ alignItems: 'center' }}>
          <div className="segs" role="group" aria-label="기간" style={{ flexWrap: 'nowrap' }}>
            {([['m0', '이번 달'], ['m1', '지난달'], ['d7', '7일'], ['d30', '30일'], ['custom', '직접']] as const).map(([k, l]) => <button key={k} className={per === k ? 'seg on' : 'seg'} onClick={() => pick(k)}>{l}</button>)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
          <select aria-label="농장" value={farm} onChange={(e) => setFarm(e.target.value)} style={{ minHeight: 40, flex: '1 1 auto', maxWidth: 220 }}><option value="">농장 전체</option>{farms.map((f) => <option key={f}>{f}</option>)}</select>
          <div style={{ flex: 1 }} />
          <button className="btn sm ghost" onClick={xl}>엑셀</button>
        </div>
        {per === 'custom' && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
            <input aria-label="시작일" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value || from)} style={{ flex: 1, minWidth: 0, minHeight: 40 }} />
            <span>~</span>
            <input aria-label="끝일" type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value || to)} style={{ flex: 1, minWidth: 0, minHeight: 40 }} />
          </div>
        )}
        <div className="muted small" style={{ marginTop: 8 }}>{md(from)} ~ {md(to)} · {dates.length}일</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6, marginTop: 8 }}>
          {([['총 입력', fmt(total), dates.length ? '하루 ' + (total / dates.length).toFixed(1) : ''], ['크레임', fmt(claimTot), ''], ['폐사', fmt(total - claimTot), ''], ['미등록', fmt(unreg), '']] as const).map(([l, v, sub], i) => (
            <div key={l} style={{ background: i === 3 && unreg ? '#FBEFD5' : '#F7F5F0', borderRadius: 10, padding: '8px 10px', minWidth: 0 }}>
              <div className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l}</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: i === 3 && unreg ? '#7A4F00' : undefined }}>{v}<span style={{ fontSize: 12, fontWeight: 400 }}>두</span></div>
              {sub && <div className="muted" style={{ fontSize: 11 }}>{sub}</div>}
            </div>))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <h2 className="h2" style={{ flex: 1 }}>일자별 폐사 · {farm ? farm + ' 그룹별' : '농장별'}</h2>
          <div className="segs" role="group" aria-label="보기"><button className={view === 'table' ? 'seg on' : 'seg'} onClick={() => setView('table')}>표</button><button className={view === 'cal' ? 'seg on' : 'seg'} onClick={() => setView('cal')}>달력</button></div>
        </div>
        {view === 'table' && (cols.length === 0 ? <div className="muted">기간 안에 입력된 폐사가 없습니다</div> : (
          <div className="gt" style={{ maxHeight: '68vh', overflow: 'auto' }}><div style={{ minWidth: 130 + cols.length * 60, position: 'relative' }}>
            <div className="gr gh sticky small muted" style={{ gridTemplateColumns: grid }}><div className="stick">날짜</div>{cols.map((c) => <div key={c} className="r" style={{ wordBreak: 'keep-all', lineHeight: 1.2 }}>{c}</div>)}<div className="r">합계</div></div>
            {dates.map((d) => {
              const t = byDay[d] ?? 0;
              return (
                <button key={d} className="gr" onClick={() => t && setDay(d)} disabled={!t} style={{ gridTemplateColumns: grid, width: '100%', textAlign: 'left', background: 'transparent', cursor: t ? 'pointer' : 'default', font: 'inherit', border: 0, borderBottom: '1px solid #EFEBE3', color: 'inherit' }}>
                  <div className="stick" style={{ fontWeight: 600, color: wd(d) === '일' ? '#9A3216' : undefined }}>{md(d)}<span style={{ fontWeight: 400, color: wd(d) === '일' ? '#9A3216' : '#8A877E', fontSize: 12 }}> {wd(d)}</span></div>
                  {cols.map((c) => { const v = cell(d, c); return <div key={c} className="r"><span style={{ ...tone(v), display: 'inline-block', minWidth: 28, textAlign: 'center', borderRadius: 6, padding: '2px 4px' }}>{v || '·'}</span></div>; })}
                  <div className="r b">{t || '·'}</div>
                </button>
              );
            })}
            <div className="gr gh b gfoot" style={{ gridTemplateColumns: grid, borderTop: '1px solid #D9D3C6' }}><div className="stick">합계</div>{cols.map((c) => <div key={c} className="r">{colTot(c)}</div>)}<div className="r">{total}</div></div>
          </div></div>
        ))}
        {view === 'cal' && months.map((m) => {
          const first = new Date(m + 'T00:00:00Z').getUTCDay(), end = monEnd(m), n = Number(end.slice(8));
          return (
            <div key={m} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, margin: '4px 0 6px' }}>{Number(m.slice(5, 7))}월</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
                {WD.map((w) => <div key={w} className="muted" style={{ textAlign: 'center', fontSize: 12, color: w === '일' ? '#9A3216' : undefined }}>{w}</div>)}
                {Array.from({ length: first }, (_, i) => <div key={'b' + i} />)}
                {Array.from({ length: n }, (_, i) => {
                  const d = m.slice(0, 8) + String(i + 1).padStart(2, '0'), inR = d >= from && d <= to, v = inR ? byDay[d] ?? 0 : 0, tn = tone(v);
                  return (
                    <button key={d} onClick={() => v && setDay(d)} disabled={!v} aria-label={`${md(d)} 폐사 ${v}두`}
                      style={{ aspectRatio: '1 / 1', maxWidth: '100%', borderRadius: 8, border: d === today ? '2px solid #1F4E3D' : '1px solid #EFEBE3', background: v ? tn.background : inR ? '#fff' : '#F7F5F0', color: v ? tn.color : '#9A958B', font: 'inherit', padding: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: v ? 'pointer' : 'default', opacity: inR ? 1 : 0.5 }}>
                      <span style={{ fontSize: 11 }}>{i + 1}</span>
                      <b style={{ fontSize: 15, minHeight: 18 }}>{v || ''}</b>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 className="h2" style={{ marginBottom: 6 }}>농장별</h2>
        {farmSum.length === 0 && <div className="muted">기간 안에 입력된 폐사가 없습니다</div>}
        {farmSum.map(([f, x]) => (
          <div key={f} style={{ borderBottom: '1px solid #EFEBE3' }}>
            <button onClick={() => setExp({ ...exp, [f]: !exp[f] })} aria-expanded={!!exp[f]} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 4px', font: 'inherit', background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left', color: 'inherit', minHeight: 48 }}>
              <span aria-hidden="true" style={{ width: 14, color: '#8A877E' }}>{exp[f] ? '▾' : '▸'}</span>
              <b style={{ flex: 1 }}>{f}</b>
              {x.unreg > 0 && <span className="chip warn" style={{ fontSize: 11 }}>미등록 {x.unreg}</span>}
              {x.claim > 0 && <span className="muted small">크레임 {x.claim}</span>}
              <b style={{ minWidth: 44, textAlign: 'right' }}>{fmt(x.n)}<span style={{ fontWeight: 400, fontSize: 12 }}>두</span></b>
            </button>
            {exp[f] && <div style={{ padding: '0 4px 10px 26px', display: 'grid', gap: 4 }}>
              {[...x.g].sort((a, b) => a[0].localeCompare(b[0], 'ko', { numeric: true })).map(([k, n]) => <div key={k} style={{ display: 'flex', fontSize: 14 }}><span style={{ flex: 1 }}>{k}</span><span>{n}두</span></div>)}
            </div>}
          </div>
        ))}
      </div>

      {day && (
        <Sheet title={<>{md(day)} ({wd(day)}) <span className="muted" style={{ fontWeight: 400, fontSize: 14 }}>{byDay[day] ?? 0}두</span></>} onClose={() => setDay(null)}>
          {rows.filter((r) => r.date === day).sort((a, b) => a.farm.localeCompare(b.farm, 'ko')).map((r) => (
            <div key={r.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #EFEBE3', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}><b>{r.farm}</b> {dg(r)}{split[r.id]?.claim ? <div className="muted small">크레임 {split[r.id].claim}</div> : null}</div>
              {!r.checked && <span className="chip warn" style={{ fontSize: 11 }}>미등록</span>}
              <b>{r.count}두</b>
            </div>
          ))}
        </Sheet>
      )}
    </>
  );
}
