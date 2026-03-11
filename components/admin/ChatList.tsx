'use client';

import { Message } from '@/types';

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

interface ChatListProps {
  threads: ThreadWithMessages[];
  selectedThreadId: string | null;
  onSelect: (thread: ThreadWithMessages) => void;
}

function getLastMessage(thread: ThreadWithMessages): Message | null {
  if (!thread.messages || thread.messages.length === 0) return null;
  return thread.messages[thread.messages.length - 1];
}

function isUnread(thread: ThreadWithMessages): boolean {
  const last = getLastMessage(thread);
  return !!(last && last.role === 'user' && !last.is_read);
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return 'たった今';
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffH < 24) return `${diffH}時間前`;
  if (diffD < 7) return `${diffD}日前`;
  return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
}

function getUserDisplayName(thread: ThreadWithMessages): string {
  const profile = thread.user_profiles;
  if (!profile) return '不明なユーザー';
  return profile.display_name || profile.email.split('@')[0];
}

export default function ChatList({ threads, selectedThreadId, onSelect }: ChatListProps) {
  const unreadThreads = threads.filter(isUnread);
  const readThreads   = threads.filter((t) => !isUnread(t));

  return (
    <div className="flex-1 overflow-y-auto">
      {/* 未返信 */}
      {unreadThreads.length > 0 && (
        <div>
          <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-gold-pale/40 font-shippori tracking-wider uppercase">
              未返信
            </span>
            <span className="badge-unread">{unreadThreads.length}</span>
          </div>
          {unreadThreads.map((thread) => {
            const last = getLastMessage(thread);
            return (
              <div
                key={thread.id}
                onClick={() => onSelect(thread)}
                className={`chat-list-item unread ${selectedThreadId === thread.id ? 'active' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo/50 border border-gold/30 flex items-center justify-center text-sm flex-shrink-0">
                      👤
                    </div>
                    <div className="min-w-0">
                      <div className="font-shippori text-sm font-semibold text-gold-pale truncate">
                        {getUserDisplayName(thread)}
                      </div>
                      <div className="text-xs text-rose-light/70 truncate mt-0.5">
                        ⏳ 未返信
                      </div>
                    </div>
                  </div>
                  {last && (
                    <span className="text-xs text-gold-pale/30 flex-shrink-0">
                      {formatRelativeTime(last.created_at)}
                    </span>
                  )}
                </div>
                {last && (
                  <p className="text-xs text-gold-pale/50 mt-2 truncate pl-10">
                    {last.content}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 既読済み */}
      {readThreads.length > 0 && (
        <div>
          <div className="px-4 py-2 mt-2">
            <span className="text-xs text-gold-pale/30 font-shippori tracking-wider uppercase">
              対応済み
            </span>
          </div>
          {readThreads.map((thread) => {
            const last = getLastMessage(thread);
            return (
              <div
                key={thread.id}
                onClick={() => onSelect(thread)}
                className={`chat-list-item ${selectedThreadId === thread.id ? 'active' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo/30 border border-gold/15 flex items-center justify-center text-sm flex-shrink-0 opacity-60">
                      👤
                    </div>
                    <div className="min-w-0">
                      <div className="font-shippori text-sm text-gold-pale/70 truncate">
                        {getUserDisplayName(thread)}
                      </div>
                      {last && (
                        <div className="text-xs text-gold-pale/30 truncate mt-0.5">
                          {last.role === 'fortune' ? '✓ 返信済み' : last.content}
                        </div>
                      )}
                    </div>
                  </div>
                  {last && (
                    <span className="text-xs text-gold-pale/20 flex-shrink-0">
                      {formatRelativeTime(last.created_at)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {threads.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 text-center px-4">
          <p className="text-gold-pale/30 text-sm">相談はまだありません</p>
          <p className="text-gold-pale/20 text-xs mt-1">ユーザーからの相談が届くとここに表示されます</p>
        </div>
      )}
    </div>
  );
}
