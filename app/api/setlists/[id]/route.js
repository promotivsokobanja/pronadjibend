import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getAuthUserFromRequest } from '../../../../lib/auth';

async function verifyOwnership(request, setListId) {
  const auth = await getAuthUserFromRequest(request);
  if (!auth?.userId) return { error: NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 }) };

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, role: true, bandId: true, musicianProfile: { select: { id: true } } },
  });
  if (!user) return { error: NextResponse.json({ error: 'Nalog ne postoji.' }, { status: 401 }) };

  const setList = await prisma.setList.findUnique({ where: { id: setListId } });
  if (!setList) return { error: NextResponse.json({ error: 'Set lista nije pronađena.' }, { status: 404 }) };

  const isAdmin = user.role === 'ADMIN';
  const ownsBand = setList.bandId && user.bandId && setList.bandId === user.bandId;
  const ownsMusician = setList.musicianProfileId && user.musicianProfile?.id && setList.musicianProfileId === user.musicianProfile.id;

  if (!isAdmin && !ownsBand && !ownsMusician) {
    return { error: NextResponse.json({ error: 'Nemate dozvolu.' }, { status: 403 }) };
  }

  return { setList, user };
}

// PATCH /api/setlists/[id] — update name, isLive, or items
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const { setList, error } = await verifyOwnership(request, id);
    if (error) return error;

    const body = await request.json();
    const updateData = {};

    if (body.name !== undefined) {
      updateData.name = String(body.name).trim() || setList.name;
    }
    if (body.isLive !== undefined) {
      updateData.isLive = Boolean(body.isLive);
    }

    // If items array is provided, replace all items
    if (Array.isArray(body.items)) {
      // Delete existing items
      await prisma.setListItem.deleteMany({ where: { setListId: id } });

      // Create new items
      if (body.items.length > 0) {
        await prisma.setListItem.createMany({
          data: body.items.map((item, index) => ({
            setListId: id,
            songId: item.songId,
            position: index,
          })),
        });
      }
    }

    const updated = await prisma.setList.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          orderBy: { position: 'asc' },
          include: { song: { select: { id: true, title: true, artist: true } } },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('PATCH /api/setlists/[id] error:', err);
    return NextResponse.json({ error: 'Greška pri ažuriranju set liste.' }, { status: 500 });
  }
}

// DELETE /api/setlists/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const { error } = await verifyOwnership(request, id);
    if (error) return error;

    await prisma.setList.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/setlists/[id] error:', err);
    return NextResponse.json({ error: 'Greška pri brisanju set liste.' }, { status: 500 });
  }
}
