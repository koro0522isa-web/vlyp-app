import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendFollowEmail, sendGiftReceivedEmail, sendCommentEmail } from '@/app/lib/email';

// 汎用通知エンドポイント
// POST /api/email/notify
// body: { type: 'follow'|'gift'|'comment', actor_id, target_id, ...extras }
export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ skipped: 'no key' });

  try {
    const body = await req.json();
    const { type, actor_id, target_id } = body;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // target ユーザーのメールアドレスを取得
    const { data: { user: target } } = await supabase.auth.admin.getUserById(target_id);
    if (!target?.email) return NextResponse.json({ skipped: 'no email' });

    // actor の vlyp_id を取得
    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('vlyp_id')
      .eq('id', actor_id)
      .single();
    const actorId = actorProfile?.vlyp_id ?? 'someone';

    switch (type) {
      case 'follow':
        await sendFollowEmail(target.email, actorId);
        break;

      case 'gift': {
        const { amount, clip_title } = body;
        await sendGiftReceivedEmail(target.email, actorId, amount ?? 0, clip_title ?? '動画');
        break;
      }

      case 'comment': {
        const { comment, clip_id } = body;
        await sendCommentEmail(target.email, actorId, comment ?? '', clip_id ?? 0);
        break;
      }

      default:
        return NextResponse.json({ error: 'unknown type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[email/notify]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
