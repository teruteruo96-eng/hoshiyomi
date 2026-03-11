import { Message, Teller } from '@/types';

interface MessageBubbleProps {
  message: Message;
  teller: Teller;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, teller }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[75%]">
          <div className="bubble-user px-4 py-3 text-sm text-gold-pale/90 leading-relaxed">
            {message.content}
          </div>
          <div className="text-right mt-1 text-xs text-gold-pale/30">
            {formatTime(message.created_at)}
            {!message.is_read && (
              <span className="ml-2 text-gold/50">⏳ 返答待ち</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 mb-4">
      {/* 占い師アバター */}
      <div className="flex-shrink-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(45,27,105,0.9), rgba(107,63,160,0.7))',
            border: '1px solid rgba(201,168,76,0.4)',
            boxShadow: '0 0 12px rgba(201,168,76,0.2)',
          }}
        >
          {teller.emoji}
        </div>
      </div>

      <div className="flex-1 max-w-[75%]">
        <div className="text-xs text-gold/60 mb-1 font-shippori">{teller.name}</div>
        <div className="bubble-fortune px-4 py-3 text-sm text-gold-pale/90 leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
        <div className="mt-1 text-xs text-gold-pale/30">
          {formatTime(message.created_at)}
        </div>
      </div>
    </div>
  );
}

// タイピングインジケーター
export function TypingIndicator({ teller }: { teller: Teller }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="flex-shrink-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(45,27,105,0.9), rgba(107,63,160,0.7))',
            border: '1px solid rgba(201,168,76,0.4)',
          }}
        >
          {teller.emoji}
        </div>
      </div>
      <div className="bubble-fortune px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </div>
  );
}
