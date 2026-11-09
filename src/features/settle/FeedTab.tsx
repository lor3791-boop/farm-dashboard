// 사료 사용 — 피그온 그룹 사료 사용 업로드 → 농장·그룹별 월별 확인 / 정산월 중간투입 입력·저장
import { DropCard } from '@/components/Drop';
import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useHerd } from '@/lib/ui';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { useCol } from '@/lib/useCol';
import { makeResolver } from '@/lib/names';
import { parseFeedSheet, mergeFeed, encodeFeed, FEED_ITEMS, type FeedUpload, type FeedMid } from '@/lib/feedSheet';
import { fmt, md } from '@/lib/calc/dates';
import { todayKST } from '@/lib/util';

const kg = (v: number) => fmt(Math.round(v)) ;

export function FeedTab() {
  const { all, farms } = useHerd();
  const { data } = useData();
  const { repo, email } = useAuth();
  const ups = useCol<FeedUpload>('feed');
  const mids = useCol<FeedMid>('feedMid');
  const rows = useMemo(() => mergeFeed(ups), [ups]);
  const ref = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [farm, setFarm] = useState(farms[0] ?? '');
  const [grp, setGrp] = useState('');
  const [delU, setDelU] = useState<string | null>(null);
  const groupsOf = (f: string) => [...new Set([...all.filter((r) => r.farm === f).map((r) => r.group), ...rows.filter((r) => r[0] === f).map((r) => r[1])])].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));

  const onFile = async (file: File) => {
    setMsg(null);
    try {
      // raw: 피그온 '엑셀'(실제로는 HTML 표)의 '명임-2026-002' 같은 글자를 날짜로 바꾸지 않게
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', raw: true });
      const rf = makeResolver(farms, data?.nameMap);
      let got: ReturnType<typeof parseFeedSheet> = [], last = '';
      for (const n of wb.SheetNames) { try { got = got.concat(parseFeedSheet(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: true }) as unknown[][], rf)); } catch (e) { last = (e as Error).message; } }
      if (!got.length) throw new Error(last || '읽을 행이 없습니다');
      await repo!.add('feed', { file: file.name, rows: got.map(encodeFeed) as any, at: new Date().toISOString() }, email);
      const ms = [...new Set(got.map((r) => r[2]))].sort();
      setMsg({ ok: true, t: `${file.name} · ${fmt(got.length)}행 · ${new Set(got.map((r) => r[0])).size}개 농장 · ${ms[0]} ~ ${ms[ms.length - 1]}` });
    } catch (e) { setMsg({ ok: false, t: '읽지 못했습니다: ' + (e as Error).message }); }
  };

  // 선택 농장: 그룹 × 월 합계 / 선택 그룹: 월 × 품목
  const F = rows.filter((r) => r[0] === farm);
  const months = [...new Set(F.map((r) => r[2]))].sort();
  const fGroups = [...new Set(F.map((r) => r[1]))].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));
  const sum = (L: typeof rows) => L.reduce((a, r) => a + r[4], 0);
  const G = F.filter((r) => r[1] === grp);
  const gMonths = [...new Set(G.map((r) => r[2]))].sort();
  const gItems = [...new Set(G.map((r) => r[3]))];
  const gm = '90px ' + months.map(() => 'minmax(80px,1fr)').join(' ') + ' 100px';

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <DropCard accept=".xls,.xlsx,.csv" onFiles={(L) => onFile(L[0])}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="h2">피그온 그룹 사료 사용</h2>
          <div><input ref={ref} type="file" accept=".xls,.xlsx,.csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} /><button className="btn pri" onClick={() => ref.current?.click()}>파일 올리기</button></div>
        </div>
        {msg && <div style={{ marginTop: 10 }}><span className={msg.ok ? 'chip ok' : 'chip bad'} style={{ whiteSpace: 'normal' }}>{msg.t}</span></div>}
        {ups.length > 0 && (
          <div style={{ marginTop: 10, display: 'grid', gap: 4 }}>
            {[...ups].sort((a, b) => ((a.at ?? '') < (b.at ?? '') ? 1 : -1)).map((u) => (
              <div key={u.id} className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="muted">{u.at ? md(u.at.slice(0, 10)) : ''}</span><b>{u.file}</b><span className="muted">{fmt(u.rows.length)}행</span>
                {delU === u.id ? <button className="btn sm" style={{ borderColor: '#9A3216', color: '#9A3216' }} onClick={async () => { await repo!.remove('feed', u.id); setDelU(null); }}>정말 삭제</button> : <button className="btn sm ghost" onClick={() => setDelU(u.id)}>삭제</button>}
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
          {farms.map((f) => <button key={f} className={farm === f ? 'pill on' : 'pill'} style={rows.some((r) => r[0] === f) || farm === f ? undefined : { opacity: 0.5 }} onClick={() => { setFarm(f); setGrp(''); }}>{f}</button>)}
        </div>
        {F.length === 0 ? <div className="muted" style={{ marginTop: 12 }}>{farm} 사료 자료가 없습니다</div> : (
          <>
            <h2 className="h2" style={{ marginTop: 16 }}>{farm} · 그룹별 월 사용량 (kg)</h2>
            <div className="gt" style={{ marginTop: 8 }}><div style={{ minWidth: 200 + months.length * 84 }}>
              <div className="gr gh small muted" style={{ gridTemplateColumns: gm }}><div>그룹</div>{months.map((m) => <div key={m} className="r">{Number(m.slice(5))}월</div>)}<div className="r">합계</div></div>
              {fGroups.map((g) => (
                <button key={g} className="gr" onClick={() => setGrp(grp === g ? '' : g)} style={{ gridTemplateColumns: gm, width: '100%', textAlign: 'left', font: 'inherit', border: 0, cursor: 'pointer', background: grp === g ? '#EEF3EF' : undefined }} aria-expanded={grp === g}>
                  <div className="b">{g}</div>{months.map((m) => { const v = sum(F.filter((r) => r[1] === g && r[2] === m)); return <div key={m} className="r">{v ? kg(v) : '·'}</div>; })}<div className="r b">{kg(sum(F.filter((r) => r[1] === g)))}</div>
                </button>
              ))}
              <div className="gr gh b" style={{ gridTemplateColumns: gm }}><div>합계</div>{months.map((m) => <div key={m} className="r">{kg(sum(F.filter((r) => r[2] === m)))}</div>)}<div className="r">{kg(sum(F))}</div></div>
            </div></div>
            {grp && (
              <div style={{ marginTop: 14 }}>
                <h2 className="h2">{farm} {grp} · 월 × 사료 품목</h2>
                <div className="tblbox" style={{ marginTop: 8 }}><table>
                  <thead><tr><th>월</th>{gItems.map((i) => <th key={i} className="r">{i || '품목 없음'}</th>)}<th className="r">합계</th></tr></thead>
                  <tbody>{gMonths.map((m) => <tr key={m}><td>{m}</td>{gItems.map((i) => { const v = sum(G.filter((r) => r[2] === m && r[3] === i)); return <td key={i} className="r">{v ? kg(v) : '·'}</td>; })}<td className="r b">{kg(sum(G.filter((r) => r[2] === m)))}</td></tr>)}</tbody>
                </table></div>
              </div>
            )}
          </>
        )}
      </DropCard>
      <FeedMidCard farms={farms} groupsOf={groupsOf} mids={mids} />
    </div>
  );
}

function FeedMidCard({ farms, groupsOf, mids }: { farms: string[]; groupsOf: (f: string) => string[]; mids: (FeedMid & { id: string })[] }) {
  const { repo, email } = useAuth();
  const [f, setF] = useState({ farm: farms[0] ?? '', group: '', month: todayKST().slice(0, 7), item: FEED_ITEMS[2], kg: '', memo: '' });
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [del, setDel] = useState<string | null>(null);
  const gs = groupsOf(f.farm);
  const group = f.group || gs[0] || '';
  const save = async () => {
    const k = Number(f.kg);
    if (!f.farm || !group) return setErr('농장과 그룹을 고르세요');
    if (!f.month) return setErr('정산월을 고르세요');
    if (!f.item.trim()) return setErr('사료 품목을 고르세요');
    if (!(k > 0)) return setErr('투입량(kg)을 넣으세요');
    await repo!.add('feedMid', { farm: f.farm, group, month: f.month, item: f.item.trim(), kg: k, memo: f.memo.trim() }, email);
    setOk(`저장됨: ${f.farm} ${group} ${f.month} ${f.item} ${fmt(k)}kg`); setErr(''); setF({ ...f, kg: '', memo: '' });
  };
  const list = [...mids].sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : a.farm.localeCompare(b.farm, 'ko')));
  return (
    <div className="card">
      <h2 className="h2">정산월 중간투입량</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end', marginTop: 10 }}>
        <label className="small muted">농장<br /><select value={f.farm} onChange={(e) => { setF({ ...f, farm: e.target.value, group: '' }); setOk(''); }}>{farms.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="small muted">그룹<br /><select value={group} onChange={(e) => setF({ ...f, group: e.target.value })}>{gs.map((g) => <option key={g}>{g}</option>)}</select></label>
        <label className="small muted">정산월<br /><input type="month" value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })} /></label>
        <label className="small muted">사료 품목<br /><select value={FEED_ITEMS.includes(f.item) ? f.item : '__etc'} onChange={(e) => setF({ ...f, item: e.target.value === '__etc' ? '' : e.target.value })}>{FEED_ITEMS.map((i) => <option key={i}>{i}</option>)}<option value="__etc">기타 (직접 입력)</option></select></label>
        {!FEED_ITEMS.includes(f.item) && <label className="small muted">품목 이름<br /><input value={f.item} onChange={(e) => setF({ ...f, item: e.target.value })} style={{ width: 150 }} /></label>}
        <label className="small muted">투입량 (kg)<br /><input type="number" inputMode="decimal" value={f.kg} onChange={(e) => { setF({ ...f, kg: e.target.value }); setErr(''); setOk(''); }} style={{ width: 120 }} /></label>
        <label className="small muted">메모<br /><input value={f.memo} onChange={(e) => setF({ ...f, memo: e.target.value })} style={{ width: 160 }} /></label>
        <button className="btn pri" onClick={save}>저장</button>
      </div>
      {err && <div style={{ marginTop: 8 }}><span className="chip bad">{err}</span></div>}
      {ok && <div style={{ marginTop: 8 }}><span className="chip ok">{ok}</span></div>}
      {list.length > 0 && (
        <div className="tblbox" style={{ marginTop: 12 }}><table>
          <thead><tr><th>정산월</th><th>농장 · 그룹</th><th>사료 품목</th><th className="r">kg</th><th>메모</th><th /></tr></thead>
          <tbody>{list.map((m) => <tr key={m.id}><td>{m.month}</td><td><b>{m.farm}</b> {m.group}</td><td>{m.item}</td><td className="r b">{fmt(m.kg)}</td><td className="small">{m.memo}</td>
            <td className="r">{del === m.id ? <button className="btn sm" style={{ borderColor: '#9A3216', color: '#9A3216' }} onClick={async () => { await repo!.remove('feedMid', m.id); setDel(null); }}>정말 삭제</button> : <button className="btn sm ghost" onClick={() => setDel(m.id)}>삭제</button>}</td></tr>)}</tbody>
        </table></div>
      )}
    </div>
  );
}
