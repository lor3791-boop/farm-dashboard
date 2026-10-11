// 로그인 — 클라우드 모드에서는 구글 로그인 + 관리자 계정 확인. 미리보기 모드는 로그인 없이 '미리보기'.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { firebaseConfig, ADMIN_EMAILS } from './firebaseConfig';
import { cloudRepo, localRepo, type Repo } from './repo';

interface AuthState {
  status: 'loading' | 'signedOut' | 'denied' | 'ready';
  email: string;
  name: string;
  repo: Repo | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string;
}
const Ctx = createContext<AuthState | null>(null);
export const useAuth = () => { const v = useContext(Ctx); if (!v) throw new Error('AuthProvider 밖'); return v; };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [s, set] = useState<Omit<AuthState, 'signIn' | 'signOut'>>({ status: 'loading', email: '', name: '', repo: null, error: '' });
  const [api, setApi] = useState<{ signIn: () => Promise<void>; signOut: () => Promise<void> }>({ signIn: async () => {}, signOut: async () => {} });

  useEffect(() => {
    if (!firebaseConfig || import.meta.env.VITE_PREVIEW === '1') {
      set({ status: 'ready', email: 'preview', name: '', repo: localRepo(), error: '' });
      return;
    }
    let unsub = () => {};
    (async () => {
      const { initializeApp } = await import('firebase/app');
      const { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } = await import('firebase/auth');
      initializeApp(firebaseConfig!);
      const auth = getAuth();
      setApi({
        signIn: async () => {
          const p = new GoogleAuthProvider();
          try { await signInWithPopup(auth, p); } catch { await signInWithRedirect(auth, p); }
        },
        signOut: () => signOut(auth)
      });
      unsub = onAuthStateChanged(auth, async (u) => {
        if (!u) return set({ status: 'signedOut', email: '', name: '', repo: null, error: '' });
        const email = (u.email ?? '').toLowerCase();
        if (!ADMIN_EMAILS.includes(email)) return set({ status: 'denied', email, name: u.displayName ?? '', repo: null, error: '' });
        try {
          const repo = await cloudRepo(firebaseConfig!);
          set({ status: 'ready', email, name: u.displayName ?? email, repo, error: '' });
        } catch (e) { set({ status: 'signedOut', email, name: '', repo: null, error: String(e) }); }
      });
    })();
    return () => unsub();
  }, []);

  return <Ctx.Provider value={{ ...s, ...api }}>{children}</Ctx.Provider>;
}
