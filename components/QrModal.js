'use client';
import { QrCode, Download, FileImage, Share2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  const corner = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + corner, y);
  ctx.lineTo(x + width - corner, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + corner);
  ctx.lineTo(x + width, y + height - corner);
  ctx.quadraticCurveTo(x + width, y + height, x + width - corner, y + height);
  ctx.lineTo(x + corner, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - corner);
  ctx.lineTo(x, y + corner);
  ctx.quadraticCurveTo(x, y, x + corner, y);
  ctx.closePath();
};

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

const drawCenteredLines = (ctx, text, x, startY, maxWidth, lineHeight) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !current) {
      current = test;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  lines.forEach((line, index) => {
    ctx.fillText(line, x, startY + index * lineHeight);
  });
};

export default function QrModal({ bandId, musicianId, onClose }) {
  const ownerId = bandId || musicianId;
  const [liveUrl, setLiveUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [shareText, setShareText] = useState('');
  const [isGeneratingFlyer, setIsGeneratingFlyer] = useState(false);

  useEffect(() => {
    const url = `${window.location.origin}/live/${ownerId}`;
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
  }, [ownerId]);

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `pronadjibend-live-${ownerId}.png`;
    link.click();
  };

  const handleDownloadFlyer = async () => {
    if (!qrDataUrl || !liveUrl || isGeneratingFlyer) return;

    setIsGeneratingFlyer(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1600;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        setIsGeneratingFlyer(false);
        return;
      }

      const background = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      background.addColorStop(0, '#020617');
      background.addColorStop(0.5, '#0b1120');
      background.addColorStop(1, '#111827');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const glowLeft = ctx.createRadialGradient(180, 220, 30, 180, 220, 320);
      glowLeft.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      glowLeft.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = glowLeft;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const glowRight = ctx.createRadialGradient(900, 1340, 50, 900, 1340, 380);
      glowRight.addColorStop(0, 'rgba(14, 165, 233, 0.5)');
      glowRight.addColorStop(1, 'rgba(14, 165, 233, 0)');
      ctx.fillStyle = glowRight;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      try {
        const heroImage = await loadImage(`${window.location.origin}/images/og-cover.png`);
        ctx.save();
        drawRoundedRect(ctx, 90, 96, 900, 420, 44);
        ctx.clip();
        ctx.drawImage(heroImage, 90, 96, 900, 420);
        ctx.restore();

        const heroOverlay = ctx.createLinearGradient(0, 96, 0, 516);
        heroOverlay.addColorStop(0, 'rgba(2, 6, 23, 0.18)');
        heroOverlay.addColorStop(1, 'rgba(2, 6, 23, 0.78)');
        drawRoundedRect(ctx, 90, 96, 900, 420, 44);
        ctx.fillStyle = heroOverlay;
        ctx.fill();
      } catch {
        drawRoundedRect(ctx, 90, 96, 900, 420, 44);
        const heroFallback = ctx.createLinearGradient(90, 96, 990, 516);
        heroFallback.addColorStop(0, 'rgba(8, 47, 73, 0.8)');
        heroFallback.addColorStop(1, 'rgba(12, 74, 110, 0.55)');
        ctx.fillStyle = heroFallback;
        ctx.fill();
      }

      drawRoundedRect(ctx, 84, 86, 912, 1428, 48);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.66)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.stroke();

      drawRoundedRect(ctx, 180, 610, 720, 720, 44);
      ctx.fillStyle = 'rgba(2, 6, 23, 0.64)';
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 46px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PRONAĐI BEND • LIVE', canvas.width / 2, 214);

      ctx.font = '800 72px "Segoe UI", sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('Skeniraj QR kod', canvas.width / 2, 312);

      ctx.font = '500 36px "Segoe UI", sans-serif';
      ctx.fillStyle = '#cbd5e1';
      drawCenteredLines(
        ctx,
        'Otvorite live pesmaricu, pošaljite želju i bend odmah vidi vaš zahtev.',
        canvas.width / 2,
        388,
        760,
        46,
      );

      const qrImage = await loadImage(qrDataUrl);
      drawRoundedRect(ctx, 250, 680, 580, 580, 34);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.drawImage(qrImage, 302, 732, 476, 476);

      try {
        const logoImage = await loadImage(`${window.location.origin}/images/logo.png`);
        drawRoundedRect(ctx, 118, 118, 146, 146, 24);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fill();
        ctx.drawImage(logoImage, 136, 136, 110, 110);
      } catch {
        ctx.font = '800 34px "Segoe UI", sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText('PB', 191, 205);
      }

      ctx.textAlign = 'center';
      ctx.font = '700 38px "Segoe UI", sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('Pošalji želju za sledeću pesmu', canvas.width / 2, 1400);

      ctx.font = '500 31px "Segoe UI", sans-serif';
      ctx.fillStyle = '#94a3b8';
      drawCenteredLines(
        ctx,
        'Skeniranjem koda gosti direktno šalju narudžbine, a bend ih odmah dobija u live nastupu.',
        canvas.width / 2,
        1450,
        820,
        40,
      );

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `pronadjibend-live-flyer-${ownerId}.png`;
      link.click();
    } finally {
      setIsGeneratingFlyer(false);
    }
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
          <button className="btn btn-secondary" onClick={handleDownloadFlyer} disabled={!qrDataUrl || isGeneratingFlyer}>
            <Download size={18} /> {isGeneratingFlyer ? 'Kreiram flajer...' : 'Preuzmi QR flajer'}
          </button>
          <button className="btn btn-accent" onClick={handleDownloadQr} disabled={!qrDataUrl || isGeneratingFlyer}>
            <FileImage size={18} /> QR
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
        .qr-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; margin-top: 1rem; }
        
        .qr-actions .btn {
          min-height: 46px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 0.83rem;
          border: 1px solid transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.35rem 0.55rem;
        }

        .qr-actions .btn {
          background: linear-gradient(135deg, #0ea5e9, #0284c7);
          color: #ffffff;
          border-color: rgba(186, 230, 253, 0.35);
          box-shadow: 0 10px 20px rgba(2, 132, 199, 0.28);
        }

        .qr-actions .btn:hover:not(:disabled) {
          filter: brightness(1.05);
        }

        @media (max-width: 560px) {
          .qr-actions {
            grid-template-columns: 1fr;
          }

          .qr-actions .btn {
            font-size: 0.9rem;
          }
        }

        .btn:disabled { opacity: 0.55; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
