// 공통 필터 띠 — 홈·돈군·분석 위에 뜬다 (목업 v5)
import { useHerd } from '@/lib/ui';
import { FarmPicker, Segs } from '@/components/v5';
import { fmt } from '@/lib/calc/dates';

export function FilterBar() {
  const { all, farms, farmBad, selSet, rows, s, set } = useHerd();
  const toggleIn = (arr: string[], x: string) => (arr.includes(x) ? arr.filter((y) => y !== x) : arr.concat([x]));
  const opts = farms.filter((f) => !s.fQ || f.includes(s.fQ)).map((f) => ({
    name: f, on: selSet.includes(f), bad: farmBad[f], meta: fmt(all.filter((r) => r.farm === f).reduce((a, r) => a + r.stock, 0)) + '두',
    toggle: () => set({ fSel: toggleIn(selSet, f) })
  }));
  const label = selSet.length === farms.length ? `전체 농장 (${farms.length})` : selSet.length === 0 ? '선택 없음' : selSet.length === 1 ? selSet[0] : `${selSet[0]} 외 ${selSet.length - 1}`;
  const partial = selSet.length !== farms.length;
  const active = partial || s.fStatus !== 'all';
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #E2DDD2', borderRadius: 12, padding: '10px 12px', marginBottom: 16 }}>
      <FarmPicker label={<span><span className="muted" style={{ fontSize: 12 }}>농장 </span><b>{label}</b></span>} open={s.fOpen} setOpen={(v) => set({ fOpen: v })} q={s.fQ} setQ={(v) => set({ fQ: v })} opts={opts} onAll={() => set({ fSel: null })} onNone={() => set({ fSel: [] })} />
      <Segs label="상태" opts={[['all', '전체'], ['bad', '문제 있음'], ['ok', '정상']]} value={s.fStatus} onPick={(k) => set({ fStatus: k })} />
      {partial && selSet.slice(0, 6).map((f) => (
        <span key={f} className="fchip">{f}<button onClick={() => set({ fSel: selSet.filter((x) => x !== f) })} aria-label={f + ' 빼기'} title="빼기">×</button></span>
      ))}
      {partial && selSet.length > 6 && <span className="muted small">+{selSet.length - 6}</span>}
      <span className="muted small">그룹 {rows.length}개</span>
      {selSet.length === 0 && <span className="chip warn">농장을 하나 이상 고르세요</span>}
      {active && <button className="btn sm ghost" onClick={() => set({ fSel: null, fStatus: 'all', fQ: '' })}>필터 초기화</button>}
    </div>
  );
}
