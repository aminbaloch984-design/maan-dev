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

const EMOJI_PATTERN =
  /[\u{1F000}-\u{1FAFF}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu;

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
    .replace(EMOJI_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:۔،؛؟])/g, '$1')
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

export function hasUrduScript(text) {
  return /[\u0600-\u06FF]/.test(text || '');
}

// Words that are distinctive to Roman Urdu and rarely appear in English prose.
const ROMAN_URDU_HINTS = new Set(
  `hai hain hoon hun nahi nahin aap kya kyun kaise kaun kahan kab mujhe mera meri
  mere tum tumhe hum humein hamara hamari yeh woh yahan wahan bohot bahut theek
  thik shukriya acha achha bhai yaar karna karta karti raha rahi rahe sakta sakti
  sakte chahiye batao bataen bataein samajh matlab abhi phir lekin magar agar toh
  sirf kuch koi waqt aaj kal baat cheez log zyada kam thoda ghar kaam madad sawal
  jawab dost khush hafiz assalam salaam mubarak inshallah mashallah alhamdulillah
  jazak pyar mohabbat dil zindagi dunya sab sabko apna apni apne humara unka inka
  iska uski unki iski wala wali wale hota hoti hote karte karti karta karte rahe
  the thi tha bhi toh kyunke kyunki bhool yaad suno dekho chal chalo ruk ruko`
    .split(/\s+/)
    .filter(Boolean)
);

/**
 * Detects Roman Urdu (Urdu written with Latin letters) so it can be spoken with
 * an Urdu voice instead of being read as English.
 */
export function isRomanUrdu(text) {
  const words = String(text || '')
    .toLowerCase()
    .match(/[a-z']+/g);
  if (!words || words.length < 3) return false;

  let hits = 0;
  for (const word of words) {
    if (ROMAN_URDU_HINTS.has(word)) hits += 1;
  }

  return hits >= 3 || (hits >= 2 && hits / words.length >= 0.18);
}

/**
 * Picks the language that will sound most natural for a given reply.
 * Urdu script and Roman Urdu win over the stored preference so replies are
 * never read with an English voice by accident.
 */
export function resolveSpeechLang(text, preferred = 'en-US') {
  if (hasUrduScript(text)) return 'ur-PK';
  if (isRomanUrdu(text)) return 'ur-PK';
  return preferred === 'ur-PK' ? 'ur-PK' : 'en-US';
}

export function detectSpeechLanguage(text) {
  return resolveSpeechLang(text, 'en-US');
}

let cachedVoices = [];

export function loadVoices() {
  if (!isSpeechSynthesisSupported()) return Promise.resolve([]);

  const synth = window.speechSynthesis;
  const current = synth.getVoices();
  if (current.length > 0) {
    cachedVoices = current;
    return Promise.resolve(current);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      cachedVoices = synth.getVoices();
      window.clearTimeout(timer);
      synth.removeEventListener?.('voiceschanged', finish);
      resolve(cachedVoices);
    };
    const timer = window.setTimeout(finish, 1600);
    synth.addEventListener?.('voiceschanged', finish);
    // Some Chrome builds expose voices only after the first getVoices call.
    synth.getVoices();
  });
}

function scoreVoice(voice, target) {
  const lang = (voice.lang || '').toLowerCase();
  let score = 0;
  if (lang === target) score += 100;
  else if (lang.split('-')[0] === target.split('-')[0]) score += 55;
  else return -1;

  if (/natural|neural|online|premium|enhanced/i.test(voice.name)) score += 35;
  if (/google/i.test(voice.name)) score += 25;
  if (/microsoft/i.test(voice.name)) score += 10;
  if (!voice.localService) score += 8;
  if (voice.default) score += 3;
  return score;
}

export function pickVoice(lang) {
  if (typeof window === 'undefined') return null;
  const voices =
    cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const target = (lang || 'en-US').toLowerCase();
  let best = null;
  let bestScore = -1;

  for (const voice of voices) {
    const score = scoreVoice(voice, target);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }

  return bestScore >= 0 ? best : null;
}

/**
 * Splits long replies into sentence-sized utterances so every browser plays
 * the full response without cutting off halfway through.
 */
export function chunkSpeechText(text, maxLength = 180) {
  const sentences = text.match(/[^.!?۔؟]+[.!?۔؟]*\s*/g) || [text];
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

export function getSpeechSessionToken() {
  return sessionToken;
}

/**
 * Speaks a reply out loud with the device's built-in voices. Returns false when
 * speech synthesis is unavailable or the text is empty.
 */
export function speakText(
  text,
  { lang, onStart, onEnd, rate } = {}
) {
  if (!isSpeechSynthesisSupported()) return false;

  const clean = stripMarkdownForSpeech(text);
  if (!clean) return false;

  const chunks = chunkSpeechText(clean, 190);
  if (chunks.length === 0) return false;

  sessionToken += 1;
  const session = sessionToken;
  const synth = window.speechSynthesis;
  const speechLang = lang || resolveSpeechLang(clean, 'en-US');

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
    utterance.rate = rate || (speechLang.startsWith('ur') ? 0.92 : 1.02);
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
