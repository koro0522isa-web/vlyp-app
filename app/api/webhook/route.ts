import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

/** Stripe API の Invoice には subscription があるが、SDK の型が追従していない場合がある */
type StripeInvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
};

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

  // ========================================
  // 決済完了時の処理
  // ========================================
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const packId = session.metadata?.packId;
    const coins = parseInt(session.metadata?.coins || '0');

    // ---- Pro サブスクリプション購入 ----
    if (packId === 'pro' && userId) {
      console.log(`Activating Pro subscription for user ${userId}`);
      
      // Stripe の subscription ID と customer ID を保存
      const updatePayload: Record<string, unknown> = {
        is_pro: true,
        pro_activated_at: new Date().toISOString(),
        monthly_uploads: 0, // リセット
      };

      if (session.subscription) {
        updatePayload.stripe_subscription_id =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription;
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
        console.log(`Pro activated successfully for user ${userId}`);
      }
    }

    // ---- コイン購入 ----
    if (userId && coins > 0) {
      console.log(`Crediting ${coins} coins to user ${userId}`);
      
      const { error } = await supabaseAdmin.rpc('increment_wallet_coins', {
        p_user_id: userId,
        p_amount: coins
      });

      if (error) {
        // RPCがない場合のフォールバック
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
            .insert({ user_id: userId, coins: coins });
        }
      }
    }
  }

  // ========================================
  // サブスクリプション更新（毎月の自動支払い）
  // ========================================
  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as StripeInvoiceWithSubscription;
    try {
      const subRef = invoice.subscription;
      const subscriptionId = typeof subRef === 'string' ? subRef : subRef?.id;
      let userId: string | undefined;

      // Checkout で付けた subscription.metadata.userId を優先（Customer に metadata が無いケース対応）
      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        userId = sub.metadata?.userId;
      }
      if (!userId && invoice.customer) {
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id;
        const customer = await stripe.customers.retrieve(customerId);
        if (customer && !customer.deleted) {
          userId = (customer as Stripe.Customer).metadata?.userId;
        }
      }
      if (userId) {
        await supabaseAdmin.from('profiles').update({ monthly_uploads: 0 }).eq('id', userId);
      }
    } catch (e) {
      console.error('Error processing invoice.paid:', e);
    }
  }

  // ========================================
  // 支払い失敗時の処理
  // ========================================
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as StripeInvoiceWithSubscription;
    try {
      const subRef = invoice.subscription;
      const subscriptionId = typeof subRef === 'string' ? subRef : subRef?.id;
      let userId: string | undefined;

      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        userId = sub.metadata?.userId;
      }
      if (!userId && invoice.customer) {
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id;
        const customer = await stripe.customers.retrieve(customerId);
        if (customer && !customer.deleted) {
          userId = (customer as Stripe.Customer).metadata?.userId;
        }
      }

      if (userId) {
        console.warn(`Payment failed for user ${userId}`);
        // 支払い失敗の通知をユーザーに送る
        await supabaseAdmin.from('notifications').insert({
          user_id: userId,
          actor_id: userId,
          type: 'payment_failed',
        });
      }
    } catch (e) {
      console.error('Error processing invoice.payment_failed:', e);
    }
  }

  // ========================================
  // サブスクリプション解約
  // ========================================
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    try {
      let userId = subscription.metadata?.userId;
      if (!userId && subscription.customer) {
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id;
        const customer = await stripe.customers.retrieve(customerId);
        if (customer && !customer.deleted) {
          userId = (customer as Stripe.Customer).metadata?.userId;
        }
      }
      if (userId) {
        console.log(`Deactivating Pro for user ${userId}`);
        await supabaseAdmin.from('profiles').update({
          is_pro: false,
          stripe_subscription_id: null,
        }).eq('id', userId);

        // 解約通知
        await supabaseAdmin.from('notifications').insert({
          user_id: userId,
          actor_id: userId,
          type: 'subscription_cancelled',
        });
      }
    } catch (e) {
      console.error('Error processing subscription deletion:', e);
    }
  }

  return NextResponse.json({ received: true });
}
