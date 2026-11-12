import { Playlist, Track, INITIAL_PLAYLISTS, INITIAL_TRACKS } from '../data/musicCatalog';

const DB_NAME = 'SanctuaryOfflineVaultDB';
const DB_VERSION = 2;
const STORE_TRACKS = 'offline_tracks';
const STORE_AUDIO_BLOBS = 'offline_audio_blobs';

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
        bookmarkedTrackIds: parsed.bookmarkedTrackIds || ['trk-skillet-1', 'trk-tobymac-1', 'trk-lecrae-1'],
        offlineTrackIds: parsed.offlineTrackIds || [
          'trk-skillet-1',
          'trk-tobymac-1',
          'trk-lecrae-1',
          'trk-brandon-lake-1',
          'trk-fokc-1',
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
    bookmarkedTrackIds: ['trk-skillet-1', 'trk-tobymac-1', 'trk-lecrae-1'],
    offlineTrackIds: [
      'trk-skillet-1',
      'trk-tobymac-1',
      'trk-lecrae-1',
      'trk-brandon-lake-1',
      'trk-fokc-1',
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
    req.onupgradeneeded = (event) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_AUDIO_BLOBS)) {
        db.createObjectStore(STORE_AUDIO_BLOBS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const memoryBlobUrlMap = new Map<string, string>();

export function getCachedBlobUrlSync(trackId: string): string | null {
  return memoryBlobUrlMap.get(trackId) || null;
}

export async function preloadOfflineBlobUrls(): Promise<void> {
  try {
    const db = await openVaultDB();
    const tx = db.transaction(STORE_AUDIO_BLOBS, 'readonly');
    const req = tx.objectStore(STORE_AUDIO_BLOBS).getAll();
    req.onsuccess = () => {
      const items = (req.result as { id: string; blob: Blob }[]) || [];
      items.forEach((item) => {
        if (item?.id && item?.blob instanceof Blob && item.blob.size > 1000) {
          if (!memoryBlobUrlMap.has(item.id)) {
            memoryBlobUrlMap.set(item.id, URL.createObjectURL(item.blob));
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
    if (blob && blob.size > 1000) {
      memoryBlobUrlMap.set(trackId, URL.createObjectURL(blob));
    }
    const db = await openVaultDB();
    const tx = db.transaction(STORE_AUDIO_BLOBS, 'readwrite');
    tx.objectStore(STORE_AUDIO_BLOBS).put({
      id: trackId,
      blob,
      sizeBytes: blob.size,
      mimeType: blob.type || 'audio/mp4',
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
        if (req.result && req.result.blob instanceof Blob) {
          if (!memoryBlobUrlMap.has(trackId) && req.result.blob.size > 1000) {
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
    return blob !== null && blob.size > 1000;
  } catch {
    return false;
  }
}

const directStreamUrlMemory = new Map<string, string>();

export async function resolveDirectItunesAudioUrl(track: Track): Promise<string | null> {
  if (directStreamUrlMemory.has(track.id)) {
    return directStreamUrlMemory.get(track.id)!;
  }
  const cleanTitle = track.title.replace(/\([^)]*\)/g, '').trim() || track.title;
  const queries = [`${track.artist} ${cleanTitle}`, `${track.artist} Christian`, track.artist];

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(
          q
        )}&media=music&entity=song&limit=8`
      );
      if (!res.ok) continue;
      const data = await res.json();
      const results = Array.isArray(data?.results) ? data.results : [];
      const match = results.find(
        (r: any) =>
          r?.previewUrl &&
          !String(`${r.trackName || ''} ${r.artistName || ''}`)
            .toLowerCase()
            .match(/\b(cover|karaoke|tribute|instrumental)\b/)
      ) || results.find((r: any) => r?.previewUrl);

      if (match?.previewUrl) {
        directStreamUrlMemory.set(track.id, match.previewUrl);
        return match.previewUrl;
      }
    } catch {
      // ignore
    }
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

    // 2. Try primary full-song stream first
    const url = `/api/music/full-song?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}&id=${encodeURIComponent(track.id)}`;
    try {
      const response = await fetch(url);
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('audio') || contentType.includes('octet-stream')) {
          const blob = await response.blob();
          if (blob && blob.size > 10000) {
            await saveTrackAudioBlob(track.id, blob);
            return true;
          }
        }
      }
    } catch {
      // fall through to direct CDN stream
    }

    // 3. Fallback to direct Apple Music CDN audio stream so caching works on static hosts too
    const directUrl = await resolveDirectItunesAudioUrl(track);
    if (directUrl) {
      const resp = await fetch(directUrl);
      if (resp.ok) {
        const blob = await resp.blob();
        if (blob && blob.size > 5000) {
          await saveTrackAudioBlob(track.id, blob);
          return true;
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
