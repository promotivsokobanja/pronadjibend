'use client';

import Link from 'next/link';
import { Construction, Hammer, Lock } from 'lucide-react';

export default function UnderConstructionPage() {
  return (
    <div className="maintenance-container">
      <div className="maintenance-card">
        <div className="icon-stack">
          <Construction className="icon-main" size={64} />
          <Hammer className="icon-sub" size={32} />
        </div>
        
        <h1>Sajt je trenutno u pripremi</h1>
        <p>
          Radimo na unapređenju platforme <strong>Pronađi Bend</strong>. 
          Vraćamo se ubrzo sa novim funkcijama!
        </p>

        <div className="divider" />

        <div className="admin-access">
          <p>Admin nalog? Možete se prijaviti ovde:</p>
          <Link href="/login" className="admin-btn">
            <Lock size={16} />
            Prijava za admine
          </Link>
        </div>
      </div>

      <style jsx>{`
        .maintenance-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0f172a;
          color: #f8fafc;
          padding: 1.5rem;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .maintenance-card {
          max-width: 500px;
          width: 100%;
          background: rgba(30, 41, 59, 0.5);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(148, 163, 184, 0.1);
          padding: 3rem 2rem;
          border-radius: 24px;
          text-align: center;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .icon-stack {
          position: relative;
          display: inline-block;
          margin-bottom: 2rem;
        }
        .icon-main {
          color: #fbbf24;
        }
        .icon-sub {
          position: absolute;
          bottom: -5px;
          right: -10px;
          color: #f8fafc;
          background: #0f172a;
          padding: 4px;
          border-radius: 50%;
        }
        h1 {
          font-size: 1.875rem;
          font-weight: 800;
          margin-bottom: 1rem;
          letter-spacing: -0.025em;
        }
        p {
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 2rem;
        }
        strong {
          color: #f8fafc;
        }
        .divider {
          height: 1px;
          background: rgba(148, 163, 184, 0.1);
          margin: 2rem 0;
        }
        .admin-access p {
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }
        .admin-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #7c3aed;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
        }
        .admin-btn:hover {
          background: #6d28d9;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
