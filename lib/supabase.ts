// lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr';

/**
 * クライアントサイド用 Supabase クライアント。
 * @supabase/ssr の createBrowserClient を使うことで
 * cookie ベースのセッション管理が有効になり、ページ遷移でログアウトしなくなる。
 * Vercel / CI ではビルド時に NEXT_PUBLIC_* が未注入のことがあるためダミー値で保護。
 */
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://build-placeholder.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.build';

export con