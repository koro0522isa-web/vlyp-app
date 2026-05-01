import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: NextRequest) {
  try {
    const { videoTitle, gameTitle, genre } = await req.json();

    if (!videoTitle || !gameTitle) {
      return NextResponse.json(
        { error: 'videoTitle and gameTitle are required' },
        { status: 400 }
      );
    }

    // BGM ライブラリから推奨を取得
    let query = supabase.from('bgm_library').select('*');

    // ジャンルが指定されている場合はフィルター
    if (genre) {
      query = query.or(`genre.eq.${genre},tags.cs.{${genre}}`);
    }

    const { data: bgms, error } = await query.limit(10);

    if (error) {
      console.error('BGM fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch BGM library' },
        { status: 500 }
      );
    }

    // ゲームタイトルに基づいて推奨を絞り込む
    const gameKeywords = gameTitle.toLowerCase().split(' ');
    const scoredBGMs = (bgms || []).map(bgm => {
      let score = 0;

      // ジャンルマッチング
      if (genre && (bgm.genre?.toLowerCase() === genre || bgm.tags?.includes(genre))) {
        score += 50;
      }

      // ゲームキーワードマッチング
      gameKeywords.forEach((keyword: string) => {
        if (bgm.tags?.includes(keyword)) {
          score += 20;
        }
      });

      // 人気度（いいね数）
      score += (bgm.likes || 0) * 0.1;

      return { ...bgm, score };
    });

    // スコアでソート
    const recommendedBGMs = scoredBGMs
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return NextResponse.json({
      recommendedBGMs,
      audioMixSettings: {
        videoVolume: 0.7,
        bgmVolume: 0.3,
        narrationVolume: 0.8
      }
    });
  } catch (error) {
    console.error('BGM suggestion error:', error);
    return NextResponse.json(
      { error: 'Failed to suggest BGM' },
      { status: 500 }
    );
  }
}
