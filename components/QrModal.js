'use client';
import { QrCode, Download, Share2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QrModal({ bandId, onClose }) {
  const [liveUrl, setLiveUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [shareText, setShareText] = useState('');

  useEffect(() => {
    const url = `${window.location.origin}/live/${bandId}`;
    setLiveUrl(url);

    QRCode.toDataURL(url, {
      width: 220,
      margin: 1,
      color: {
        dark: '#111827',
        light: '#FFFFFF',
      },
    })
      .then((dataUrl) => setQrDataUrl(dataUrl))
      .catch(() => setQrDataUrl(''));
  }, [bandId]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `pronadjibend-live-${bandId}.png`;
    link.click();
  };

  const handleShare = async () => {
    if (!liveUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Pronađi Bend - Live Link',
          text: 'Pošaljite zahtev za pesmu preko live stranice:',
          url: liveUrl,
        });
      } else {
        await navigator.clipboard.writeText(liveUrl);
        setShareText('Link kopiran');
        setTimeout(() => setShareText(''), 1800);
      }
    } catch {
      // Ignore cancel/share errors.
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal glass-card">
        <button className="close-btn" onClick={onClose}><X size={24} /></button>
        
        <h2>Vaš <span className="gradient-text">Live QR Kod</span></h2>
        <p className="text-muted">Podelite ovaj kod sa gostima kako bi mogli da naručuju pesme.</p>
        
        <div className="qr-container">
          <div className="qr-box">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Live QR kod" className="qr-image" />
            ) : (
              <QrCode size={190} strokeWidth={1} />
            )}
          </div>
          <p className="url-text">{liveUrl}</p>
          {shareText && <p className="share-text">{shareText}</p>}
        </div>

        <div className="qr-actions">
          <button className="btn btn-secondary" onClick={handleDownload} disabled={!qrDataUrl}>
            <Download size={18} /> Preuzmi PNG
          </button>
          <button className="btn btn-primary" onClick={handleShare}>
            <Share2 size={18} /> Deli link
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay { 
          position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
          background: rgba(0,0,0,0.9); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center; z-index: 2000;
        }
        .modal { width: 90%; max-width: 450px; text-align: center; position: relative; padding: 3rem 2rem; }
        .close-btn { position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: #555; cursor: pointer; }
        
        h2 { margin-bottom: 0.5rem; }
        .qr-container { padding: 3rem 0; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
        
        .qr-box { 
          width: 240px; height: 240px; background: white; padding: 20px; 
          border-radius: 20px; display: flex; justify-content: center; align-items: center;
          position: relative; overflow: hidden; color: #000;
        }

        .qr-image {
          width: 190px;
          height: 190px;
          object-fit: contain;
        }
        
        .url-text { font-size: 0.8rem; color: #64748b; font-weight: 600; word-break: break-all; }
        .share-text { font-size: 0.75rem; color: #10b981; font-weight: 700; }
        .qr-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
        
        .qr-actions .btn {
          height: 46px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 0.9rem;
          border: 1px solid transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .qr-actions .btn-secondary {
          background: #ffffff;
          color: #0f172a;
          border-color: #e2e8f0;
        }

        .qr-actions .btn-secondary:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .qr-actions .btn-primary {
          background: #007aff;
          color: #ffffff;
        }

        .qr-actions .btn-primary:hover {
          background: #0369d9;
        }

        .btn:disabled { opacity: 0.55; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
