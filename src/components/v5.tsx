// 목업 v5 공통 부품 — 세그먼트 버튼, 탭, 정렬되는 표(머리줄·첫 열 고정, 줄 클릭), 칩
import { useState, type ReactNode } from 'react';

export function Segs<K extends string>({ opts, value, onPick, label }: { opts: [K, string][]; value: K; onPick: (k: K) => void; label?: string }) {
  return (
    <div className="segs" role="group" aria-label={label}>
      {opts.map(([k, l]) => <button key={k} className={value === k ? 'seg on' : 'seg'} onClick={() => onPick(k)}>{l}</button>)}
    </div>
  );
}
export function Tabs<K extends string>({ opts, value, onPick }: { opts: [K, string][]; value: K; onPick: (k: K) => void }) {
  return (
    <div className="tabs" role="tablist">
      {opts.map(([k, n]) => <button key={k} role="tab" aria-selected={value === k} className={value === k ? 'tab on' : 'tab'} onClick={() => onPick(k)}>{n}</button>)}
    </div>
  );
}
export const Chip = ({ t, children, style }: { t: 'ok' | 'warn' | 'bad' | 'info'; children: ReactNode; style?: React.CSSProperties }) => <span className={'chip ' + t} style={style}>{children}</span>;

// 정렬 상태: 누를 때마다 ▲ → ▼ → 해제
export type Sort = { k: string | null; d: 0 | 1 | -1 };
export function useSorts() {
  const [sorts, setSorts] = useState<Record<string, Sort>>({});
  const of = (id: string): Sort => sorts[id] || { k: null, d: 0 };
  const cycle = (id: string, k: string) => { const cur = of(id); const nx: Sort = cur.k !== k ? { k, d: 1 } : cur.d === 1 ? { k, d: -1 } : { k: null, d: 0 }; setSorts({ ...sorts, [id]: nx }); };
  return { of, cycle };
}
export interface Col<T> { k: string; l: string; w: string; num?: boolean; sv: (r: T) => number | string; fixed?: boolean }
export function sortRows<T>(sort: Sort, cols: Col<T>[], arr: T[]): T[] {
  if (!sort.k) return arr;
  const c = cols.find((x) => x.k === sort.k); if (!c) return arr;
  return [...arr].sort((a, b) => { const x = c.sv(a), y = c.sv(b); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'ko')) * sort.d; });
}
export interface GRowView { key: string; bg?: string; cells: ReactNode[]; onClick?: () => void; aria?: string }

export function Grid<T>({ cols, sort, onSort, rows, minW, scroll }: { cols: Col<T>[]; sort: Sort; onSort: (k: string) => void; rows: GRowView[]; minW?: string; scroll?: boolean }) {
  const grid = cols.map((c) => c.w).join(' ');
  const mw = minW ?? Math.max(560, cols.reduce((a, c) => a + (parseInt(c.w.replace(/minmax\((\d+)px.*/, '$1')) || 60) + 8, 0)) + 'px';
  return (
    <div className={'gt' + (scroll ? ' scroll' : '')}>
      <div style={{ minWidth: mw }}>
        <div className="gr gh sticky" style={{ gridTemplateColumns: grid }}>
          {cols.map((c, i) => { const on = sort.k === c.k; return (
            <div key={c.k} className={i === 0 ? 'stick' : ''}>
              <button className={'th' + (c.num ? ' r' : '') + (on ? ' on' : '')} onClick={() => onSort(c.k)} title={c.l + ' 기준 정렬 (누를 때마다 ▲ → ▼ → 해제)'}>
                {c.l} <span aria-hidden="true">{on ? (sort.d > 0 ? '▲' : '▼') : '↕'}</span>
              </button>
            </div>
          ); })}
        </div>
        {rows.map((r) => (
          <div key={r.key} className="gr rowx" style={{ gridTemplateColumns: grid, background: r.bg ?? '#fff', ['--rowbg' as any]: r.bg ?? '#fff' }}>
            {r.onClick && <button className="rowhit" onClick={r.onClick} aria-label={r.aria} title={r.aria} />}
            {r.cells.map((c, i) => <div key={i} className={i === 0 ? 'stick' : ''} style={{ minWidth: 0 }}>{c}</div>)}
          </div>
        ))}
      </div>
    </div>
  );
}
// 셀 모양 도우미
export const Num = ({ v, cls = '' }: { v: ReactNode; cls?: string }) => <div className={'r ' + cls}>{v}</div>;
export const Lnk = ({ v, sub }: { v: ReactNode; sub?: ReactNode }) => <><span className="lnk-t">{v}</span>{sub ? <div className="sub">{sub}</div> : null}</>;
export const Txt = ({ v, sub, cls = '' }: { v: ReactNode; sub?: ReactNode; cls?: string }) => <div className={cls}><span>{v}</span>{sub ? <div className="sub">{sub}</div> : null}</div>;

// 검색되는 다중선택 농장 박스(가)
export function FarmPicker({ label, open, setOpen, q, setQ, opts, onAll, onNone, msg, top }: {
  label: ReactNode; open: boolean; setOpen: (v: boolean) => void; q: string; setQ: (v: string) => void;
  opts: { name: string; on: boolean; meta?: string; bad?: boolean; toggle: () => void }[]; onAll?: () => void; onNone?: () => void; msg?: string; top?: number;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <button className="sel" onClick={() => setOpen(!open)} aria-label="농장 선택" aria-expanded={open}>{label}<span aria-hidden="true">▾</span></button>
      {open && (
        <>
          <button className="backdrop" onClick={() => setOpen(false)} aria-label="농장 선택 닫기" />
          <div className="pop" style={top ? { top } : undefined}>
            <input type="search" placeholder="농장 이름 검색" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%' }} aria-label="농장 검색" />
            {(onAll || onNone) && (
              <div style={{ display: 'flex', gap: 6, margin: '8px 0 4px' }}>
                {onAll && <button className="btn sm ghost" onClick={onAll}>전체</button>}
                {onNone && <button className="btn sm ghost" onClick={onNone}>모두 해제</button>}
              </div>
            )}
            <div style={{ maxHeight: 300, overflowY: 'auto', marginTop: 6 }}>
              {opts.length === 0 && <div className="muted small" style={{ padding: 8 }}>맞는 농장이 없습니다</div>}
              {opts.map((o) => (
                <label key={o.name} className="opt"><input type="checkbox" checked={o.on} onChange={o.toggle} /><span style={{ flex: 1 }}>{o.name}</span>{o.bad && <span className="chip bad">문제</span>}<span className="muted small">{o.meta}</span></label>
              ))}
            </div>
            {msg && <div className="chip warn" style={{ marginTop: 6 }}>{msg}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}><button className="btn pri sm" onClick={() => setOpen(false)}>적용</button></div>
          </div>
        </>
      )}
    </div>
  );
}
