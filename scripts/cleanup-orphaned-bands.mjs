import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ids = [
  'cmnhldj4b0001qvoxpl4ioyv5', // Pikaso
  'cmnsr9pdg0001y5kpiu5jkzj7', // sasa a
  'cmnt9csl30001k6g94fn2cpuh', // blabla
  'cmnes68j80001v39at88b1nv7', // Vremeplov Band Sokobanja
];

for (const id of ids) {
  const band = await prisma.band.findUnique({ where: { id }, select: { name: true, user: { select: { email: true } } } });
  if (!band) {
    console.log('SKIP (not found):', id);
    continue;
  }
  if (band.user) {
    console.log('SKIP (has user, not orphaned):', band.name, band.user.email);
    continue;
  }
  await prisma.$transaction(async (tx) => {
    await tx.setListItem.deleteMany({ where: { setList: { bandId: id } } });
    await tx.setList.deleteMany({ where: { bandId: id } });
    await tx.liveRequest.deleteMany({ where: { bandId: id } });
    await tx.busyDate.deleteMany({ where: { bandId: id } });
    await tx.musicianInvite.deleteMany({ where: { bandId: id } });
    await tx.review.deleteMany({ where: { bandId: id } });
    await tx.booking.deleteMany({ where: { bandId: id } });
    await tx.song.deleteMany({ where: { bandId: id } });
    await tx.midiFile.deleteMany({ where: { bandId: id } });
    await tx.user.updateMany({ where: { bandId: id }, data: { bandId: null } });
    await tx.band.delete({ where: { id } });
  });
  console.log('DELETED:', band.name, '(' + id + ')');
}

await prisma.$disconnect();
