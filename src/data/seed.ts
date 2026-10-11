// 초기값 — 설계서 v5 '동 배치 초안' 탭, 목업 v5 설정 화면, 인수인계(2026-10-12) 기준.
// 앱 첫 실행 때 저장소가 비어 있으면 이 값으로 채운다. 이후 수정은 설정 화면에서 한다.
import type { Farm, Thresholds, NameMapRow } from './types';

const base = { owner: '', scale: null, address: '', lat: null, lng: null, startDate: '', contractType: '당사기준' as const, active: true, memo: '' };
const d = (...n: (string | number)[]) => n.map((x) => `${x}동`);

export const SEED_FARMS: Farm[] = [
  { ...base, id: 'goldpig', name: '골드피그', type: '위탁', dongs: d(1, 2, '3-1', '3-2'), noDong: false, order: 1, memo: '신규(출하 전). 출하실적종합의 피그팜(금종찬)은 같은 사장님의 다른 농장 — 담당 아님' },
  { ...base, id: 'luka', name: '루카', type: '위탁', dongs: [], noDong: false, order: 2, memo: '동 목록 확인 필요 (돈수불 재고 없음)' },
  { ...base, id: 'myeongim', name: '명임', type: '위탁', dongs: [], noDong: true, order: 3, memo: '동을 옮겨 키움 → 그룹으로만 관리. 사장님께 돈군 이동 시 동 기재 요청 예정' },
  { ...base, id: 'minseo', name: '민서', owner: '최진수', type: '위탁', dongs: d(1, 2, 3, 4), noDong: false, order: 4 },
  { ...base, id: 'sanseong', name: '산성농원', type: '위탁', dongs: d(1, 2, 3, 4), noDong: false, order: 5, scale: 2400 },
  { ...base, id: 'sehee', name: '세희', type: '위탁', dongs: d(1, 3, 4), noDong: false, order: 6 },
  { ...base, id: 'amen', name: '아멘', type: '위탁', dongs: d(1, 2, 3, 4), noDong: false, order: 7 },
  { ...base, id: 'yob', name: '욥', type: '위탁', dongs: d(1, 2, 3), noDong: false, order: 8 },
  { ...base, id: 'yongam', name: '용암', type: '위탁', dongs: d(1, 2, 3, 4), noDong: false, order: 9, memo: '용암 4동 포함. 용지단지(재성·용암·태준·용궁)' },
  { ...base, id: 'wongarim', name: '원가림', type: '위탁', dongs: d(1, 2), noDong: false, order: 10 },
  { ...base, id: 'jaeseong', name: '재성', owner: '박상배', type: '위탁', dongs: d(1, 2, 3, 4), noDong: false, order: 11, memo: '용지단지' },
  { ...base, id: 'jeongchuksan', name: '정축산', type: '위탁', dongs: d(1, 2), noDong: false, order: 12 },
  { ...base, id: 'pyeongji', name: '평지', type: '위탁', dongs: d(1, 2), noDong: false, order: 13 },
  { ...base, id: 'luka-nursery', name: '자돈_루카', type: '후기자돈사', dongs: [], noDong: true, order: 14, memo: '후기자돈사. 1단계는 요약 + 기존 루카 현황판 연결' }
];

export const SEED_THRESHOLDS: Thresholds = {
  workWeightKg: 35,
  fmdDaysAfterEntry: 60,
  fmdAgeHeavy: 130,
  dewormDaysAfterEntry: 30,
  dewormAgeHeavy: 100,
  minDaysAfterEntry: 7,
  delayNoShipAge: 170,
  delayRemainAge: 190,
  firstShipOverdueDays: 7,
  settleProgressPct: 90,
  settleStockPct: 10,
  settleLastShipDays: 14,
  settleLastShipMinProgress: 50,
  stallProgressPct: 50,
  problemSurvivalPct: 94,
  shipPeriodDays: 42,
  emptyDays: 7,
  firstShipWeightKg: 113,
  targetShipWeightKg: 117,
  defaultAdgKg: 0.95,
  truckHeadsMin: 60,
  truckHeadsMax: 70
};

export const SEED_NAMEMAP: NameMapRow[] = [
  { id: 'n1', kind: '농장주', source: '최진수', sourceFile: '등판서 출하자', target: '민서', excluded: false, memo: '' },
  { id: 'n2', kind: '농가', source: '민서(최진수)', sourceFile: '출하실적종합', target: '민서', excluded: false, memo: '' },
  { id: 'n3', kind: '농가', source: '재성(박상배)', sourceFile: '피그온', target: '재성', excluded: false, memo: '' },
  { id: 'n4', kind: '농가', source: '용암농장', sourceFile: '피그온', target: '용암', excluded: false, memo: '' },
  { id: 'n5', kind: '농가', source: '피그팜(금종찬)', sourceFile: '출하실적종합', target: '', excluded: true, memo: '골드피그와 같은 사장님의 다른 농장' },
  { id: 'n6', kind: '출하처', source: '음성신선공장(팜스코)', sourceFile: '출하실적종합', target: '신선', excluded: false, memo: '' }
];

// 이름이 바뀐 적 있는 키 목록 — 테스트용 기대값
export const EXPECTED_FARM_NAMES = ['골드피그', '루카', '명임', '민서', '산성농원', '세희', '아멘', '욥', '용암', '원가림', '재성', '정축산', '평지'];
