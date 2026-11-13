import {
  Playlist,
  Track,
  INITIAL_PLAYLISTS,
  INITIAL_TRACKS,
  normalizeTrackCoverUrl,
} from '../data/musicCatalog';

const DB_NAME = 'SanctuaryOfflineVaultDB';
const DB_VERSION = 9;
const STORE_TRACKS = 'offline_tracks';
const STORE_AUDIO_BLOBS = 'offline_audio_blobs';
const STORE_DISCOVERED_TRACKS = 'discovered_catalog_tracks';
const MIN_FULL_SONG_BYTES = 850000; // Full-length songs are > 850KB (prevents 30s clips from caching)

export interface UserCloudState {
  bookmarkedTrackIds: string[];
  offlineTrackIds: string[];
  completedCalisthenicsDays: number[];
  activeCalisthenicsDay: number;
  playlists: Playlist[];
  activeDeviceId: string;
  activeDeviceName: string;
  audioQuality: 'low' | 'normal' | 'high' | 'lossless';
  eqPreset: string;
  eqGains: number[];
}

const STORAGE_KEY = 'sanctuary_pulse_user_state_v1';

export function loadPersistedState(): UserCloudState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        bookmarkedTrackIds: parsed.bookmarkedTrackIds || ['trk-skillet-1', 'trk-cory-1', 'trk-lecrae-1'],
        offlineTrackIds: parsed.offlineTrackIds || [
          'trk-skillet-1',
          'trk-cory-1',
          'trk-lecrae-1',
          'trk-tobymac-1',
          'trk-demon-hunter-1',
        ],
        completedCalisthenicsDays: parsed.completedCalisthenicsDays || [1, 2, 3],
        activeCalisthenicsDay: parsed.activeCalisthenicsDay || 4,
        playlists: parsed.playlists || INITIAL_PLAYLISTS,
        activeDeviceId: parsed.activeDeviceId || 'dev-this-device',
        activeDeviceName: parsed.activeDeviceName || 'This Device (Sanctuary App)',
        audioQuality: parsed.audioQuality || 'lossless',
        eqPreset: parsed.eqPreset || 'Workout Bass Boost',
        eqGains: parsed.eqGains || [6, 4.5, 0, 2, 3.5],
      };
    }
  } catch {
    // ignore
  }
  return {
    bookmarkedTrackIds: ['trk-skillet-1', 'trk-cory-1', 'trk-lecrae-1'],
    offlineTrackIds: [
      'trk-skillet-1',
      'trk-cory-1',
      'trk-lecrae-1',
      'trk-tobymac-1',
      'trk-demon-hunter-1',
    ],
    completedCalisthenicsDays: [1, 2, 3],
    activeCalisthenicsDay: 4,
    playlists: INITIAL_PLAYLISTS,
    activeDeviceId: 'dev-this-device',
    activeDeviceName: 'This Device (Sanctuary App)',
    audioQuality: 'lossless',
    eqPreset: 'Workout Bass Boost',
    eqGains: [6, 4.5, 0, 2, 3.5],
  };
}

