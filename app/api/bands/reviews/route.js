import prisma from '../../../../lib/prisma';
import { NextResponse } from 'next/server';
import { isDemoBandId } from '../../../../lib/demoBands';

export const dynamic = 'force-dynamic';

const REVIEW_COMMENT_MAX = 250;
const AUTHOR_MIN = 2;
const AUTHOR_MAX = 80;

export async function POST(request) {
  try {
    const { bandId, rating, comment, author } = await request.json();

    if (!bandId || author == null || rating == null) {
      return NextResponse.json(
        { error: 'Nedostaju obavezni podaci (bend, ime, ocena).' },
        { status: 400 }
      );
    }

    if (isDemoBandId(bandId)) {
      return NextResponse.json(
        { error: 'Recenzije na demo profilu nisu omogućene.' },
        { status: 400 }
      );
    }

    const bandExists = await prisma.band.findUnique({
      where: { id: bandId },
      select: { id: true },
    });
    if (!bandExists) {
      return NextResponse.json({ error: 'Bend nije pronađen.' }, { status: 404 });
    }

    const authorTrim = String(author).trim();
    if (authorTrim.length < AUTHOR_MIN || authorTrim.length > AUTHOR_MAX) {
      return NextResponse.json(
        { error: `Ime mora imati između ${AUTHOR_MIN} i ${AUTHOR_MAX} karaktera.` },
        { status: 400 }
      );
    }

    const r = parseInt(String(rating), 10);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return NextResponse.json({ error: 'Ocena mora biti od 1 do 5.' }, { status: 400 });
    }

    const commentRaw = comment != null ? String(comment) : '';
    if (commentRaw.length > REVIEW_COMMENT_MAX) {
      return NextResponse.json(
        { error: `Poruka može imati najviše ${REVIEW_COMMENT_MAX} karaktera.` },
        { status: 400 }
      );
    }
    const commentStored = commentRaw.trim() || null;

    const review = await prisma.review.create({
      data: {
        bandId,
        rating: r,
        comment: commentStored,
        author: authorTrim,
      },
    });

    const allReviews = await prisma.review.findMany({
      where: { bandId }
    });

    const averageRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await prisma.band.update({
      where: { id: bandId },
      data: { rating: averageRating }
    });

    return NextResponse.json({ success: true, review, rating: averageRating });
  } catch (error) {
    console.error('Review Error:', error);
    return NextResponse.json({ error: 'Greška pri čuvanju recenzije.' }, { status: 500 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const bandId = searchParams.get('bandId');

  if (!bandId) return NextResponse.json({ error: 'Band ID required' }, { status: 400 });

  try {
    const reviews = await prisma.review.findMany({
      where: { bandId },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(reviews);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching reviews' }, { status: 500 });
  }
}
