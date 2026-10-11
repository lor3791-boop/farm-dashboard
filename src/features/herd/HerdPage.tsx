// 돈군 — 표(농장 소계 + 그룹) / 주차 히트맵 / 오른쪽 그룹 상세 (목업 v5)
import { useState, type ReactNode } from 'react';
import { useHerd, useUi } from '@/lib/ui';
import { agg, dongsOf, heat, type Group } from '@/lib/calc/herd';
import { addIso, fmt, md } from '@/lib/calc/dates';
import { Chip, Grid, Lnk, Num, Segs, Txt, sortRows, useSorts, type Col, type GRowView } from '@/components/v5';
import { exportHerd } from './exportHerd';

export function HerdPage() {
  const H = useHerd();
  const { rows, s, set, isPlanned, togglePlan, T } = H;
  const { go } = useUi();
  const sorts = useSorts();
  const [colOpen, setColOpen] = useState(false);
  if (!T) return null;

  const HC: Col<Group>[] = [
    { k: 'who', l: '농장 · 그룹', w: 'minmax(120px,1.3fr)', sv: (r) => r.farm + r.group.padStart(5, '0'), fixed: true },
    { k: 'dong', l: '동', w: '76px', sv: (r) => r.dong },
    { k: 'date', l: '전입일', w: '62px', sv: (r) => r.date },
    { k: 'week', l: '주차', w: '50px', num: true, sv: (r) => r.week },
    { k: 'age', l: '일령', w: '52px', num: true, sv: (r) => r.age },
    { k: 'avgw', l: '전입평체', w: '68px', num: true, sv: (r) => r.avgw },
    { k: 'net', l: '전입', w: '62px', num: true, sv: (r) => r.net },
    { k: 'claim', l: '클레임', w: '58px', num: true, sv: (r) => r.claim },
    { k: 'death', l: '폐사', w: '54px', num: true, sv: (r) => r.death },
    { k: 'surv', l: '육성률', w: '64px', num: true, sv: (r) => r.surv },
    { k: 'sold', l: '출하', w: '56px', num: true, sv: (r) => r.sold },
    { k: 'stock', l: '재고', w: '62px', num: true, sv: (r) => r.stock },
    { k: 'prog', l: '진행', w: '54px', num: true, sv: (r) => r.prog },
    { k: 'exp', l: '예상출하', w: '68px', num: true, sv: (r) => r.exp },
    { k: 'first', l: '첫출하', w: '96px', sv: (r) => r.first },
    { k: 'end', l: '출하종료', w: '64px', sv: (r) => r.first },
    { k: 'next', l: '다음 전입', w: '64px', sv: (r) => r.first },
    { k: 'plan', l: '정산예정', w: '84px', sv: (r) => (isPlanned(r) ? 0 : 1) },
    { k: 'warn', l: '경고', w: 'minmax(130px,1.4fr)', sv: (r) => r.warn.length }
  ];
  const vis = HC.filter((c) => c.fixed || !s.hidden[c.k]);
  const goDet = (who: string) => set({ det: who });

  const cellOf = (r: Group, k: string): ReactNode => {
    switch (k) {
      case 'who': return <Lnk v={r.group} sub={r.farm} />;
      case 'dong': return <span className="small">{r.dong === '—' ? '그룹만' : r.dong}</span>;
      case 'date': return md(r.date);
      case 'week': return <Num v={r.week + '주'} />;
      case 'age': return <Num v={r.age} />;
      case 'avgw': return <Num v={r.avgw + 'kg'} />;
      case 'net': return <Num v={fmt(r.net)} />;
      case 'claim': return <Num v={r.claim} />;
      case 'death': return <Num v={r.death} />;
      case 'surv': return <Num v={r.surv + '%'} cls={r.bad ? 'neg' : ''} />;
      case 'sold': return <Num v={fmt(r.sold)} />;
      case 'stock': return <Num v={fmt(r.stock)} cls="b" />;
      case 'prog': return <Num v={r.prog + '%'} />;
      case 'exp': return <Num v={fmt(r.exp)} />;
      case 'first': return r.sold > 0 ? <Chip t="info">출하 중</Chip> : r.firstOver > 0 ? <Txt v={md(r.first)} sub={r.firstOver + '일 경과'} cls="neg" /> : md(r.first);
      case 'end': return md(addIso(r.first, T.shipPeriodDays));
      case 'next': return md(addIso(r.first, T.shipPeriodDays + T.emptyDays));
      case 'plan': return <label className="chk fg"><input type="checkbox" checked={isPlanned(r)} onChange={togglePlan(r)} /> 정산</label>;
      case 'warn': return <span className={r.warn.length ? (r.warnBad ? 'small neg' : 'small warnT') : 'small muted'}>{r.warn.length ? r.warn.join(' · ') : '—'}</span>;
    }
    return '';
  };
  const hRows0 = rows.filter((r) => (s.stage === 'all' || (s.stage === 'ship' ? r.sold > 0 : r.sold === 0)) && (!s.warnOnly || r.warn.length || r.bad));
  const hFarms = [...new Set(hRows0.map((r) => r.farm))];
  const defaultExp = hFarms.length <= 3;
  const expOf = (f: string) => (s.exp[f] === undefined ? defaultExp : s.exp[f]);
  const aggCell = (g: Group[], k: string, f: string): ReactNode => {
    const a = agg(g);
    switch (k) {
      case 'who': return <Lnk v={f} sub={g.length + '개 그룹 ' + (expOf(f) ? '▾' : '▸')} />;
      case 'net': return <Num v={fmt(a.net)} cls="b" />;
      case 'claim': return <Num v={a.claim} cls="b" />;
      case 'death': return <Num v={a.death} cls="b" />;
      case 'surv': return <Num v={a.surv + '%'} cls={a.surv < T.problemSurvivalPct ? 'b neg' : 'b'} />;
      case 'sold': return <Num v={fmt(a.sold)} cls="b" />;
      case 'stock': return <Num v={fmt(a.stock)} cls="b" />;
      case 'prog': return <Num v={a.prog + '%'} cls="b" />;
      case 'exp': return <Num v={fmt(a.exp)} cls="b" />;
      case 'plan': { const n = g.filter(isPlanned).length; return <span className="small">{n ? n + '개 그룹' : ''}</span>; }
      case 'warn': { const n = g.filter((r) => r.warn.length).length; return <span className="small warnT">{n ? '경고 ' + n + '건' : ''}</span>; }
    }
    return '';
  };
  const hs = sorts.of('herd');
  const hFarmSorted = (() => {
    if (!hs.k || ['who', 'dong', 'date', 'first', 'end', 'next', 'week', 'age', 'avgw'].includes(hs.k)) return hFarms;
    const av = (f: string) => { const g = hRows0.filter((r) => r.farm === f); const a: any = agg(g); a.warn = g.filter((r) => r.warn.length).length; a.plan = g.filter(isPlanned).length; return a[hs.k!] || 0; };
    return [...hFarms].sort((a, b) => (av(a) - av(b)) * hs.d);
  })();
  const herdRows: GRowView[] = [];
  const detOrder: string[] = [];
  hFarmSorted.forEach((f) => {
    const g = hRows0.filter((r) => r.farm === f);
    herdRows.push({ key: 'f:' + f, bg: '#F1EEE6', aria: f + ' 펼치기/접기', onClick: () => set({ exp: { ...s.exp, [f]: !expOf(f) } }), cells: vis.map((c) => aggCell(g, c.k, f)) });
    const sorted = sortRows(hs, HC, g);
    sorted.forEach((r) => detOrder.push(r.who));
    if (expOf(f)) sorted.forEach((r) => herdRows.push({ key: r.who, bg: s.det === r.who ? '#E4ECF3' : '#FFFFFF', aria: r.who + ' 상세 열기', onClick: () => goDet(r.who), cells: vis.map((c) => cellOf(r, c.k)) }));
  });
  const tot = agg(hRows0);
  const reset = () => set({ fSel: null, fStatus: 'all', fQ: '', stage: 'all', warnOnly: false });

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ flex: '999 1 620px', minWidth: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Segs label="보기" opts={[['table', '표'], ['heat', '주차 히트맵']]} value={s.hView} onPick={(k) => set({ hView: k })} />
          <Segs label="출하 단계" opts={[['all', '전체'], ['pre', '출하 전'], ['ship', '출하 중']]} value={s.stage} onPick={(k) => set({ stage: k })} />
          <div className="segs"><button className={s.warnOnly ? 'seg on' : 'seg'} onClick={() => set({ warnOnly: !s.warnOnly })}>문제·경고 그룹만</button></div>
          <div style={{ flex: 1 }} />
          <button className="btn sm ghost" onClick={() => { const e: Record<string, boolean> = {}; hFarms.forEach((f) => { e[f] = true; }); set({ exp: e }); }}>모두 펼치기</button>
          <button className="btn sm ghost" onClick={() => { const e: Record<string, boolean> = {}; hFarms.forEach((f) => { e[f] = false; }); set({ exp: e }); }}>모두 접기</button>
          {s.hView === 'table' && (
            <div style={{ position: 'relative' }}>
              <button className="btn sm ghost" onClick={() => setColOpen(!colOpen)}>열 선택 ▾</button>
              {colOpen && (
                <>
                  <button className="backdrop" onClick={() => setColOpen(false)} aria-label="열 선택 닫기" />
                  <div className="pop" style={{ left: 'auto', right: 0, width: 220, top: 40 }}>
                    {HC.filter((c) => !c.fixed).map((c) => <label key={c.k} className="opt"><input type="checkbox" checked={!s.hidden[c.k]} onChange={() => set({ hidden: { ...s.hidden, [c.k]: !s.hidden[c.k] } })} /><span>{c.l}</span></label>)}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}><button className="btn pri sm" onClick={() => setColOpen(false)}>닫기</button></div>
                  </div>
                </>
              )}
            </div>
          )}
          <button className="btn sm" onClick={() => exportHerd(hRows0, T, isPlanned)}>엑셀</button>
        </div>
        <div className="muted small" style={{ marginBottom: 8 }}>그룹 {hRows0.length}개 · 전입 {fmt(tot.net)} · 폐사 {fmt(tot.death)} · 재고 {fmt(tot.stock)} · 육성률 {tot.surv}%</div>

        {hRows0.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 28 }}>
            <div className="b">조건에 맞는 그룹이 없습니다</div>
            <button className="btn" onClick={reset}>필터 초기화</button>
          </div>
        )}
        {s.hView === 'table' && hRows0.length > 0 && (
          <>
            <div className="card" style={{ padding: '8px 10px' }}>
              <Grid cols={vis} sort={hs} onSort={(k) => sorts.cycle('herd', k)} rows={herdRows} scroll />
            </div>
          </>
        )}
        {s.hView === 'heat' && hRows0.length > 0 && <Heatmap farms={hFarmSorted} rows={hRows0} mode={s.hMode} setMode={(m) => set({ hMode: m })} det={s.det} onOpen={goDet} />}
      </div>
      {s.det && <Detail who={s.det} order={detOrder} onDeath={(g) => go('/input', { inTab: 'death', dFarm: g.farm, dDong: dongsOf(g.dong)[0] || null, dGroup: g.group })} />}
    </div>
  );
}

