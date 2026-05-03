import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface StreamingRequest {
  platforms: ('youtube' | 'twitch' | 'kick')[];
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
  language?: string;
  isMature?: boolean;
  delaySeconds?: number;
}

export async function POST(request: NextRequest) {
  try {
    const streamingData: StreamingRequest = await request.json();

    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate streaming data
    if (!streamingData.platforms || streamingData.platforms.length === 0) {
      return NextResponse.json({ error: 'At least one platform is required' }, { status: 400 });
    }

    if (!streamingData.title) {
      return NextResponse.json({ error: 'Stream title is required' }, { status: 400 });
    }

    // Check user's streaming permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_pro, streaming_enabled, youtube_connected, twitch_connected, kick_connected')
      .eq('id', session.user.id)
      .single();

    if (!profile?.streaming_enabled) {
      return NextResponse.json({ error: 'Streaming not enabled for this account' }, { status: 403 });
    }

    // Check platform connections
    const platformConnections = [];
    for (const platform of streamingData.platforms) {
      const isConnected = profile[`${platform}_connected` as keyof typeof profile];
      if (!isConnected) {
        return NextResponse.json(
          { error: `${platform} account not connected. Please connect your ${platform} account first.` },
          { status: 400 }
        );
      }
      platformConnections.push(platform);
    }

    // Create stream record
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .insert({
        user_id: session.user.id,
        title: streamingData.title,
        description: streamingData.description || '',
        tags: streamingData.tags || [],
        category: streamingData.category || 'Gaming',
        language: streamingData.language || 'en',
        is_mature: streamingData.isMature || false,
        platforms: streamingData.platforms,
        status: 'starting',
        started_at: new Date().toISOString(),
        viewer_count: 0,
        vlyp_score: 0
      })
      .select()
      .single();

    if (streamError || !stream) {
      console.error('Failed to create stream record:', streamError);
      return NextResponse.json({ error: 'Failed to start stream' }, { status: 500 });
    }

    // Start streaming on each platform
    const streamingResults = await Promise.allSettled(
      streamingData.platforms.map(platform => startPlatformStream(platform, streamingData, stream.id))
    );

    const successfulPlatforms = streamingResults
      .filter((result, index) => result.status === 'fulfilled')
      .map((_, index) => streamingData.platforms[index]);

    const failedPlatforms = streamingResults
      .filter((result, index) => result.status === 'rejected')
      .map((_, index) => streamingData.platforms[index]);

    if (successfulPlatforms.length === 0) {
      // All platforms failed
      await supabase
        .from('streams')
        .update({ status: 'failed' })
        .eq('id', stream.id);

      return NextResponse.json({
        error: 'Failed to start streaming on any platform',
        failedPlatforms
      }, { status: 500 });
    }

    // Update stream status
    const finalStatus = failedPlatforms.length === 0 ? 'live' : 'partial';
    await supabase
      .from('streams')
      .update({ 
        status: finalStatus,
        active_platforms: successfulPlatforms,
        failed_platforms: failedPlatforms
      })
      .eq('id', stream.id);

    return NextResponse.json({
      success: true,
      stream: {
        id: stream.id,
        title: stream.title,
        status: finalStatus,
        platforms: successfulPlatforms,
        failedPlatforms,
        startedAt: stream.started_at
      },
      streamUrls: await generateStreamUrls(successfulPlatforms, stream.id)
    });

  } catch (error) {
    console.error('Streaming start error:', error);
    return NextResponse.json(
      { error: 'Failed to start streaming' },
      { status: 500 }
    );
  }
}

async function startPlatformStream(
  platform: string, 
  streamData: StreamingRequest, 
  streamId: number
): Promise<{ platform: string; streamKey: string; rtmpUrl: string }> {
  // Simulate platform-specific streaming setup
  // In real implementation, this would use platform APIs
  
  switch (platform) {
    case 'youtube':
      return {
        platform: 'youtube',
        streamKey: `yt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2'
      };
    
    case 'twitch':
      return {
        platform: 'twitch',
        streamKey: `tw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        rtmpUrl: 'rtmp://live.twitch.tv/app'
      };
    
    case 'kick':
      return {
        platform: 'kick',
        streamKey: `kc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        rtmpUrl: 'rtmp://live.kick.com/app'
      };
    
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

async function generateStreamUrls(platforms: string[], streamId: number): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  
  for (const platform of platforms) {
    switch (platform) {
      case 'youtube':
        urls.youtube = `https://youtube.com/watch?v=live_${streamId}`;
        break;
      case 'twitch':
        urls.twitch = `https://twitch.tv/vlyp_user_${streamId}`;
        break;
      case 'kick':
        urls.kick = `https://kick.com/vlyp_${streamId}`;
        break;
    }
  }
  
  return urls;
}
