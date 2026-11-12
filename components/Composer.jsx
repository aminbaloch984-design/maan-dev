'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Mic,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useSpeech } from '@/components/SpeechProvider';
import {
  getSpeechRecognition,
  isSpeechSynthesisSupported,
} from '@/lib/speech';

const VOICE_LANG_KEY = 'new-ai:voice-lang';

export default function Composer({
  value,
  onChange,
  onSend,
  onStop,
  isGenerating,
  disabled,
  inputRef,
  model,
  onNotice,
}) {
  const speech = useSpeech();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [voiceLang, setVoiceLang] = useState('en-US');

  const recognitionRef = useRef(null);
  const listeningRef = useRef(false);
  const valueRef = useRef(value);

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

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VOICE_LANG_KEY);
      if (saved === 'en-US' || saved === 'ur-PK') setVoiceLang(saved);
    } catch {
      // Fall back to English when storage is unavailable.
    }
  }, []);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    setListening(false);
    setInterim('');

    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // The recognizer may already be stopped.
      }
    }
  }, []);

  const appendTranscript = useCallback(
    (text) => {
      const current = valueRef.current;
      const next = current.trim() ? `${current.trimEnd()} ${text}` : text;
      valueRef.current = next;
      onChange(next);
    },
    [onChange]
  );

  useEffect(() => () => {
    listeningRef.current = false;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      try {
        recognition.abort();
      } catch {
        // Ignore teardown errors.
      }
    }
  }, []);

  useEffect(() => {
    if ((isGenerating || disabled) && listeningRef.current) stopListening();
  }, [isGenerating, disabled, stopListening]);

  function toggleVoiceInput() {
    if (listeningRef.current) {
      stopListening();
      return;
    }

    if (disabled || isGenerating) return;

    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      onNotice?.(
        'Voice input is not supported in this browser. Try Chrome, Edge or Safari.',
        'error'
      );
      return;
    }

    speech.stop();

    const recognition = new Recognition();
    recognition.lang = voiceLang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interimText = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript?.trim();
        if (!transcript) continue;

        if (result.isFinal) {
          appendTranscript(transcript);
        } else {
          interimText += `${transcript} `;
        }
      }

      setInterim(interimText.trim());
    };

    recognition.onerror = (event) => {
      if (
        event.error === 'not-allowed' ||
        event.error === 'service-not-allowed'
      ) {
        onNotice?.(
          'Microphone access is blocked. Allow microphone permission to use voice input.',
          'error'
        );
        stopListening();
      } else if (event.error === 'audio-capture') {
        onNotice?.(
          'No microphone was found. Connect a microphone and try again.',
          'error'
        );
        stopListening();
      }
    };

    recognition.onend = () => {
      if (!listeningRef.current) {
        setInterim('');
        return;
      }

      // Chrome stops after a short silence — restart while the mic is on.
      window.setTimeout(() => {
        if (!listeningRef.current) return;
        try {
          recognition.start();
        } catch {
          stopListening();
        }
      }, 250);
    };

    recognitionRef.current = recognition;
    listeningRef.current = true;
    setListening(true);
    setInterim('');

    try {
      recognition.start();
    } catch {
      stopListening();
      onNotice?.('Could not start voice input. Please try again.', 'error');
    }
  }

  function changeVoiceLang(event) {
    const next = event.target.value;
    setVoiceLang(next);
    try {
      localStorage.setItem(VOICE_LANG_KEY, next);
    } catch {
      // Preference stays in memory for this session.
    }
  }

  function toggleVoiceReplies() {
    if (!isSpeechSynthesisSupported()) {
      onNotice?.(
        'Voice replies are not supported in this browser. Try Chrome, Edge or Safari.',
        'error'
      );
      return;
    }

    const enabled = speech.toggleAutoSpeak();
    onNotice?.(enabled ? 'Auto voice replies on' : 'Auto voice replies off');
  }

  function submit() {
    const text = value.trim();
    if (!text || isGenerating || disabled) return;
    if (listeningRef.current) stopListening();
    speech.stop();
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
        {(listening || interim) && (
          <div className="voice-status" role="status">
            <span className="voice-status-dot" aria-hidden="true" />
            <span className="voice-status-label">
              {listening ? 'Listening' : 'Heard'}
            </span>
            <span className="voice-status-text">
              {interim || 'Speak now — your words appear here.'}
            </span>
          </div>
        )}

        <textarea
          ref={inputRef}
          className="composer-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            listening ? 'Listening… speak now' : 'Message NEW AI...'
          }
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

            <div className="voice-controls">
              <select
                className="voice-lang"
                value={voiceLang}
                onChange={changeVoiceLang}
                aria-label="Voice input language"
                title="Voice input language"
                disabled={listening || disabled}
              >
                <option value="en-US">EN</option>
                <option value="ur-PK">UR</option>
              </select>

              <button
                type="button"
                className={`voice-button ${listening ? 'is-listening' : ''}`}
                onClick={toggleVoiceInput}
                aria-label={
                  listening ? 'Stop voice input' : 'Start voice input'
                }
                aria-pressed={listening}
                title={listening ? 'Stop voice input' : 'Speak your message'}
                disabled={disabled || isGenerating}
              >
                <Mic size={15} />
              </button>

              <button
                type="button"
                className={`voice-button ${speech.autoSpeak ? 'is-active' : ''}`}
                onClick={toggleVoiceReplies}
                aria-label="Automatically read replies aloud"
                aria-pressed={speech.autoSpeak}
                title={
                  speech.autoSpeak
                    ? 'Auto voice replies are on'
                    : 'Read replies aloud automatically'
                }
              >
                {speech.autoSpeak ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>
            </div>

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
