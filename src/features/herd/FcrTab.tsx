// FCR 추이 — 피그온 그룹 사료 사용(업로드)만으로 본다. 정산용 사료(중간투입·정산서)와 별개.
// 추정 FCR(월말) = 그 달까지 누적 사료 ÷ (살아 있는 두수 × 일당증체 × 전입 후 일수). 일당증체는 기준값(설정)을 쓴다.
import { useMemo, useState } from 'react';
import { useHerd } from '@/lib/ui';
import { useCol } from '@/lib/useCol';
import { mergeFeed, type FeedUpload } from '@/lib/feedSheet';
import { days, fmt, md, r1 } from '@/lib/calc/dates';

const monthEnd = (m: string) => { const [y, mo] = m.split('-').map(Number); return new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10); };
const tone = (x: string | null) => { const v = x === null ? null : Number(x); return v === null ? {} : v < 2.4 ? { background: '#E3EFE7', color: '#1F4E3D' } : v < 2.7 ? { background: '#FBEFD5', color: '#7A4F00' } : { background: '#F8E1D8', color: '#9A3216' }; };

export function FcrTab({ onOpen }: { onOpen: (who: string) => void }) {
  const { all, farms, T } = useHerd();
  const ups = useCol<FeedUpload>('feed');
  const feed = useMemo(() => mergeFeed(ups), [ups]);
  const withFeed = farms.filter((f) => feed.some((r) => r[0] === f));
  const [farm, setFarm] = useState('');
  const F = farm || withFeed[0] || '';
  if (!T) return null;
  const adg = T.defaultAdgKg;
  const G = all.filter((g) => g.farm === F).map((g) => {
    const rows = feed.filter((r) => r[0] === g.farm && r[1] === g.group);
    const months = [...new Set(rows.map((r) => r[2]))].sort();
    const n = g.sold + g.stock;
    let cum = 0;
    const byM = months.map((m) => {
      const kg = rows.filter((r) => r[2] === m).reduce((a, r) => a + r[4], 0); cum += kg;
      const d = Math.max(1, days(g.date, monthEnd(m) < g.date ? g.date : monthEnd(m)));
      return { m, kg, cum, fcr: n && d > 14 ? (cum / (n * adg * d)).toFixed(2) : null };
    });
    const tot = cum, d = Math.max(1, days(g.date, months.length ? monthEnd(months[months.length - 1]) : g.date));
    return { g, byM, tot, perHead: n ? tot / n : 0, daily: n ? tot / n / d : 0, fcr: byM.length ? byM[byM.length - 1].fcr : null };
  }).filter((x) => x.tot > 0);
  const months = [...new Set(G.flatMap((x) => x.byM.map((b) => b.m)))].sort();
  const grid = 'minmax(90px,1fr) 70px 90px 84px 92px 80px ' + months.map(() => '64px').join(' ');

  return (
    <>
      <div className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {farms.map((f) => <button key={f} className={F === f ? 'pill on' : 'pill'} disabled={!withFeed.includes(f)} onClick={() => setFarm(f)}>{f}</button>)}
        </div>
        <div className="muted small" style={{ marginTop: 10 }}>피그온 그룹 사료 기준 · 일당증체 {adg}kg 가정 · 2.4 미만 / 2.4~2.7 / 2.7 이상</div>
      </div>
      {!withFeed.length && <div className="card" style={{ marginTop: 16 }}><div className="muted">피그온 그룹 사료 자료가 없습니다. 정산자료 › 사료 사용에서 파일을 올리면 여기 나옵니다.</div></div>}
      {G.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 className="h2" style={{ marginBottom: 8 }}>{F} · 그룹별 추정 FCR (월말 누적)</h2>
          <div className="gt"><div style={{ minWidth: 520 + months.length * 68 }}>
            <div className="gr gh small muted" style={{ gridTemplateColumns: grid }}><div>그룹</div><div>전입</div><div className="r">누적 사료</div><div className="r">두당 사료</div><div className="r">두당 일 섭취</div><div className="r">추정 FCR</div>{months.map((m) => <div key={m} className="r">{Number(m.slice(5))}월</div>)}</div>
            {G.map((x) => (
              <button key={x.g.who} className="gr" onClick={() => onOpen(x.g.who)} style={{ gridTemplateColumns: grid, width: '100%', textAlign: 'left', font: 'inherit', border: 0, cursor: 'pointer' }}>
                <div className="b">{x.g.group}<div className="sub">{x.g.age}일령</div></div><div>{md(x.g.date)}</div>
                <div className="r">{fmt(Math.round(x.tot))}kg</div><div className="r">{r1(x.perHead)}kg</div><div className="r">{x.daily.toFixed(2)}kg</div>
                <div className="r"><span style={{ ...tone(x.fcr), borderRadius: 6, padding: '2px 6px', fontWeight: 700 }}>{x.fcr ?? '—'}</span></div>
                {months.map((m) => { const b = x.byM.find((y) => y.m === m); return <div key={m} className="r"><span style={{ ...tone(b?.fcr ?? null), borderRadius: 6, padding: '2px 4px', fontSize: 13 }}>{b?.fcr ?? '·'}</span></div>; })}
              </button>
            ))}
          </div></div>
        </div>
      )}
    </>
  );
}
