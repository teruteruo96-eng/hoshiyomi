'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Teller } from '@/types';
import ChatList from '@/components/admin/ChatList';
import ReplyPane from '@/components/admin/ReplyPane';
import StatusToggle from '@/components/admin/StatusToggle';

interface Message {
  id: string;
  thread_id: string;
  role: 'user' | 'fortune';
  content: string;
  is_read: boolean;
  created_at: string;
}

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

export default function AdminDashboard() {
  const [teller, setTeller] = useState<Teller | null>(null);
  const [tellerId, setTellerId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadWithMessages[]>([]);
  const [selectedThread, setSelectedThread] = useState<ThreadWithMessages | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // selectedThread の最新値を ref で保持（stale closure 防止）
  const selectedThreadIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedThreadIdRef.current = selectedThread?.id ?? null;
  }, [selectedThread]);

  const tellerIdRef = useRef<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/admin/login'); return; }

      let tid = sessionStorage.getItem('admin_teller_id');
      if (!tid) {
        const adminMap: Record<string, string> = JSON.parse(
          process.env.NEXT_PUBLIC_ADMIN_TELLER_MAP || '{}'
        );
        const email = session.user.email ?? '';
        const mappedId = adminMap[email];
        if (!mappedId) { router.push('/admin/login'); return; }
        sessionStorage.setItem('admin_teller_id', mappedId);
        tid = mappedId;
      }
      tellerIdRef.current = tid;
      setTellerId(tid);
    }
    init();
  }, []);

  const fetchThreads = useCallback(async () => {
    const tid = tellerIdRef.current;
    if (!tid) return;

    const { data } = await supabase
      .from('threads')
      .select(`
        id, user_id, created_at,
        user_profiles ( id, display_name, email, plan, free_msgs_left ),
        messages ( id, thread_id, role, content, is_read, created_at )
      `)
      .eq('teller_id', tid)
      .order('created_at', { ascending: false });

    if (!data) return;

    const sorted = data.map((t: any) => ({
      ...t,
      user_profiles: Array.isArray(t.user_profiles) ? t.user_profiles[0] : t.user_profiles,
      messages: (t.messages || []).sort(
        (a: Message, b: Message) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    }));

    sorted.sort((a: ThreadWithMessages, b: ThreadWithMessages) => {
      const aLast = a.messages[a.messages.length - 1];
      const bLast = b.messages[b.messages.length - 1];
      const aUnread = aLast?.role === 'user' && !aLast?.is_read;
      const bUnread = bLast?.role === 'user' && !bLast?.is_read;
      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;
      const aTime = aLast ? new Date(aLast.created_at).getTime() : 0;
      const bTime = bLast ? new Date(bLast.created_at).getTime() : 0;
      return bTime - aTime;
    });

    setThreads(sorted);

    // 選択中スレッドを最新データで更新（ref で stale closure を回避）
    const currentId = selectedThreadIdRef.current;
    if (currentId) {
      const updated = sorted.find((t: ThreadWithMessages) => t.id === currentId);
      if (updated) setSelectedThread(updated);
    }
  }, []); // 依存なし — ref 経由でアクセス

  // fetchThreads の最新版を ref で保持
  const fetchThreadsRef = useRef(fetchThreads);
  useEffect(() => { fetchThreadsRef.current = fetchThreads; }, [fetchThreads]);

  useEffect(() => {
    if (!tellerId) return;

    async function loadData() {
      const { data: tellerData } = await supabase
        .from('tellers').select('*').eq('id', tellerId).single();
      if (tellerData) { setTeller(tellerData); setIsOnline(tellerData.is_online); }
      await fetchThreadsRef.current();
      setLoading(false);
    }
    loadData();

    const channel = supabase
      .channel('admin-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        () => { fetchThreadsRef.current(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' },
        () => { fetchThreadsRef.current(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tellerId]);

  async function handleLogout() {
    sessionStorage.removeItem('admin_teller_id');
    await supabase.auth.signOut();
    router.push('/admin/login');
  }

  const unreadCount = threads.filter((t) => {
    const last = t.messages[t.messages.length - 1];
    return last?.role === 'user' && !last?.is_read;
  }).length;
  const totalUsers = threads.length;
  const totalMessages = threads.reduce((sum, t) => sum + t.messages.length, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-gold/40 font-shippori">
          <div className="w-5 h-5 border-2 border-gold/20 border-t-gold/60 rounded-full animate-spin" />
          読み込み中…
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--void)' }}>
      {/* ヘッダー */}
      <header className="flex-shrink-0 glass-dark border-b border-gold/15 px-5 py-3 flex items-center gap-4 z-10">
        <div className="font-cormorant text-xl text-shimmer tracking-wider">HOSHIYOMI</div>

        {teller && (
          <div className="flex items-center gap-2 pl-2 border-l border-gold/15">
            <span className="text-xl">{teller.emoji}</span>
            <div>
              <div className="font-shippori text-sm text-gold-pale leading-tight">{teller.name}</div>
              <div className="text-[10px] text-gold-pale/40">{teller.specialty}</div>
            </div>
          </div>
        )}

        {teller && (
          <StatusToggle tellerId={teller.id} isOnline={isOnline} onChange={setIsOnline} />
        )}

        <div className="flex-1" />

        <button onClick={handleLogout} className="btn-ghost text-xs px-4 py-2 rounded-lg">
          ログアウト
        </button>
      </header>

      {/* 統計バー */}
      <div className="flex-shrink-0 border-b border-gold/10 px-5 py-2 flex items-center gap-5"
        style={{ background: 'rgba(6,3,15,0.6)' }}>
        <StatBadge
          value={unreadCount}
          label="件 未返信"
          valueClass={unreadCount > 0 ? 'text-rose-light' : 'text-gold-pale/30'}
          dot={unreadCount > 0}
        />
        <div className="w-px h-4 bg-gold/10" />
        <StatBadge value={totalUsers} label="名 ユーザー" valueClass="text-gold" />
        <div className="w-px h-4 bg-gold/10" />
        <StatBadge value={totalMessages} label="件 メッセージ" valueClass="text-gold-pale/60" />
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex min-h-0">
        {/* チャット一覧 */}
        <div className="w-72 flex-shrink-0 glass-dark border-r border-gold/10 flex flex-col">
          <div className="px-4 py-3 border-b border-gold/10 flex items-center justify-between">
            <h2 className="font-shippori text-xs font-semibold text-gold-pale/60 tracking-wider uppercase">
              相談一覧
            </h2>
            {unreadCount > 0 && (
              <span className="bg-rose/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <ChatList
            threads={threads}
            selectedThreadId={selectedThread?.id ?? null}
            onSelect={setSelectedThread}
          />
        </div>

        {/* 返信ペイン */}
        <div className="flex-1 min-w-0">
          {selectedThread ? (
            teller && (
              <ReplyPane
                thread={selectedThread}
                tellerEmoji={teller.emoji}
                tellerName={teller.name}
                onReplySent={() => fetchThreadsRef.current()}
              />
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="text-6xl mb-5 opacity-20 animate-float">
                {teller?.emoji ?? '🔮'}
              </div>
              <p className="font-cormorant text-2xl text-gold-pale/30 mb-2">
                相談を選択してください
              </p>
              <p className="text-sm text-gold-pale/20 font-shippori">
                未返信の相談は上部に表示されます
              </p>
              {unreadCount > 0 && (
                <div className="mt-8 bg-rose/8 border border-rose/25 rounded-2xl px-8 py-4">
                  <p className="text-rose-light font-shippori text-sm">
                    ⚠️ {unreadCount}件の未返信相談があります
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBadge({
  value,
  label,
  valueClass,
  dot,
}: {
  value: number;
  label: string;
  valueClass: string;
  dot?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-rose animate-pulse" />}
      <span className={`font-shippori text-sm font-semibold ${valueClass}`}>{value}</span>
      <span className="text-[11px] text-gold-pale/35">{label}</span>
    </div>
  );
}
