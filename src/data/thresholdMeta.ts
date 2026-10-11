// 기준값 화면의 묶음·이름·단위. 새 기준값은 types.ts + seed.ts + 여기 세 곳에 추가한다.
import type { Thresholds } from './types';
type K = keyof Thresholds;
export const THRESHOLD_GROUPS: { title: string; note?: string; items: { k: K; label: string; unit: string }[] }[] = [
  { title: '작업 알림', note: '전입평체가 기준 체중 미만이면 전입일 기준, 이상이면 일령 기준 (최소 전입 + N일)', items: [
    { k: 'workWeightKg', label: '체중 기준', unit: 'kg' },
    { k: 'fmdDaysAfterEntry', label: '구제역 · 기준 미만', unit: '전입+일' },
    { k: 'fmdAgeHeavy', label: '구제역 · 기준 이상', unit: '일령' },
    { k: 'dewormDaysAfterEntry', label: '구충·사료변경 · 기준 미만', unit: '전입+일' },
    { k: 'dewormAgeHeavy', label: '구충·사료변경 · 기준 이상', unit: '일령' },
    { k: 'minDaysAfterEntry', label: '기준 이상 로트 최소', unit: '전입+일' }
  ] },
  { title: '출하지연 경고', items: [
    { k: 'delayNoShipAge', label: '출하 0두', unit: '일령 이상' },
    { k: 'delayRemainAge', label: '재고 남음', unit: '일령 이상' },
    { k: 'firstShipOverdueDays', label: '첫출하예정 경과', unit: '일' }
  ] },
  { title: '정산예정 추천', note: '셋 중 하나라도 맞으면 추천. 진행률이 멈춤 기준 미만이면 경고', items: [
    { k: 'settleProgressPct', label: '출하진행률', unit: '% 이상' },
    { k: 'settleStockPct', label: '재고 ≤ 전입의', unit: '%' },
    { k: 'settleLastShipDays', label: '마지막 출하 후', unit: '일' },
    { k: 'settleLastShipMinProgress', label: '위 조건의 최소 진행률', unit: '%' },
    { k: 'stallProgressPct', label: '출하 멈춤 경고', unit: '% 미만' }
  ] },
  { title: '육성률·문제농가', items: [
    { k: 'problemSurvivalPct', label: '문제농가 (그룹 육성률)', unit: '% 미만' }
  ] },
  { title: '출하·전입 일정', note: '첫출하예정 = 전입일 + (첫출하 체중 − 전입평체) ÷ 일당증체량', items: [
    { k: 'firstShipWeightKg', label: '첫출하 체중', unit: 'kg' },
    { k: 'targetShipWeightKg', label: '출하평체 목표', unit: 'kg' },
    { k: 'defaultAdgKg', label: '일당증체량 기본값', unit: 'kg/일' },
    { k: 'shipPeriodDays', label: '출하기간', unit: '일' },
    { k: 'emptyDays', label: '돈사 비움', unit: '일' },
    { k: 'truckHeadsMin', label: '차당 상차 (최소)', unit: '두' },
    { k: 'truckHeadsMax', label: '차당 상차 (최대)', unit: '두' }
  ] }
];
