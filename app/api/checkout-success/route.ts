import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27.acacia' as any,
  });
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.redirect(`${siteUrl}/post?error=missing_session`);
  }

  try {
    const stripe = getStripe();

    // Stripe からセッション情報を取得して検証のみ（DBへの書き込みは webhook に一本化）
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.status !== 'complete' && session.payment_status !== 'paid') {
      console.warn(`Checkout session not complete: ${sessionId}`);
      return NextResponse.redirect(`${siteUrl}/post?error=payment_incomplete`);
    }

    const packId = session.metadata?.packId;

    // コイン付与・Pro付与は webhook に一本化済み。ここはリダイレクトのみ。
    if (packId === 'pro') {
      return NextResponse.redirect(`${siteUrl}/settings?pro=true`);
    }
    return NextResponse.redirect(`${siteUrl}/coins?success=true`);
  } catch (err: any) {
    console.error('checkout-success error:', err);
    return NextResponse.redirect(`${siteUrl}/post?success=true`);
  }
}
