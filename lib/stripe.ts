import Stripe from 'stripe';

// ビルド時に環境変数がなくてもクラッシュしないようプレースホルダーを使用
export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
  {
    apiVersion: '2024-06-20',
    typescript: true,
  }
);
