'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Pencil, Trash2, X } from 'lucide-react';

export function RenameDialog({ conversation, onClose, onSave }) {
  const [value, setValue] = useState(conversation?.title || '');
  const inputRef = useRef(null);
  const canSave = value.trim().length > 0;

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleSubmit(event) {
    event.preventDefault();
    if (!canSave) return;
    onSave(value.trim());
  }

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-title"
      >
        <div className="dialog-header">
          <span className="dialog-icon">
            <Pencil size={17} />
          </span>
          <div>
            <h2 id="rename-title">Rename conversation</h2>
            <p>Give this chat a name you will recognize later.</p>
          </div>
          <button
            type="button"
            className="icon-button dialog-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="dialog-label" htmlFor="conversation-name">
            Conversation name
          </label>
          <input
            id="conversation-name"
            ref={inputRef}
            className="dialog-input"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            maxLength={80}
            placeholder="Conversation name"
          />
          <div className="dialog-actions">
            <button type="button" className="button secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="button primary"
              disabled={!canSave}
            >
              Save name
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirm',
  tone = 'danger',
  icon = 'trash',
  onClose,
  onConfirm,
}) {
  const confirmRef = useRef(null);
  const Icon = icon === 'clear' ? AlertTriangle : Trash2;

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`dialog confirm-dialog tone-${tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
      >
        <div className="confirm-icon">
          <Icon size={21} />
        </div>
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-description">{description}</p>
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`button ${tone === 'danger' ? 'danger' : 'primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      className={`toast ${toast.type === 'error' ? 'is-error' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="toast-icon">
        {toast.type === 'error' ? (
          <AlertTriangle size={14} />
        ) : (
          <Check size={14} />
        )}
      </span>
      {toast.message}
    </div>
  );
}
