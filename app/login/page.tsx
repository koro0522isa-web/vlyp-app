"use client";

import { useState, useEffect, Suspense, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Gift, Loader2, AlertCircle, Mail, Lock, LogIn } from 'lucide-react';

/**
 * /login — minimal custom login form.
 *
 * Replaces @supabase/auth-ui-react Auth widget which was deprecated and had
 * opaque internal cookie handling that broke our sessions.
 *
 * Flow:
 *   1. signInWithPassword() — direct API call, no widget magic.
 *   2. On success, hard-navigate to / via window.location so cookies are
 *      definitely sent on the next request (no Next router caching race).
 *   3. OAuth (Google / GitHub) uses signInWithOAuth which redirects to provider
 *      and comes back via /auth/callback.
 */
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bootChecking, setBootChecking] = useState(true);
  const [refCode, setRefCode] = useState<string | null>(null);

  // ─── boot: ?signout / ?force / already-logged-in redirect ─────────────────
  useEffect(() => {
    let cancelled = false;

    const ref = searchParams.get('ref');
    if (ref) {
      sessionStorage.setItem('vlyp_referral_code', ref);
      setRefCode(ref);
    } else {
      const stored = sessionStorage.getItem('vlyp_referral_code');
      if (stored) setRefCode(stored);
    }

    const intent = searchParams.get('intent');
    if (intent === 'pro') sessionStorage.setItem('vlyp_intent', 'pro');

    const force = searchParams.get('force') === '1';
    const signout = searchParams.get('signout') === '1';

    (async () => {
      if (signout) {
        try {
          await supabase.auth.signOut();
          try {
            Object.keys(localStorage)
              .filter((k) => k.startsWith('sb-'))
              .forEach((k) => localStorage.removeItem(k));
            document.cookie.split(';').forEach((c) => {
              const name = c.trim().split('=')[0];
              if (name.startsWith('sb-')) {
                document.cookie = `${name}=; max-age=0; path=/`;
              }
            });
          } catch {}
        } catch {}
        if (cancelled) return;
        setBootChecking(false);
        return;
      }

      if (force) {
        if (cancelled) return;
        setBootChecking(false);
        return;
      }

      // Normal flow: if already logged in, send to /
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          window.location.href = '/';
          return;
        }
      } catch {
        /* fall through to form */
      }
      if (!cancelled) setBootChecking(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── handlers ─────────────────────────────────────────────────────────────
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(error.message || 'ログインに失敗しました');
          return;
        }
        if (data.session) {
          // Hard navigation so cookies are guaranteed to be sent server-side.
          const intent = sessionStorage.getItem('vlyp_intent') || searchParams.get('intent');
          if (intent === 'pro') {
            sessionStorage.removeItem('vlyp_intent');
            window.location.href = '/settings?upgrade=pro';
          } else {
            window.location.href = '/';
          }
        } else {
          setError('セッションを取得できませんでした');
        }
      } else {
        // signup
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setError(error.message || 'アカウント作成に失敗しました');
          return;
        }
        if (data.session) {
          window.location.href = '/';
        } else {
          // Email confirmation flow
          setInfo('確認メールを送信しました。メール内のリンクをクリックして完了してください。');
        }
      }
    } catch (e: any) {
      setError(e?.message || '予期しないエラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  const onOAuth = async (provider: 'google' | 'github') => {
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setError(error.message);
    } catch (e: any) {
      setError(e?.message || 'OAuth エラー');
    }
  };

  // ─── render ───────────────────────────────────────────────────────────────
  if (bootChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-sm space-y-4">
        {refCode && (
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
            <Gift className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">招待コード適用</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">登録完了で <span className="text-yellow-400 font-bold">50 コイン</span> プレゼント</p>
            </div>
          </div>
        )}

        <div className="bg-zinc-900/80 backdrop-blur-xl p-8 rounded-2xl border border-zinc-800 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black text-blue-500 mb-1">VLYP</h1>
            <p className="text-zinc-500 text-xs uppercase tracking-widest">
              {mode === 'signin' ? 'ログイン' : 'アカウント作成'}
            </p>
          </div>

          {/* OAuth */}
          <div className="space-y-2 mb-5">
            <button
              type="button"
              onClick={() => onOAuth('google')}
              disabled={submitting}
              className="w-full py-2.5 bg-white text-zinc-900 hover:bg-zinc-100 rounded-lg font-bold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google で続行
            </button>
            <button
              type="button"
              onClick={() => onOAuth('github')}
              disabled={submitting}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.2 1.9 1.2 1.1 1.9 2.9 1.4 3.6 1 .1-.8.4-1.4.8-1.7-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.7-5.5 6 .5.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>
              GitHub で続行
            </button>
          </div>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-800" /></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-zinc-900 px-2 text-zinc-600">または メール</span></div>
          </div>

          {/* Email/Password form */}
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">メールアドレス</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-zinc-800/80 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">パスワード</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-zinc-800/80 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {info && (
              <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {mode === 'signin' ? 'ログイン' : 'アカウント作成'}
            </button>
          </form>

          {/* mode toggle */}
          <div className="text-center mt-4 text-xs text-zinc-500">
            {mode === 'signin' ? (
              <>
                アカウントをお持ちでない方は{' '}
                <button onClick={() => { setMode('signup'); setError(null); }} className="text-blue-400 hover:underline font-bold">
                  新規登録
                </button>
              </>
            ) : (
              <>
                既にアカウントをお持ちですか?{' '}
                <button onClick={() => { setMode('signin'); setError(null); }} className="text-blue-400 hover:underline font-bold">
                  ログイン
                </button>
              </>
            )}
          </div>

          {/* Stuck-session escape hatch */}
          <div className="mt-6 pt-4 border-t border-zinc-800 text-center">
            <button
              onClick={async () => {
                try {
                  await supabase.auth.signOut();
                  Object.keys(localStorage)
                    .filter((k) => k.startsWith('sb-'))
                    .forEach((k) => localStorage.removeItem(k));
                  document.cookie.split(';').forEach((c) => {
                    const name = c.trim().split('=')[0];
                    if (name.startsWith('sb-')) document.cookie = `${name}=; max-age=0; path=/`;
                  });
                } catch {}
                window.location.replace('/login?force=1');
              }}
              className="text-[10px] text-zinc-600 hover:text-red-400 underline transition-colors"
            >
              セッションがおかしい時はこちら
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
