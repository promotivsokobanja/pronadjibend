import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { getAuthUserFromRequest } from '../../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const authUser = await getAuthUserFromRequest(request);
  if (!authUser?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const bandId = segments[segments.indexOf('bands') + 1];
  const bookingId = url.searchParams.get('bookingId');

  if (!bandId || !bookingId) {
    return NextResponse.json({ error: 'bandId and bookingId required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: { bandId: true, role: true },
  });

  if (user?.role !== 'ADMIN' && user?.bandId !== bandId) {
    return NextResponse.json({ error: 'Pristup odbijen.' }, { status: 403 });
  }

  const band = await prisma.band.findUnique({
    where: { id: bandId },
    select: { name: true, location: true, genre: true, priceRange: true },
  });

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, bandId },
  });

  if (!band || !booking) {
    return NextResponse.json({ error: 'Podaci nisu pronađeni.' }, { status: 404 });
  }

  const dateStr = booking.date
    ? new Date(booking.date).toLocaleDateString('sr-Latn', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'N/A';

  const today = new Date().toLocaleDateString('sr-Latn', { day: 'numeric', month: 'long', year: 'numeric' });

  const html = `<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="utf-8"/>
<title>Predračun — ${band.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1e293b; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #8b5cf6; padding-bottom: 20px; margin-bottom: 30px; }
  .header h1 { font-size: 28px; color: #8b5cf6; }
  .header p { color: #64748b; font-size: 13px; }
  .label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 4px; }
  .value { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  th { text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 2px solid #e2e8f0; padding: 10px 12px; }
  td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 15px; }
  .total-row td { border-top: 2px solid #8b5cf6; font-weight: 800; font-size: 18px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; text-align: center; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>PREDRAČUN</h1>
    <p>Datum izdavanja: ${today}</p>
  </div>
  <div style="text-align:right">
    <p style="font-size:18px;font-weight:800;color:#1e293b">${band.name}</p>
    <p>${band.location || ''}</p>
    <p>${band.genre || ''}</p>
  </div>
</div>

<div class="info-grid">
  <div>
    <div class="label">Klijent</div>
    <div class="value">${booking.clientName || 'N/A'}</div>
    <div class="label">Email</div>
    <div class="value">${booking.clientEmail || 'N/A'}</div>
  </div>
  <div>
    <div class="label">Datum nastupa</div>
    <div class="value">${dateStr}</div>
    <div class="label">Lokacija</div>
    <div class="value">${booking.location || 'Po dogovoru'}</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Opis</th>
      <th style="text-align:right">Cena</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Muzički nastup — ${band.name}</td>
      <td style="text-align:right">${band.priceRange || 'Po dogovoru'}</td>
    </tr>
    <tr class="total-row">
      <td>UKUPNO</td>
      <td style="text-align:right">${band.priceRange || 'Po dogovoru'}</td>
    </tr>
  </tbody>
</table>

${booking.message ? `<div style="margin-bottom:20px"><div class="label">Napomena klijenta</div><p style="color:#64748b;font-size:14px;line-height:1.5">${booking.message}</p></div>` : ''}

<div class="footer">
  <p>Ovaj dokument je generisan automatski putem platforme PronadjiBend.rs</p>
  <p style="margin-top:4px">Za pitanja kontaktirajte bend direktno.</p>
</div>

<script>window.onload=function(){window.print()}</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
