// 데이터 구조 — 설계서 '데이터 구조' 표의 농장·설정·이름 맞춤표 묶음.
// 그룹·로트·폐사·출하 등은 묶음 2부터 추가한다.

export type FarmType = '위탁' | '후기자돈사';
export type ContractType = '당사기준' | '출하두당' | '전입두당' | '기타';

export interface Farm {
  id: string;            // 영문/숫자 고정 키 (예: minseo). 이름이 바뀌어도 유지
  name: string;          // 대시보드 표시 이름 (예: 민서)
  owner: string;         // 농장주
  type: FarmType;
  dongs: string[];       // 동 목록 (예: ['1동','2동']). 동 없이 관리하면 빈 배열
  noDong: boolean;       // true = 동 없이 그룹으로만 관리 (명임)
  scale: number | null;  // 사육 규모(두)
  address: string;
  lat: number | null;
  lng: number | null;
  startDate: string;     // 거래개시일 YYYY-MM-DD
  contractType: ContractType;
  active: boolean;       // 담당 여부
  order: number;         // 표시 순서
  memo: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Thresholds {
  workWeightKg: number;          // 작업 알림 체중 기준 (전입평체)
  fmdDaysAfterEntry: number;     // 35kg 미만: 구제역 = 전입 + N일
  fmdAgeHeavy: number;           // 35kg 이상: 구제역 = N일령
  dewormDaysAfterEntry: number;  // 35kg 미만: 구충·사료변경 = 전입 + N일
  dewormAgeHeavy: number;        // 35kg 이상: 구충·사료변경 = N일령
  minDaysAfterEntry: number;     // 35kg 이상 로트도 최소 전입 + N일
  delayNoShipAge: number;        // 출하지연: N일령 이상 + 출하 0
  delayRemainAge: number;        // 출하지연: N일령 이상 + 재고 남음
  firstShipOverdueDays: number;  // 첫출하예정 N일 경과
  settleProgressPct: number;     // 정산예정 추천: 출하진행률 %
  settleStockPct: number;        // 정산예정 추천: 재고 ≤ 전입의 %
  settleLastShipDays: number;    // 정산예정 추천: 마지막 출하 후 N일
  settleLastShipMinProgress: number; // 위 조건의 최소 진행률 %
  stallProgressPct: number;      // 진행률 N% 미만이면 '출하 멈춤' 경고
  problemSurvivalPct: number;    // 문제농가: 그룹 육성률 N% 미만
  shipPeriodDays: number;        // 출하기간 (첫출하 → 출하종료)
  emptyDays: number;             // 돈사 비움 (출하종료 → 다음 전입)
  firstShipWeightKg: number;     // 첫출하 목표 체중
  targetShipWeightKg: number;    // 출하평체 목표
  defaultAdgKg: number;          // 일당증체량 기본값 (농장 실적 없을 때)
  truckHeadsMin: number;         // 차당 상차두수
  truckHeadsMax: number;
}

export type NameKind = '농가' | '농장주' | '이력번호' | '출하처' | '그룹';

export interface NameMapRow {
  id: string;
  kind: NameKind;
  source: string;   // 파일에 적힌 이름
  sourceFile: string; // 어느 파일에서 (등판서/출하실적종합/피그온 등)
  target: string;   // 대시보드 농장 이름. 담당 아님이면 '' + excluded
  excluded: boolean; // 담당 아님 (업로드 때 건너뜀)
  memo: string;
}

// 화면에서 체크한 값 — 정산예정 수동 추가/제외, 작업 완료, 폭염 인정두수
export interface UiSaved {
  planned: Record<string, boolean>;  // '민서 26-7' → true(추가)/false(제외). 없으면 추천 규칙대로
  done: Record<string, boolean>;     // '민서 26-8|구제역 백신|11-10' → 완료
  heatVals: Record<string, string>;  // 그룹 → 폭염 인정두수
  firstShipByFarm: Record<string, number>; // 농장별 첫출하 체중 (없으면 기준값)
  shareLinks: Record<string, string>;      // 농장 → 공유 화면 열쇠(무작위 16자). 주소에 농장 이름·대시보드 주소가 드러나지 않음
}

export interface AppData {
  farms: Farm[];
  thresholds: Thresholds;
  nameMap: NameMapRow[];
  ui: UiSaved;
}

// 출하 직접 입력 (등급판정서 없이) — 출하성적 분석에 출하실적종합과 함께 들어간다
export interface ManualShip {
  id: string; farm: string; group: string; date: string; dest: string;
  n: number; live: number; yld: number; pay: number | null; price: number | null;
  g1p: number; g1: number; g2: number; out: number; lowReason: string; writer: string; by?: string; at?: string;
  // 등판서 업로드분: kind 'grade', 도체중 합(carc), 같은 파일 묶음(batch), 도체번호 구간(range)
  kind?: 'manual' | 'grade'; carc?: number; batch?: string; file?: string; range?: string; plant?: string;
}
