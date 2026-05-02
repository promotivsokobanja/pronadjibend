'use client';
import { useState, useEffect, useCallback } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    try {
      const standalone =
        (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
        window.navigator.standalone === true;
      setIsStandalone(standalone);

      if (standalone) return;

      const dismissed = sessionStorage.getItem('pb_install_dismissed');
      if (dismissed) return;

      const ua = window.navigator.userAgent.toLowerCase();
      const ios = /iphone|ipad|ipod/.test(ua) && !window.MSStream;
      setIsIos(ios);

      if (ios) {
        setShowBanner(true);
        return;
      }

      const handler = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowBanner(true);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    } catch {
      // Older browsers without matchMedia support — silently skip install prompt
    }
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('pb_install_dismissed', '1');
  };

  if (isStandalone || !showBanner) return null;

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <Download size={18} className="install-icon" />
        {isIos ? (
          <p>
            Dodaj na početni ekran: tapni{' '}
            <strong style={{ fontSize: '1.1em' }}>⎙</strong> pa{' '}
            <strong>&quot;Add to Home Screen&quot;</strong>
          </p>
        ) : (
          <p>Instaliraj aplikaciju za brži pristup</p>
        )}
        {!isIos && (
          <button className="install-btn" onClick={handleInstall}>
            Instaliraj
          </button>
        )}
        <button className="install-close" onClick={dismiss} aria-label="Zatvori">
          <X size={16} />
        </button>
      </div>

      <style jsx>{`
        .install-banner {
          position: fixed;
          bottom: calc(60px + env(safe-area-inset-bottom, 0px));
          left: 0;
          right: 0;
          z-index: 9989;
          padding: 0 0.75rem 0.5rem;
          pointer-events: none;
        }
        @media (min-width: 769px) {
          .install-banner {
            bottom: 1rem;
            left: auto;
            right: 1rem;
            max-width: 380px;
          }
        }
        .install-banner-content {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.75rem 1rem;
          border-radius: 14px;
          background: rgba(15, 23, 42, 0.95);
          -webkit-backdrop-filter: blur(12px);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(139, 92, 246, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          animation: slide-up 0.3s ease;
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .install-banner-content p {
          margin: 0;
          flex: 1;
          font-size: 0.82rem;
          font-weight: 600;
          color: #e2e8f0;
          line-height: 1.35;
        }
        .install-btn {
          flex-shrink: 0;
          padding: 0.45rem 0.85rem;
          border-radius: 999px;
          border: none;
          background: #8b5cf6;
          color: #fff;
          font-size: 0.75rem;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }
        .install-btn:active {
          transform: scale(0.95);
        }
        .install-close {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          cursor: pointer;
        }
        .install-close:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #f8fafc;
        }
      `}</style>
    </div>
  );
}
