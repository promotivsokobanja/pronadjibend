import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getDemoBands } from '../../../lib/demoBands';

export const dynamic = 'force-dynamic';

function filterDemoBands(demos, { search, genre, location }) {
  let out = demos;
  if (search) {
    const q = search.toLowerCase();
    out = out.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.genre.toLowerCase().includes(q) ||
        b.location.toLowerCase().includes(q)
    );
  }
  if (genre && genre !== 'Svi žanrovi') {
    const g = genre.toLowerCase();
    out = out.filter((b) => b.genre.toLowerCase().includes(g));
  }
  if (location) {
    const loc = location.toLowerCase();
    out = out.filter((b) => b.location.toLowerCase().includes(loc));
  }
  return out;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get('genre');
  const location = searchParams.get('location');
  const search = searchParams.get('search');

  try {
    let dbBands = [];
    try {
      dbBands = await prisma.band.findMany({
        where: {
          AND: [
            search ? { name: { contains: search, mode: 'insensitive' } } : {},
            genre && genre !== 'Svi žanrovi'
              ? { genre: { contains: genre, mode: 'insensitive' } }
              : {},
            location ? { location: { contains: location, mode: 'insensitive' } } : {},
          ]
        },
        include: {
          reviews: true
        }
      });
    } catch (dbErr) {
      console.error('DB Error (falling back to demos only):', dbErr);
    }

    const demos = filterDemoBands(getDemoBands(), { search, genre, location });
    const combined = [...dbBands, ...demos];

    return NextResponse.json(combined);
  } catch (error) {
    console.error('API Error:', error);
    try {
      const demos = filterDemoBands(getDemoBands(), { search, genre, location });
      return NextResponse.json(demos);
    } catch {
      return NextResponse.json({ error: 'Failed to fetch bands' }, { status: 500 });
    }
  }
}
