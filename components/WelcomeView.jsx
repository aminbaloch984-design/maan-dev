'use client';

import {
  ArrowUpRight,
  BookOpen,
  Code2,
  FileText,
  Lightbulb,
  MessageSquareText,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { BrandMark } from '@/components/Brand';

const SUGGESTIONS = [
  {
    icon: Code2,
    category: 'Create with code',
    title: 'Build a polished landing page',
    description: 'Responsive HTML, CSS and JavaScript, ready to run.',
    prompt:
      'Create a modern, responsive landing page for a SaaS product using HTML, CSS and a little JavaScript. Include a hero, feature cards, pricing and a mobile menu. Give me the complete code.',
    tone: 'violet',
  },
  {
    icon: BookOpen,
    category: 'Learn something',
    title: 'Understand a tricky concept',
    description: 'Clear explanations with examples you can follow.',
    prompt:
      'Explain how JavaScript Promises work like I am a beginner. Use a real-world analogy, then show a short example with async/await.',
    tone: 'cyan',
  },
  {
    icon: Lightbulb,
    category: 'Grow an idea',
    title: 'Turn an idea into a plan',
    description: 'Practical business ideas and a realistic next step.',
    prompt:
      'Give me 10 low-budget business ideas for 2026. For each one, include the target audience and the first step. Then recommend the best option for a solo founder.',
    tone: 'amber',
  },
  {
    icon: FileText,
    category: 'Transform text',
    title: 'Summarize anything',
    description: 'Paste an article, notes or a document to distill it.',
    prompt:
      'Summarize the following text in five concise bullet points and end with the single most important takeaway:\n\n',
    tone: 'emerald',
  },
];

const CAPABILITIES = [
  { icon: Code2, label: 'Code generation' },
  { icon: BookOpen, label: 'Deep explanations' },
  { icon: MessageSquareText, label: 'English & Roman Urdu' },
  { icon: FileText, label: 'Smart summaries' },
];

export default function WelcomeView({ onSelectPrompt, apiStatus }) {
  const showSetup =
    apiStatus &&
    apiStatus.checking === false &&
    apiStatus.configured === false;

  return (
    <section className="welcome-view" aria-labelledby="welcome-heading">
      <div className="welcome-inner">
        <div className="welcome-hero">
          <div className="welcome-mark-wrap">
            <span className="welcome-mark-ring" />
            <BrandMark className="welcome-mark" />
          </div>

          <div className="welcome-eyebrow">
            <span className="welcome-live-dot" />
            Your private AI workspace
          </div>

          <h1 id="welcome-heading" className="welcome-title">
            What will you
            <span className="gradient-text"> build</span> today?
          </h1>

          <p className="welcome-subtitle">
            Ask anything, write better code, or turn a rough idea into
            something real. NEW AI is ready when you are.
          </p>
        </div>

        {showSetup && (
          <div className="setup-notice" role="status">
            <span className="setup-icon">
              <TriangleAlert size={18} />
            </span>
            <div className="setup-copy">
              <strong>Connect Gemini to start chatting</strong>
              <p>
                Add <code>GEMINI_API_KEY</code> to <code>.env.local</code>, then
                restart the development server.
              </p>
            </div>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer noopener"
              className="setup-link"
            >
              Get a key
              <ArrowUpRight size={14} />
            </a>
          </div>
        )}

        <div className="suggestion-grid">
          {SUGGESTIONS.map((suggestion) => {
            const Icon = suggestion.icon;
            return (
              <button
                key={suggestion.title}
                type="button"
                className={`suggestion-card tone-${suggestion.tone}`}
                onClick={() => onSelectPrompt(suggestion.prompt)}
              >
                <span className="suggestion-top">
                  <span className="suggestion-icon">
                    <Icon size={19} strokeWidth={1.9} />
                  </span>
                  <ArrowUpRight
                    className="suggestion-arrow"
                    size={17}
                    strokeWidth={1.8}
                  />
                </span>
                <span className="suggestion-category">{suggestion.category}</span>
                <span className="suggestion-title">{suggestion.title}</span>
                <span className="suggestion-description">
                  {suggestion.description}
                </span>
              </button>
            );
          })}
        </div>

        <div className="capability-strip">
          <span className="capability-label">
            <Sparkles size={13} />
            Built for
          </span>
          <div className="capability-list">
            {CAPABILITIES.map((capability) => {
              const Icon = capability.icon;
              return (
                <span className="capability-chip" key={capability.label}>
                  <Icon size={13} />
                  {capability.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
