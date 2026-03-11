'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import LandingPage from '@/components/user/LandingPage';

export default function HomePage() {
  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/tellers');
    });
  }, []);

  return <LandingPage />;
}
