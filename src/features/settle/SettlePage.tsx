// 정산자료 — 정산예정 / 정산자료 엑셀 / 사료 사용(그룹 사료·중간투입) / 구제역 백신비
import { SUBS } from '@/app/menu';
import type { UiState } from '@/lib/ui';
import { useHerd } from '@/lib/ui';
import { Tabs } from '@/components/v5';
import { SettlePlan } from './SettlePlan';
import { SettleExcel } from './SettleExcel';
import { FeedTab } from './FeedTab';
import { VaccineTab } from './VaccineTab';

export function SettlePage() {
  const { s, set } = useHerd();
  return (
    <>
      <Tabs opts={SUBS.settle as [UiState['setTab'], string][]} value={s.setTab} onPick={(k) => set({ setTab: k })} />
      {s.setTab === 'plan' && <SettlePlan />}
      {s.setTab === 'excel' && <SettleExcel />}
      {s.setTab === 'feed' && <FeedTab />}
      {s.setTab === 'vaccine' && <VaccineTab />}
    </>
  );
}
