import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

type StripeInvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
};

const getClients = () => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-01-27.acacia' as any,
  });
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
  return { stripe, supabaseAdmin };
};

/** subscription から userId を取得するヘルパー */
async function getUserIdFromSubscription(
  stripe: Stripe,
  subscriptionOrId: string | Stripe.Subscription | null | undefined
): Promise<string | undefined> {
  if (!subscriptionOrId) return undefined;
  const subId = typeof subscriptionOrId === 'string' ? subscriptionOrId : subscriptionOrId.id;
  const sub = await stripe.subscriptions.retrieve(subId);
  return sub.metadata?.userId ?? sub.metadata?.user_id;
}

/** customer から userId を取得するヘルパー */
async function getUserIdFromCustomer(
  stripe: Stripe,
  customerOrId: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
): Promise<string | undefined> {
  if (!customerOrId) return undefined;
  const customerId = typeof customerOrId === 'string' ? customerOrId : customerOrId.id;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return undefined;
  return (customer as Stripe.Customer).metadata?.userId;
}

export async function POST(req: Request) {
  const { stripe, supabaseAdmin } = getClients();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const payload = await req.text();
  const sig = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret!);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  console.log(`[Webhook] Processing event: ${event.type}`);

  // ============================================================
  // checkout.session.completed
  // ============================================================
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId  = session.metadata?.userId   ?? session.metadata?.user_id;
    const packId  = session.metadata?.packId;
    const type    = session.metadata?.type;        // 'fan_club' など
    const coins   = parseInt(session.metadata?.coins || '0', 10);

    // ---- Proプラン ----
    if (packId === 'pro' && userId) {
      console.log(`[Webhook] Activating Pro for user ${userId}`);
      const updatePayload: Record<string, unknown> = {
        is_pro: true,
        pro_activated_at: new Date().toISOString(),
        monthly_uploads: 0,
      };
      if (session.subscription) {
        updatePayload.stripe_subscription_id =
          typeof session.subscription === 'string' ? session.subscription : (session.subscription as any).id;
      }
      if (session.customer) {
        updatePayload.stripe_customer_id =
          typeof session.customer === 'string' ? session.customer : (session.customer as any).id;
      }
      const { error } = await supabaseAdmin
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId);
      if (error) console.error('[Webhook] Pro activate error:', error);
      else {
        console.log(`[Webhook] Pro activated for ${userId}`);
        // Pro加入通知
        await supabaseAdmin.from('notifications').insert({
          user_id: userId,
          actor_id: userId,
          type: 'pro_activated',
        }).select();
      }
    }

    // ---- コイン購入 ----
    if (userId && coins > 0) {
      console.log(`[Webhook] Crediting ${coins} coins to ${userId}`);
      const { error } = await supabaseAdmin.rpc('increment_wallet_coins', {
        p_user_id: userId,
        p_amount: coins,
      });
      if (error) {
        // RPCがない場合フォールバック
        const { data: wallet } = await supabaseAdmin
          .from('wallets').select('coins').eq('user_id', userId).maybeSingle();
        if (wallet) {
          await supabaseAdmin.from('wallets')
            .update({ coins: (wallet.coins || 0) + coins }).eq('user_id', userId);
        } else {
          await supabaseAdmin.from('wallets').insert({ user_id: userId, coins });
        }
      }
    }

    // ---- ファンクラブ加入 ----
    if (type === 'fan_club') {
      const tierId    = session.metadata?.tier_id;
      const creatorId = session.metadata?.creator_id;
      const fanUserId = userId;

      if (fanUserId && tierId && creatorId) {
        console.log(`[Webhook] Activating fan_club tier ${tierId} for user ${fanUserId}`);
        const stripeSubId =
          typeof session.subscription === 'string'
            ? session.subscription
            : (session.subscription as any)?.id;
        const stripeCustomerId =
          typeof session.customer === 'string'
            ? session.customer
            : (session.customer as any)?.id;

        // upsert: 既存なら更新、なければ新規
        const { error } = await supabaseAdmin
          .from('memberships')
          .upsert({
            user_id: fanUserId,
            creator_id: creatorId,
            tier_id: parseInt(tierId, 10),
            status: 'active',
            stripe_subscription_id: stripeSubId,
            stripe_customer_id: stripeCustomerId,
            started_at: new Date().toISOString(),
          }, { onConflict: 'user_id,creator_id' });

        if (error) console.error('[Webhook] Fan club activate error:', error);
        else {
          // クリエーターへのファンクラブ加入通知
          await supabaseAdmin.from('notifications').insert({
            user_id: creatorId,
            actor_id: fanUserId,
            type: 'fan_club_joined',
          }).select();
        }
      }
    }
  }

  // ============================================================
  // invoice.paid - 毎月の自動更新
  // ============================================================
  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as StripeInvoiceWithSubscription;
    try {
      let userId = await getUserIdFromSubscription(stripe, invoice.subscription);
      if (!userId) userId = await getUserIdFromCustomer(stripe, invoice.customer);

      if (userId) {
        // Pro の月次リセット
        await supabaseAdmin
          .from('profiles')
          .update({ monthly_uploads: 0, is_pro: true })
          .eq('id', userId);
        console.log(`[Webhook] invoice.paid: Pro renewed for ${userId}`);
      }

      // ファンクラブ membership の更新
      const sub = invoice.subscription;
      if (sub) {
        const subId = typeof sub === 'string' ? sub : sub.id;
        const { data: membership } = await supabaseAdmin
          .from('memberships')
          .select('id')
          .eq('stripe_subscription_id', subId)
          .maybeSingle();
        if (membership) {
          await supabaseAdmin
            .from('memberships')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', membership.id);
        }
      }
    } catch (e) {
      console.error('[Webhook] invoice.paid error:', e);
    }
  }

  // ============================================================
  // invoice.payment_failed
  // ============================================================
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as StripeInvoiceWithSubscription;
    try {
      let userId = await getUserIdFromSubscription(stripe, invoice.subscription);
      if (!userId) userId = await getUserIdFromCustomer(stripe, invoice.customer);
      if (userId) {
        await supabaseAdmin.from('notifications').insert({
          user_id: userId,
          actor_id: userId,
          type: 'payment_failed',
        }).select();
      }
    } catch (e) {
      console.error('[Webhook] invoice.payment_failed error:', e);
    }
  }

  // ============================================================
  // customer.subscription.updated - Pro状態同期
  // ============================================================
  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription;
    try {
      let userId = sub.metadata?.userId ?? sub.metadata?.user_id;
      if (!userId) userId = await getUserIdFromCustomer(stripe, sub.customer);

      if (userId) {
        const isActive = sub.status === 'active' || sub.status === 'trialing';
        // Proサブスクの場合のみ更新（fan_clubはmembershipsで管理）
        const packId = sub.metadata?.packId;
        if (packId === 'pro') {
          await supabaseAdmin.from('profiles').update({ is_pro: isActive }).eq('id', userId);
          console.log(`[Webhook] subscription.updated: user ${userId} is_pro=${isActive}`);
        }
      }

      // fan_club サブスクの状態更新
      const type = sub.metadata?.type;
      if (type === 'fan_club') {
        const isActive = sub.status === 'active' || sub.status === 'trialing';
        const { error } = await supabaseAdmin
          .from('memberships')
          .update({ status: isActive ? 'active' : 'expired' })
          .eq('stripe_subscription_id', sub.id);
        if (error) console.error('[Webhook] fan_club update error:', error);
      }
    } catch (e) {
      console.error('[Webhook] subscription.updated error:', e);
    }
  }

  // ============================================================
  // customer.subscription.deleted - 解約
  // ============================================================
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    try {
      let userId = sub.metadata?.userId ?? sub.metadata?.user_id;
      if (!userId) userId = await getUserIdFromCustomer(stripe, sub.customer);

      const packId = sub.metadata?.packId;
      const type   = sub.metadata?.type;

      if (userId && packId === 'pro') {
        await supabaseAdmin.from('profiles').update({
          is_pro: false,
          stripe_subscription_id: null,
        }).eq('id', userId);
        await supabaseAdmin.from('notifications').insert({
          user_id: userId,
          actor_id: userId,
          type: 'subscription_cancelled',
        }).select();
        console.log(`[Webhook] Pro cancelled for ${userId}`);
      }

      if (type === 'fan_club') {
        await supabaseAdmin
          .from('memberships')
          .update({ status: 'expired' })
          .eq('stripe_subscription_id', sub.id);
      }
    } catch (e) {
      console.error('[Webhook] subscription.deleted error:', e);
    }
  }

  return NextResponse.json({ received: true });
}
