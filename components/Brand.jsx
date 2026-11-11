'use client';

import { Moon, Sparkles, Sun } from 'lucide-react';
import { THEME_KEY } from '@/lib/utils';

export function BrandMark({ className = '' }) {
  return (
    <span className={`brand-mark ${className}`} aria-hidden="true">
      <span className="brand-mark-glow" />
      <Sparkles size={20} strokeWidth={2.1} />
    </span>
  );
}

export function Brand({ onClick, compact = false }) {
  const content = (
    <>
      <BrandMark />
      {!compact && (
        <span className="brand-copy">
          <span className="brand-name">
            NEW <span>AI</span>
          </span>
          <span className="brand-tagline">Intelligent workspace</span>
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="brand" onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className="brand">{content}</div>;
}

export function ThemeToggle({ className = '' }) {
  function toggleTheme() {
    const root = document.documentElement;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    root.style.colorScheme = next;

    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Theme still applies for this session if storage is unavailable.
    }

    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) =>
        meta.setAttribute('content', next === 'dark' ? '#08090d' : '#f5f5f9')
      );
  }

  return (
    <button
      type="button"
      className={`icon-button theme-toggle ${className}`}
      onClick={toggleTheme}
      aria-label="Toggle dark and light mode"
      title="Toggle theme"
    >
      <Sun className="theme-icon theme-icon-light" size={18} />
      <Moon className="theme-icon theme-icon-dark" size={18} />
    </button>
  );
}
