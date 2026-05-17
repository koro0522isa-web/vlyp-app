"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabase';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Gift } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);

    // ?ref= パラメータをsessionStorageに保存（サインアップ後に使う）
    const ref = searchParams.get('ref');
    if (ref) {
      sessionStorage.setItem('vlyp_referral_code', ref);
      setRefCode(ref);
    } else {
      const stored = sessionStorage.getItem('vlyp_referral_code');
      if (stored) setRefCode(stored);
    }

    // すでにログインしてたらトップへ
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.push('/');
    });

    // ログイン成功後: リダイレクト + リファラル処理
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        // リファラルクレームは非同期でサイレント実行（ブロックしない）
        const storedRef = sessionStorage.getItem('vlyp_referral_code');
        if (storedRef) {
          sessionStorage.removeItem('vlyp_referral_code');
          fetch('/api/referral/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ referral_code: storedRef }),
          }).catch(() => {/* サイレント失敗OK */});
        }
        // ログイン後はトップへリダイレクト（メール/パスワード・OAuth共通）
        router.push('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, searchParams]);

  if (!isClient) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-md space-y-4">
        {refCode && (
          <div className="flex items-center gap-3 px-5 py-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
            <Gift className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">招待コードが適用されます</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">登録完了後、あなたと招待者に各 <span className="text-yellow-400 font-black">50コイン</span> プレゼント！</p>
            </div>
          </div>
        )}

        <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold font-oswald text-blue-500 mb-2">VLYP</h1>
            <p className="text-zinc-400 text-sm">最高のクリップをシェアしよう</p>
          </div>

          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#2563eb',
                    brandAccent: '#1d4ed8',
                    inputBackground: '#18181b',
                    inputText: 'white',
                  },
                },
              },
            }}
            providers={['google', 'github']}
            redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'メールアドレス',
                  password_label: 'パスワード',
                  button_label: 'ログイン',
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-10 h-10 border-4 border-blue