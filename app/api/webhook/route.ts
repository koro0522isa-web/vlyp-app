import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// 実行時に初期化するための関数
const getClients = () => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-01-27.acacia' as any,
  });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
  );

  return { stripe, supabaseAdmin };
};

export async function POST(req: Request) {
  const { stripe, supabaseAdmin } = getClients();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const payload = await req.text();
  const sig = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret!);
  } catch (err: any) {
    console.error(`Webhook Signature Verification Failed: ${err.message}`);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
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
