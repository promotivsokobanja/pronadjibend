'use client';
import { useState, useEffect } from 'react';
import { X, Filter, ChevronRight } from 'lucide-react';

export default function BottomFilterSheet({ isOpen, onClose, children, title = "Filteri" }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setMounted(false), 300);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!mounted && !isOpen) return null;

  return (
    <div className={`bottom-sheet-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <div 
        className={`bottom-sheet-content ${isOpen ? 'slide-up' : 'slide-down'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="sheet-handle"></div>
        <div className="sheet-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="sheet-body">
          {children}
        </div>

        <div className="sheet-footer">
          <button className="btn btn-primary btn-full" onClick={onClose}>Prikaži rezultate</button>
        </div>
      </div>

      <style jsx>{`
        .bottom-sheet-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          z-index: 2000;
          opacity: 0;
          visibility: hidden;
          transition: 0.3s ease;
        }
        
        .bottom-sheet-overlay.active {
          opacity: 1;
          visibility: visible;
        }

        .bottom-sheet-content {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          background: #ffffff;
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          padding: 1.5rem;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 -10px 40px rgba(0,0,0,0.1);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .slide-up { transform: translateY(0); }
        .slide-down { transform: translateY(100%); }

        .sheet-handle {
          width: 40px;
          height: 4px;
          background: #e2e8f0;
          border-radius: 2px;
          margin: 0 auto 1.5rem;
        }

        .sheet-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .sheet-header h3 {
          font-weight: 700;
          font-size: 1.25rem;
          color: #0f172a;
        }

        .close-btn {
          background: #f1f5f9;
          border: none;
          color: #64748b;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .sheet-body {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 2rem;
        }

        .sheet-footer {
          padding-top: 1rem;
          border-top: 1px solid #f1f5f9;
        }

        @media (min-width: 769px) {
          .bottom-sheet-overlay { display: none; }
        }
      `}</style>
    </div>
  );
}
