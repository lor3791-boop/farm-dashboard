// Firebase 웹 앱 설정값. 부장님이 Firebase 콘솔에서 복사해 준 값을 여기에 넣는다.
// 이 값은 공개되어도 되는 값이다 — 실제 접근 제어는 firestore.rules(로그인한 관리자만)로 한다.
// null 이면 '미리보기 모드'(이 브라우저에만 저장)로 동작한다.
export const firebaseConfig: Record<string, string> | null = null;

// 관리자(지역부장) 구글 계정. firestore.rules 와 같은 값이어야 한다.
export const ADMIN_EMAILS = ['lor3791@gmail.com'];
