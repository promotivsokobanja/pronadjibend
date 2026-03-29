import prisma from '@/lib/prisma';
import { getDemoBands } from '@/lib/demoBands';
import { getSiteUrl } from '@/lib/siteUrl';

export default async function sitemap() {
  const baseUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/clients`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/bands`, lastModified: now, changeFrequency: 'weekly', priority: 0.75 },
    { url: `${baseUrl}/bands/profile`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/privatnost`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/uslovi-koriscenja`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  let dbBandRoutes = [];
  try {
    const bands = await prisma.band.findMany({
      select: { id: true, updatedAt: true },
    });
    dbBandRoutes = bands.map((band) => ({
      url: `${baseUrl}/clients/band/${band.id}`,
      lastModified: band.updatedAt || now,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));
  } catch {
    // DB unavailable — still serve static sitemap
  }

  let demoBandRoutes = [];
  try {
    const demos = getDemoBands();
    demoBandRoutes = demos.map((band) => ({
      url: `${baseUrl}/clients/band/${band.id}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    }));
  } catch {
    // Demo bands unavailable
  }

  return [...staticRoutes, ...dbBandRoutes, ...demoBandRoutes];
}
