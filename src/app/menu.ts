// 좌측 메뉴 정의 — 메뉴 추가·순서 변경은 이 파일만 고친다.
export interface MenuItem { path: string; label: string; filter: boolean }
export const MENU: MenuItem[] = [
  { path: '/', label: '홈', filter: true },
  { path: '/herd', label: '사육현황', filter: true },
  { path: '/ship', label: '출하관리', filter: false },
  { path: '/death', label: '폐사관리', filter: false },
  { path: '/analysis', label: '성적분석', filter: true },
  { path: '/settle', label: '정산자료', filter: false },
  { path: '/bonds', label: '농장채권', filter: false },
  { path: '/settings', label: '설정', filter: false }
];
