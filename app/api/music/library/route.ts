import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Music library API endpoints
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const genre = searchParams.get('genre');
    const mood = searchParams.get('mood');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = supabase
      .from('bgm_library')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    // Apply filters
    if (genre) {
      query = query.contains('genres', [genre]);
    }
    
    if (mood) {
      query = query.eq('mood', mood);
    }
    
    if (search) {
      query = query.or(`title.ilike.%${search}%,artist.ilike.%${search}%,tags.ilike.%${search}%`);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: tracks, error } = await query;

    if (error) {
      console.error('Music library fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch music library' },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('bgm_library')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    return NextResponse.json({
      success: true,
      tracks: tracks || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Music library API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const trackData = await request.json();
    
    // Validate required fields
    if (!trackData.title || !trackData.url) {
      return NextResponse.json(
        { error: 'Title and URL are required' },
        { status: 400 }
      );
    }

    // Check if user has permission to upload music (Pro users or admins)
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_pro, role')
      .eq('id', session.user.id)
      .single();

    if (!profile?.is_pro && profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Music upload requires Pro subscription' },
        { status: 403 }
      );
    }

    // Insert new track
    const { data: track, error } = await supabase
      .from('bgm_library')
      .insert({
        title: trackData.title,
        artist: trackData.artist || 'Unknown',
        url: trackData.url,
        duration: trackData.duration,
        genres: trackData.genres || [],
        mood: trackData.mood || 'neutral',
        tags: trackData.tags || [],
        bpm: trackData.bpm,
        key: trackData.key,
        uploaded_by: session.user.id,
        active: true,
        play_count: 0,
        like_count: 0
      })
      .select()
      .single();

    if (error || !track) {
      console.error('Music upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload music track' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      track
    });

  } catch (error) {
    console.error('Music upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
