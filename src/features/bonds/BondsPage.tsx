// 농장채권 — 선급금(일반·시설·장기보증금)과 월대선급금(그룹별 미정산), 이번 정산 상계 예정을 농장별로 한눈에.
// 파일 2개를 올려 갱신: 채권채무-선급금 정리파일 / 위탁수수료-월대선급금 정리파일
import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { useHerd } from '@/lib/ui';
import { useSettle } from '@/lib/useSettle';
import { makeResolver } from '@/lib/names';
import { owing, parseFeedBin, parseLoans, parseMonthly, ST_LABEL, type Loan, type MSt } from '@/lib/bonds';
import { fmt, md } from '@/lib/calc/dates';
import { nowIso } from '@/lib/util';
import { useIsPhone } from '@/lib/useIsPhone';

const won = (n: number) => fmt(Math.round(n));
const kst = (iso: string) => md(new Date(Date.parse(iso) + 9 * 3600e3).toISOString().slice(0, 10));
const man = (n: number) => (n ? fmt(Math.round(n / 1e4)) : '—');
const KIND = (k: string) => (k.includes('시설') ? '시설' : k.includes('일반') ? '일반' : '기타');
const ST_CLS: Record<MSt, string> = { unpaid: 'chip warn', pending: 'chip info', returned: 'chip bad', done: 'chip ok', unknown: 'chip' };

