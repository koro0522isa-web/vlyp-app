// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

/**
 * Vercel / CI ではビルド時に NEXT_PUBLIC_* が未注入のことがある。
 * 空文字で createClient すると「supabaseUrl is required」で prerender が落ちるため、
 * ダミー値でクライアントだけ生成し、実行時は必ず本番 env を設定すること。
 */
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://build-placeholder.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.build';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);