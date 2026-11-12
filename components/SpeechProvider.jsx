'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  isSpeechSynthesisSupported,
  speakText,
  stopSpeaking,
} from '@/lib/speech';

const AUTO_SPEAK_KEY = 'new-ai:auto-speak';

const SpeechContext = createContext(null);

export function SpeechProvider({ children }) {
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);

  const autoSpeakRef = useRef(false);
  const sessionRef = useRef(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTO_SPEAK_KEY);
      if (saved === '1' && isSpeechSynthesisSupported()) {
        setAutoSpeak(true);
        autoSpeakRef.current = true;
      }
    } catch {
      // Voice replies still work for this session when storage is blocked.
    }

    return () => stopSpeaking();
  }, []);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    stopSpeaking();
    setSpeakingId(null);
  }, []);

  const speakMessage = useCallback((messageId, text) => {
    if (!isSpeechSynthesisSupported() || !text) return false;

    sessionRef.current += 1;
    const session = sessionRef.current;
    stopSpeaking();

    const started = speakText(text, {
      onStart: () => {
        if (sessionRef.current === session) setSpeakingId(messageId);
      },
      onEnd: () => {
        if (sessionRef.current === session) setSpeakingId(null);
      },
    });

    if (!started) setSpeakingId(null);
    return started;
  }, []);

  const speakIfAuto = useCallback(
    (messageId, text) => {
      if (!autoSpeakRef.current) return false;
      return speakMessage(messageId, text);
    },
    [speakMessage]
  );

  const toggleAutoSpeak = useCallback(() => {
    const next = !autoSpeakRef.current;
    autoSpeakRef.current = next;
    setAutoSpeak(next);

    try {
      localStorage.setItem(AUTO_SPEAK_KEY, next ? '1' : '0');
    } catch {
      // Preference stays in memory for this session.
    }

    if (!next) stop();
    return next;
  }, [stop]);

  const value = useMemo(
    () => ({
      autoSpeak,
      toggleAutoSpeak,
      speakingId,
      speakMessage,
      speakIfAuto,
      stop,
    }),
    [autoSpeak, toggleAutoSpeak, speakingId, speakMessage, speakIfAuto, stop]
  );

  return (
    <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>
  );
}

export function useSpeech() {
  const context = useContext(SpeechContext);
  if (!context) {
    throw new Error('useSpeech must be used inside a SpeechProvider');
  }
  return context;
}
