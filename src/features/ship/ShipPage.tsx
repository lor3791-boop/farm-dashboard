// 출하관리 — 출하입력(등판서·직접 입력·출하 현황) / 농장별 출하성적
import { useHerd } from '@/lib/ui';
import { Tabs } from '@/components/v5';
import { ShipUpload, ShipStatus, ShipImportCard } from './Ship';
import { ShipManualList } from './ShipManual';
import { ShipGrade } from './ShipGrade';

export function ShipPage() {
  const { s, set } = useHerd();
  return (
    <>
      <Tabs opts={[['input', '출하입력'], ['grade', '농장별 출하성적']]} value={s.shipTab} onPick={(k) => set({ shipTab: k })} />
      {s.shipTab === 'input' && (<><ShipUpload /><ShipImportCard /><ShipStatus /><ShipManualList /></>)}
      {s.shipTab === 'grade' && (<><ShipImportCard /><div style={{ height: 16 }} /><ShipGrade /></>)}
    </>
  );
}