function Heatmap({ farms, rows, mode, setMode, det, onOpen }: { farms: string[]; rows: Group[]; mode: 'entry' | 'cal'; setMode: (m: 'entry' | 'cal') => void; det: string | null; onOpen: (w: string) => void }) {
  const CW = 42, GP = 4, BGAP = 12, NOWWK = '2026-10-05';
  const cols: { key: number | string; label: string; ml: number; now: boolean; fw: number }[] = [];
  const bands: { label: string; sub: string; w: number; ml: number; bg: string; n?: number }[] = [];
  if (mode === 'entry') {
    const maxW = Math.max(1, ...rows.map((r) => r.week)); const nb = Math.ceil(maxW / 4);
    for (let bi = 0; bi < nb; bi++) {
      const ws: number[] = []; for (let n = bi * 4 + 1; n <= Math.min(maxW, bi * 4 + 4); n++) ws.push(n);
      bands.push({ label: bi + 1 + '개월차', sub: ws[0] + '–' + ws[ws.length - 1] + '주', w: ws.length * CW + (ws.length - 1) * GP, ml: bi ? BGAP : 0, bg: bi % 2 ? '#F1EEE6' : '#E6EFE9' });
      ws.forEach((n, i) => cols.push({ key: n, label: n + '주', ml: bi && i === 0 ? BGAP : 0, now: false, fw: 500 }));
    }
  } else {
    const starts: string[] = []; for (let i = 11; i >= 0; i--) starts.push(addIso(NOWWK, -7 * i));
    let curM: number | null = null, bi = -1;
    starts.forEach((c) => { const m = Number(c.slice(5, 7)); const first = m !== curM; if (first) { curM = m; bi++; bands.push({ label: m + '월', sub: '', n: 0, w: 0, ml: bi ? BGAP : 0, bg: bi % 2 ? '#F1EEE6' : '#E6EFE9' }); }
      bands[bands.length - 1].n!++; cols.push({ key: c, label: c === NOWWK ? '이번 주' : Number(c.slice(5, 7)) + '/' + Number(c.slice(8)), ml: first && bi ? BGAP : 0, now: c === NOWWK, fw: c === NOWWK ? 700 : 500 }); });
    bands.forEach((b) => { b.w = b.n! * CW + (b.n! - 1) * GP; b.sub = b.n + '주'; });
  }
  const cellFor = (r: Group, col: (typeof cols)[number]) => {
    let v: number | null, title: string, now: boolean;
    if (mode === 'entry') { const n = col.key as number; v = n <= r.week ? (r.weekly[n - 1] ?? 0) : null; const st = addIso(r.date, 7 * (n - 1)); title = n + '주차 · ' + md(st) + '~' + md(addIso(st, 6)) + (v === null ? ' · 아직' : ' · 폐사 ' + v + '두'); now = n === r.week; }
    else { const c = col.key as string, e = addIso(c, 7); const idx: number[] = []; for (let n = 1; n <= r.week; n++) { const st = addIso(r.date, 7 * (n - 1)); if (st >= c && st < e) idx.push(n); }
      if (!idx.length) { v = null; title = md(c) + '~' + md(addIso(c, 6)) + (e <= r.date ? ' · 전입 전' : ' · 기록 없음'); }
      else { v = idx.reduce((a, n) => a + (r.weekly[n - 1] ?? 0), 0); title = md(c) + '~' + md(addIso(c, 6)) + ' · ' + idx.join('·') + '주차 · 폐사 ' + v + '두'; }
      now = col.now; }
    const hc = heat(v); const tag = mode === 'entry' ? r.marks[col.key as number] || '' : '';
    return { v: v === null ? '' : v === 0 ? '·' : String(v), bg: v === null ? 'transparent' : hc.bg, fg: hc.fg, bd: now ? '2px solid #1F4E3D' : v === null ? '1px dashed #D9D3C6' : '1px solid transparent', ml: col.ml, tag, title };
  };
  const minW = 150 + cols.length * (CW + GP) + Math.max(0, bands.length - 1) * BGAP + 200;
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span className="small muted">기준</span>
        <Segs label="주차 기준" opts={[['entry', '전입 후 주차'], ['cal', '달력 주 (최근 12주)']]} value={mode} onPick={setMode} />
      </div>
      <div className="card" style={{ padding: 12 }}>
        <div className="gt"><div style={{ minWidth: minW }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
            <div style={{ width: 150, flex: 'none' }} />
            {bands.map((b, i) => <div key={i} style={{ width: b.w, marginLeft: b.ml, background: b.bg, flex: 'none', borderRadius: '6px 6px 0 0', padding: '5px 6px', boxSizing: 'border-box', whiteSpace: 'nowrap', overflow: 'hidden' }}><b className="small">{b.label}</b> <span className="sub">{b.sub}</span></div>)}
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'end', padding: '4px 0 6px', borderBottom: '1px solid #D9D3C6' }}>
            <div style={{ width: 150, flex: 'none' }} className="small muted">그룹 · 동</div>
            {cols.map((h) => <div key={String(h.key)} style={{ width: 42, flex: 'none', marginLeft: h.ml, textAlign: 'center', fontSize: 11, fontWeight: h.fw, color: '#3E4B45', whiteSpace: 'nowrap' }}>{h.label}</div>)}
            <div style={{ width: 56, flex: 'none' }} className="small muted r">피그온</div>
            <div style={{ width: 52, flex: 'none' }} className="small muted r">미기록</div>
            <div style={{ width: 64, flex: 'none' }} className="small muted r">육성률</div>
          </div>
          {farms.map((f) => (
            <div key={f}>
              <div style={{ fontWeight: 700, fontSize: 14, padding: '12px 0 4px' }}>{f}</div>
              {rows.filter((r) => r.farm === f).map((r) => (
                <div key={r.who} className="rowx" style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '3px 0', borderRadius: 6, background: det === r.who ? '#E4ECF3' : '#FFFFFF' }}>
                  <button className="rowhit" onClick={() => onOpen(r.who)} aria-label={r.who + ' 상세 열기'} />
                  <div style={{ width: 150, flex: 'none', paddingLeft: 4 }}><span className="lnk-t">{r.group}</span> <span className="sub">{r.dong === '—' ? '' : r.dong}</span></div>
                  {cols.map((col) => { const c = cellFor(r, col); return <div key={String(col.key)} className="hc fg" title={c.title} style={{ background: c.bg, color: c.fg, border: c.bd, marginLeft: c.ml, pointerEvents: 'none' }}>{c.v}<i>{c.tag}</i></div>; })}
                  <div style={{ width: 56, flex: 'none' }} className="r b">{r.death}</div>
                  <div style={{ width: 52, flex: 'none' }} className="r small warnT">{r.wkDiff > 0 ? '+' + r.wkDiff : ''}</div>
                  <div style={{ width: 64, flex: 'none' }} className={r.bad ? 'r neg b' : 'r b'}>{r.surv}%</div>
                </div>
              ))}
            </div>
          ))}
        </div></div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 10, fontSize: 12 }} className="muted">
        <span>폐사 두수</span>
        <span className="hc" style={{ width: 30, height: 22, background: '#EEF3EF', color: '#6B7A73' }}>·</span><span>0</span>
        <span className="hc" style={{ width: 30, height: 22, background: '#FBE7C6', color: '#5A3A00' }}>1–2</span>
        <span className="hc" style={{ width: 30, height: 22, background: '#F2B27E', color: '#3D1F00' }}>3–5</span>
        <span className="hc" style={{ width: 30, height: 22, background: '#D9773F', color: '#fff' }}>6–9</span>
        <span className="hc" style={{ width: 30, height: 22, background: '#9A3216', color: '#fff' }}>10+</span>
        <span className="hc" style={{ width: 30, height: 22, border: '1px dashed #D9D3C6' }} />
      </div>
    </>
  );
}

