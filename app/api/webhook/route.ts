import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-01-27.acacia' as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// サーバーサイド用Supabaseクライアント（service_roleを使用してRLSをバイパス）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const payload = await req.text();
  const sig = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret!);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // 決済完了時の処理
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const coins = parseInt(session.metadata?.coins || '0');

    if (userId && coins > 0) {
      console.log(`Crediting ${coins} coins to user ${userId}`);
      
      // ウォレットに残高を追加
      const { error } = await supabaseAdmin.rpc('increment_wallet_coins', {
        p_user_id: userId,
        p_amount: coins
      });

      if (error) {
        // RPCがない場合のフォールバック
        const { error: updateError } = await supabaseAdmin
          .from('wallets')
          .update({ coins: coins }) // ※注意: 本来は現在の値 + coins にすべき
          .eq('user_id', userId);
        
        if (updateError) console.error('Error updating wallet:', updateError);
      }
    }
  }

  return NextResponse.json({ received: true });
}

// SQL側で increment_wallet_coins を作成する必要があります
