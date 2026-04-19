/**
 * Remove only clear ad substrings (URLs, emails, phone numbers) from lyrics.
 * Keeps real lyric text intact.
 */

// Strict patterns — only truly recognizable ads
const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b\S+\.(?:com|net|rs|co\.yu|org|info|biz)\b\S*/gi;
const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi;
// Serbian phone numbers (mobile 06x/07x or landline with +381)
const PHONE_RE = /(?:\+?381[-\s]?)?0?[67]\d[-\s]?\d{2,3}[-\s]?\d{3,4}/g;

export function cleanLyrics(lyrics) {
  if (!lyrics || typeof lyrics !== 'string') return lyrics;
  const lines = lyrics.split(/\r?\n/);
  const out = [];
  let blank = 0;
  for (const rawLine of lines) {
    // Remove ad substrings only
    let line = rawLine
      .replace(URL_RE, '')
      .replace(EMAIL_RE, '')
      .replace(PHONE_RE, '')
      // clean dangling separators left by removals
      .replace(/\s{2,}/g, ' ')
      .replace(/^[\s,:\-]+|[\s,:\-]+$/g, '');

    if (line.trim() === '') {
      blank++;
      if (blank <= 1) out.push('');
    } else {
      blank = 0;
      out.push(line);
    }
  }
  return out.join('\n').trim();
}
