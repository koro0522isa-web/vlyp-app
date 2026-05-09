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

/** サブスクリプションから userId を取得するヘルパー */
async function getUserIdFromSub(
  stripe: Stripe,
  sub: Stripe.Subscription
): Promise<string | undefined> {
  if (sub.metadata?.user_id) return sub.metadata.user_id;
  if (sub.metadata?.userId) return sub.metadata.userId;
  if (sub.customer) {
    const customerId =
      typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    const customer = await stripe.customers.retrieve(customerId);
    if (customer && !customer.deleted) {
      return (customer as Stripe.Customer).metadata?.userId;
    }
  }
  return undefined;
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
    console.error(`Webhook Signature Verification Failed: ${err.message}`);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  // ========================================
  // 決済完了時の処理
  // ========================================
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId ?? session.metadata?.user_id;
    const packId = session.metadata?.packId;
    const coins = parseInt(session.metadata?.coins || '0');
    const type = session.metadata?.type;

    // ---- Pro サブスクリプション購入 ----
    if (packId === 'pro' && userId) {
      console.log(`Activating Pro subscription for user ${userId}`);

      const updatePayload: Record<string, unknown> = {
        is_pro: true,
        pro_activated_at: new Date().toISOString(),
        monthly_uploads: 0,
      };

      if (session.subscription) {
        updatePayload.stripe_subscription_id =
          typeof session.subscription === 'string'
            ? session.subscription
            : (session.subscription as Stripe.Subscription).id;
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
        p_amount: coins,
      });

      if (error) {
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

    // ---- ファンクラブ加入 ----
    if (type === 'fan_club') {
      const fanUserId = session.metadata?.user_id;
      const tierId = session.metadata?.tier_id;
      const creatorId = session.metadata?.creator_id;

      if (fanUserId && tierId && creatorId) {
        console.log(`Activating fan_club membership: user=${fanUserId} tier=${tierId}`);

        // subscription ID を取得
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : (session.subscription as Stripe.Subscription | null)?.id ?? null;

        // current_period_end を取得
        let currentPeriodEnd: string | null = null;
        if (subscriptionId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            currentPeriodEnd = new Date(
              (sub as any).current_period_end * 1000
            ).toISOString();
          } catch {}
        }

        const { error } = await supabaseAdmin
          .from('memberships')
          .upsert(
            {
              user_id: fanUserId,
              tier_id: parseInt(tierId),
              creator_id: creatorId,
              stripe_sub_id: subscriptionId,
              status: 'active',
              current_period_end: currentPeriodEnd,
            },
            { onConflict: 'user_id,creator_id' }
          );

        if (error) {
          console.error('Error activating fan_club membership:', error);
        } else {
          console.log(`fan_club membership activated for user ${fanUserId}`);

          // クリエイターに通知
          await supabaseAdmin.from('notifications').insert({
            user_id: creatorId,
            actor_id: fanUserId,
            type: 'new_member',
          }).select();
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

      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const subType = sub.metadata?.type;
        const userId = await getUserIdFromSub(stripe, sub);

        if (subType === 'fan_club') {
          // ファンクラブ：period end を更新して active に保つ
          const tierId = sub.metadata?.tier_id;
          const creatorId = sub.metadata?.creator_id;
          const fanUserId = sub.metadata?.user_id;
          const currentPeriodEnd = new Date(
            (sub as any).current_period_end * 1000
          ).toISOString();

          if (fanUserId && creatorId) {
            await supabaseAdmin
              .from('memberships')
              .update({
                status: 'active',
                current_period_end: currentPeriodEnd,
                stripe_sub_id: subscriptionId,
              })
              .eq('user_id', fanUserId)
              .eq('creator_id', creatorId);

            console.log(`fan_club renewed for user ${fanUserId} until ${currentPeriodEnd}`);
          }
        } else {
          // Pro：monthly_uploads リセット
          if (userId) {
            await supabaseAdmin
              .from('profiles')
              .update({ monthly_uploads: 0 })
              .eq('id', userId);
          }
        }
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

      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const subType = sub.metadata?.type;
        const userId = await getUserIdFromSub(stripe, sub);

        if (subType === 'fan_club') {
          const fanUserId = sub.metadata?.user_id;
          const creatorId = sub.metadata?.creator_id;
          if (fanUserId && creatorId) {
            await supabaseAdmin
              .from('memberships')
              .update({ status: 'past_due' })
              .eq('user_id', fanUserId)
              .eq('creator_id', creatorId);

            await supabaseAdmin.from('notifications').insert({
              user_id: fanUserId,
              actor_id: fanUserId,
              type: 'payment_failed',
            });
          }
        } else {
          if (userId) {
            console.warn(`Payment failed for user ${userId}`);
            await supabaseAdmin.from('notifications').insert({
              user_id: userId,
              actor_id: userId,
              type: 'payment_failed',
            });
          }
        }
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
      const subType = subscription.metadata?.type;

      if (subType === 'fan_club') {
        // ファンクラブ解約
        const fanUserId = subscription.metadata?.user_id;
        const creatorId = subscription.metadata?.creator_id;
        if (fanUserId && creatorId) {
          await supabaseAdmin
            .from('memberships')
            .update({ status: 'inactive' })
            .eq('user_id', fanUserId)
            .eq('creator_id', creatorId);

          console.log(`fan_club cancelled for user ${fanUserId}`);
          await supabaseAdmin.from('notifications').insert({
            user_id: fanUserId,
            actor_id: fanUserId,
            type: 'subscription_cancelled',
          });
        }
      } else {
        // Pro 解約
        const userId = await getUserIdFromSub(stripe, subscription);
        if (userId) {
          console.log(`Deactivating Pro for user ${userId}`);
          await supabaseAdmin
            .from('profiles')
            .update({ is_pro: false, stripe_subscription_id: null })
            .eq('id', userId);

          await supabaseAdmin.from('notifications').insert({
            user_id: userId,
            actor_id: userId,
            type: 'subscription_cancelled',
          });
        }
      }
    } catch (e) {
      console.error('Error processing subscription deletion:', e);
    }
  }

  return NextResponse.json({ received: true });
}
