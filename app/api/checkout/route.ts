import { NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2025-01-27.acacia' as any });
}

// サーバー側で価格を定義（クライアント改ざん防止）
const COIN_PACKS: Record<string, { amount: number; price: number }> = {
  pack_100:  { amount: 100,  price: 150  },
  pack_500:  { amount: 500,  price: 700  },
  pack_1000: { amount: 1000, price: 1300 },
  pack_3000: { amount: 3000, price: 3500 },
  pack_5000: { amount: 5000, price: 6000 },
};

/** Pro プランの Stripe Price ID を取得または作成する */
async function getOrCreateProPriceId(stripe: Stripe): Promise<string> {
  // サーバー専用環境変数を優先（NEXT_PUBLIC_ は露出するので非推奨）
  const existingId =
    process.env.STRIPE_PRO_PRICE_ID ||
    process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;

  if (existingId) return existingId;

  // 既存の "VLYP Pro" 製品を探す
  const products = await stripe.products.list({ active: true, limit: 100 });
  const existing = products.data.find(p => p.name === 'VLYP Pro');

  let productId: string;
  if (existing) {
    productId = existing.id;
  } else {
    const product = await stripe.products.create({
      name: 'VLYP Pro',
      description: 'VLYP Proプラン - 毎月自動更新',
      metadata: { type: 'pro_subscription' },
    });
    productId = product.id;
  }

  // 既存の月額¥980プライスを探す
  const prices = await stripe.prices.list({ product: productId, active: true });
  const existingPrice = prices.data.find(
    p => p.unit_amount === 980 && p.currency === 'jpy' && p.recurring?.interval === 'month'
  );
  if (existingPrice) return existingPrice.id;

  // なければ作成
  const price = await stripe.prices.create({
    unit_amount: 980,
    currency: 'jpy',
    recurring: { interval: 'month' },
    product: productId,
    metadata: { packId: 'pro' },
  });
  return price.id;
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const { packId, userId } = await req.json();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    if (!packId || !userId) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // ---- Proプラン ----
    if (packId === 'pro') {
      const priceId = await getOrCreateProPriceId(stripe);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        subscription_data: {
          metadata: { userId, packId: 'pro' },
        },
        client_reference_id: userId,
        success_url: `${siteUrl}/post?success=pro`,
        cancel_url:  `${siteUrl}/post?canceled=true`,
        metadata: { userId, packId: 'pro' },
        // 日本語UIを優先
        locale: 'ja',
      });

      return NextResponse.json({ url: session.url });
    }

    // ---- コイン購入 ----
    const pack = COIN_PACKS[packId];
    if (!pack) {
      return NextResponse.json({ error: 'Invalid packId' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'jpy',
          product_data: {
            name: `VLYPコイン × ${pack.amount}`,
            description: 'クリエーターへの応援・ギフトに使えるコインです',
            images: [`${siteUrl}/coin-icon.png`].filter(Boolean),
          },
          unit_amount: pack.price,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${siteUrl}/coins?success=true&coins=${pack.amount}`,
      cancel_url:  `${siteUrl}/coins?canceled=true`,
      metadata: { userId, coins: String(pack.amount), packId },
      locale: 'ja',
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('[Checkout] Error:', error);
    return NextResponse.json(
      { error: error.message || '決済セッションの作成に失敗しました' },
      { status: 500 }
    );
  }
}