export function BondsPage() {
  const { repo } = useAuth();
  const { data, up } = useData();
  const { all, farms, saved, save, isPlanned } = useHerd();
  const { loanPlan, offsetOf } = useSettle();
  const phone = useIsPhone();
  const r1 = useRef<HTMLInputElement>(null), r2 = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState('');
  const [exp, setExp] = useState<Record<string, boolean>>({});
  const [edit, setEdit] = useState<string | null>(null);
  const [val, setVal] = useState('');
  const [showDone, setShowDone] = useState<Record<string, boolean>>({});

  const rf = () => makeResolver(farms, data?.nameMap);
  const upLoan = async (f: File) => {
    setBusy('loan'); setMsg(null);
    try {
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
      const n = wb.SheetNames.find((x) => x.includes('선급금')) ?? wb.SheetNames[0];
      const r = parseLoans(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: true }) as unknown[][], rf());
      await repo!.put('config', 'bondLoan', { file: f.name, at: nowIso(), base: r.base, rows: JSON.stringify(r.rows) });
      setMsg({ ok: true, t: `선급금 ${r.rows.length}건 반영 (기준일 ${r.base || '—'})` });
    } catch (e) { setMsg({ ok: false, t: (e as Error).message }); } finally { setBusy(''); }
  };
  const upMonthly = async (f: File) => {
    setBusy('monthly'); setMsg(null);
    try {
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellStyles: true });
      const n = wb.SheetNames.find((x) => x.includes('월대')); if (!n) throw new Error("'월대사육비' 시트가 없습니다 — 위탁수수료-월대선급금 정리파일인지 확인하세요");
      const rows = parseMonthly(wb.Sheets[n], rf());
      const bn = wb.SheetNames.find((x) => x.includes('피드빈'));
      const bins = bn ? parseFeedBin(XLSX.utils.sheet_to_json(wb.Sheets[bn], { header: 1, defval: '', raw: true }) as unknown[][], rf()) : [];
      await repo!.put('config', 'bondMonthly', { file: f.name, at: nowIso(), rows: JSON.stringify(rows), bins: JSON.stringify(bins) });
      setMsg({ ok: true, t: `월대 ${rows.length}개 그룹 반영${bins.length ? ` · 피드빈 ${bins.length}건` : ''}` });
    } catch (e) { setMsg({ ok: false, t: (e as Error).message }); } finally { setBusy(''); }
  };

  const loans = up.loans.rows, mon = up.monthly.rows, bins = up.monthly.bins;
  const F = useMemo(() => {
    const names = [...new Set([...loans.map((l) => l.farm), ...mon.map((m) => m.farm)])].sort((a, b) => farms.indexOf(a) - farms.indexOf(b));
    return names.map((f) => {
      const L = loans.filter((l) => l.farm === f), M = mon.filter((m) => m.farm === f);
      const by = (k: string) => L.filter((l) => KIND(l.kind) === k).reduce((a, l) => a + l.balance, 0);
      const mOwe = M.flatMap((m) => m.cells).filter((c) => owing(c.st)).reduce((a, c) => a + c.amt, 0);
      const gen = by('일반'), fac = by('시설'), etc = by('기타');
      const plan = all.filter((g) => g.farm === f && isPlanned(g)).reduce((a, g) => a + offsetOf(g).total, 0);
      return { f, L, M, gen, fac, etc, mOwe, sum: gen + fac + etc + mOwe, plan, bin: bins.filter((b) => b.farm === f) };
    });
  }, [loans, mon, bins, farms, all, isPlanned, offsetOf]);
  const T = F.reduce((a, x) => ({ gen: a.gen + x.gen, fac: a.fac + x.fac, etc: a.etc + x.etc, mOwe: a.mOwe + x.mOwe, sum: a.sum + x.sum, plan: a.plan + x.plan }), { gen: 0, fac: 0, etc: 0, mOwe: 0, sum: 0, plan: 0 });
  const setPlan = (l: Loan, v: number | null) => { const m = { ...(saved.bondPlan ?? {}) }; if (v === null) delete m[l.key]; else m[l.key] = v; save({ bondPlan: m }); };
  const col = 'minmax(90px,1fr) repeat(5, minmax(76px, 110px)) minmax(90px, 120px)';

  return (
    <>
      <div className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <h2 className="h2" style={{ flex: 1 }}>파일로 갱신</h2>
          <input ref={r1} type="file" accept=".xlsx,.xls" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upLoan(f); e.target.value = ''; }} />
          <input ref={r2} type="file" accept=".xlsx,.xls" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upMonthly(f); e.target.value = ''; }} />
          <button className="btn sm" disabled={!!busy} onClick={() => r1.current?.click()}>{busy === 'loan' ? '읽는 중…' : '채권채무-선급금 파일'}</button>
          <button className="btn sm" disabled={!!busy} onClick={() => r2.current?.click()}>{busy === 'monthly' ? '읽는 중…' : '위탁수수료-월대선급금 파일'}</button>
        </div>
        <div className="muted small" style={{ marginTop: 6, display: 'grid', gap: 2 }}>
          <span>선급금: {up.loans.doc ? `${up.loans.doc.file} · 기준일 ${up.loans.doc.base || '—'} · ${kst(up.loans.doc.at)} 올림` : '아직 안 올림'}</span>
          <span>월대: {up.monthly.doc ? `${up.monthly.doc.file} · ${kst(up.monthly.doc.at)} 올림 (칸 색으로 미정산·정산완료 구분)` : '아직 안 올림'}</span>
        </div>
        {msg && <div className={msg.ok ? 'chip ok' : 'chip bad'} style={{ marginTop: 8, whiteSpace: 'normal' }}>{msg.t}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginTop: 12 }}>
          {([['채권 합계', T.sum], ['일반 선급금', T.gen], ['시설 선급금', T.fac], ['월대 미정산', T.mOwe], ['상계 예정', T.plan]] as const).map(([l, v], i) => (
            <div key={l} style={{ background: i === 4 ? '#E6EFE9' : '#F7F5F0', borderRadius: 10, padding: '10px 12px', minWidth: 0 }}>
              <div className="muted small" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l}</div><div style={{ fontSize: 20, fontWeight: 700 }}>{man(v)}<span style={{ fontSize: 12, fontWeight: 400 }}>만원</span></div>
            </div>))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 className="h2" style={{ marginBottom: 8 }}>농장별 채권 · 상계</h2>
        {F.length === 0 && <div className="muted">위 두 파일을 올리면 담당농장 채권이 여기 나옵니다.</div>}
        {!phone && F.length > 0 && <div className="gr gh small muted" style={{ gridTemplateColumns: col }}><div>농장</div><div className="r">일반</div><div className="r">시설</div><div className="r">기타</div><div className="r">월대 미정산</div><div className="r b">채권 합계</div><div className="r">상계 예정</div></div>}
        {F.map((x) => (
          <div key={x.f} style={{ borderBottom: '1px solid #EFEBE3' }}>
            <button onClick={() => setExp({ ...exp, [x.f]: !exp[x.f] })} aria-expanded={!!exp[x.f]} className={phone ? '' : 'gr'} style={{ width: '100%', gridTemplateColumns: col, display: phone ? 'flex' : undefined, alignItems: 'center', gap: 8, background: exp[x.f] ? '#EEF3EF' : 'transparent', border: 0, font: 'inherit', textAlign: 'left', color: 'inherit', cursor: 'pointer', padding: phone ? '12px 4px' : undefined, minHeight: 48 }}>
              {phone ? (<>
                <span style={{ width: 14, color: '#8A877E' }}>{exp[x.f] ? '▾' : '▸'}</span>
                <div style={{ flex: 1, minWidth: 0 }}><b>{x.f}</b><div className="muted" style={{ fontSize: 12 }}>일반 {man(x.gen)} · 시설 {man(x.fac)}{x.etc ? ' · 기타 ' + man(x.etc) : ''} · 월대 {man(x.mOwe)}</div></div>
                <div style={{ textAlign: 'right' }}><b>{man(x.sum)}만</b><div className="muted" style={{ fontSize: 12 }}>상계 {man(x.plan)}만</div></div>
              </>) : (<>
                <div><b>{exp[x.f] ? '▾ ' : '▸ '}{x.f}</b></div><div className="r">{man(x.gen)}</div><div className="r">{man(x.fac)}</div><div className="r">{man(x.etc)}</div><div className="r">{man(x.mOwe)}</div><div className="r b">{man(x.sum)}</div><div className="r" style={{ color: x.plan ? '#1F4E3D' : undefined, fontWeight: x.plan ? 700 : 400 }}>{man(x.plan)}</div>
              </>)}
            </button>
            {exp[x.f] && (
              <div style={{ padding: '8px 4px 14px', display: 'grid', gap: 14 }}>
                {x.L.length > 0 && (
                  <div>
                    <div className="b small" style={{ marginBottom: 6 }}>선급금 (단위 원)</div>
                    {x.L.map((l) => { const p = loanPlan(l); return (
                      <div key={l.key} style={{ display: 'grid', gridTemplateColumns: phone ? '1fr' : 'minmax(160px,1.2fr) minmax(200px,2fr) minmax(170px,1fr)', gap: 8, padding: '8px 0', borderTop: '1px solid #F1EEE6', alignItems: 'center' }}>
                        <div><span className="chip info">{KIND(l.kind) === '기타' ? l.kind : KIND(l.kind)}</span> <b>{won(l.balance)}</b><div className="muted" style={{ fontSize: 12 }}>{l.date} 지급 {won(l.orig)} · 회수 {won(l.recovered)}</div></div>
                        <div className="small" style={{ minWidth: 0 }}>{l.note || <span className="muted">상계 조건 없음</span>}</div>
                        <div style={{ textAlign: phone ? 'left' : 'right' }}>
                          {edit === l.key ? (
                            <span style={{ display: 'inline-flex', gap: 6 }}><input aria-label="상계 예정액" inputMode="numeric" value={val} onChange={(e) => setVal(e.target.value)} style={{ width: 120, minHeight: 36 }} /><button className="btn sm pri" onClick={() => { setPlan(l, Math.max(0, Number(val.replace(/[^\d]/g, '')) || 0)); setEdit(null); }}>저장</button></span>
                          ) : (
                            <button className="btn sm ghost" onClick={() => { setEdit(l.key); setVal(String(p.amt)); }} title="눌러서 고치기">상계 {won(p.amt)}</button>
                          )}
                          <div className="muted" style={{ fontSize: 11 }}>{p.how}{saved.bondPlan?.[l.key] !== undefined && <button className="lnk" style={{ fontSize: 11, marginLeft: 6 }} onClick={() => setPlan(l, null)}>자동으로</button>}</div>
                        </div>
                      </div>
                    ); })}
                  </div>
                )}
                {x.M.length > 0 && (
                  <div>
                    <div className="b small" style={{ marginBottom: 6 }}>월대선급금 (그룹별, 단위 만원)</div>
                    {[...x.M].filter((m) => showDone[x.f] || m.cells.some((c) => owing(c.st))).sort((a, b) => (a.group || 'zz').localeCompare(b.group || 'zz', 'ko', { numeric: true })).map((m, i) => { const o = m.cells.filter((c) => owing(c.st)).reduce((a, c) => a + c.amt, 0); const g = all.find((z) => z.farm === m.farm && z.group === m.group); return (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderTop: '1px solid #F1EEE6', flexWrap: 'wrap', opacity: o ? 1 : 0.6 }}>
                        <b style={{ width: 70 }}>{m.group || '분할'}</b>
                        <div style={{ flex: 1, display: 'flex', gap: 4, flexWrap: 'wrap', minWidth: 0 }}>{m.cells.map((c) => <span key={c.m} className={ST_CLS[c.st]} title={ST_LABEL[c.st]} style={{ fontSize: 11, fontWeight: 400 }}>{c.m.slice(2).replace('-', '.')} {man(c.amt)}{c.st !== 'done' ? ' ' + ST_LABEL[c.st] : ''}</span>)}</div>
                        <div style={{ textAlign: 'right', minWidth: 110 }}>{o ? <b>{man(o)}만 미정산</b> : <span className="muted small">정산 끝</span>}{g && isPlanned(g) && o > 0 && <div className="small" style={{ color: '#1F4E3D' }}>정산예정 → 상계</div>}</div>
                      </div>
                    ); })}
                    {x.M.some((m) => !m.cells.some((c) => owing(c.st))) && <button className="lnk" style={{ fontSize: 13, marginTop: 6 }} onClick={() => setShowDone({ ...showDone, [x.f]: !showDone[x.f] })}>{showDone[x.f] ? '정산 끝난 그룹 숨기기' : `정산 끝난 그룹 ${x.M.filter((m) => !m.cells.some((c) => owing(c.st))).length}개 보기`}</button>}
                  </div>
                )}
                {x.bin.length > 0 && <div className="small muted">피드빈 설치대금 {x.bin.map((b) => `${won(b.amount)}원 (${b.date} 지급, ${b.until}까지 거래하면 회수 없음)`).join(' · ')}</div>}
                {all.filter((g) => g.farm === x.f && isPlanned(g)).length > 0 && (
                  <div style={{ background: '#F3F8F4', borderRadius: 8, padding: '8px 10px' }}>
                    <div className="b small" style={{ marginBottom: 4 }}>정산예정 그룹 상계 (원)</div>
                    {all.filter((g) => g.farm === x.f && isPlanned(g)).map((g) => { const o = offsetOf(g); return (
                      <div key={g.who} style={{ display: 'flex', gap: 10, fontSize: 14, padding: '2px 0', flexWrap: 'wrap' }}><b style={{ width: 60 }}>{g.group}</b><span>월대 {won(o.monthly)}</span><span>선급금 {won(o.loan)}</span><b style={{ marginLeft: 'auto' }}>계 {won(o.total)}</b></div>
                    ); })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {F.length > 0 && !phone && <div className="gr gh b" style={{ gridTemplateColumns: col, borderTop: '1px solid #D9D3C6' }}><div>합계 (만원)</div><div className="r">{man(T.gen)}</div><div className="r">{man(T.fac)}</div><div className="r">{man(T.etc)}</div><div className="r">{man(T.mOwe)}</div><div className="r">{man(T.sum)}</div><div className="r">{man(T.plan)}</div></div>}
      </div>
    </>
  );
}
