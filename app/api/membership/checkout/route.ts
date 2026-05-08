import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2025-01-27.acacia' as any });
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/membership/checkout
// Body: { tier_id: number, creator_username: string }
// ファンクラブ加入の Stripe Checkout セッションを作成する
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: auth } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tier_id, creator_username } = await req.json();
  if (!tier_id) return NextResponse.json({ error: 'tier_id required' }, { status: 400 });

  const admin = getAdminClient();

  // ティア情報取得
  const { data: tier } = await admin
    .from('membership_tiers')
    .select('*, profiles:creator_id(display_name, username)')
    .eq('id', tier_id)
    .eq('is_active', true)
    .maybeSingle();

  if (!tier) return NextResponse.json({ error: 'Tier not found' }, { status: 404 });

  // 既にメンバーかチェック
  const { data: existing } = await admin
    .from('memberships')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('creator_id', tier.creator_id)
    .maybeSingle();

  if (existing?.status === 'active') {
    return NextResponse.json({ error: 'Already a member' }, { status: 400 });
  }

  const stripe = getStripe();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const creatorName = (Array.isArray(tier.profiles) ? tier.profiles[0] : tier.profiles)?.display_name || creator_username;

  let stripePriceId = tier.stripe_price_id;

  // Stripe Price IDが未作成の場合は動的に作成
  if (!stripePriceId) {
    const product = await stripe.products.create({
      name: `${creatorName} ファンクラブ - ${tier.name}`,
      metadata: { tier_id: String(tier_id), creator_id: tier.creator_id },
    });
    const price = await stripe.prices.create({
      unit_amount: tier.price_yen,
      currency: 'jpy',
      recurring: { interval: 'month' },
      product: product.id,
      metadata: { tier_id: String(tier_id) },
    });
    stripePriceId = price.id;

    // DBに保存
    await admin
      .from('membership_tiers')
      .update({ stripe_price_id: stripePriceId })
      .eq('id', tier_id);
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: stripePriceId, quantity: 1 }],
    mode: 'subscription',
    subscription_data: {
      metadata: {
        type: 'fan_club',
        tier_id: String(tier_id),
        user_id: user.id,
        creator_id: tier.creator_id,
      },
    },
    client_reference_id: user.id,
    success_url: `${siteUrl}/membership/${creator_username}?success=true`,
    cancel_url: `${siteUrl}/membership/${creator_username}?canceled=true`,
    metadata: {
      type: 'fan_club',
      tier_id: Stri