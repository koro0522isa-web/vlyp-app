import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '@/app/lib/ai';

export async function POST(request: NextRequest) {
  try {
    // Authヘッダーからユーザーのアクセストークンを取得
    const authHeader = request.headers.get('Authorization');
    const accessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ユーザーのJWTでSupabaseクライアントを作成
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    );

    // トークン検証
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const title = formData.get('title') as string;
    const gameTitle = formData.get('game_title') as string;
    const vlypScoresStr = formData.get('vlyp_scores') as string;

    if (!videoFile) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    // Parse VLYP scores
    let vlypScores: number[] = [];
    try {
      vlypScores = JSON.parse(vlypScoresStr || '[]');
    } catch (e) {
      // vlypScoresなしでも続行
    }

    const buffer = Buffer.from(await videoFile.arrayBuffer());
    const fileName = `desktop_${Date.now()}_${videoFile.name}`;

    // Supabase storageにアップロード
    const { error: uploadError } = await supabaseUser.storage
      .from('videos')
      .upload(`${user.id}/${fileName}`, buffer, {
        contentType: 'video/mp4',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload video' }, { status: 500 });
    }

    // 公開URLを取得
    const { data: { publicUrl } } = supabaseUser.storage
      .from('videos')
      .getPublicUrl(`${user.id}/${fileName}`);

    // 埋め込みベクトル生成
    let embedding: number[] | null = null;
    try {
      embedding = await generateEmbedding(`${title} ${gameTitle} desktop recording`);
    } catch (e) {
      console.error('Embedding generation failed:', e);
    }

    // VLYPスコア集計
    const avgScore = vlypScores.length > 0
      ? vlypScores.reduce((a, b) => a + b, 0) / vlypScores.length
      : 0;
    const maxScore = vlypScores.length > 0 ? Math.max(...vlypScores) : 0;
    const highlightCount = vlypScores.filter(score => score > 75).length;

    // DBに保存
    const insertData: Record<string, unknown> = {
      title: title || 'Desktop Recording Highlight',
      video_url: publicUrl,
      game_title: gameTitle || 'Desktop Recording',
      user_id: user.id,
      vlyp_scores: vlypScores,
      vlyp_avg_score: avgScore,
      vlyp_max_score: maxScore,
      vlyp_highlight_count: highlightCount,
      tags: ['desktop', 'recording', 'vlyp-score'],
      is_desktop_recording: true,
    };
    if (embedding) insertData.embedding = embedding;

    const { data: clip, error: insertError } = await supabaseUser
      .from('clips')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save clip' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      clip: {
        id: clip.id,
        title: clip.title,
        video_url: clip.video_url,
        vlyp_scores: {
          average: avgScore,
          max: maxScore,
          highlights: highlightCount,
          scores: vlypScores,
     