import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type Stripe from 'stripe';

// Next.js App RouterのbodyParserを無効化（Stripeのwebhook検証に必要）
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Stripe-Signature ヘッダーがありません' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('[Webhook] 署名検証失敗:', err.message);
    return NextResponse.json({ error: `Webhook エラー: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, plan } = session.metadata ?? {};

        if (userId && plan) {
          const { error } = await supabaseAdmin
            .from('user_profiles')
            .update({
              plan,
              stripe_customer_id:     session.customer as string,
              stripe_subscription_id: session.subscription as string,
              free_msgs_left: 999999, // 有料プランは実質無制限
            })
            .eq('id', userId);

          if (error) {
            console.error('[Webhook] user_profiles更新エラー:', error);
          } else {
            console.log(`[Webhook] ユーザー ${userId} をプラン ${plan} に更新しました`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const plan = sub.metadata?.plan || sub.items.data[0]?.price?.metadata?.plan;

        if (plan && sub.status === 'active') {
          await supabaseAdmin
            .from('user_profiles')
            .update({ plan, free_msgs_left: 999999 })
            .eq('stripe_subscription_id', sub.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        // サブスク解約時: freeプランに戻す
        const sub = event.data.object as Stripe.Subscription;
        const { error } = await supabaseAdmin
          .from('user_profiles')
          .update({
            plan: 'free',
            free_msgs_left: 3,
            stripe_subscription_id: null,
          })
          .eq('stripe_subscription_id', sub.id);

        if (error) {
          console.error('[Webhook] サブスク解約処理エラー:', error);
        } else {
          console.log(`[Webhook] サブスク ${sub.id} 解約 → freeプランに変更`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn('[Webhook] 支払い失敗:', invoice.customer);
        break;
      }

      default:
        console.log(`[Webhook] 未処理のイベント: ${event.type}`);
    }
  } catch (err: any) {
    console.error('[Webhook] 処理エラー:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
