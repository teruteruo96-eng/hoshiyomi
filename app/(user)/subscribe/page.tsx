'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserProfile } from '@/types';
import SubscriptionPanel from '@/components/user/SubscriptionPanel';

function AuroraBg() {
  return (
    <div className="aurora-bg">
      <div className="aurora-orb" />
      <div className="aurora-orb" />
      <div className="aurora-orb" />
    </div>
  );
}

function SubscribeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      if (searchParams.get('session_id')) setSuccess(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('user_profiles').select('*').eq('id', session.user.id).single();
        if (data) setProfile(data);
      }
      setLoading(false);
    }
    init();
  }, []);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AuroraBg />
        <div style={{ position: 'relative', zIndex: 1, fontSize: 36, filter: 'drop-shadow(0 0 20px rgba(201,168,76,0.6))' }}>✦</div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <AuroraBg />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 480 }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>✨</div>
          <h1 className="font-cormorant text-gold-gradient" style={{ fontSize: 36, marginBottom: 16 }}>
            ご加入ありがとうございます
          </h1>
          <p className="font-shippori" style={{ color: 'rgba(245,230,184,0.7)', marginBottom: 32, lineHeight: 1.8 }}>
            プランへの加入が完了しました。<br />
            占い師との会話を始めましょう。
          </p>
          <button onClick={() => router.push('/tellers')} className="btn-gold"
            style={{ padding: '14px 36px', borderRadius: 50, fontSize: 15 }}>
            占い師を選ぶ →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <AuroraBg />
      <SubscriptionPanel profile={profile} onClose={() => router.push('/tellers')} />
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--void)' }}>
        <div style={{ fontSize: 36, filter: 'drop-shadow(0 0 20px rgba(201,168,76,0.6))' }}>✦</div>
      </div>
    }>
      <SubscribeContent />
    </Suspense>
  );
}
