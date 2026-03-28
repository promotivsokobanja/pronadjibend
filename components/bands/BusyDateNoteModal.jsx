'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const MAX = 200;

export default function BusyDateNoteModal({
  open,
  mode,
  dateLabel,
  initialNote = '',
  loading,
  onClose,
  onSave,
  onRemove,
}) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) setNote(initialNote || '');
  }, [open, initialNote]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(note.slice(0, MAX));
  };

  return (
    <div className="bdnm-backdrop" role="presentation" onClick={() => !loading && onClose()}>
      <div
        className="bdnm-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bdnm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bdnm-head">
          <h2 id="bdnm-title" className="bdnm-title">
            {mode === 'add' ? 'Označi zauzeće' : 'Podsetnik za datum'}
          </h2>
          <button type="button" className="bdnm-x" onClick={() => !loading && onClose()} aria-label="Zatvori">
            <X size={20} />
          </button>
        </div>
        <p className="bdnm-date">{dateLabel}</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="bdnm-note" className="bdnm-label">
            Kratka napomena (opciono)
          </label>
          <textarea
            id="bdnm-note"
            className="bdnm-textarea"
            rows={3}
            maxLength={MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="npr. rezervacija restoran X, proba…"
            disabled={loading}
          />
          <p className="bdnm-counter">
            {note.length}/{MAX}
          </p>
          <div className="bdnm-actions">
            {mode === 'edit' && onRemove ? (
              <button type="button" className="bdnm-btn bdnm-btn-danger" disabled={loading} onClick={() => onRemove()}>
                Ukloni zauzeće
              </button>
            ) : null}
            <button type="button" className="bdnm-btn bdnm-btn-muted" disabled={loading} onClick={onClose}>
              Otkaži
            </button>
            <button type="submit" className="bdnm-btn bdnm-btn-primary" disabled={loading}>
              {loading ? 'Čuvanje…' : mode === 'add' ? 'Sačuvaj zauzeće' : 'Sačuvaj napomenu'}
            </button>
          </div>
        </form>
      </div>
      <style jsx>{`
        .bdnm-backdrop {
          position: fixed;
          inset: 0;
          z-index: 10050;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 1rem;
          padding-bottom: max(1rem, env(safe-area-inset-bottom));
        }
        @media (min-width: 520px) {
          .bdnm-backdrop {
            align-items: center;
            padding: 1.5rem;
          }
        }
        .bdnm-panel {
          width: 100%;
          max-width: 420px;
          background: #fff;
          border-radius: 20px 20px 16px 16px;
          box-shadow: 0 24px 48px rgba(15, 23, 42, 0.18);
          padding: 1.25rem 1.25rem 1.1rem;
          border: 1px solid #e2e8f0;
        }
        @media (min-width: 520px) {
          .bdnm-panel {
            border-radius: 20px;
          }
        }
        .bdnm-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 0.35rem;
        }
        .bdnm-title {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #0f172a;
        }
        .bdnm-x {
          flex-shrink: 0;
          border: none;
          background: #f1f5f9;
          color: #64748b;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bdnm-x:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .bdnm-date {
          margin: 0 0 1rem;
          font-size: 0.9rem;
          font-weight: 700;
          color: #007aff;
        }
        .bdnm-label {
          display: block;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
          margin-bottom: 0.4rem;
        }
        .bdnm-textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.65rem 0.75rem;
          font-size: 0.9rem;
          font-weight: 500;
          color: #0f172a;
          resize: vertical;
          min-height: 4.5rem;
          font-family: inherit;
        }
        .bdnm-textarea:focus {
          outline: none;
          border-color: #007aff;
          box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
        }
        .bdnm-counter {
          margin: 0.35rem 0 0;
          font-size: 0.7rem;
          color: #94a3b8;
          text-align: right;
        }
        .bdnm-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 1rem;
          justify-content: flex-end;
        }
        .bdnm-btn {
          border-radius: 999px;
          padding: 0.55rem 1rem;
          font-size: 0.8125rem;
          font-weight: 700;
          cursor: pointer;
          border: none;
          transition: opacity 0.2s;
        }
        .bdnm-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .bdnm-btn-primary {
          background: #007aff;
          color: #fff;
        }
        .bdnm-btn-muted {
          background: #f1f5f9;
          color: #475569;
        }
        .bdnm-btn-danger {
          background: #fff;
          color: #dc2626;
          border: 1px solid #fecaca;
          margin-right: auto;
        }
        .bdnm-btn-danger:hover:not(:disabled) {
          background: #fef2f2;
        }
      `}</style>
    </div>
  );
}
