"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // マウント後の処理
  useEffect(() => {
    setIsClient(true);
    // すでにログインしてたらトップへ
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) router.push('/');
    };
    checkUser();
  }, [router]);

  if (!isClient) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-md bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold font-oswald text-blue-500 mb-2">VLYP LOGIN</h1>
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
          providers={['google', 'github']} // 使いたいSNSログインを追加
          redirectTo={`${window.location.origin}/auth/callback`}
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
  );
}