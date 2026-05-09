import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { generateEmbedding } from '@/app/lib/ai';

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET ?? 'vlyp-uploads';
const PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/$/, '');

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const accessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    );

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

    let vlypScores: number[] = [];
    try {
      vlypScores = JSON.parse(vlypScoresStr || '[]');
    } catch (e) {
      // vlypScoresなしでも続行
    }

    const buffer = Buffer.from(await videoFile.arrayBuffer());
    const key = `video/${user.id}/${randomUUID()}.mp4`;

    // R2にアップロード
    await r2.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'video/mp4',
    }));

    const publicUrl = `${PUBLIC_URL}/${key}`;

    // 埋め込みベクトル生成
    let embedding: number[] | null = null;
    try {
      embedding = await generateEmbedding(`${title} ${gameTitle} desktop recording`);
    } catch (e) {
      console.error('Embedding generation failed:', e);
    }

    const avgScore = vlypScores.length > 0
      ? vlypScores.reduce((a, b) => a + b, 0) / vlypScores.length
      : 0;
    const maxScore = vlypScores.length > 0 ? Math.max(...vlypScores) : 0;
    const highlightCount = vlypScores.filter(score => score > 75).length;

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
        },
      },
    });

  } catch (error) {
    console.error('Desktop upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
