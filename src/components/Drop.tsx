// 파일 끌어놓기 — 카드(둥근 사각형) 위로 파일을 끌어다 놓으면 올리기 버튼과 같은 처리
import { useRef, useState, type CSSProperties, type ReactNode } from 'react';

export function useDrop(onFiles: (L: File[]) => void, accept?: string) {
  const [over, setOver] = useState(false);
  const n = useRef(0);
  const ok = (f: File) => {
    if (!accept) return true;
    const name = f.name.toLowerCase();
    if (accept.includes('image/') && /\.hei[cf]$/.test(name)) return true; // HEIC는 type이 비어 오는 경우가 있음
    return accept.split(',').map((x) => x.trim().toLowerCase()).some((a) => (a.startsWith('.') ? name.endsWith(a) : a.endsWith('/*') ? f.type.startsWith(a.slice(0, -1)) : f.type === a));
  };
  const has = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes('Files');
  const props = {
    onDragEnter: (e: React.DragEvent) => { if (!has(e)) return; e.preventDefault(); n.current++; setOver(true); },
    onDragOver: (e: React.DragEvent) => { if (!has(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; },
    onDragLeave: (e: React.DragEvent) => { if (!has(e)) return; n.current = Math.max(0, n.current - 1); if (!n.current) setOver(false); },
    onDrop: (e: React.DragEvent) => {
      if (!has(e)) return;
      e.preventDefault(); e.stopPropagation(); n.current = 0; setOver(false);
      const L = Array.from(e.dataTransfer.files).filter(ok);
      if (L.length) onFiles(L);
    }
  };
  const style: CSSProperties = over ? { outline: '2px dashed #1F4E3D', outlineOffset: -4, background: '#EEF5F0' } : {};
  return { props, style, over };
}

// <div className="card"> 대신 쓰는 끌어놓기 카드
export function DropCard({ onFiles, accept, className = 'card', style, children }: { onFiles: (L: File[]) => void; accept?: string; className?: string; style?: CSSProperties; children: ReactNode }) {
  const d = useDrop(onFiles, accept);
  return <div className={className} style={{ ...style, ...d.style }} {...d.props}>{children}</div>;
}
