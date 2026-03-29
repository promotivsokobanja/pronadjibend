import { NextResponse } from 'next/server';

const authRateStore = new Map();

const AUTH_WINDOW_MS = 60 * 1000;
const AUTH_MAX_REQUESTS = 12;

function getClientIp(request) {
  try {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || 'unknown';
  } catch {
    return 'unknown';
  }
}

function isAuthPath(pathname) {
  return pathname === '/api/auth/login' || pathname === '/api/auth/register';
}

function shouldRateLimitAuth(request, pathname) {
  return request.method === 'POST' && isAuthPath(pathname);
}

function normalizeHostname(hostname) {
  const h = String(hostname || '').toLowerCase();
  return h.startsWith('www.') ? h.slice(4) : h;
}

function getRequestPublicOrigin(request) {
  const host = request.headers.get('host');
  if (!host) return null;
  const forwarded = request.headers.get('x-forwarded-proto');
  const scheme = forwarded
    ? forwarded.split(',')[0].trim()
    : request.headers.get('x-forwarded-ssl') === 'on'
      ? 'https'
      : request.nextUrl.protocol === 'https:'
        ? 'https'
        : request.nextUrl.protocol.replace(':', '');
  return `${scheme}://${host}`;
}

function isAllowedAuthOrigin(request, originHeader) {
  const extra = process.env.ALLOWED_AUTH_ORIGINS;
  if (extra) {
    const list = extra.split(',').map((s) => s.trim()).filter(Boolean);
    if (list.includes(originHeader)) return true;
  }

  let originUrl;
  try {
    originUrl = new URL(originHeader);
  } catch {
    return false;
  }

  const rawHost = request.headers.get('host');
  if (rawHost) {
    const hostOnly = rawHost.split(':')[0];
    if (normalizeHostname(originUrl.hostname) === normalizeHostname(hostOnly)) {
      return true;
    }
  }

  const expected = getRequestPublicOrigin(request);
  if (!expected) return false;

  let expectedUrl;
  try {
    expectedUrl = new URL(expected);
  } catch {
    return false;
  }

  if (originUrl.origin === expectedUrl.origin) return true;

  const oHost = normalizeHostname(originUrl.hostname);
  const eHost = normalizeHostname(expectedUrl.hostname);
  if (oHost !== eHost) return false;

  const fwd = request.headers.get('x-forwarded-proto');
  const expectedScheme = fwd
    ? fwd.split(',')[0].trim()
    : expectedUrl.protocol.replace(':', '');
  return originUrl.protocol.replace(':', '') === expectedScheme;
}

function enforceSameOriginForAuth(request, pathname) {
  if (!isAuthPath(pathname) || request.method !== 'POST') {
    return null;
  }

  const origin = request.headers.get('origin');
  if (!origin) {
    return null;
  }

  if (!request.headers.get('host')) {
    return NextResponse.json({ error: 'Missing Host header.' }, { status: 400 });
  }

  if (!isAllowedAuthOrigin(request, origin)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  return null;
}

function enforceAuthRateLimit(request, pathname) {
  if (!shouldRateLimitAuth(request, pathname)) {
    return null;
  }

  const ip = getClientIp(request);
  const key = `${pathname}:${ip}`;
  const now = Date.now();
  const current = authRateStore.get(key);

  if (!current || now - current.windowStart > AUTH_WINDOW_MS) {
    authRateStore.set(key, { count: 1, windowStart: now });
    return null;
  }

  if (current.count >= AUTH_MAX_REQUESTS) {
    return NextResponse.json(
      { error: 'Previše pokušaja. Pokušajte ponovo za minut.' },
      { status: 429 }
    );
  }

  current.count += 1;
  authRateStore.set(key, current);
  return null;
}

function hasAnyAuthCookie(request) {
  const c = request.cookies;
  return Boolean(
    c.get('auth-token')?.value ||
      c.get('next-auth.session-token')?.value ||
      c.get('__Secure-next-auth.session-token')?.value
  );
}

/**
 * Bezbednosni headeri samo kroz middleware — ne na `/_next/*` (CSS/JS/fontovi).
 * Ne koristiti Cross-Origin-Opener-Policy na statici (pokvarilo bi učitavanje u nekim okruženjima).
 */
function applySecurityHeaders(response) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
}

export function middleware(request) {
  try {
    const { pathname } = request.nextUrl;

    /**
     * Next statika (CSS/JS/fontovi) i fajlovi iz `public/` — bez naših headera.
     * Tako CSS/JS uvek ostaju „čisti“ (izbegnut gol HTML bez stilova na Netlify/dev).
     */
    if (
      pathname.startsWith('/_next/') ||
      pathname === '/favicon.ico' ||
      pathname.startsWith('/images/') ||
      pathname.startsWith('/marketing/')
    ) {
      return NextResponse.next();
    }

    if (pathname.startsWith('/admin')) {
      if (!hasAnyAuthCookie(request)) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', pathname);
        const redirect = NextResponse.redirect(loginUrl);
        applySecurityHeaders(redirect);
        return redirect;
      }
    }

    const sameOriginError = enforceSameOriginForAuth(request, pathname);
    if (sameOriginError) {
      applySecurityHeaders(sameOriginError);
      return sameOriginError;
    }

    const rateLimitError = enforceAuthRateLimit(request, pathname);
    if (rateLimitError) {
      applySecurityHeaders(rateLimitError);
      return rateLimitError;
    }

    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  } catch (e) {
    console.error('middleware error:', e);
    return NextResponse.next();
  }
}

/**
 * Pokreni middleware na svim rutama; u telu odmah `next()` za `/_next/*` i javne assete.
 * Regex `(?!_next)` u matcheru je na Windowsu znao da pokvari statiku — ovde ga nema.
 * `'/'` eksplicitno: neke verzije `/:path*` ne poklope samo korensku rutu.
 */
export const config = {
  matcher: ['/', '/:path*'],
};
