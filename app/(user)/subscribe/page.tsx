'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserProfile } from '@/types';
import StarBackground from '@/components/user/StarBackground';
import SubscriptionPanel from '@/components/user/SubscriptionPanel';

export default function SubscribePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const sessionId = searchParams.get('session_id');
      if (sessionId) {
        setSuccess(true);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (data) setProfile(data);
      }
      setLoading(false);
    }
    init();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <StarBackground />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <StarBackground />
        <div className="relative z-10 text-center max-w-md">
          <div className="text-6xl mb-6">✨</div>
          <h1 className="font-cormorant text-4xl text-gold-gradient mb-4">
            ご加入ありがとうございます
          </h1>
          <p className="text-gold-pale/70 mb-8 font-shippori">
            プランへの加入が完了しました。<br />
            占い師との会話を始めましょう。
          </p>
          <button
            onClick={() => router.push('/')}
            className="btn-gold px-8 py-3 rounded-full"
          >
            占い師を選ぶ →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <StarBackground />
      <SubscriptionPanel profile={profile} onClose={() => router.push('/')} />
    </div>
  );
}
