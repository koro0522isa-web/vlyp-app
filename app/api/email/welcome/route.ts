import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWelcomeEmail } from '@/app/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id } = body;
    if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error } = await supabase.auth.admin.getUserById(user_id);
    if (error || !user?.email) return NextResponse.json({ error: 'user not found' }, { status: 404 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('vlyp_id, welcome_email_sent')
      .eq('id', user_id)
      .single();

    if (profile?.welcome_email_sent) return NextResponse.json({ skipped: true });

    const vlypId = profile?.vlyp_id ?? user.email.split('@')[0];
    await sendWelcomeEmail(user.email, vlypId);

    await supabase.from('profiles').update({ welcome_email_sent: true }).eq('id', user_id);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[email/welcome]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
