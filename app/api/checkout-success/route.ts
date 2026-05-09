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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.redirect(`${siteUrl}/post?error=missing_session`);
  }

  try {
    const { stripe, supabaseAdmin } = getClients();

    // Stripe からセッション情報を取得して検証
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.status !== 'complete' && session.payment_status !== 'paid') {
      console.warn(`Checkout session not complete: ${sessionId}`);
      return NextResponse.redirect(`${siteUrl}/post?error=payment_incomplete`);
    }

    const userId = session.metadata?.userId;
    const packId = session.metadata?.packId;

    if (!userId) {
      console.error(`No userId in session metadata: ${sessionId}`);
      return NextResponse.redirect(`${siteUrl}/post?success=true`);
    }

    // Pro サブスクリプションの処理
    if (packId === 'pro') {
      const updatePayload: Record<string, unknown> = {
        is_pro: true,
        pro_activated_at: new Date().toISOString(),
        monthly_uploads: 0,
      };

      if (session.subscription) {
        const subId =
          typeof session.subscription === 'string'
            ? session.subscription
            : (session.subscription as Stripe.Subscription).id;
        updatePayload.stripe_subscription_id = subId;
      }

      if (session.customer) {
        updatePayload.stripe_customer_id =
          typeof session.customer === 'string'
            ? session.customer
            : (session.customer as Stripe.Customer).id;
      }

      const { error } = await supabaseAdmin
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId);

      if (error) {
        console.error('Error activating Pro:', error);
      } else {
        console.log(`Pro activated via success URL for user ${userId}`);
      }
    }

    // コイン購入の処理
    const coins = parseInt(session.metadata?.coins || '0');
    if (coins > 0) {
      const { error } = await supabaseAdmin.rpc('increment_wallet_coins', {
        p_user_id: userId,
        p_amount: coins,
      });

      if (error) {
        // RPC がない場合のフォールバック
        const { data: wallet } = await supabaseAdmin
          .from('wallets')
          .select('coins')
          .eq('user_id', userId)
          .maybeSingle();

        if (wallet) {
          await supabaseAdmin
            .from('wallets')
            .update({ coins: (wallet.coins || 0) + coins })
            .eq('user_id', userId);
        } else {
          await supabaseAdmin
            .from('wallets')
            .insert({ user_id: userId, coins });
        }
      }
    }

    // 成功 → 元のページへリダイレクト
    if (packId === 'pro') {
      return NextResponse.redirect(`${siteUrl}/post?success=true&pro=activated`);
    }
    return NextResponse.redirect(`${siteUrl}/coins?success=true`);
  } catch (err: any) {
    console.error('checkout-success error:', err);
    return NextResponse.redirect(`${siteUrl}/post?success=true`);
  }
}
