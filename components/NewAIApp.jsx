'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Sidebar from '@/components/Sidebar';
import ChatHeader from '@/components/ChatHeader';
import WelcomeView from '@/components/WelcomeView';
import ChatMessages from '@/components/ChatMessages';
import Composer from '@/components/Composer';
import { useSpeech } from '@/components/SpeechProvider';
import {
  ConfirmDialog,
  RenameDialog,
  Toast,
} from '@/components/Overlays';
import {
  STORAGE_KEY,
  createId,
  formatModelName,
  normalizeConversations,
  titleFromPrompt,
} from '@/lib/utils';

export default function NewAIApp() {
  const { stop: stopSpeech, speakIfAuto, registerNotifier } = useSpeech();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiStatus, setApiStatus] = useState({
    checking: true,
    configured: false,
    model: '',
  });
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const abortRef = useRef(null);
  const activeRequestRef = useRef(null);
  const toastTimerRef = useRef(null);
  const composerRef = useRef(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) || null,
    [conversations, activeId]
  );

  const messages = activeConversation?.messages || [];
  const modelName = formatModelName(apiStatus.model);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;

    return conversations.filter((conversation) => {
      if (conversation.title.toLowerCase().includes(query)) return true;
      return conversation.messages.some((message) =>
        message.content.toLowerCase().includes(query)
      );
    });
  }, [conversations, search]);

  useEffect(() => {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
      saved = null;
    }

    const loaded = normalizeConversations(saved?.conversations);
    setConversations(loaded);

    if (loaded.length > 0) {
      const preferred = loaded.find(
        (conversation) => conversation.id === saved?.activeId
      );
      setActiveId(preferred?.id || loaded[0].id);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    let alive = true;

    fetch('/api/status', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Status unavailable');
        return response.json();
      })
      .then((data) => {
        if (!alive) return;
        setApiStatus({
          checking: false,
          configured: Boolean(data.configured),
          model: data.model || 'gemini-3.5-flash',
        });
      })
      .catch(() => {
        if (!alive) return;
        setApiStatus({ checking: false, configured: false, model: '' });
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ conversations, activeId })
        );
      } catch {
        // The app remains usable when storage is blocked or full.
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [conversations, activeId, hydrated]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(() => {
    registerNotifier(showToast);
    return () => registerNotifier(null);
  }, [registerNotifier, showToast]);

  const focusComposer = useCallback(() => {
    requestAnimationFrame(() => {
      composerRef.current?.focus();
    });
  }, []);

  const startNewChat = useCallback(() => {
    setSidebarOpen(false);
    setDraft('');
    stopSpeech();

    if (activeRequestRef.current) {
      abortRef.current?.abort();
    }

    if (activeConversation && activeConversation.messages.length === 0) {
      focusComposer();
      return;
    }

    const now = new Date().toISOString();
    const conversation = {
      id: createId(),
      title: 'New chat',
      messages: [],
      createdAt: now,
      updatedAt: now,
    };

    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    focusComposer();
  }, [activeConversation, focusComposer, stopSpeech]);

  useEffect(() => {
    function handleShortcut(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        if (modal) return;
        event.preventDefault();
        startNewChat();
      }
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    }

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [modal, startNewChat]);

  function patchMessage(conversationId, messageId, patch) {
    setConversations((current) =>
      current.map((conversation) => {
        if (conversation.id !== conversationId) return conversation;
        return {
          ...conversation,
          messages: conversation.messages.map((message) =>
            message.id === messageId ? { ...message, ...patch } : message
          ),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }

  async function streamCompletion(conversationId, history, assistantId) {
    const controller = new AbortController();
    abortRef.current = controller;
    activeRequestRef.current = {
      conversationId,
      assistantId,
      controller,
    };

    setIsGenerating(true);

    let accumulated = '';
    let outcome = 'complete';
    let errorMessage = '';
    let doneReceived = false;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let message = 'The AI request failed. Please try again.';
        try {
          const data = await response.json();
          if (data?.error) message = data.error;
        } catch {
          // Keep the generic error if the server response is not JSON.
        }
        throw new Error(message);
      }

      if (!response.body) {
        throw new Error('The server returned an empty response.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const handleBlock = (block) => {
        const dataLines = block
          .split(/\r?\n/)
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim());

        if (dataLines.length === 0) return;

        let payload;
        try {
          payload = JSON.parse(dataLines.join('\n'));
        } catch {
          return;
        }

        if (payload.type === 'delta' && typeof payload.text === 'string') {
          accumulated += payload.text;
          patchMessage(conversationId, assistantId, {
            content: accumulated,
          });
        } else if (payload.type === 'error') {
          throw new Error(
            payload.message || 'The response stream was interrupted.'
          );
        } else if (payload.type === 'done') {
          doneReceived = true;
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let match = buffer.match(/\r?\n\r?\n/);
        while (match && typeof match.index === 'number') {
          const block = buffer.slice(0, match.index);
          buffer = buffer.slice(match.index + match[0].length);
          handleBlock(block);
          match = buffer.match(/\r?\n\r?\n/);
        }
      }

      buffer += decoder.decode();
      if (buffer.trim()) handleBlock(buffer);

      if (!doneReceived) {
        throw new Error(
          'The connection ended before the response was complete. Please try again.'
        );
      }

      if (!accumulated) {
        throw new Error('NEW AI returned an empty response. Please try again.');
      }
    } catch (error) {
      if (controller.signal.aborted) {
        outcome = doneReceived ? 'complete' : 'stopped';
      } else {
        outcome = 'error';
        const rawMessage = error?.message || '';
        if (
          error instanceof TypeError &&
          /fetch|network|load failed/i.test(rawMessage)
        ) {
          errorMessage =
            'Could not reach the AI service. Check your internet connection and try again.';
        } else {
          errorMessage =
            rawMessage ||
            'Something went wrong while generating the response. Please try again.';
        }
      }
    } finally {
      const completedAt = new Date().toISOString();

      setConversations((current) =>
        current.map((conversation) => {
          if (conversation.id !== conversationId) return conversation;
          return {
            ...conversation,
            updatedAt: completedAt,
            messages: conversation.messages.map((message) => {
              if (message.id !== assistantId) return message;
              return {
                ...message,
                content: accumulated,
                status: outcome,
                error: errorMessage || undefined,
                createdAt: message.createdAt || completedAt,
              };
            }),
          };
        })
      );

      if (activeRequestRef.current?.assistantId === assistantId) {
        activeRequestRef.current = null;
        abortRef.current = null;
        setIsGenerating(false);
      }

      if (outcome === 'complete' && accumulated.trim()) {
        speakIfAuto(assistantId, accumulated);
      }
    }
  }

  function handleSend(rawText) {
    const text = rawText.trim();
    if (!text || isGenerating) return;

    stopSpeech();

    const now = new Date().toISOString();
    const conversationId = activeConversation?.id || createId();
    const userMessage = {
      id: createId(),
      role: 'user',
      content: text,
      createdAt: now,
      status: 'complete',
    };
    const assistantMessage = {
      id: createId(),
      role: 'assistant',
      content: '',
      createdAt: now,
      status: 'streaming',
    };

    const previousMessages = activeConversation?.messages || [];
    const hasUserMessage = previousMessages.some(
      (message) => message.role === 'user'
    );
    const title = hasUserMessage
      ? activeConversation?.title || titleFromPrompt(text)
      : titleFromPrompt(text);

    const updatedConversation = {
      id: conversationId,
      title,
      messages: [...previousMessages, userMessage, assistantMessage],
      createdAt: activeConversation?.createdAt || now,
      updatedAt: now,
    };

    setConversations((current) => {
      if (activeConversation) {
        return current.map((conversation) =>
          conversation.id === conversationId
            ? updatedConversation
            : conversation
        );
      }
      return [updatedConversation, ...current];
    });

    setActiveId(conversationId);
    setDraft('');
    setSidebarOpen(false);

    const history = [...previousMessages, userMessage]
      .filter(
        (message) =>
          message.content &&
          message.status !== 'error' &&
          (message.role === 'user' || message.role === 'assistant')
      )
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    streamCompletion(conversationId, history, assistantMessage.id);
  }

  function handleStop() {
    stopSpeech();
    abortRef.current?.abort();
  }

  function handleRegenerate(messageId) {
    if (isGenerating || !activeConversation) return;

    stopSpeech();

    const index = activeConversation.messages.findIndex(
      (message) => message.id === messageId
    );
    if (index === -1) return;

    const target = activeConversation.messages[index];
    if (target.role !== 'assistant') return;

    const historyMessages = activeConversation.messages
      .slice(0, index)
      .filter(
        (message) =>
          message.content &&
          message.status !== 'error' &&
          (message.role === 'user' || message.role === 'assistant')
      );

    if (!historyMessages.some((message) => message.role === 'user')) return;

    const assistantMessage = {
      id: createId(),
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      status: 'streaming',
    };

    setConversations((current) =>
      current.map((conversation) => {
        if (conversation.id !== activeConversation.id) return conversation;
        return {
          ...conversation,
          messages: [
            ...conversation.messages.slice(0, index),
            assistantMessage,
          ],
          updatedAt: new Date().toISOString(),
        };
      })
    );

    streamCompletion(
      activeConversation.id,
      historyMessages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      assistantMessage.id
    );
  }

  function handleSelectChat(id) {
    if (id !== activeId && activeRequestRef.current) {
      abortRef.current?.abort();
    }
    stopSpeech();
    setActiveId(id);
    setSidebarOpen(false);
    setDraft('');
  }

  const closeModal = useCallback(() => setModal(null), []);

  function requestRename(conversation) {
    setModal({ type: 'rename', conversation });
  }

  function requestDelete(conversation) {
    setModal({ type: 'delete', conversation });
  }

  function requestClear() {
    if (!activeConversation || activeConversation.messages.length === 0) return;
    setModal({ type: 'clear', conversation: activeConversation });
  }

  function saveRename(title) {
    const conversation = modal?.conversation;
    if (!conversation) return;

    setConversations((current) =>
      current.map((item) =>
        item.id === conversation.id ? { ...item, title } : item
      )
    );
    setModal(null);
    showToast('Conversation renamed');
  }

  function confirmDelete() {
    const conversation = modal?.conversation;
    if (!conversation) return;

    if (activeRequestRef.current?.conversationId === conversation.id) {
      abortRef.current?.abort();
    }

    const remaining = conversations.filter(
      (item) => item.id !== conversation.id
    );

    stopSpeech();
    setConversations(remaining);
    if (activeId === conversation.id) {
      setActiveId(remaining[0]?.id || null);
      setDraft('');
    }
    setModal(null);
    showToast('Conversation deleted');
  }

  function confirmClear() {
    const conversation = modal?.conversation;
    if (!conversation) return;

    if (activeRequestRef.current?.conversationId === conversation.id) {
      abortRef.current?.abort();
    }

    stopSpeech();
    setConversations((current) =>
      current.map((item) =>
        item.id === conversation.id
          ? {
              ...item,
              title: 'New chat',
              messages: [],
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );
    setDraft('');
    setModal(null);
    showToast('Conversation cleared');
  }

  function handleSuggestion(prompt) {
    setDraft(prompt);
    focusComposer();
  }

  return (
    <div className="app-shell">
      <Sidebar
        conversations={filteredConversations}
        activeId={activeId}
        search={search}
        onSearch={setSearch}
        onNewChat={startNewChat}
        onSelectChat={handleSelectChat}
        onRenameChat={requestRename}
        onDeleteChat={requestDelete}
        mobileOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
        apiStatus={apiStatus}
      />

      <button
        type="button"
        className={`sidebar-backdrop ${sidebarOpen ? 'is-visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-label="Close sidebar"
        tabIndex={sidebarOpen ? 0 : -1}
      />

      <main className="main-panel">
        <ChatHeader
          title={activeConversation?.title || 'New chat'}
          hasMessages={messages.length > 0}
          model={modelName}
          onOpenSidebar={() => setSidebarOpen(true)}
          onNewChat={startNewChat}
          onRename={() => activeConversation && requestRename(activeConversation)}
          onClear={requestClear}
        />

        {messages.length === 0 ? (
          <WelcomeView
            onSelectPrompt={handleSuggestion}
            apiStatus={apiStatus}
          />
        ) : (
          <ChatMessages
            messages={messages}
            isGenerating={isGenerating}
            onCopied={() => showToast('Copied to clipboard')}
            onRegenerate={handleRegenerate}
            onNotice={showToast}
          />
        )}

        <Composer
          value={draft}
          onChange={setDraft}
          onSend={handleSend}
          onStop={handleStop}
          isGenerating={isGenerating}
          inputRef={composerRef}
          model={modelName}
          onNotice={showToast}
        />
      </main>

      {modal?.type === 'rename' && (
        <RenameDialog
          conversation={modal.conversation}
          onClose={closeModal}
          onSave={saveRename}
        />
      )}

      {modal?.type === 'delete' && (
        <ConfirmDialog
          title="Delete this conversation?"
          description={`“${modal.conversation.title}” will be permanently removed from this device. This cannot be undone.`}
          confirmLabel="Delete conversation"
          tone="danger"
          icon="trash"
          onClose={closeModal}
          onConfirm={confirmDelete}
        />
      )}

      {modal?.type === 'clear' && (
        <ConfirmDialog
          title="Clear this conversation?"
          description="All messages in this chat will be removed. The empty chat will remain in your sidebar."
          confirmLabel="Clear messages"
          tone="danger"
          icon="clear"
          onClose={closeModal}
          onConfirm={confirmClear}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
