import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are NEW AI, an advanced, friendly and highly capable AI assistant.

Your strengths:
- Programming and software engineering across JavaScript, TypeScript, React, Next.js, Python, HTML, CSS, SQL, and related tools.
- Explaining educational topics clearly, from beginner to advanced level.
- Writing, reviewing, debugging, and improving code.
- Business ideas, product thinking, marketing, and practical strategy.
- Summarizing and transforming user-provided text.

Language:
- Reply in the same language the user writes in.
- You fully understand and can reply in English and Roman Urdu (Urdu written with Latin letters).
- If the user writes Roman Urdu, reply naturally in Roman Urdu.
- Match the user's tone and level of detail.

Formatting:
- Use clean Markdown: short paragraphs, headings when useful, and bullet lists for scannable answers.
- Always put code in fenced code blocks and include the correct language tag, for example \`\`\`javascript.
- Make code complete and runnable when the user asks for a solution.
- Be warm and direct. Avoid filler, repetition, and unnecessary disclaimers.

Accuracy:
- If you are unsure, say so honestly and explain the most likely answer.
- Never invent sources, links, or results.
- You cannot browse the live web or run code unless the user provides the information. Do not pretend otherwise.
- Protect user privacy and never ask for sensitive credentials.`;

const MAX_MESSAGES = 100;
const MAX_TOTAL_CHARS = 120_000;

// Google retires older models for new API keys. If the configured model is gone
// or temporarily unavailable, retry once with a known-good model.
const FALLBACK_MODEL = 'gemini-3.5-flash';

