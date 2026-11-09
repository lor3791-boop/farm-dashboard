// 출하관리 — 출하현황(이번 달) / 출하입력(등판서·직접 입력·자료 올리기·등록 기록) / 농장별 출하성적
import { ShipTotalCard } from './ShipTotal';
import { useHerd } from '@/lib/ui';
import { Tabs } from '@/components/v5';
import { ShipUpload, ShipStatus, ShipImportCard } from './Ship';
import { ShipManualList } from './ShipManual';
import { ShipGrade } from './ShipGrade';
import { Forecast } from './Forecast';

export function ShipPage() {
  const { s, set } = useHerd();
  return (
    <>
      <Tabs opts={[['status', '출하현황'], ['input', '출하입력'], ['grade', '농장별 출하성적'], ['fc', '원료돈 예상물량']]} value={s.shipTab} onPick={(k) => set({ shipTab: k })} />
      {s.shipTab === 'status' && <ShipStatus />}
      {s.shipTab === 'input' && (<><ShipUpload /><ShipTotalCard /><ShipImportCard /><ShipManualList /></>)}
      {s.shipTab === 'fc' && <Forecast />}
      {s.shipTab === 'grade' && (<><ShipImportCard /><div style={{ height: 16 }} /><ShipGrade /></>)}
    </>
  );
}
