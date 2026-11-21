// 좌측 메뉴 정의 — 메뉴 추가·순서 변경은 이 파일만 고친다.
export interface MenuItem { path: string; label: string; filter: boolean; accent?: boolean; sub?: [string, string][] }
export const MENU: MenuItem[] = [
  { path: '/', label: '홈', filter: true },
  { path: '/herd', label: '사육현황', filter: true },
  { path: '/ship', label: '출하관리', filter: false },
  { path: '/death', label: '폐사관리', filter: false },
  { path: '/analysis', label: '성적분석', filter: true },
  { path: '/settle', label: '정산자료', filter: false },
  { path: '/bonds', label: '농장채권', filter: false },
  { path: '/luka', label: '후기자돈사 현황', filter: false, sub: [['status', '후기자돈현황'], ['dash', '전입출 현황판'], ['calendar', '전입전출 계획표'], ['feed', '사육비산출']] },
  { path: '/links', label: '농장별 현황 공유링크', filter: false, accent: true },
  { path: '/settings', label: '설정', filter: false }
];
