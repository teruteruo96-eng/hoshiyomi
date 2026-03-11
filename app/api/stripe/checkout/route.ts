import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { PLANS } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Stripe 未設定時はフレンドリーなメッセージを返す
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? '';
  if (!stripeKey || stripeKey.startsWith('sk_test_dummy') || stripeKey === '') {
    return NextResponse.json(
      { notReady: true, message: 'サブスクリプション機能は近日公開予定です。しばらくお待ちください。' },
      { status: 200 }
    );
  }

  try {
    const body = await req.json();
    const { plan, userId, email } = body as {
      plan: keyof typeof PLANS;
      userId: string;
      email: string;
    };

    if (!plan || !userId || !email) {
      return NextResponse.json({ error: 'パラメータが不足しています' }, { status: 400 });
    }

    const planConfig = PLANS[plan];
    if (!planConfig) {
      return NextResponse.json({ error: '無効なプランです' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      success_url: `${appUrl}/subscribe?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/subscribe`,
      metadata: { userId, plan },
      locale: 'ja',
      subscription_data: {
        metadata: { userId, plan },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('[Stripe Checkout Error]', error);
    return NextResponse.json(
      { error: error.message || 'Stripeエラーが発生しました' },
      { status: 500 }
    );
  }
}
