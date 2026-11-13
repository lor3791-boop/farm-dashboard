// 그룹 직접 등록 — 피그온 전입현황이 올라오기 전 새 그룹을 손으로 등록 (재고·작업 알림·폐사 입력에 바로 쓰임)
import { useState } from 'react';
import { useHerd } from '@/lib/ui';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { fmt, md } from '@/lib/calc/dates';
import { todayKST } from '@/lib/util';
import { REF, type ManualGroup } from '@/lib/calc/herd';

const BASE_SOW = ['익산', '그린피그팜', '장수GGP'];

export function GroupAdd({ onClose }: { onClose: () => void }) {
  const { all, full, farms, saved, save: saveUi } = useHerd();
  const { data, groups } = useData();
  const { repo, email } = useAuth();
  const farmOf = (n: string) => data?.farms.find((f) => f.name === n);
  const nextGroup = (n: string) => { const L = all.filter((r) => r.farm === n).map((r) => r.group).filter((g) => /^\d{2}-\d+$/.test(g)); const yy = todayKST().slice(2, 4); const max = Math.max(0, ...L.filter((g) => g.startsWith(yy + '-')).map((g) => Number(g.split('-')[1]))); return `${yy}-${max + 1}`; };
  const first = farms[0] ?? '';
  const [f, setF] = useState({ farm: first, group: nextGroup(first), dongs: [] as string[], date: todayKST(), inn: '', total: '', claim: '0', age: '', source: '', memo: '' });
  const [newSrc, setNewSrc] = useState<string | null>(null);
  const sources = [...BASE_SOW, ...saved.sowFarms.filter((x) => !BASE_SOW.includes(x))];
  const avgw = Number(f.inn) > 0 && Number(f.total) > 0 ? Math.round((Number(f.total) / Number(f.inn)) * 10) / 10 : null;
  const addSource = () => { const v = (newSrc ?? '').trim(); if (!v) return; if (!sources.includes(v)) saveUi({ sowFarms: [...saved.sowFarms, v] }); setF({ ...f, source: v }); setNewSrc(null); setErr(''); };
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const fm = farmOf(f.farm);
  // 같은 그룹 다시 등록 = 그 그룹의 전입 차수 추가 (피그온에서 전입을 한 그룹으로 합치는 경우)
  const same = full.find((r) => r.farm === f.farm && r.group === f.group.trim());
  const snapOld = !!same && !groups.some((g) => g.farm === f.farm && g.group === f.group.trim()) && f.date <= REF;
  const dongOpts = (fm?.dongs ?? []).map((d) => d.replace('동', ''));
  const noDong = !!fm?.noDong || dongOpts.length === 0;
  const up = (p: Partial<typeof f>) => { setF({ ...f, ...p }); setErr(''); };
  const save = async () => {
    const inn = Number(f.inn), claim = Number(f.claim || 0), total = Number(f.total), age = Number(f.age);
    if (!f.farm) return setErr('농장을 고르세요');
    if (!/^\d{2}-\d{1,2}$/.test(f.group.trim())) return setErr('그룹은 26-9처럼 넣으세요');
    if (!f.date) return setErr('전입일을 넣으세요');
    if (!(Number.isInteger(inn) && inn > 0)) return setErr('최초두수(실제 전입두수)를 넣으세요');
    if (!(total > 0)) return setErr('총체중(kg)을 넣으세요');
    if (!(Number.isInteger(claim) && claim >= 0 && claim < inn)) return setErr('크레임 두수를 확인하세요');
    if (!(avgw && avgw > 5 && avgw < 80)) return setErr(`전입평체가 ${avgw ?? '—'}kg — 총체중·입식두수를 확인하세요`);
    if (!(Number.isInteger(age) && age > 0 && age < 150)) return setErr('전입일령을 넣으세요');
    if (!f.source) return setErr('자돈농장을 고르세요');
    setBusy(true);
    try {
      const g: ManualGroup = { farm: f.farm, group: f.group.trim(), dongs: noDong ? [] : [...f.dongs].sort(), date: f.date, inn, claim, avgw, age, totalKg: total, source: f.source, memo: f.memo.trim() };
      await repo!.add('groups', g as any, email);
      onClose();
    } catch (e) { setErr('저장하지 못했습니다: ' + String(e)); } finally { setBusy(false); }
  };
  const row = (label: string, child: React.ReactNode) => <label style={{ display: 'grid', gridTemplateColumns: '110px minmax(0,1fr)', alignItems: 'center', gap: 10, fontSize: 14 }}><span className="muted">{label}</span>{child}</label>;
  void groups;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <button aria-label="닫기" onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(20,30,25,.4)', border: 0 }} />
      <div role="dialog" aria-modal="true" aria-label="그룹 직접 등록" className="card" style={{ position: 'relative', width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto', padding: '20px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 className="h2" style={{ fontSize: 19 }}>그룹 직접 등록</h2>
          <button className="btn sm ghost" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {row('농장', <select value={f.farm} onChange={(e) => up({ farm: e.target.value, group: nextGroup(e.target.value), dongs: [] })}>{farms.map((x) => <option key={x}>{x}</option>)}</select>)}
          {row('그룹', <input value={f.group} onChange={(e) => up({ group: e.target.value })} placeholder="26-9" />)}
          {row('동 (선택)', noDong ? <span className="muted small">동 없이 관리 (그룹으로만)</span> : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{dongOpts.map((d) => { const on = f.dongs.includes(d); return <button key={d} type="button" className={on ? 'pill on' : 'pill'} onClick={() => up({ dongs: on ? f.dongs.filter((x) => x !== d) : [...f.dongs, d] })}>{d}동</button>; })}{!f.dongs.length && <span className="muted small" style={{ alignSelf: 'center' }}>안 고르면 그룹으로만 관리</span>}</div>)}
          {row('전입일', <input type="date" value={f.date} onClick={(e) => { try { e.currentTarget.showPicker(); } catch { /* 지원 안 함 */ } }} onChange={(e) => up({ date: e.target.value })} style={{ cursor: 'pointer' }} />)}
          {row('최초두수', <input type="number" inputMode="numeric" value={f.inn} onChange={(e) => up({ inn: e.target.value })} />)}
          {row('총체중 (kg)', <input type="number" inputMode="decimal" value={f.total} onChange={(e) => up({ total: e.target.value })} />)}
          {row('전입평체', <b>{avgw === null ? '—' : avgw + 'kg'}</b>)}
          {row('크레임', <input type="number" inputMode="numeric" value={f.claim} onChange={(e) => up({ claim: e.target.value })} />)}
          {row('전입일령', <input type="number" inputMode="numeric" value={f.age} onChange={(e) => up({ age: e.target.value })} />)}
          {row('자돈농장', newSrc === null
            ? <select value={f.source} onChange={(e) => { if (e.target.value === '__add') setNewSrc(''); else up({ source: e.target.value }); }}><option value="">고르세요</option>{sources.map((x) => <option key={x}>{x}</option>)}<option value="__add">+ 추가</option></select>
            : <span style={{ display: 'flex', gap: 6 }}><input autoFocus value={newSrc} onChange={(e) => setNewSrc(e.target.value)} placeholder="자돈농장 이름" style={{ flex: 1, minWidth: 0 }} onKeyDown={(e) => { if (e.key === 'Enter') addSource(); }} /><button type="button" className="btn sm pri" onClick={addSource}>추가</button><button type="button" className="btn sm ghost" onClick={() => setNewSrc(null)}>취소</button></span>)}
          {row('메모', <input value={f.memo} onChange={(e) => up({ memo: e.target.value })} />)}
          {same && <div className="small" style={{ background: snapOld ? '#FBEFD5' : '#E3EFE7', color: snapOld ? '#7A4F00' : '#1F4E3D', borderRadius: 8, padding: '8px 12px' }}>{snapOld ? `${f.farm} ${f.group}은(는) 피그온(${md(REF)} 기준)에 있습니다. ${md(REF)} 이전 전입은 피그온 값에 이미 들어 있어 더하지 않습니다` : `${f.farm} ${f.group}에 전입 차수로 더합니다 (지금 실두수 ${fmt(same.inn)}두)`}</div>}
          {Number(f.inn) > 0 && <div className="small" style={{ background: '#F4F2EC', borderRadius: 8, padding: '8px 12px' }}>최초두수(실제 전입) {fmt(Number(f.inn))}두 · 전입두수 {fmt(Number(f.inn) - Number(f.claim || 0))}두 (크레임 {fmt(Number(f.claim || 0))}두 제외){avgw ? ` · 전입평체 ${avgw}kg` : ''}</div>}
        </div>
        {err && <div style={{ marginTop: 10 }}><span className="chip bad" style={{ whiteSpace: 'normal' }}>{err}</span></div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
          <button className="btn ghost" onClick={onClose}>취소</button>
          <button className="btn pri" disabled={busy} onClick={save}>{busy ? '저장 중…' : '등록'}</button>
        </div>
      </div>
    </div>
  );
}

// 직접 등록한 그룹 목록 — 피그온 자료가 올라오면 지운다 (같은 농장·그룹이 스냅샷에 있으면 그쪽이 우선)
export function ManualGroupList() {
  const { groups } = useData();
  const { repo } = useAuth();
  const [del, setDel] = useState<string | null>(null);
  if (!groups.length) return null;
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2 className="h2" style={{ marginBottom: 8 }}>직접 등록한 그룹 · {groups.length}개</h2>
      <div className="tblbox"><table>
        <thead><tr><th>농장 · 그룹</th><th>동</th><th>전입일</th><th className="r">최초두수</th><th className="r">크레임</th><th className="r">평체</th><th className="r">일령</th><th>자돈농장</th><th>메모</th><th /></tr></thead>
        <tbody>{[...groups].sort((a, b) => (a.date < b.date ? 1 : -1)).map((g) => (
          <tr key={g.id}><td><b>{g.farm}</b> {g.group}</td><td>{g.dongs.length ? g.dongs.join('·') + '동' : '그룹만'}</td><td>{md(g.date)}</td><td className="r">{fmt(g.inn)}</td><td className="r">{g.claim}</td><td className="r">{g.avgw}kg</td><td className="r">{g.age}</td><td>{g.source ?? ''}</td><td className="small">{g.memo}</td>
            <td className="r">{del === g.id ? <button className="btn sm" style={{ borderColor: '#9A3216', color: '#9A3216' }} onClick={async () => { await repo!.remove('groups', g.id); setDel(null); }}>정말 삭제</button> : <button className="btn sm ghost" onClick={() => setDel(g.id)}>삭제</button>}</td></tr>
        ))}</tbody>
      </table></div>
    </div>
  );
}
