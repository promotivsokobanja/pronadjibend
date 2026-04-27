'use client';
import Image from 'next/image';
import { Star, Zap, MapPin, Play } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { DEFAULT_BAND_COVER, resolveBandCoverImage } from '../lib/bandImages';
import { nextImageShouldUnoptimize } from '../lib/remoteImage';
import SocialShareActions from './SocialShareActions';

export default function BandCard({ band, priority = false }) {
  const videoRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const resolved = resolveBandCoverImage(band);
  const [imgSrc, setImgSrc] = useState(resolved);

  useEffect(() => {
    setImgSrc(resolveBandCoverImage(band));
  }, [band]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current) {
      videoRef.current.play().then(() => setVideoPlaying(true)).catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setVideoPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const coverAlt = `${band.name} — bend za svadbe, restorane i proslave, ${band.genre}, ${band.location || 'Srbija'}`;
  const linkLabel = `${band.name}: profil benda i rezervacija — uživo muzika, ${band.location || 'Srbija'}`;

  return (
    <div
      className="card-airbnb-container h-full min-w-0 max-w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={`/clients/band/${band.id}`} className="card-outer-link" aria-label={linkLabel}>
        <div className="card-media">
          <Image
            src={imgSrc}
            alt={coverAlt}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className={`hero-media-img max-w-full object-cover ${videoPlaying ? 'hidden' : ''}`}
            priority={priority}
            unoptimized={nextImageShouldUnoptimize(imgSrc)}
            onError={() => {
              setImgSrc(DEFAULT_BAND_COVER);
            }}
          />

          {band.videoUrl && (
            <video
              ref={videoRef}
              src={band.videoUrl}
              muted
              loop
              playsInline
              className={`hero-media-video ${isHovered ? 'visible' : ''}`}
            />
          )}

          {band.isPaid ? (
            <div className="pro-label" aria-label="PRO bend">
              PRO
            </div>
          ) : null}

          {(band.demo || (band.id && String(band.id).startsWith('demo-'))) && (
            <div className="media-badge demo-badge">Demo</div>
          )}
          {band.hasEquipment && (
            <div
              className={`media-badge equipment-badge ${
                band.demo || (band.id && String(band.id).startsWith('demo-')) ? 'offset-below-demo' : ''
              }`}
            >
              <Zap size={10} /> Rider OK
            </div>
          )}

          <div className="media-badge rating-badge">
            <Star size={10} fill="currentColor" /> {band.rating?.toFixed(1) || '5.0'}
          </div>

          <div className="price-overlay">{band.priceRange || 'Dogovor'}</div>
        </div>

        <div className="card-content">
          <div className="card-header">
            <h3>{band.name}</h3>
            <div className={`action-indicator ${isHovered ? 'visible' : ''}`}>
              <Play size={14} fill="currentColor" />
            </div>
          </div>

          <p className="card-sub-info">
            <MapPin size={12} /> {band.location} • {band.genre}
          </p>

          <div className="card-tags">
            {band.genre && (
              <span className="chip-tag">#{band.genre}</span>
            )}
            {band.location && (
              <span className="chip-tag">#{band.location}</span>
            )}
            <span className="chip-tag chip-tag-premium">#Premium</span>
          </div>
        </div>
      </Link>

      <div className="card-share-actions" onClick={(e) => e.stopPropagation()}>
        <SocialShareActions
          compact
          url={`/clients/band/${band.id}`}
          title={`${band.name} — Pronađi Bend`}
          text={`Pogledaj profil benda ${band.name} na platformi Pronađi Bend.`}
        />
      </div>

      <style jsx>{`
        .card-airbnb-container {
          background: transparent;
          cursor: pointer;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }

        .card-outer-link {
          display: block;
          height: 100%;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow: hidden;
          border-radius: 16px;
        }

        .card-media {
          position: relative;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          aspect-ratio: 1 / 1.1;
          border-radius: 16px;
          overflow: hidden;
          background: #121214;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          margin-bottom: 12px;
        }

        .hero-media-img,
        .hero-media-video {
          max-width: 100%;
          transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), filter 0.5s ease;
        }

        .card-airbnb-container:hover .hero-media-img {
          transform: scale(1.04);
          filter: brightness(1.08);
        }

        .hero-media-img.hidden {
          opacity: 0;
        }
        .hero-media-video {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          max-width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          pointer-events: none;
        }
        .hero-media-video.visible {
          opacity: 1;
          pointer-events: auto;
        }

        .pro-label {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          padding: 4px 10px;
          border-radius: 100px;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #0a0a0b;
          border: 1px solid rgba(255, 255, 255, 0.35);
          z-index: 11;
          pointer-events: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .media-badge {
          position: absolute;
          top: 12px;
          padding: 6px 12px;
          border-radius: 100px;
          font-size: 0.7rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 4px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 10;
        }

        .demo-badge {
          left: 12px;
          background: rgba(0, 122, 255, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.35);
          color: #fff;
        }

        .equipment-badge {
          left: 12px;
          top: 12px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
        }

        .equipment-badge.offset-below-demo {
          top: 44px;
        }

        .rating-badge {
          right: 12px;
          background: white;
          color: black;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .price-overlay {
          position: absolute;
          bottom: 12px;
          left: 12px;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          color: white;
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.85rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .card-content {
          padding-left: 4px;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        h3 {
          font-size: 1.1rem;
          font-weight: 800;
          margin: 0;
          color: var(--text);
          letter-spacing: -0.01em;
        }

        .action-indicator {
          opacity: 0;
          transform: translateX(-10px);
          transition: 0.3s ease;
          color: var(--accent-primary);
        }

        .action-indicator.visible {
          opacity: 1;
          transform: translateX(0);
        }

        .card-sub-info {
          font-size: 0.9rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 10px;
          font-weight: 500;
        }

        .card-tags {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .chip-tag {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          opacity: 0.6;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          padding: 4px 10px;
          border-radius: 100px;
          background: rgba(148, 163, 184, 0.1);
        }

        .chip-tag-premium {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(0, 122, 255, 0.15) 100%);
          color: #8b5cf6;
          font-weight: 700;
        }

        .card-airbnb-container:hover .chip-tag {
          opacity: 1;
          color: var(--accent-primary);
          transform: translateY(-2px);
        }

        .card-airbnb-container:hover .chip-tag-premium {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(0, 122, 255, 0.25) 100%);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
        }
        .card-airbnb-container:hover {
          transform: translateY(-6px);
        }

        .card-airbnb-container:hover .card-media {
          box-shadow: 0 12px 28px rgba(139, 92, 246, 0.15), 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .card-share-actions {
          margin-top: 0.4rem;
          padding-left: 0.25rem;
        }

        @media (max-width: 768px) {
          .card-media {
            aspect-ratio: 1;
          }
          h3 {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
