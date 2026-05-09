import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPresignedUrl, PUBLIC_URL } from '@/lib/r2';
import { randomUUID } from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filename, contentType, type = 'video', fileSize } = await req.json();
    if (!filename || !contentType) {
      return NextResponse.json({ error: 'filename and contentType are required' }, { status: 400 });
    }

    // ユーザープロフィール取得（Pro判定用）
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_pro')
      .eq('id', user.id)
      .maybeSingle();
    const isPro = profile?.is_pro ?? false;

    // ファイルサイズバリデーション
    if (fileSize !== undefined && fileSize !== null) {
      const MAX_FREE = 200 * 1024 * 1024; // 200MB
      const MAX_PRO = 500 * 1024 * 1024;  // 500MB
      const limit = isPro ? MAX_PRO : MAX_FREE;
      if (fileSize > limit) {
        const limitMB = isPro ? 500 : 200;
        return NextResponse.json(
          { error: `File size exceeds the ${limitMB}MB limit for your plan.` },
          { status: 413 }
        );
      }
    }

    // 動画ファイルの場合、基本的なバリデーションを実施
    // 注：実際の動画メタデータ検証は、クライアント側で既に実施済み
    // サーバー側ではファイル拡張子と content-type の整合性をチェック
    if (type === 'video') {
      const ext = filename.split('.').pop()?.toLowerCase() ?? '';
      const validVideoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
      if (!validVideoExts.includes(ext)) {
        return NextResponse.json(
          { error: 'Invalid video format. Supported: MP4, WebM, MOV, AVI, MKV' },
          { status: 400 }
        );
      }
      // content-type チェック
      if (!contentType.startsWith('video/')) {
        return NextResponse.json(
          { error: 'Invalid content type for video file' },
          { status: 400 }
        );
      }
    }

    // ファイルパス: {type}/{userId}/{uuid}.{ext}
    const ext = filename.split('.').pop() ?? 'mp4';
    const key = `${type}/${user.id}/${randomUUID()}.${ext}`;

    const uploadUrl = await createPresignedUrl(key, contentType);
    const publicUrl = `${PUBLIC_URL}/${key}`;

    return NextResponse.json({ uploadUrl, publicUrl, key });
  } catch (err: any) {
    console.error('[upload] error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
