import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27.acacia' as any,
  });
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    // trial_period付きの場合は no_payment_required が正常
    const isOk =
      session.status === 'complete' &&
      (session.payment_status === 'paid' ||
        session.payment_status === 'no_payment_required');

    if (!isOk) {
      console.warn(`Checkout session not complete: ${sessionId}`);
      return NextResponse.redirect(`${siteUrl}/post?error=payment_incomplete`);
    }

    const packId    = session.metadata?.packId;
    const userId    = session.metadata?.userId ?? session.metadata?.user_id;
    const coinsStr  = session.metadata?.coins;
    const sessionType = session.metadata?.type;

    // ─── Pro 購入: webhook フォールバック ───────────────────────────────
    // webhook が正常に処理されていれば is_pro は既に true のはず。
    // webhook が未到着 or 失敗していた場合のフォールバックとして直接 DB を更新する。
    if (packId === 'pro' && userId) {
      const supabaseAdmin = getAdminClient();

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_pro, stripe_subscription_id')
        .eq('id', userId)
        .maybeSingle();

      // webhook 未処理の場合のみフォールバック適用
      if (!profile?.is_pro) {
        console.log(`[checkout-success] Webhook not yet processed for ${userId}. Applying fallback.`);
        const updatePayload: Record<string, unknown> = {
          is_pro: true,
          pro_activated_at: new Date().toISOString(),
          monthly_uploads: 0,
        };
        if (session.customer) {
          updatePayload.stripe_customer_id =
            typeof session.customer === 'string'
              ? session.customer
              : (session.customer as Stripe.Customer).id;
        }
        const sub = session.subscription as Stripe.Subscription | null;
        if (sub?.id) {
          updatePayload.stripe_subscription_id = sub.id;
          // trial
          if ((sub as any).trial_end) {
            updatePayload.pro_trial_ends_at = new Date(
              (sub as any).trial_end * 1000
            ).toISOString();
            updatePayload.pro_trial_used = true;
          }
        }
        await supabaseAdmin.from('profiles').update(updatePayload).eq('id', userId);
      }

      return NextResponse.redirect(`${siteUrl}/settings?pro=true`);
    }

    // ─── コイン購入 ────────────────────────────────────────────────────
    if (userId && coinsStr) {
      return NextResponse.redirect(`${siteUrl}/coins?success=true`);
    }

    // ─── ファンクラブ ──────────────────────────────────────────────────
    if (sessionType === 'fan_club') {
      const creatorUsername = session.metadata?.creator_username ?? '';
      return NextResponse.redirect(
        `${siteUrl}/membership/${creatorUsername}?success=true`
      );
    }

    // フォールバック
    return NextResponse.redirect(`${siteUrl}/post?success=true`);
  } catch (err: any) {
    console.error('checkout-success error:', err);
    return NextResponse.redirect(`${siteUrl}/post?error=server_error`);
  }
}
