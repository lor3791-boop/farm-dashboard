// 로그인 관문 — 클라우드 모드에서 로그인 안 했거나 관리자 계정이 아니면 안내 화면.
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

const Shell = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-screen items-center justify-center bg-bg p-4">
    <div className="w-full max-w-[380px] rounded-xl border border-line bg-white p-6 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-brand text-[18px] font-bold text-[#FCE3A6]">농장</div>
      <h1 className="mb-1 text-[20px] font-bold">담당농장 대시보드</h1>
      {children}
    </div>
  </div>
);

export function Gate({ children }: { children: ReactNode }) {
  const { status, email, signIn, signOut, error } = useAuth();
  if (status === 'loading') return <Shell><p className="text-muted">불러오는 중…</p></Shell>;
  if (status === 'signedOut')
    return (
      <Shell>
        <p className="mb-5 text-[14px] text-muted">지역부장 구글 계정으로 로그인하세요.</p>
        <Button variant="primary" className="w-full" onClick={signIn}>구글 계정으로 로그인</Button>
        {error && <p className="mt-3 text-[13px] text-bad-fg">{error}</p>}
      </Shell>
    );
  if (status === 'denied')
    return (
      <Shell>
        <p className="mb-5 text-[14px] text-muted">{email} 계정은 권한이 없습니다. 지역부장 계정으로 다시 로그인하세요.</p>
        <Button className="w-full" onClick={signOut}>다른 계정으로 로그인</Button>
      </Shell>
    );
  return <>{children}</>;
}
