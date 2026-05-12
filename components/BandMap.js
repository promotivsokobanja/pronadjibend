'use client';
import { useState, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import Link from 'next/link';

// Serbian cities — comprehensive list with lat/lng
const CITY_COORDS = {
  'beograd': { lat: 44.787, lng: 20.457 },
  'novi sad': { lat: 45.267, lng: 19.833 },
  'niš': { lat: 43.321, lng: 21.896 },
  'nis': { lat: 43.321, lng: 21.896 },
  'kragujevac': { lat: 44.012, lng: 20.911 },
  'subotica': { lat: 46.100, lng: 19.667 },
  'zrenjanin': { lat: 45.382, lng: 20.382 },
  'pančevo': { lat: 44.873, lng: 20.652 },
  'pancevo': { lat: 44.873, lng: 20.652 },
  'čačak': { lat: 43.893, lng: 20.350 },
  'cacak': { lat: 43.893, lng: 20.350 },
  'kraljevo': { lat: 43.726, lng: 20.689 },
  'smederevo': { lat: 44.664, lng: 20.930 },
  'leskovac': { lat: 42.998, lng: 21.946 },
  'valjevo': { lat: 44.273, lng: 19.890 },
  'kruševac': { lat: 43.580, lng: 21.327 },
  'krusevac': { lat: 43.580, lng: 21.327 },
  'vranje': { lat: 42.551, lng: 21.900 },
  'šabac': { lat: 44.746, lng: 19.692 },
  'sabac': { lat: 44.746, lng: 19.692 },
  'užice': { lat: 43.859, lng: 19.843 },
  'uzice': { lat: 43.859, lng: 19.843 },
  'sombor': { lat: 45.774, lng: 19.112 },
  'požarevac': { lat: 44.622, lng: 21.186 },
  'pozarevac': { lat: 44.622, lng: 21.186 },
  'pirot': { lat: 43.153, lng: 22.586 },
  'zaječar': { lat: 43.904, lng: 22.285 },
  'zajecar': { lat: 43.904, lng: 22.285 },
  'kikinda': { lat: 45.830, lng: 20.462 },
  'sremska mitrovica': { lat: 44.976, lng: 19.612 },
  'jagodina': { lat: 43.977, lng: 21.261 },
  'vrnjačka banja': { lat: 43.617, lng: 20.892 },
  'vrnjacka banja': { lat: 43.617, lng: 20.892 },
  'sokobanja': { lat: 43.643, lng: 21.869 },
  'aleksinac': { lat: 43.539, lng: 21.704 },
  'paraćin': { lat: 43.857, lng: 21.404 },
  'paracin': { lat: 43.857, lng: 21.404 },
  'aranđelovac': { lat: 44.308, lng: 20.561 },
  'arandjelovac': { lat: 44.308, lng: 20.561 },
  'gornji milanovac': { lat: 44.024, lng: 20.459 },
  'loznica': { lat: 44.533, lng: 19.226 },
  'prokuplje': { lat: 43.234, lng: 21.588 },
  'novi pazar': { lat: 43.137, lng: 20.512 },
  'vršac': { lat: 45.117, lng: 21.300 },
  'vrsac': { lat: 45.117, lng: 21.300 },
  'bor': { lat: 44.075, lng: 22.096 },
  'negotin': { lat: 44.226, lng: 22.530 },
  'srbija': { lat: 44.0, lng: 21.0 },
  'zemun': { lat: 44.845, lng: 20.401 },
  'nišk': { lat: 43.321, lng: 21.896 },
  'bg': { lat: 44.787, lng: 20.457 },
  'ns': { lat: 45.267, lng: 19.833 },
};

// Map padding inside SVG
const PAD = 30;
const W = 480;
const H = 400;
const MAP_BOUNDS = { minLat: 42.2, maxLat: 46.25, minLng: 18.8, maxLng: 23.05 };

function getCityCoords(location) {
  if (!location) return null;
  const lower = location.toLowerCase().trim()
    .replace(/\s*,\s*/g, ' ')  // "Beograd, Srbija" → "beograd srbija"
    .replace(/\s+/g, ' ');
  if (CITY_COORDS[lower]) return CITY_COORDS[lower];
  // Try each word separately
  const words = lower.split(' ');
  for (const w of words) {
    if (CITY_COORDS[w]) return CITY_COORDS[w];
  }
  // Partial match
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (lower.includes(city) || city.includes(lower)) return coords;
  }
  // Fallback — place in center of Serbia
  return { lat: 44.0, lng: 21.0, fallback: true };
}

function toSvg(lat, lng) {
  const x = PAD + ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * (W - 2 * PAD);
  const y = PAD + ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * (H - 2 * PAD);
  return { x, y };
}


