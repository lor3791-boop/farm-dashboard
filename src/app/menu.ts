// 좌측 메뉴 정의 — 메뉴 추가·순서 변경은 이 파일만 고친다.
// sub = 메뉴 아래로 펼쳐지는 하위 항목(각 화면의 탭과 같음). tab = 그 탭을 기억하는 화면 상태 이름, 없으면 주소(/luka/status)로 구분
import type { UiState } from '@/lib/ui';
export type TabKey = 'herdTab' | 'shipTab' | 'deathTab' | 'anTab' | 'setTab' | 'bondTab';
export interface MenuItem { path: string; label: string; filter: boolean; accent?: boolean; sub?: [string, string][]; tab?: TabKey }
export const SUBS = {
  herd: [['herd', '돈군'], ['entry', '전입등록'], ['warn', '출하지연'], ['fcr', 'FCR 추이']],
  ship: [['status', '출하현황'], ['input', '출하입력'], ['grade', '농장별 출하성적'], ['fc', '원료돈 예상물량']],
  death: [['status', '폐사현황'], ['input', '폐사입력'], ['list', '폐사입력현황'], ['farm', '농장입력']],
  an: [['surv', '예상육성률'], ['rank', '폐사율 순위'], ['report', '보고자료']],
  settle: [['plan', '정산예정'], ['excel', '정산자료 엑셀'], ['feed', '사료 사용'], ['vaccine', '구제역 백신비']],
  bond: [['sum', '종합현황'], ['loan', '일반선급금'], ['monthly', '월대선급금']],
  luka: [['status', '후기자돈현황'], ['dash', '전입출 현황판'], ['calendar', '전입전출 계획표'], ['feed', '사육비산출']]
} satisfies Record<string, [string, string][]>;
export const MENU: MenuItem[] = [
  { path: '/', label: '홈', filter: true },
  { path: '/herd', label: '사육현황', filter: true, sub: SUBS.herd, tab: 'herdTab' },
  { path: '/ship', label: '출하관리', filter: false, sub: SUBS.ship, tab: 'shipTab' },
  { path: '/death', label: '폐사관리', filter: false, sub: SUBS.death, tab: 'deathTab' },
  { path: '/analysis', label: '성적분석', filter: true, sub: SUBS.an, tab: 'anTab' },
  { path: '/settle', label: '정산자료', filter: false, sub: SUBS.settle, tab: 'setTab' },
  { path: '/bonds', label: '농장채권', filter: false, sub: SUBS.bond, tab: 'bondTab' },
  { path: '/luka', label: '후기자돈사 현황', filter: false, sub: SUBS.luka },
  { path: '/links', label: '농장별 현황 공유링크', filter: false, accent: true },
  { path: '/settings', label: '설정', filter: false }
];
export const tabOf = (s: UiState, k: TabKey) => s[k] as string;
