// 폐사현황 — 일자별로 본다. 날짜 × 농장 표(합계 포함), 농장 하나를 고르면 날짜 × 그룹. 날짜를 누르면 그날 기록.
import { useMemo, useState } from 'react';
import { useHerd } from '@/lib/ui';
import { fmt, md, addIso } from '@/lib/calc/dates';
import { todayKST } from '@/lib/util';
import { downloadXlsx } from '@/lib/xlsx';

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const wd = (d: string) => WD[new Date(d + 'T00:00:00Z').getUTCDay()];

export function DeathDaily() {
  const { deaths, farms, split } = useHerd();
  const today = todayKST();
  const [from, setFrom] = useState(addIso(today, -29));
  const [to, setTo] = useState(today);
  const [farm, setFarm] = useState('');
  const [custom, setCustom] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const rows = deaths.filter((r) => r.date >= from && r.date <= to && (!farm || r.farm === farm));
  // 열: 농장 전체면 농장, 농장 하나면 그 농장 그룹
  const cols = useMemo(() => (farm ? [...new Set(rows.map((r) => r.group))].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true })) : farms.filter((f) => rows.some((r) => r.farm === f))), [rows, farm, farms]);
  const keyOf = (r: (typeof rows)[number]) => (farm ? r.group : r.farm);
  const dates: string[] = [];
  for (let d = to; d >= from && dates.length < 92; d = addIso(d, -1)) dates.push(d);
  const cell = (d: string, c: string) => rows.filter((r) => r.date === d && keyOf(r) === c).reduce((a, r) => a + r.count, 0);
  const dayTot = (d: string) => rows.filter((r) => r.date === d).reduce((a, r) => a + r.count, 0);
  const colTot = (c: string) => rows.filter((r) => keyOf(r) === c).reduce((a, r) => a + r.count, 0);
  const total = rows.reduce((a, r) => a + r.count, 0);
  const claimTot = rows.reduce((a, r) => a + (split[r.id]?.claim ?? 0), 0);
  const unreg = rows.filter((r) => !r.checked).reduce((a, r) => a + r.count, 0);
  const tone = (v: number) => (v === 0 ? { background: 'transparent', color: '#9A958B' } : v <= 2 ? { background: '#FBE7C6', color: '#5A3A00' } : v <= 5 ? { background: '#F2B27E', color: '#3D1F00' } : { background: '#D9773F', color: '#fff' });
  const grid = `74px repeat(${cols.length}, minmax(56px, 1fr)) 56px`;
  const xl = () => downloadXlsx('폐사현황', [{ name: '일자별', head: ['날짜', ...cols, '합계'], rows: dates.map((d) => [d, ...cols.map((c) => cell(d, c)), dayTot(d)]) }, { name: '기록', head: ['날짜', '농장', '동', '그룹', '두수', '크레임', '폐사', '피그온'], rows: [...rows].sort((a, b) => (a.date < b.date ? -1 : 1)).map((r) => [r.date, r.farm, r.dong, r.group, r.count, split[r.id]?.claim ?? 0, split[r.id]?.death ?? r.count, r.checked ? '등록완료' : '미등록']) }]);

  return (
    <>
      <div className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <div className="segs" role="group" aria-label="기간">
            {([['7일', 6], ['14일', 13], ['30일', 29]] as const).map(([l, n]) => <button key={l} className={!custom && to === today && from === addIso(to, -n) ? 'seg on' : 'seg'} onClick={() => { setCustom(false); setTo(today); setFrom(addIso(today, -n)); }}>{l}</button>)}
            <button className={custom ? 'seg on' : 'seg'} onClick={() => setCustom(true)}>직접</button>
          </div>
          <select aria-label="농장" value={farm} onChange={(e) => setFarm(e.target.value)} style={{ minHeight: 40, flex: '1 1 110px', maxWidth: 200 }}><option value="">농장 전체</option>{farms.map((f) => <option key={f}>{f}</option>)}</select>
          <button className="btn sm ghost" onClick={xl}>엑셀</button>
        </div>
        {custom && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
            <input aria-label="시작일" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value || from)} style={{ flex: 1, minWidth: 0, minHeight: 40 }} />
            <span>~</span>
            <input aria-label="끝일" type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value || to)} style={{ flex: 1, minWidth: 0, minHeight: 40 }} />
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6, marginTop: 12 }}>
          {([['총 입력', fmt(total), dates.length ? '하루 ' + (total / dates.length).toFixed(1) : ''], ['크레임', fmt(claimTot), ''], ['폐사', fmt(total - claimTot), ''], ['미등록', fmt(unreg), '']] as const).map(([l, v, sub], i) => (
            <div key={l} style={{ background: i === 3 && unreg ? '#FBEFD5' : '#F7F5F0', borderRadius: 10, padding: '8px 10px', minWidth: 0 }}>
              <div className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l}</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: i === 3 && unreg ? '#7A4F00' : undefined }}>{v}<span style={{ fontSize: 12, fontWeight: 400 }}>두</span></div>
              {sub && <div className="muted" style={{ fontSize: 11 }}>{sub}</div>}
            </div>))}
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h2 className="h2" style={{ marginBottom: 10 }}>일자별 폐사 · {farm ? farm + ' 그룹별' : '농장별'}</h2>
        {cols.length === 0 ? <div className="muted">기간 안에 입력된 폐사가 없습니다</div> : (
          <div className="gt" style={{ maxHeight: '70vh', overflow: 'auto' }}><div style={{ minWidth: 140 + cols.length * 62 }}>
            <div className="gr gh sticky small muted" style={{ gridTemplateColumns: grid }}><div className="stick">날짜</div>{cols.map((c) => <div key={c} className="r" style={{ wordBreak: 'keep-all', lineHeight: 1.2 }}>{c}</div>)}<div className="r">합계</div></div>
            {dates.map((d) => {
              const t = dayTot(d);
              return (
                <div key={d}>
                  <button className="gr" onClick={() => setOpen(open === d ? null : d)} disabled={!t} style={{ gridTemplateColumns: grid, width: '100%', textAlign: 'left', background: open === d ? '#EEF3EF' : '#fff', ['--rowbg' as any]: open === d ? '#EEF3EF' : '#fff', cursor: t ? 'pointer' : 'default', font: 'inherit', border: 0 }} aria-expanded={open === d}>
                    <div className={wd(d) === '일' ? 'stick neg' : 'stick'} style={{ fontWeight: 600 }}>{md(d)}<span className="muted" style={{ fontWeight: 400 }}>({wd(d)})</span></div>
                    {cols.map((c) => { const v = cell(d, c); return <div key={c} className="r"><span style={{ ...tone(v), display: 'inline-block', minWidth: 30, textAlign: 'center', borderRadius: 6, padding: '2px 4px' }}>{v || '·'}</span></div>; })}
                    <div className="r b">{t || '·'}</div>
                  </button>
                  {open === d && (
                    <div style={{ padding: '6px 12px 10px', background: '#F7F5F0', fontSize: 14, position: 'sticky', left: 0, maxWidth: 'calc(100vw - 64px)', boxSizing: 'border-box' }}>
                      {rows.filter((r) => r.date === d).map((r) => (
                        <div key={r.id} style={{ display: 'flex', gap: 10, padding: '4px 0', flexWrap: 'wrap' }}>
                          <b style={{ minWidth: 70 }}>{r.farm}</b><span style={{ flex: 1 }}>{r.dong ? r.dong + '동 · ' : ''}{r.group}</span>
                          <b>{r.count}두</b>{split[r.id]?.claim ? <span className="muted small">크레임 {split[r.id].claim}</span> : null}
                          {!r.checked && <span className="chip warn" style={{ fontSize: 12 }}>미등록</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="gr gh b" style={{ gridTemplateColumns: grid, position: 'sticky', bottom: 0, zIndex: 3, background: '#fff', borderTop: '1px solid #D9D3C6' }}><div className="stick">합계</div>{cols.map((c) => <div key={c} className="r">{colTot(c)}</div>)}<div className="r">{total}</div></div>
          </div></div>
        )}
      </div>
    </>
  );
}