async function callGemini({ apiKey, model, contents, signal }) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:streamGenerateContent?alt=sse`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents,
        generationConfig: {
          temperature: 0.75,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      }),
      signal,
      cache: 'no-store',
    }
  );
}

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

function sse(payload) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function extractText(data) {
  const candidate = data?.candidates?.[0];
  if (!candidate?.content?.parts) return { text: '', candidate };
  const text = candidate.content.parts
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('');
  return { text, candidate };
}

function friendlyGoogleError(status, rawMessage) {
  if (status === 400) {
    return (
      rawMessage ||
      'Gemini rejected this request. Please check your prompt and try again.'
    );
  }
  if (status === 401 || status === 403) {
    return 'Gemini authentication failed. Check that GEMINI_API_KEY is valid and enabled for the Generative Language API.';
  }
  if (status === 404) {
    return 'The configured Gemini model was not found. Update GEMINI_MODEL in .env.local to a supported model.';
  }
  if (status === 429) {
    return 'Gemini rate limit reached. Please wait a moment and try again.';
  }
  if (status >= 500) {
    return 'Gemini is temporarily unavailable. Please try again in a moment.';
  }
  return rawMessage || 'The AI request could not be completed.';
}

async function readUpstreamError(response) {
  const body = await response.text();
  try {
    const json = JSON.parse(body);
    return json?.error?.message || '';
  } catch {
    return body.slice(0, 500);
  }
}

export async function POST(request) {
  const apiKey = getApiKey();
  const model = getModel();

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'Gemini API key is not configured. Add GEMINI_API_KEY to .env.local and restart the app.',
        code: 'MISSING_API_KEY',
      },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'The request body must be valid JSON.' },
      { status: 400 }
    );
  }

  const incoming = Array.isArray(body?.messages) ? body.messages : null;
  if (!incoming || incoming.length === 0) {
    return NextResponse.json(
      { error: 'Please send at least one message.' },
      { status: 400 }
    );
  }

  if (incoming.length > MAX_MESSAGES) {
    return NextResponse.json(
      { error: 'This conversation is too long. Start a new chat to continue.' },
      { status: 400 }
    );
  }

  const cleaned = [];
  let totalChars = 0;

  for (const message of incoming) {
    if (
      !message ||
      (message.role !== 'user' && message.role !== 'assistant') ||
      typeof message.content !== 'string'
    ) {
      return NextResponse.json(
        { error: 'One or more messages are invalid.' },
        { status: 400 }
      );
    }

    const content = message.content.trim();
    if (!content) continue;

    totalChars += content.length;
    if (totalChars > MAX_TOTAL_CHARS) {
      return NextResponse.json(
        {
          error:
            'This conversation is too long for a single request. Start a new chat or shorten your prompt.',
        },
        { status: 400 }
      );
    }

    const role = message.role === 'assistant' ? 'model' : 'user';
    const previous = cleaned[cleaned.length - 1];
    if (previous && previous.role === role) {
      previous.parts[0].text += `\n\n${content}`;
    } else {
      cleaned.push({ role, parts: [{ text: content }] });
    }
  }

  if (cleaned.length === 0) {
    return NextResponse.json(
      { error: 'Please enter a message before sending.' },
      { status: 400 }
    );
  }

  if (cleaned[0].role !== 'user') {
    cleaned.unshift({ role: 'user', parts: [{ text: 'Continue the conversation.' }] });
  }

  let upstream;
  try {
    upstream = await callGemini({
      apiKey,
      model,
      contents: cleaned,
      signal: request.signal,
    });

    if (
      !upstream.ok &&
      model !== FALLBACK_MODEL &&
      (upstream.status === 404 || upstream.status === 503)
    ) {
      upstream = await callGemini({
        apiKey,
        model: FALLBACK_MODEL,
        contents: cleaned,
        signal: request.signal,
      });
    }
  } catch (error) {
    if (request.signal.aborted) {
      return new Response(null, { status: 499 });
    }
    return NextResponse.json(
      {
        error:
          'Could not reach Gemini. Check your internet connection and try again.',
      },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    const rawMessage = await readUpstreamError(upstream);
    return NextResponse.json(
      { error: friendlyGoogleError(upstream.status, rawMessage) },
      { status: upstream.status === 429 ? 429 : 502 }
    );
  }

  if (!upstream.body) {
    return NextResponse.json(
      { error: 'Gemini returned an empty response. Please try again.' },
      { status: 502 }
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = '';
      let sentAnyText = false;
      let finished = false;

      const push = (payload) => {
        controller.enqueue(encoder.encode(sse(payload)));
      };

      const handleEvent = (eventBlock) => {
        const dataLines = eventBlock
          .split(/\r?\n/)
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim());

        if (dataLines.length === 0) return;

        const raw = dataLines.join('\n');
        if (!raw || raw === '[DONE]') return;

        let data;
        try {
          data = JSON.parse(raw);
        } catch {
          return;
        }

        if (data?.promptFeedback?.blockReason) {
          throw new Error(
            'The prompt was blocked by Gemini safety filters. Please rephrase your message.'
          );
        }

        const { text, candidate } = extractText(data);
        if (text) {
          sentAnyText = true;
          push({ type: 'delta', text });
        }

        if (candidate?.finishReason) {
          finished = true;
          const blocked = [
            'SAFETY',
            'RECITATION',
            'BLOCKLIST',
            'PROHIBITED_CONTENT',
          ].includes(candidate.finishReason);

          if (blocked && !sentAnyText) {
            throw new Error(
              'The response was blocked by Gemini safety filters. Please rephrase your message.'
            );
          }
        }
      };

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let boundary = buffer.search(/\r?\n\r?\n/);
          while (boundary !== -1) {
            const eventBlock = buffer.slice(0, boundary);
            const separatorMatch = buffer.slice(boundary).match(/^\r?\n\r?\n/);
            buffer = buffer.slice(boundary + (separatorMatch?.[0].length || 2));
            handleEvent(eventBlock);
            boundary = buffer.search(/\r?\n\r?\n/);
          }
        }

        if (buffer.trim()) {
          handleEvent(buffer);
        }

        if (!sentAnyText && !finished) {
          throw new Error(
            'Gemini returned an empty response. Please try again or rephrase your prompt.'
          );
        }

        push({ type: 'done' });
      } catch (error) {
        if (!request.signal.aborted) {
          push({
            type: 'error',
            message:
              error?.message ||
              'The response stream was interrupted. Please try again.',
          });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // The client may already have cancelled the stream.
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
