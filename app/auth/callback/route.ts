import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    // redirect先レスポンスを先に作成し、そこにcookieをセットする
    // (Next.js 15ではcookies()ストアはGETハンドラ内でread-only)
    const redirectResponse = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // requestにもセット(getAll用)
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            // responseにセット(ブラウザへ送出)
            cookiesToSet.forEach(({ name, value, options }) =>
              redirectResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirectResponse;
    }
  }

  // エラーが起きた場合はログインページに戻す
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
