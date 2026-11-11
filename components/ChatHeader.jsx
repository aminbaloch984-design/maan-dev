'use client';

import {
  Eraser,
  Menu,
  Pencil,
  Plus,
  Sparkles,
} from 'lucide-react';
import { ThemeToggle } from '@/components/Brand';

export default function ChatHeader({
  title,
  hasMessages,
  model,
  onOpenSidebar,
  onNewChat,
  onRename,
  onClear,
}) {
  return (
    <header className="chat-header">
      <div className="chat-header-left">
        <button
          type="button"
          className="icon-button mobile-menu-button"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
          aria-controls="app-sidebar"
        >
          <Menu size={19} />
        </button>

        <div className="chat-title-wrap">
          <div className="chat-kicker">
            <span className="chat-kicker-dot" />
            AI workspace
          </div>
          <h1 className="chat-title" title={title}>
            {title}
          </h1>
        </div>

        <div className="active-model-chip" title={model || 'Gemini'}>
          <Sparkles size={13} />
          <span>{model || 'Gemini'}</span>
        </div>
      </div>

      <div className="chat-header-actions">
        <button
          type="button"
          className="icon-button header-new-chat"
          onClick={onNewChat}
          aria-label="Start a new chat"
          title="New chat"
        >
          <Plus size={18} />
        </button>

        {hasMessages && (
          <>
            <button
              type="button"
              className="icon-button header-action-desktop"
              onClick={onRename}
              aria-label="Rename conversation"
              title="Rename conversation"
            >
              <Pencil size={17} />
            </button>
            <button
              type="button"
              className="icon-button header-action-desktop"
              onClick={onClear}
              aria-label="Clear conversation"
              title="Clear conversation"
            >
              <Eraser size={17} />
            </button>
            <span className="header-divider" aria-hidden="true" />
          </>
        )}

        <ThemeToggle />
      </div>
    </header>
  );
}
