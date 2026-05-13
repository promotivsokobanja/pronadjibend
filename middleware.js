import { NextResponse } from 'next/server';

const authRateStore = new Map();
const bookingPostStore = new Map();
const messagesPostStore = new Map();
const invitesPostStore = new Map();

let maintenanceCachedValue = null;
let maintenanceCachedAt = 0;
const MAINTENANCE_CACHE_TTL_MS = 30 * 1000;

const AUTH_WINDOW_MS = 60 * 1000;
const AUTH_MAX_REQUESTS = 12;

const BOOKING_WINDOW_MS = 60 * 1000;
const BOOKING_MAX_PER_WINDOW = 25;

const MESSAGES_WINDOW_MS = 60 * 1000;
const MESSAGES_MAX_PER_WINDOW = 30;

const INVITES_WINDOW_MS = 60 * 1000;
const INVITES_MAX_PER_WINDOW = 10;

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

function isSensitiveAuthPath(pathname) {
  return [
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/resend-verification',
    '/api/auth/change-password',
  ].includes(pathname);
}

function shouldRateLimitAuth(request, pathname) {
  return request.method === 'POST' && (isAuthPath(pathname) || isSensitiveAuthPath(pathname));
}

function shouldRateLimitBookingPost(request, pathname) {
  return request.method === 'POST' && pathname === '/api/bookings';
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

function enforceBookingPostRateLimit(request, pathname) {
  if (!shouldRateLimitBookingPost(request, pathname)) {
    return null;
  }

  const ip = getClientIp(request);
  const key = `booking:${ip}`;
  const now = Date.now();
  const current = bookingPostStore.get(key);

  if (!current || now - current.windowStart > BOOKING_WINDOW_MS) {
    bookingPostStore.set(key, { count: 1, windowStart: now });
    return null;
  }

  if (current.count >= BOOKING_MAX_PER_WINDOW) {
    return NextResponse.json(
      { error: 'Previše upita u kratkom roku. Pokušajte ponovo za minut.' },
      { status: 429 }
    );
  }

  current.count += 1;
  bookingPostStore.set(key, current);
  return null;
}

function enforceMessagesPostRateLimit(request, pathname) {
  if (request.method !== 'POST' || pathname !== '/api/messages') return null;

  const ip = getClientIp(request);
  const key = `msg:${ip}`;
  const now = Date.now();
  const current = messagesPostStore.get(key);

  if (!current || now - current.windowStart > MESSAGES_WINDOW_MS) {
    messagesPostStore.set(key, { count: 1, windowStart: now });
    return null;
  }

  if (current.count >= MESSAGES_MAX_PER_WINDOW) {
    return NextResponse.json(
      { error: 'Previše poruka u kratkom roku. Sačekajte minut.' },
      { status: 429 }
    );
  }

  current.count += 1;
  messagesPostStore.set(key, current);
  return null;
}

function enforceInvitesPostRateLimit(request, pathname) {
  if (request.method !== 'POST' || pathname !== '/api/musicians/invites') return null;

  const ip = getClientIp(request);
  const key = `inv:${ip}`;
  const now = Date.now();
  const current = invitesPostStore.get(key);

  if (!current || now - current.windowStart > INVITES_WINDOW_MS) {
    invitesPostStore.set(key, { count: 1, windowStart: now });
    return null;
  }

  if (current.count >= INVITES_MAX_PER_WINDOW) {
    return NextResponse.json(
      { error: 'Previše poziva u kratkom roku. Pokušajte ponovo za minut.' },
      { status: 429 }
    );
  }

  current.count += 1;
  invitesPostStore.set(key, current);
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
 * Headeri za odgovore koje middleware vraća (admin redirect, API greške).
 * Globalni headere za HTML/API stranice (bez `/_next/*`) definiše `next.config.mjs` → `headers()`.
 */
function applySecurityHeaders(response) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
      "connect-src 'self' https://*.supabase.co https://gleitz.github.io",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
}

/**
 * Dekodira JWT payload iz auth-token cookie-ja (bez verifikacije potpisa).
 * Koristi se samo za brzu proveru role u middleware-u; prava autorizacija
 * se radi server-side u API rutama.
 */
function getAdminRoleFromCookie(request) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(padded));
    return payload?.role === 'ADMIN';
  } catch {
    return false;
  }
}

const MAINTENANCE_PATHS = [
  '/',
  '/about',
  '/bands',
  '/clients',
  '/faq',
  '/live',
  '/muzicari',
  '/premium',
  '/privatnost',
  '/uslovi-koriscenja',
];

function isMaintenancePath(pathname) {
  return MAINTENANCE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(request) {
  try {
    const { pathname } = request.nextUrl;

    // ── Maintenance mode gate ──────────────────────────────────
    if (isMaintenancePath(pathname) && !getAdminRoleFromCookie(request)) {
      try {
        const now = Date.now();
        let isMaintenanceActive = maintenanceCachedValue;

        if (maintenanceCachedValue === null || now - maintenanceCachedAt > MAINTENANCE_CACHE_TTL_MS) {
          const statusUrl = new URL('/api/site/maintenance', request.url);
          const statusRes = await fetch(statusUrl, { cache: 'no-store' });
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            isMaintenanceActive = Boolean(statusData?.maintenanceMode);
            maintenanceCachedValue = isMaintenanceActive;
            maintenanceCachedAt = now;
          }
        }

        if (isMaintenanceActive) {
          const maintenanceUrl = new URL('/under-construction', request.url);
          const redir = NextResponse.redirect(maintenanceUrl);
          applySecurityHeaders(redir);
          return redir;
        }
      } catch {
        // Ako provera ne uspe, pustimo korisnika kroz (fail open)
      }
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

    const bookingLimitError = enforceBookingPostRateLimit(request, pathname);
    if (bookingLimitError) {
      applySecurityHeaders(bookingLimitError);
      return bookingLimitError;
    }

    const messagesLimitError = enforceMessagesPostRateLimit(request, pathname);
    if (messagesLimitError) {
      applySecurityHeaders(messagesLimitError);
      return messagesLimitError;
    }

    const invitesLimitError = enforceInvitesPostRateLimit(request, pathname);
    if (invitesLimitError) {
      applySecurityHeaders(invitesLimitError);
      return invitesLimitError;
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
 * Samo rute gde je logika neophodna. Široki `/:path*` na Windowsu + next dev često pokvari
 * učitavanje `/_next/static` → stranice bez CSS-a. Javne stranice (/clients, /, …) ne ulaze u middleware.
 */
export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/api/auth/login',
    '/api/auth/register',
    '/api/bookings',
    '/api/bookings/:path*',
    '/api/messages',
    '/api/musicians/invites',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/resend-verification',
    '/api/auth/change-password',
  ],
};
