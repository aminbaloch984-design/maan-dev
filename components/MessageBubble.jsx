'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  RotateCcw,
  Sparkles,
  Square,
  UserRound,
  Volume2,
} from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { useSpeech } from '@/components/SpeechProvider';
import { copyToClipboard, formatMessageTime } from '@/lib/utils';

export default function MessageBubble({
  message,
  isLastAssistant,
  isGenerating,
  onCopy,
  onRegenerate,
  onNotice,
}) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef(null);
  const speech = useSpeech();
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'streaming';
  const isError = message.status === 'error';
  const isStopped = message.status === 'stopped';
  const isSpeaking = speech.speakingId === message.id;

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  async function handleCopy() {
    const ok = await copyToClipboard(message.content);
    if (!ok) return;
    setCopied(true);
    onCopy?.();
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 1800);
  }

  function handleSpeak() {
    if (isSpeaking) {
      speech.stop();
      return;
    }

    const started = speech.speakMessage(message.id, message.content);
    if (!started) {
      onNotice?.(
        'Voice replies are not supported in this browser. Try Chrome, Edge or Safari.',
        'error'
      );
    }
  }

  if (isUser) {
    return (
      <article className="message-row user-message">
        <div className="user-message-stack">
          <div className="user-bubble">{message.content}</div>
          <div className="user-message-meta">
            <time>{formatMessageTime(message.createdAt)}</time>
            <button
              type="button"
              className="message-icon-button"
              onClick={handleCopy}
              aria-label="Copy your message"
              title="Copy message"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>
        </div>
        <div className="message-avatar user-avatar" aria-hidden="true">
          <UserRound size={16} />
        </div>
      </article>
    );
  }

  return (
    <article className="message-row ai-message">
      <div className="message-avatar ai-avatar" aria-hidden="true">
        <Sparkles size={16} />
      </div>

      <div className="ai-message-body">
        <div className="ai-message-meta">
          <span className="ai-author">NEW AI</span>
          <span className="ai-verified-dot" aria-hidden="true" />
          <time>{formatMessageTime(message.createdAt)}</time>
          {isStreaming && <span className="streaming-label">Generating</span>}
        </div>

        {isStreaming && !message.content ? (
          <div className="thinking-indicator" role="status">
            <span className="thinking-orb">
              <Sparkles size={13} />
            </span>
            <span className="thinking-text">Thinking</span>
            <span className="thinking-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </div>
        ) : (
          <>
            {message.content && (
              <div className="ai-message-content">
                <MarkdownRenderer content={message.content} />
                {isStreaming && (
                  <span className="stream-caret" aria-hidden="true" />
                )}
              </div>
            )}

            {isError && (
              <div className="message-error">
                <span className="message-error-icon">
                  <AlertCircle size={17} />
                </span>
                <div>
                  <strong>I couldn&apos;t complete that response</strong>
                  <p>
                    {message.error ||
                      'Something went wrong. Please check your connection and try again.'}
                  </p>
                  {isLastAssistant && !isGenerating && (
                    <button
                      type="button"
                      className="inline-retry"
                      onClick={() => onRegenerate(message.id)}
                    >
                      <RotateCcw size={13} />
                      Try again
                    </button>
                  )}
                </div>
              </div>
            )}

            {isStopped && !message.content && (
              <div className="stopped-note">
                <Square size={12} />
                Response stopped
                {isLastAssistant && !isGenerating && (
                  <button
                    type="button"
                    className="stopped-retry"
                    onClick={() => onRegenerate(message.id)}
                  >
                    <RotateCcw size={11} />
                    Regenerate
                  </button>
                )}
              </div>
            )}

            {isStopped && message.content && (
              <div className="stopped-note">
                <Square size={11} />
                Generation stopped
              </div>
            )}
          </>
        )}

        {message.content && !isStreaming && (
          <div className="message-actions">
            <button
              type="button"
              className="message-action"
              onClick={handleCopy}
              aria-label="Copy response"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              className={`message-action ${isSpeaking ? 'is-speaking' : ''}`}
              onClick={handleSpeak}
              aria-label={isSpeaking ? 'Stop reading response' : 'Read response aloud'}
              aria-pressed={isSpeaking}
            >
              {isSpeaking ? (
                <Square size={12} fill="currentColor" />
              ) : (
                <Volume2 size={14} />
              )}
              <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
            </button>

            {isLastAssistant && !isError && (
              <button
                type="button"
                className="message-action"
                onClick={() => onRegenerate(message.id)}
                disabled={isGenerating}
                aria-label="Regenerate response"
              >
                <RotateCcw size={14} />
                <span>Regenerate</span>
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
