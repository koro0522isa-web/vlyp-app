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
    // 初回: 現在のセッションを1回だけ取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // 認証状態変化をアプリ全体で共有（1箇所に集約）
    // SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED / USER_UPDATED etc.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
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
