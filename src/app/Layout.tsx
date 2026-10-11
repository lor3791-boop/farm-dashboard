// 뼈대 — 목업 v5와 같은 좌측 메뉴(초록), 제목 줄, 공통 필터 띠. 폰에서는 메뉴가 ☰로 접힌다.
import { useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MENU } from './menu';
import { FilterBar } from './FilterBar';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { name, repo, signOut } = useAuth();
  const { error } = useData();
  const loc = useLocation();
  const cur = MENU.find((m) => (m.path === '/' ? loc.pathname === '/' : loc.pathname.startsWith(m.path))) ?? MENU[0];

  const nav = (
    <nav style={{ background: '#1F4E3D', padding: '22px 14px', boxSizing: 'border-box', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, padding: '0 8px' }}>담당농장 대시보드</div>
      <div style={{ color: '#A9C6B8', fontSize: 12, padding: '4px 8px 14px' }}>1단계 · 10/11 기준</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {MENU.map((m) => (
          <NavLink key={m.path} to={m.path} end={m.path === '/'} onClick={() => setOpen(false)} className={({ isActive }) => (isActive ? 'nav on' : 'nav')}>{m.label}</NavLink>
        ))}
      </div>
      <div style={{ margin: '22px 8px 0', paddingTop: 14, borderTop: '1px solid #2F6B55', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <a href="#/share?farm=민서" onClick={() => setOpen(false)} style={{ color: '#FCE3A6', fontSize: 14 }}>농장 공유 화면 보기 →</a>
        <a href="https://lor3791-boop.github.io/luka-piglets/" target="_blank" rel="noreferrer" style={{ color: '#FCE3A6', fontSize: 14 }}>루카 현황판 ↗</a>
      </div>
      <div style={{ marginTop: 'auto', padding: '24px 8px 0', color: '#A9C6B8', fontSize: 12 }}>
        {name && <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>}
        <div>{repo?.mode === 'cloud' ? '클라우드 저장 (Firebase)' : '미리보기 · 이 브라우저에만 저장'}</div>
        {repo?.mode === 'cloud' && <button onClick={signOut} style={{ marginTop: 6, color: '#DCE9E2', fontSize: 12, minHeight: 32, textDecoration: 'underline' }}>로그아웃</button>}
      </div>
    </nav>
  );

  return (
    <div className="v5" style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className="hidden lg:block" style={{ width: 201, flex: 'none', background: '#1F4E3D' }}><div style={{ position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>{nav}</div></aside>
      {open && (
        <div className="lg:hidden" style={{ position: 'fixed', inset: 0, zIndex: 40 }}>
          <button aria-label="메뉴 닫기" onClick={() => setOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(20,30,25,.35)' }} />
          <aside style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: 240 }}>{nav}</aside>
        </div>
      )}
      <main style={{ flex: '999 1 560px', minWidth: 0, padding: '22px 26px 48px', boxSizing: 'border-box', maxWidth: 1400 }} className="max-sm:!px-4">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="flex items-center justify-center lg:hidden" aria-label="메뉴 열기" onClick={() => setOpen(true)} style={{ width: 44, height: 44, borderRadius: 8, fontSize: 22 }}>☰</button>
            <h1 style={{ margin: 0, fontSize: 24 }}>{cur.label}</h1>
          </div>
          <span className="chip warn">재고·전입·폐사·주차 기록은 10/9 실제값 · 피그온 업로드 연결 전</span>
        </div>
        {repo?.mode === 'local' && <div className="chip info" style={{ display: 'block', whiteSpace: 'normal', marginBottom: 12 }}>미리보기 모드 — 체크·입력은 이 브라우저에만 저장됩니다. Firebase 연결 후 구글 로그인하면 모든 기기에서 같은 자료를 봅니다.</div>}
        {error && <div className="chip bad" style={{ display: 'block', whiteSpace: 'normal', marginBottom: 12 }}>서버 연결 오류: {error} — Firestore 규칙 게시 여부를 확인하세요</div>}
        {cur.filter && <FilterBar />}
        {children}
      </main>
    </div>
  );
}
