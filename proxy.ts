import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js 16 proxy — MINIMAL version.
 *
 * Role: refresh Supabase auth cookies on every request and pass them through.
 * That's it. No redirects, no protected-route logic — those are owned by the
 * client pages (which use useAuth() and decide what to render / where to send
 * unauthenticated users).
 *
 * Why minimal: every extra branch here is a place where cookie attributes can
 * be lost, leading to invisible logout. Keep this dumb.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

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
        // Forward refreshed cookies to BOTH the inbound request (so downstream
        // handlers see them) and the outbound response (so the browser stores them).
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Trigger refresh if token is near expiry — non-blocking on failure.
  try {
    await supabase.auth.getUser();
  } catch {
    /* ignore — never break the page just because auth refresh failed */
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static files entirely.
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|ogp.png|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ttf|otf|js|css|mp4|webm)$).*)',
  ],
};
