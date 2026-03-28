import prisma from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { bandId, rating, comment, author } = await request.json();

    if (!bandId || !rating || !author) {
      return NextResponse.json({ error: 'Missing rating, author or band ID' }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: {
        bandId,
        rating: parseInt(rating),
        comment,
        author
      }
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
    return NextResponse.json({ error: 'Error adding review' }, { status: 500 });
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
