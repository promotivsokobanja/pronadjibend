'use client';
import { useEffect, useRef } from 'react';

function getVisitorId() {
  if (typeof window === 'undefined') return null;
  let id = localStorage.getItem('pb_visitor_id');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('pb_visitor_id', id);
  }
  return id;
}

export default function SiteVisitTracker() {
  const sent = useRef(false);

  useEffect(() => {
    const visitorId = getVisitorId();
    if (!visitorId) return;

    const sendPing = () => {
      fetch('/api/site-visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, path: window.location.pathname }),
      }).catch(() => {});
    };

    // Send immediately on mount
    if (!sent.current) {
      sent.current = true;
      sendPing();
    }

    // Heartbeat every 60s
    const interval = setInterval(sendPing, 60_000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
