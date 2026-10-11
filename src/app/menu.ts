// 좌측 메뉴 정의 — 메뉴 추가·순서 변경은 이 파일만 고친다. (목업 v5: 6개 메뉴)
export interface MenuItem { path: string; label: string; filter: boolean }
export const MENU: MenuItem[] = [
  { path: '/', label: '홈', filter: true },
  { path: '/input', label: '입력', filter: false },
  { path: '/herd', label: '돈군', filter: true },
  { path: '/analysis', label: '분석', filter: true },
  { path: '/report', label: '보고·정산', filter: false },
  { path: '/settings', label: '설정', filter: false }
];
