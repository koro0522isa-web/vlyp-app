import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deleteObject, PUBLIC_URL } from '@/lib/r2';

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

    // URLからキーを抽出（PUBLIC_URLプレフィックスを除去）
    let key: string;
    if (PUBLIC_URL && url.startsWith(PUBLIC_URL + '/')) {
      key = url.slice(PUBLIC_URL.length + 1);
    } else {
      // フォールバック: URLのパス部分を使用
      key = new URL(url).pathname.replace(/^\//, '');
    }

    // 所有者チェック（キーがuser.idを含むことを確認）
    if (!key.includes(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteObject(key);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[r2-delete] error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
