'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Teller, UserProfile, Message } from '@/types';
import LandingPage from '@/components/user/LandingPage';
import SubscriptionPanel from '@/components/user/SubscriptionPanel';

/* ──────────── 定数 ──────────── */
const WELCOME_PREFIX = '__welcome__';

const STARTERS = [
  { emoji: '🌹', text: '恋愛・結婚について相談したい' },
  { emoji: '💼', text: '仕事・キャリアの悩みがあります' },
  { emoji: '👨‍👩‍👧', text: '家族・人間関係について聞きたい' },
  { emoji: '✨', text: '今後の運勢を知りたい' },
  { emoji: '🌙', text: '夢や不思議な体験を鑑定してほしい' },
  { emoji: '💕', text: '復縁・片思いについて' },
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

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

/* ──────────── メインコンポーネント ──────────── */
export default function ChatPage() {
  const params   = useParams();
  const router   = useRouter();
  const tellerId = params.tellerId as string;

  const [teller,       setTeller]       = useState<Teller | null>(null);
  const [profile,      setProfile]      = useState<UserProfile | null>(null);
  const [userId,       setUserId]       = useState<string | null>(null);
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [threadId,     setThreadId]     = useState<string | null>(null);
  const [input,        setInput]        = useState('');
  const [sending,      setSending]      = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [showAuth,     setShowAuth]     = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);

  const bottomRef     = useRef<HTMLDivElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const supabase      = createClient();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  /* ──── 初期化 ──── */
  useEffect(() => {
    async function init() {
      setLoading(true);

      const [{ data: tellerData }, { data: { session } }] = await Promise.all([
        supabase.from('tellers').select('*').eq('id', tellerId).single(),
        supabase.auth.getSession(),
      ]);

      if (tellerData) setTeller(tellerData);

      if (!session) { setLoading(false); setShowAuth(true); return; }

      setUserId(session.user.id);

      const { data: profileData } = await supabase
        .from('user_profiles').select('*').eq('id', session.user.id).single();
      if (profileData) setProfile(profileData);

      // スレッド取得または作成
      let { data: thread } = await supabase
        .from('threads').select('id').eq('user_id', session.user.id).eq('teller_id', tellerId).single();

      if (!thread) {
        const { data: newThread } = await supabase
          .from('threads').insert({ user_id: session.user.id, teller_id: tellerId }).select('id').single();
        thread = newThread;
      }

      if (thread) {
        setThreadId(thread.id);
        const { data: msgs } = await supabase
          .from('messages').select('*').eq('thread_id', thread.id).order('created_at', { ascending: true });
        if (msgs) setMessages(msgs);
      }

      setLoading(false);
    }
    init();

    // Auth変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        setShowAuth(false);
        const { data } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single();
        if (data) setProfile(data);
        // ページをリロードして完全初期化
        if (event === 'SIGNED_IN') window.location.reload();
      } else {
        setUserId(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [tellerId]);

  /* ──── テラーステータスのリアルタイム更新 ──── */
  useEffect(() => {
    if (!tellerId) return;
    const ch = supabase
      .channel(`teller-status:${tellerId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tellers', filter: `id=eq.${tellerId}` },
        (payload) => setTeller((prev) => prev ? { ...prev, ...payload.new } : prev))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tellerId]);

  /* ──── メッセージのリアルタイム更新 ──── */
  useEffect(() => {
    if (!threadId) return;
    const ch = supabase
      .channel(`thread:${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        if (newMsg.role === 'fortune') playNotify();
        scrollToBottom();
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}`,
      }, (payload) => {
        const updated = payload.new as Message;
        setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [threadId]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  function playNotify() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 528;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.2);
    } catch (_) {}
  }

  /* ──── メッセージ送信 ──── */
  async function sendMessage(content?: string) {
    const text = (content ?? input).trim();
    if (!text || sending) return;

    if (!userId) { setShowAuth(true); return; }

    const freeMsgsLeft = profile?.free_msgs_left ?? 0;
    if (profile?.plan === 'free' && freeMsgsLeft <= 0) {
      setShowSubscribe(true); return;
    }

    setSending(true);
    if (!content) setInput('');

    try {
      let tid = threadId;
      if (!tid) {
        const { data } = await supabase.from('threads')
          .insert({ user_id: userId, teller_id: tellerId }).select('id').single();
        tid = data?.id ?? null;
        if (tid) setThreadId(tid);
      }
      if (!tid) return;

      const { data: msg } = await supabase.from('messages')
        .insert({ thread_id: tid, role: 'user', content: text }).select('*').single();
      if (msg) setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);

      if (profile?.plan === 'free') {
        await supabase.from('user_profiles')
          .update({ free_msgs_left: Math.max(0, freeMsgsLeft - 1) }).eq('id', userId);
        setProfile((prev) => prev ? { ...prev, free_msgs_left: Math.max(0, freeMsgsLeft - 1) } : prev);
      }
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  /* ──── ペイウォール / 認証チェック ──── */
  const canSend = !!userId && (profile?.plan !== 'free' || (profile?.free_msgs_left ?? 0) > 0);
  const freeMsgsLeft = profile?.free_msgs_left ?? 0;

  /* ──── メッセージの日付グループ ──── */
  const groups: { date: string; msgs: Message[] }[] = [];
  messages.forEach((msg) => {
    const date = formatDate(msg.created_at);
    const last = groups[groups.length - 1];
    if (!last || last.date !== date) groups.push({ date, msgs: [msg] });
    else last.msgs.push(msg);
  });

  /* ──── ローディング ──── */
  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--void)' }}>
        <AuroraBg />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16, filter: 'drop-shadow(0 0 20px rgba(201,168,76,0.6))' }}>✦</div>
          <div className="font-shippori" style={{ fontSize: 14, color: 'rgba(201,168,76,0.6)' }}>星の声を聞いています…</div>
        </div>
      </div>
    );
  }

  /* ──── 認証モーダル ──── */
  if (showAuth) {
    return <LandingPage onDismiss={() => setShowAuth(false)} />;
  }

  if (!teller) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--void)' }}>
        <AuroraBg />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <p style={{ color: 'rgba(245,230,184,0.5)' }}>占い師が見つかりませんでした</p>
          <button onClick={() => router.push('/tellers')} className="btn-ghost" style={{ marginTop: 16, padding: '8px 20px', borderRadius: 10, fontSize: 13 }}>
            ← 占い師一覧へ
          </button>
        </div>
      </div>
    );
  }

  /* ──── メインUI ──── */
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', background: 'var(--void)' }}>
      <AuroraBg />

      {/* サブスクモーダル */}
      {showSubscribe && (
        <SubscriptionPanel profile={profile} onClose={() => setShowSubscribe(false)} />
      )}

      {/* ヘッダー */}
      <header className="page-header" style={{ flexShrink: 0, position: 'relative', zIndex: 10 }}>
        {/* 戻るボタン */}
        <button onClick={() => router.push('/tellers')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,230,184,0.5)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, flexShrink: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold-pale)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(245,230,184,0.5)')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          占い師一覧
        </button>

        {/* テラー情報 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center', minWidth: 0 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(45,27,105,0.95), rgba(107,63,160,0.7))',
            border: '1.5px solid rgba(201,168,76,0.45)',
          }}>
            {teller.emoji}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="font-shippori" style={{ fontWeight: 600, color: 'var(--gold-pale)', fontSize: 15 }}>{teller.name}</span>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: teller.is_online ? '#22c55e' : '#555', boxShadow: teller.is_online ? '0 0 5px #22c55e' : 'none', display: 'inline-block', flexShrink: 0 }} />
            </div>
            <div style={{ fontSize: 11, color: 'rgba(245,230,184,0.4)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{teller.specialty}</span>
              <span>·</span>
              <span style={{ color: teller.is_online ? 'rgba(74,222,128,0.8)' : 'rgba(100,100,120,0.8)' }}>
                {teller.is_online ? '今すぐ相談可' : '24時間以内に返信'}
              </span>
            </div>
          </div>
        </div>

        {/* 無料残数 */}
        <div style={{ flexShrink: 0, minWidth: 80, textAlign: 'right' }}>
          {profile?.plan === 'free' && (
            <>
              <div style={{ fontSize: 11, color: 'rgba(245,230,184,0.4)', marginBottom: 3 }}>残り{freeMsgsLeft}通</div>
              <div style={{ width: 60, height: 3, background: 'rgba(201,168,76,0.12)', borderRadius: 2, overflow: 'hidden', marginLeft: 'auto' }}>
                <div style={{ height: '100%', width: `${(freeMsgsLeft / 3) * 100}%`, background: 'linear-gradient(90deg, rgba(201,168,76,0.5), var(--gold))' }} />
              </div>
            </>
          )}
        </div>
      </header>

      {/* メッセージエリア */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1rem', position: 'relative', zIndex: 1 }}>

        {/* ウェルカム＋スターター（メッセージが0件の時） */}
        {messages.length === 0 && !loading && (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            {/* ウェルカムカード */}
            <div className="system-message" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  background: 'linear-gradient(135deg, rgba(45,27,105,0.95), rgba(107,63,160,0.7))',
                  border: '1px solid rgba(201,168,76,0.35)',
                }}>
                  {teller.emoji}
                </div>
                <div>
                  <div className="font-shippori" style={{ fontSize: 14, color: 'var(--gold-pale)', fontWeight: 600 }}>{teller.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(245,230,184,0.4)' }}>{teller.specialty}</div>
                </div>
              </div>
              <p className="font-noto" style={{ fontSize: 14, color: 'rgba(245,230,184,0.8)', lineHeight: 1.8 }}>
                こんにちは。{teller.name}です。<br />
                どのようなお悩みでも、遠慮なく打ち明けてください。<br />
                あなたのことを大切にしながら、丁寧に鑑定いたします。✨
              </p>
            </div>

            {/* スターター */}
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <p style={{ fontSize: 12, color: 'rgba(245,230,184,0.4)', marginBottom: 12 }}>
                どんなことでご相談されますか？
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {STARTERS.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => { if (canSend) sendMessage(s.text); else if (!userId) setShowAuth(true); else setShowSubscribe(true); }}
                    className="starter-chip"
                  >
                    <span>{s.emoji}</span>
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* メッセージ一覧 */}
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {groups.map((group) => (
            <div key={group.date}>
              {/* 日付区切り */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 16px' }}>
                <div className="divider-gold" style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: 'rgba(245,230,184,0.3)', flexShrink: 0 }}>{group.date}</span>
                <div className="divider-gold" style={{ flex: 1 }} />
              </div>

              {group.msgs.map((msg) => (
                <MessageRow key={msg.id} msg={msg} teller={teller} />
              ))}
            </div>
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* ペイウォール */}
      {!canSend && userId && (
        <div style={{ position: 'relative', zIndex: 10, padding: '12px 16px', textAlign: 'center', background: 'rgba(6,3,15,0.9)', borderTop: '1px solid rgba(155,79,107,0.2)' }}>
          <p className="font-shippori" style={{ fontSize: 13, color: 'rgba(245,230,184,0.65)', marginBottom: 8 }}>
            無料メッセージ（3通）を使い切りました
          </p>
          <button onClick={() => setShowSubscribe(true)} className="btn-gold" style={{ padding: '10px 28px', borderRadius: 50, fontSize: 13 }}>
            ✨ プランに加入して続ける
          </button>
        </div>
      )}

      {/* 入力エリア */}
      <div className="chat-input-area" style={{ flexShrink: 0, padding: '12px 16px', position: 'relative', zIndex: 5 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!canSend || sending}
            placeholder={
              !userId ? '登録してメッセージを送る…' :
              !canSend ? 'プランに加入してメッセージを続ける…' :
              `${teller.name}へメッセージを送る… (Enterで送信)`
            }
            rows={2}
            className="input-mystical"
            style={{ flex: 1, padding: '12px 16px', borderRadius: 14, resize: 'none', fontSize: 14, lineHeight: 1.6, maxHeight: 120 }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || !canSend || sending}
            className="btn-send"
            style={{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            {sending
              ? <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/></svg>
            }
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(245,230,184,0.2)', marginTop: 6, maxWidth: 720, margin: '6px auto 0' }}>
          Shift+Enterで改行 · Enterで送信
        </p>
      </div>

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

/* ──────────── メッセージ行 ──────────── */
function MessageRow({ msg, teller }: { msg: Message; teller: Teller }) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, animation: 'slideInRight 0.25s ease forwards' }}>
        <div style={{ maxWidth: '75%' }}>
          <div className="bubble-user" style={{ padding: '10px 16px', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'rgba(245,230,184,0.92)' }}>
            {msg.content}
          </div>
          <div style={{ textAlign: 'right', marginTop: 4, fontSize: 11, color: 'rgba(245,230,184,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
            <span>{formatTime(msg.created_at)}</span>
            {!msg.is_read
              ? <span style={{ color: 'rgba(201,168,76,0.5)' }}>送信済み</span>
              : <span style={{ color: 'rgba(34,197,94,0.5)' }}>既読</span>
            }
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12, animation: 'slideInLeft 0.25s ease forwards' }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0,
        background: 'linear-gradient(135deg, rgba(45,27,105,0.95), rgba(107,63,160,0.7))',
        border: '1px solid rgba(201,168,76,0.4)',
      }}>
        {teller.emoji}
      </div>
      <div style={{ maxWidth: '75%' }}>
        <div style={{ fontSize: 11, color: 'rgba(201,168,76,0.55)', marginBottom: 4 }} className="font-shippori">{teller.name}</div>
        <div className="bubble-fortune" style={{ padding: '10px 16px', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'rgba(245,230,184,0.92)' }}>
          {msg.content}
        </div>
        <div style={{ marginTop: 4, fontSize: 11, color: 'rgba(245,230,184,0.3)' }}>
          {formatTime(msg.created_at)}
        </div>
      </div>
    </div>
  );
}
