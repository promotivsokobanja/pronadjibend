'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ClientSearchProvider } from '@/components/clients/ClientSearchContext';

export default function NotFoundClient() {
  return (
    <ClientSearchProvider>
      <Navbar />
      <main className="page-below-fixed-nav min-h-[55vh] bg-[#f8fafc]">
        <div className="container flex flex-col items-center justify-center px-4 py-16 text-center md:py-24">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#007AFF]">Greška 404</p>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">Stranica nije pronađena</h1>
          <p className="mb-2 max-w-md text-base text-slate-600">
            Adresa koju ste otvorili ne postoji na sajtu ili je uklonjena.
          </p>
          <p className="mb-8 max-w-md text-sm text-slate-500">
            Proverite URL u adresnoj traci. Početna stranica je{' '}
            <span className="font-mono text-slate-700">/</span> (npr.{' '}
            <span className="font-mono text-slate-700">http://localhost:3000</span>).
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#007AFF] px-8 text-sm font-bold text-white shadow-md shadow-[#007AFF]/30 transition hover:bg-[#0066d6]"
            >
              Na početnu
            </Link>
            <Link
              href="/clients"
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-8 text-sm font-bold text-slate-800 shadow-sm transition hover:border-[#007AFF] hover:text-[#007AFF]"
            >
              Pretraži bendove
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </ClientSearchProvider>
  );
}
