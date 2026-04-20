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
          background: #ffffff;
          width: 100%;
          max-width: 640px;
          max-height: calc(100dvh - 2rem);
          border-radius: 20px;
          box-shadow: 0 30px 80px rgba(15, 23, 42, 0.25);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-sizing: border-box;
        }
        .help-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.1rem 1.35rem;
          border-bottom: 1px solid #e2e8f0;
          background: linear-gradient(135deg, #f8fafc, #ffffff);
          flex-shrink: 0;
        }
        .help-header h2 {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.01em;
        }
        .help-close {
          border: none;
          background: #f1f5f9;
          color: #475569;
          width: 36px;
          height: 36px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: 0.15s ease;
          flex-shrink: 0;
        }
        .help-close:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .help-body {
          padding: 1.1rem 1.35rem 1.4rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .help-intro {
          margin: 0 0 0.3rem;
          color: #475569;
          font-size: 0.9rem;
          line-height: 1.55;
        }
        .help-item {
          display: flex;
          gap: 0.85rem;
          padding: 0.85rem 0.95rem;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #f8fafc;
        }
        .help-icon {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #a78bfa, #7c3aed);
          color: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .help-text {
          flex: 1;
          min-width: 0;
        }
        .help-text h3 {
          margin: 0 0 0.3rem;
          font-size: 0.92rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.25;
        }
        .help-text p {
          margin: 0;
          color: #475569;
          font-size: 0.82rem;
          line-height: 1.55;
        }
        .help-text strong {
          color: #0f172a;
          font-weight: 700;
        }
        .help-tip {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          padding: 0.8rem 0.95rem;
          border-radius: 12px;
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #1e3a8a;
          font-size: 0.82rem;
          line-height: 1.5;
        }
        .help-tip strong {
          color: #1e3a8a;
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
