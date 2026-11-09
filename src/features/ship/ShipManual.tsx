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
type F = { farm: string; group: string; date: string; dest: string; n: string; live: string };
const blank = (farm: string, group: string): F => ({ farm, group, date: todayKST(), dest: '', n: '', live: '' });
// 숫자 칸: 글자 입력칸으로 받아 화면을 스크롤해도 값이 바뀌지 않게 (type=number는 휠·스크롤에 값이 바뀜)
const digits = (v: string, dec = false) => v.replace(dec ? /[^\d.]/g : /[^\d]/g, '');

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

// 직접 입력은 두수·총생체중만. 등판서가 나오면 '등급판정서 올리기'로 올리면 같은 날·농장 직접 입력 건에 붙어 성적이 채워지고,
// 출하실적종합(新)을 올리면 그 값이 최종 실적이 된다 (이 그룹 정보로 그룹별로 나뉨).
function ShipManualModal({ onClose }: { onClose: () => void }) {
  const { all, farms } = useHerd();
  const { repo, email, name } = useAuth();
  const first = farms[0] ?? '';
  const groupsOf = (f: string) => all.filter((r) => r.farm === f && r.stock > 0).map((r) => r.group);
  const [f, setF] = useState<F>(blank(first, groupsOf(first)[0] ?? ''));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const up = (k: keyof F, v: string) => { setF({ ...f, [k]: v }); setErr(''); };
  const n = Number(f.n), live = Number(f.live);
  const avgw = n > 0 && live > 0 ? r1(live / n) : null;

  const save = async () => {
    if (!f.farm || !f.group) return setErr('농장과 그룹을 고르세요');
    if (!f.date) return setErr('출하일을 넣으세요');
    if (!f.dest.trim()) return setErr('거래처를 고르세요');
    if (!(n > 0) || !Number.isInteger(n)) return setErr('두수를 넣으세요');
    if (!(live > 0)) return setErr('총생체중을 넣으세요');
    if (avgw !== null && (avgw < 60 || avgw > 180)) return setErr(`평체 ${avgw}kg — 두수·총생체중을 확인하세요`);
    setBusy(true);
    try {
      const rec: Omit<ManualShip, 'id'> = { kind: 'manual', farm: f.farm, group: f.group, date: f.date, dest: f.dest.trim(), n, live, yld: 0, pay: null, price: null, g1p: 0, g1: 0, g2: 0, out: 0, lowReason: '', writer: name || email };
      await repo!.add('shipments', rec as any, email);
      onClose();
    } catch (e) { setErr('저장하지 못했습니다: ' + String(e)); } finally { setBusy(false); }
  };

  const lab = { display: 'grid', gap: 4, fontSize: 13, color: '#6B6A63', minWidth: 0 } as const;
  const inp = { width: '100%', minHeight: 44, boxSizing: 'border-box', fontSize: 16 } as const;
  return (
    <Sheet title="출하 직접 입력" onClose={onClose} locked>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label style={lab}>농장<select value={f.farm} style={inp} onChange={(e) => { const g = groupsOf(e.target.value); setF({ ...f, farm: e.target.value, group: g[0] ?? '' }); }}>{farms.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label style={lab}>그룹<select value={f.group} style={inp} onChange={(e) => up('group', e.target.value)}>{groupsOf(f.farm).map((g) => <option key={g}>{g}</option>)}</select></label>
        <label style={{ ...lab, gridColumn: '1 / -1' }}>출하일<input type="date" value={f.date} max={todayKST()} style={inp} onChange={(e) => up('date', e.target.value)} /></label>
        <div style={{ ...lab, gridColumn: '1 / -1' }}>거래처
          <div className="hscroll">{DESTS.map((d) => <button key={d} type="button" className={f.dest === d ? 'pill on' : 'pill'} style={{ minHeight: 40, padding: '6px 12px', fontSize: 14 }} onClick={() => up('dest', d)}>{d}</button>)}</div>
        </div>
        <label style={lab}>두수<input inputMode="numeric" value={f.n} placeholder="예: 40" style={inp} onChange={(e) => up('n', digits(e.target.value))} /></label>
        <label style={lab}>총생체중(kg)<input inputMode="decimal" value={f.live} placeholder="예: 4,600" style={inp} onChange={(e) => up('live', digits(e.target.value, true))} /></label>
      </div>
      <div style={{ marginTop: 10, fontSize: 14 }}>출하평체 <b>{avgw === null ? '—' : avgw + 'kg'}</b><span className="muted small"> · 지육율·등급은 등판서를 올리면 채워집니다</span></div>
      {err && <div style={{ marginTop: 10 }}><span className="chip bad" style={{ whiteSpace: 'normal' }}>{err}</span></div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
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
