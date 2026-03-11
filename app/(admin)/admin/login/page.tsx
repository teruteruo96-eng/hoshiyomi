'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // すでにログイン済みなら管理者ダッシュボードへ
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) checkAdminAndRedirect(session.user.email ?? '');
    });
  }, []);

  async function checkAdminAndRedirect(email: string) {
    const res = await fetch('/api/admin/status', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      router.push('/admin/dashboard');
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('メールアドレスまたはパスワードが違います');
      setLoading(false);
      return;
    }

    // 管理者権限チェック
    const adminMap: Record<string, string> = JSON.parse(
      process.env.NEXT_PUBLIC_ADMIN_TELLER_MAP || '{}'
    );
    const tellerId = adminMap[email];
    if (!tellerId) {
      await supabase.auth.signOut();
      setError('管理者権限がありません');
      setLoading(false);
      return;
    }

    // セッションストレージに占い師IDを保存
    sessionStorage.setItem('admin_teller_id', tellerId);
    router.push('/admin/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--void)', position: 'relative' }}>
      <div className="aurora-bg">
        <div className="aurora-orb" />
        <div className="aurora-orb" />
        <div className="aurora-orb" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="font-cormorant text-5xl text-shimmer mb-1 tracking-wider">HOSHIYOMI</div>
          <p className="font-shippori text-gold/50 tracking-widest text-xs">占 い 師 ポ ー タ ル</p>
        </div>

        <div className="glass-dark rounded-2xl p-8 gold-glow">
          <h2 className="font-shippori text-xl font-semibold text-gold-pale mb-1">
            占い師ログイン
          </h2>
          <p className="text-xs text-gold-pale/40 mb-6">管理者アカウントでログインしてください</p>

          {error && (
            <div className="bg-red-900/30 border border-red-500/40 text-red-300 text-xs p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-gold-pale/60 mb-1 font-shippori">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input-mystical w-full px-4 py-3 rounded-lg text-sm"
                placeholder="mika@hoshiyomi.jp"
              />
            </div>
            <div>
              <label className="block text-xs text-gold-pale/60 mb-1 font-shippori">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="input-mystical w-full px-4 py-3 rounded-lg text-sm"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full py-3 rounded-lg text-sm mt-2"
            >
              {loading ? 'ログイン中…' : 'ログイン'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gold-pale/20 mt-6">
          HOSHIYOMI 星詠み 管理システム
        </p>
      </div>
    </div>
  );
}
