const FILLER_PATTERNS = [
  [/```[\s\S]*?```/g, ' Code block omitted. '],
  [/~~~[\s\S]*?~~~/g, ' Code block omitted. '],
  [/`([^`]+)`/g, '$1'],
  [/!\[([^\]]*)\]\([^)]*\)/g, '$1'],
  [/\[([^\]]+)\]\([^)]*\)/g, '$1'],
  [/<[^>]+>/g, ' '],
  [/^\s{0,3}#{1,6}\s+/gm, ''],
  [/^\s{0,3}>\s?/gm, ''],
  [/^\s{0,3}[-*+]\s+/gm, ''],
  [/^\s{0,3}\d+\.\s+/gm, ''],
  [/^\s*\|?[\s:-]+\|[\s:|-]*$/gm, ''],
  [/\|/g, ', '],
  [/(\*\*|__)(.*?)\1/g, '$2'],
  [/(\*|_)(.*?)\1/g, '$2'],
  [/~~(.*?)~~/g, '$1'],
  [/https?:\/\/\S+/g, ''],
];

/**
 * Converts a Markdown reply into clean, speakable prose.
 */
export function stripMarkdownForSpeech(text) {
  if (!text) return '';

  let clean = String(text);
  for (const [pattern, replacement] of FILLER_PATTERNS) {
    clean = clean.replace(pattern, replacement);
  }

  return clean
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();
}

export function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported() {
  return Boolean(getSpeechRecognition());
}

export function isSpeechSynthesisSupported() {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

export function detectSpeechLanguage(text) {
  return /[\u0600-\u06FF]/.test(text || '') ? 'ur-PK' : 'en-US';
}

function pickVoice(lang) {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const target = (lang || 'en-US').toLowerCase();
  const base = target.split('-')[0];
  const preferred = voices.filter(
    (voice) => voice.lang.toLowerCase() === target
  );
  const related = voices.filter(
    (voice) => voice.lang.toLowerCase().split('-')[0] === base
  );
  const pool = preferred.length > 0 ? preferred : related;
  if (pool.length === 0) return null;

  return (
    pool.find((voice) => /google|natural|premium|enhanced/i.test(voice.name)) ||
    pool.find((voice) => voice.default) ||
    pool[0]
  );
}

/**
 * Splits long replies into sentence-sized utterances so every browser plays
 * the full response without cutting off halfway through.
 */
function chunkForSpeech(text, maxLength = 190) {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    const piece = sentence.trim();
    if (!piece) continue;

    if (piece.length > maxLength) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      const words = piece.split(/\s+/);
      let line = '';
      for (const word of words) {
        if ((line + ' ' + word).trim().length > maxLength) {
          if (line) chunks.push(line);
          line = word;
        } else {
          line = line ? `${line} ${word}` : word;
        }
      }
      if (line) chunks.push(line);
      continue;
    }

    if ((current + ' ' + piece).trim().length > maxLength) {
      if (current) chunks.push(current);
      current = piece;
    } else {
      current = current ? `${current} ${piece}` : piece;
    }
  }

  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

let sessionToken = 0;

export function stopSpeaking() {
  sessionToken += 1;
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Speaks a reply out loud. Returns false when speech synthesis is unavailable.
 */
export function speakText(text, { lang, onStart, onEnd } = {}) {
  if (!isSpeechSynthesisSupported()) return false;

  const clean = stripMarkdownForSpeech(text);
  if (!clean) return false;

  const chunks = chunkForSpeech(clean);
  if (chunks.length === 0) return false;

  sessionToken += 1;
  const session = sessionToken;
  const synth = window.speechSynthesis;
  const speechLang = lang || detectSpeechLanguage(clean);

  synth.cancel();

  const finish = () => {
    if (session !== sessionToken) return;
    onEnd?.();
  };

  const speakChunk = (index) => {
    if (session !== sessionToken) return;

    if (index >= chunks.length) {
      finish();
      return;
    }

    const utterance = new window.SpeechSynthesisUtterance(chunks[index]);
    utterance.lang = speechLang;
    utterance.rate = 1.02;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voice = pickVoice(speechLang);
    if (voice) utterance.voice = voice;

    let advanced = false;
    const next = () => {
      if (advanced) return;
      advanced = true;
      speakChunk(index + 1);
    };

    utterance.onend = next;
    utterance.onerror = (event) => {
      // "interrupted" fires when the user stops playback on purpose.
      if (event?.error !== 'interrupted' && event?.error !== 'canceled') {
        finish();
        return;
      }
      next();
    };

    if (index === 0) onStart?.();
    synth.speak(utterance);
  };

  // Chrome occasionally drops the first utterance right after cancel().
  window.setTimeout(() => speakChunk(0), 60);
  return true;
}
