// Firebase 웹 앱 설정값 (farm-dashboard-2e9aa, Firestore 서울 asia-northeast3).
// 이 값은 공개되어도 되는 값이다 — 실제 접근 제어는 firestore.rules(로그인한 관리자만)로 한다.
// null 로 바꾸면 '미리보기 모드'(이 브라우저에만 저장)로 동작한다.
export const firebaseConfig: Record<string, string> | null = {
  apiKey: 'AIzaSyCeEyQsFx9GNP57gdUqrVO7J4ImCpg61OY',
  authDomain: 'farm-dashboard-2e9aa.firebaseapp.com',
  projectId: 'farm-dashboard-2e9aa',
  storageBucket: 'farm-dashboard-2e9aa.firebasestorage.app',
  messagingSenderId: '208989029585',
  appId: '1:208989029585:web:afae8822347f70493eb1f0'
};

// 관리자(지역부장) 구글 계정. firestore.rules 의 isAdmin() 과 같은 값이어야 한다.
export const ADMIN_EMAILS = ['lor3791@gmail.com'];
