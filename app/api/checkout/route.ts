import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// ビルド時に STRIPE_SECRET_KEY が無いと new Stripe() が失敗するためリクエスト内で初期化
function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(key, {
    apiVersion: '2025-01-27.acacia' as any,
  });
}

// ★サーバー側で価格を定義（クライアントからの改ざんを防ぐ）
const COIN_PACKS: Record<string, { amount: number, price: number }> = {
  'pack_100': { amount: 100, price: 150 },
  'pack_500': { amount: 500, price: 700 },
  'pack_1000': { amount: 1000, price: 1300 },
  'pack_5000': { amount: 5000, price: 6000 },
};

// Proプランの価格ID（環境変数 > フォールバック）
const PRO_PRICE_ID =
  process.env.STRIPE_PRO_PRICE_ID ||
  process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ||
  'price_1TRz5FIntgkn2DgcwcW3AQsC';

export async function POST(req: NextRequest) {
  try {
    // ── 認証チェック ─────────────────────────────
    const authHeader = req.headers.get('Authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // ────────────────────────────────────────────

    const stripe = getStripe();
    const { packId } = await req.json();
    const userId = user.id; // クライアント送信値は使わず、JWTから取得

    if (!packId) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    if (packId === 'pro') {
      const priceId = PRO_PRICE_ID;

      // 過去にトライアルを使ったか確認（1アカウント1回限り）
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('pro_trial_used')
        .eq('id', userId)
        .maybeSingle();

      const trialEligible = !profile?.pro_trial_used;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        // invoice.paid / subscription.deleted の Webhook で userId を取得するため Subscription に載せる
        subscription_data: {
          // 初回のみ7日間無料トライアル付与
          ...(trialEligible ? { trial_period_days: 7 } : {}),
          metadata: {
            userId,
            packId: 'pro',
          },
        },
        client_reference_id: userId,
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/post?canceled=true`,
        metadata: {
          userId: userId,
          packId: 'pro',
          trial_eligible: trialEligible ? 'true' : 'false',
        },
      });

      return NextResponse.json({ url: session.url });
    }

    if (!COIN_PACKS[packId]) {
      return NextResponse.json({ error: 'Invalid packId' }, { status: 400 });
    }

    const selectedPack = COIN_PACKS[packId];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: `VLYP Coins x${selectedPack.amount}`,
              description: 'VLYP内でクリエイターへの投げ銭に使用できるコインです。',
            },
            unit_amount: selectedPack.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/coins?canceled=true`,
      metadata: {
        userId: userId,
        coins: selectedPack.amount.toString(),
        packId: packId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: error.message || '決済セッションの作成に失敗しました。' }, { status: 500 });
  }
}
