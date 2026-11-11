export const STORAGE_KEY = 'new-ai:chats:v1';
export const THEME_KEY = 'new-ai-theme';

export function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function titleFromPrompt(text) {
  const clean = text
    .replace(/```[\s\S]*?```/g, ' code ')
    .replace(/[#*_>`~[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return 'New chat';
  return clean.length > 46 ? `${clean.slice(0, 45).trimEnd()}…` : clean;
}

export function formatModelName(model) {
  if (!model) return 'Gemini';
  return model
    .replace(/^gemini-/i, 'Gemini ')
    .split('-')
    .map((part) => {
      if (part.toLowerCase() === 'gemini') return 'Gemini';
      if (part.toLowerCase() === 'ai') return 'AI';
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

export function formatMessageTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatChatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const days = Math.round((startOfToday - target) / 86_400_000);

  if (days === 0) {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function groupConversations(conversations) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const groups = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Previous 7 days', items: [] },
    { label: 'Older', items: [] },
  ];

  const sorted = [...conversations].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
  );

  for (const conversation of sorted) {
    const date = new Date(conversation.updatedAt || conversation.createdAt);
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const days = Math.round((startOfToday - target) / 86_400_000);

    if (days <= 0) groups[0].items.push(conversation);
    else if (days === 1) groups[1].items.push(conversation);
    else if (days < 7) groups[2].items.push(conversation);
    else groups[3].items.push(conversation);
  }

  return groups.filter((group) => group.items.length > 0);
}

export function normalizeConversations(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((conversation) => conversation && typeof conversation === 'object')
    .map((conversation) => {
      const messages = Array.isArray(conversation.messages)
        ? conversation.messages
            .filter(
              (message) =>
                message &&
                (message.role === 'user' || message.role === 'assistant') &&
                typeof message.content === 'string'
            )
            .map((message) => ({
              id: message.id || createId(),
              role: message.role,
              content: message.content,
              createdAt: message.createdAt || new Date().toISOString(),
              status:
                message.status === 'streaming' ? 'stopped' : message.status,
              error:
                typeof message.error === 'string' ? message.error : undefined,
            }))
        : [];

      return {
        id: conversation.id || createId(),
        title:
          typeof conversation.title === 'string' && conversation.title.trim()
            ? conversation.title
            : 'New chat',
        messages,
        createdAt: conversation.createdAt || new Date().toISOString(),
        updatedAt:
          conversation.updatedAt ||
          conversation.createdAt ||
          new Date().toISOString(),
      };
    });
}

export async function copyToClipboard(text) {
  if (!text) return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      return copied;
    } catch {
      return false;
    }
  }
}
