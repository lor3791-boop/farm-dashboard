// 좌우로 밀어 탭 넘길 때 화면이 손가락을 따라 움직이고, 넘어가면 옆에서 미끄러져 들어온다
import { useState, type CSSProperties } from 'react';

export function useSwipeFx() {
  const [dx, setDx] = useState(0);
  const [anim, setAnim] = useState<'' | 'l' | 'r'>('');
  const style: CSSProperties = dx
    ? { transform: `translateX(${dx}px)`, opacity: 1 - Math.min(Math.abs(dx) / 500, 0.3), transition: 'none', willChange: 'transform' }
    : { transition: 'transform .2s ease, opacity .2s ease' };
  return {
    style,
    cls: anim ? 'swin-' + anim : '',
    // 저항감: 손가락 이동의 절반만
    drag: (d: number) => setDx(Math.max(-160, Math.min(160, d * 0.5))),
    release: () => setDx(0),
    enter: (dir: 'l' | 'r') => { setDx(0); setAnim(''); requestAnimationFrame(() => setAnim(dir)); setTimeout(() => setAnim(''), 320); }
  };
}
