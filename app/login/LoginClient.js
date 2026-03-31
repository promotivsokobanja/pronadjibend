'use client';

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const callbackUrl = useMemo(() => {
    const next = searchParams.get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) return next;
    return '/dashboard';
  }, [searchParams]);

  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true';

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (!result || result.error) {
      setError('Neispravan email ili lozinka.');
      return;
    }

    router.push(result.url || callbackUrl);
    router.refresh();
  }

  return (
    <section className="mx-auto w-full max-w-md space-y-4">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Pronađi Bend</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900">Prijava</h1>
        <p className="mt-2 text-sm text-slate-600">Jedinstveni auth tok preko next-auth.</p>
      </header>

      <form onSubmit={onSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-500/30 transition focus:border-cyan-500 focus:ring"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Lozinka
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-500/30 transition focus:border-cyan-500 focus:ring"
            />
          </label>
        </div>

        {error ? <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Prijava...' : 'Prijavi se'}
        </button>

        <div className="my-4 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">ili</div>

        {googleEnabled ? (
          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl })}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            Nastavi preko Google
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500"
          >
            Google prijava nije aktivna
          </button>
        )}
      </form>
    </section>
  );
}
