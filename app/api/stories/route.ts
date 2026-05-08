import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getClient(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: auth } } }
  );
}

// GET /api/stories — 有効なストーリー一覧をクリエイターごとにグループ化
export async function GET(req: NextRequest) {
  const supabase = getClient(req);
  const { data, error } = await supabase
    .from('stories')
    .select(`
      id, user_id, media_url, thumbnail_url, type, caption, game_tag, views, created_at, expires_at,
      profiles:user_id (display_name, username, avatar_url, is_pro, is_verified)
    `)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // クリエイターごとにグループ化
  const grouped: Record<string, any> = {};
  for (const s of (data ?? [])) {
    if (!grouped[s.user_id]) {
      grouped[s.user_id] = {
        user_id: s.user_id,
        profile: s.profiles,
        stories: [],
        latest_at: s.created_at,
      };
    }
    grouped[s.user_id].stories.push(s);
  }

  return NextResponse.json({ creators: Object.values(grouped) });
}

// POST /api/stories — ストーリー投稿 (メディアURLは事前にStorage経由でアップ済み)
export async function POST(req: NextRequest) {
  const supabase = getClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { media_url, thumbnail_url, type = 'image', caption, game_tag } = body;
  if (!media_url) return NextResponse.json({ error: 'media_url required' }, { status: 400 });

  const { data, error } = await supabase
    .from('stories')
    .insert({ user_id: user.id, media_url, thumbnail_url, type, caption, game_tag })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ story: data });
}

// DELETE /api/stories?id=123 — 自分のストーリーを削除
export async function DELETE(req: NextRequest) {
  const supabase = getClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('stories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.