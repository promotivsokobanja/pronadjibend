const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const songs = [
  // Domaća muzika
  { title: 'Đurđevdan', artist: 'Bijelo Dugme', key: 'Am', category: 'DOMESTIC', type: 'COVER' },
  { title: 'Lipe cvatu', artist: 'Bijelo Dugme', key: 'G', category: 'DOMESTIC', type: 'COVER' },
  { title: 'Kad bi bio bijelo dugme', artist: 'Bijelo Dugme', key: 'Em', category: 'DOMESTIC', type: 'COVER' },
  { title: 'Sve će to mila moja prekriti ruzmarin', artist: 'Bijelo Dugme', key: 'D', category: 'DOMESTIC', type: 'COVER' },
  { title: 'Pristao sam biću sve što hoće', artist: 'Bijelo Dugme', key: 'Am', category: 'DOMESTIC', type: 'COVER' },
  
  { title: 'Računajte na nas', artist: 'Azra', key: 'Em', category: 'DOMESTIC', type: 'COVER' },
  { title: 'Balkan', artist: 'Azra', key: 'Am', category: 'DOMESTIC', type: 'COVER' },
  { title: 'Lijepe žene prolaze kroz grad', artist: 'Azra', key: 'G', category: 'DOMESTIC', type: 'COVER' },
  
  { title: 'Kad hodaš', artist: 'Bajaga', key: 'G', category: 'DOMESTIC', type: 'COVER' },
  { title: 'Moji drugovi', artist: 'Bajaga', key: 'D', category: 'DOMESTIC', type: 'COVER' },
  { title: 'Tekila', artist: 'Bajaga', key: 'Am', category: 'DOMESTIC', type: 'COVER' },
  { title: 'Pozitivna geografija', artist: 'Bajaga', key: 'C', category: 'DOMESTIC', type: 'COVER' },
  
  { title: 'Lutka sa naslovne strane', artist: 'Riblja Čorba', key: 'Em', category: 'DOMESTIC', type: 'COVER' },
  { title: 'Dva dinara druže', artist: 'Riblja Čorba', key: 'Am', category: 'DOMESTIC', type: 'COVER' },
  { title: 'Pogledaj dom svoj anđele', artist: 'Riblja Čorba', key: 'G', category: 'DOMESTIC', type: 'COVER' },
  
  { title: 'Kao da me nema', artist: 'Hari Mata Hari', key: 'Am', category: 'DOMESTIC', type: 'COVER' },
  { title: 'Lejla', artist: 'Hari Mata Hari', key: 'Dm', category: 'DOMESTIC', type: 'COVER' },
  
  { title: 'Uspavanka za Radmilu M', artist: 'Đorđe Balašević', key: 'G', category: 'DOMESTIC', type: 'COVER' },
  { title: 'Priča o Vasi Ladačkom', artist: 'Đorđe Balašević', key: 'D', category: 'DOMESTIC', type: 'COVER' },
  { title: 'Ringišpil', artist: 'Đorđe Balašević', key: 'C', category: 'DOMESTIC', type: 'COVER' },
  
  // Strana muzika - Rock
  { title: 'Sweet Child O Mine', artist: 'Guns N Roses', key: 'D', category: 'FOREIGN', type: 'COVER' },
  { title: 'November Rain', artist: 'Guns N Roses', key: 'D', category: 'FOREIGN', type: 'COVER' },
  { title: 'Knockin On Heavens Door', artist: 'Guns N Roses', key: 'G', category: 'FOREIGN', type: 'COVER' },
  
  { title: 'Hotel California', artist: 'Eagles', key: 'Bm', category: 'FOREIGN', type: 'COVER' },
  { title: 'Take It Easy', artist: 'Eagles', key: 'G', category: 'FOREIGN', type: 'COVER' },
  
  { title: 'Stairway to Heaven', artist: 'Led Zeppelin', key: 'Am', category: 'FOREIGN', type: 'COVER' },
  { title: 'Whole Lotta Love', artist: 'Led Zeppelin', key: 'E', category: 'FOREIGN', type: 'COVER' },
  
  { title: 'Smoke on the Water', artist: 'Deep Purple', key: 'Gm', category: 'FOREIGN', type: 'COVER' },
  { title: 'Highway Star', artist: 'Deep Purple', key: 'G', category: 'FOREIGN', type: 'COVER' },
  
  { title: 'Bohemian Rhapsody', artist: 'Queen', key: 'Bb', category: 'FOREIGN', type: 'COVER' },
  { title: 'We Will Rock You', artist: 'Queen', key: 'A', category: 'FOREIGN', type: 'COVER' },
  { title: 'We Are The Champions', artist: 'Queen', key: 'C', category: 'FOREIGN', type: 'COVER' },
  
  { title: 'Wonderwall', artist: 'Oasis', key: 'Em', category: 'FOREIGN', type: 'COVER' },
  { title: 'Dont Look Back in Anger', artist: 'Oasis', key: 'C', category: 'FOREIGN', type: 'COVER' },
  
  { title: 'Smells Like Teen Spirit', artist: 'Nirvana', key: 'F', category: 'FOREIGN', type: 'COVER' },
  { title: 'Come As You Are', artist: 'Nirvana', key: 'Em', category: 'FOREIGN', type: 'COVER' },
  
  { title: 'Nothing Else Matters', artist: 'Metallica', key: 'Em', category: 'FOREIGN', type: 'COVER' },
  { title: 'Enter Sandman', artist: 'Metallica', key: 'Em', category: 'FOREIGN', type: 'COVER' },
  
  { title: 'Wish You Were Here', artist: 'Pink Floyd', key: 'G', category: 'FOREIGN', type: 'COVER' },
  { title: 'Another Brick in the Wall', artist: 'Pink Floyd', key: 'Dm', category: 'FOREIGN', type: 'COVER' },
  
  // Pop/Dance
  { title: 'Shape of You', artist: 'Ed Sheeran', key: 'C#m', category: 'FOREIGN', type: 'COVER' },
  { title: 'Perfect', artist: 'Ed Sheeran', key: 'Ab', category: 'FOREIGN', type: 'COVER' },
  
  { title: 'Uptown Funk', artist: 'Bruno Mars', key: 'Dm', category: 'FOREIGN', type: 'COVER' },
  { title: 'Just the Way You Are', artist: 'Bruno Mars', key: 'F', category: 'FOREIGN', type: 'COVER' },
  
  { title: 'Blinding Lights', artist: 'The Weeknd', key: 'Fm', category: 'FOREIGN', type: 'COVER' },
  { title: 'Cant Feel My Face', artist: 'The Weeknd', key: 'A', category: 'FOREIGN', type: 'COVER' },
  
  { title: 'Rolling in the Deep', artist: 'Adele', key: 'Cm', category: 'FOREIGN', type: 'COVER' },
  { title: 'Someone Like You', artist: 'Adele', key: 'A', category: 'FOREIGN', type: 'COVER' },
];

async function main() {
  console.log('Starting seed...');

  // Clear existing songs
  await prisma.song.deleteMany({});
  console.log('Cleared existing songs.');

  // Insert songs
  let count = 0;
  for (const song of songs) {
    await prisma.song.create({ data: song });
    count++;
  }

  console.log(`Seeded ${count} songs successfully.`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
