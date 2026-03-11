'use client';

import { useState } from 'react';
import { UserProfile } from '@/types';

interface SubscriptionPanelProps {
  profile: UserProfile | null;
  onClose: () => void;
}

const plans = [
  {
    key: 'light',
    name: 'ライト',
    price: 980,
    emoji: '🌙',
    features: ['メッセージ送受信 無制限', '全占い師に相談可能', '平均返信時間 12時間以内'],
    featured: false,
  },
  {
    key: 'standard',
    name: 'スタンダード',
    price: 1480,
    emoji: '⭐',
    features: ['メッセージ送受信 無制限', '全占い師に相談可能', '平均返信時間 6時間以内', '優先返信キュー'],
    featured: true,
  },
  {
    key: 'premium',
    name: 'プレミアム',
    price: 2980,
    emoji: '👑',
    features: ['メッセージ送受信 無制限', '全占い師に相談可能', '平均返信時間 2時間以内', '優先返信キュー', '月1回の詳細鑑定書'],
    featured: false,
  },
] as const;

export default function SubscriptionPanel({ profile, onClose }: SubscriptionPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notReady, setNotReady] = useState(false);

  async function handleSubscribe(planKey: string) {
    if (!profile) {
      window.location.href = '/';
      return;
    }

    setLoading(planKey);
    setError('');

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planKey,
          userId: profile.id,
          email: profile.email,
        }),
      });

      const data = await res.json();

      // Stripe 未設定 → 準備中メッセージを表示
      if (data.notReady) {
        setNotReady(true);
        setError(data.message);
        return;
      }

      if (data.error) { setError(data.error); return; }
      if (data.url)   window.location.href = data.url;
    } catch (e) {
      setError('エラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(6,3,15,0.9)' }}>
      <div className="w-full max-w-3xl">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h2 className="font-cormorant text-4xl text-gold-gradient mb-2">
            プランを選択
          </h2>
          <p className="text-gold-pale/60 text-sm">
            サブスクリプションに加入して、占い師との会話を続けましょう
          </p>
        </div>

        {error && (
          <div
            className="text-sm p-4 rounded-xl mb-6 text-center"
            style={notReady
              ? { background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', color: 'rgba(245,230,184,0.75)' }
              : { background: 'rgba(127,29,29,0.3)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }
            }
          >
            {notReady && <div style={{ fontSize: 28, marginBottom: 8 }}>🌙</div>}
            {error}
          </div>
        )}

        {/* プランカード */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`plan-card p-6 ${plan.featured ? 'featured' : ''}`}
            >
              <div className="text-3xl mb-3 text-center">{plan.emoji}</div>
              <h3 className="font-shippori font-bold text-center text-gold text-lg mb-1">
                {plan.name}
              </h3>
              <div className="text-center mb-4">
                <span className="font-cormorant text-3xl text-gold-pale">¥{plan.price.toLocaleString()}</span>
                <span className="text-xs text-gold-pale/50">/月</span>
              </div>

              <div className="divider-gold mb-4" />

              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gold-pale/70">
                    <span className="text-gold mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.key)}
                disabled={loading !== null}
                className={`w-full py-2.5 rounded-lg text-sm font-shippori font-semibold transition-all ${
                  plan.featured
                    ? 'btn-gold'
                    : 'btn-ghost'
                }`}
              >
                {loading === plan.key ? '処理中…' : '申し込む'}
              </button>
            </div>
          ))}
        </div>

        {/* 無料トライアル注記 */}
        <p className="text-center text-xs text-gold-pale/30 mb-4">
          クレジットカード払い · いつでもキャンセル可能 · 自動更新
        </p>

        <div className="text-center">
          <button onClick={onClose} className="text-sm text-gold-pale/40 hover:text-gold-pale/70 transition-colors underline">
            後で決める
          </button>
        </div>
      </div>
    </div>
  );
}
