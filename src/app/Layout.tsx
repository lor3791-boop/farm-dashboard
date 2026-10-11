import { useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, ExternalLink } from 'lucide-react';
import { MENU } from './menu';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { cn } from '@/lib/util';

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { name, repo, signOut } = useAuth();
  const { error } = useData();
  const loc = useLocation();
  const cur = MENU.find((m) => (m.path === '/' ? loc.pathname === '/' : loc.pathname.startsWith(m.path)));

  const nav = (
    <nav className="flex h-full flex-col bg-brand px-3.5 py-5">
      <div className="px-2 text-[18px] font-bold text-white">담당농장 대시보드</div>
      <div className="px-2 pb-4 pt-1 text-[12px] text-[#A9C6B8]">비육계열 3팀 · 1단계 묶음 1</div>
      <div className="flex flex-col gap-1">
        {MENU.map((m) => (
          <NavLink
            key={m.path}
            to={m.path}
            end={m.path === '/'}
            onClick={() => setOpen(false)}
            className={({ isActive }) => cn('flex min-h-[44px] items-center gap-2.5 rounded-lg px-3 text-[15px]', isActive ? 'bg-brand-600 font-bold text-white' : 'text-[#DCE9E2] hover:bg-[#28604C]')}
          >
            <m.icon size={18} aria-hidden="true" />{m.label}
          </NavLink>
        ))}
      </div>
      <div className="mx-2 mt-6 border-t border-brand-600 pt-3.5 text-[14px]">
        <a href="https://lor3791-boop.github.io/luka-piglets/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#FCE3A6] hover:underline">
          루카 현황판 <ExternalLink size={13} aria-hidden="true" />
        </a>
      </div>
      <div className="mt-auto px-2 pt-6 text-[12px] text-[#A9C6B8]">
        <div className="truncate">{name}</div>
        <div>{repo?.mode === 'cloud' ? '클라우드 저장 (Firebase)' : '미리보기 · 이 브라우저에만 저장'}</div>
        {repo?.mode === 'cloud' && (
          <button onClick={signOut} className="mt-2 inline-flex min-h-[36px] items-center gap-1 text-[#DCE9E2] hover:underline"><LogOut size={14} aria-hidden="true" />로그아웃</button>
        )}
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 lg:block">{nav}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="메뉴 닫기" className="absolute inset-0 bg-[rgba(20,30,25,.35)]" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[240px]">{nav}</aside>
        </div>
      )}
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/95 px-4 py-2 backdrop-blur lg:hidden">
          <button aria-label="메뉴 열기" onClick={() => setOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
          <span className="text-[16px] font-bold">{cur?.label ?? '담당농장 대시보드'}</span>
        </header>
        {repo?.mode === 'local' && (
          <div className="border-b border-[#EAD9B0] bg-warn-bg px-4 py-2 text-[13px] text-warn-fg sm:px-6">
            미리보기 모드입니다. 입력한 내용은 이 브라우저에만 저장됩니다. Firebase를 연결하면 구글 로그인 후 모든 기기에서 같은 자료를 봅니다.
          </div>
        )}
        {error && <div className="border-b border-[#E3B4A3] bg-bad-bg px-4 py-2 text-[13px] text-bad-fg sm:px-6">서버 연결 오류: {error}</div>}
        <div className="mx-auto max-w-[1400px] px-4 pb-12 pt-5 sm:px-6">{children}</div>
      </main>
    </div>
  );
}

export function PageTitle({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 className="text-[22px] font-bold sm:text-[24px]">{title}</h1>
        {sub && <p className="mt-0.5 text-[13px] text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
