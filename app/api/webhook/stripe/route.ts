import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';



export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2026-04-22.dahlia',
  });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    const userId = session.metadata?.userId;
    const coins = parseInt(session.metadata?.coins || '0');
    
    if (userId && coins > 0) {
      try {
        // Stripeの支払い情報を記録
        await supabaseAdmin.from('stripe_purchases').insert({
          id: session.id,
          user_id: userId,
          amount: session.amount_total,
          coins: coins,
          status: 'completed'
        });

        // ユーザーのウォレット残高を更新
        const { data: existingWallet } = await supabaseAdmin
          .from('wallets')
          .select('coins')
          .eq('user_id', userId)
          .maybeSingle();

        if (existingWallet) {
          await supabaseAdmin
            .from('wallets')
            .update({ coins: existingWallet.coins + coins })
            .eq('user_id', userId);
        } else {
          await supabaseAdmin
            .from('wallets')
            .insert({ user_id: userId, coins: coins });
        }

        console.log(`Successfully added ${coins} coins to user ${userId}`);
      } catch (dbError) {
        console.error('Database update failed:', dbError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
