// 출하 직접 입력 — 등급판정서 없이 출하 한 건을 손으로 넣는다 (팀 대시보드 '출하 기록 직접 입력'과 같은 칸)
import { useEffect, useState } from 'react';
import { Sheet } from '@/components/Sheet';
import { useIsPhone, thisMonth } from '@/lib/useIsPhone';
import { useHerd } from '@/lib/ui';
import { useAuth } from '@/lib/auth';
import { useCol } from '@/lib/useCol';
import type { ManualShip } from '@/data/types';
import { fmt, md, r1 } from '@/lib/calc/dates';
import { todayKST } from '@/lib/util';
import { REF } from '@/lib/calc/herd';
import { shortDest } from '@/lib/calc/ship';

const DESTS = ['일호', '참푸른', '신선', '중앙축산', '논산축협', '도도농장'];
const LOW_KG = 110;
type F = { farm: string; group: string; date: string; dest: string; n: string; live: string; yld: string; pay: string; price: string; g1p: string; g1: string; g2: string; out: string; lowReason: string; writer: string };
const blank = (farm: string, group: string, writer: string): F => ({ farm, group, date: todayKST(), dest: '', n: '', live: '', yld: '', pay: '', price: '', g1p: '0', g1: '0', g2: '0', out: '0', lowReason: '', writer });

export function ShipManualButton() {
  const [open, setOpen] = useState(false);
  // + 버튼 › 출하 직접 입력
  useEffect(() => { const h = (e: Event) => { if ((e as CustomEvent).detail === 'manual') setOpen(true); }; addEventListener('ship-open', h); return () => removeEventListener('ship-open', h); }, []);
  return (
    <>
      <button className="btn pri" onClick={() => setOpen(true)}>+ 직접 입력</button>
      {open && <ShipManualModal onClose={() => setOpen(false)} />}
    </>
  );
}

