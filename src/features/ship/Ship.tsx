// 출하 — 등급판정서 올리기(그룹 분할·재고 차감) + 출하 현황(필터·합계·건별) + 출하실적종합 대조
import { useEffect, useMemo, useRef, useState } from 'react';
import { takeInbox } from '@/lib/inbox';
import * as XLSX from 'xlsx';
import { useHerd } from '@/lib/ui';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { parseGradeSheet, segRows, segsByTrace, type GradeSheet, type Seg } from '@/lib/gradeSheet';
import { SHIP } from '@/data/snapshot';
import { shortDest, estPay, pendingImports, shipBase, baseHas, shipKey } from '@/lib/calc/ship';
import { parseShipImport, type ShipImport } from '@/lib/shipImport';
import { makeResolver } from '@/lib/names';
import { fmt, md, r1 } from '@/lib/calc/dates';
import type { ManualShip } from '@/data/types';
import { ShipManualButton } from './ShipManual';
import { Sheet } from '@/components/Sheet';
import { useIsPhone, thisMonth } from '@/lib/useIsPhone';

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const wd = (d: string) => WD[new Date(d + 'T00:00:00Z').getUTCDay()];
const DESTS = [...new Set(SHIP.map((x) => x[2]))].filter((d) => !d.includes('중단')).sort((a, b) => shortDest(a).localeCompare(shortDest(b), 'ko'));

