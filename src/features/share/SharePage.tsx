// 대시보드 안 미리보기 — 농장 공유 사이트(농장 앱)와 같은 화면. 등록·수정이 대시보드 폐사 목록과 그대로 연동된다.
import { useSearchParams } from 'react-router-dom';
import { useHerd } from '@/lib/ui';
import { useAuth } from '@/lib/auth';
import { buildGroups, buildTasks, REF, TODAY } from '@/lib/calc/herd';
import { allShips } from '@/lib/calc/ship';
import { ShareView } from '@/share/ShareView';
import { buildSharePayload } from '@/share/payload';
import { todayKST } from '@/lib/util';

export function SharePage() {
  const [sp] = useSearchParams();
  const { all, farms, deaths, ships, saved, T } = useHerd();
  const { repo, email } = useAuth();
  const farm = sp.get('farm') && farms.includes(sp.get('farm')!) ? sp.get('farm')! : farms[0];
  if (!farm || !T) return null;
  // 이 농장 폐사는 농장 앱 화면이 직접 더하므로 빼고 계산
  const mine = deaths.filter((d) => d.farm === farm);
  const g = buildGroups(T, saved.firstShipByFarm, { deaths: deaths.filter((d) => d.farm !== farm), ships: ships.map((x) => ({ farm: x.farm, group: x.group, date: x.date, n: x.n })) });
  const p = { ...buildSharePayload(farm, g, buildTasks(all), allShips(ships), REF, TODAY, T.problemSurvivalPct), today: todayKST() };
  const key = saved.shareLinks[farm] ?? '';
  return (
    <>
      <div style={{ background: '#1F4E3D', color: '#fff', fontSize: 13, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span>농장 앱 미리보기 · {farm}</span><a href="#/input" style={{ color: '#FCE3A6' }}>대시보드로</a>
      </div>
      <ShareView key={farm} p={p} deaths={mine}
        onSaveDeath={(d) => repo!.addDeath({ ...d, farm }, repo!.mode === 'local' ? 'share' : email, key)}
        onEditDeath={async (id, d) => { const row = mine.find((x) => x.id === id); if (row) await repo!.updateDeath(row, d, email); }} />
    </>
  );
}
