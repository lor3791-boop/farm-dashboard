// 대시보드 안 미리보기 — 농장 공유 사이트와 같은 화면을 부장님이 미리 본다 (부장님 로그인 전용)
import { useSearchParams } from 'react-router-dom';
import { useHerd } from '@/lib/ui';
import { useAuth } from '@/lib/auth';
import { useCol } from '@/lib/useCol';
import { buildTasks, REF, TODAY } from '@/lib/calc/herd';
import { allShips } from '@/lib/calc/ship';
import type { ManualShip } from '@/data/types';
import { ShareView } from '@/share/ShareView';
import { buildSharePayload } from '@/share/payload';

export function SharePage() {
  const [sp] = useSearchParams();
  const { all, farms } = useHerd();
  const { repo, email } = useAuth();
  const manual = useCol<ManualShip>('shipments');
  const farm = sp.get('farm') && farms.includes(sp.get('farm')!) ? sp.get('farm')! : farms[0];
  if (!farm) return null;
  const p = buildSharePayload(farm, all, buildTasks(all), allShips(manual), REF, TODAY);
  return (
    <>
      <div style={{ background: '#1F4E3D', color: '#fff', fontSize: 13, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span>미리보기 · {farm}</span><a href="#/settings" style={{ color: '#FCE3A6' }}>대시보드로</a>
      </div>
      <ShareView key={farm} p={p} onSaveDeath={(d) => repo!.addDeath({ ...d, farm }, email)} />
    </>
  );
}