function ShipManualModal({ onClose }: { onClose: () => void }) {
  const { all, farms } = useHerd();
  const { repo, email, name } = useAuth();
  const first = farms[0] ?? '';
  const groupsOf = (f: string) => all.filter((r) => r.farm === f && r.stock > 0).map((r) => r.group);
  const [f, setF] = useState<F>(blank(first, groupsOf(first)[0] ?? '', name && name !== '미리보기' ? name : ''));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const up = (k: keyof F, v: string) => { setF({ ...f, [k]: v }); setErr(''); };
  const num = (v: string) => (v.trim() === '' ? NaN : Number(v));
  const n = num(f.n), live = num(f.live), yld = num(f.yld);
  const avgw = n > 0 && live > 0 ? r1(live / n) : null;
  const grades = [f.g1p, f.g1, f.g2, f.out].reduce((a, x) => a + (Number(x) || 0), 0);
  const low = avgw !== null && avgw <= LOW_KG;

  const save = async () => {
    if (!f.farm || !f.group) return setErr('농장과 그룹을 고르세요');
    if (!f.date) return setErr('출하일을 넣으세요');
    if (!f.dest.trim()) return setErr('거래처를 넣으세요');
    if (!(n > 0) || !Number.isInteger(n)) return setErr('두수를 넣으세요');
    if (!(live > 0)) return setErr('총생체중을 넣으세요');
    if (!(yld > 50 && yld < 90)) return setErr('지육율(%)을 50~90 사이로 넣으세요');
    if (f.pay.trim() !== '' && !(num(f.pay) > 30 && num(f.pay) < 100)) return setErr('지급율(%)을 확인하세요');
    if (grades > n) return setErr(`등급 두수 합(${grades})이 출하 두수(${n})보다 많습니다`);
    if (low && !f.lowReason.trim()) return setErr(`출하평체 ${LOW_KG}kg 이하 — 저체중 사유를 넣으세요`);
    if (!f.writer.trim()) return setErr('등록자 이름을 넣으세요');
    setBusy(true);
    try {
      const rec: Omit<ManualShip, 'id'> = { farm: f.farm, group: f.group, date: f.date, dest: f.dest.trim(), n, live, yld, pay: f.pay.trim() === '' ? null : num(f.pay), price: f.price.trim() === '' ? null : num(f.price), g1p: Number(f.g1p) || 0, g1: Number(f.g1) || 0, g2: Number(f.g2) || 0, out: Number(f.out) || 0, lowReason: f.lowReason.trim(), writer: f.writer.trim() };
      await repo!.add('shipments', rec as any, email);
      onClose();
    } catch (e) { setErr('저장하지 못했습니다: ' + String(e)); } finally { setBusy(false); }
  };

  const row = (label: string, child: React.ReactNode) => (
    <label style={{ display: 'grid', gridTemplateColumns: '110px minmax(0,1fr)', alignItems: 'center', gap: 10, fontSize: 14 }}><span className="muted">{label}</span>{child}</label>
  );
  const I = (k: keyof F, ph = '', type = 'number') => <input type={type} inputMode={type === 'number' ? 'decimal' : undefined} value={f[k]} placeholder={ph} onChange={(e) => up(k, e.target.value)} style={{ width: '100%', minHeight: 44, boxSizing: 'border-box' }} />;

  return (
    <Sheet title="출하 기록 직접 입력" onClose={onClose}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {row('농장', <select value={f.farm} onChange={(e) => { const g = groupsOf(e.target.value); setF({ ...f, farm: e.target.value, group: g[0] ?? '' }); }}>{farms.map((x) => <option key={x}>{x}</option>)}</select>)}
          {row('그룹', <select value={f.group} onChange={(e) => up('group', e.target.value)}>{groupsOf(f.farm).map((g) => <option key={g}>{g}</option>)}</select>)}
          {row('출하일', I('date', '', 'date'))}
          {row('거래처', <><input list="ship-dests" value={f.dest} placeholder="참푸른 / 일호 등" onChange={(e) => up('dest', e.target.value)} style={{ width: '100%' }} /><datalist id="ship-dests">{DESTS.map((d) => <option key={d} value={d} />)}</datalist></>)}
          {row('두수', I('n'))}
          {row('총생체중(kg)', I('live'))}
          {row('출하평체', <b>{avgw === null ? '—' : avgw + 'kg'}</b>)}
          {row('지육율(%)', I('yld'))}
          {row('지급율(직접,%)', I('pay', '비워두면 출하실적종합 값 사용'))}
          {row('기준단가', I('price'))}
          {row('1+ 두수', I('g1p'))}
          {row('1등급 두수', I('g1'))}
          {row('2등급 두수', I('g2'))}
          {row('등외 두수', I('out'))}
          {row('저체중 사유', I('lowReason', low ? '필수 입력' : `출하평체 ${LOW_KG}kg 이하일 때 필수`, 'text'))}
          {row('등록자', I('writer', '이름을 입력하세요', 'text'))}
        </div>
        {err && <div style={{ marginTop: 10 }}><span className="chip bad" style={{ whiteSpace: 'normal' }}>{err}</span></div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
          <button className="btn ghost" onClick={onClose}>취소</button>
          <button className="btn pri" disabled={busy} onClick={save} style={{ minHeight: 48 }}>{busy ? '저장 중…' : '저장'}</button>
        </div>
    </Sheet>
  );
}

// 직접 입력한 출하 목록 — 삭제는 두 번 눌러 확인
export function ShipManualList() {
  const rows = useCol<ManualShip>('shipments');
  const { repo } = useAuth();
  const phone = useIsPhone();
  const [del, setDel] = useState<string | null>(null);
  const [mon, setMon] = useState(thisMonth());
  const [open, setOpen] = useState<string | null>(null);
  if (!rows.length) return null;
  const months = [...new Set([thisMonth(), ...rows.map((x) => x.date.slice(0, 7))])].sort().reverse();
  const sorted = rows.filter((x) => !mon || x.date.startsWith(mon)).sort((a, b) => (a.date < b.date ? 1 : -1));
  const g = '72px minmax(90px,1fr) 70px 52px 78px 64px 56px 56px 110px 84px';
  const delBtn = (x: ManualShip & { id: string }) => del === x.id ? <button className="btn sm" style={{ borderColor: '#9A3216', color: '#9A3216' }} onClick={async () => { await repo!.remove('shipments', x.id); setDel(null); setOpen(null); }}>정말 삭제</button> : <button className="btn sm ghost" onClick={() => setDel(x.id)}>삭제</button>;
  const cur = sorted.find((x) => x.id === open);
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <h2 className="h2" style={{ flex: 1 }}>등록한 출하 기록 · {sorted.length}건</h2>
        <select aria-label="월" value={mon} onChange={(e) => setMon(e.target.value)} style={{ minHeight: 36 }}><option value="">기간 전체</option>{months.map((m) => <option key={m}>{m}</option>)}</select>
      </div>
      {sorted.length === 0 && <div className="muted">이 달에 등록한 출하가 없습니다</div>}
      {phone ? sorted.map((x) => (
        <button key={x.id} onClick={() => { setOpen(x.id); setDel(null); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px', borderBottom: '1px solid #EFEBE3', background: 'transparent', border: 0, borderBottomStyle: 'solid', font: 'inherit', textAlign: 'left', color: 'inherit', cursor: 'pointer' }}>
          <span style={{ width: 46, fontWeight: 600 }}>{md(x.date)}</span>
          <div style={{ flex: 1, minWidth: 0 }}><b>{x.farm}</b> {x.group}<div className="muted small">{shortDest(x.dest)} · 평체 {r1(x.live / x.n)}kg · {x.kind === 'grade' ? '등판서' : '직접 입력'}</div></div>
          <b>{fmt(x.n)}<span style={{ fontWeight: 400, fontSize: 12 }}>두</span></b>
        </button>
      )) : sorted.length > 0 && (
      <div className="gt"><div style={{ minWidth: 820 }}>
        <div className="gr gh small muted" style={{ gridTemplateColumns: g }}><div>출하일</div><div>농장 · 그룹</div><div>거래처</div><div className="r">두수</div><div className="r">평체</div><div className="r">지육율</div><div className="r">지급율</div><div className="r">1+·1</div><div>등록자</div><div /></div>
        {sorted.map((x) => (
          <div key={x.id} className="gr" style={{ gridTemplateColumns: g }}>
            <div>{md(x.date)}</div><div><b>{x.farm}</b> {x.group}</div><div className="small">{shortDest(x.dest)}<div className="sub">{x.kind === 'grade' ? '등판서 ' + (x.range ?? '') : '직접 입력'}</div></div><div className="r b">{fmt(x.n)}</div><div className="r">{r1(x.live / x.n)}kg</div><div className="r">{x.yld}%</div><div className="r">{x.pay ? x.pay + '%' : '—'}</div><div className="r">{x.g1p}·{x.g1}</div><div className="small">{x.writer}{x.kind === 'grade' && x.date > REF ? <div className="sub">재고 차감</div> : null}{x.lowReason ? <div className="sub">저체중: {x.lowReason}</div> : null}</div>
            <div className="r">{delBtn(x)}</div>
          </div>
        ))}
      </div></div>)}
      {cur && (
        <Sheet title={<>{cur.farm} {cur.group} <span className="muted" style={{ fontWeight: 400, fontSize: 14 }}>{md(cur.date)} · {fmt(cur.n)}두</span></>} onClose={() => setOpen(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, fontSize: 14 }}>
            {([['거래처', shortDest(cur.dest)], ['총생체중', fmt(Math.round(cur.live)) + 'kg'], ['평체', r1(cur.live / cur.n) + 'kg'], ['지육율', cur.yld + '%'], ['지급율', cur.pay ? cur.pay + '%' : '—'], ['1+/1/2/등외', `${cur.g1p}/${cur.g1}/${cur.g2}/${cur.out}`], ['입력', cur.kind === 'grade' ? '등판서 ' + (cur.range ?? '') : '직접 입력'], ['등록자', cur.writer || '—']] as const).map(([l, v]) => <div key={l}><div className="muted small">{l}</div><b>{v}</b></div>)}
          </div>
          {cur.lowReason && <div className="small" style={{ marginTop: 10 }}>저체중 사유: {cur.lowReason}</div>}
          <div style={{ marginTop: 16 }}>{delBtn(cur)}</div>
        </Sheet>
      )}
    </div>
  );
}
