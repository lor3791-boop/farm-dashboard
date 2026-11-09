// 아래에서 올라오는 창(손잡이를 끌어내리면 닫힘) + 화면 아래 알림(되돌리기)
import { useEffect, useRef, useState, type ReactNode } from 'react';

export function Sheet({ title, onClose, children, locked = false }: { title: ReactNode; onClose: () => void; children: ReactNode; locked?: boolean }) {
  // locked: 입력 창 — 바깥을 누르거나 끌어내려도 닫히지 않음 (✕·취소로만 닫음)
  const [dy, setDy] = useState(0);
  const y0 = useRef<number | null>(null);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && !locked && onClose(); addEventListener('keydown', k); const o = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { removeEventListener('keydown', k); document.body.style.overflow = o; }; }, [onClose, locked]);
  const start = (e: React.TouchEvent) => { y0.current = e.touches[0].clientY; };
  const move = (e: React.TouchEvent) => { if (!locked && y0.current != null) setDy(Math.max(0, e.touches[0].clientY - y0.current)); };
  const end = () => { if (dy > 90) onClose(); setDy(0); y0.current = null; };
  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true">
      <div className="sheet-bg" aria-hidden="true" onClick={locked ? undefined : onClose} />
      <div className="sheet" style={{ transform: dy ? `translateY(${dy}px)` : undefined, transition: dy ? 'none' : undefined }}>
        <div className="sheet-head" onTouchStart={start} onTouchMove={move} onTouchEnd={end}>
          <div className="sheet-grab" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <b style={{ flex: 1, fontSize: 17 }}>{title}</b>
            <button className="btn sm ghost" onClick={onClose} aria-label="닫기">✕</button>
          </div>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

// 알림: toast('아멘 4두 등록완료', { label: '되돌리기', run: () => … })
type T = { id: number; text: string; act?: { label: string; run: () => void } };
let push: ((t: T) => void) | null = null;
export const toast = (text: string, act?: T['act']) => push?.({ id: Date.now(), text, act });
export function Toaster() {
  const [t, setT] = useState<T | null>(null);
  useEffect(() => { push = setT; return () => { push = null; }; }, []);
  useEffect(() => { if (!t) return; const h = setTimeout(() => setT(null), 6000); return () => clearTimeout(h); }, [t]);
  if (!t) return null;
  return (
    <div className="toast" role="status">
      <span style={{ flex: 1 }}>{t.text}</span>
      {t.act && <button onClick={() => { t.act!.run(); setT(null); }}>{t.act.label}</button>}
      <button aria-label="닫기" onClick={() => setT(null)}>✕</button>
    </div>
  );
}

// 큰 − / + 숫자 버튼 (가운데 숫자는 눌러서 직접 입력)
export function Stepper({ value, onChange, min = 1, max = 300 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  const set = (n: number) => onChange(Math.min(max, Math.max(min, n)));
  return (
    <div className="stepper">
      <button type="button" aria-label="줄이기" onClick={() => set(value - 1)} disabled={value <= min}>−</button>
      <input aria-label="두수" inputMode="numeric" value={value} onFocus={(e) => e.target.select()} onChange={(e) => { const n = parseInt(e.target.value.replace(/[^\d]/g, ""), 10); if (!isNaN(n)) set(n); }} />
      <button type="button" aria-label="늘리기" onClick={() => set(value + 1)} disabled={value >= max}>+</button>
    </div>
  );
}