export function savePersistedState(state: UserCloudState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

function openVaultDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_AUDIO_BLOBS)) {
        db.createObjectStore(STORE_AUDIO_BLOBS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_DISCOVERED_TRACKS)) {
        db.createObjectStore(STORE_DISCOVERED_TRACKS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const DISCOVERED_TRACKS_LS_KEY = 'sanctuary_discovered_tracks_v1';
const DISCOVERY_CURSOR_LS_KEY = 'sanctuary_discovery_cursor_v1';

export function loadDiscoveryCursor(): number {
  try {
    const raw = localStorage.getItem(DISCOVERY_CURSOR_LS_KEY);
    if (raw) {
      const num = parseInt(raw, 10);
      if (Number.isFinite(num) && num >= 0) return num;
    }
  } catch {
    // ignore
  }
  return 0;
}

export function saveDiscoveryCursor(cursor: number): void {
  try {
    if (Number.isFinite(cursor) && cursor >= 0) {
      localStorage.setItem(DISCOVERY_CURSOR_LS_KEY, String(Math.floor(cursor)));
    }
  } catch {
    // ignore quota errors
  }
}

export function loadDiscoveredTracksSync(): Track[] {
  try {
    const raw = localStorage.getItem(DISCOVERED_TRACKS_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Track[]).map((t) => ({
      ...t,
      coverUrl: normalizeTrackCoverUrl(t.coverUrl, t.genre),
    }));
  } catch {
    return [];
  }
}

export async function loadDiscoveredTracksFromVault(): Promise<Track[]> {
  const lsTracks = loadDiscoveredTracksSync();
  try {
    const db = await openVaultDB();
    const idbTracks: (Track & { discoveredAtMs?: number })[] = await new Promise((resolve) => {
      const tx = db.transaction(STORE_DISCOVERED_TRACKS, 'readonly');
      const req = tx.objectStore(STORE_DISCOVERED_TRACKS).getAll();
      req.onsuccess = () => resolve((req.result as (Track & { discoveredAtMs?: number })[]) || []);
      req.onerror = () => resolve([]);
    });

    const byId = new Map<string, Track & { discoveredAtMs?: number }>();
    for (const t of idbTracks) {
      if (t?.id) {
        byId.set(t.id, {
          ...t,
          coverUrl: normalizeTrackCoverUrl(t.coverUrl, t.genre),
        });
      }
    }
    for (const t of lsTracks) {
      if (t?.id && !byId.has(t.id)) {
        byId.set(t.id, t);
      }
    }

    return Array.from(byId.values()).sort(
      (a, b) => (a.discoveredAtMs || 0) - (b.discoveredAtMs || 0)
    );
  } catch {
    return lsTracks;
  }
}

export async function saveDiscoveredTracksToVault(discoveredTracks: Track[]): Promise<void> {
  if (!Array.isArray(discoveredTracks) || discoveredTracks.length === 0) return;

  // Store fast synchronous window in localStorage (up to 450 NEWEST releases to stay well under quota)
  try {
    const lsSlice = discoveredTracks.slice(-450);
    localStorage.setItem(DISCOVERED_TRACKS_LS_KEY, JSON.stringify(lsSlice));
  } catch {
    try {
      const smallerSlice = discoveredTracks.slice(-150);
      localStorage.setItem(DISCOVERED_TRACKS_LS_KEY, JSON.stringify(smallerSlice));
    } catch {
      // ignore localStorage quota errors; IndexedDB holds full catalog
    }
  }

  // Persist ALL discovered releases permanently in IndexedDB (supports thousands of songs)
  try {
    const db = await openVaultDB();
    const tx = db.transaction(STORE_DISCOVERED_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_DISCOVERED_TRACKS);
    const now = Date.now();
    discoveredTracks.slice(-3000).forEach((trk, idx) => {
      if (!trk?.id) return;
      store.put({
        ...trk,
        discoveredAtMs: (trk as Track & { discoveredAtMs?: number }).discoveredAtMs || now + idx,
      });
    });
  } catch {
    // ignore IDB errors
  }
}

const memoryBlobUrlMap = new Map<string, string>();

export function getCachedBlobUrlSync(trackId: string): string | null {
  return memoryBlobUrlMap.get(trackId) || null;
}

export async function preloadOfflineBlobUrls(): Promise<void> {
  try {
    const db = await openVaultDB();
    const tx = db.transaction(STORE_AUDIO_BLOBS, 'readwrite');
    const store = tx.objectStore(STORE_AUDIO_BLOBS);
    const req = store.getAll();
    req.onsuccess = () => {
      const items = (req.result as { id: string; blob: Blob }[]) || [];
      items.forEach((item) => {
        if (item?.id && item?.blob instanceof Blob) {
          if (item.blob.size >= MIN_FULL_SONG_BYTES) {
            if (!memoryBlobUrlMap.has(item.id)) {
              memoryBlobUrlMap.set(item.id, URL.createObjectURL(item.blob));
            }
          } else {
            // Purge any old 30-second preview blob automatically
            store.delete(item.id);
          }
        }
      });
    };
  } catch {
    // ignore
  }
}

export async function saveTrackAudioBlob(trackId: string, blob: Blob): Promise<void> {
  try {
    if (!blob || blob.size < MIN_FULL_SONG_BYTES) return;
    memoryBlobUrlMap.set(trackId, URL.createObjectURL(blob));
    const db = await openVaultDB();
    const tx = db.transaction(STORE_AUDIO_BLOBS, 'readwrite');
    tx.objectStore(STORE_AUDIO_BLOBS).put({
      id: trackId,
      blob,
      sizeBytes: blob.size,
      mimeType: blob.type || 'audio/mpeg',
      cachedAt: new Date().toISOString(),
    });
  } catch {
    // ignore
  }
}

export async function getTrackAudioBlob(trackId: string): Promise<Blob | null> {
  try {
    const db = await openVaultDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_AUDIO_BLOBS, 'readonly');
      const req = tx.objectStore(STORE_AUDIO_BLOBS).get(trackId);
      req.onsuccess = () => {
        if (
          req.result &&
          req.result.blob instanceof Blob &&
          req.result.blob.size >= MIN_FULL_SONG_BYTES
        ) {
          if (!memoryBlobUrlMap.has(trackId)) {
            memoryBlobUrlMap.set(trackId, URL.createObjectURL(req.result.blob));
          }
          resolve(req.result.blob);
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

export async function isTrackAudioCached(trackId: string): Promise<boolean> {
  if (memoryBlobUrlMap.has(trackId)) return true;
  try {
    const blob = await getTrackAudioBlob(trackId);
    return blob !== null && blob.size >= MIN_FULL_SONG_BYTES;
  } catch {
    return false;
  }
}

const directStreamUrlMemory = new Map<string, string>();

export async function resolveDirectItunesAudioUrl(track: Track): Promise<string | null> {
  if (directStreamUrlMemory.has(track.id)) {
    return directStreamUrlMemory.get(track.id)!;
  }
  const cleanTitle = track.title.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim() || track.title;
  const primaryArtist =
    track.artist.split(/\s*(?:,|&|\bfeat\.?\b|\bft\.?\b|\bwith\b|\bx\b|\/)\s*/i)[0]?.trim() ||
    track.artist;

  const norm = (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const targetTitleWords = norm(cleanTitle)
    .split(' ')
    .filter((w) => w.length > 0 && !['the', 'a', 'an', 'and', 'of', 'to', 'in', 'on', 'for', 'my'].includes(w));
  const checkTitleWords = targetTitleWords.length > 0 ? targetTitleWords : norm(cleanTitle).split(' ').filter(Boolean);
  const normArtist = norm(primaryArtist);

  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        `${primaryArtist} ${cleanTitle}`
      )}&media=music&entity=song&limit=10`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    const match = results.find((r: any) => {
      if (!r?.previewUrl) return false;
      if (r?.trackExplicitness === 'explicit' || r?.collectionExplicitness === 'explicit') return false;
      const meta = `${r.trackName || ''} ${r.artistName || ''} ${r.collectionName || ''} ${r.primaryGenreName || ''}`.toLowerCase();
      if (
        /\b(cover|karaoke|tribute|instrumental|backing track|click track|performance track|pista|playback|remix|rmx|lofi|lo-fi|acoustic|lullaby|piano|guitar|orchestra|symphony|espanol|en español|tumbas|poder|made popular)\b/i.test(
          meta
        )
      ) {
        return false;
      }
      if (!/\blive\b/i.test(track.title) && /\b(live|live at|live from)\b/i.test(r.trackName || '')) {
        return false;
      }
      const rTitleNorm = ` ${norm(r.trackName || '')} `;
      const rArtistNorm = ` ${norm(r.artistName || '')} `;
      const titleOk = checkTitleWords.every((w) => rTitleNorm.includes(` ${w} `));
      const artistOk = normArtist.length > 1 && rArtistNorm.includes(` ${normArtist} `);
      return titleOk && artistOk;
    });

    if (match?.previewUrl) {
      directStreamUrlMemory.set(track.id, match.previewUrl);
      return match.previewUrl;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Caches full-length audio blob and metadata into IndexedDB so it plays 100% offline.
 */
export async function fetchAndCacheTrackOffline(track: Track): Promise<boolean> {
  try {
    // 1. Save metadata
    await saveTrackToIndexedDB(track);

    // 2. Fetch full-length song stream (never cache 30-second clips into the full-song vault)
    const url = `/api/music/full-song?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}&id=${encodeURIComponent(track.id)}`;
    const response = await fetch(url);
    if (response.ok) {
      const contentType = response.headers.get('content-type') || 'audio/mpeg';
      if (contentType.includes('audio') || contentType.includes('octet-stream')) {
        if (response.status === 206) {
          const contentRange = response.headers.get('content-range') || '';
          const match = contentRange.match(/bytes\s+(\d+)-(\d+)\/(\d+)/i);
          const firstBuf = await response.arrayBuffer();
          if (match) {
            const totalSize = parseInt(match[3], 10);
            let nextOffset = parseInt(match[2], 10) + 1;
            const chunks: ArrayBuffer[] = [firstBuf];
            while (nextOffset < totalSize && chunks.length < 16) {
              const partRes = await fetch(url, {
                headers: { Range: `bytes=${nextOffset}-` },
              });
              if (!partRes.ok) break;
              const partBuf = await partRes.arrayBuffer();
              if (partBuf.byteLength === 0) break;
              chunks.push(partBuf);
              nextOffset += partBuf.byteLength;
            }
            const fullBlob = new Blob(chunks, { type: contentType });
            if (fullBlob.size >= MIN_FULL_SONG_BYTES) {
              await saveTrackAudioBlob(track.id, fullBlob);
              return true;
            }
          }
        } else {
          const blob = await response.blob();
          if (blob && blob.size >= MIN_FULL_SONG_BYTES) {
            await saveTrackAudioBlob(track.id, blob);
            return true;
          }
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Downloads full-length song directly to device (iOS Files app / Android Downloads folder).
 * Also automatically caches the song locally in IndexedDB for offline listening.
 */
export async function downloadTrackToDevice(track: Track): Promise<void> {
  const safeFilename = `${track.artist} - ${track.title}`
    .replace(/[/\\?%*:|"<>]/g, '_')
    .trim() + '.m4a';

  // Check if we already have the blob cached in IndexedDB
  const cachedBlob = await getTrackAudioBlob(track.id);
  if (cachedBlob && cachedBlob.size > 1000) {
    const blobUrl = URL.createObjectURL(cachedBlob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = safeFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    return;
  }

  // Fetch & cache into blob first if possible so mobile browsers download a clean .m4a file
  const cachedNow = await fetchAndCacheTrackOffline(track);
  if (cachedNow) {
    const freshBlob = await getTrackAudioBlob(track.id);
    if (freshBlob && freshBlob.size > 1000) {
      const blobUrl = URL.createObjectURL(freshBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = safeFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return;
    }
  }

  // Otherwise trigger direct file download from server with Content-Disposition attachment
  const downloadUrl = `/api/music/full-song?title=${encodeURIComponent(
    track.title
  )}&artist=${encodeURIComponent(track.artist)}&id=${encodeURIComponent(
    track.id
  )}&filename=${encodeURIComponent(safeFilename)}`;

  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = safeFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Sends / caches multiple new tracks offline in the background with progress reporting.
 */
export async function cacheMultipleTracksOffline(
  tracks: Track[],
  onProgress?: (completed: number, total: number) => void
): Promise<number> {
  let count = 0;
  for (let i = 0; i < tracks.length; i++) {
    const success = await fetchAndCacheTrackOffline(tracks[i]);
    if (success) count++;
    if (onProgress) {
      onProgress(i + 1, tracks.length);
    }
  }
  return count;
}

export async function saveTrackToIndexedDB(track: Track): Promise<void> {
  try {
    const db = await openVaultDB();
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    tx.objectStore(STORE_TRACKS).put({
      ...track,
      savedOfflineAt: new Date().toISOString(),
    });
  } catch {
    // fallback handled by localStorage
  }
}

export async function removeTrackFromIndexedDB(trackId: string): Promise<void> {
  try {
    const db = await openVaultDB();
    const tx = db.transaction([STORE_TRACKS, STORE_AUDIO_BLOBS], 'readwrite');
    tx.objectStore(STORE_TRACKS).delete(trackId);
    tx.objectStore(STORE_AUDIO_BLOBS).delete(trackId);
  } catch {
    // ignore
  }
}

export async function getAllOfflineTracksFromIndexedDB(): Promise<Track[]> {
  try {
    const db = await openVaultDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_TRACKS, 'readonly');
      const req = tx.objectStore(STORE_TRACKS).getAll();
      req.onsuccess = () => resolve((req.result as Track[]) || []);
      req.onerror = () => resolve(INITIAL_TRACKS.slice(0, 5));
    });
  } catch {
    return INITIAL_TRACKS.slice(0, 5);
  }
}