export default function BandMap({ bands = [] }) {
  const [hoveredCity, setHoveredCity] = useState(null);


  const cityGroups = useMemo(() => {
    const groups = {};
    for (const band of bands) {
      const coords = getCityCoords(band.location);
      if (!coords) continue;
      const key = `${coords.lat}_${coords.lng}`;
      if (!groups[key]) {
        groups[key] = { coords, city: band.location, bands: [] };
      }
      groups[key].bands.push(band);
    }
    return Object.values(groups);
  }, [bands]);

  const unmatchedCount = bands.filter(b => {
    const c = getCityCoords(b.location);
    return c && c.fallback;
  }).length;

  if (cityGroups.length === 0) {
    return (
      <div className="band-map-empty">
        <MapPin size={24} />
        <p>Nema bendova sa poznatom lokacijom za mapu.</p>
      </div>
    );
  }

  const maxCount = Math.max(1, ...cityGroups.map(g => g.bands.length));

  return (
    <div className="band-map-wrap">
      <div className="band-map-inner">
        <svg viewBox={`0 0 ${W} ${H}`} className="band-map-svg" xmlns="http://www.w3.org/2000/svg">
          {cityGroups.map((group, i) => {
            const pos = toSvg(group.coords.lat, group.coords.lng);
            const count = group.bands.length;
            const dotSize = 4 + (count / maxCount) * 6;
            const isHovered = hoveredCity === i;
            return (
              <g key={i}
                onMouseEnter={() => setHoveredCity(i)}
                onMouseLeave={() => setHoveredCity(null)}
                style={{ cursor: 'pointer' }}
              >
                {isHovered && (
                  <circle cx={pos.x} cy={pos.y} r={dotSize + 12}
                    fill="rgba(139,92,246,0.08)" style={{ transition: 'all 0.3s' }} />
                )}
                <circle cx={pos.x} cy={pos.y} r={dotSize + 4}
                  fill={isHovered ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.08)'}
                  style={{ transition: 'all 0.2s' }}
                />
                <circle
                  cx={pos.x} cy={pos.y} r={dotSize}
                  fill={isHovered ? '#8b5cf6' : '#7c3aed'}
                  style={{ transition: 'all 0.2s' }}
                />
                <text
                  x={pos.x} y={pos.y + dotSize + 11}
                  textAnchor="middle"
                  fill={isHovered ? '#f1f5f9' : '#64748b'}
                  fontSize="7" fontWeight="600" letterSpacing="0.2"
                  style={{ pointerEvents: 'none', transition: 'fill 0.2s' }}
                >
                  {group.city}
                </text>
              </g>
            );
          })}
        </svg>

        {hoveredCity !== null && cityGroups[hoveredCity] && (
          <div className="band-map-tooltip">
            <div className="bmt-header">
              <span className="bmt-city">{cityGroups[hoveredCity].city}</span>
              <span className="bmt-count">{cityGroups[hoveredCity].bands.length}</span>
            </div>
            <div className="bmt-list">
              {cityGroups[hoveredCity].bands.slice(0, 4).map((b) => (
                <Link key={b.id} href={`/clients/band/${b.id}`} className="bmt-item">
                  <span className="bmt-dot" />
                  <span className="bmt-name">{b.name}</span>
                  <span className="bmt-genre">{b.genre}</span>
                </Link>
              ))}
              {cityGroups[hoveredCity].bands.length > 4 && (
                <span className="bmt-more">+{cityGroups[hoveredCity].bands.length - 4} još</span>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .band-map-wrap {
          max-width: 420px;
          margin: 0 auto;
        }
        .band-map-inner {
          position: relative;
          background: rgba(15, 15, 25, 0.6);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 1rem 0.75rem;
        }
        .band-map-svg {
          width: 100%;
          height: auto;
          display: block;
        }
        .band-map-tooltip {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: rgba(10, 10, 20, 0.96);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 0.6rem 0.75rem;
          min-width: 160px;
          max-width: 200px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
          z-index: 10;
        }
        .bmt-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.4rem;
          padding-bottom: 0.35rem;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .bmt-city {
          font-size: 0.78rem;
          font-weight: 700;
          color: #f1f5f9;
        }
        .bmt-count {
          font-size: 0.65rem;
          font-weight: 700;
          color: #8b5cf6;
          background: rgba(139,92,246,0.12);
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
        }
        .bmt-list {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .bmt-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          text-decoration: none;
          padding: 0.15rem 0;
        }
        .bmt-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #8b5cf6;
          flex-shrink: 0;
        }
        .bmt-name {
          font-size: 0.72rem;
          color: #e2e8f0;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .bmt-genre {
          font-size: 0.6rem;
          color: #64748b;
          margin-left: auto;
          flex-shrink: 0;
        }
        .bmt-item:hover .bmt-name {
          color: #c4b5fd;
        }
        .bmt-more {
          font-size: 0.62rem;
          color: #475569;
          padding-top: 0.15rem;
        }
        .band-map-empty {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          justify-content: center;
          padding: 1.5rem;
          color: #64748b;
          font-size: 0.8rem;
        }
      `}</style>
    </div>
  );
}
