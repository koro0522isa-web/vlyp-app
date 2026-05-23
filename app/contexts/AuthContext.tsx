'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

// ─────────────────────────────────────────────
// Context 型定義
// ─────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  session: Session | null;
  /** true = まだ初回セッション確認中（この間は /login リダイレクトしない） */
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
});

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let resolved = false;
    const finish = (session: Session | null) => {
      if (resolved) return;
      resolved = true;
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    };

    // 初回: getSession() を試みる
    // CRITICAL: cookie 破損 / refresh hang / Supabase Auth 遅延などで getSession() が
    // 永久に resolve しないケースが報告されている (ユーザー体験 = 永久ローディング)。
    // 5秒以内に応答が無ければ未認証として進める。
    const safety = setTimeout(() => {
      if (!resolved) {
        console.warn('[Auth] getSession timeout — treating as logged out');
        finish(null);
      }
    }, 5000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(safety);
        finish(session);
      })
      .catch((err) => {
        clearTimeout(safety);
        console.error('[Auth] getSession error:', err);
        finish(null);
      });

    // 認証状態変化をアプリ全体で共有
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // ここでも resolved を更新するように finish を経由
      resolved = false; // re-allow setting state on event
      finish(session);
    });

    return () => {
      clearTimeout(safety);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────
export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
