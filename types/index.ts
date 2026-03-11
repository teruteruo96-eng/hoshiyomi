export type Plan = 'free' | 'light' | 'standard' | 'premium';

export interface Teller {
  id: string;
  name: string;
  emoji: string;
  specialty: string;
  bio?: string;
  rating: number;
  review_count: number;
  is_online: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  plan: Plan;
  free_msgs_left: number;
  stripe_customer_id: string | null;
}

export interface Thread {
  id: string;
  user_id: string;
  teller_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  role: 'user' | 'fortune';
  content: string;
  is_read: boolean;
  created_at: string;
}

export const PLANS = {
  light:    { name: 'ライト',       price: 980,  priceId: process.env.STRIPE_PRICE_LIGHT!    },
  standard: { name: 'スタンダード', price: 1480, priceId: process.env.STRIPE_PRICE_STANDARD! },
  premium:  { name: 'プレミアム',   price: 2980, priceId: process.env.STRIPE_PRICE_PREMIUM!  },
} as const;

export const QUICK_REPLIES = [
  'ただいま占い中です…🔮',
  'カードを引きました✨',
  '少しお時間をください🌙',
  'エネルギーを感じています…',
  'ありがとうございます。では続きを。',
  '今、星の動きを読んでいます⭐',
] as const;
