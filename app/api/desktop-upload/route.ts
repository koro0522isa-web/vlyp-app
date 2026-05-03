import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateEmbedding } from '@/app/lib/ai';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const title = formData.get('title') as string;
    const gameTitle = formData.get('game_title') as string;
    const vlypScoresStr = formData.get('vlyp_scores') as string;
    
    if (!videoFile) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    // Create temp directory if it doesn't exist
    const tempDir = join(process.cwd(), 'temp');
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Save video file temporarily
    const fileName = `desktop_${Date.now()}_${videoFile.name}`;
    const filePath = join(tempDir, fileName);
    const buffer = Buffer.from(await videoFile.arrayBuffer());
    await writeFile(filePath, buffer);

    // Parse VLYP scores
    let vlypScores: number[] = [];
    try {
      vlypScores = JSON.parse(vlypScoresStr || '[]');
    } catch (e) {
      console.error('Failed to parse VLYP scores:', e);
    }

    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(`${session.user.id}/${fileName}`, buffer);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload video' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(`${session.user.id}/${fileName}`);

    // Generate embedding
    const embedding = await generateEmbedding(`${title} ${gameTitle} desktop recording`);

    // Calculate VLYP score metrics
    const avgScore = vlypScores.length > 0 
      ? vlypScores.reduce((a, b) => a + b, 0) / vlypScores.length 
      : 0;
    const maxScore = vlypScores.length > 0 ? Math.max(...vlypScores) : 0;
    const highlightCount = vlypScores.filter(score => score > 75).length;

    // Insert into database
    const { data: clip, error: insertError } = await supabase
      .from('clips')
      .insert({
        title: title || 'Desktop Recording Highlight',
        video_url: publicUrl,
        game_title: gameTitle || 'Desktop Recording',
        user_id: session.user.id,
        embedding,
        vlyp_scores: vlypScores,
        vlyp_avg_score: avgScore,
        vlyp_max_score: maxScore,
        vlyp_highlight_count: highlightCount,
        tags: ['desktop', 'recording', 'vlyp-score'],
        is_desktop_recording: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save clip' }, { status: 500 });
    }

    // Clean up temp file
    try {
      await require('fs').promises.unlink(filePath);
    } catch (e) {
      console.error('Failed to clean up temp file:', e);
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
          scores: vlypScores
        }
      }
    });

  } catch (error) {
    console.error('Desktop upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
