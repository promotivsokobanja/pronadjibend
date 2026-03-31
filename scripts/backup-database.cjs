const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const BACKUP_DIR = process.argv[2] || 'F:\\BECKUP POSLEDNJI 31.3.26';

async function main() {
  console.log('Starting database backup...\n');

  // Users
  const users = await prisma.user.findMany();
  fs.writeFileSync(path.join(BACKUP_DIR, 'users.json'), JSON.stringify(users, null, 2));
  console.log(`Users: ${users.length}`);

  // Bands
  const bands = await prisma.band.findMany();
  fs.writeFileSync(path.join(BACKUP_DIR, 'bands.json'), JSON.stringify(bands, null, 2));
  console.log(`Bands: ${bands.length}`);

  // Songs
  const songs = await prisma.song.findMany();
  fs.writeFileSync(path.join(BACKUP_DIR, 'songs.json'), JSON.stringify(songs, null, 2));
  console.log(`Songs: ${songs.length}`);

  // MidiFiles
  const midiFiles = await prisma.midiFile.findMany();
  fs.writeFileSync(path.join(BACKUP_DIR, 'midiFiles.json'), JSON.stringify(midiFiles, null, 2));
  console.log(`MidiFiles: ${midiFiles.length}`);

  // Bookings
  let bookings = [];
  try {
    bookings = await prisma.booking.findMany();
    fs.writeFileSync(path.join(BACKUP_DIR, 'bookings.json'), JSON.stringify(bookings, null, 2));
    console.log(`Bookings: ${bookings.length}`);
  } catch { console.log('Bookings: skipped (table may not exist)'); }

  // LiveRequests
  let liveRequests = [];
  try {
    liveRequests = await prisma.liveRequest.findMany();
    fs.writeFileSync(path.join(BACKUP_DIR, 'liveRequests.json'), JSON.stringify(liveRequests, null, 2));
    console.log(`LiveRequests: ${liveRequests.length}`);
  } catch { console.log('LiveRequests: skipped'); }

  // SiteConfig
  let siteConfig = [];
  try {
    siteConfig = await prisma.siteConfig.findMany();
    fs.writeFileSync(path.join(BACKUP_DIR, 'siteConfig.json'), JSON.stringify(siteConfig, null, 2));
    console.log(`SiteConfig: ${siteConfig.length}`);
  } catch { console.log('SiteConfig: skipped'); }

  // SongSubmission
  let songSubmissions = [];
  try {
    songSubmissions = await prisma.songSubmission.findMany();
    fs.writeFileSync(path.join(BACKUP_DIR, 'songSubmissions.json'), JSON.stringify(songSubmissions, null, 2));
    console.log(`SongSubmissions: ${songSubmissions.length}`);
  } catch { console.log('SongSubmissions: skipped'); }

  // MusicianProfile
  let musicianProfiles = [];
  try {
    musicianProfiles = await prisma.musicianProfile.findMany();
    fs.writeFileSync(path.join(BACKUP_DIR, 'musicianProfiles.json'), JSON.stringify(musicianProfiles, null, 2));
    console.log(`MusicianProfiles: ${musicianProfiles.length}`);
  } catch { console.log('MusicianProfiles: skipped'); }

  // MusicianInvite
  let musicianInvites = [];
  try {
    musicianInvites = await prisma.musicianInvite.findMany();
    fs.writeFileSync(path.join(BACKUP_DIR, 'musicianInvites.json'), JSON.stringify(musicianInvites, null, 2));
    console.log(`MusicianInvites: ${musicianInvites.length}`);
  } catch { console.log('MusicianInvites: skipped'); }

  console.log('\n========== BACKUP COMPLETE ==========');
  console.log(`Location: ${BACKUP_DIR}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
