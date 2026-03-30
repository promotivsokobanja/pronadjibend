import { NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma';
import { requireAdmin } from '../../../../../../lib/adminAuth';
import { responseFromDatabaseError } from '../../../../../../lib/dbClientErrors';

export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID je obavezan.' }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').trim().toLowerCase();
    const reason = body.reason != null ? String(body.reason).trim() : '';

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Nepoznata akcija.' }, { status: 400 });
    }

    const submission = await prisma.songSubmission.findUnique({ where: { id } });
    if (!submission) {
      return NextResponse.json({ error: 'Predlog nije pronađen.' }, { status: 404 });
    }

    if (submission.status !== 'PENDING') {
      return NextResponse.json({ error: 'Predlog je već obrađen.' }, { status: 409 });
    }

    if (action === 'reject') {
      const updated = await prisma.songSubmission.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          reviewedByUserId: gate.admin.id,
          rejectReason: reason || null,
        },
      });
      return NextResponse.json({ success: true, submission: updated });
    }

    const existingGlobalSong = await prisma.song.findFirst({
      where: {
        bandId: null,
        title: { equals: submission.title, mode: 'insensitive' },
        artist: { equals: submission.artist, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existingGlobalSong) {
      const updated = await prisma.songSubmission.update({
        where: { id },
        data: {
          status: 'DUPLICATE',
          approvedSongId: existingGlobalSong.id,
          reviewedAt: new Date(),
          reviewedByUserId: gate.admin.id,
          rejectReason: reason || null,
        },
      });
      return NextResponse.json({ success: true, submission: updated, duplicate: true });
    }

    const result = await prisma.$transaction(async (tx) => {
      const createdSong = await tx.song.create({
        data: {
          title: submission.title,
          artist: submission.artist,
          lyrics: submission.lyrics,
          chords: submission.chords,
          key: submission.key,
          category: submission.category,
          type: submission.type,
          bandId: null,
        },
      });

      const updatedSubmission = await tx.songSubmission.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedSongId: createdSong.id,
          reviewedAt: new Date(),
          reviewedByUserId: gate.admin.id,
          rejectReason: null,
        },
      });

      return { createdSong, updatedSubmission };
    });

    return NextResponse.json({
      success: true,
      song: result.createdSong,
      submission: result.updatedSubmission,
    });
  } catch (error) {
    console.error('admin pesmarica submissions PATCH', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri obradi predloga.' }, { status: 500 });
  }
}
