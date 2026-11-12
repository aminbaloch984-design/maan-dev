# NEW AI

A premium, Gemini-powered AI assistant built with **Next.js**, **React**, and **CSS**. NEW AI combines a polished chat workspace with local conversation history, streaming responses, Markdown and syntax-highlighted code, and a responsive light/dark interface.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-149ECA)
![Gemini](https://img.shields.io/badge/Google-Gemini-7C6CFF)
![License](https://img.shields.io/badge/Storage-Local--only-4ED6A2)

**Live app:** https://maan-dev-rose.vercel.app  
**Source:** https://github.com/aminbaloch984-design/maan-dev  
**Created by:** Muhammad Nabeel

## Features

- **Streaming AI chat** powered by the Google Gemini API
- **Multi-turn conversations** with context retained for each chat
- **Stop generation** and **regenerate** responses
- **Chat management** — create, select, rename, search, clear, and delete
- **Local history** stored safely in the browser with `localStorage`
- **Markdown rendering** with tables, lists, links, and blockquotes
- **Code syntax highlighting** plus a copy button on every code block
- **Copy any message** with one click
- **Voice input** — dictate messages with your microphone (English and Urdu recognition)
- **Spoken replies** — listen to any answer with one click, or auto-read every reply aloud
- **Clear Urdu voice** — Roman Urdu is converted to Urdu script and spoken with an online Urdu voice
- **No reply length cap** — long answers are split into clips and played back to back
- **English and Roman Urdu** support through the system prompt
- **Knows its creator** — asks about its maker are answered with "Muhammad Nabeel"
- **Dark and light themes** with system preference detection
- **Responsive layout** with a mobile sidebar drawer
- **Polished loading states**, message animations, typing indicators, and toasts
- **Secure server-side API route** — the Gemini key is never sent to the browser

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js App Router |
| UI | React, custom CSS |
| Icons | lucide-react |
| Markdown | react-markdown, remark-gfm |
| Highlighting | rehype-highlight, highlight.js |
| AI | Google Gemini REST API |
| Storage | Browser localStorage |

## Getting started

### 1. Install dependencies

```bash
cd new-ai-next
npm install
```

### 2. Add your Gemini API key

`.env.local` has already been created in the project root. Open it and paste your key after `GEMINI_API_KEY=`:

```text
new-ai-next/.env.local
```

```env
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-3.5-flash
```

If you ever need to recreate the file, copy `.env.example`:

```bash
# Windows
copy .env.example .env.local

# macOS / Linux
cp .env.example .env.local
```

Get a free key from [Google AI Studio](https://aistudio.google.com/apikey).

> The key is only read by the server. Do **not** prefix it with `NEXT_PUBLIC_`.

### 3. Run the app

```bash
npm run dev
```

Open **http://localhost:3000**.

### Production build

```bash
npm run build
npm start
```

## Project structure

```text
new-ai-next/
├─ app/
│  ├─ api/
│  │  ├─ chat/route.js       # Secure Gemini streaming proxy
│  │  ├─ status/route.js     # Reports whether an API key is configured
│  │  └─ tts/route.js        # Urdu speech preparation and audio proxy
│  ├─ globals.css            # Complete design system and responsive layout
│  ├─ icon.svg               # App favicon
│  ├─ layout.js              # Metadata, fonts, theme boot script
│  └─ page.js                # App entry point
├─ components/
│  ├─ Brand.jsx              # Logo and theme toggle
│  ├─ ChatHeader.jsx         # Workspace header and actions
│  ├─ ChatMessages.jsx       # Scroll container and auto-scroll behaviour
│  ├─ Composer.jsx           # Auto-growing input, send and stop controls
│  ├─ MarkdownRenderer.jsx   # Markdown, highlighted code and copy buttons
│  ├─ MessageBubble.jsx      # User/AI messages, errors and actions
│  ├─ NewAIApp.jsx           # App state, streaming client and chat history
│  ├─ Overlays.jsx           # Rename, confirm and toast UI
│  ├─ Sidebar.jsx            # Navigation, search and recent chats
│  ├─ SpeechProvider.jsx     # Voice reply state and auto-read preference
│  └─ WelcomeView.jsx        # Dashboard welcome and prompt cards
├─ lib/
│  ├─ speech.js              # Web Speech helpers, Markdown cleanup and chunking
│  └─ utils.js               # IDs, dates, groups, clipboard and storage helpers
├─ .env.example
├─ jsconfig.json
├─ next.config.mjs
└─ package.json
```

## How it works

1. The browser sends the conversation to `POST /api/chat`.
2. The server validates messages, adds the NEW AI system prompt, and calls Gemini's `streamGenerateContent` endpoint with the secret key.
3. Gemini's server-sent events are transformed into a small internal event stream and sent back to the browser.
4. The client renders tokens as they arrive and stores the finished conversation in `localStorage`.

For spoken replies, English answers use the browser's built-in voices. Roman Urdu answers are sent to `POST /api/tts`, converted to Urdu script with Gemini, and played through an online Urdu voice so the pronunciation stays clear even on devices without an Urdu system voice. Long answers are split into short clips and played in sequence, so reply length is not limited.

The API route returns clear, user-safe errors for missing keys, rate limits, safety blocks, invalid models, network failures, and empty responses.

### Security notes

- `GEMINI_API_KEY` is only accessed on the server inside `app/api/chat/route.js` and `app/api/tts/route.js`.
- The key is sent to Google using the `x-goog-api-key` header, never in a URL.
- Input sizes and message counts are validated before calling Gemini.
- Chat data never leaves the browser except as part of the AI request.
- Urdu reply text is sent to Google's online voice service only when you press Listen or enable auto voice replies.

### Storage

Conversations are saved under the local storage key `new-ai:chats:v1`. The selected theme is saved under `new-ai-theme`. Voice preferences use `new-ai:auto-speak` and `new-ai:voice-lang`. Clearing browser data removes the history and these preferences.

## Deployment

The app is ready to deploy to any Next.js-compatible host. On Vercel:

1. Import the repository/project.
2. Add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) under **Environment Variables**.
3. Deploy. The `/api/chat` route runs server-side automatically.

## Customisation

- **Accent colours and theme:** CSS variables at the top of `app/globals.css`.
- **Welcome prompts:** `SUGGESTIONS` in `components/WelcomeView.jsx`.
- **AI personality and language rules:** `SYSTEM_PROMPT` in `app/api/chat/route.js`.
- **Creator name used in identity answers:** the `Identity` section of `SYSTEM_PROMPT`.
- **Gemini model:** `GEMINI_MODEL` in `.env.local`.
- **Response length:** `maxOutputTokens` in `app/api/chat/route.js`.

## Browser support

Modern versions of Chrome, Edge, Firefox, and Safari. Streaming responses and clipboard access work best on `localhost` or HTTPS.

Voice input uses the Web Speech `SpeechRecognition` API (best support in Chrome, Edge, and Safari) and requires microphone permission plus HTTPS or `localhost`. English spoken replies use `SpeechSynthesis` and depend on the voices installed on your device. Urdu spoken replies use an online Urdu voice, so they sound clear even when no Urdu system voice is installed; an internet connection is required.
