import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: getUser() はサーバー側でトークンを検証しセッションをリフレッシュする
  // これがないとアクセストークンが1時間で期限切れになりログアウトされる
  const { data: { user } } = await supabase.auth.getUser();

  // 保護されたルートへの未認証アクセスをサーバー側でリダイレクト
  const { pathname } = request.nextUrl;
  const protectedPaths = ['/post', '/studio', '/messages', '/settings', '/analytics', '/notifications', '/edit'];
  const isProtected = protectedPaths.some(p => pathname.startsWith(p));

  if (isProtected && !user) {
    const loginUrl = new URL('/login', requ