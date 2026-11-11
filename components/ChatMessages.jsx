'use client';

import { useEffect, useRef } from 'react';
import MessageBubble from '@/components/MessageBubble';

function formatDayLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Conversation';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const days = Math.round((today - target) / 86_400_000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function ChatMessages({
  messages,
  isGenerating,
  onCopied,
  onRegenerate,
}) {
  const scrollRef = useRef(null);
  const stickToBottom = useRef(true);
  const previousCount = useRef(messages.length);
  const lastMessage = messages[messages.length - 1];
  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant');
  const canRegenerateId =
    lastMessage?.role === 'assistant' ? lastAssistant?.id : null;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const increased = messages.length > previousCount.current;
    if (increased || lastMessage?.role === 'user') {
      stickToBottom.current = true;
    }

    if (stickToBottom.current) {
      container.scrollTop = container.scrollHeight;
    }

    previousCount.current = messages.length;
  }, [messages, lastMessage?.role]);

  function handleScroll() {
    const container = scrollRef.current;
    if (!container) return;
    const distance =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    stickToBottom.current = distance < 140;
  }

  return (
    <section className="chat-scroll" ref={scrollRef} onScroll={handleScroll}>
      <div className="message-list" role="log" aria-label="Conversation">
        <div className="conversation-date">
          <span>{formatDayLabel(messages[0]?.createdAt)}</span>
        </div>

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isLastAssistant={message.id === canRegenerateId}
            isGenerating={isGenerating}
            onCopy={onCopied}
            onRegenerate={onRegenerate}
          />
        ))}
      </div>
    </section>
  );
}
