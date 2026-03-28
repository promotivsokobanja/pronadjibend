'use client';

import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useClientSearch } from './ClientSearchContext';
import ClientFilterForm from './ClientFilterForm';

const NAV_TOP = 'var(--navbar-height)';

export default function ClientsNavSearchPanel() {
  const panelRef = useRef(null);
  const [inlineFiltersOpen, setInlineFiltersOpen] = useState(false);
  const {
    searchTerm,
    setSearchTerm,
    isNavSearchOpen,
    setIsNavSearchOpen,
    activeFilterCount,
  } = useClientSearch();

  useEffect(() => {
    if (!isNavSearchOpen) setInlineFiltersOpen(false);
  }, [isNavSearchOpen]);

  useEffect(() => {
    if (!isNavSearchOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setIsNavSearchOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [isNavSearchOpen, setIsNavSearchOpen]);

  useEffect(() => {
    if (!isNavSearchOpen) return;
    const onPointer = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        const t = e.target;
        if (t.closest?.('.navbar')) return;
        setIsNavSearchOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [isNavSearchOpen, setIsNavSearchOpen]);

  if (!isNavSearchOpen) return null;

  return (
    <>
      <div
        className="clients-search-backdrop"
        aria-hidden
        onClick={() => setIsNavSearchOpen(false)}
      />
      <div
        ref={panelRef}
        className="clients-search-panel"
        role="dialog"
        aria-label="Pronađi savršeni bend"
      >
        <div className="container clients-search-inner">
          <div className="clients-search-head">
            <h2 className="clients-search-title" id="clients-search-dialog-title">
              Pronađi <span className="clients-search-title-accent">savršeni bend</span>
            </h2>
            <button
              type="button"
              className="clients-search-close"
              onClick={() => setIsNavSearchOpen(false)}
              aria-label="Zatvori pretragu"
            >
              <X size={22} strokeWidth={2} />
            </button>
          </div>
          <form
            className="clients-search-form"
            onSubmit={(e) => {
              e.preventDefault();
              setIsNavSearchOpen(false);
            }}
          >
            <div className="clients-search-top-row">
              <div className="clients-search-field">
                <input
                  type="search"
                  placeholder="Grad, žanr ili naziv benda…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  className="clients-search-input"
                />
                {searchTerm ? (
                  <button
                    type="button"
                    className="clients-search-clear"
                    onClick={() => setSearchTerm('')}
                    aria-label="Obriši"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>
              <div className="clients-search-actions">
                <button
                  type="button"
                  className={`clients-filter-btn ${inlineFiltersOpen ? 'clients-filter-btn--open' : ''}`}
                  onClick={() => setInlineFiltersOpen((v) => !v)}
                  aria-expanded={inlineFiltersOpen}
                  aria-controls="clients-nav-inline-filters"
                  id="clients-nav-filter-trigger"
                  aria-label="Filteri"
                >
                  <SlidersHorizontal size={16} />
                  <span className="clients-filter-btn-label">Filteri</span>
                  {activeFilterCount > 0 ? (
                    <span className="clients-filter-badge">
                      {activeFilterCount > 9 ? '9+' : activeFilterCount}
                    </span>
                  ) : null}
                </button>
                <button type="submit" className="clients-search-submit">
                  Pretraži
                </button>
              </div>
            </div>
            {inlineFiltersOpen ? (
              <div
                id="clients-nav-inline-filters"
                className="clients-inline-filters"
                role="region"
                aria-labelledby="clients-nav-filter-trigger"
              >
                <ClientFilterForm />
              </div>
            ) : null}
          </form>
        </div>
      </div>

      <style jsx>{`
        .clients-search-backdrop {
          position: fixed;
          top: ${NAV_TOP};
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 998;
          background: rgba(15, 23, 42, 0.28);
          backdrop-filter: blur(5px);
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .clients-search-panel {
          position: fixed;
          top: ${NAV_TOP};
          left: 0;
          right: 0;
          z-index: 999;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          border-bottom: 1px solid rgba(0, 122, 255, 0.1);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
          animation: slideDown 0.26s cubic-bezier(0.16, 1, 0.3, 1);
          max-height: min(82dvh, calc(100dvh - ${NAV_TOP} - env(safe-area-inset-bottom, 0px) - 8px));
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .clients-search-inner {
          padding: 0.5rem 0 0.65rem;
          max-width: 820px;
          margin: 0 auto;
          width: 100%;
        }
        .clients-search-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 0.5rem;
        }
        .clients-search-title {
          margin: 0;
          flex: 1;
          min-width: 0;
          font-size: clamp(1rem, 4vw, 1.5rem);
          font-weight: 900;
          letter-spacing: -0.03em;
          line-height: 1.2;
          color: #0f172a;
        }
        .clients-search-close {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          margin: -4px -6px 0 0;
          border: none;
          border-radius: 12px;
          background: #f1f5f9;
          color: #475569;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        .clients-search-close:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .clients-search-title-accent {
          color: #007aff;
          font-weight: 900;
        }
        .clients-search-form {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .clients-search-top-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .clients-search-field {
          flex: 1 1 220px;
          display: flex;
          align-items: center;
          gap: 6px;
          min-height: 42px;
          padding: 0 0.75rem 0 0.9rem;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
          transition:
            border-color 0.2s,
            box-shadow 0.2s;
        }
        .clients-search-field:focus-within {
          border-color: #007aff;
          box-shadow:
            0 1px 2px rgba(15, 23, 42, 0.04),
            0 0 0 3px rgba(0, 122, 255, 0.12);
        }
        .clients-search-input {
          flex: 1;
          min-width: 0;
          border: none;
          background: transparent;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #0f172a;
          outline: none;
        }
        .clients-search-input::placeholder {
          color: #94a3b8;
          font-weight: 500;
        }
        .clients-search-clear {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 50%;
          background: #f1f5f9;
          color: #64748b;
          cursor: pointer;
        }
        .clients-search-clear:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .clients-search-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .clients-filter-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 42px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #334155;
          font-weight: 600;
          font-size: 0.8125rem;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
          transition: all 0.2s;
        }
        .clients-filter-btn:hover,
        .clients-filter-btn--open {
          border-color: #007aff;
          color: #007aff;
          background: rgba(0, 122, 255, 0.06);
        }
        .clients-filter-badge {
          position: absolute;
          top: 4px;
          right: 6px;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          border-radius: 100px;
          background: #007aff;
          color: #fff;
          font-size: 0.55rem;
          font-weight: 800;
          line-height: 16px;
          text-align: center;
        }
        .clients-search-submit {
          height: 42px;
          padding: 0 18px;
          border: none;
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.8125rem;
          color: #fff;
          cursor: pointer;
          background: #007aff;
          box-shadow: 0 2px 8px rgba(0, 122, 255, 0.35);
          transition:
            transform 0.2s,
            background 0.2s,
            box-shadow 0.2s;
        }
        .clients-search-submit:hover {
          transform: translateY(-1px);
          background: #0066d6;
          box-shadow: 0 4px 14px rgba(0, 122, 255, 0.4);
        }
        .clients-inline-filters {
          width: 100%;
          padding: 8px 10px 8px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #fff;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
          -webkit-overflow-scrolling: touch;
        }
        @media (min-width: 641px) {
          .clients-search-inner {
            padding: 0.75rem 0 0.85rem;
          }
          .clients-search-head {
            margin-bottom: 0.65rem;
          }
          .clients-search-title {
            font-size: clamp(1.15rem, 2.8vw, 1.5rem);
          }
          .clients-search-form {
            gap: 10px;
          }
          .clients-search-top-row {
            gap: 8px;
          }
          .clients-search-field {
            min-height: 46px;
            gap: 8px;
            padding: 0 0.9rem 0 1.05rem;
          }
          .clients-search-input {
            font-size: 0.875rem;
          }
          .clients-filter-btn {
            height: 46px;
            padding: 0 16px;
          }
          .clients-search-submit {
            height: 46px;
            padding: 0 22px;
          }
          .clients-inline-filters {
            padding: 10px 12px 10px;
            border-radius: 12px;
          }
        }
        @media (max-width: 640px) {
          .clients-search-inner {
            padding-left: max(0.75rem, env(safe-area-inset-left));
            padding-right: max(0.75rem, env(safe-area-inset-right));
          }
          .clients-search-top-row {
            flex-direction: column;
            align-items: stretch;
          }
          .clients-search-actions {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
          .clients-filter-btn,
          .clients-search-submit {
            width: 100%;
            height: 40px;
            font-size: 0.75rem;
          }
          .clients-filter-btn-label {
            display: none;
          }
          .clients-filter-btn {
            gap: 0;
          }
        }
      `}</style>
    </>
  );
}
