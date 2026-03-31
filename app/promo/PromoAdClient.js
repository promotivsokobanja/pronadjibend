'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const ACCENT = '#007AFF';

const blobMotion = (delay) => ({
  animate: {
    x: [0, 40, -30, 0],
    y: [0, -50, 30, 0],
    scale: [1, 1.15, 0.95, 1],
    opacity: [0.35, 0.55, 0.4, 0.35],
  },
  transition: {
    duration: 14 + delay * 0.4,
    repeat: Infinity,
    ease: 'easeInOut',
    delay,
  },
});

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 26, stiffness: 320 },
  },
};

const pills = ['Provereni bendovi', 'Brza rezervacija', 'Cela Srbija'];

export default function PromoAdClient() {
  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-[#030712] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      <motion.div
        className="pointer-events-none absolute -left-32 top-1/4 h-[520px] w-[520px] rounded-full blur-[120px]"
        style={{ background: ACCENT }}
        {...blobMotion(0)}
      />
      <motion.div
        className="pointer-events-none absolute -right-24 bottom-1/4 h-[480px] w-[480px] rounded-full blur-[110px]"
        style={{ background: '#6366f1' }}
        {...blobMotion(2.5)}
      />
      <motion.div
        className="pointer-events-none absolute left-1/3 top-0 h-[360px] w-[360px] -translate-x-1/2 rounded-full blur-[100px]"
        style={{ background: '#22d3ee' }}
        {...blobMotion(5)}
      />

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#030712]/40 to-[#030712]"
        aria-hidden
      />

      <Link
        href="/"
        className="absolute right-5 top-5 z-20 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-md transition hover:border-white/25 hover:bg-white/10"
      >
        Zatvori
      </Link>

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-5xl flex-col items-center justify-center px-5 py-24 text-center">
        <motion.div
          className="mb-10 w-full max-w-2xl [perspective:1200px]"
          initial={{ opacity: 0, rotateX: 18 }}
          animate={{ opacity: 1, rotateX: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.09] to-white/[0.02] p-1 shadow-[0_0_80px_-20px_rgba(0,122,255,0.55)]"
            animate={{
              rotateY: [0, 4, -3, 0],
              rotateX: [0, -2, 2, 0],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div
              className="rounded-[22px] bg-[#030712]/80 px-8 py-10 backdrop-blur-xl sm:px-12 sm:py-14"
              style={{ transform: 'translateZ(24px)' }}
            >
              <div
                className="absolute inset-0 rounded-[22px] opacity-40"
                style={{
                  background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${ACCENT}33, transparent 55%)`,
                }}
              />

              <motion.div
                className="relative"
                variants={container}
                initial="hidden"
                animate="show"
              >
                <motion.div variants={item}>
                  <span
                    className="inline-block rounded-full border border-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 sm:text-sm"
                    style={{
                      background: `${ACCENT}18`,
                      color: ACCENT,
                      boxShadow: `0 0 32px ${ACCENT}33`,
                    }}
                  >
                    Marketplace za živu muziku
                  </span>
                </motion.div>

                <motion.h1
                  variants={item}
                  className="relative mt-8 font-[family-name:var(--font-heading)] text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl"
                >
                  Pronađi{' '}
                  <span
                    className="relative inline-block"
                    style={{
                      color: ACCENT,
                      textShadow: `0 0 60px ${ACCENT}99`,
                    }}
                  >
                    Bend
                    <motion.span
                      className="absolute -inset-2 -z-10 rounded-2xl blur-xl"
                      style={{ background: ACCENT }}
                      animate={{ opacity: [0.25, 0.45, 0.25] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    />
                  </span>
                </motion.h1>

                <motion.p
                  variants={item}
                  className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg md:text-xl"
                  style={{ fontFamily: 'var(--font-body), system-ui, sans-serif' }}
                >
                  Svadbe, restorani, korporativni eventi — rezerviši proverene izvođače za nekoliko
                  klikova.
                </motion.p>

                <motion.div
                  variants={item}
                  className="mt-10 flex flex-wrap items-center justify-center gap-3"
                >
                  {pills.map((label, i) => (
                    <motion.span
                      key={label}
                      className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/95 shadow-sm backdrop-blur-md sm:text-base"
                      whileHover={{ scale: 1.04, borderColor: 'rgba(255,255,255,0.2)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      custom={i}
                    >
                      {label}
                    </motion.span>
                  ))}
                </motion.div>

                <motion.div variants={item} className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                  <Link
                    href="/clients"
                    className="inline-flex min-w-[200px] items-center justify-center rounded-2xl px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:brightness-110"
                    style={{
                      background: ACCENT,
                      boxShadow: `0 16px 48px ${ACCENT}55`,
                    }}
                  >
                    Pretraži bendove
                  </Link>
                  <Link
                    href="/"
                    className="text-sm font-semibold text-white/60 underline-offset-4 transition hover:text-white hover:underline"
                  >
                    Nazad na početnu
                  </Link>
                </motion.div>

                <motion.p
                  variants={item}
                  className="mt-10 font-[family-name:var(--font-heading)] text-sm font-bold tracking-wide text-slate-500 sm:text-base"
                >
                  pronadjibend.rs
                </motion.p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        <motion.p
          className="mt-6 max-w-md text-center text-xs text-slate-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          Najbolja živa muzika za tvoj događaj.
        </motion.p>
      </div>
    </div>
  );
}
