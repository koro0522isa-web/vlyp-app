import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUploadPresignedUrl, r2PublicUrl } from '@/lib/r2';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/upload
 *
 * Body: { filename: string, contentType: string, userId: string, type: 'video' | 'thumbnail' | 'story' }
 *
 * Returns: { uploadUrl: string, publicUrl: string, key: string }
 *
 * The client:
 *   1. Calls this endpoint to get a presigned uploadUrl
 *   2. PUTs the file directly to R2 using uploadUrl
 *   3. Uses publicUrl to save into the DB
 */
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filename, contentType, type } = await req.json() as {
      filename: string;
      contentType: string;
      type: 'video' | 'thumbnail' | 'story' | 'avatar';
    };

    if (!filename || !contentType || !type) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    // Build R2 key: <type>/<userId>/<timestamp>_<filename>
    const ext = filename.split('.').pop() ?? 'bin';
    const key = `${type}/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const uploadUrl = await getUploadPresignedUrl(key, contentType);
    const publicUrl = r2PublicUrl(key);

    return NextResponse.json({ uploadUrl, publicUrl, key });
  } catch (err: any) {
    console.error('[upload] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
