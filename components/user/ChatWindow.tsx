'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Message, Teller, UserProfile } from '@/types';
import MessageBubble from './MessageBubble';

interface ChatWindowProps {
  teller: Teller;
  profile: UserProfile | null;
  userId: string | null;
  onShowSubscribe: () => void;
}

export default function ChatWindow({ teller, profile, userId, onShowSubscribe }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // スレッドとメッセージを初期化
  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    async function initThread() {
      setLoading(true);
      let { data: thread } = await supabase
        .from('threads')
        .select('id')
        .eq('user_id', userId)
        .eq('teller_id', teller.id)
        .single();

      if (!thread) {
        const { data } = await supabase
          .from('threads')
          .insert({ user_id: userId, teller_id: teller.id })
          .select('id')
          .single();
        thread = data;
      }

      if (!thread) { setLoading(false); return; }
      setThreadId(thread.id);

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: true });

      if (msgs) setMessages(msgs);
      setLoading(false);
    }

    initThread();
  }, [userId, teller.id]);

  // リアルタイム購読
  useEffect(() => {
    if (!threadId) return;

    const channel = supabase
      .channel(`thread:${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `thread_id=eq.${threadId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (newMsg.role === 'fortune') {
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 528;
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 1.2);
          } catch (_) {}
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `thread_id=eq.${threadId}`,
      }, (payload) => {
        const updated = payload.new as Message;
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [threadId]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  async function sendMessage() {
    const content = input.trim();
    if (!content || sending) return;

    if (!userId) { onShowSubscribe(); return; }

    if (profile?.plan === 'free' && (profile?.free_msgs_left ?? 0) <= 0) {
      onShowSubscribe();
      return;
    }

    setSending(true);
    setInput('');

    try {
      let tid = threadId;
      if (!tid) {
        const { data } = await supabase
          .from('threads')
          .insert({ user_id: userId, teller_id: teller.id })
          .select('id')
          .single();
        tid = data?.id ?? null;
        if (tid) setThreadId(tid);
      }

      if (!tid) { setSending(false); return; }

      const { data: msg } = await supabase
        .from('messages')
        .insert({ thread_id: tid, role: 'user', content })
        .select('*')
        .single();

      if (msg) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }

      if (profile?.plan === 'free') {
        await supabase
          .from('user_profiles')
          .update({ free_msgs_left: (profile.free_msgs_left ?? 1) - 1 })
          .eq('id', userId);
      }
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const canSend = !!userId && (profile?.plan !== 'free' || (profile?.free_msgs_left ?? 0) > 0);
  const freeMsgsLeft = profile?.free_msgs_left ?? 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* ヘッダー */}
      <div className="flex-shrink-0 glass-dark border-b border-gold/10 px-5 py-4">
        <div className="flex items-center gap-3">
          {/* アバター */}
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-2xl flex-shrink-0 animate-float"
            style={{
              background: 'linear-gradient(135deg, rgba(45,27,105,0.95), rgba(107,63,160,0.75))',
              border: '1.5px solid rgba(201,168,76,0.45)',
              boxShadow: '0 0 20px rgba(201,168,76,0.2)',
            }}
          >
            {teller.emoji}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="font-shippori font-semibold text-gold-pale truncate">{teller.name}</h2>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: teller.is_online ? '#22c55e' : '#555',
                    boxShadow: teller.is_online ? '0 0 6px #22c55e' : 'none',
                  }}
                />
                <span className={`text-xs ${teller.is_online ? 'text-green-400' : 'text-gray-500'}`}>
                  {teller.is_online ? 'オンライン' : 'オフライン'}
                </span>
              </div>
            </div>
            <p className="text-xs text-gold-pale/45 truncate">{teller.specialty}</p>
          </div>

          <div className="text-right flex-shrink-0">
            <div className="text-sm text-gold font-shippori">★ {teller.rating}</div>
            <div className="text-xs text-gold-pale/30">({teller.review_count.toLocaleString()}件)</div>
          </div>
        </div>

        {/* ステータスバナー */}
        <div
          className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${
            teller.is_online
              ? 'bg-green-900/15 border border-green-500/20 text-green-400'
              : 'bg-gray-800/25 border border-gray-600/15 text-gray-500'
          }`}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              background: teller.is_online ? '#22c55e' : '#555',
              boxShadow: teller.is_online ? '0 0 4px #22c55e' : 'none',
            }}
          />
          {teller.is_online
            ? 'オンライン中 — すぐに返信が来やすいです'
            : 'オフライン中 — 返答に時間がかかる場合があります（通常24時間以内）'}
        </div>

        {/* 無料残数バー */}
        {userId && profile?.plan === 'free' && (
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1 h-1 bg-gold/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold/60 to-gold transition-all duration-500"
                style={{ width: `${Math.max(0, (freeMsgsLeft / 3) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-gold-pale/40 flex-shrink-0 font-shippori">
              無料残り {freeMsgsLeft} 通
            </span>
          </div>
        )}
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="flex items-center gap-2 text-gold/40 text-sm">
              <div className="w-4 h-4 border-2 border-gold/20 border-t-gold/60 rounded-full animate-spin" />
              読み込み中…
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div
              className="text-6xl mb-5 animate-float"
              style={{ filter: 'drop-shadow(0 0 25px rgba(201,168,76,0.5))' }}
            >
              {teller.emoji}
            </div>
            <p className="font-cormorant text-2xl text-gold/80 mb-2">{teller.name}への相談</p>
            <p className="text-sm text-gold-pale/40 max-w-xs leading-relaxed font-shippori">
              悩みや不安を打ち明けてください。<br />
              {teller.name}が丁寧にお答えします。
            </p>
            {!userId && (
              <button onClick={onShowSubscribe} className="mt-8 btn-gold px-8 py-3 rounded-full text-sm">
                ✨ 無料で始める（3通まで）
              </button>
            )}
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} teller={teller} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* 入力エリア */}
      <div className="flex-shrink-0 glass-dark border-t border-gold/10 p-4">
        {/* ペイウォール */}
        {!canSend && userId && (
          <div className="mb-3 glass rounded-xl p-4 text-center border border-rose/20">
            <p className="text-sm text-gold-pale/65 mb-3 font-shippori">
              無料メッセージを使い切りました
            </p>
            <button onClick={onShowSubscribe} className="btn-gold px-8 py-2.5 rounded-full text-sm">
              ✨ プランに加入して続ける
            </button>
          </div>
        )}

        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!canSend || sending}
            placeholder={
              !userId
                ? '登録してメッセージを送る…'
                : !canSend
                ? 'プランに加入してメッセージを送る…'
                : `${teller.name}へメッセージを送る… (Enterで送信)`
            }
            rows={2}
            className="input-mystical flex-1 px-4 py-3 rounded-xl resize-none text-sm leading-relaxed"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || !canSend || sending}
            className="btn-send w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            aria-label="送信"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M22 2L11 13" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>

        <p className="text-xs text-gold-pale/20 mt-2 text-center">
          Shift+Enterで改行 · Enterで送信
        </p>
      </div>
    </div>
  );
}
