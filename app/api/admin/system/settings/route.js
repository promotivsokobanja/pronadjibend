import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/adminAuth';
import {
  getBandProfileMediaLimits,
  getDemoBandsEnvOverrideHint,
  getShowDemoBands,
  setBandProfileMediaLimits,
  setShowDemoBands,
} from '../../../../../lib/siteConfig';

export const dynamic = 'force-dynamic';

export async function PATCH(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Neispravan JSON.' }, { status: 400 });
  }

  const hasDemoBandsFlag = Object.prototype.hasOwnProperty.call(body || {}, 'showDemoBands');
  const hasMediaLimits = Object.prototype.hasOwnProperty.call(body || {}, 'bandProfileMediaLimits');

  if (!hasDemoBandsFlag && !hasMediaLimits) {
    return NextResponse.json(
      { error: 'Pošaljite showDemoBands i/ili bandProfileMediaLimits.' },
      { status: 400 }
    );
  }

  if (hasDemoBandsFlag && typeof body.showDemoBands !== 'boolean') {
    return NextResponse.json({ error: 'Očekuje se showDemoBands: true | false.' }, { status: 400 });
  }

  if (hasMediaLimits) {
    const limits = body.bandProfileMediaLimits;
    if (!limits || typeof limits !== 'object') {
      return NextResponse.json({ error: 'bandProfileMediaLimits mora biti objekat.' }, { status: 400 });
    }

    const values = [limits.maxImages, limits.maxVideos, limits.maxLinks];
    if (values.some((value) => value === undefined || value === null || Number.isNaN(Number(value)))) {
      return NextResponse.json(
        { error: 'maxImages, maxVideos i maxLinks moraju biti brojevi.' },
        { status: 400 }
      );
    }
  }

  try {
    if (hasDemoBandsFlag) {
      if (getDemoBandsEnvOverrideHint()) {
        return NextResponse.json(
          {
            error:
              'SHOW_DEMO_BANDS je postavljen u .env i nadjačava ovu opciju. Uklonite ga da biste menjali prekidač iz admina.',
          },
          { status: 409 }
        );
      }
      await setShowDemoBands(body.showDemoBands);
    }

    if (hasMediaLimits) {
      await setBandProfileMediaLimits(body.bandProfileMediaLimits);
    }
  } catch (e) {
    console.error('SiteConfig update:', e);
    return NextResponse.json(
      {
        error:
          'Nije moguće sačuvati. Pokrenite migracije baze (npr. npx prisma migrate deploy) da se kreira tabela SiteConfig.',
      },
      { status: 500 }
    );
  }

  const showDemoBands = await getShowDemoBands();
  const bandProfileMediaLimits = await getBandProfileMediaLimits();
  return NextResponse.json({ ok: true, showDemoBands, bandProfileMediaLimits });
}
