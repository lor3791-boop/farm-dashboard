// 농장 공유 사이트 주소 — 대시보드와 다른 저장소(lor3791-boop/farm-view)에 따로 올린다.
// 공유 주소 = SHARE_BASE + '#' + 열쇠. 열쇠만으로는 대시보드 주소·농장 이름을 알 수 없다.
export const SHARE_BASE = 'https://lor3791-boop.github.io/farm-view/';
export const shareUrl = (key: string) => SHARE_BASE + '#' + key;
