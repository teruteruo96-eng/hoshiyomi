'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface LandingPageProps {
  onDismiss?: () => void;
}

interface TellerPreview {
  id: string;
  name: string;
  emoji: string;
  specialty: string;
  is_online: boolean;
  rating: number;
  review_count: number;
  bio: string;
}

const FALLBACK_TELLERS: TellerPreview[] = [
  { id: 'mika', name: '美花', emoji: '🔮', specialty: 'タロット・霊視', is_online: true, rating: 4.9, review_count: 1248, bio: '10年以上の鑑定歴。魂の声を聞き、あなたの真実を導きます。' },
  { id: 't2',   name: '蓮華', emoji: '🌙', specialty: '星座・四柱推命', is_online: false, rating: 4.8, review_count: 876,  bio: '星の動きと生年月日から、あなたの宿命を読み解きます。' },
  { id: 't3',   name: '紫苑', emoji: '✨', specialty: '水晶・夢占い',   is_online: true,  rating: 4.7, review_count: 634,  bio: '水晶の輝きに映る未来。夢のメッセージも丁寧に解読します。' },
];

function AuroraBg() {
  return (
    <div className="aurora-bg">
      <div className="aurora-orb" />
      <div className="aurora-orb" />
      <div className="aurora-orb" />
    </div>
  );
}

type Mode = 'landing' | 'login' | 'register';

