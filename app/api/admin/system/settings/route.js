import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/adminAuth';
import { getDemoBandsEnvOverrideHint, getShowDemoBands, setShowDemoBands, getMaintenanceMode, setMaintenanceMode, getKorgPaDriveUrl, setKorgPaDriveUrl, getKorgPaItems, setKorgPaItems } from '../../../../../lib/siteConfig';

export const dynamic = 'force-dynamic';

function normalizeKorgItemsPayload(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => ({
    id: String(item?.id || `korg-${index + 1}`),
    name: String(item?.name || '').trim(),
    url: String(item?.url || '').trim(),
  }));
}

export async function PATCH(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  if (getDemoBandsEnvOverrideHint()) {
    return NextResponse.json(
      {
        error:
          'SHOW_DEMO_BANDS je postavljen u .env i nadjačava ovu opciju. Uklonite ga da biste menjali prekidač iz admina.',
      },
      { status: 409 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Neispravan JSON.' }, { status: 400 });
  }

  if (typeof body.showDemoBands === 'boolean') {
    try {
      await setShowDemoBands(body.showDemoBands);
    } catch (e) {
      console.error('SiteConfig showDemoBands update:', e);
      return NextResponse.json({ error: 'Nije moguće sačuvati.' }, { status: 500 });
    }
  }

  if (typeof body.maintenanceMode === 'boolean') {
    try {
      await setMaintenanceMode(body.maintenanceMode);
    } catch (e) {
      console.error('SiteConfig maintenanceMode update:', e);
      return NextResponse.json({ error: 'Nije moguće sačuvati.' }, { status: 500 });
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'korgPaDriveUrl')) {
    const raw = body.korgPaDriveUrl;
    const normalized = String(raw || '').trim();
    if (normalized) {
      try {
        const parsed = new URL(normalized);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return NextResponse.json({ error: 'Link mora biti validan HTTP/HTTPS URL.' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: 'Google Drive link nije validan URL.' }, { status: 400 });
      }
    }
    try {
      await setKorgPaDriveUrl(normalized);
    } catch (e) {
      console.error('SiteConfig korgPaDriveUrl update:', e);
      return NextResponse.json({ error: 'Nije moguće sačuvati Google Drive link.' }, { status: 500 });
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'korgPaItems')) {
    const items = normalizeKorgItemsPayload(body.korgPaItems).filter((item) => item.name || item.url);
    for (const item of items) {
      if (!item.name) {
        return NextResponse.json({ error: 'Svaki Korg PA unos mora imati naziv.' }, { status: 400 });
      }
      if (!item.url) {
        return NextResponse.json({ error: `Unos \"${item.name}\" mora imati link.` }, { status: 400 });
      }
      try {
        const parsed = new URL(item.url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return NextResponse.json({ error: `Link za \"${item.name}\" mora biti validan HTTP/HTTPS URL.` }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: `Link za \"${item.name}\" nije validan URL.` }, { status: 400 });
      }
    }
    try {
      await setKorgPaItems(items);
    } catch (e) {
      console.error('SiteConfig korgPaItems update:', e);
      return NextResponse.json({ error: 'Nije moguće sačuvati Korg PA stavke.' }, { status: 500 });
    }
  }

  const showDemoBands = await getShowDemoBands();
  const maintenanceMode = await getMaintenanceMode();
  const korgPaDriveUrl = await getKorgPaDriveUrl();
  const korgPaItems = await getKorgPaItems();
  return NextResponse.json({ ok: true, showDemoBands, maintenanceMode, korgPaDriveUrl, korgPaItems });
}
