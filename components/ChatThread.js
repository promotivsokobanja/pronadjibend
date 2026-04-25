'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Send, Trash2 } from 'lucide-react';

function ChatThread({ inviteId }) {
  const [messages, setMessages] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const messagesRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const pollRef = useRef(null);

  const loadMessages = useCallback(async () => {
    if (!inviteId) return;
    const messagesEl = messagesRef.current;
    if (messagesEl) {
      const distanceFromBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight;
      shouldAutoScrollRef.current = distanceFromBottom < 56;
    }
    try {
      const r = await fetch(`/api/messages?inviteId=${inviteId}`, { cache: 'no-store' });
      const j = await r.json();
      if (r.status === 401) {
        setLocked(false);
        setError(j.error || 'Morate biti prijavljeni.');
        return;
      }
      if (r.status === 403) {
        setLocked(true);
        setError(j.error || 'Chat nije dostupan.');
        return;
      }
      if (!r.ok) {
        setError(j.error || 'Greška');
        return;
      }
      setMessages(j.messages || []);
      setCurrentUserId(j.currentUserId);
      setError('');
      setLocked(false);
    } catch {
      setError('Greška pri učitavanju poruka.');
    }
  }, [inviteId]);

  useEffect(() => {
    loadMessages();
    pollRef.current = setInterval(loadMessages, 5000);
    return () => clearInterval(pollRef.current);
  }, [loadMessages]);

  useEffect(() => {
    const messagesEl = messagesRef.current;
    if (!messagesEl) return;
    if (shouldAutoScrollRef.current) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending || locked) return;
    setSending(true);
    setError('');
    try {
      const r = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, body }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || 'Greška pri slanju.');
        return;
      }
      setText('');
      shouldAutoScrollRef.current = true;
      setMessages((prev) => [...prev, j.message]);
    } catch {
      setError('Greška pri slanju poruke.');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (messageId) => {
    if (!messageId || deletingId) return;
    setDeletingId(messageId);
    setError('');
    try {
      const r = await fetch(`/api/messages?messageId=${messageId}`, {
        method: 'DELETE',
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || 'Greška pri brisanju poruke.');
        return;
      }
      setMessages((prev) => prev.map((msg) => (msg.id === messageId ? j.message : msg)));
    } catch {
      setError('Greška pri brisanju poruke.');
    } finally {
      setDeletingId('');
    }
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return time;
    return `${d.toLocaleDateString('sr-RS', { day: 'numeric', month: 'short' })} ${time}`;
  };

  const isDeletedMessage = (msg) => msg?.body === 'Poruka je obrisana';

  if (locked) {
    return (
      <div className="chat-thread">
        <div className="chat-locked">
          <p>🔒 {error || 'Chat je dostupan samo za Premium članove.'}</p>
        </div>
        <style jsx>{chatStyles}</style>
      </div>
    );
  }

  return (
    <div className="chat-thread">
      <div className="chat-header">
        <span className="chat-title">Poruke</span>
        <span className="chat-count">{messages.length}</span>
      </div>

      <div className="chat-messages" ref={messagesRef}>
        {messages.length === 0 && !error && (
          <div className="chat-empty">Još nema poruka. Započnite konverzaciju.</div>
        )}
        {messages.map((msg) => {
          const isMine = msg.senderId === currentUserId;
          const isDeleted = isDeletedMessage(msg);
          return (
            <div key={msg.id} className={`chat-bubble ${isMine ? 'mine' : 'theirs'} ${isDeleted ? 'deleted' : ''}`}>
              <div className="chat-bubble-body">{msg.body}</div>
              <div className="chat-bubble-meta">
                {!isMine && <span className="chat-sender">{msg.sender?.email?.split('@')[0]}</span>}
                <span className="chat-time">{formatTime(msg.createdAt)}</span>
                {isMine && !isDeleted && (
                  <button
                    type="button"
                    className="chat-delete-btn"
                    onClick={() => handleDelete(msg.id)}
                    disabled={deletingId === msg.id}
                    title="Obriši poruku"
                    aria-label="Obriši poruku"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && <div className="chat-error">{error}</div>}

      <form className="chat-input-row" onSubmit={handleSend}>
        <input
          type="text"
          className="chat-input"
          placeholder="Napišite poruku..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          disabled={sending}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={!text.trim() || sending}
          aria-label="Pošalji"
        >
          <Send size={16} />
        </button>
      </form>

      <style jsx>{chatStyles}</style>
    </div>
  );
}

const chatStyles = `
  .chat-thread {
    display: flex;
    flex-direction: column;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #fff;
    overflow: hidden;
    max-height: 420px;
    margin-top: 1rem;
  }
  .chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.65rem 1rem;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }
  .chat-title {
    font-weight: 700;
    font-size: 0.85rem;
    color: #334155;
  }
  .chat-count {
    font-size: 0.72rem;
    color: #94a3b8;
    background: #f1f5f9;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 600;
  }
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-height: 120px;
    max-height: 280px;
    scrollbar-width: thin;
  }
  .chat-empty {
    text-align: center;
    color: #94a3b8;
    font-size: 0.82rem;
    padding: 2rem 0;
  }
  .chat-bubble {
    max-width: 80%;
    padding: 0.55rem 0.75rem;
    border-radius: 12px;
    font-size: 0.85rem;
    line-height: 1.45;
    word-break: break-word;
  }
  .chat-bubble.mine {
    align-self: flex-end;
    background: #3b82f6;
    color: #fff;
    border-bottom-right-radius: 4px;
  }
  .chat-bubble.theirs {
    align-self: flex-start;
    background: #f1f5f9;
    color: #1e293b;
    border-bottom-left-radius: 4px;
  }
  .chat-bubble.deleted {
    background: #f8fafc;
    color: #94a3b8;
    border: 1px dashed #cbd5e1;
    font-style: italic;
  }
  .chat-bubble-meta {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.2rem;
    font-size: 0.65rem;
    opacity: 0.7;
  }
  .chat-bubble.mine .chat-bubble-meta {
    justify-content: flex-end;
    color: rgba(255, 255, 255, 0.7);
  }
  .chat-bubble.theirs .chat-bubble-meta {
    color: #94a3b8;
  }
  .chat-sender {
    font-weight: 700;
  }
  .chat-delete-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    opacity: 0.8;
    transition: background 0.15s ease, opacity 0.15s ease;
  }
  .chat-delete-btn:hover:not(:disabled) {
    background: rgba(15, 23, 42, 0.08);
    opacity: 1;
  }
  .chat-delete-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .chat-error {
    padding: 0.4rem 1rem;
    color: #ef4444;
    font-size: 0.78rem;
    background: #fef2f2;
  }
  .chat-locked {
    padding: 2rem 1rem;
    text-align: center;
    color: #64748b;
    font-size: 0.88rem;
  }
  .chat-input-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 0.75rem;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
  }
  .chat-input {
    flex: 1;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
    font-family: inherit;
    outline: none;
    background: #fff;
    transition: border-color 0.15s;
  }
  .chat-input:focus {
    border-color: #3b82f6;
  }
  .chat-send-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: none;
    background: #3b82f6;
    color: #fff;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    flex-shrink: 0;
  }
  .chat-send-btn:hover:not(:disabled) {
    background: #2563eb;
  }
  .chat-send-btn:active:not(:disabled) {
    transform: scale(0.92);
  }
  .chat-send-btn:disabled {
    background: #cbd5e1;
    cursor: not-allowed;
  }
  @media (max-width: 640px) {
    .chat-thread {
      max-height: 360px;
    }
    .chat-messages {
      max-height: 220px;
    }
    .chat-bubble {
      max-width: 90%;
    }
  }
`;

export default memo(ChatThread);
