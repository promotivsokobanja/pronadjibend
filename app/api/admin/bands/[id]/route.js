import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { requireAdmin } from '../../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function DELETE(request, { params }) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: 'ID je obavezan.' }, { status: 400 });
  }

  try {
    const band = await prisma.band.findUnique({
      where: { id: String(id) },
      select: { id: true, name: true },
    });

    if (!band) {
      return NextResponse.json({ error: 'Bend nije pronađen.' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Delete related data in order to respect foreign key constraints
      await tx.setListItem.deleteMany({ where: { setList: { bandId: band.id } } });
      await tx.setList.deleteMany({ where: { bandId: band.id } });
      await tx.liveRequest.deleteMany({ where: { bandId: band.id } });
      await tx.busyDate.deleteMany({ where: { bandId: band.id } });
      await tx.musicianInvite.deleteMany({ where: { bandId: band.id } });
      await tx.review.deleteMany({ where: { bandId: band.id } });
      await tx.booking.deleteMany({ where: { bandId: band.id } });
      await tx.song.deleteMany({ where: { bandId: band.id } });
      await tx.midiFile.deleteMany({ where: { bandId: band.id } });
      
      // Update user to remove bandId
      if (band.id) {
        await tx.user.updateMany({ where: { bandId: band.id }, data: { bandId: null } });
      }
      
      // Finally delete the band
      await tx.band.delete({ where: { id: band.id } });
    });

    return NextResponse.json({ success: true, deletedBand: band.name });
  } catch (error) {
    console.error('admin/bands/[id] DELETE', error);
    return NextResponse.json({ error: 'Greška pri brisanju benda.' }, { status: 500 });
  }
}
