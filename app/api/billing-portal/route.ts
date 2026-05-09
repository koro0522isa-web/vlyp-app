import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function getClients() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27.acacia' as any,
  });
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  return { stripe, supabaseAdmin };
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  // Bearer JWT から userId 取得
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { stripe, supabaseAdmin } = getClients();

  // profiles から stripe_customer_id を取得
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id, vlyp_id, display_name')
    .eq('id', user.id)
    .maybeSingle();

  let customerId = profile?.stripe_customer_id as string | undefined;

  // customer がなければ作成して保存
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile?.display_name || profile?.vlyp_id || undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;

    await supabaseAdmin
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);
  }

  // Stripe カスタマーポータルセッションを作成
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${siteUrl}/settings`,
  });

  return NextResponse.json({ url: portalSession.url });
}
