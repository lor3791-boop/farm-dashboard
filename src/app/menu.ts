// 좌측 메뉴 정의 — 메뉴 추가·순서 변경은 이 파일만 고친다.
import { Home, PenLine, Rows3, BarChart3, FileSpreadsheet, Settings, type LucideIcon } from 'lucide-react';
export interface MenuItem { path: string; label: string; icon: LucideIcon; bundle: number; tabs: string[] }
export const MENU: MenuItem[] = [
  { path: '/', label: '홈', icon: Home, bundle: 2, tabs: ['KPI', '이번 주 작업', '이번 달 정산예정', '농장 현황'] },
  { path: '/input', label: '입력', icon: PenLine, bundle: 2, tabs: ['폐사', '출하', '전입·배치', '사료·백신비'] },
  { path: '/herd', label: '돈군', icon: Rows3, bundle: 2, tabs: ['돈군 표', '주차 히트맵', '그룹 상세'] },
  { path: '/analysis', label: '분석', icon: BarChart3, bundle: 5, tabs: ['정산예정', '예상육성률', '폐사율 순위', '출하지연', '출하성적'] },
  { path: '/report', label: '보고·정산', icon: FileSpreadsheet, bundle: 5, tabs: ['현황보고서', '정산자료 엑셀'] },
  { path: '/settings', label: '설정', icon: Settings, bundle: 1, tabs: ['농장·동', '기준값', '이름 맞춤표', '백업'] }
];
// 각 묶음에서 채워지는 내용 (설계서 '1단계 제작 순서')
export const BUNDLES: Record<number, string> = {
  1: '뼈대 + 설정',
  2: '전입·배치 + 재고 + 작업 알림',
  3: '폐사입력 통합',
  4: '출하입력 + 출하성적',
  5: '월간현황 + 보고서 출력',
  6: '농장 공유 화면 + 후기자돈사'
};
