/**
 * Extract karaoke lyrics from a MIDI/KAR file binary.
 * Returns timed lyric events grouped into lines for karaoke display.
 */

export function extractLyrics(midiBuffer) {
  let parseMidi;
  try {
    parseMidi = require('midi-file').parseMidi;
  } catch {
    return { lyrics: [], lines: [] };
  }

  const uint8 = midiBuffer instanceof Uint8Array ? midiBuffer : new Uint8Array(midiBuffer);
  const midi = parseMidi(uint8);
  const ticksPerBeat = midi.header.ticksPerBeat || 480;

  const tempoMap = buildTempoMap(midi.tracks);
  const rawLyrics = collectLyricEvents(midi.tracks, ticksPerBeat, tempoMap);
  const lines = groupIntoLines(rawLyrics).filter(isNotAdLine);

  return { lyrics: rawLyrics, lines };
}

// Only remove a lyric line if it is ENTIRELY an ad (URL / email / phone number)
const URL_RE = /(?:https?:\/\/|www\.)\S+|\S+\.(?:com|net|rs|co\.yu|org|info|biz)\S*/i;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/i;
const PHONE_RE = /(?:\+?381[-\s]?)?0?[67]\d[-\s]?\d{2,3}[-\s]?\d{3,4}/;

function isNotAdLine(line) {
  const text = (line.fullText || '').trim();
  if (!text) return false;
  // Strip ad substrings; if what remains is empty/tiny it was pure ad
  const stripped = text
    .replace(new RegExp(URL_RE.source, 'gi'), '')
    .replace(new RegExp(EMAIL_RE.source, 'gi'), '')
    .replace(new RegExp(PHONE_RE.source, 'g'), '')
    .replace(/[@\s,:\-./\\]+/g, '')
    .trim();
  return stripped.length >= 2;
}

function buildTempoMap(tracks) {
  const map = [];
  tracks.forEach(track => {
    let tick = 0;
    track.forEach(event => {
      tick += event.deltaTime;
      if (event.type === 'setTempo') {
        map.push({ tick, uspb: event.microsecondsPerBeat });
      }
    });
  });
  map.sort((a, b) => a.tick - b.tick);
  if (map.length === 0) map.push({ tick: 0, uspb: 500000 });
  return map;
}

function tickToSeconds(tick, ticksPerBeat, tempoMap) {
  let time = 0;
  let lastTick = 0;
  let uspb = 500000;

  for (const change of tempoMap) {
    if (change.tick > tick) break;
    time += ((change.tick - lastTick) / ticksPerBeat) * (uspb / 1_000_000);
    lastTick = change.tick;
    uspb = change.uspb;
  }

  time += ((tick - lastTick) / ticksPerBeat) * (uspb / 1_000_000);
  return time;
}

function collectLyricEvents(tracks, ticksPerBeat, tempoMap) {
  const events = [];

  tracks.forEach(track => {
    let tick = 0;
    track.forEach(event => {
      tick += event.deltaTime;
      if (event.type === 'lyrics' || event.type === 'text') {
        const text = event.text || '';
        if (text.replace(/[\r\n/\\]/g, '').trim()) {
          events.push({
            time: tickToSeconds(tick, ticksPerBeat, tempoMap),
            text,
            isLineBreak: /^[\r\n/\\]+$/.test(text.trim()),
          });
        }
      }
    });
  });

  events.sort((a, b) => a.time - b.time);
  return events;
}

function groupIntoLines(lyricEvents) {
  const lines = [];
  let currentWords = [];

  for (const evt of lyricEvents) {
    const t = evt.text;

    if (t.includes('\n') || t.includes('\r') || t.includes('/') || t.includes('\\')) {
      const clean = t.replace(/[\r\n/\\]/g, '').trim();
      if (clean) {
        currentWords.push({ time: evt.time, text: clean });
      }
      if (currentWords.length > 0) {
        lines.push({
          startTime: currentWords[0].time,
          endTime: currentWords[currentWords.length - 1].time + 2,
          words: [...currentWords],
          fullText: currentWords.map(w => w.text).join(''),
        });
        currentWords = [];
      }
    } else {
      currentWords.push({ time: evt.time, text: t });
    }
  }

  if (currentWords.length > 0) {
    lines.push({
      startTime: currentWords[0].time,
      endTime: currentWords[currentWords.length - 1].time + 2,
      words: [...currentWords],
      fullText: currentWords.map(w => w.text).join(''),
    });
  }

  return lines;
}
