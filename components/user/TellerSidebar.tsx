'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Teller, UserProfile } from '@/types';

interface TellerSidebarProps {
  currentTellerId: string;
  profile: UserProfile | null;
  onShowSubscribe: () => void;
}

const PLAN_META: Record<string, { label: string; color: string; bg: string }> = {
  free:     { label: '無料',           color: 'text-gold-pale/50', bg: 'bg-gold/5' },
  light:    { label: 'ライト',         color: 'text-gold/80',      bg: 'bg-gold/10' },
  standard: { label: 'スタンダード',   color: 'text-gold',         bg: 'bg-gold/15' },
  premium:  { label: 'プレミアム',     color: 'text-gold-light',   bg: 'bg-gold-light/15' },
};

export default function TellerSidebar({ currentTellerId, profile, onShowSubscribe }: TellerSidebarProps) {
  const [tellers, setTellers] = useState<Teller[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadTellers() {
      const { data } = await supabase.from('tellers').select('*').order('name');
      if (data) setTellers(data);
    }
    loadTellers();

    const channel = supabase
      .channel('tellers-status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tellers' }, (payload) => {
        setTellers((prev) => prev.map((t) => (t.id === payload.new.id ? { ...t, ...payload.new } : t)));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const plan = profile?.plan ?? 'free';
  const planMeta = PLAN_META[plan] ?? PLAN_META.free;

  return (
    <div className="w-60 flex-shrink-0 h-full flex flex-col glass-dark border-r border-gold/10">
      {/* ロゴ */}
      <div className="px-5 py-5 border-b border-gold/10">
        <h1 className="font-cormorant text-2xl text-shimmer tracking-wider text-center leading-none mb-1">
          HOSHIYOMI
        </h1>
        <p className="text-center text-xs text-gold/45 font-shippori tracking-[0.3em]">星 詠 み</p>
      </div>

      {/* プランバッジ */}
      {profile && (
        <div className="px-4 py-3 border-b border-gold/10">
          <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${planMeta.bg}`}>
            <div>
              <div className={`text-xs font-shippori font-semibold ${planMeta.color}`}>
                {plan === 'free'
                  ? `無料プラン（残り ${profile.free_msgs_left} 通）`
                  : `${planMeta.label}プラン`}
              </div>
              {plan === 'free' && profile.free_msgs_left > 0 && (
                <div className="w-full h-1 bg-gold/10 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold/50 to-gold transition-all"
                    style={{ width: `${(profile.free_msgs_left / 3) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
          {plan === 'free' && (
            <button
              onClick={onShowSubscribe}
              className="mt-2 w-full text-xs text-rose-light/80 hover:text-rose-light transition-colors text-center underline"
            >
              プランをアップグレード →
            </button>
          )}
        </div>
      )}

      {/* 占い師リスト */}
      <div className="flex-1 overflow-y-auto py-2">
        <p className="px-4 py-2 text-[10px] text-gold-pale/35 font-shippori tracking-widest uppercase">
          占い師を選ぶ
        </p>
        {tellers.map((teller) => {
          const isActive = currentTellerId === teller.id;
          return (
            <button
              key={teller.id}
              onClick={() => router.push(`/chat/${teller.id}`)}
              className={`teller-card w-full text-left px-4 py-3 flex items-start gap-3 ${isActive ? 'active' : ''}`}
            >
              {/* アバター */}
              <div className="flex-shrink-0 relative">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(45,27,105,1), rgba(107,63,160,0.85))'
                      : 'linear-gradient(135deg, rgba(45,27,105,0.7), rgba(107,63,160,0.5))',
                    border: isActive
                      ? '1.5px solid rgba(201,168,76,0.6)'
                      : '1px solid rgba(201,168,76,0.25)',
                    boxShadow: isActive ? '0 0 14px rgba(201,168,76,0.25)' : 'none',
                  }}
                >
                  {teller.emoji}
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-deep"
                  style={{
                    background: teller.is_online ? '#22c55e' : '#444',
                    boxShadow: teller.is_online ? '0 0 5px #22c55e' : 'none',
                  }}
                />
              </div>

              {/* 情報 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`font-shippori text-sm font-semibold truncate ${isActive ? 'text-gold' : 'text-gold-pale'}`}>
                    {teller.name}
                  </span>
                  <span className="text-xs text-gold/55 ml-1 flex-shrink-0">★{teller.rating}</span>
                </div>
                <div className="text-xs text-gold-pale/45 truncate">{teller.specialty}</div>
                <div className={`text-[10px] mt-0.5 ${teller.is_online ? 'text-green-400/80' : 'text-gray-500'}`}>
                  {teller.is_online ? '● オンライン' : '○ オフライン'}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* フッター */}
      <div className="px-4 py-3 border-t border-gold/10">
        <p className="text-[10px] text-gold-pale/25 text-center font-shippori">
          © 2025 HOSHIYOMI 星詠み
        </p>
      </div>
    </div>
  );
}
