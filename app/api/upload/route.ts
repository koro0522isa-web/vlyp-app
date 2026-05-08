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

    const { filename, contentType, type = 'video' } = await req.json();
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
        return NextResp