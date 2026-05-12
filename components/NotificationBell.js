'use client';
import { Bell, Check, X } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';

const POLL_INTERVAL_MS = 30000;

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const r = await fetch('/api/notifications?limit=10');
      if (!r.ok) return;
      const data = await r.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const markAllRead = async () => {
    try {
      const r = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      if (r.ok) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch {}
  };

  const markOneRead = async (id) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleNotificationClick = (notif) => {
    if (!notif.read) markOneRead(notif.id);
    if (notif.link) window.location.href = notif.link;
    setIsOpen(false);
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'upravo';
    if (mins < 60) return `pre ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `pre ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `pre ${days}d`;
  };

  return (
    <div className="notif-bell-wrap" ref={dropdownRef}>
      <button
        type="button"
        className="notif-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifikacije${unreadCount > 0 ? ` (${unreadCount} nepročitanih)` : ''}`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <span className="notif-header-title">Obaveštenja</span>
            {unreadCount > 0 && (
              <button type="button" className="notif-mark-all" onClick={markAllRead}>
                <Check size={14} /> Označi sve
              </button>
            )}
          </div>
          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">Nema obaveštenja.</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${!n.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="notif-item-content">
                    <p className="notif-item-title">{n.title}</p>
                    {n.body && <p className="notif-item-body">{n.body}</p>}
                  </div>
                  <span className="notif-item-time">{timeAgo(n.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .notif-bell-wrap {
          position: relative;
          display: inline-flex;
        }
        .notif-bell-btn {
          position: relative;
          background: none;
          border: none;
          color: var(--text, #e2e8f0);
          cursor: pointer;
          padding: 0.4rem;
          border-radius: 50%;
          transition: background 0.15s;
        }
        .notif-bell-btn:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .notif-badge {
          position: absolute;
          top: 0;
          right: -2px;
          background: #ef4444;
          color: #fff;
          font-size: 0.65rem;
          font-weight: 800;
          min-width: 16px;
          height: 16px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          line-height: 1;
        }
        .notif-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 320px;
          max-height: 400px;
          background: #1e1e2e;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          z-index: 9999;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .notif-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .notif-header-title {
          font-weight: 700;
          font-size: 0.85rem;
          color: #f1f5f9;
        }
        .notif-mark-all {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.72rem;
          font-weight: 600;
          color: #8b5cf6;
          background: none;
          border: none;
          cursor: pointer;
        }
        .notif-mark-all:hover { color: #a78bfa; }
        .notif-list {
          overflow-y: auto;
          flex: 1;
        }
        .notif-empty {
          padding: 2rem 1rem;
          text-align: center;
          color: #64748b;
          font-size: 0.82rem;
        }
        .notif-item {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.7rem 1rem;
          cursor: pointer;
          transition: background 0.1s;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }
        .notif-item:hover { background: rgba(255, 255, 255, 0.04); }
        .notif-item.unread { background: rgba(139, 92, 246, 0.06); }
        .notif-item.unread::before {
          content: '';
          flex-shrink: 0;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #8b5cf6;
          margin-top: 6px;
        }
        .notif-item-content { flex: 1; min-width: 0; }
        .notif-item-title {
          font-size: 0.8rem;
          font-weight: 600;
          color: #e2e8f0;
          margin: 0;
          line-height: 1.35;
        }
        .notif-item-body {
          font-size: 0.73rem;
          color: #94a3b8;
          margin: 0.15rem 0 0;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .notif-item-time {
          font-size: 0.68rem;
          color: #64748b;
          white-space: nowrap;
          flex-shrink: 0;
          margin-top: 2px;
        }
        @media (max-width: 480px) {
          .notif-dropdown {
            position: fixed;
            top: auto;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
            max-height: 70vh;
            border-radius: 16px 16px 0 0;
            border-bottom: none;
          }
        }
      `}</style>
    </div>
  );
}
