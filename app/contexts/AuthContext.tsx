'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
});

/**
 * Detect presence of a Supabase auth cookie *synchronously* so we can keep
 * the UI in a logged-in optimistic state while getSession() is in flight.
 * This avoids the flash of "logged out" UI right after navigation.
 */
function detectAuthCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie
    .split(';')
    .some((c) => /sb-[^=]*-auth-token/.test(c.trim()));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // If a cookie is present, start with isLoading=false and pretend logged in
  // (server-side will validate on next request; the worst case is a flash of
  // home-as-logged-in followed by a logout — far better than the inverse).
  const [isLoading, setIsLoading] = useState<boolean>(!detectAuthCookie());

  useEffect(() => {
    let cancelled = false;
    const applySession = (s: Session | null) => {
      if (cancelled) return;
      setSession(s);
      setUser(s?.user ?? null);
      setIsLoading(false);
    };

    // Run getSession but DO NOT gate later updates. Multiple events can fire
    // (initial, refresh, sign-in, sign-out) and we want the latest state to win.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        applySession(data.session ?? null);
      })
      .catch((err) => {
        console.error('[Auth] getSession error', err);
        // Don't force user=null on error if we have an auth cookie — keep
        // optimistic logged-in state until refresh succeeds elsewhere.
        if (!detectAuthCookie()) applySession(null);
        else setIsLoading(false);
      });

    // Authoritative source: every state transition pushed by supabase-js.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      applySession(s);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
