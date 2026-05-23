import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js 16 proxy (formerly middleware.ts).
 * 役割:
 *  - Supabase セッションの自動リフレッシュ (getUser でサーバー検証)
 *  - 保護ルートへの未認証アクセスをサーバー側で /login にリダイレクト
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // ビルド時(env無し)でも落ちないようプレースホルダー fallback
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://build-placeholder.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.build';

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
  });

  // IMPORTANT: getUser() はサーバー側でトークン検証＆セッション更新
  // これがないとアクセストークンが1時間で切れてログアウト扱いになる
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 保護ルート: 未認証なら /login へリダイレクト
  const { pathname } = request.nextUrl;
  const protectedPaths = [
    '/post',
    '/studio',
    '/messages',
    '/settings',
    '/analytics',
    '/notifications',
    '/edit',
  ];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    // CRITICAL: getUser() でリフレッシュされた cookie を redirect レスポンスに完全に引き継ぐ
    // 以前は name/value のみコピーしており、httpOnly/secure/sameSite などのオプションが落ちて
    // Set-Cookie ヘッダが無効になっていた → リロードでログアウト扱いになる根本原因
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      // ResponseCookies.set は単一の Cookie オブジェクトを受け取れる (全 options 保持)
      redirectResponse.cookies.set({
        name: cookie.name,
        value: cookie.value,
        path: cookie.path,
        domain: cookie.domain,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite as any,
        maxAge: cookie.maxAge,
      });
    });
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|ogp.png|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
