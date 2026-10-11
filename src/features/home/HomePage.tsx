// 홈 — KPI 4개, 이번 달 정산예정, 이번 주 작업(완료 토글), 농장별 현황 (목업 v5)
import { useHerd, useUi } from '@/lib/ui';
import { agg, buildTasks, TODAY } from '@/lib/calc/herd';
import { addIso, fmt, md, r1 } from '@/lib/calc/dates';
import { Grid, Lnk, Num, sortRows, useSorts, type Col } from '@/components/v5';

export function HomePage() {
  const { all, farms, rows, passFarm, isPlanned, togglePlan, s, saved, save } = useHerd();
  const { go } = useUi();
  const sorts = useSorts();
  if (!all.length) return null;

  // 작업 알림: 이번 주(오늘~+6일)와 지난 7일
  const tasks = buildTasks(rows);
  const today = TODAY.slice(5), weekEnd = addIso(TODAY, 6).slice(5), weekAgo = addIso(TODAY, -7).slice(5);
  const week = tasks.filter((t) => t.d >= today && t.d <= weekEnd);
  const past = tasks.filter((t) => t.d >= weekAgo && t.d < today);
  const isDone = (k: string) => !!saved.done[k];
  const toggleDone = (k: string) => save({ done: { ...saved.done, [k]: !isDone(k) } });
  const allPastDone = () => { const d = { ...saved.done }; past.forEach((t) => { d[t.key] = true; }); save({ done: d }); };

  const farmAgg = farms.filter(passFarm).map((f) => { const g = all.filter((r) => r.farm === f); const low = g.filter((r) => r.bad); return { ...agg(g), name: f, groups: g.length, low, bad: low.length > 0 }; });
  type FA = (typeof farmAgg)[number];
  const fCols: Col<FA>[] = [
    { k: 'name', l: '농장', w: 'minmax(84px,1fr)', sv: (f) => f.name },
    { k: 'stock', l: '재고', w: '84px', num: true, sv: (f) => f.stock },
    { k: 'groups', l: '그룹', w: '56px', num: true, sv: (f) => f.groups },
    { k: 'mort', l: '폐사율', w: '72px', num: true, sv: (f) => f.mort },
    { k: 'surv', l: '육성률', w: '72px', num: true, sv: (f) => f.surv },
    { k: 'bad', l: '상태', w: '64px', sv: (f) => (f.bad ? 0 : 1) },
    { k: 'low', l: '94% 미만 그룹', w: 'minmax(150px,1.6fr)', sv: (f) => f.low.length }
  ];
  const totStock = rows.reduce((a, r) => a + r.stock, 0), totDeath = rows.reduce((a, r) => a + r.death, 0), totNet = rows.reduce((a, r) => a + r.net, 0);
  const warnRows = rows.filter((r) => r.warn.length);
  const planList = rows.filter(isPlanned).sort((a, b) => b.prog - a.prog);
  const goDet = (who: string) => go('/herd', { det: who });

  const TaskRow = ({ t, small }: { t: (typeof tasks)[number]; small?: boolean }) => {
    const on = isDone(t.key);
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '52px minmax(0, 1fr) 88px 86px', gap: 10, alignItems: 'center', padding: small ? 8 : '10px 8px', borderBottom: '1px solid #EFEBE3', borderRadius: 6, background: on ? '#E1F0E7' : 'transparent' }}>
        <div className={small ? '' : 'b'}>{t.d.replace('-', '/')}</div>
        <div style={{ textDecoration: on ? 'line-through' : 'none' }}><div className={small ? 'b small' : 'b'}>{t.who}</div><div className={small ? 'sub' : 'small muted'}>{t.job}</div></div>
        <div className={'r' + (small ? ' small' : '')}><b>{t.heads}</b><div className="sub">{t.sub}</div></div>
        <div className="r"><button className={on ? 'btn pri sm' : 'btn sm'} onClick={() => toggleDone(t.key)}>{on ? '완료 ✓' : '완료'}</button></div>
      </div>
    );
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 12 }}>
        <button className="kpi" onClick={() => go('/herd')}><div className="muted small">재고 · {farmAgg.length}개 농장</div><div style={{ fontSize: 28, fontWeight: 700 }}>{fmt(totStock)}두</div><div className="muted" style={{ fontSize: 12 }}>{rows.length}개 그룹 · 돈수불 10/9 · 돈군 보기 →</div></button>
        <button className="kpi" onClick={() => go('/herd', { fSel: null, fStatus: 'bad', warnOnly: false, stage: 'all', hView: 'table' })}><div className="muted small">문제 농장 (육성률 94% 미만 그룹)</div><div style={{ fontSize: 28, fontWeight: 700, color: '#9A3216' }}>{farmAgg.filter((f) => f.bad).length}개</div><div className="muted" style={{ fontSize: 12 }}>평균 폐사율 {totNet ? r1((totDeath / totNet) * 100) : 0}% · 문제 그룹 보기 →</div></button>
        <button className="kpi" onClick={() => go('/analysis', { anTab: 'warn' })}><div className="muted small">출하지연 · 경고</div><div style={{ fontSize: 28, fontWeight: 700, color: '#7A4F00' }}>{warnRows.length}개 그룹</div><div className="muted" style={{ fontSize: 12 }}>일령 · 출하 멈춤 · 첫출하 경과 →</div></button>
        <div className="kpi" style={{ cursor: 'default' }}><div className="muted small">이번 주 작업 ({md(TODAY)}~{md(addIso(TODAY, 6))})</div><div style={{ fontSize: 28, fontWeight: 700 }}>{week.filter((t) => isDone(t.key)).length} / {week.length}건</div><div className="muted" style={{ fontSize: 12 }}>완료 / 전체 · 구제역 · 구충 · 사료변경</div></div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <h2 className="h2">이번 달 정산예정 · {planList.length}개 그룹 <span className="muted small" style={{ fontWeight: 400 }}>재고 {fmt(planList.reduce((a, r) => a + r.stock, 0))}두</span></h2>
          <span className="muted small">돈군 표의 '정산' 체크 또는 그룹 상세에서 추가 · 줄을 누르면 상세</span>
        </div>
        {planList.length === 0 ? <div className="muted small" style={{ padding: '10px 0' }}>정산예정 그룹이 없습니다. 돈군 표에서 '정산'을 체크하면 여기에 나옵니다.</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: 10 }}>
            {planList.map((p) => (
              <div key={p.who} className="rowx" style={{ border: '1px solid #E2DDD2', borderRadius: 10, padding: '12px 14px', background: '#FBFAF7' }}>
                <button className="rowhit" onClick={() => goDet(p.who)} aria-label={p.who + ' 상세 열기'} title={p.who + ' 상세 열기'} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><b style={{ fontSize: 16 }}>{p.who}</b><span className={p.rec ? 'chip ok' : 'chip info'}>{p.rec ? p.recWhy : '직접 추가'}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}><div className="pbar" style={{ flex: 1 }}><div style={{ width: Math.max(2, p.prog) + '%' }} /></div><b className="small">{p.prog}%</b></div>
                <div className="muted small" style={{ marginTop: 6 }}>출하 {fmt(p.sold)} · 재고 {fmt(p.stock)} · {p.last ? '마지막 출하 ' + md(p.last) : '출하 전'}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button className="btn sm fg" onClick={() => go('/report', { rpTab: 'settle', sGroup: p.who })}>정산자료</button>
                  <button className="btn sm ghost fg" onClick={togglePlan(p)}>정산예정에서 빼기</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(460px, 100%), 1fr))', gap: 16, marginTop: 16 }}>
        <div className="card">
          <h2 className="h2" style={{ marginBottom: 10 }}>이번 주 작업</h2>
          {week.length === 0 && <div className="muted small" style={{ padding: '8px 0' }}>이번 주 작업 대상이 없습니다.</div>}
          {week.map((t) => <TaskRow key={t.key} t={t} />)}
          {past.length > 0 && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 18 }}>
                <div className="b">지난 7일 · 미완료 {past.filter((t) => !isDone(t.key)).length} / {past.length}건</div>
                <button className="btn sm ghost" onClick={allPastDone}>모두 완료 처리</button>
              </div>
              {past.map((t) => <TaskRow key={t.key} t={t} small />)}
            </>
          )}
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>완료를 누르면 초록색, 다시 누르면 미완료로 돌아갑니다. 완료 표시는 저장됩니다.</div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}><h2 className="h2">농장별 현황</h2><span className="muted small">제목을 누르면 정렬 · 농장 이름을 누르면 돈군으로</span></div>
          <Grid cols={fCols} sort={sorts.of('farms')} onSort={(k) => sorts.cycle('farms', k)} minW="560px" rows={sortRows(sorts.of('farms'), fCols, farmAgg).map((f) => ({
            key: f.name, aria: f.name + ' 돈군 보기', onClick: () => go('/herd', { fSel: [f.name], exp: { ...s.exp, [f.name]: true } }),
            cells: [<Lnk v={f.name} />, <Num v={fmt(f.stock)} />, <Num v={f.groups} />, <Num v={f.mort + '%'} />, <Num v={f.surv + '%'} />, <span className={f.bad ? 'chip bad' : 'chip ok'}>{f.bad ? '문제' : '정상'}</span>, <span className="small">{f.low.length ? f.low.map((r) => r.group + ' ' + r.surv + '%').join(', ') : '—'}</span>]
          }))} />
        </div>
      </div>
    </>
  );
}
