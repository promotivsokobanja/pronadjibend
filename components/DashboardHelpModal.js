'use client';
import { X, Play, BookOpen, FileMusic, QrCode, Download, Pencil, Radio, Music, Calendar, Bell, Star, MessageSquare } from 'lucide-react';

/**
 * Shared help modal for band & musician control panel (Kontrolna Tabla).
 * Fully responsive — full-screen on mobile, centered dialog on tablet/desktop.
 */
export default function DashboardHelpModal({ onClose, role = 'band' }) {
  const isMusician = role === 'musician';
  return (
    <div className="help-modal-overlay" onClick={onClose}>
      <div className="help-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="help-header">
          <h2>Kako koristiti kontrolnu tablu</h2>
          <button className="help-close" onClick={onClose} aria-label="Zatvori pomoć">
            <X size={20} />
          </button>
        </div>

        <div className="help-body">
          <p className="help-intro">
            Ovo je vaš centralni panel — odavde upravljate nastupima, zahtevima gostiju, repertoarom i profilom.
            Ispod su opisi svake opcije.
          </p>

          <section className="help-item">
            <div className="help-icon"><Play size={20} /></div>
            <div className="help-text">
              <h3>Pokreni Nastup (Live zahtevi)</h3>
              <p>
                Ulazak u <strong>Live panel</strong> tokom svirke. Gosti skeniraju vaš QR kod i šalju
                zahteve za pesme — vi ih prihvatate, preskačete ili označavate kao odsvirane.
                Ima ugrađenu pesmaricu, set liste, noćni režim i zvučna obaveštenja.
              </p>
            </div>
          </section>

          <section className="help-item">
            <div className="help-icon"><BookOpen size={20} /></div>
            <div className="help-text">
              <h3>Pesmarica</h3>
              <p>
                Baza <strong>svih pesama</strong> sa sajta — tekstovi, akordi, transponovanje.
                Koristite je za vežbanje i pripremu za nastup.
              </p>
            </div>
          </section>

          {isMusician && (
            <section className="help-item">
              <div className="help-icon"><Music size={20} /></div>
              <div className="help-text">
                <h3>Moj repertoar</h3>
                <p>
                  Vaš lični izbor pesama iz pesmarice — pesme koje izvodite. Ovo je lista koju
                  gosti vide kad otvore vaš live link.
                </p>
              </div>
            </section>
          )}

          <section className="help-item">
            <div className="help-icon"><FileMusic size={20} /></div>
            <div className="help-text">
              <h3>MIDI Fajlovi</h3>
              <p>
                Biblioteka vaših <strong>MIDI matrica i sempova</strong>. Možete ih uploadovati,
                organizovati i brzo preuzeti pre nastupa.
              </p>
            </div>
          </section>

          <section className="help-item">
            <div className="help-icon"><QrCode size={20} /></div>
            <div className="help-text">
              <h3>Vaš QR Kod</h3>
              <p>
                Unikatni QR kod za goste. Skeniranjem otvaraju vašu <strong>live pesmaricu</strong> —
                pretražuju pesme, dodaju napojnicu i šalju zahtev direktno vama.
              </p>
            </div>
          </section>

          <section className="help-item">
            <div className="help-icon"><Download size={20} /></div>
            <div className="help-text">
              <h3>Poster za štampu (A4, 300 DPI)</h3>
              <p>
                Gotov <strong>flajer sa QR kodom</strong> za štampanje. Stavite ga na stolove u lokalu
                — gosti direktno šalju zahteve bez papira i lista.
              </p>
            </div>
          </section>

          <section className="help-item">
            <div className="help-icon"><Pencil size={20} /></div>
            <div className="help-text">
              <h3>Moj Profil</h3>
              <p>
                Uredite <strong>javni profil</strong> — slike, video, biografiju, cenovnik, grad,
                žanrove. To vide potencijalni klijenti kad vas pretraže.
              </p>
            </div>
          </section>

          <section className="help-item">
            <div className="help-icon"><Calendar size={20} /></div>
            <div className="help-text">
              <h3>Kalendar & Upiti / Rezervacije</h3>
              <p>
                <strong>Predstojeći upiti</strong> su zahtevi klijenata za termin. Možete ih prihvatiti,
                odbiti ili označiti kao završene. U kalendaru obeležavate zauzete dane da biste izbegli
                duple rezervacije.
              </p>
            </div>
          </section>

          <section className="help-item">
            <div className="help-icon"><Star size={20} /></div>
            <div className="help-text">
              <h3>Statistike (Digitalni repertoar / Novi upiti / Vaša ocena)</h3>
              <p>
                Brz pregled broja pesama u repertoaru, novih upita koji čekaju odgovor i vaše
                prosečne <strong>ocene</strong> od klijenata.
              </p>
            </div>
          </section>

          <div className="help-tip">
            <Bell size={16} />
            <span>
              <strong>Savet:</strong> Pre nastupa, odštampajte QR poster i proverite set liste u Live panelu.
              Za stalne klijente — uredite profil i javite dostupne datume u kalendaru.
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .help-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 1rem;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          animation: hm-fade 0.18s ease;
        }
        @keyframes hm-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .help-modal {
          background: #080816;
          width: 100%;
          max-width: 640px;
          max-height: 90dvh;
          border-radius: 24px;
          padding: 2rem 2.25rem;
          overflow-y: auto;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.08);
          animation: hm-slide 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          scrollbar-width: thin;
          scrollbar-color: rgba(139, 92, 246, 0.35) transparent;
        }
        .help-modal::-webkit-scrollbar {
          width: 6px;
        }
        .help-modal::-webkit-scrollbar-track {
          background: transparent;
        }
        .help-modal::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.35);
          border-radius: 999px;
        }
        .help-modal::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.55);
        }
        @keyframes hm-slide {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .help-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .help-header h2 {
          margin: 0;
          font-size: clamp(1.5rem, 3.4vw, 2rem);
          font-weight: 800;
          letter-spacing: -0.04em;
          color: #f8fafc;
        }
        .help-close {
          border: none;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #f8fafc;
          cursor: pointer;
        }
        .help-close:hover {
          background: rgba(255, 255, 255, 0.18);
        }
        .help-intro {
          margin: 0 0 1.25rem;
          color: rgba(226, 232, 240, 0.75);
          line-height: 1.6;
          font-size: 0.98rem;
        }
        .help-item {
          display: flex;
          gap: 1rem;
          padding: 1.25rem 0;
          border-top: 1px solid rgba(148, 163, 184, 0.18);
        }
        .help-item:first-of-type {
          border-top: none;
          padding-top: 0;
        }
        .help-icon {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          background: rgba(124, 58, 237, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #c4b5fd;
          flex-shrink: 0;
        }
        .help-text h3 {
          margin: 0 0 0.35rem;
          font-size: 1.05rem;
          color: #f8fafc;
        }
        .help-text p {
          margin: 0;
          color: rgba(226, 232, 240, 0.75);
          line-height: 1.55;
          font-size: 0.92rem;
        }
        .help-tip {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          padding: 0.8rem 0.95rem;
          border-radius: 12px;
          border: 1px solid rgba(14, 165, 233, 0.4);
          background: rgba(14, 165, 233, 0.08);
          color: #e0f2fe;
          font-size: 0.82rem;
          line-height: 1.5;
        }
        .help-tip strong {
          color: #7dd3fc;
        }

        @media (max-width: 640px) {
          .help-modal-overlay {
            padding: 0;
            align-items: stretch;
          }
          .help-modal {
            max-width: 100%;
            max-height: 100dvh;
            border-radius: 0;
            background: #050511;
          }
          .help-header {
            padding: 0.85rem 1rem;
          }
          .help-header h2 {
            font-size: 0.95rem;
          }
          .help-body {
            padding: 0.9rem 0.95rem calc(1rem + env(safe-area-inset-bottom, 0px));
          }
          .help-item {
            padding: 0.7rem 0.8rem;
            gap: 0.65rem;
          }
          .help-icon {
            width: 32px;
            height: 32px;
          }
          .help-text h3 {
            font-size: 0.88rem;
          }
          .help-text p {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
}
