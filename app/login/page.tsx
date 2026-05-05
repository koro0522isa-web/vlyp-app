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

    // ログイン成功後にリファラル処理
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        const storedRef = sessionStorage.getItem('vlyp_referral_code');
        if (storedRef) {
          try {
            await fetch('/api/referral/claim', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ referral_code: storedRef }),
            });
          } catch (e) {
            // サイレント失敗OK（既にクレーム済みなど）
          } finally {
            sessionStorage.removeItem('vlyp_referral_code');
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router, searchParams]);

  if (!isClient) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-md space-y-4">
        