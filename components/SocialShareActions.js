'use client';

import { Check, Copy, Facebook, Instagram, MessageCircle, Share2 } from 'lucide-react';
import { useMemo, useState } from 'react';

function resolveShareUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) {
    if (typeof window !== 'undefined') return window.location.href;
    return '';
  }
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/') && typeof window !== 'undefined') {
    return `${window.location.origin}${raw}`;
  }
  return raw;
}

export default function SocialShareActions({
  url,
  title = 'Pronađi Bend',
  text = 'Pogledaj ovaj profil na platformi Pronađi Bend.',
  compact = false,
  className = '',
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl = useMemo(() => resolveShareUrl(url), [url]);

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(`${text} ${shareUrl}`.trim());

  const whatsappLink = `https://wa.me/?text=${encodedText}`;
  const facebookLink = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const viberLink = `viber://forward?text=${encodedText}`;

  const handleCopy = async () => {
    if (!shareUrl || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleInstagramShare = async () => {
    await handleCopy();
    if (typeof window !== 'undefined') {
      window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    }
  };

  const handleNativeShare = async () => {
    if (!shareUrl || typeof navigator === 'undefined') return;
    if (!navigator.share) {
      handleCopy();
      return;
    }
    try {
      await navigator.share({
        title,
        text,
        url: shareUrl,
      });
    } catch {
      // ignore cancel/share errors
    }
  };

  return (
    <div className={`share-wrap ${compact ? 'compact' : ''} ${className}`.trim()}>
      <button type="button" className="share-btn primary" onClick={handleNativeShare}>
        <Share2 size={14} />
        {!compact ? 'Podeli' : null}
      </button>

      <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="share-btn" aria-label="Podeli na WhatsApp">
        <MessageCircle size={14} />
        {!compact ? 'WhatsApp' : null}
      </a>

      <a href={facebookLink} target="_blank" rel="noopener noreferrer" className="share-btn" aria-label="Podeli na Facebook">
        <Facebook size={14} />
        {!compact ? 'Facebook' : null}
      </a>

      <a href={viberLink} className="share-btn" aria-label="Podeli na Viber">
        <MessageCircle size={14} />
        {!compact ? 'Viber' : null}
      </a>

      <button type="button" className="share-btn" onClick={handleInstagramShare}>
        <Instagram size={14} />
        {!compact ? 'Instagram' : null}
      </button>

      <button type="button" className="share-btn" onClick={handleCopy}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {!compact ? (copied ? 'Kopirano' : 'Kopiraj') : null}
      </button>

      <style jsx>{`
        .share-wrap {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.4rem;
        }
        .share-btn {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          color: rgba(226, 232, 240, 0.75);
          height: 34px;
          min-width: 34px;
          padding: 0 0.72rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease, transform 0.16s ease;
        }
        .share-btn:hover {
          border-color: rgba(139, 92, 246, 0.4);
          background: rgba(139, 92, 246, 0.12);
          color: #c4b5fd;
          transform: translateY(-1px);
        }
        .share-btn.primary {
          border-color: rgba(139, 92, 246, 0.35);
          background: rgba(139, 92, 246, 0.12);
          color: #c4b5fd;
        }
        .compact .share-btn {
          padding: 0;
          width: 34px;
        }
      `}</style>
    </div>
  );
}
