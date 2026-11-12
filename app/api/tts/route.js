import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FALLBACK_MODEL = 'gemini-3.5-flash';
const MAX_PREPARE_CHARS = 6000;
const MAX_AUDIO_CHARS = 200;

const URDU_SPEECH_PROMPT = `You prepare assistant replies for a text-to-speech engine that speaks Urdu.
Rewrite the user's text as natural spoken Urdu in Urdu script.

Rules:
- Output ONLY the spoken Urdu text. No quotes, labels, markdown, or explanation.
- Keep every fact, number, and instruction; never add new information.
- Write English words phonetically in Urdu script so the Urdu voice pronounces them correctly. For example "coding" becomes "کوڈنگ" and "Next.js" becomes "نیکسٹ جے ایس".
- Keep code identifiers and URLs unchanged when they are short.
- Use normal Urdu punctuation.`;

function getApiKey() {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    ''
  );
}

function getModel() {
  return (process.env.GEMINI_MODEL?.trim() || FALLBACK_MODEL).replace(
    /^models\//,
    ''
  );
}

function hasLatinLetters(text) {
  return /[A-Za-z]/.test(text);
}

async function toSpokenUrdu(text) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      getModel()
    )}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: URDU_SPEECH_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens: 4096,
        },
      }),
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error(`Speech preparation failed (${response.status}).`);
  }

  const data = await response.json();
  const candidates = data?.candidates;
  const parts = candidates?.[0]?.content?.parts;
  const converted =
    Array.isArray(parts) && parts.length > 0
      ? parts
          .map((part) => (typeof part.text === 'string' ? part.text : ''))
          .join('')
          .trim()
      : '';

  if (!converted) {
    throw new Error('Speech preparation returned empty text.');
  }

  return converted;
}

async function synthesizeUrduAudio(text) {
  const hosts = [
    'https://translate.google.com/translate_tts',
    'https://translate.googleapis.com/translate_tts',
  ];
  const query = `?ie=UTF-8&client=tw-ob&tl=ur&q=${encodeURIComponent(text)}`;

  for (const host of hosts) {
    try {
      const response = await fetch(`${host}${query}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Referer: 'https://translate.google.com/',
          Accept: 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
        },
        cache: 'no-store',
      });

      if (!response.ok) continue;

      const type = response.headers.get('content-type') || '';
      if (!type.includes('audio')) continue;

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength < 512) continue;

      return buffer;
    } catch {
      // Try the next host.
    }
  }

  throw new Error('The online Urdu voice is not available right now.');
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const mode = body?.mode === 'audio' ? 'audio' : 'prepare';
  const text = typeof body?.text === 'string' ? body.text.trim() : '';

  if (!text) {
    return NextResponse.json({ error: 'Text is required.' }, { status: 400 });
  }

  if (mode === 'audio') {
    if (text.length > MAX_AUDIO_CHARS) {
      return NextResponse.json(
        { error: 'Text is too long for one voice clip.' },
        { status: 400 }
      );
    }

    try {
      const audio = await synthesizeUrduAudio(text);
      return new Response(audio, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(audio.byteLength),
          'Cache-Control': 'no-store',
        },
      });
    } catch (error) {
      return NextResponse.json(
        { error: error.message || 'Urdu voice is unavailable.' },
        { status: 502 }
      );
    }
  }

  if (text.length > MAX_PREPARE_CHARS) {
    return NextResponse.json(
      { error: 'Text is too long to prepare for speech.' },
      { status: 400 }
    );
  }

  // Urdu script already speaks correctly, so only convert Latin-script replies.
  if (!hasLatinLetters(text)) {
    return NextResponse.json({ text, converted: false });
  }

  try {
    const spoken = await toSpokenUrdu(text);
    return NextResponse.json({ text: spoken, converted: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Could not prepare Urdu speech.' },
      { status: 503 }
    );
  }
}
