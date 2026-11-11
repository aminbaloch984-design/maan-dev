'use client';

import { useEffect } from 'react';
import { ArrowUp, Sparkles, Square } from 'lucide-react';

export default function Composer({
  value,
  onChange,
  onSend,
  onStop,
  isGenerating,
  disabled,
  inputRef,
  model,
}) {
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 184)}px`;
  }, [value, inputRef]);

  useEffect(() => {
    if (window.matchMedia('(min-width: 900px)').matches) {
      inputRef.current?.focus();
    }
  }, [inputRef]);

  function submit() {
    const text = value.trim();
    if (!text || isGenerating || disabled) return;
    onSend(text);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      if (event.nativeEvent.isComposing) return;
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="composer-section">
      <div className={`composer ${isGenerating ? 'is-generating' : ''}`}>
        <textarea
          ref={inputRef}
          className="composer-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message NEW AI..."
          rows={1}
          aria-label="Message NEW AI"
          disabled={disabled}
        />

        <div className="composer-toolbar">
          <div className="composer-model">
            {isGenerating ? (
              <span className="generating-status">
                <span className="generating-pulse" />
                Generating response
              </span>
            ) : (
              <>
                <span className="composer-model-mark">
                  <Sparkles size={13} />
                </span>
                <span>NEW AI</span>
                <span className="composer-model-separator" />
                <span className="composer-model-name">{model || 'Gemini'}</span>
              </>
            )}
          </div>

          <div className="composer-controls">
            <span className="composer-hint">
              <kbd>Enter</kbd> to send
              <span className="hint-separator">·</span>
              <kbd>Shift</kbd> + <kbd>Enter</kbd> for a new line
            </span>

            {isGenerating ? (
              <button
                type="button"
                className="composer-submit stop-button"
                onClick={onStop}
                aria-label="Stop generating response"
                title="Stop generating"
              >
                <Square size={13} fill="currentColor" />
              </button>
            ) : (
              <button
                type="button"
                className="composer-submit"
                onClick={submit}
                disabled={!value.trim() || disabled}
                aria-label="Send message"
                title="Send message"
              >
                <ArrowUp size={18} strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="composer-disclaimer">
        NEW AI can make mistakes. Verify important information.
      </p>
    </div>
  );
}
