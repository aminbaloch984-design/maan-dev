'use client';

import {
  LockKeyhole,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { Brand } from '@/components/Brand';
import {
  formatChatTime,
  formatModelName,
  groupConversations,
} from '@/lib/utils';

export default function Sidebar({
  conversations,
  activeId,
  search,
  onSearch,
  onNewChat,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
  mobileOpen,
  onCloseMobile,
  apiStatus,
}) {
  const groups = groupConversations(conversations);
  const configured = apiStatus?.configured === true;
  const checking = !apiStatus || apiStatus.checking;

  return (
    <aside
      id="app-sidebar"
      className={`sidebar ${mobileOpen ? 'is-open' : ''}`}
      aria-label="Chat history and navigation"
    >
      <div className="sidebar-top">
        <Brand onClick={onNewChat} />
        <button
          type="button"
          className="icon-button sidebar-close"
          onClick={onCloseMobile}
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      <button type="button" className="new-chat-button" onClick={onNewChat}>
        <span className="new-chat-icon">
          <Plus size={17} strokeWidth={2.4} />
        </span>
        <span className="new-chat-label">New chat</span>
        <kbd className="new-chat-shortcut">Ctrl K</kbd>
      </button>

      <div className="sidebar-search">
        <Search size={16} className="sidebar-search-icon" aria-hidden="true" />
        <input
          type="text"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search conversations"
          aria-label="Search conversations"
          spellCheck={false}
        />
        {search && (
          <button
            type="button"
            className="search-clear"
            onClick={() => onSearch('')}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="recents-heading">
        <span>Recent chats</span>
        <span className="recents-count">{conversations.length}</span>
      </div>

      <nav className="recents" aria-label="Recent conversations">
        {groups.length === 0 && (
          <div className="sidebar-empty">
            <span className="sidebar-empty-icon">
              <MessageSquare size={18} />
            </span>
            <p>{search ? 'No matching conversations' : 'No conversations yet'}</p>
            <span>
              {search
                ? 'Try another search term.'
                : 'Start a chat and it will appear here.'}
            </span>
          </div>
        )}

        {groups.map((group) => (
          <div className="chat-group" key={group.label}>
            <div className="chat-group-label">{group.label}</div>
            {group.items.map((conversation) => {
              const isActive = conversation.id === activeId;
              return (
                <div
                  className={`conversation-row ${isActive ? 'is-active' : ''}`}
                  key={conversation.id}
                >
                  <button
                    type="button"
                    className="conversation-main"
                    onClick={() => onSelectChat(conversation.id)}
                    aria-current={isActive ? 'page' : undefined}
                    title={conversation.title}
                  >
                    <span className="conversation-icon">
                      <MessageSquare size={15} strokeWidth={1.9} />
                    </span>
                    <span className="conversation-title">
                      {conversation.title}
                    </span>
                  </button>

                  <div className="conversation-tools">
                    <time className="conversation-time">
                      {formatChatTime(conversation.updatedAt)}
                    </time>
                    <div className="conversation-actions">
                      <button
                        type="button"
                        className="row-action"
                        onClick={() => onRenameChat(conversation)}
                        aria-label={`Rename ${conversation.title}`}
                        title="Rename"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className="row-action row-action-danger"
                        onClick={() => onDeleteChat(conversation)}
                        aria-label={`Delete ${conversation.title}`}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div
          className={`connection-card ${
            configured ? 'is-ready' : checking ? 'is-checking' : 'is-missing'
          }`}
        >
          <span className="connection-icon">
            <Sparkles size={15} />
          </span>
          <div className="connection-copy">
            <span className="connection-label">Powered by Gemini</span>
            <strong title={apiStatus?.model || 'Gemini'}>
              {formatModelName(apiStatus?.model)}
            </strong>
          </div>
          <span
            className="connection-dot"
            title={
              configured
                ? 'API configured'
                : checking
                  ? 'Checking API'
                  : 'API key not configured'
            }
          />
        </div>
        <p className="privacy-line">
          <LockKeyhole size={12} />
          Chats are stored on this device
        </p>
      </div>
    </aside>
  );
}
