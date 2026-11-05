// 뼈대 — 좌측 메뉴(초록), 제목 줄, 공통 필터 띠. 폰: 하단 탭바 + ☰(더보기), 옆으로 밀어 탭 넘기기, 당겨서 새로고침. 어디서나 + 버튼(폐사·출하 입력).
import { useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MENU } from './menu';
import { FilterBar } from './FilterBar';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { useSharePublisher } from '@/share/usePublish';
import { useUi } from '@/lib/ui';
import { REF } from '@/lib/calc/herd';
import { pageTabs } from '@/components/v5';
import { Sheet, Toaster } from '@/components/Sheet';

const I = (d: string) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const TABS: [string, string, string][] = [
  ['/', '홈', 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  ['/herd', '사육', 'M4 20V10M10 20V4M16 20v-7M22 20H2'],
  ['/ship', '출하', 'M2 7h12v9H2zM14 10h4l3 3v3h-7M6 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01'],
  ['/death', '폐사', 'M4 5h16v14H4zM4 10h16M9 5v14']
];
// 화면 아래 끝이 옆으로 밀리는 표·칩 줄 안에서 시작한 밀기는 탭 넘기기로 보지 않는다
const inHScroll = (el: EventTarget | null) => { for (let n = el as HTMLElement | null; n && n !== document.body; n = n.parentElement) { if (n.scrollWidth > n.clientWidth + 4 && /(auto|scroll)/.test(getComputedStyle(n).overflowX)) return true; if (n.closest('input,select,textarea,.sheet')) return true; } return false; };

function Fab() {
  const [open, setOpen] = useState(false);
  const { go } = useUi();
  const pick = (f: () => void) => { setOpen(false); f(); };
  const ship = (what: 'manual' | 'grade') => { go('/ship', { shipTab: 'input' }); setTimeout(() => window.dispatchEvent(new CustomEvent('ship-open', { detail: what })), 80); };
  return (
    <>
      <button className="fab" aria-label="입력하기" onClick={() => setOpen(true)}>+</button>
      {open && (
        <Sheet title="무엇을 입력할까요?" onClose={() => setOpen(false)}>
          <div style={{ display: 'grid', gap: 8 }}>
            <button className="fab-opt" onClick={() => pick(() => go('/death', { deathTab: 'input' }))}><b>폐사 입력</b><span className="muted small">농장·동·두수·사진</span></button>
            <button className="fab-opt" onClick={() => pick(() => ship('manual'))}><b>출하 직접 입력</b><span className="muted small">두수·생체중·등급</span></button>
            <button className="fab-opt" onClick={() => pick(() => ship('grade'))}><b>등판서 올리기</b><span className="muted small">등급판정서 엑셀 파일</span></button>
          </div>
        </Sheet>
      )}
    </>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { name, repo, signOut } = useAuth();
  const { error, loading, refresh, data } = useData();
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const t0 = useRef<{ x: number; y: number; top: boolean; h: boolean } | null>(null);
  const onStart = (e: React.TouchEvent) => { const t = e.touches[0]; t0.current = { x: t.clientX, y: t.clientY, top: window.scrollY <= 0, h: inHScroll(e.target) }; };
  const onMove = (e: React.TouchEvent) => { const s0 = t0.current; if (!s0 || !s0.top) return; const dy = e.touches[0].clientY - s0.y, dx = Math.abs(e.touches[0].clientX - s0.x); if (dy > 0 && dy > dx && !document.querySelector('.sheet')) setPull(Math.min(dy, 120)); };
  const onEnd = async (e: React.TouchEvent) => {
    const s0 = t0.current; t0.current = null;
    if (pull > 80) { setPull(0); setBusy(true); try { await Promise.all([refresh(), new Promise((r) => setTimeout(r, 700))]); } finally { setBusy(false); } return; }
    setPull(0);
    if (!s0 || s0.h || document.querySelector('.sheet')) return;
    const t = e.changedTouches[0], dx = t.clientX - s0.x, dy = t.clientY - s0.y;
    if (Math.abs(dx) < 70 || Math.abs(dy) > 45) return;
    const T = pageTabs(); if (!T) return;
    const i = T.opts.findIndex(([k]) => k === T.value), j = i + (dx < 0 ? 1 : -1);
    if (j >= 0 && j < T.opts.length) { T.onPick(T.opts[j][0]); window.scrollTo({ top: 0 }); }
  };
  const loc = useLocation();
  useSharePublisher();
  const cur = MENU.find((m) => (m.path === '/' ? loc.pathname === '/' : loc.pathname.startsWith(m.path))) ?? MENU[0];

  const nav = (
    <nav style={{ background: '#1F4E3D', padding: '22px 14px', boxSizing: 'border-box', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, padding: '0 8px' }}>담당농장 대시보드</div>
      <div style={{ color: '#A9C6B8', fontSize: 12, padding: '4px 8px 14px' }}>피그온 {Number(REF.slice(5, 7))}/{Number(REF.slice(8))} 기준</div>
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
      {(loading || busy) && <div className="loadbar" role="progressbar" aria-label="불러오는 중" />}
      {pull > 0 && <div className="ptr"><span style={{ transform: `translateY(${pull / 3}px)` }}>{pull > 80 ? '놓으면 새로고침' : '↓ 당겨서 새로고침'}</span></div>}
      <main onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} style={{ flex: '999 1 560px', minWidth: 0, padding: '22px 26px 48px', boxSizing: 'border-box', maxWidth: 1400 }} className="max-sm:!px-4 max-lg:!pb-36">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="flex items-center justify-center lg:hidden" aria-label="메뉴 열기" onClick={() => setOpen(true)} style={{ width: 44, height: 44, borderRadius: 8, fontSize: 22 }}>☰</button>
            <h1 style={{ margin: 0, fontSize: 24 }}>{cur.label}</h1>
          </div>
          <span className="chip warn" title="피그온 재고 기준일. 이후 폐사·출하 입력은 재고에서 뺌">{Number(REF.slice(5, 7))}/{Number(REF.slice(8))} 기준</span>
        </div>
        {repo?.mode === 'local' && <div className="chip info" style={{ display: 'block', whiteSpace: 'normal', marginBottom: 12 }}>미리보기 모드 — 체크·입력은 이 브라우저에만 저장됩니다. Firebase 연결 후 구글 로그인하면 모든 기기에서 같은 자료를 봅니다.</div>}
        {error && <div className="chip bad" style={{ display: 'block', whiteSpace: 'normal', marginBottom: 12 }}>서버 연결 오류: {error} — Firestore 규칙 게시 여부를 확인하세요</div>}
        {!data ? (
          <div className="card skel" aria-busy="true" aria-label="불러오는 중">
            <i style={{ width: '40%' }} /><i style={{ width: '85%' }} /><i style={{ width: '70%' }} /><i style={{ width: '90%' }} /><i style={{ width: '60%' }} /><i style={{ width: '75%' }} />
          </div>
        ) : (<>{cur.filter && <FilterBar />}{children}</>)}
      </main>
      <nav className="tabbar lg:hidden" aria-label="주요 메뉴">
        {TABS.map(([p, l, d]) => <NavLink key={p} to={p} end={p === '/'} className={({ isActive }) => (isActive ? 'on' : '')}>{I(d)}{l}</NavLink>)}
        <button onClick={() => setOpen(true)} className={TABS.some(([p]) => p === cur.path) ? '' : 'on'}>{I('M4 6h16M4 12h16M4 18h16')}더보기</button>
      </nav>
      <Fab />
      <Toaster />
    </div>
  );
}
