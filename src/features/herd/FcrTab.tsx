// FCR 추이 — 피그온 그룹 사료 사용(업로드) ÷ 정밀성장조견표 추정 증체 (계산은 calc/fcr.ts). 정산용 사료(중간투입·정산서)와 별개.
// 추정 FCR: 현재 = 오늘까지 / 종료예상 = 지금 추세(조견표 대비 사료 계수)로 출하평체(기준값, 115kg)까지 키워 출하종료했을 때.
import { useMemo, useState } from 'react';
import { useHerd } from '@/lib/ui';
import { useCol } from '@/lib/useCol';
import { useSettle } from '@/lib/useSettle';
import { mergeFeed, type FeedUpload } from '@/lib/feedSheet';
import { groupFcr } from '@/lib/calc/fcr';
import { TODAY } from '@/lib/calc/herd';
import { fmt, md, r1 } from '@/lib/calc/dates';

const tone = (v: number | null) => (v === null ? {} : v < 2.4 ? { background: '#E3EFE7', color: '#1F4E3D' } : v < 2.7 ? { background: '#FBEFD5', color: '#7A4F00' } : { background: '#F8E1D8', color: '#9A3216' });
const Fv = ({ v, big }: { v: number | null; big?: boolean }) => <span style={{ ...tone(v), borderRadius: 6, padding: big ? '2px 6px' : '2px 4px', fontWeight: big ? 700 : 400, fontSize: big ? undefined : 13 }}>{v === null ? (big ? '—' : '·') : v.toFixed(2)}</span>;
const span = (c: number, n: number, r = 1, rn = 1): React.CSSProperties => ({ gridColumn: `${c} / span ${n}`, gridRow: `${r} / span ${rn}` });

export function FcrTab({ onOpen }: { onOpen: (who: string) => void }) {
  const { all, farms, T } = useHerd();
  const st = useSettle();
  const ups = useCol<FeedUpload>('feed');
  const feed = useMemo(() => mergeFeed(ups), [ups]);
  const withFeed = farms.filter((f) => feed.some((r) => r[0] === f));
  const [farm, setFarm] = useState('');
  const F = farm || withFeed[0] || '';
  if (!T) return null;
  const endKg = T.fcrEndKg;
  const G = all.filter((g) => g.farm === F).map((g) => ({ g, fc: groupFcr(g, feed, st.shipLiveOf(g), { endKg, today: TODAY }) })).filter((x) => x.fc && x.fc.feed > 0) as { g: (typeof all)[number]; fc: NonNullable<ReturnType<typeof groupFcr>> }[];
  const months = [...new Set(G.flatMap((x) => x.fc.months.map((b) => b.m)))].sort();
  const grid = 'minmax(90px,1fr) 64px 92px 84px 84px 66px 70px ' + months.map(() => '58px').join(' ');
  const mC = 8; // 월 열 시작

  return (
    <>
      <div className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {farms.map((f) => <button key={f} className={F === f ? 'pill on' : 'pill'} disabled={!withFeed.includes(f)} onClick={() => setFarm(f)}>{f}</button>)}
        </div>
        <div className="muted small" style={{ marginTop: 10 }}>피그온 그룹 사료 · 리더 정밀성장조견표 기준 증체 · 종료예상 = 지금 추세로 {endKg}kg 출하종료 · 2.4 미만 / 2.4~2.7 / 2.7 이상</div>
      </div>
      {!withFeed.length && <div className="card" style={{ marginTop: 16 }}><div className="muted">피그온 그룹 사료 자료가 없습니다. 정산자료 › 사료 사용에서 파일을 올리면 여기 나옵니다.</div></div>}
      {G.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 className="h2" style={{ marginBottom: 8 }}>{F} · 그룹별 추정 FCR (월말 누적)</h2>
          <div className="gt"><div style={{ minWidth: 600 + months.length * 62 }}>
            <div className="gr gh small muted" style={{ gridTemplateColumns: grid, rowGap: 4 }}>
              <div style={{ ...span(1, 1, 1, 2), alignSelf: 'end' }}>그룹</div>
              <div style={{ ...span(2, 1, 1, 2), alignSelf: 'end' }}>전입일</div>
              <div style={{ ...span(3, 3), textAlign: 'center', borderBottom: '1px solid #EFEBE3', paddingBottom: 2 }}>사료량</div>
              <div style={{ ...span(6, 2), textAlign: 'center', borderBottom: '1px solid #EFEBE3', paddingBottom: 2 }}>추정 FCR</div>
              {months.length > 0 && <div style={{ ...span(mC, months.length), textAlign: 'center', borderBottom: '1px solid #EFEBE3', paddingBottom: 2 }}>월</div>}
              <div className="r" style={span(3, 1, 2)}>누적 사료량</div><div className="r" style={span(4, 1, 2)}>두당 총 사료</div><div className="r" style={span(5, 1, 2)}>두당 일 섭취</div>
              <div className="r" style={span(6, 1, 2)}>현재</div><div className="r" style={span(7, 1, 2)}>종료예상</div>
              {months.map((m, i) => <div key={m} className="r" style={span(mC + i, 1, 2)}>{Number(m.slice(5))}월</div>)}
            </div>
            {G.map(({ g, fc }) => (
              <button key={g.who} className="gr" onClick={() => onOpen(g.who)} style={{ gridTemplateColumns: grid, width: '100%', textAlign: 'left', font: 'inherit', border: 0, cursor: 'pointer' }} title={`추정체중 ${fc.wNow}kg · 조견표 대비 사료 ${fc.k}배`}>
                <div className="b">{g.group}<div className="sub">{g.age}일령 · {fc.wNow}kg</div></div><div>{md(g.date)}</div>
                <div className="r">{fmt(Math.round(fc.feed))}kg</div><div className="r">{r1(fc.perHead)}kg</div><div className="r">{fc.daily.toFixed(2)}kg</div>
                <div className="r"><Fv v={fc.now} big /></div><div className="r"><Fv v={fc.exp} big /></div>
                {months.map((m) => <div key={m} className="r"><Fv v={fc.months.find((y) => y.m === m)?.fcr ?? null} /></div>)}
              </button>
            ))}
          </div></div>
        </div>
      )}
    </>
  );
}
