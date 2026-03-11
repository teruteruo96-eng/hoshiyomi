'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Message } from '@/types';
import { QUICK_REPLIES } from '@/types';

interface ThreadWithMessages {
  id: string;
  user_id: string;
  created_at: string;
  user_profiles: {
    id: string;
    display_name: string | null;
    email: string;
    plan: string;
    free_msgs_left: number;
  } | null;
  messages: Message[];
}

interface ReplyPaneProps {
  thread: ThreadWithMessages;
  tellerEmoji: string;
  tellerName: string;
  onReplySent: () => void;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

const planLabels: Record<string, { label: string; color: string }> = {
  free:     { label: '無料',           color: 'text-gold-pale/40' },
  light:    { label: 'ライト',         color: 'text-gold/70' },
  standard: { label: 'スタンダード',   color: 'text-gold' },
  premium:  { label: 'プレミアム',     color: 'text-gold-light' },
};

export default function ReplyPane({ thread, tellerEmoji, tellerName, onReplySent }: ReplyPaneProps) {
  const [messages, setMessages] = useState<Message[]>(thread.messages);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // スレッドが変わったらメッセージを更新
  useEffect(() => {
    setMessages(thread.messages);
    setReplyText('');
  }, [thread.id]);

  // リアルタイム購読
  useEffect(() => {
    const channel = supabase
      .channel(`admin-thread:${thread.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${thread.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [thread.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendReply() {
    const content = replyText.trim();
    if (!content || sending) return;

    setSending(true);
    setReplyText('');

    // 1. 占い師メッセージを保存 (サービスロールはAPIルート経由で行う)
    const { error } = await supabase.from('messages').insert({
      thread_id: thread.id,
      role: 'fortune',
      content,
    });

    if (!error) {
      // 2. ユーザーの未読メッセージを既読にする
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('thread_id', thread.id)
        .eq('role', 'user')
        .eq('is_read', false);

      onReplySent();
    }

    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendReply();
    }
  }

  const profile = thread.user_profiles;
  const plan = profile?.plan ?? 'free';
  const planInfo = planLabels[plan] ?? planLabels.free;
  const userMsgCount = messages.filter((m) => m.role === 'user').length;

  // 日付グループ化
  const groups: { date: string; msgs: Message[] }[] = [];
  messages.forEach((msg) => {
    const date = formatDate(msg.created_at);
    const last = groups[groups.length - 1];
    if (!last || last.date !== date) {
      groups.push({ date, msgs: [msg] });
    } else {
      last.msgs.push(msg);
    }
  });

  return (
    <div className="flex flex-col h-full">
      {/* ユーザー情報ヘッダー */}
      <div className="flex-shrink-0 glass-dark border-b border-gold/10 px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo/50 border border-gold/30 flex items-center justify-center text-lg">
              👤
            </div>
            <div>
              <div className="font-shippori font-semibold text-gold-pale">
                {profile?.display_name || profile?.email?.split('@')[0] || '不明なユーザー'}
              </div>
              <div className="text-xs text-gold-pale/40">{profile?.email}</div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xs font-shippori font-semibold ${planInfo.color}`}>
              {planInfo.label}プラン
            </div>
            <div className="text-xs text-gold-pale/30 mt-0.5">送信 {userMsgCount} 件</div>
          </div>
        </div>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {groups.map((group) => (
          <div key={group.date}>
            <div className="flex items-center gap-3 my-4">
              <div className="divider-gold flex-1" />
              <span className="text-xs text-gold-pale/30 flex-shrink-0">{group.date}</span>
              <div className="divider-gold flex-1" />
            </div>
            {group.msgs.map((msg) => (
              <div
                key={msg.id}
                className={`mb-3 flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                {msg.role === 'user' ? (
                  <div className="max-w-[80%]">
                    <div className="bubble-user px-4 py-3 text-sm text-gold-pale/90 leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>
                    <div className="text-xs text-gold-pale/30 mt-1">
                      {formatTime(msg.created_at)}
                      {!msg.is_read && <span className="ml-2 text-rose/60">未読</span>}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[80%]">
                    <div className="flex items-center justify-end gap-1 mb-1">
                      <span className="text-xs text-gold/50 font-shippori">{tellerName}</span>
                      <span>{tellerEmoji}</span>
                    </div>
                    <div className="bubble-fortune px-4 py-3 text-sm text-gold-pale/90 leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>
                    <div className="text-right text-xs text-gold-pale/30 mt-1">
                      {formatTime(msg.created_at)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* クイック返信 + 入力エリア */}
      <div className="flex-shrink-0 glass-dark border-t border-gold/10 p-4">
        {/* クイック返信 */}
        <div className="flex flex-wrap gap-2 mb-3">
          {QUICK_REPLIES.map((reply) => (
            <button
              key={reply}
              onClick={() => setReplyText((prev) => prev ? `${prev}\n${reply}` : reply)}
              className="quick-reply-btn"
            >
              {reply}
            </button>
          ))}
        </div>

        {/* テキストエリア */}
        <div className="flex gap-3 items-end">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            placeholder="返信を入力… (Ctrl+Enterで送信)"
            rows={3}
            className="input-mystical flex-1 px-4 py-3 rounded-xl resize-none text-sm leading-relaxed"
          />
          <button
            onClick={sendReply}
            disabled={!replyText.trim() || sending}
            className="btn-send px-5 py-3 rounded-xl text-sm font-shippori font-semibold flex items-center gap-2 flex-shrink-0"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>送信</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M22 2L11 13" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gold-pale/20 mt-1">Ctrl+Enter で送信</p>
      </div>
    </div>
  );
}
