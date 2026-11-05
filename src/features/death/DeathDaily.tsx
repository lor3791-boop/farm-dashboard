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
  const grid = `92px repeat(${cols.length}, minmax(64px, 1fr)) 70px`;
  const xl = () => downloadXlsx('폐사현황', [{ name: '일자별', head: ['날짜', ...cols, '합계'], rows: dates.map((d) => [d, ...cols.map((c) => cell(d, c)), dayTot(d)]) }, { name: '기록', head: ['날짜', '농장', '동', '그룹', '두수', '크레임', '폐사', '입력', '피그온'], rows: [...rows].sort((a, b) => (a.date < b.date ? -1 : 1)).map((r) => [r.date, r.farm, r.dong, r.group, r.count, split[r.id]?.claim ?? 0, split[r.id]?.death ?? r.count, r.src === 'share' ? '농장 앱' : r.src === 'app' ? '폐사입력 앱' : '대시보드', r.checked ? '등록완료' : '미등록']) }]);

  return (
    <>
      <div className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end' }}>
          <label className="small muted">시작일<br /><input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value || from)} /></label>
          <span style={{ paddingBottom: 10 }}>~</span>
          <label className="small muted">끝일<br /><input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value || to)} /></label>
          <div className="segs" role="group" aria-label="기간">
            {([['7일', 6], ['14일', 13], ['30일', 29]] as const).map(([l, n]) => <button key={l} className={from === addIso(to, -n) ? 'seg on' : 'seg'} onClick={() => setFrom(addIso(to, -n))}>{l}</button>)}
          </div>
          <label className="small muted">농장<br /><select value={farm} onChange={(e) => setFarm(e.target.value)}><option value="">농장 전체</option>{farms.map((f) => <option key={f}>{f}</option>)}</select></label>
          <div style={{ flex: 1 }} />
          <button className="btn sm" onClick={xl}>엑셀</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginTop: 14 }}>
          {([['폐사 입력', fmt(total) + '두'], ['그중 크레임 차감', fmt(claimTot) + '두'], ['육성률 반영 폐사', fmt(total - claimTot) + '두'], ['피그온 미등록', fmt(unreg) + '두'], ['하루 평균', dates.length ? (total / dates.length).toFixed(1) + '두' : '—']] as const).map(([l, v]) => <div key={l} style={{ background: '#F7F5F0', borderRadius: 10, padding: '10px 12px' }}><div className="muted small">{l}</div><div style={{ fontSize: 20, fontWeight: 700 }}>{v}</div></div>)}
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h2 className="h2" style={{ marginBottom: 10 }}>일자별 폐사 · {farm ? farm + ' 그룹별' : '농장별'}</h2>
        {cols.length === 0 ? <div className="muted">기간 안에 입력된 폐사가 없습니다</div> : (
          <div className="gt"><div style={{ minWidth: 170 + cols.length * 70 }}>
            <div className="gr gh small muted" style={{ gridTemplateColumns: grid }}><div>날짜</div>{cols.map((c) => <div key={c} className="r">{c}</div>)}<div className="r">합계</div></div>
            {dates.map((d) => {
              const t = dayTot(d);
              return (
                <div key={d}>
                  <button className="gr" onClick={() => setOpen(open === d ? null : d)} disabled={!t} style={{ gridTemplateColumns: grid, width: '100%', textAlign: 'left', background: open === d ? '#EEF3EF' : undefined, cursor: t ? 'pointer' : 'default', font: 'inherit', border: 0 }} aria-expanded={open === d}>
                    <div className={wd(d) === '일' ? 'neg' : ''}>{md(d)}({wd(d)})</div>
                    {cols.map((c) => { const v = cell(d, c); return <div key={c} className="r"><span style={{ ...tone(v), display: 'inline-block', minWidth: 30, textAlign: 'center', borderRadius: 6, padding: '2px 4px' }}>{v || '·'}</span></div>; })}
                    <div className="r b">{t || '·'}</div>
                  </button>
                  {open === d && (
                    <div style={{ padding: '6px 12px 10px', background: '#F7F5F0', fontSize: 14 }}>
                      {rows.filter((r) => r.date === d).map((r) => (
                        <div key={r.id} style={{ display: 'flex', gap: 10, padding: '4px 0', flexWrap: 'wrap' }}>
                          <b style={{ minWidth: 70 }}>{r.farm}</b><span style={{ flex: 1 }}>{r.dong ? r.dong + '동 · ' : ''}{r.group}</span>
                          <b>{r.count}두</b>{split[r.id]?.claim ? <span className="muted small">크레임 {split[r.id].claim}</span> : null}
                          <span className={r.src === 'share' ? 'chip info' : 'chip'} style={{ fontSize: 12 }}>{r.src === 'share' ? '농장 앱' : r.src === 'app' ? '폐사입력 앱' : '대시보드'}</span>
                          <span className={r.checked ? 'chip ok' : 'chip warn'} style={{ fontSize: 12 }}>{r.checked ? '등록완료' : '미등록'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="gr gh b" style={{ gridTemplateColumns: grid }}><div>합계</div>{cols.map((c) => <div key={c} className="r">{colTot(c)}</div>)}<div className="r">{total}</div></div>
          </div></div>
        )}
      </div>
    </>
  );
}
