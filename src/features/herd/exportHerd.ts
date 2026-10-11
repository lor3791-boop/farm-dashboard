// 돈군 표 엑셀 내보내기 — 보이는 그룹 전체, 열은 표와 같은 순서
import type { Thresholds } from '@/data/types';
import type { Group } from '@/lib/calc/herd';
import { addIso } from '@/lib/calc/dates';
import { downloadXlsx } from '@/lib/xlsx';

export async function exportHerd(rows: Group[], T: Thresholds, isPlanned: (g: Group) => boolean) {
  await downloadXlsx('돈군현황', [{
    name: '돈군',
    head: ['농장', '그룹', '동', '전입일', '주차', '일령', '전입평체', '실두수', '클레임', '전입(실정산)', '폐사', '육성률(%)', '출하', '재고', '진행률(%)', '예상출하', '첫출하예정', '출하종료', '다음 전입', '정산예정', '경고'],
    rows: rows.map((r) => [r.farm, r.group, r.dong, r.date, r.week, r.age, r.avgw, r.inn, r.claim, r.net, r.death, r.surv, r.sold, r.stock, r.prog, r.exp, r.sold > 0 ? '출하 중' : r.first, addIso(r.first, T.shipPeriodDays), addIso(r.first, T.shipPeriodDays + T.emptyDays), isPlanned(r) ? 'Y' : '', r.warn.join(' · ')])
  }]);
}
