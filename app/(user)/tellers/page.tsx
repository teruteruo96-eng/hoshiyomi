'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Teller, UserProfile } from '@/types';
import LandingPage from '@/components/user/LandingPage';

function AuroraBg() {
  return (
    <div className="aurora-bg">
      <div className="aurora-orb" />
      <div className="aurora-orb" />
      <div className="aurora-orb" />
    </div>
  );
}

export default function TellersPage() {
  const [tellers, setTellers] = useState<Teller[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userId,  setUserId]  = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      // Auth確認
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setShowAuth(true); setLoading(false); return; }

      setUserId(session.user.id);

      const [{ data: tellersData }, { data: profileData }] = await Promise.all([
        supabase.from('tellers').select('*').order('is_online', { ascending: false }).order('rating', { ascending: false }),
        supabase.from('user_profiles').select('*').eq('id', session.user.id).single(),
      ]);

      if (tellersData) setTellers(tellersData);
      if (profileData) setProfile(profileData);
      setLoading(false);
    }
    init();

    // テラーのリアルタイム更新
    const ch = supabase
      .channel('tellers-page-status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tellers' }, (payload) => {
        setTellers((prev) => prev.map((t) => t.id === payload.new.id ? { ...t, ...payload.new } : t)
          .sort((a, b) => {
            if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
            return b.rating - a.rating;
          }));
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  const onlineTellers  = tellers.filter((t) => t.is_online);
  const offlineTellers = tellers.filter((t) => !t.is_online);

  const PLAN_LABEL: Record<string, string> = {
    free: '無料', light: 'ライト', standard: 'スタンダード', premium: 'プレミアム',
  };
  const PLAN_COLOR: Record<string, string> = {
    free: 'rgba(245,230,184,0.4)', light: 'rgba(201,168,76,0.7)', standard: 'var(--gold)', premium: 'var(--gold-light)',
  };

  if (showAuth) {
    return <LandingPage onDismiss={() => { setShowAuth(false); window.location.reload(); }} />;
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', background: 'var(--void)' }}>
      <AuroraBg />

      {/* ヘッダー */}
      <header className="page-header" style={{ position: 'sticky', top: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="font-cormorant text-shimmer" style={{ fontSize: 22, letterSpacing: '0.08em' }}>HOSHIYOMI</span>
          <span className="font-shippori" style={{ fontSize: 11, color: 'rgba(201,168,76,0.5)', letterSpacing: '0.2em' }}>星詠み</span>
        </div>

        <div style={{ flex: 1 }} />

        {profile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <div className="font-shippori" style={{ fontSize: 13, color: 'var(--gold-pale)' }}>
                {profile.display_name || profile.email?.split('@')[0]}
              </div>
              <div style={{ fontSize: 11, color: PLAN_COLOR[profile.plan] ?? PLAN_COLOR.free }}>
                {PLAN_LABEL[profile.plan] ?? '無料'}プラン
                {profile.plan === 'free' && ` (残り${profile.free_msgs_left}通)`}
              </div>
            </div>
            <button onClick={handleLogout} className="btn-ghost" style={{ padding: '6px 14px', borderRadius: 10, fontSize: 12 }}>
              ログアウト
            </button>
          </div>
        )}
      </header>

      {/* メインコンテンツ */}
      <main style={{ position: 'relative', zIndex: 1, padding: '2rem 1.5rem 4rem', maxWidth: 1000, margin: '0 auto' }}>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12, color: 'rgba(201,168,76,0.5)' }}>
            <div style={{ width: 24, height: 24, border: '2px solid rgba(201,168,76,0.2)', borderTopColor: 'rgba(201,168,76,0.7)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span className="font-shippori" style={{ fontSize: 14 }}>星の声を聞いています…</span>
          </div>
        ) : (
          <>
            {/* ページタイトル */}
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h1 className="font-cormorant" style={{ fontSize: 40, color: 'var(--gold-pale)', marginBottom: 8, letterSpacing: '0.04em' }}>
                占い師を選ぶ
              </h1>
              <p className="font-shippori" style={{ fontSize: 14, color: 'rgba(245,230,184,0.5)' }}>
                気になる占い師を選んで、今すぐ相談を始めましょう
              </p>
            </div>

            {/* オンライン中の占い師 */}
            {onlineTellers.length > 0 && (
              <section style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e', display: 'inline-block', animation: 'blink 2s ease-in-out infinite' }} />
                  <h2 className="font-shippori" style={{ fontSize: 18, color: 'var(--gold)', fontWeight: 600 }}>
                    今すぐ相談できる占い師
                  </h2>
                  <span style={{ fontSize: 12, color: 'rgba(34,197,94,0.7)', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', padding: '2px 10px', borderRadius: 20 }}>
                    {onlineTellers.length}名オンライン
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  {onlineTellers.map((teller) => (
                    <TellerCard key={teller.id} teller={teller} onClick={() => router.push(`/chat/${teller.id}`)} priority />
                  ))}
                </div>
              </section>
            )}

            {/* 全占い師 */}
            <section>
              <h2 className="font-shippori" style={{ fontSize: 16, color: 'rgba(245,230,184,0.5)', fontWeight: 500, marginBottom: '1.25rem', letterSpacing: '0.1em' }}>
                {onlineTellers.length > 0 ? '全ての占い師' : '占い師一覧'}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                {tellers.map((teller) => (
                  <TellerCard key={teller.id} teller={teller} onClick={() => router.push(`/chat/${teller.id}`)} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function TellerCard({ teller, onClick, priority }: { teller: Teller; onClick: () => void; priority?: boolean }) {
  return (
    <div
      onClick={onClick}
      className={`teller-hero-card ${teller.is_online ? 'online' : ''}`}
      style={{ padding: priority ? '1.75rem' : '1.25rem' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        {/* アバター */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: priority ? 72 : 60, height: priority ? 72 : 60,
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: priority ? 30 : 24,
            background: 'linear-gradient(135deg, rgba(45,27,105,0.95), rgba(107,63,160,0.7))',
            border: `1.5px solid ${teller.is_online ? 'rgba(34,197,94,0.4)' : 'rgba(201,168,76,0.3)'}`,
            boxShadow: teller.is_online ? '0 0 20px rgba(34,197,94,0.15)' : '0 0 15px rgba(201,168,76,0.1)',
          }}>
            {teller.emoji}
          </div>
          {/* オンラインドット */}
          <span style={{
            position: 'absolute', bottom: 1, right: 1,
            width: 12, height: 12, borderRadius: '50%',
            background: teller.is_online ? '#22c55e' : '#444',
            border: '2px solid var(--void)',
            boxShadow: teller.is_online ? '0 0 6px #22c55e' : 'none',
            display: 'block',
          }} />
        </div>

        {/* 情報 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span className="font-shippori" style={{ fontWeight: 600, fontSize: priority ? 17 : 15, color: 'var(--gold-pale)' }}>
              {teller.name}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(201,168,76,0.65)', flexShrink: 0, marginLeft: 8 }}>
              ★ {teller.rating}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(245,230,184,0.5)', marginBottom: 6 }}>{teller.specialty}</div>
          {priority && teller.bio && (
            <div style={{ fontSize: 12, color: 'rgba(245,230,184,0.4)', lineHeight: 1.6, marginBottom: 8 }}>
              {teller.bio}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: teller.is_online ? '#4ade80' : '#666' }}>
              {teller.is_online ? '● 今すぐ相談可' : '○ 24時間以内に返信'}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(245,230,184,0.35)' }}>
              {teller.review_count.toLocaleString()}件
            </span>
          </div>
        </div>
      </div>

      {/* 相談ボタン */}
      {priority && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(201,168,76,0.12)', textAlign: 'right' }}>
          <span className="font-shippori" style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 600 }}>
            相談を始める →
          </span>
        </div>
      )}
    </div>
  );
}