export function ShipUpload() {
  const { all, farms, ships } = useHerd();
  const { data } = useData();
  const { repo, email, name } = useAuth();
  const ref = useRef<HTMLInputElement>(null);
  const [sh, setSh] = useState<GradeSheet | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [farm, setFarm] = useState('');
  const [date, setDate] = useState('');
  const [dest, setDest] = useState('');
  const [weigh, setWeigh] = useState('');
  const [segs, setSegs] = useState<Seg[]>([]);
  const [cut, setCut] = useState('');
  const [busy, setBusy] = useState(false);

  const groupsOf = (f: string) => all.filter((r) => r.farm === f).sort((a, b) => (a.date < b.date ? -1 : 1));
  const defGroup = (f: string) => (groupsOf(f).find((r) => r.stock > 0 && r.sold > 0) ?? groupsOf(f).find((r) => r.stock > 0) ?? groupsOf(f)[0])?.group ?? '';
  const resolveFarm = (shipper: string) => {
    if (farms.includes(shipper)) return shipper;
    const m = (data?.nameMap ?? []).find((x) => !x.excluded && x.target && (x.source === shipper || x.source.replace(/\(.*\)/, '') === shipper));
    if (m && farms.includes(m.target)) return m.target;
    return farms.find((f) => shipper.includes(f)) ?? '';
  };
  const lastDest = (f: string) => SHIP.filter((x) => x[1] === f).sort((a, b) => (a[0] < b[0] ? 1 : -1))[0]?.[2] ?? DESTS[0];

  const onFile = async (file: File) => {
    setErr(''); setMsg(''); setSh(null);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
      let g: GradeSheet | null = null, last = '';
      for (const n of wb.SheetNames) { try { g = parseGradeSheet(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: true }) as unknown[][], file.name); break; } catch (e) { last = String((e as Error).message); } }
      if (!g) throw new Error(last || '읽을 수 없는 파일');
      const f = resolveFarm(g.shipper);
      setSh(g); setFarm(f); setDate(g.date); setDest(f ? lastDest(f) : DESTS[0]); setWeigh('');
      setSegs(segsByTrace(g.rows, f ? defGroup(f) : ''));
      return true;
    } catch (e) { setErr('등판서를 읽지 못했습니다: ' + (e as Error).message); return false; }
  };

  // 폰 '공유'로 받은 엑셀: 등판서면 여기서, 아니면 출하 자료 올리기로 넘김
  useEffect(() => { const h = (e: Event) => { if ((e as CustomEvent).detail === 'grade') ref.current?.click(); }; addEventListener('ship-open', h); return () => removeEventListener('ship-open', h); }, []);
  useEffect(() => { takeInbox('sheet').then(async (L) => { for (const f of L) { const ok = await onFile(f); if (!ok) { setErr(''); window.dispatchEvent(new CustomEvent('ship-import-file', { detail: f })); } } }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const S = sh ? segRows(sh.rows, segs) : [];
  const n = sh?.rows.length ?? 0, carc = S.reduce((a, x) => a + x.carc, 0), W = Number(weigh);
  const dup = sh && ships.some((x) => x.kind === 'grade' && x.file === sh.file && x.date === date && x.farm === farm);
  // 같은 농장·출하일에 직접 입력해 둔 출하 → 등판서로 바꿔 저장 (계근중량·그룹을 거기서 가져옴)
  const match = sh && farm && date ? ships.filter((x) => x.kind !== 'grade' && x.farm === farm && x.date === date) : [];
  const matchKey = match.map((x) => x.id).join(',');
  useEffect(() => {
    if (!match.length) return;
    setWeigh(String(r1(match.reduce((a, x) => a + x.live, 0))));
    const g = [...match].sort((a, b) => b.n - a.n)[0].group;
    if (g) setSegs((L) => L.map((x) => ({ ...x, group: g })));
  }, [matchKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const summ = (k: 'g1p' | 'g1' | 'g2' | 'out') => S.reduce((a, x) => a + x[k], 0);

  const addCut = () => {
    if (!sh) return;
    const i = sh.rows.findIndex((r) => r.no === cut.trim());
    if (i <= 0) return setErr('나눌 도체번호를 목록에서 찾지 못했습니다 (첫 번호 제외)');
    if (segs.some((s) => s.start === i)) return setErr('이미 나눠진 번호입니다');
    const prev = [...segs].sort((a, b) => a.start - b.start).filter((s) => s.start < i).pop();
    setSegs([...segs, { start: i, group: prev?.group ?? defGroup(farm) }]); setCut(''); setErr('');
  };
  const save = async () => {
    if (!sh) return;
    if (!farm) return setErr('농장을 고르세요');
    if (!date) return setErr('판정일(출하일)을 넣으세요');
    if (!(W > 0)) return setErr('계근중량(생체 kg)을 넣으세요');
    if (S.some((x) => !x.group)) return setErr('모든 구간에 그룹을 배정하세요');
    const yld = (carc / W) * 100;
    if (yld < 60 || yld > 90) return setErr(`지육률이 ${r1(yld)}% — 계근중량을 확인하세요`);
    setBusy(true);
    try {
      const batch = Math.random().toString(36).slice(2, 10);
      for (const x of S) {
        const live = r1((W * x.carc) / carc);
        const rec: Omit<ManualShip, 'id'> = { kind: 'grade', batch, file: sh.file, plant: sh.plant, range: x.from + '~' + x.to, farm, group: x.group, date, dest, n: x.n, live, carc: x.carc, yld: r1((x.carc / live) * 100), pay: null, price: null, g1p: x.g1p, g1: x.g1, g2: x.g2, out: x.out, ...(x.outWhy ? { outWhy: x.outWhy } : {}), lowReason: '', writer: name || email };
        await repo!.add('shipments', rec as any, email);
      }
      for (const m of match) await repo!.remove('shipments', m.id);
      setMsg(`저장됨: ${farm} ${md(date)} ${n}두 — ${S.map((x) => x.group + ' ' + x.n + '두').join(', ')}${match.length ? ` · 직접 입력 ${match.reduce((a, x) => a + x.n, 0)}두를 등판서로 바꿈` : ''}`);
      setSh(null); setSegs([]);
    } catch (e) { setErr('저장하지 못했습니다: ' + String(e)); } finally { setBusy(false); }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 className="h2">등급판정서 올리기</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input ref={ref} type="file" accept=".xls,.xlsx,.csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
          <button className="btn" onClick={() => ref.current?.click()}>파일 선택</button>
          <ShipManualButton />
        </div>
      </div>
      {err && <div style={{ marginTop: 10 }}><span className="chip bad" style={{ whiteSpace: 'normal' }}>{err}</span></div>}
      {msg && <div style={{ marginTop: 10 }}><span className="chip ok" style={{ whiteSpace: 'normal' }}>{msg}</span></div>}
      {sh && (
        <>
          <div style={{ marginTop: 14, padding: '12px 14px', background: '#F4F2EC', borderRadius: 8, fontSize: 14, lineHeight: 1.8 }}>
            <b>{sh.file}</b> · {sh.kind} 양식<br />
            출하자 {sh.shipper || '—'} → <b>{farm || '농장 확인 필요'}</b> · 작업장 {sh.plant || '—'} · {n}두 · 도체중 합계 {fmt(r1(carc))}kg · 이력번호 {new Set(sh.rows.map((r) => r.trace)).size}개
            {dup && <><br /><span className="chip warn">같은 파일을 이미 저장했습니다</span></>}
            {match.length > 0 && <><br /><span className="chip info" style={{ whiteSpace: 'normal' }}>직접 입력한 {md(date)} 출하 {match.map((x) => `${x.group} ${x.n}두·${fmt(x.live)}kg`).join(', ')}와 맞춤 — 저장하면 등판서 성적으로 바뀝니다</span></>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end', marginTop: 16 }}>
            <label style={{ fontSize: 14 }}>농장<br /><select value={farm} onChange={(e) => { setFarm(e.target.value); setDest(lastDest(e.target.value)); setSegs(segs.map((s) => ({ ...s, group: defGroup(e.target.value) }))); }}><option value="">고르세요</option>{farms.map((f) => <option key={f}>{f}</option>)}</select></label>
            <label style={{ fontSize: 14 }}>출하일<br /><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label style={{ fontSize: 14 }}>계근중량 (생체, kg)<br /><input inputMode="decimal" value={weigh} onChange={(e) => { setWeigh(e.target.value.replace(/[^\d.]/g, '')); setErr(''); }} style={{ width: 150 }} /></label>
            <label style={{ fontSize: 14 }}>출하처<br /><select value={dest} onChange={(e) => setDest(e.target.value)}>{DESTS.map((d) => <option key={d} value={d}>{shortDest(d)} · {d}</option>)}</select></label>
            <div style={{ fontSize: 14 }}>평체 <b>{W > 0 ? r1(W / n) + 'kg' : '—'}</b> · 지육률 <b>{W > 0 ? r1((carc / W) * 100) + '%' : '—'}</b> · 등급율 <b>{n ? r1(((summ('g1p') + summ('g1')) / n) * 100) + '%' : '—'}</b></div>
          </div>
          <h2 className="h2" style={{ marginTop: 20 }}>그룹 분할 (도체번호 순서)</h2>
          <div className="tblbox"><table>
            <thead><tr><th>구간</th><th>도체번호</th><th className="r">두수</th><th>배정 그룹</th><th className="r">1+</th><th className="r">1</th><th className="r">2</th><th className="r">등외</th><th className="r">도체중</th><th /></tr></thead>
            <tbody>
              {S.map((x, i) => (
                <tr key={x.start}><td>{i + 1}</td><td>{x.from}~{x.to}</td><td className="r b">{x.n}</td>
                  <td><select aria-label={'구간 ' + (i + 1) + ' 배정 그룹'} value={x.group} onChange={(e) => setSegs(segs.map((s) => (s.start === x.start ? { ...s, group: e.target.value } : s)))}><option value="">고르세요</option>{groupsOf(farm).map((g) => <option key={g.group} value={g.group}>{farm} {g.group} (재고 {fmt(g.stock)})</option>)}</select></td>
                  <td className="r">{x.g1p}</td><td className="r">{x.g1}</td><td className="r">{x.g2}</td><td className="r">{x.out}</td><td className="r">{fmt(x.carc)}</td>
                  <td>{i > 0 && <button className="btn sm ghost" onClick={() => setSegs(segs.filter((s) => s.start !== x.start))}>합치기</button>}</td></tr>
              ))}
            </tbody>
          </table></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <input value={cut} onChange={(e) => setCut(e.target.value)} placeholder="나눌 도체번호" style={{ width: 130 }} list="grade-nos" />
            <datalist id="grade-nos">{sh.rows.slice(1).map((r) => <option key={r.no} value={r.no} />)}</datalist>
            <button className="btn" onClick={addCut}>+ 구간 추가</button>
            <button className="btn" onClick={() => setSegs(segsByTrace(sh.rows, defGroup(farm)))}>이력번호별로 나누기</button>
            <button className="btn" onClick={() => setSegs([{ start: 0, group: defGroup(farm) }])}>한 구간으로</button>
            <button className="btn pri" disabled={busy} onClick={save}>{busy ? '저장 중…' : '저장 (재고 차감)'}</button>
            <button className="btn ghost" onClick={() => { setSh(null); setSegs([]); setErr(''); }}>취소</button>
          </div>
        </>
      )}
    </div>
  );
}

interface Row { key: string; date: string; farm: string; group: string; dest: string; n: number; live: number; carc: number; pay: number | null; payEst: boolean; g1p: number; g1: number; g2: number; out: number; src: '종합' | '등판서' | '직접 입력' | '피그온' | '팀 대시보드' }

export function ShipStatus() {
  const { ships, farms, imports } = useHerd();
  const rows = useMemo<Row[]>(() => {
    const a: Row[] = shipBase().map((x, i) => ({ key: 's' + i, date: x[0], farm: x[1], group: '', dest: x[2], n: x[3], live: x[4], carc: x[5], pay: x[6] > 0 ? r1(x[6] * 100) : null, payEst: false, g1p: x[7], g1: x[8], g2: x[9], out: x[10], src: '종합' }));
    const P = pendingImports(imports), ik = new Set(P.map((r) => shipKey(r.date, r.farm)));
    P.forEach((r, i) => { const pay = r.pay ?? estPay(r.dest, r.date); a.push({ key: 'i' + i, date: r.date, farm: r.farm, group: r.group, dest: r.dest, n: r.n, live: r.live, carc: r.carc > 0 ? r.carc : r.live * 0.77, pay, payEst: r.pay == null && pay != null, g1p: r.g1p, g1: r.g1, g2: r.g2, out: r.out, src: r.src === 'pigon' ? '피그온' : '팀 대시보드' }); });
    ships.filter((m) => !baseHas(m.date, m.farm) && !ik.has(shipKey(m.date, m.farm))).forEach((m) => {
      const pay = m.pay ?? estPay(m.dest, m.date);
      a.push({ key: m.id, date: m.date, farm: m.farm, group: m.group, dest: m.dest, n: m.n, live: m.live, carc: m.carc ?? r1((m.live * m.yld) / 100), pay, payEst: m.pay == null && pay != null, g1p: m.g1p, g1: m.g1, g2: m.g2, out: m.out, src: m.kind === 'grade' ? '등판서' : '직접 입력' });
    });
    return a;
  }, [ships, imports]);
  const months = useMemo(() => [...new Set([thisMonth(), ...rows.map((r) => r.date.slice(0, 7))])].sort().reverse(), [rows]);
  const [mon, setMon] = useState(thisMonth());
  const phone = useIsPhone();
  const [open, setOpen] = useState<string | null>(null);
  const [dest, setDest] = useState('');
  const [farm, setFarm] = useState('');
  const [sort, setSort] = useState<'date' | 'n' | 'avgw' | 'yld'>('date');
  const [desc, setDesc] = useState(true);
  const [more, setMore] = useState(false);
  const L0 = rows.filter((r) => (!mon || r.date.startsWith(mon)) && (!dest || shortDest(r.dest) === dest));
  const byFarm: Record<string, number> = {}; L0.forEach((r) => { byFarm[r.farm] = (byFarm[r.farm] ?? 0) + r.n; });
  const L = L0.filter((r) => !farm || r.farm === farm);
  const val = (r: Row) => (sort === 'date' ? r.date : sort === 'n' ? r.n : sort === 'avgw' ? r.live / r.n : r.carc / r.live);
  L.sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * (desc ? -1 : 1); });
  const N = L.reduce((a, r) => a + r.n, 0), LV = L.reduce((a, r) => a + r.live, 0), C = L.reduce((a, r) => a + r.carc, 0);
  const P = L.filter((r) => r.pay != null && !r.payEst), PC = P.reduce((a, r) => a + r.carc, 0);
  const tiles: [string, string][] = [['두수', fmt(N) + '두'], ['출하 횟수', L.length + '회'], ['출하평체', N ? r1(LV / N) + 'kg' : '—'], ['지급율', PC ? r1(P.reduce((a, r) => a + r.pay! * r.carc, 0) / PC) + '%' : '—'], ['지육율', LV ? r1((C / LV) * 100) + '%' : '—'], ['등급율', N ? r1((L.reduce((a, r) => a + r.g1p + r.g1, 0) / N) * 100) + '%' : '—']];
  const dests = [...new Set(rows.map((r) => shortDest(r.dest)))].sort((a, b) => a.localeCompare(b, 'ko'));
  const g = '96px minmax(110px,1.2fr) 74px 60px 92px 72px 78px 64px 64px 120px';
  const shown = more ? L : L.slice(0, 40);

  // 등판서 묶음 ↔ 출하실적종합 대조
  const checks = useMemo(() => {
    const m: Record<string, { date: string; farm: string; n: number; live: number; file: string }> = {};
    ships.filter((x) => x.kind === 'grade').forEach((x) => { const k = shipKey(x.date, x.farm) + '|' + (x.batch ?? x.id); (m[k] ||= { date: x.date, farm: x.farm, n: 0, live: 0, file: x.file ?? '' }); m[k].n += x.n; m[k].live += x.live; });
    return Object.values(m).sort((a, b) => (a.date < b.date ? 1 : -1)).map((b) => {
      const S = shipBase().filter((x) => x[0] === b.date && x[1] === b.farm);
      const sn = S.reduce((a, x) => a + x[3], 0), sl = S.reduce((a, x) => a + x[4], 0);
      return { ...b, sn, sl, parts: S.map((x) => fmt(x[4])).join('+'), res: !S.length ? '종합 대기' : sn === b.n && Math.abs(sl - b.live) < 1 ? '일치' : '차이' };
    });
  }, [ships]);

  return (
    <>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="hscroll" style={{ alignItems: 'center' }}>
          <select aria-label="월" value={mon} onChange={(e) => setMon(e.target.value)} style={{ minHeight: 38 }}><option value="">기간 전체</option>{months.map((m) => <option key={m} value={m}>{m === thisMonth() ? '이번 달' : m}</option>)}</select>
          <select aria-label="거래처" value={dest} onChange={(e) => setDest(e.target.value)} style={{ minHeight: 38 }}><option value="">거래처 전체</option>{dests.map((d) => <option key={d}>{d}</option>)}</select>
          <select aria-label="정렬" value={sort} onChange={(e) => setSort(e.target.value as any)} style={{ minHeight: 38 }}><option value="date">출하일순</option><option value="n">두수순</option><option value="avgw">평체순</option><option value="yld">지육율순</option></select>
          <button className="btn sm ghost" onClick={() => setDesc(!desc)}>{desc ? '▼' : '▲'}</button>
        </div>
        {Object.keys(byFarm).length > 0 && <div className="hscroll" style={{ marginTop: 8 }}>
          {Object.entries(byFarm).sort((a, b) => b[1] - a[1]).map(([f, n]) => <button key={f} className={farm === f ? 'pill on' : 'pill'} style={{ minHeight: 34, padding: '4px 10px', fontSize: 13 }} onClick={() => setFarm(farm === f ? '' : f)}>{f} {fmt(n)}</button>)}
        </div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 6, marginTop: 10 }}>
          {tiles.map(([l, v]) => <div key={l} style={{ background: '#F7F5F0', borderRadius: 10, padding: '8px 10px', minWidth: 0 }}><div className="muted" style={{ fontSize: 12 }}>{l}</div><div style={{ fontSize: 18, fontWeight: 700, whiteSpace: 'nowrap' }}>{v}</div></div>)}
        </div>
        {L.length === 0 ? <div className="muted" style={{ marginTop: 12 }}>해당하는 출하가 없습니다</div> : phone ? (
          <div style={{ marginTop: 8 }}>
            {(() => { const m = new Map<string, Row[]>(); shown.forEach((r) => { const k = sort === 'date' ? r.date : ''; if (!m.has(k)) m.set(k, []); m.get(k)!.push(r); }); return [...m]; })().map(([d, G]) => (
              <div key={d || 'all'}>
                {d && <div style={{ position: 'sticky', top: 0, zIndex: 1, background: '#fff', display: 'flex', justifyContent: 'space-between', padding: '12px 4px 4px', fontSize: 13, fontWeight: 700, color: wd(d) === '일' ? '#9A3216' : '#6B6A63', borderBottom: '1px solid #E2DDD2' }}><span>{md(d)} ({wd(d)})</span><span>{fmt(G.reduce((a, r) => a + r.n, 0))}두</span></div>}
                {G.map((r) => (
                  <button key={r.key} onClick={() => setOpen(r.key)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px', background: 'transparent', border: 0, borderBottom: '1px solid #EFEBE3', font: 'inherit', textAlign: 'left', color: 'inherit', cursor: 'pointer', minHeight: 52 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{!d && <span className="muted">{md(r.date)} · </span>}<b>{r.farm}</b> {r.group} <span className="muted small">{shortDest(r.dest)}</span></div>
                      <div className="muted" style={{ fontSize: 12 }}>평체 {r1(r.live / r.n)}kg · 지육 {r1((r.carc / r.live) * 100)}% · 등급 {r1(((r.g1p + r.g1) / r.n) * 100)}%{r.pay != null ? ` · 지급 ${r.pay}%${r.payEst ? '(예상)' : ''}` : ''}</div>
                    </div>
                    <b style={{ fontSize: 17 }}>{fmt(r.n)}<span style={{ fontSize: 12, fontWeight: 400 }}>두</span></b>
                  </button>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="gt" style={{ marginTop: 12 }}><div style={{ minWidth: 900 }}>
            <div className="gr gh small muted" style={{ gridTemplateColumns: g }}><div>출하일</div><div>농가 · 그룹</div><div>거래처</div><div className="r">두수</div><div className="r">총생체중</div><div className="r">출하평체</div><div className="r">지급율</div><div className="r">지육율</div><div className="r">등급율</div><div className="r">1+/1/2/등외</div></div>
            {shown.map((r) => (
              <div key={r.key} className="gr" style={{ gridTemplateColumns: g }}>
                <div>{md(r.date)}({wd(r.date)})</div>
                <div><b>{r.farm}</b> {r.group}</div>
                <div className="small">{shortDest(r.dest)}</div>
                <div className="r b">{fmt(r.n)}</div>
                <div className="r">{fmt(Math.round(r.live))}</div>
                <div className="r">{r1(r.live / r.n)}kg</div>
                <div className="r">{r.pay == null ? '—' : r.pay + '%'}{r.payEst && <div className="sub" style={{ fontSize: 11 }}>예상</div>}</div>
                <div className="r">{r1((r.carc / r.live) * 100)}%</div>
                <div className="r">{r1(((r.g1p + r.g1) / r.n) * 100)}%</div>
                <div className="r small">{r.g1p}/{r.g1}/{r.g2}/{r.out}</div>
              </div>
            ))}
          </div></div>
        )}
        {(() => { const r = L.find((x) => x.key === open); return r ? (
          <Sheet title={<>{r.farm} {r.group} <span className="muted" style={{ fontWeight: 400, fontSize: 14 }}>{md(r.date)}({wd(r.date)}) · {fmt(r.n)}두</span></>} onClose={() => setOpen(null)}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, fontSize: 14 }}>
              {([['거래처', shortDest(r.dest)], ['총생체중', fmt(Math.round(r.live)) + 'kg'], ['출하평체', r1(r.live / r.n) + 'kg'], ['지급율', r.pay == null ? '—' : r.pay + '%' + (r.payEst ? ' (예상)' : '')], ['지육율', r1((r.carc / r.live) * 100) + '%'], ['등급율', r1(((r.g1p + r.g1) / r.n) * 100) + '%'], ['1+', String(r.g1p)], ['1 / 2', r.g1 + ' / ' + r.g2], ['등외', String(r.out)]] as const).map(([l, v]) => <div key={l}><div className="muted small">{l}</div><b>{v}</b></div>)}
            </div>
          </Sheet>) : null; })()}
        {!more && L.length > 40 && <button className="btn" style={{ marginTop: 10 }} onClick={() => setMore(true)}>{L.length - 40}건 더 보기</button>}
      </div>
      {checks.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 className="h2">출하실적종합 대조</h2>
          <div className="tblbox"><table>
            <thead><tr><th>출하일</th><th>농장</th><th className="r">두수</th><th className="r">계근중량(입력)</th><th className="r">생체중(종합)</th><th>결과</th></tr></thead>
            <tbody>{checks.map((c, i) => <tr key={i}><td>{md(c.date)}</td><td>{c.farm}</td><td className="r">{c.n}{c.sn && c.sn !== c.n ? ' / ' + c.sn : ''}</td><td className="r">{fmt(r1(c.live))}</td><td className="r">{c.sl ? fmt(c.sl) + (c.parts.includes('+') ? ' (' + c.parts + ')' : '') : '—'}</td><td><span className={c.res === '일치' ? 'chip ok' : c.res === '차이' ? 'chip bad' : 'chip warn'}>{c.res}</span></td></tr>)}</tbody>
          </table></div>
        </div>
      )}
    </>
  );
}

// 출하 자료 올리기 — 피그온 출하 엑셀 / 팀 대시보드 출하기록 엑셀. 올린 파일은 합쳐서 출하 현황·출하성적·정산자료에 반영
export function ShipImportCard() {
  const { farms } = useHerd();
  const { data, uploads } = useData();
  const { repo, email } = useAuth();
  const ref = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [del, setDel] = useState<string | null>(null);
  const onFile = async (file: File) => {
    setMsg(null);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const rf = makeResolver(farms, data?.nameMap);
      let res: ReturnType<typeof parseShipImport> | null = null, last = '';
      for (const n of wb.SheetNames) { try { res = parseShipImport(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: true }) as unknown[][], rf); break; } catch (e) { last = (e as Error).message; } }
      if (!res) throw new Error(last);
      const unknown = res.skipped.filter((n) => !rf.excluded(n));
      if (!res.rows.length) throw new Error('담당 농장 출하가 없습니다' + (unknown.length ? ' (이름 확인 필요: ' + unknown.join(', ') + ')' : ''));
      const rec: ShipImport = { file: file.name, kind: res.kind, rows: res.rows };
      await repo!.add('shipImport', rec as any, email);
      const ds = [...new Set(res.rows.map((r) => r.date))].sort();
      setMsg({ ok: true, t: `${res.kind === 'pigon' ? '피그온' : '팀 대시보드'} · ${res.rows.length}건 · ${fmt(res.rows.reduce((a, r) => a + r.n, 0))}두 · ${md(ds[0])}~${md(ds[ds.length - 1])}` + (unknown.length ? ` · 이름 확인 필요(설정 › 이름 맞춤표): ${unknown.join(', ')}` : '') });
    } catch (e) { setMsg({ ok: false, t: '읽지 못했습니다: ' + (e as Error).message }); }
  };
  useEffect(() => { const h = (e: Event) => { onFile((e as CustomEvent<File>).detail); }; window.addEventListener('ship-import-file', h); return () => window.removeEventListener('ship-import-file', h); }); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 className="h2">출하 자료 올리기 <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>피그온 출하 · 팀 대시보드 출하기록</span></h2>
        <div><input ref={ref} type="file" accept=".xls,.xlsx" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} /><button className="btn pri" onClick={() => ref.current?.click()}>파일 올리기</button></div>
      </div>
      {msg && <div style={{ marginTop: 10 }}><span className={msg.ok ? 'chip ok' : 'chip bad'} style={{ whiteSpace: 'normal' }}>{msg.t}</span></div>}
      {uploads.length > 0 && (
        <div style={{ marginTop: 10, display: 'grid', gap: 4 }}>
          {[...uploads].sort((a, b) => ((a.at ?? '') < (b.at ?? '') ? 1 : -1)).map((u) => (
            <div key={u.id} className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="muted">{u.at ? md(u.at.slice(0, 10)) : ''}</span><span className={u.kind === 'pigon' ? 'chip info' : 'chip'} style={{ fontSize: 12 }}>{u.kind === 'pigon' ? '피그온' : '팀 대시보드'}</span><b>{u.file}</b><span className="muted">{u.rows.length}건</span>
              {del === u.id ? <button className="btn sm" style={{ borderColor: '#9A3216', color: '#9A3216' }} onClick={async () => { await repo!.remove('shipImport', u.id); setDel(null); }}>정말 삭제</button> : <button className="btn sm ghost" onClick={() => setDel(u.id)}>삭제</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
