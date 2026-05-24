/**
 * Offline Repertoire — IndexedDB storage for songs.
 * Allows musicians/bands to cache their repertoire before a gig
 * so that lyrics/chords remain accessible when internet drops.
 *
 * Usage:
 *   import { cacheRepertoire, getCachedSongs, getCachedSong } from '@/lib/offlineRepertoire';
 *
 * Safe: does NOT intercept network, does NOT modify any API.
 * Works in all modern browsers (Chrome, Safari, Firefox, Edge).
 */

const DB_NAME = 'pronadjibend_offline';
const DB_VERSION = 1;
const STORE_SONGS = 'songs';
const STORE_META = 'meta';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_SONGS)) {
        db.createObjectStore(STORE_SONGS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Cache an array of songs into IndexedDB for a given owner.
 * @param {string} ownerId - bandId or musicianId
 * @param {Array} songs - full song objects from API
 * @returns {Promise<number>} - number of songs cached
 */
export async function cacheRepertoire(ownerId, songs) {
  if (!ownerId || !Array.isArray(songs)) return 0;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_SONGS, STORE_META], 'readwrite');
    const store = tx.objectStore(STORE_SONGS);
    const metaStore = tx.objectStore(STORE_META);

    // Clear old songs for this owner first
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        if (cursor.value._ownerId === ownerId) {
          cursor.delete();
        }
        cursor.continue();
      }
    };

    tx.oncomplete = () => {
      // Now insert all songs in a new transaction
      const tx2 = db.transaction([STORE_SONGS, STORE_META], 'readwrite');
      const store2 = tx2.objectStore(STORE_SONGS);
      const metaStore2 = tx2.objectStore(STORE_META);

      for (const song of songs) {
        store2.put({ ...song, _ownerId: ownerId });
      }
      metaStore2.put({
        key: `lastCache:${ownerId}`,
        timestamp: Date.now(),
        count: songs.length,
      });

      tx2.oncomplete = () => resolve(songs.length);
      tx2.onerror = () => reject(tx2.error);
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get all cached songs for a given owner.
 * @param {string} ownerId
 * @returns {Promise<Array>}
 */
export async function getCachedSongs(ownerId) {
  if (!ownerId) return [];
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SONGS, 'readonly');
      const store = tx.objectStore(STORE_SONGS);
      const results = [];
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          if (cursor.value._ownerId === ownerId) {
            const { _ownerId, ...song } = cursor.value;
            results.push(song);
          }
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve(results);
      tx.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Get a single cached song by ID.
 * @param {string} songId
 * @returns {Promise<object|null>}
 */
export async function getCachedSong(songId) {
  if (!songId) return null;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SONGS, 'readonly');
      const store = tx.objectStore(STORE_SONGS);
      const req = store.get(songId);
      req.onsuccess = () => {
        if (req.result) {
          const { _ownerId, ...song } = req.result;
          resolve(song);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Get cache metadata (last cache time + count) for owner.
 * @param {string} ownerId
 * @returns {Promise<{timestamp: number, count: number}|null>}
 */
export async function getCacheMeta(ownerId) {
  if (!ownerId) return null;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_META, 'readonly');
      const store = tx.objectStore(STORE_META);
      const req = store.get(`lastCache:${ownerId}`);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Clear all offline data for an owner.
 * @param {string} ownerId
 */
export async function clearCache(ownerId) {
  if (!ownerId) return;
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_SONGS, STORE_META], 'readwrite');
    const store = tx.objectStore(STORE_SONGS);
    const metaStore = tx.objectStore(STORE_META);
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        if (cursor.value._ownerId === ownerId) cursor.delete();
        cursor.continue();
      }
    };
    metaStore.delete(`lastCache:${ownerId}`);
  } catch {
    // silent
  }
}
