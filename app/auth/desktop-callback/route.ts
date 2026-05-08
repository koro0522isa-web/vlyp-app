import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * デスクトップアプリ用 OAuth コールバック
 * GET /auth/desktop-callback?code=...
 * → セッション取得後、vlyp://auth?access_token=...&refresh_token=...&email=... にリダイレクト
 * → Electron が vlyp:// プロトコルをキャッチしてトークンを保存する
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=desktop_callback_no_code`);
  }

  // セッション交換用の一時レスポンス (cookie 保存のため)
  const tempResponse = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            tempResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=desktop_callback_failed`);
  }

  // セッションを取得して Electron に渡す
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(`${origin}/login?error=desktop_no_session`);
  }

  // vlyp:// プロトコルへリダイレクト → Electron の second-instance イベントが受け取る
  const params = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    email: session.user.email || '',
  });

  // ブラウザに「ログイン完了」ページを表示しつつ、Electron にトークンを渡す
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <title>VLYP Clips - ログイン完了</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, sans-serif; background: #09090B; color: #fff;
           display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { text-align: center; max-width: 360px; padding: 2rem; }
    h1 { font-size: 1.5rem; font-weight: 800; color: #a78bfa; margin-bottom: 0.5rem; }
    p { color: #71717a; font-size: 0.875rem; }
    .check { font-size: 3rem; margin-bottom: 1rem; }
  </style>
  <script>
    // Electron に vlyp:// プロトコルでトークンを送る
    window.location.href = 'vlyp://auth?${params.toString()}';
  </script>
</head>
<body>
  <div class="card">
    <div class="check">✅</div>
    <h1>ログイン完了！</h1>
    <p>VLYP Clips アプリに戻ってください。<br />このタブは閉じて大丈夫です。</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
