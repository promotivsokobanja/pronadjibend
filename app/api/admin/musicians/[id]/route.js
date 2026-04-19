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
    const musician = await prisma.musicianProfile.findUnique({
      where: { id: String(id) },
      select: { id: true, name: true },
    });

    if (!musician) {
      return NextResponse.json({ error: 'Muzičar nije pronađen.' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Delete related data in order to respect foreign key constraints
      await tx.setListItem.deleteMany({ where: { setList: { musicianProfileId: musician.id } } });
      await tx.setList.deleteMany({ where: { musicianProfileId: musician.id } });
      await tx.liveRequest.deleteMany({ where: { musicianProfileId: musician.id } });
      await tx.musicianAvailability.deleteMany({ where: { musicianId: musician.id } });
      await tx.musicianInvite.deleteMany({ where: { musicianProfileId: musician.id } });
      await tx.song.deleteMany({ where: { musicianProfileId: musician.id } });
      await tx.midiFile.deleteMany({ where: { musicianProfileId: musician.id } });
      
      // Update user to remove musicianProfileId
      if (musician.id) {
        await tx.user.updateMany({ where: { musicianProfileId: musician.id }, data: { musicianProfileId: null } });
      }
      
      // Finally delete the musician profile
      await tx.musicianProfile.delete({ where: { id: musician.id } });
    });

    return NextResponse.json({ success: true, deletedMusician: musician.name });
  } catch (error) {
    console.error('admin/musicians/[id] DELETE', error);
    return NextResponse.json({ error: 'Greška pri brisanju muzičara.' }, { status: 500 });
  }
}