function Detail({ who, order, onDeath }: { who: string; order: string[]; onDeath: (g: Group) => void }) {
  const { all, set, isPlanned, togglePlan, T } = useHerd();
  const d = all.find((r) => r.who === who);
  if (!d || !T) return null;
  const idx = order.indexOf(d.who);
  const kpis: [string, string, string][] = [['전입', fmt(d.net) + '두', '클레임 ' + d.claim + '두 제외'], ['폐사', d.death + '두', '피그온'], ['육성률', d.surv + '%', d.bad ? T.problemSurvivalPct + '% 미만' : '기준 이상'], ['재고', fmt(d.stock) + '두', '출하 ' + fmt(d.sold) + '두 · ' + d.prog + '%']];
  const months = Array.from({ length: Math.ceil(d.week / 4) }, (_, mi) => ({ label: mi + 1 + '개월차', cells: [1, 2, 3, 4].map((k) => {
    const n = mi * 4 + k; const v = n <= d.week ? (d.weekly[n - 1] ?? 0) : null; const c = heat(v); const st = addIso(d.date, 7 * (n - 1));
    return { n: n + '주', v: v === null ? '' : v === 0 ? '·' : String(v), bg: v === null ? 'transparent' : c.bg, fg: c.fg, bd: n === d.week ? '2px solid #1F4E3D' : v === null ? '1px dashed #D9D3C6' : '1px solid transparent', tag: d.marks[n] || '', range: md(st) + '~' + md(addIso(st, 6)), title: n + '주차 · ' + md(st) + '~' + md(addIso(st, 6)) + (v === null ? ' · 아직' : ' · 폐사 ' + v + '두') };
  }) }));
  const sched: [string, string][] = [['첫출하예정', d.sold > 0 ? '출하 중' : md(d.first) + (d.firstOver > 0 ? ' (' + d.firstOver + '일 경과)' : '')], ['출하종료', md(addIso(d.first, T.shipPeriodDays))], ['다음 전입', md(addIso(d.first, T.shipPeriodDays + T.emptyDays))], ['마지막 출하', d.last ? md(d.last) + ' (' + d.since + '일 전)' : '없음'], ['예상 출하두수', fmt(d.exp) + '두']];
  const on = isPlanned(d);
  const lg = '36px 46px 52px 44px 40px 44px 46px 46px';
  return (
    <aside className="card" style={{ flex: '1 1 340px', maxWidth: 460, minWidth: 0, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
        <div><div style={{ fontSize: 20, fontWeight: 700 }}>{d.farm} {d.group}</div><div className="muted small">{(d.dong === '—' ? '동 없이 관리' : d.dong) + ' · 전입 ' + md(d.date) + ' · ' + d.week + '주차 · ' + d.age + '일령'}</div></div>
        <button className="btn sm ghost" onClick={() => set({ det: null })} aria-label="상세 닫기">닫기</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
        {idx > 0 && <button className="btn sm ghost" onClick={() => set({ det: order[idx - 1] })}>‹ 이전 그룹</button>}
        <span className="muted small" style={{ flex: 1, textAlign: 'center' }}>{idx >= 0 ? idx + 1 + ' / ' + order.length : ''}</span>
        {idx >= 0 && idx < order.length - 1 && <button className="btn sm ghost" onClick={() => set({ det: order[idx + 1] })}>다음 그룹 ›</button>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <button className={on ? 'btn pri' : 'btn'} onClick={togglePlan(d)}>{on ? '이번 달 정산예정 ✓' : '이번 달 정산예정에 추가'}</button>
        <span className="muted small">{d.rec ? '추천: ' + d.recWhy : ''}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 14 }}>
        {kpis.map(([l, v, x]) => <div key={l} style={{ background: '#F7F5F0', borderRadius: 8, padding: '10px 12px' }}><div className="muted" style={{ fontSize: 12 }}>{l}</div><div style={{ fontSize: 18, fontWeight: 700 }}>{v}</div><div className="sub">{x}</div></div>)}
      </div>
      {d.warn.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>{d.warn.map((w) => <span key={w} className="chip warn">{w}</span>)}</div>}
      <div className="b" style={{ margin: '16px 0 6px' }}>주차별 폐사</div>
      {months.map((m) => (
        <div key={m.label} style={{ display: 'grid', gridTemplateColumns: '58px repeat(4, minmax(0, 1fr))', gap: 5, alignItems: 'stretch', marginBottom: 5 }}>
          <div className="small b" style={{ alignSelf: 'center' }}>{m.label}</div>
          {m.cells.map((c) => (
            <div key={c.n} title={c.title} style={{ background: c.bg, color: c.fg, border: c.bd, borderRadius: 8, padding: '5px 4px', textAlign: 'center', boxSizing: 'border-box', minHeight: 58, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700 }}>{c.n}</div><div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>{c.v}</div><div style={{ fontSize: 10 }}>{c.range} {c.tag}</div>
            </div>
          ))}
        </div>
      ))}
      <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{d.wkDiff > 0 ? '주차 기록 합 ' + d.wkSum + '두 · 피그온 ' + d.death + '두 (주차 미기록 ' + d.wkDiff + '두)' : '주차 기록 합 ' + d.wkSum + '두 = 피그온'}</div>
      <div className="b" style={{ margin: '16px 0 6px' }}>일정</div>
      {sched.map(([l, v]) => <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '5px 0', borderBottom: '1px solid #EFEBE3' }}><span className="muted">{l}</span><b>{v}</b></div>)}
      <div className="b" style={{ margin: '16px 0 6px' }}>차수 (전입현황)</div>
      <div className="tblbox"><div style={{ minWidth: 380 }}>
        <div className="gr gh small muted" style={{ gridTemplateColumns: lg }}><div>차수</div><div>전입일</div><div className="r">두수</div><div className="r">클레임</div><div className="r">일령</div><div className="r">평체</div><div>구충</div><div>FMD</div></div>
        {d.lots.map((l, i) => <div key={i} className="gr small" style={{ gridTemplateColumns: lg }}><div>{i + 1}차</div><div>{l[0].replace('-', '/')}</div><div className="r">{fmt(l[1])}</div><div className="r">{l[2]}</div><div className="r">{l[3]}</div><div className="r">{l[6]}kg</div><div>{l[5].replace('-', '/')}</div><div>{l[4].replace('-', '/')}</div></div>)}
      </div></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        <button className="btn pri" onClick={() => onDeath(d)}>이 그룹 폐사 입력</button>
        <a className="btn" href={'#/share?farm=' + encodeURIComponent(d.farm)} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>농장 공유 화면</a>
      </div>
    </aside>
  );
}