export default function LandingPage({ onDismiss }: LandingPageProps) {
  const [mode, setMode] = useState<Mode>('landing');
  const [tellers, setTellers] = useState<TellerPreview[]>(FALLBACK_TELLERS);

  // Registration fields
  const [regName,  setRegName]  = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass,  setRegPass]  = useState('');
  const [regBirth, setRegBirth] = useState('');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass,  setLoginPass]  = useState('');

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const supabase = createClient();
  const router   = useRouter();

  useEffect(() => {
    supabase.from('tellers').select('id,name,emoji,specialty,is_online,rating,review_count,bio').order('name')
      .then(({ data }) => { if (data && data.length > 0) setTellers(data); });
  }, []);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signUp({
      email: regEmail,
      password: regPass,
      options: { data: { name: regName, birth_date: regBirth } },
    });
    if (err) setError(err.message);
    else setSuccess('確認メールを送信しました。メールをご確認の上、ログインしてください。');
    setLoading(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPass,
    });
    if (err) {
      setError('メールアドレスまたはパスワードが違います');
    } else {
      if (onDismiss) onDismiss();
      else router.push('/tellers');
    }
    setLoading(false);
  }

  const onlineTellers = tellers.filter((t) => t.is_online).length;

  /* ─── ログインモーダル ─── */
  if (mode === 'login') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <AuroraBg />
        <div className="glass-dark fade-in-scale" style={{ borderRadius: 24, padding: '2rem', width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
          <button onClick={() => setMode('landing')} style={{ fontSize: 12, color: 'rgba(245,230,184,0.35)', marginBottom: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            ← 戻る
          </button>
          <h2 className="font-cormorant text-gold-gradient" style={{ fontSize: 28, textAlign: 'center', marginBottom: 6 }}>
            星詠みにログイン
          </h2>
          <p className="font-shippori" style={{ textAlign: 'center', fontSize: 13, color: 'rgba(245,230,184,0.5)', marginBottom: 28 }}>
            占い師との会話を再開しましょう
          </p>

          {error && (
            <div style={{ background: 'rgba(155,79,107,0.15)', border: '1px solid rgba(155,79,107,0.4)', color: '#d4789a', fontSize: 13, padding: '10px 14px', borderRadius: 12, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="font-shippori" style={{ display: 'block', fontSize: 11, color: 'rgba(245,230,184,0.5)', marginBottom: 6 }}>メールアドレス</label>
              <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required
                className="input-mystical" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 14 }}
                placeholder="your@email.com" />
            </div>
            <div>
              <label className="font-shippori" style={{ display: 'block', fontSize: 11, color: 'rgba(245,230,184,0.5)', marginBottom: 6 }}>パスワード</label>
              <input type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} required
                className="input-mystical" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 14 }}
                placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} className="btn-gold" style={{ width: '100%', padding: '14px', borderRadius: 12, fontSize: 14 }}>
              {loading ? '確認中…' : 'ログイン'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(245,230,184,0.4)', marginTop: 20 }}>
            アカウントをお持ちでない方は{' '}
            <button onClick={() => setMode('register')} style={{ color: 'var(--gold)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>
              新規登録
            </button>
          </p>
        </div>
      </div>
    );
  }

  /* ─── 登録モーダル ─── */
  if (mode === 'register') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
        <AuroraBg />
        <div className="glass-dark fade-in-scale" style={{ borderRadius: 24, padding: '2rem', width: '100%', maxWidth: 420, position: 'relative', zIndex: 1, margin: 'auto' }}>
          <button onClick={() => setMode('landing')} style={{ fontSize: 12, color: 'rgba(245,230,184,0.35)', marginBottom: '1.25rem', background: 'none', border: 'none', cursor: 'pointer' }}>
            ← 戻る
          </button>
          <h2 className="font-cormorant text-gold-gradient" style={{ fontSize: 28, textAlign: 'center', marginBottom: 6 }}>
            無料で始める
          </h2>
          <p className="font-shippori" style={{ textAlign: 'center', fontSize: 13, color: 'rgba(245,230,184,0.5)', marginBottom: 28 }}>
            まずは3通のメッセージが無料です
          </p>

          {error && (
            <div style={{ background: 'rgba(155,79,107,0.15)', border: '1px solid rgba(155,79,107,0.4)', color: '#d4789a', fontSize: 13, padding: '10px 14px', borderRadius: 12, marginBottom: 16 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac', fontSize: 13, padding: '16px', borderRadius: 12, marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📬</div>
              {success}
              <br />
              <button onClick={() => setMode('login')} style={{ color: 'var(--gold)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', marginTop: 8 }}>
                ログインへ →
              </button>
            </div>
          )}

          {!success && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="font-shippori" style={{ display: 'block', fontSize: 11, color: 'rgba(245,230,184,0.5)', marginBottom: 6 }}>お名前（ニックネーム可）</label>
                <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} required
                  className="input-mystical" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 14 }}
                  placeholder="星見 太郎" />
              </div>
              <div>
                <label className="font-shippori" style={{ display: 'block', fontSize: 11, color: 'rgba(245,230,184,0.5)', marginBottom: 6 }}>メールアドレス</label>
                <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required
                  className="input-mystical" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 14 }}
                  placeholder="your@email.com" />
              </div>
              <div>
                <label className="font-shippori" style={{ display: 'block', fontSize: 11, color: 'rgba(245,230,184,0.5)', marginBottom: 6 }}>パスワード（8文字以上）</label>
                <input type="password" value={regPass} onChange={(e) => setRegPass(e.target.value)} required minLength={8}
                  className="input-mystical" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 14 }}
                  placeholder="••••••••" />
              </div>
              <div>
                <label className="font-shippori" style={{ display: 'block', fontSize: 11, color: 'rgba(245,230,184,0.5)', marginBottom: 6 }}>
                  生年月日 <span style={{ color: 'rgba(201,168,76,0.6)' }}>（占いの精度向上のため）</span>
                </label>
                <input type="date" value={regBirth} onChange={(e) => setRegBirth(e.target.value)} required
                  className="input-mystical" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 14, colorScheme: 'dark' }} />
              </div>
              <button type="submit" disabled={loading} className="btn-gold" style={{ width: '100%', padding: '14px', borderRadius: 12, fontSize: 14 }}>
                {loading ? '登録中…' : '✨ 無料で登録する'}
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(245,230,184,0.4)', marginTop: 20 }}>
            すでにアカウントをお持ちの方は{' '}
            <button onClick={() => setMode('login')} style={{ color: 'var(--gold)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>
              ログイン
            </button>
          </p>
        </div>
      </div>
    );
  }

  /* ─── ランディング ─── */
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, overflowY: 'auto' }}>
      <AuroraBg />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 1.5rem 5rem', minHeight: '100%' }}>

        {/* ヒーロー */}
        <div style={{ textAlign: 'center', marginBottom: '4rem', maxWidth: 640 }}>
          <div className="animate-float" style={{ fontSize: 72, marginBottom: 20, filter: 'drop-shadow(0 0 30px rgba(201,168,76,0.7))' }}>
            ✦
          </div>
          <h1 className="font-cormorant text-shimmer" style={{ fontSize: 'clamp(48px, 8vw, 80px)', marginBottom: 8, letterSpacing: '0.08em' }}>
            HOSHIYOMI
          </h1>
          <p className="font-shippori" style={{ fontSize: 18, color: 'rgba(201,168,76,0.7)', letterSpacing: '0.4em', marginBottom: 24 }}>
            星 詠 み
          </p>
          <p className="font-cormorant" style={{ fontSize: 'clamp(18px, 3vw, 26px)', color: 'rgba(245,230,184,0.85)', fontStyle: 'italic', marginBottom: 12, lineHeight: 1.5 }}>
            "The stars guide those who dare to ask."
          </p>
          <p className="font-noto" style={{ fontSize: 14, color: 'rgba(245,230,184,0.55)', marginBottom: 36, lineHeight: 1.8 }}>
            本物の占い師が、あなたの運命を読み解きます。<br />
            タロット・星座・霊視・四柱推命・水晶占い
          </p>

          {/* CTA */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 20 }}>
            <button onClick={() => setMode('register')} className="btn-gold" style={{ padding: '14px 36px', borderRadius: 50, fontSize: 16 }}>
              ✨ 無料で占いを始める
            </button>
            <button onClick={() => setMode('login')} className="btn-ghost" style={{ padding: '14px 28px', borderRadius: 50, fontSize: 14 }}>
              ログイン
            </button>
          </div>

          {onDismiss && (
            <button onClick={onDismiss} style={{ fontSize: 12, color: 'rgba(245,230,184,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}>
              まずは見てみる（登録なし・3通まで無料）→
            </button>
          )}
        </div>

        {/* 占い師プレビュー */}
        <div style={{ width: '100%', maxWidth: 860, marginBottom: '3rem' }}>
          <p className="font-shippori" style={{ textAlign: 'center', fontSize: 11, color: 'rgba(201,168,76,0.5)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 20 }}>
            在籍占い師
          </p>
          <div className="hsy-grid-3">
            {tellers.slice(0, 3).map((teller) => (
              <div
                key={teller.id}
                className={`teller-hero-card ${teller.is_online ? 'online' : ''}`}
                onClick={() => setMode('register')}
                style={{ padding: '1.5rem', textAlign: 'center' }}
              >
                <div style={{
                  width: 68, height: 68, borderRadius: '50%', margin: '0 auto 12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                  background: 'linear-gradient(135deg, rgba(45,27,105,0.95), rgba(107,63,160,0.7))',
                  border: '1.5px solid rgba(201,168,76,0.4)',
                  boxShadow: teller.is_online ? '0 0 20px rgba(34,197,94,0.2)' : '0 0 15px rgba(201,168,76,0.15)',
                }}>
                  {teller.emoji}
                </div>
                <div className="font-shippori" style={{ fontWeight: 600, color: 'var(--gold-pale)', marginBottom: 4 }}>{teller.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(245,230,184,0.45)', marginBottom: 8 }}>{teller.specialty}</div>
                {teller.bio && (
                  <div style={{ fontSize: 11, color: 'rgba(245,230,184,0.35)', marginBottom: 10, lineHeight: 1.6 }}>{teller.bio}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: teller.is_online ? '#22c55e' : '#555',
                    boxShadow: teller.is_online ? '0 0 6px #22c55e' : 'none',
                    display: 'inline-block',
                  }} />
                  <span style={{ fontSize: 11, color: teller.is_online ? '#4ade80' : '#888' }}>
                    {teller.is_online ? 'オンライン' : 'オフライン'}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(201,168,76,0.65)' }}>★ {teller.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ソーシャルプルーフ */}
        <div className="glass" style={{ borderRadius: 20, padding: '16px 40px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2.5rem', marginBottom: '3rem' }}>
          {[
            { value: '★ 4.9', label: '平均評価' },
            { value: `${onlineTellers}名`, label: 'オンライン中' },
            { value: '3,200+', label: '総相談件数' },
            { value: '即返信', label: 'オンライン時' },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div className="font-cormorant" style={{ fontSize: 26, color: 'var(--gold)' }}>{stat.value}</div>
              <div className="font-shippori" style={{ fontSize: 11, color: 'rgba(245,230,184,0.45)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* 特徴 */}
        <div className="hsy-grid-3" style={{ width: '100%', maxWidth: 700 }}>
          {[
            { icon: '🔮', label: '本物の占い師', sub: '厳選された実力派鑑定師' },
            { icon: '⚡', label: 'リアルタイム返信', sub: 'オンライン中は即レスポンス' },
            { icon: '🔒', label: '安心の匿名制', sub: 'プライバシー完全保護' },
          ].map((f) => (
            <div key={f.label} className="glass" style={{ borderRadius: 18, padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
              <div className="font-shippori" style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 600, marginBottom: 4 }}>{f.label}</div>
              <div style={{ fontSize: 11, color: 'rgba(245,230,184,0.45)' }}>{f.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
