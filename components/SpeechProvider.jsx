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
  chunkSpeechText,
  isSpeechSynthesisSupported,
  loadVoices,
  pickVoice,
  resolveSpeechLang,
  speakText,
  stopSpeaking,
} from '@/lib/speech';

const AUTO_SPEAK_KEY = 'new-ai:auto-speak';
const VOICE_LANG_KEY = 'new-ai:voice-lang';

const MAX_PREPARE_CHARS = 3000;
const MAX_AUDIO_CHARS = 180;

const SpeechContext = createContext(null);

async function requestPreparedSpeech(text) {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'prepare', text }),
  });

  if (!response.ok) {
    let message = 'Could not prepare the Urdu voice.';
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      // Keep the generic message for non-JSON errors.
    }
    throw new Error(message);
  }

  const data = await response.json();
  if (!data?.text) throw new Error('The Urdu voice returned no text.');
  return data.text;
}

async function requestAudioClip(text) {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'audio', text }),
  });

  if (!response.ok) {
    throw new Error('The online Urdu voice is unavailable.');
  }

  const blob = await response.blob();
  if (!blob.size) throw new Error('The Urdu voice returned empty audio.');
  return blob;
}

export function SpeechProvider({ children }) {
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [voiceLang, setVoiceLangState] = useState('en-US');
  const [speakingId, setSpeakingId] = useState(null);

  const autoSpeakRef = useRef(false);
  const voiceLangRef = useRef('en-US');
  const sessionRef = useRef(0);
  const audioRef = useRef(null);
  const audioResolveRef = useRef(null);
  const notifierRef = useRef(null);
  const speechCacheRef = useRef(new Map());
  const audioCacheRef = useRef(new Map());

  useEffect(() => {
    try {
      const savedSpeak = localStorage.getItem(AUTO_SPEAK_KEY);
      if (savedSpeak === '1' && isSpeechSynthesisSupported()) {
        setAutoSpeak(true);
        autoSpeakRef.current = true;
      }

      const savedLang = localStorage.getItem(VOICE_LANG_KEY);
      if (savedLang === 'ur-PK' || savedLang === 'en-US') {
        setVoiceLangState(savedLang);
        voiceLangRef.current = savedLang;
      }
    } catch {
      // Preferences stay in memory when storage is blocked.
    }

    loadVoices().catch(() => {});

    return () => {
      stopSpeaking();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const notify = useCallback((message, type = 'error') => {
    notifierRef.current?.(message, type);
  }, []);

  const registerNotifier = useCallback((callback) => {
    notifierRef.current = callback;
  }, []);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    stopSpeaking();

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // The clip may already be finished.
      }
      audioRef.current = null;
    }

    audioResolveRef.current?.();
    audioResolveRef.current = null;
    setSpeakingId(null);
  }, []);

  const playBlob = useCallback((blob, session) => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        if (audioRef.current === audio) {
          audioRef.current = null;
          audioResolveRef.current = null;
        }
        URL.revokeObjectURL(url);
        resolve();
      };

      audioResolveRef.current = finish;
      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(finish);

      if (sessionRef.current !== session) finish();
    });
  }, []);

  const getAudioClip = useCallback(async (chunk) => {
    const cached = audioCacheRef.current.get(chunk);
    if (cached) return cached;

    const blob = await requestAudioClip(chunk);
    if (audioCacheRef.current.size > 120) {
      audioCacheRef.current.clear();
    }
    audioCacheRef.current.set(chunk, blob);
    return blob;
  }, []);

  const speakOnlineUrdu = useCallback(
    async (messageId, text, session) => {
      let prepared = speechCacheRef.current.get(messageId);
      if (!prepared || prepared.source !== text) {
        const parts = chunkSpeechText(text, MAX_PREPARE_CHARS);
        const spoken = await Promise.all(parts.map(requestPreparedSpeech));
        if (sessionRef.current !== session) return true;
        prepared = { source: text, text: spoken.join(' ') };
        speechCacheRef.current.set(messageId, prepared);
      }

      const chunks = chunkSpeechText(prepared.text, MAX_AUDIO_CHARS);
      if (chunks.length === 0) return true;

      // Prefetch the next clip while the current one plays.
      const prefetch = (chunk) =>
        getAudioClip(chunk).then(
          (blob) => ({ blob }),
          (error) => ({ error })
        );

      let next = prefetch(chunks[0]);

      for (let index = 0; index < chunks.length; index += 1) {
        if (sessionRef.current !== session) return true;

        const result = await next;
        if (result.error) throw result.error;
        if (sessionRef.current !== session) return true;

        if (index + 1 < chunks.length) {
          next = prefetch(chunks[index + 1]);
        }

        await playBlob(result.blob, session);
      }

      return true;
    },
    [getAudioClip, playBlob]
  );

  const speakMessage = useCallback(
    (messageId, text) => {
      if (!text) return false;

      sessionRef.current += 1;
      const session = sessionRef.current;
      stopSpeaking();

      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audioRef.current = null;
      }
      audioResolveRef.current?.();
      audioResolveRef.current = null;

      const lang = resolveSpeechLang(text, voiceLangRef.current);

      const speakWithDevice = () => {
        if (sessionRef.current !== session) return false;
        const started = speakText(text, {
          lang,
          onStart: () => {
            if (sessionRef.current === session) setSpeakingId(messageId);
          },
          onEnd: () => {
            if (sessionRef.current === session) setSpeakingId(null);
          },
        });
        if (!started) setSpeakingId(null);
        return started;
      };

      if (lang !== 'ur-PK') {
        setSpeakingId(messageId);
        return speakWithDevice();
      }

      setSpeakingId(messageId);

      speakOnlineUrdu(messageId, text, session)
        .then(() => {
          if (sessionRef.current === session) setSpeakingId(null);
        })
        .catch(() => {
          if (sessionRef.current !== session) return;

          const hasUrduVoice = Boolean(pickVoice('ur-PK'));
          if (hasUrduVoice) {
            notify(
              'Online Urdu voice unavailable — using the device Urdu voice.',
              'error'
            );
            speakWithDevice();
            return;
          }

          setSpeakingId(null);
          notify(
            'Urdu voice is unavailable right now. Check your internet connection and try again.',
            'error'
          );
        });

      return true;
    },
    [notify, speakOnlineUrdu]
  );

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

  const setVoiceLang = useCallback(
    (lang) => {
      const next = lang === 'ur-PK' ? 'ur-PK' : 'en-US';
      voiceLangRef.current = next;
      setVoiceLangState(next);
      stop();

      try {
        localStorage.setItem(VOICE_LANG_KEY, next);
      } catch {
        // Preference stays in memory for this session.
      }

      return next;
    },
    [stop]
  );

  const value = useMemo(
    () => ({
      autoSpeak,
      toggleAutoSpeak,
      voiceLang,
      setVoiceLang,
      speakingId,
      speakMessage,
      speakIfAuto,
      stop,
      registerNotifier,
    }),
    [
      autoSpeak,
      toggleAutoSpeak,
      voiceLang,
      setVoiceLang,
      speakingId,
      speakMessage,
      speakIfAuto,
      stop,
      registerNotifier,
    ]
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
