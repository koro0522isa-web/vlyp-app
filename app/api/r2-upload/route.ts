import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPresignedUrl, PUBLIC_URL } from '@/lib/r2';
import { randomUUID } from 'crypto';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase environment variables not configured');
  return createClient(url, key);
}

/**
 * POST /api/r2-upload
 * body: { filename: string, contentType: string, userId?: string }
 * response: { uploadUrl: string, publicUrl: string, key: string }
 *
 * Cloudflare R2 の署名付きPUT URLを発行するエンドポイント。
 * クライアントはこのURLに直接PUTしてR2にアップロードできる。
 */
export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 認証チェック
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filename, contentType } = await req.json();
    if (!filename || !contentType) {
      return NextResponse.json(
        { error: 'filename and contentType are required' },
        { status: 400 }
      );
    }

    // キー: videos/{userId}/{uuid}.{ext}
    const ext = filename.split('.').pop() ?? 'mp4';
    const key = `videos/${user.id}/${randomUUID()}.${ext}`;

    const uploadUrl = await createPresignedUrl(key, contentType);
    const publicUrl = `${PUBLIC_URL}/${key}`;

    return NextResponse.json({ uploadUrl, publicUrl, key });
  } catch (err: any) {
    console.error('[r2-upload] error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
