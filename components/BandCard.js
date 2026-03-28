'use client';
import { Star, Zap, MapPin, Play } from 'lucide-react';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { DEFAULT_BAND_COVER, resolveBandCoverImage } from '../lib/bandImages';

export default function BandCard({ band }) {
  const videoRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current) {
      videoRef.current.play().catch(err => console.log("Autoplay blocked", err));
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      // Reset video to start maybe?
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div 
      className="card-airbnb-container h-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={`/clients/band/${band.id}`} className="card-outer-link">
        {/* Media Section (Airbnb Style) */}
        <div className="card-media">
          {/* Main Hero Image */}
          <img 
            src={resolveBandCoverImage(band)}
            alt={band.name}
            className={`hero-media-img ${isHovered && band.videoUrl ? 'hidden' : ''}`}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = DEFAULT_BAND_COVER;
            }}
          />
          
          {/* Autoplay Video Overlay (Muted) */}
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

          {/* Top Left: Demo / Equipment */}
          {(band.demo || (band.id && String(band.id).startsWith('demo-'))) && (
            <div className="media-badge demo-badge">
              Demo
            </div>
          )}
          {band.hasEquipment && (
            <div
              className={`media-badge equipment-badge ${
                band.demo || (band.id && String(band.id).startsWith('demo-')) ? 'offset-below-demo' : ''
              }`}
            >
              <Zap size={10}/> Rider OK
            </div>
          )}

          {/* Top Right: Star Rating */}
          <div className="media-badge rating-badge">
            <Star size={10} fill="currentColor" /> {band.rating?.toFixed(1) || '5.0'}
          </div>

          {/* Bottom Left: Price Overlay */}
          <div className="price-overlay">
            {band.priceRange || 'Dogovor'}
          </div>
        </div>

        {/* Info Section */}
        <div className="card-content">
          <div className="card-header">
            <h3>{band.name}</h3>
            {/* Action Icon on Hover */}
            <div className={`action-indicator ${isHovered ? 'visible' : ''}`}>
               <Play size={14} fill="currentColor"/>
            </div>
          </div>
          
          <p className="card-sub-info">
            <MapPin size={12}/> {band.location} • {band.genre}
          </p>

          <div className="card-tags">
            <span className="chip-tag">#Pop</span>
            <span className="chip-tag">#Rock</span>
            <span className="chip-tag">#PremiumSound</span>
          </div>
        </div>
      </Link>

      <style jsx>{`
        .card-airbnb-container {
          background: transparent;
          cursor: pointer;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .card-outer-link {
          display: block;
          height: 100%;
          overflow: hidden;
          border-radius: 16px;
        }

        /* 16px Radius - Airbnb Standard */
        .card-media {
          position: relative;
          aspect-ratio: 1 / 1.1;
          border-radius: 16px;
          overflow: hidden;
          background: #121214;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          margin-bottom: 12px;
        }

        .hero-media-img, .hero-media-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: opacity 0.5s ease;
        }

        .hero-media-img.hidden { opacity: 0; }
        .hero-media-video { 
          position: absolute; top: 0; left: 0; 
          opacity: 0; pointer-events: none; 
        }
        .hero-media-video.visible { opacity: 1; pointer-events: auto; }

        /* Badges Styling */
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
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
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

        /* Content Section */
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
          transition: 0.2s;
        }

        .card-airbnb-container:hover .chip-tag { opacity: 1; color: var(--accent-primary); }
        .card-airbnb-container:hover { transform: translateY(-2px); }

        @media (max-width: 768px) {
          .card-media { aspect-ratio: 1; }
          h3 { font-size: 1rem; }
        }
      `}</style>
    </div>
  );
}
