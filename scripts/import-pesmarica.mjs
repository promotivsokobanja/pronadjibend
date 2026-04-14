/**
 * Import songs from C:\Users\Studios\Desktop\Pesmarica\baza
 * Structure: Letter / Artist / title.txt
 * File format: line1 = title, line2 = "Izvođač: Artist", rest = lyrics
 *
 * Inserts only global songs (bandId: null) and skips duplicates.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const BASE_DIR = 'C:\\Users\\Studios\\Desktop\\Pesmarica\\baza';
const BATCH_SIZE = 200;

// Collect all .txt file paths recursively
function collectTxtFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTxtFiles(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.txt')) {
      results.push(full);
    }
  }
  return results;
}

// Parse a single txt file
function parseSongFile(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch {
    try {
      raw = fs.readFileSync(filePath, 'latin1');
    } catch {
      return null;
    }
  }

  const lines = raw.split(/\r?\n/);
  if (lines.length < 3) return null;

  // Line 1: title from file content
  let title = lines[0].trim();
  // Line 2: "Izvođač: Artist" or similar
  let artist = '';
  const artistLine = lines[1].trim();
  const artistMatch = artistLine.match(/^Izvo[đd]a[čc]:\s*(.+)$/i);
  if (artistMatch) {
    artist = artistMatch[1].trim();
  }

  // Fallback: derive from folder path  Letter/Artist/title.txt
  const parts = filePath.replace(BASE_DIR, '').split(path.sep).filter(Boolean);
  if (!artist && parts.length >= 2) {
    artist = parts[parts.length - 2]; // parent folder = artist
  }
  if (!title) {
    title = path.basename(filePath, '.txt');
  }

  // Lyrics: everything after the artist line (skip blank line after artist)
  let lyricsStartIdx = 2;
  if (artistMatch) {
    // Skip blank line after "Izvođač:" if present
    if (lines[2]?.trim() === '') lyricsStartIdx = 3;
  } else {
    lyricsStartIdx = 1; // No artist line found, treat line 1 onwards as lyrics
  }
  const lyrics = lines.slice(lyricsStartIdx).join('\n').trim();

  if (!title || !artist) return null;
  if (!lyrics || lyrics.length < 10) return null; // Skip empty/too-short lyrics

  return { title, artist, lyrics };
}

async function main() {
  console.log('Scanning files...');
  const files = collectTxtFiles(BASE_DIR);
  console.log(`Found ${files.length} .txt files`);

  // Parse all files
  console.log('Parsing files...');
  const songs = [];
  let parseErrors = 0;
  for (const f of files) {
    const parsed = parseSongFile(f);
    if (parsed) {
      songs.push(parsed);
    } else {
      parseErrors++;
    }
  }
  console.log(`Parsed ${songs.length} songs, ${parseErrors} skipped (no valid content)`);

  // Load existing global songs (title+artist pairs) for dedup
  console.log('Loading existing global songs for dedup...');
  const existing = await prisma.song.findMany({
    where: { bandId: null },
    select: { title: true, artist: true },
  });
  const existingSet = new Set(
    existing.map((s) => `${s.title.toLowerCase().trim()}|||${s.artist.toLowerCase().trim()}`)
  );
  console.log(`Existing global songs in DB: ${existing.length}`);

  // Filter out duplicates
  const newSongs = [];
  const seenInBatch = new Set();
  let dupCount = 0;
  for (const s of songs) {
    const key = `${s.title.toLowerCase().trim()}|||${s.artist.toLowerCase().trim()}`;
    if (existingSet.has(key) || seenInBatch.has(key)) {
      dupCount++;
      continue;
    }
    seenInBatch.add(key);
    newSongs.push(s);
  }
  console.log(`New songs to insert: ${newSongs.length} (${dupCount} duplicates skipped)`);

  if (newSongs.length === 0) {
    console.log('Nothing to insert. Done.');
    await prisma.$disconnect();
    return;
  }

  // Insert in batches
  let inserted = 0;
  for (let i = 0; i < newSongs.length; i += BATCH_SIZE) {
    const batch = newSongs.slice(i, i + BATCH_SIZE).map((s) => ({
      title: s.title,
      artist: s.artist,
      lyrics: s.lyrics,
      bandId: null,
    }));

    try {
      const result = await prisma.song.createMany({
        data: batch,
        skipDuplicates: true,
      });
      inserted += result.count;
    } catch (err) {
      console.error(`Batch error at ${i}: ${err.message}`);
      // Try one by one
      for (const song of batch) {
        try {
          await prisma.song.create({ data: song });
          inserted++;
        } catch {
          // skip individual failures
        }
      }
    }

    if ((i + BATCH_SIZE) % 2000 === 0 || i + BATCH_SIZE >= newSongs.length) {
      console.log(`Progress: ${Math.min(i + BATCH_SIZE, newSongs.length)}/${newSongs.length} processed, ${inserted} inserted`);
    }
  }

  console.log(`\nDone! Inserted ${inserted} new songs into global pesmarica.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
