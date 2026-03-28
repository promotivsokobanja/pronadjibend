'use client';
import { useState } from 'react';

export default function ChipFilter({ categories, onSelect, activeCategory }) {
  return (
    <div className="chip-filter-container">
      <div className="chip-scroll">
        {categories.map((cat, idx) => (
          <button 
            key={idx}
            className={`chip-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => onSelect(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <style jsx>{`
        .chip-filter-container {
          padding: 1.5rem 0;
          overflow: hidden;
          width: 100%;
        }

        .chip-scroll {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 8px;
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
          scroll-snap-type: x mandatory;
        }

        .chip-scroll::-webkit-scrollbar {
          display: none;
        }

        .chip-btn {
          flex: 0 0 auto;
          padding: 8px 16px;
          border-radius: 100px;
          background: var(--glass);
          border: 1px solid var(--border);
          color: var(--text);
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: var(--transition);
          white-space: nowrap;
          scroll-snap-align: start;
        }

        .chip-btn:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .chip-btn.active {
          background: var(--text);
          color: var(--bg);
          border-color: var(--text);
        }

        @media (max-width: 768px) {
          .chip-btn {
            font-size: 0.8rem;
            padding: 6px 14px;
          }
        }
      `}</style>
    </div>
  );
}
