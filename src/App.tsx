/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Home,
  Compass,
  Dumbbell,
  Radio,
  Library,
  Search,
  Play,
  Pause,
  Heart,
  Film,
  ListPlus,
  Download,
  Check,
  Share2,
  Plus,
  Sun,
  Moon,
  Speaker,
  RefreshCw,
  BookOpen,
  BellRing,
  X,
} from 'lucide-react';
import {
  Track,
  Playlist,
  ChristianGenre,
  GENRE_CATEGORIES,
  INITIAL_TRACKS,
  COVER_ROCK_ALTAR,
  COVER_HIPHOP_CROWN,
  COVER_WORSHIP_RNB,
  BANNER_CALISTHENICS,
  fetchLiveChristianMusicBatch,
  searchChristianCatalogLive,
} from './data/musicCatalog';
import { CalisthenicsDayPlan, getCalisthenicsDayPlan } from './data/calisthenics365';
import {
  verifyChristianTrack,
  generatePerpetualChristianTracks,
  getCanonicalTrackKey,
} from './utils/christianityVerification';
import { audioEngine, AudioQuality } from './utils/audioEngine';
import {
  loadPersistedState,
  savePersistedState,
  saveTrackToIndexedDB,
  removeTrackFromIndexedDB,
  downloadTrackToDevice,
  cacheMultipleTracksOffline,
  fetchAndCacheTrackOffline,
  loadDiscoveryCursor,
  saveDiscoveryCursor,
  loadDiscoveredTracksSync,
  loadDiscoveredTracksFromVault,
  saveDiscoveredTracksToVault,
  preloadOfflineBlobUrls,
} from './utils/offlineVault';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton';
import { CalisthenicsCoachView } from './components/CalisthenicsCoachView';
import {
  SanctuaryConnectModal,
  HiFiEQModal,
  SocialShareModal,
  ConnectedDevice,
} from './components/ConnectAndShareModals';
import { PlayerBarAndSheet } from './components/PlayerBarAndSheet';
import { RingtoneStudioModal, SavedRingtone } from './components/RingtoneStudioModal';
import {
  SpotifyVideoFeedStrip,
  FullScreenVideoFeedModal,
  AddToPlaylistModal,
} from './components/SpotifyCanvasAndModals';
import { GenrePageView } from './components/GenrePageView';

type AppTab = 'home' | 'explore' | 'calisthenics' | 'radar' | 'library' | 'genre';
type OriginFilter = 'all' | 'Verified Artist' | 'AI Studio Original';

const INITIAL_SEED_ID_SET = new Set(INITIAL_TRACKS.map((t) => t.id));

function mergeAndDedupeCatalog(candidates: Track[]): Track[] {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const out: Track[] = [];
  for (const item of candidates) {
    if (!item?.id || !item?.title || !item?.artist) continue;
    const ok = verifyChristianTrack({
      title: item.title,
      artist: item.artist,
      album: item.album,
      genreName: item.genre,
    }).isVerifiedChristian;
    if (!ok) continue;
    const key = getCanonicalTrackKey(item.title, item.artist);
    if (seenIds.has(item.id) || seenKeys.has(key)) continue;
    seenIds.add(item.id);
    seenKeys.add(key);
    out.push({
      ...item,
      duration: Math.max(170, item.duration || 228),
      sourceOrigin: 'Verified Artist',
      audioPreviewUrl: `/api/music/full-song?title=${encodeURIComponent(item.title)}&artist=${encodeURIComponent(item.artist)}&id=${encodeURIComponent(item.id)}`,
    });
  }
  return out;
}

export default function App() {
  // Theme state (defaults to intuitive Dark Mode as requested)
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Navigation & filter state (restores dedicated genre view if URL has ?genre=...)
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    if (typeof window !== 'undefined') {
      const g = new URLSearchParams(window.location.search).get('genre') as ChristianGenre | null;
      if (g && g !== 'all' && GENRE_CATEGORIES.some((c) => c.id === g)) {
        return 'genre';
      }
    }
    return 'home';
  });
  const [selectedGenre, setSelectedGenre] = useState<ChristianGenre>(() => {
    if (typeof window !== 'undefined') {
      const g = new URLSearchParams(window.location.search).get('genre') as ChristianGenre | null;
      if (g && GENRE_CATEGORIES.some((c) => c.id === g)) {
        return g;
      }
    }
    return 'all';
  });
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingLiveAPI, setIsSearchingLiveAPI] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const lastTypedSearchRef = useRef<string>('');

  const setSearchValueAndInput = useCallback((nextValue: string) => {
    lastTypedSearchRef.current = nextValue;
    setSearchQuery(nextValue);
    if (searchInputRef.current) {
      searchInputRef.current.value = nextValue;
      try {
        const len = nextValue.length;
        searchInputRef.current.setSelectionRange(len, len);
      } catch {
        // Ignore on unsupported input types
      }
    }
  }, []);

  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    let nextVal = el.value;
    const prevVal = lastTypedSearchRef.current;

    // If a mobile browser/WebView reset the caret to index 0 before inserting the next character
    // (which turns "g" -> "rg" -> "arg" -> "edutitarg"), detect the prepended character and move it to the end!
    if (
      prevVal.length > 0 &&
      nextVal.length === prevVal.length + 1 &&
      nextVal.slice(1) === prevVal &&
      (el.selectionStart === null || el.selectionStart <= 1)
    ) {
      nextVal = prevVal + nextVal[0];
      el.value = nextVal;
    }

    lastTypedSearchRef.current = nextVal;
    try {
      const endPos = nextVal.length;
      el.setSelectionRange(endPos, endPos);
    } catch {
      // Ignore if setSelectionRange is unavailable
    }
    setSearchQuery(nextVal);
  }, []);

  // Catalog & Live Auto-Feed state (restores all previously released songs across PWA restarts)
  const [tracks, setTracks] = useState<Track[]>(() =>
    mergeAndDedupeCatalog([...loadDiscoveredTracksSync(), ...INITIAL_TRACKS])
  );
  const tracksRef = useRef<Track[]>(tracks);
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);
  const [liveSeedIdx, setLiveSeedIdx] = useState<number>(() => loadDiscoveryCursor());
  const liveSeedIdxRef = useRef<number>(liveSeedIdx);
  useEffect(() => {
    liveSeedIdxRef.current = liveSeedIdx;
  }, [liveSeedIdx]);
  const [isSyncingLive, setIsSyncingLive] = useState(false);
  const [autoFeedEnabled, setAutoFeedEnabled] = useState(true);
  const [lastAutoSyncLabel, setLastAutoSyncLabel] = useState('Synced moments ago');
  const [showAllHomeCatalog, setShowAllHomeCatalog] = useState(false);

  // Pre-build all 365 days of calisthenics & devotionals for instant universal search across the entire app
  const all365Days = useMemo(() => {
    return Array.from({ length: 365 }, (_, i) => getCalisthenicsDayPlan(i + 1));
  }, []);

  // Persisted User & Cloud/Offline Vault State
  const initialUserState = useMemo(() => loadPersistedState(), []);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(initialUserState.bookmarkedTrackIds);
  const [offlineIds, setOfflineIds] = useState<string[]>(initialUserState.offlineTrackIds);
  const [completedDays, setCompletedDays] = useState<number[]>(initialUserState.completedCalisthenicsDays);
  const [activeCalisthenicsDay, setActiveCalisthenicsDay] = useState<number>(
    initialUserState.activeCalisthenicsDay
  );
  const [playlists, setPlaylists] = useState<Playlist[]>(initialUserState.playlists);
  const [activeDeviceId, setActiveDeviceId] = useState<string>(initialUserState.activeDeviceId);
  const [activeDeviceName, setActiveDeviceName] = useState<string>(initialUserState.activeDeviceName);
  const [audioQuality, setAudioQuality] = useState<AudioQuality>(initialUserState.audioQuality);
  const [eqPreset, setEqPreset] = useState<string>(initialUserState.eqPreset);
  const [eqGains, setEqGains] = useState<number[]>(initialUserState.eqGains);

  // Ringtones state
  const [ringtoneStudioTrack, setRingtoneStudioTrack] = useState<Track | null>(null);
  const [savedRingtones, setSavedRingtones] = useState<SavedRingtone[]>([
    {
      id: 'rt-init-1',
      trackId: 'trk-skillet-1',
      trackTitle: 'Monster',
      artist: 'Skillet',
      coverUrl: COVER_ROCK_ALTAR,
      sectionLabel: 'Chorus Hook (0:45 – 1:15)',
      durationSeconds: 28,
      style: 'call',
      createdAt: 'Saved',
    },
    {
      id: 'rt-init-2',
      trackId: 'trk-tobymac-1',
      trackTitle: 'City On Our Knees',
      artist: 'TobyMac',
      coverUrl: COVER_HIPHOP_CROWN,
      sectionLabel: 'Morning Devotional Alarm',
      durationSeconds: 28,
      style: 'alarm',
      createdAt: 'Saved',
    },
  ]);

  // Save state whenever user preferences change
  useEffect(() => {
    savePersistedState({
      bookmarkedTrackIds: bookmarkedIds,
      offlineTrackIds: offlineIds,
      completedCalisthenicsDays: completedDays,
      activeCalisthenicsDay,
      playlists,
      activeDeviceId,
      activeDeviceName,
      audioQuality,
      eqPreset,
      eqGains,
    });
  }, [
    bookmarkedIds,
    offlineIds,
    completedDays,
    activeCalisthenicsDay,
    playlists,
    activeDeviceId,
    activeDeviceName,
    audioQuality,
    eqPreset,
    eqGains,
  ]);

  // Audio Player State
  const [currentTrack, setCurrentTrack] = useState<Track>(INITIAL_TRACKS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(INITIAL_TRACKS[0].duration);
  const [spectrum, setSpectrum] = useState<number[]>(Array(16).fill(12));
  const [volume, setVolume] = useState(0.85);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  // Modals & Playlist Creation
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isEQOpen, setIsEQOpen] = useState(false);
  const [sharePayload, setSharePayload] = useState<{
    title: string;
    subtitle: string;
    url: string;
  } | null>(null);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [selectedPlaylistView, setSelectedPlaylistView] = useState<Playlist | null>(null);
  const [playlistPickerTrack, setPlaylistPickerTrack] = useState<Track | null>(null);
  const [isVideoFeedOpen, setIsVideoFeedOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2600);
  }, []);

  // Cross-tab / Cross-device real-time sync via BroadcastChannel
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('sanctuary_connect_sync');
    channel.onmessage = (ev) => {
      const data = ev.data;
      if (data?.type === 'TRACK_CHANGE' && data.track) {
        setCurrentTrack(data.track);
      } else if (data?.type === 'DEVICE_CHANGE') {
        setActiveDeviceId(data.deviceId);
        setActiveDeviceName(data.deviceName);
      }
    };
    return () => channel.close();
  }, []);

  const broadcastSync = (payload: Record<string, unknown>) => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('sanctuary_connect_sync');
    channel.postMessage(payload);
    channel.close();
  };

  // Navigate to dedicated Genre Page when clicking Country or any Christian genre
  const openGenrePage = useCallback((genreId: ChristianGenre) => {
    setSelectedPlaylistView(null);
    setIsVideoFeedOpen(false);
    if (genreId === 'all') {
      setSelectedGenre('all');
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('genre');
        window.history.replaceState({}, '', url.toString());
      }
      setActiveTab((prev) => (prev === 'home' ? 'home' : 'explore'));
      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSelectedGenre(genreId);
    setActiveTab('genre');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('genre', genreId);
      window.history.replaceState({}, '', url.toString());
    }
    const topGenreTracks = tracksRef.current.filter((t) => t.genre === genreId).slice(0, 3);
    if (topGenreTracks.length > 0) {
      audioEngine.prefetchTracks(topGenreTracks);
    }
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Wire up Audio Engine callbacks
  const handleSelectTrack = useCallback((track: Track, startOffset = 0) => {
    setCurrentTrack(track);
    setDuration(track.duration);
    setCurrentTime(startOffset);
    setIsPlaying(true);
    audioEngine.loadAndPlay(track, startOffset);
    broadcastSync({ type: 'TRACK_CHANGE', track });

    // Pre-warm next 3 upcoming tracks in the background for zero-delay transitions
    const list = tracksRef.current;
    const idx = list.findIndex((t) => t.id === track.id);
    if (idx >= 0) {
      const nextSlice = [
        list[(idx + 1) % list.length],
        list[(idx + 2) % list.length],
        list[(idx + 3) % list.length],
      ].filter(Boolean);
      audioEngine.prefetchTracks(nextSlice);
    }
  }, []);

  const handleNextTrack = useCallback(() => {
    const activePool =
      activeTab === 'genre' && selectedGenre !== 'all'
        ? tracks.filter((t) => t.genre === selectedGenre)
        : tracks;
    const pool = activePool.length > 0 ? activePool : tracks;
    const idx = pool.findIndex((t) => t.id === currentTrack.id);
    if (isShuffle) {
      const rand = pool[Math.floor(Math.random() * pool.length)];
      if (rand) handleSelectTrack(rand);
      return;
    }
    const next = pool[(idx + 1) % pool.length] || pool[0];
    if (next) handleSelectTrack(next);
  }, [tracks, currentTrack.id, isShuffle, activeTab, selectedGenre, handleSelectTrack]);

  const currentTimeRef = useRef(0);
  currentTimeRef.current = currentTime;

  const handlePrevTrack = useCallback(() => {
    if (currentTimeRef.current > 4) {
      audioEngine.seek(0);
      return;
    }
    const activePool =
      activeTab === 'genre' && selectedGenre !== 'all'
        ? tracks.filter((t) => t.genre === selectedGenre)
        : tracks;
    const pool = activePool.length > 0 ? activePool : tracks;
    const idx = pool.findIndex((t) => t.id === currentTrack.id);
    const prev = pool[(idx - 1 + pool.length) % pool.length] || pool[0];
    if (prev) handleSelectTrack(prev);
  }, [tracks, currentTrack.id, activeTab, selectedGenre, handleSelectTrack]);

  useEffect(() => {
    audioEngine.setCallbacks(
      (time, dur, spec) => {
        setCurrentTime(time);
        setDuration((prev) => (Math.abs(prev - dur) >= 1 ? dur : prev));
        setSpectrum(spec);
      },
      () => {
        if (isRepeat) {
          audioEngine.loadAndPlay(currentTrack, 0);
          setIsPlaying(true);
        } else {
          handleNextTrack();
        }
      },
      handlePrevTrack,
      handleNextTrack
    );
  }, [currentTrack, isRepeat, handleNextTrack, handlePrevTrack]);

  // Apply initial EQ gains
  useEffect(() => {
    audioEngine.setEQGains(eqGains);
  }, [eqGains]);

  const isSyncingLiveRef = useRef(false);

  // Persist every newly discovered track automatically whenever catalog grows (works reliably with React 18 batching)
  useEffect(() => {
    const nonSeed = tracks.filter((t) => !INITIAL_SEED_ID_SET.has(t.id));
    if (nonSeed.length > 0) {
      void saveDiscoveredTracksToVault(nonSeed);
    }
  }, [tracks]);

  // Live Auto-Ingest Christian Music from Perpetual Server Feed / Apple Music / SoundCloud (Runs Forever & Persists Offline)
  const triggerLiveMusicHarvest = useCallback(
    async (manual = false) => {
      if (isSyncingLiveRef.current) return;
      isSyncingLiveRef.current = true;
      setIsSyncingLive(true);
      try {
        const nextSeed = liveSeedIdxRef.current;
        const incrementedSeed = nextSeed + 1;
        liveSeedIdxRef.current = incrementedSeed;
        setLiveSeedIdx(incrementedSeed);
        saveDiscoveryCursor(incrementedSeed);

        const snapshotKeys = new Set(
          tracksRef.current.map((t) => getCanonicalTrackKey(t.title, t.artist))
        );
        const discovered = await fetchLiveChristianMusicBatch(nextSeed, snapshotKeys);

        let addedCount = 0;
        const prevExistingIds = new Set(tracksRef.current.map((t) => t.id));
        const prevExistingKeys = new Set(
          tracksRef.current.map((t) => getCanonicalTrackKey(t.title, t.artist))
        );
        const freshBatch: Track[] = [];
        for (const d of discovered) {
          const check = verifyChristianTrack({
            title: d.title,
            artist: d.artist,
            album: d.album,
            genreName: d.genre,
          });
          if (!check.isVerifiedChristian) continue;
          const key = getCanonicalTrackKey(d.title, d.artist);
          if (!prevExistingIds.has(d.id) && !prevExistingKeys.has(key)) {
            prevExistingIds.add(d.id);
            prevExistingKeys.add(key);
            freshBatch.push({
              ...d,
              duration: Math.max(170, d.duration || 228),
              sourceOrigin: 'Verified Artist',
              audioPreviewUrl: `/api/music/full-song?title=${encodeURIComponent(d.title)}&artist=${encodeURIComponent(d.artist)}&id=${encodeURIComponent(d.id)}`,
            });
          }
        }

        if (freshBatch.length === 0) {
          const offlineUnseen = generatePerpetualChristianTracks(
            nextSeed,
            prevExistingKeys,
            3
          );
          for (const p of offlineUnseen) {
            const pKey = getCanonicalTrackKey(p.title, p.artist);
            if (!prevExistingIds.has(p.id) && !prevExistingKeys.has(pKey)) {
              prevExistingIds.add(p.id);
              prevExistingKeys.add(pKey);
              freshBatch.push({
                ...p,
                duration: Math.max(170, p.duration || 234),
                sourceOrigin: 'Verified Artist',
                audioPreviewUrl: `/api/music/full-song?title=${encodeURIComponent(p.title)}&artist=${encodeURIComponent(p.artist)}&id=${encodeURIComponent(p.id)}`,
              });
            }
          }
        }

        addedCount = freshBatch.length;
        if (freshBatch.length > 0) {
          setTracks((prev) => mergeAndDedupeCatalog([...freshBatch, ...prev]));
        }

        setLastAutoSyncLabel(
          addedCount > 0
            ? manual
              ? `Added ${addedCount} new Christian songs · Saved to App`
              : `Auto-Released +${addedCount} Christian songs · Saved to App`
            : 'All current Christian pools synced · Checking next batch...'
        );
      } finally {
        isSyncingLiveRef.current = false;
        setIsSyncingLive(false);
      }
    },
    []
  );

  // Purge stale service worker caches on startup, hydrate IndexedDB releases, and pull perpetual Christian batches cleanly
  useEffect(() => {
    let mounted = true;
    let staggeredTimer: number | undefined;

    if (typeof window !== 'undefined' && 'caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((k) => {
          if (k !== 'sanctuary-pulse-v13' && k !== 'sanctuary-audio-vault-v13') {
            caches.delete(k).catch(() => {});
          }
        });
      });
    }
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.update().catch(() => {}));
      });
    }

    void preloadOfflineBlobUrls();

    // Hydrate full persistent library from IndexedDB (even beyond localStorage quota)
    void loadDiscoveredTracksFromVault().then((idbTracks) => {
      if (!mounted || idbTracks.length === 0) return;
      setTracks((prev) => mergeAndDedupeCatalog([...idbTracks, ...prev]));
    });

    const admitBatch = (batch: Track[], nextCursor: number) => {
      if (!mounted || batch.length === 0) return;
      setTracks((prev) => mergeAndDedupeCatalog([...batch, ...prev]));
      liveSeedIdxRef.current = nextCursor;
      setLiveSeedIdx(nextCursor);
      saveDiscoveryCursor(nextCursor);
    };

    // Staggered startup harvest so installed PWAs automatically release brand-new songs right away
    const initialCursor = loadDiscoveryCursor();
    const startupKeys = new Set(
      tracksRef.current.map((t) => getCanonicalTrackKey(t.title, t.artist))
    );
    void fetchLiveChristianMusicBatch(initialCursor, startupKeys).then((firstBatch) => {
      admitBatch(firstBatch, initialCursor + 1);
      if (!mounted) return;
      staggeredTimer = window.setTimeout(() => {
        if (!mounted) return;
        const secondKeys = new Set(
          tracksRef.current.map((t) => getCanonicalTrackKey(t.title, t.artist))
        );
        void fetchLiveChristianMusicBatch(initialCursor + 1, secondKeys).then((secondBatch) => {
          admitBatch(secondBatch, initialCursor + 2);
        });
      }, 2500);
    });

    // Pre-warm top 3 tracks immediately so clicking Play starts instantaneously
    audioEngine.prefetchTracks(INITIAL_TRACKS.slice(0, 3));

    return () => {
      mounted = false;
      if (staggeredTimer) window.clearTimeout(staggeredTimer);
    };
  }, []);

  // Forever non-stop automatic release loop (runs continuously every 8s + on app resume/reconnect without needing manual clicks)
  useEffect(() => {
    if (!autoFeedEnabled) return;
    const interval = window.setInterval(() => {
      void triggerLiveMusicHarvest(false);
    }, 8000);
    const handleVisibilityOrOnline = () => {
      if (document.visibilityState === 'visible') {
        void triggerLiveMusicHarvest(false);
      }
    };
    window.addEventListener('online', handleVisibilityOrOnline);
    document.addEventListener('visibilitychange', handleVisibilityOrOnline);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', handleVisibilityOrOnline);
      document.removeEventListener('visibilitychange', handleVisibilityOrOnline);
    };
  }, [autoFeedEnabled, triggerLiveMusicHarvest]);

  // Live debounced search against global Apple Music / YouTube Full-Song Catalog whenever user types a query
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setIsSearchingLiveAPI(false);
      return;
    }
    setIsSearchingLiveAPI(true);
    const timer = window.setTimeout(async () => {
      const liveMatches = await searchChristianCatalogLive(q);
      if (liveMatches.length > 0) {
        setTracks((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const existingKeys = new Set(
            prev.map((t) => getCanonicalTrackKey(t.title, t.artist))
          );
          const fresh = liveMatches
            .filter((m) => {
              const key = getCanonicalTrackKey(m.title, m.artist);
              if (existingIds.has(m.id) || existingKeys.has(key)) return false;
              existingIds.add(m.id);
              existingKeys.add(key);
              return true;
            })
            .map((m) => ({
              ...m,
              audioPreviewUrl: `/api/music/full-song?title=${encodeURIComponent(m.title)}&artist=${encodeURIComponent(m.artist)}&id=${encodeURIComponent(m.id)}`,
            }));
          return [...prev, ...fresh];
        });
      }
      setIsSearchingLiveAPI(false);
    }, 380);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filtered tracks for current genre and universal search query (supports both normal & accidentally reversed queries)
  const filteredTracks = useMemo(() => {
    const rawQ = searchQuery.toLowerCase().trim();
    const reversedQ = rawQ.split('').reverse().join('');
    return tracks.filter((trk) => {
      if (selectedGenre !== 'all' && trk.genre !== selectedGenre) return false;
      if (rawQ !== '') {
        const searchableText = [
          trk.title,
          trk.artist,
          trk.album,
          trk.genreLabel,
          trk.genre,
          trk.scriptureReference,
          trk.platformIngestedFrom,
          `${trk.bpm} bpm`,
          ...trk.lyricsSnippet,
          ...trk.workoutSuitability,
        ]
          .join(' ')
          .toLowerCase();
        const matchesForward = searchableText.includes(rawQ);
        const matchesReversed = reversedQ.length >= 2 && searchableText.includes(reversedQ);
        if (!matchesForward && !matchesReversed) return false;
      }
      return true;
    });
  }, [tracks, selectedGenre, searchQuery]);

  // Universal Search Results across Playlists & all 365 Calisthenics Workouts + Devotionals
  const matchedPlaylists = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    const rev = q.split('').reverse().join('');
    return playlists.filter((pl) => {
      const text = `${pl.name} ${pl.description} ${pl.category}`.toLowerCase();
      return text.includes(q) || (rev.length >= 2 && text.includes(rev));
    });
  }, [playlists, searchQuery]);

  const matchedCalisthenicsDays = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    const rev = q.split('').reverse().join('');
    return all365Days
      .filter((day) => {
        const exNames = day.exercises
          .map((e) => `${e.name} ${e.category} ${e.equipment} ${e.formCue}`)
          .join(' ');
        const fullText = `day ${day.dayNumber} week ${day.weekNumber} ${day.workoutTitle} ${day.focusArea} ${day.difficultyBadge} ${day.devotional.scriptureRef} ${day.devotional.title} ${day.devotional.scriptureText} ${day.bikeProtocol.title} ${exNames}`.toLowerCase();
        return fullText.includes(q) || (rev.length >= 2 && fullText.includes(rev));
      })
      .slice(0, 12);
  }, [all365Days, searchQuery]);

  // Toggle Like / Bookmark (Spotify Heart ♥)
  const handleToggleBookmark = (trackId: string) => {
    const trk = tracks.find((t) => t.id === trackId);
    const alreadyLiked = bookmarkedIds.includes(trackId);
    setBookmarkedIds((prev) =>
      alreadyLiked ? prev.filter((id) => id !== trackId) : [trackId, ...prev]
    );
    showToast(
      alreadyLiked
        ? `Removed “${trk?.title || 'Song'}” from Liked Songs`
        : `Added “${trk?.title || 'Song'}” to Liked Songs ♥`
    );
  };

  // Universal 1-Tap Share Song across all sections
  const handleShareTrack = useCallback((trk: Track) => {
    setSharePayload({
      title: `${trk.title} — ${trk.artist}`,
      subtitle: `${trk.genreLabel} · ${trk.bpm} BPM · ${trk.scriptureReference}`,
      url: `${window.location.origin}/?track=${trk.id}`,
    });
  }, []);

  // Toggle Offline Storage Download
  const [isCachingAllOffline, setIsCachingAllOffline] = useState(false);
  const [cacheProgressText, setCacheProgressText] = useState<string | null>(null);

  const handleToggleOffline = async (track: Track) => {
    const exists = offlineIds.includes(track.id);
    if (exists) {
      setOfflineIds((prev) => prev.filter((id) => id !== track.id));
      await removeTrackFromIndexedDB(track.id);
      showToast(`Removed “${track.title}” from Offline Storage`);
    } else {
      setOfflineIds((prev) => [...prev, track.id]);
      fetchAndCacheTrackOffline(track).catch(() => {});
      showToast(`Saved “${track.title}” for Offline Listening ✓`);
    }
  };

  const handleDownloadTrackToPhone = (track: Track) => {
    downloadTrackToDevice(track);
    if (!offlineIds.includes(track.id)) {
      setOfflineIds((prev) => [...prev, track.id]);
    }
    showToast(`Downloading “${track.title}” to device & offline storage...`);
  };

  const handleCacheAllOffline = async (trackList?: Track[]) => {
    const targetTracks = trackList || tracks;
    if (targetTracks.length === 0 || isCachingAllOffline) return;
    setIsCachingAllOffline(true);
    setCacheProgressText(`Caching 1 of ${targetTracks.length}...`);
    try {
      const savedCount = await cacheMultipleTracksOffline(targetTracks, (done, total) => {
        setCacheProgressText(`Cached ${done} of ${total}...`);
      });
      const newIds = new Set(offlineIds);
      targetTracks.forEach((t) => newIds.add(t.id));
      setOfflineIds(Array.from(newIds));
      showToast(`Saved ${savedCount} songs offline ✓`);
    } catch {
      showToast('Offline cache complete');
    } finally {
      setIsCachingAllOffline(false);
      setCacheProgressText(null);
    }
  };

  // Toggle Offline for Entire Playlist
  const handleTogglePlaylistOffline = async (playlist: Playlist) => {
    const nextOffline = !playlist.isOfflineSaved;
    setPlaylists((prev) =>
      prev.map((p) => (p.id === playlist.id ? { ...p, isOfflineSaved: nextOffline } : p))
    );
    if (nextOffline) {
      const plTracks = tracks.filter((t) => playlist.trackIds.includes(t.id));
      const newIds = new Set(offlineIds);
      for (const t of plTracks) {
        newIds.add(t.id);
        await saveTrackToIndexedDB(t);
      }
      setOfflineIds(Array.from(newIds));
    }
  };

  // Add track to playlist
  const handleAddTrackToPlaylist = (playlistId: string, trackId: string) => {
    const targetPl = playlists.find((p) => p.id === playlistId);
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        if (pl.trackIds.includes(trackId)) return pl;
        return { ...pl, trackIds: [...pl.trackIds, trackId] };
      })
    );
    if (targetPl) {
      showToast(`Added to “${targetPl.name}” ✓`);
    }
  };

  // Toggle track in/out of playlist from the universal AddToPlaylistModal
  const handleToggleTrackInPlaylist = (playlistId: string, trackId: string) => {
    const targetPl = playlists.find((p) => p.id === playlistId);
    const alreadyIn = targetPl?.trackIds.includes(trackId);
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        const exists = pl.trackIds.includes(trackId);
        return {
          ...pl,
          trackIds: exists
            ? pl.trackIds.filter((id) => id !== trackId)
            : [...pl.trackIds, trackId],
        };
      })
    );
    if (targetPl) {
      showToast(
        alreadyIn ? `Removed from “${targetPl.name}”` : `Saved to “${targetPl.name}” ✓`
      );
    }
  };

  // Create new playlist and immediately add the selected track
  const handleCreatePlaylistWithTrack = (name: string, description: string, trackId: string) => {
    const matched = tracks.find((t) => t.id === trackId) || currentTrack;
    const newPl: Playlist = {
      id: `pl-custom-${Date.now()}`,
      name,
      description,
      coverUrl: matched.coverUrl || COVER_ROCK_ALTAR,
      category: 'Custom Mix',
      trackIds: [trackId],
      isOfflineSaved: true,
      createdBy: 'You',
      followersCount: '1',
    };
    setPlaylists((prev) => [newPl, ...prev]);
    showToast(`Created “${name}” & added song ✓`);
  };

  // Create custom playlist
  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const newPl: Playlist = {
      id: `pl-custom-${Date.now()}`,
      name: newPlaylistName.trim(),
      description: newPlaylistDesc.trim() || 'Custom Christian workout & worship mix.',
      coverUrl: COVER_ROCK_ALTAR,
      category: 'Custom Mix',
      trackIds: [currentTrack.id],
      isOfflineSaved: true,
      createdBy: 'You',
      followersCount: '1',
    };
    setPlaylists((prev) => [newPl, ...prev]);
    setNewPlaylistName('');
    setNewPlaylistDesc('');
    setIsCreatePlaylistOpen(false);
    showToast(`Created playlist “${newPl.name}” ✓`);
  };

  // Start BPM-matched workout music from Calisthenics Coach
  const handleStartWorkoutMusic = (genre: Exclude<ChristianGenre, 'all'>, targetBpm: number) => {
    const candidates = tracks.filter((t) => t.genre === genre);
    const pool = candidates.length > 0 ? candidates : tracks;
    const sortedByBpm = [...pool].sort(
      (a, b) => Math.abs(a.bpm - targetBpm) - Math.abs(b.bpm - targetBpm)
    );
    if (sortedByBpm[0]) {
      handleSelectTrack(sortedByBpm[0]);
    }
  };

  // Toggle Play/Pause
  const handleTogglePlay = () => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      if (audioEngine.hasActiveAudio()) {
        audioEngine.resume(currentTrack);
      } else {
        audioEngine.loadAndPlay(currentTrack, currentTime);
      }
      setIsPlaying(true);
    }
  };

  // Open Full-Screen Video Mode and guarantee active playback so lyrics & video move immediately
  const handleOpenFullScreenVideo = (targetTrack?: Track) => {
    const trk = targetTrack || currentTrack;
    if (targetTrack && targetTrack.id !== currentTrack.id) {
      handleSelectTrack(targetTrack, 0);
    } else if (!isPlaying) {
      if (audioEngine.hasActiveAudio()) {
        audioEngine.resume(trk);
      } else {
        audioEngine.loadAndPlay(trk, currentTime);
      }
      setIsPlaying(true);
    }
    setIsVideoFeedOpen(true);
  };

  const formatDuration = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const audioQualityLabel =
    audioQuality === 'lossless'
      ? '24-bit/96kHz FLAC'
      : audioQuality === 'high'
      ? '320kbps AAC'
      : audioQuality === 'normal'
      ? '160kbps AAC'
      : '64kbps Saver';

  return (
    <div className="h-[100dvh] w-screen overflow-hidden flex flex-col bg-slate-50 dark:bg-[#090A0F] text-slate-900 dark:text-[#F4F4F6]">
      <OfflineIndicator offlineTracksCount={offlineIds.length} />

      {/* Main App Workspace: Desktop Left Sidebar + Central Native Feed */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left Navigation Rail (Desktop / Tablet) */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white dark:bg-[#0D0F17] border-r border-slate-200 dark:border-slate-800/80 p-4 justify-between">
          <div className="space-y-6">
            {/* Brand Lockup */}
            <div className="flex items-center justify-between px-2">
              <button
                onClick={() => {
                  setActiveTab('home');
                  setSelectedPlaylistView(null);
                  setSearchValueAndInput('');
                }}
                className="flex items-center gap-2.5 text-left cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold text-base shadow-sm">
                  S
                </div>
                <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                  Sanctuary Pulse
                </span>
              </button>
            </div>

            {/* Primary App Navigation */}
            <nav className="space-y-1">
              {[
                { id: 'home', label: 'Listen Now', icon: Home },
                { id: 'explore', label: 'Explore Genres', icon: Compass },
                { id: 'calisthenics', label: '365 Calisthenics', icon: Dumbbell },
                { id: 'radar', label: 'New Releases', icon: Radio },
                { id: 'library', label: 'Vault & Ringtones', icon: Library },
              ].map((item) => {
                const Icon = item.icon;
                const active =
                  activeTab === item.id ||
                  (item.id === 'explore' && activeTab === 'genre');
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as AppTab);
                      setSelectedPlaylistView(null);
                      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Quick Playlists Section */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-semibold text-slate-400">Your Playlists</span>
                <button
                  onClick={() => setIsCreatePlaylistOpen(true)}
                  className="text-xs font-semibold text-amber-500 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>
              </div>

              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {/* Pinned Spotify-Style Liked Songs ♥ Row */}
                <button
                  onClick={() => {
                    setSelectedPlaylistView({
                      id: 'liked-songs-virtual',
                      name: 'Liked Songs ♥',
                      description: 'All the Christian songs you have liked across Sanctuary Pulse.',
                      coverUrl: COVER_WORSHIP_RNB,
                      category: 'Liked Collection',
                      trackIds: bookmarkedIds,
                      isOfflineSaved: true,
                      createdBy: 'You',
                      followersCount: 'Personal',
                    });
                    setActiveTab('library');
                  }}
                  className="w-full px-2.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 flex items-center justify-between text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 text-slate-950 flex items-center justify-center shrink-0">
                      <Heart className="w-3.5 h-3.5 fill-current" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        Liked Songs ♥
                      </div>
                      <div className="text-[11px] text-emerald-500 font-medium truncate">
                        {bookmarkedIds.length} liked songs
                      </div>
                    </div>
                  </div>
                </button>

                {playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => {
                      setSelectedPlaylistView(pl);
                      setActiveTab('library');
                    }}
                    className="w-full px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-center justify-between text-left group cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-amber-500">
                        {pl.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {pl.trackIds.length} tracks · {pl.isOfflineSaved ? 'Offline' : 'Cloud'}
                      </div>
                    </div>
                    {pl.isOfflineSaved && (
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Sidebar: Quick Ringtone Studio + 365 Workout Card */}
          <div className="rounded-2xl bg-slate-100 dark:bg-[#12141E] border border-slate-200 dark:border-slate-800 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 dark:text-white">
                Day {activeCalisthenicsDay} of 365
              </span>
              <span className="font-mono text-amber-500">{savedRingtones.length} Ringtones</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              Full songs, 1-tap ringtone creator, and video workout demos ready.
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setActiveTab('calisthenics')}
                className="min-h-[36px] rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-[11px] font-bold hover:opacity-90 cursor-pointer"
              >
                365 Workout
              </button>
              <button
                onClick={() => setRingtoneStudioTrack(currentTrack)}
                className="min-h-[36px] rounded-xl bg-amber-500 text-slate-950 text-[11px] font-bold hover:bg-amber-400 cursor-pointer flex items-center justify-center gap-1"
              >
                <BellRing className="w-3 h-3" />
                <span>Ringtone</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Central App Viewport */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          {/* App Top Bar: Universal Search, Liked, Video, Theme, Install */}
          <header className="h-14 sm:h-16 shrink-0 px-3 sm:px-6 border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#090A0F]/90 backdrop-blur-md flex items-center justify-between gap-2 sm:gap-3 z-30">
            {/* Universal Search Input */}
            <div className="relative flex-1 min-w-[130px] max-w-lg">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                dir="ltr"
                defaultValue=""
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                onChange={handleSearchInputChange}
                onFocus={(e) => {
                  const len = e.currentTarget.value.length;
                  try {
                    e.currentTarget.setSelectionRange(len, len);
                  } catch {}
                }}
                onClick={(e) => {
                  const len = e.currentTarget.value.length;
                  if ((e.currentTarget.selectionStart ?? len) === 0 && len > 0) {
                    try {
                      e.currentTarget.setSelectionRange(len, len);
                    } catch {}
                  }
                }}
                placeholder="Search songs, artists, or genres..."
                className="w-full min-h-[38px] pl-9 pr-8 rounded-xl bg-slate-100 dark:bg-[#12141E] border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 select-text text-left"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchValueAndInput('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Right Utility Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <PWAInstallButton />

              {/* Direct 1-Tap Liked Songs Shortcut Button */}
              <button
                onClick={() => {
                  setSelectedPlaylistView({
                    id: 'liked-songs-virtual',
                    name: 'Liked Songs ♥',
                    description: 'All the Christian songs you have liked across Sanctuary Pulse.',
                    coverUrl: COVER_WORSHIP_RNB,
                    category: 'Liked Collection',
                    trackIds: bookmarkedIds,
                    isOfflineSaved: true,
                    createdBy: 'You',
                    followersCount: 'Personal',
                  });
                  setActiveTab('library');
                }}
                className="min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap border border-emerald-500/30"
                title="View All Liked Songs ♥"
              >
                <Heart className="w-3.5 h-3.5 fill-current text-emerald-400 shrink-0" />
                <span className="font-extrabold">Liked ({bookmarkedIds.length})</span>
              </button>

              <button
                onClick={() => handleOpenFullScreenVideo()}
                className="min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-sm"
                title="Open Video Feed"
              >
                <Film className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Video Feed</span>
              </button>

              <button
                onClick={() => setRingtoneStudioTrack(currentTrack)}
                className="hidden sm:flex min-h-[38px] px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-500 hover:text-slate-950 text-xs font-bold items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                title="Ringtone Studio"
              >
                <BellRing className="w-4 h-4" />
                <span className="hidden md:inline">Ringtone</span>
              </button>

              <button
                onClick={() => setIsConnectOpen(true)}
                className="hidden md:flex min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#12141E] border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 items-center gap-1.5 hover:border-amber-500/50 cursor-pointer whitespace-nowrap"
                title="Sanctuary Connect"
              >
                <Speaker className="w-4 h-4 text-amber-500" />
                <span className="hidden lg:inline">Connect</span>
              </button>

              <button
                onClick={() => setIsDark(!isDark)}
                className="hidden sm:flex min-h-[38px] min-w-[38px] rounded-xl bg-slate-100 dark:bg-[#12141E] border border-slate-200 dark:border-slate-800 items-center justify-center text-slate-700 dark:text-slate-200 hover:border-amber-500/50 cursor-pointer"
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </header>

          {/* Always-Visible Mobile & Tablet Top Navigation Tab Strip */}
          <div className="md:hidden shrink-0 bg-white dark:bg-[#0D0F17] border-b border-slate-200 dark:border-slate-800/90 px-2 py-1.5 grid grid-cols-5 gap-1 z-30">
            {[
              { id: 'home', label: 'Home', icon: Home },
              { id: 'explore', label: 'Explore', icon: Compass },
              { id: 'calisthenics', label: '365 Coach', icon: Dumbbell },
              { id: 'radar', label: 'Releases', icon: Radio },
              { id: 'library', label: 'Vault', icon: Library },
            ].map((tab) => {
              const Icon = tab.icon;
              const active =
                activeTab === tab.id ||
                (tab.id === 'explore' && activeTab === 'genre');
              return (
                <button
                  key={`top-${tab.id}`}
                  onClick={() => {
                    setActiveTab(tab.id as AppTab);
                    setSelectedPlaylistView(null);
                    setIsVideoFeedOpen(false);
                    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`min-h-[36px] rounded-xl flex items-center justify-center gap-1 px-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                    active
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Scrollable Main Content Feed */}
          <main ref={mainScrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 pb-12 md:pb-8">
            <div className="max-w-7xl mx-auto space-y-7">
              {/* UNIVERSAL SEARCH RESULTS PANEL */}
              {searchQuery.trim() !== '' && (
                <div className="rounded-3xl bg-white dark:bg-[#12141E] border border-amber-500/40 p-5 sm:p-6 space-y-6 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div>
                      <div className="text-xs font-mono text-amber-500">
                        UNIVERSAL APP & GLOBAL CATALOG SEARCH
                      </div>
                      <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                        Results for “{searchQuery}”
                      </h2>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                      {isSearchingLiveAPI && (
                        <span className="text-amber-400 flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Searching Live Streaming Catalog...
                        </span>
                      )}
                      <span>
                        {filteredTracks.length} Full Songs · {matchedCalisthenicsDays.length} Workouts · {matchedPlaylists.length} Playlists
                      </span>
                      <button
                        onClick={() => setSearchValueAndInput('')}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-amber-500 hover:text-slate-950 font-sans font-semibold cursor-pointer"
                      >
                        Clear Search
                      </button>
                    </div>
                  </div>

                  {/* 1. Matched Full Songs */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Matched Full Christian Songs & Artists ({filteredTracks.length})
                    </h3>
                    {filteredTracks.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        Searching global Christian releases...
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
                        {filteredTracks.slice(0, 30).map((trk) => {
                          const isCurrent = currentTrack.id === trk.id;
                          const isLiked = bookmarkedIds.includes(trk.id);
                          return (
                            <div
                              key={trk.id}
                              className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                                isCurrent
                                  ? 'bg-emerald-500/15 border-emerald-500/50'
                                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-emerald-500/40'
                              }`}
                            >
                              <button
                                onClick={() => handleSelectTrack(trk)}
                                className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                              >
                                <img
                                  src={trk.coverUrl}
                                  alt={trk.title}
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = COVER_ROCK_ALTAR;
                                  }}
                                  className="w-11 h-11 rounded-lg object-cover shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {trk.title}
                                  </div>
                                  <div className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                                    {trk.artist}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">
                                    <span className="font-mono text-amber-500">{formatDuration(trk.duration)}</span>
                                    <span aria-hidden="true">·</span>
                                    <span>{trk.genreLabel}</span>
                                    <span aria-hidden="true">·</span>
                                    <span>{trk.bpm} BPM</span>
                                  </div>
                                </div>
                              </button>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleToggleBookmark(trk.id)}
                                  className={`min-h-[34px] min-w-[34px] rounded-lg flex items-center justify-center cursor-pointer ${
                                    isLiked
                                      ? 'text-emerald-400 bg-emerald-500/15'
                                      : 'text-slate-400 hover:text-emerald-400'
                                  }`}
                                  title={isLiked ? 'Liked ♥' : 'Like song ♥'}
                                >
                                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                                </button>
                                <button
                                  onClick={() => setPlaylistPickerTrack(trk)}
                                  className="min-h-[34px] min-w-[34px] rounded-lg bg-slate-200/70 dark:bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 cursor-pointer"
                                  title="Add to playlist"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleShareTrack(trk)}
                                  className="min-h-[34px] min-w-[34px] rounded-lg bg-slate-200/70 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 cursor-pointer"
                                  title="Share song"
                                >
                                  <Share2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setRingtoneStudioTrack(trk)}
                                  className="min-h-[34px] min-w-[34px] rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-500 hover:text-slate-950 flex items-center justify-center shrink-0 cursor-pointer"
                                  title="Add song straight to Ringtones"
                                >
                                  <BellRing className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 2. Matched 365-Day Calisthenics Workouts, Video Exercises & Daily Devotionals */}
                  {matchedCalisthenicsDays.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Dumbbell className="w-4 h-4 text-amber-500" />
                        <span>
                          Matched 365-Day Calisthenics Workouts, Video Demos & Devotionals ({matchedCalisthenicsDays.length})
                        </span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {matchedCalisthenicsDays.map((dayPlan) => (
                          <button
                            key={dayPlan.dayNumber}
                            onClick={() => {
                              setActiveCalisthenicsDay(dayPlan.dayNumber);
                              setActiveTab('calisthenics');
                              setSearchValueAndInput('');
                            }}
                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-amber-500 text-left space-y-1.5 transition-all cursor-pointer"
                          >
                            <div className="flex items-center justify-between text-[11px] font-mono text-amber-500">
                              <span>DAY {dayPlan.dayNumber} OF 365</span>
                              <span>{dayPlan.difficultyBadge}</span>
                            </div>
                            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                              {dayPlan.workoutTitle}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                              Video Demos: {dayPlan.exercises.map((e) => e.name).join(', ')}
                            </div>
                            <div className="text-[11px] text-emerald-500 font-medium flex items-center gap-1 pt-0.5">
                              <BookOpen className="w-3 h-3" />
                              <span className="truncate">
                                {dayPlan.devotional.scriptureRef} — {dayPlan.devotional.title}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Matched Playlists */}
                  {matchedPlaylists.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Matched Playlists ({matchedPlaylists.length})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {matchedPlaylists.map((pl) => (
                          <button
                            key={pl.id}
                            onClick={() => {
                              setSelectedPlaylistView(pl);
                              setActiveTab('library');
                              setSearchValueAndInput('');
                            }}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-amber-500 text-left cursor-pointer"
                          >
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                              {pl.name}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              {pl.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Persistent Genre Filter Bar on Home & Explore */}
              {(activeTab === 'home' || activeTab === 'explore') && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {GENRE_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => openGenrePage(cat.id)}
                        className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                          selectedGenre === cat.id
                            ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                            : 'bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-500/50'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 1: HOME */}
              {activeTab === 'home' && (
                <div className="space-y-8">
                  {/* Top Split: Featured Christian Music Hero + Radio Station */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                    <div className="lg:col-span-8 relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800/80 bg-slate-900 min-h-[240px] flex flex-col justify-between p-6 sm:p-8">
                      <img
                        src={BANNER_CALISTHENICS}
                        alt="Christian Music and Devotion"
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover opacity-45"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#090A0F] via-[#090A0F]/85 to-transparent" />

                      <div className="relative z-10 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                          Original Christian Music & Workouts
                        </span>
                        <span className="text-xs font-mono text-slate-300">
                          {tracks.length} Songs
                        </span>
                      </div>

                      <div className="relative z-10 max-w-xl space-y-2 my-3">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-balance">
                          Christian Music, Video Canvas & Daily Devotionals
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                          Original recordings by Brandon Lake, Skillet, TobyMac, Lecrae, Demon Hunter, Kamban & T-Strike. Zero explicit content.
                        </p>
                      </div>

                      <div className="relative z-10 flex flex-wrap items-center gap-2.5">
                        <button
                          onClick={() => handleSelectTrack(filteredTracks[0] || INITIAL_TRACKS[0])}
                          className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg cursor-pointer transition-transform active:scale-95"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>Play Music</span>
                        </button>
                        <button
                          onClick={() => handleOpenFullScreenVideo()}
                          className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg cursor-pointer"
                        >
                          <Film className="w-4 h-4" />
                          <span>Full-Screen Videos</span>
                        </button>
                        <button
                          onClick={() => handleToggleBookmark(currentTrack.id)}
                          className={`min-h-[44px] px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 border cursor-pointer ${
                            bookmarkedIds.includes(currentTrack.id)
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                              : 'bg-white/15 hover:bg-white/25 text-white border-white/15'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${bookmarkedIds.includes(currentTrack.id) ? 'fill-current' : ''}`} />
                          <span>{bookmarkedIds.includes(currentTrack.id) ? 'Liked ♥' : 'Like'}</span>
                        </button>
                        <button
                          onClick={() => setPlaylistPickerTrack(currentTrack)}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 border border-white/15 cursor-pointer"
                        >
                          <ListPlus className="w-4 h-4 text-emerald-400" />
                          <span>Playlist</span>
                        </button>
                        <button
                          onClick={() => handleShareTrack(currentTrack)}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 border border-white/15 cursor-pointer"
                        >
                          <Share2 className="w-4 h-4 text-amber-400" />
                          <span>Share</span>
                        </button>
                      </div>
                    </div>

                    {/* Right 4 Cols: Release Station Card */}
                    <div className="lg:col-span-4 rounded-3xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800/80 p-5 sm:p-6 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-wider">
                            <Radio className="w-4 h-4" />
                            <span>Christian Radio</span>
                          </div>
                          <span className="text-xs font-mono text-emerald-500 font-semibold">Active</span>
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                          Verified Christian Music
                        </h2>
                      </div>

                      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 p-3.5 space-y-1">
                        <div className="text-[11px] font-mono text-slate-400 uppercase">
                          Current Song
                        </div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {currentTrack.title}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {currentTrack.artist}
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveTab('explore')}
                        className="w-full min-h-[42px] rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        Explore All {tracks.length} Songs
                      </button>
                    </div>
                  </div>

                  {/* SPOTIFY CANVAS & FULL-SONG VIDEO PREVIEWS STRIP */}
                  <SpotifyVideoFeedStrip
                    tracks={filteredTracks.length > 0 ? filteredTracks : tracks}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    spectrum={spectrum}
                    likedTrackIds={bookmarkedIds}
                    onSelectTrack={(trk) => handleSelectTrack(trk, 0)}
                    onTogglePlay={handleTogglePlay}
                    onToggleLike={handleToggleBookmark}
                    onOpenAddToPlaylist={(trk) => setPlaylistPickerTrack(trk)}
                    onShareTrack={handleShareTrack}
                    onOpenFullScreenFeed={(trk) => {
                      handleOpenFullScreenVideo(trk);
                    }}
                  />

                  {/* YouTube Music / Spotify Style "Speed Dial / Quick Picks" Grid (18 Songs) */}
                  <section className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                          Quick Picks & Full-Length Rotation
                        </h2>
                      </div>
                      <button
                        onClick={() => setActiveTab('explore')}
                        className="text-xs font-semibold text-amber-500 hover:underline cursor-pointer"
                      >
                        Browse All {filteredTracks.length} Songs →
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredTracks.slice(0, 18).map((trk) => {
                        const isCurrent = currentTrack.id === trk.id;
                        const isSavedOffline = offlineIds.includes(trk.id);
                        const isBookmarked = bookmarkedIds.includes(trk.id);
                        return (
                          <div
                            key={trk.id}
                            className={`p-3 rounded-2xl border flex items-center justify-between gap-2 transition-all ${
                              isCurrent
                                ? 'bg-amber-500/10 border-amber-500/50'
                                : 'bg-white dark:bg-[#12141E] border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <button
                              onClick={() => handleSelectTrack(trk)}
                              className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer group"
                            >
                              <div className="relative w-13 h-13 rounded-xl overflow-hidden shrink-0 bg-slate-900">
                                <img
                                  src={trk.coverUrl}
                                  alt={trk.title}
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = COVER_ROCK_ALTAR;
                                  }}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  {isCurrent && isPlaying ? (
                                    <Pause className="w-5 h-5 text-amber-400 fill-current" />
                                  ) : (
                                    <Play className="w-5 h-5 text-white fill-current" />
                                  )}
                                </div>
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                                  {trk.title}
                                </div>
                                <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                                  {trk.artist}
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">
                                  <span className="font-mono text-amber-500">
                                    {formatDuration(trk.duration)}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span>{trk.genreLabel}</span>
                                  <span aria-hidden="true">·</span>
                                  <span>{trk.bpm} BPM</span>
                                </div>
                              </div>
                            </button>

                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                onClick={() => handleToggleBookmark(trk.id)}
                                className={`min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center cursor-pointer ${
                                  isBookmarked
                                    ? 'text-emerald-400 bg-emerald-500/15'
                                    : 'text-slate-400 hover:text-emerald-400'
                                }`}
                                title={isBookmarked ? 'Liked ♥' : 'Like song ♥'}
                              >
                                <Heart className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                              </button>
                              <button
                                onClick={() => setPlaylistPickerTrack(trk)}
                                className="min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center text-slate-400 hover:bg-emerald-500 hover:text-slate-950 transition-colors cursor-pointer"
                                title="Add to Playlist"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleShareTrack(trk)}
                                className="min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center text-slate-400 hover:bg-amber-500 hover:text-slate-950 transition-colors cursor-pointer"
                                title="Share song"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setRingtoneStudioTrack(trk)}
                                className="min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center text-amber-500 hover:bg-amber-500 hover:text-slate-950 transition-colors cursor-pointer"
                                title="Add song straight to Ringtones"
                              >
                                <BellRing className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleToggleOffline(trk)}
                                className={`min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center cursor-pointer ${
                                  isSavedOffline
                                    ? 'text-emerald-500'
                                    : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                                title="Save to Offline Vault"
                              >
                                {isSavedOffline ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Offline-Capable Workout & Worship Playlists Row */}
                  <section className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                          Playlists
                        </h2>
                      </div>
                      <button
                        onClick={() => setIsCreatePlaylistOpen(true)}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-[#12141E] border border-slate-300 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 hover:border-amber-500 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-500" />
                        <span>Create Playlist</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {playlists.map((pl) => (
                        <div
                          key={pl.id}
                          className="rounded-2xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800/80 p-4 flex flex-col justify-between space-y-3 hover:border-amber-500/40 transition-all"
                        >
                          <div className="space-y-3">
                            <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-900 group">
                              <img
                                src={pl.coverUrl}
                                alt={pl.name}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = COVER_ROCK_ALTAR;
                                }}
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={() => {
                                  const firstTrack = tracks.find((t) => pl.trackIds.includes(t.id));
                                  if (firstTrack) handleSelectTrack(firstTrack);
                                }}
                                className="absolute bottom-3 right-3 w-11 h-11 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer"
                                title={`Play ${pl.name}`}
                              >
                                <Play className="w-5 h-5 fill-current ml-0.5" />
                              </button>
                            </div>

                            <div>
                              <div className="text-[11px] text-amber-500 font-medium">
                                {pl.category} · {pl.trackIds.length} songs
                              </div>
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 line-clamp-1">
                                {pl.name}
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                {pl.description}
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                            <button
                              onClick={() => handleTogglePlaylistOffline(pl)}
                              className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                                pl.isOfflineSaved
                                  ? 'text-emerald-500 bg-emerald-500/10'
                                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              {pl.isOfflineSaved ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              <span>{pl.isOfflineSaved ? 'Offline Ready' : 'Save Offline'}</span>
                            </button>

                            <button
                              onClick={() =>
                                setSharePayload({
                                  title: pl.name,
                                  subtitle: `${pl.description} (${pl.trackIds.length} Christian tracks)`,
                                  url: `${window.location.origin}/?playlist=${pl.id}`,
                                })
                              }
                              className="min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                              title="Share playlist across platforms"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Complete Christian Catalog Stream on Home */}
                  <section className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                          Complete Christian Catalog ({filteredTracks.length} Songs)
                        </h2>
                      </div>
                      <button
                        onClick={() => triggerLiveMusicHarvest(true)}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-500 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLive ? 'animate-spin' : ''}`} />
                        <span>Load More Releases</span>
                      </button>
                    </div>

                    <div className="rounded-2xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800/80 divide-y divide-slate-100 dark:divide-slate-800/70">
                      {(showAllHomeCatalog ? filteredTracks.slice(18) : filteredTracks.slice(18, 95)).map((trk, idx) => {
                        const active = currentTrack.id === trk.id;
                        const bookmarked = bookmarkedIds.includes(trk.id);
                        const offline = offlineIds.includes(trk.id);
                        return (
                          <div
                            key={trk.id}
                            className={`px-4 py-2.5 flex items-center justify-between gap-3 ${
                              active ? 'bg-amber-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <button
                              onClick={() => handleSelectTrack(trk)}
                              className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                            >
                              <span className="w-6 text-xs font-mono text-slate-400">
                                {idx + 19}
                              </span>
                              <img
                                src={trk.coverUrl}
                                alt={trk.title}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = COVER_ROCK_ALTAR;
                                }}
                                className="w-10 h-10 rounded-lg object-cover shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                  {trk.title}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                                  <span>{trk.artist}</span>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono text-amber-500">
                                    Full {formatDuration(trk.duration)}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span>{trk.genreLabel}</span>
                                  <span aria-hidden="true">·</span>
                                  <span>{trk.bpm} BPM</span>
                                </div>
                              </div>
                            </button>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleToggleBookmark(trk.id)}
                                className={`min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center cursor-pointer ${
                                  bookmarked
                                    ? 'text-emerald-400 bg-emerald-500/15'
                                    : 'text-slate-400 hover:text-emerald-400'
                                }`}
                                title={bookmarked ? 'Liked ♥' : 'Like song ♥'}
                              >
                                <Heart className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
                              </button>
                              <button
                                onClick={() => setPlaylistPickerTrack(trk)}
                                className="min-h-[36px] px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-emerald-500 hover:text-slate-950 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Add song to a Playlist"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Playlist</span>
                              </button>
                              <button
                                onClick={() => handleShareTrack(trk)}
                                className="min-h-[36px] min-w-[36px] rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-amber-500 hover:text-slate-950 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                                title="Share song"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setRingtoneStudioTrack(trk)}
                                className="min-h-[36px] px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-slate-950 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Add song straight to Ringtones"
                              >
                                <BellRing className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">Ringtone</span>
                              </button>
                              <button
                                onClick={() => handleToggleOffline(trk)}
                                className={`min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center cursor-pointer ${
                                  offline ? 'text-emerald-500' : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                {offline ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {filteredTracks.length > 95 && (
                      <div className="flex justify-center pt-1">
                        <button
                          onClick={() => setShowAllHomeCatalog((prev) => !prev)}
                          className="min-h-[40px] px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                        >
                          {showAllHomeCatalog
                            ? 'Show Compact Catalog (First 95)'
                            : `View All ${filteredTracks.length} Christian Songs`}
                        </button>
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* TAB 2: EXPLORE ALL CHRISTIAN CATEGORIES */}
              {activeTab === 'explore' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                      Genres & Categories
                    </h1>
                  </div>

                  {/* Category Bento Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {GENRE_CATEGORIES.filter((g) => g.id !== 'all').map((cat) => {
                      const count = tracks.filter((t) => t.genre === cat.id).length;
                      const isSelected = selectedGenre === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => openGenrePage(cat.id)}
                          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[124px] ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                              : 'bg-white dark:bg-[#12141E] border-slate-200 dark:border-slate-800 hover:border-amber-500/50'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span
                              className={`text-xs font-mono font-semibold ${
                                isSelected ? 'text-slate-900' : 'text-amber-500'
                              }`}
                            >
                              {cat.bpmRange}
                            </span>
                            <span
                              className={`text-xs font-mono ${
                                isSelected ? 'text-slate-900' : 'text-slate-400'
                              }`}
                            >
                              {count} songs
                            </span>
                          </div>
                          <div className="mt-3">
                            <div className="text-base font-extrabold">{cat.label}</div>
                            <div
                              className={`text-xs mt-0.5 ${
                                isSelected ? 'text-slate-800' : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {cat.subtitle}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Full Categorized Tracklist Table */}
                  <div className="rounded-2xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800/80 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        {GENRE_CATEGORIES.find((c) => c.id === selectedGenre)?.label} Catalog ({filteredTracks.length})
                      </h2>
                      {selectedGenre !== 'all' && (
                        <button
                          onClick={() => setSelectedGenre('all')}
                          className="text-xs font-semibold text-amber-500 hover:underline cursor-pointer"
                        >
                          Show All Genres
                        </button>
                      )}
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                      {filteredTracks.map((trk, i) => {
                        const active = currentTrack.id === trk.id;
                        const bookmarked = bookmarkedIds.includes(trk.id);
                        const offline = offlineIds.includes(trk.id);
                        return (
                          <div
                            key={trk.id}
                            className={`px-4 sm:px-5 py-3 flex items-center justify-between gap-4 transition-colors ${
                              active
                                ? 'bg-amber-500/10'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <button
                              onClick={() => handleSelectTrack(trk)}
                              className="flex items-center gap-3.5 min-w-0 flex-1 text-left cursor-pointer"
                            >
                              <span className="w-6 text-xs font-mono text-slate-400">
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              <img
                                src={trk.coverUrl}
                                alt={trk.title}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = COVER_ROCK_ALTAR;
                                }}
                                className="w-11 h-11 rounded-xl object-cover shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                                  {trk.title}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  <span className="font-medium text-slate-700 dark:text-slate-300">{trk.artist}</span>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono text-amber-500">
                                    {formatDuration(trk.duration)}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span>{trk.genreLabel}</span>
                                  <span aria-hidden="true">·</span>
                                  <span>{trk.bpm} BPM</span>
                                </div>
                              </div>
                            </button>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleToggleBookmark(trk.id)}
                                className={`min-h-[38px] min-w-[38px] rounded-lg flex items-center justify-center cursor-pointer ${
                                  bookmarked
                                    ? 'text-emerald-400 bg-emerald-500/15'
                                    : 'text-slate-400 hover:text-emerald-400'
                                }`}
                                title={bookmarked ? 'Liked ♥' : 'Like song ♥'}
                              >
                                <Heart className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
                              </button>
                              <button
                                onClick={() => setPlaylistPickerTrack(trk)}
                                className="min-h-[36px] px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-emerald-500 hover:text-slate-950 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Add song to a Playlist"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Playlist</span>
                              </button>
                              <button
                                onClick={() => handleShareTrack(trk)}
                                className="min-h-[36px] min-w-[36px] rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-amber-500 hover:text-slate-950 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                                title="Share song"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setRingtoneStudioTrack(trk)}
                                className="min-h-[36px] px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-slate-950 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Add song straight to Ringtones"
                              >
                                <BellRing className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">Ringtone</span>
                              </button>
                              <button
                                onClick={() => handleToggleOffline(trk)}
                                className={`min-h-[38px] min-w-[38px] rounded-lg flex items-center justify-center cursor-pointer ${
                                  offline ? 'text-emerald-500' : 'text-slate-400 hover:text-white'
                                }`}
                                title="Save Offline"
                              >
                                {offline ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* DEDICATED GENRE PAGE VIEW */}
              {activeTab === 'genre' && selectedGenre !== 'all' && (
                <GenrePageView
                  genreId={selectedGenre}
                  tracks={tracks}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  duration={duration}
                  spectrum={spectrum}
                  bookmarkedIds={bookmarkedIds}
                  offlineIds={offlineIds}
                  isCachingOffline={isCachingAllOffline}
                  onBack={() => openGenrePage('all')}
                  onSelectGenrePage={(g) => openGenrePage(g)}
                  onSelectTrack={handleSelectTrack}
                  onTogglePlay={handleTogglePlay}
                  onShufflePlay={(genreTracks) => {
                    if (genreTracks.length === 0) return;
                    setIsShuffle(true);
                    const rand = genreTracks[Math.floor(Math.random() * genreTracks.length)];
                    handleSelectTrack(rand, 0);
                  }}
                  onToggleBookmark={handleToggleBookmark}
                  onOpenAddToPlaylist={(trk) => setPlaylistPickerTrack(trk)}
                  onShareTrack={handleShareTrack}
                  onOpenRingtoneStudio={(trk) => setRingtoneStudioTrack(trk)}
                  onToggleOffline={handleToggleOffline}
                  onSaveGenreOffline={(genreTracks) => handleCacheAllOffline(genreTracks)}
                  onOpenFullScreenFeed={(trk) => handleOpenFullScreenVideo(trk)}
                />
              )}

              {/* TAB 3: 365-DAY SMART HOME CALISTHENICS & DAILY DEVOTIONAL */}
              {activeTab === 'calisthenics' && (
                <CalisthenicsCoachView
                  activeDay={activeCalisthenicsDay}
                  completedDays={completedDays}
                  onSelectDay={(d) => setActiveCalisthenicsDay(d)}
                  onToggleCompleteDay={(d) => {
                    setCompletedDays((prev) =>
                      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
                    );
                  }}
                  onStartWorkoutMusic={handleStartWorkoutMusic}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  isCurrentTrackLiked={bookmarkedIds.includes(currentTrack.id)}
                  onToggleLikeTrack={handleToggleBookmark}
                  onOpenAddToPlaylist={(trk) => setPlaylistPickerTrack(trk)}
                  onShareTrack={handleShareTrack}
                  onOpenFullScreenVideo={() => handleOpenFullScreenVideo()}
                  onShareWorkout={(plan: CalisthenicsDayPlan) =>
                    setSharePayload({
                      title: `${plan.workoutTitle} (${plan.difficultyBadge})`,
                      subtitle: `Devotional: ${plan.devotional.scriptureRef} — "${plan.devotional.title}"`,
                      url: `${window.location.origin}/?calisthenicsDay=${plan.dayNumber}`,
                    })
                  }
                />
              )}

              {/* TAB 4: LIVE AUTO-DROPS FEED */}
              {activeTab === 'radar' && (
                <div className="space-y-6">
                  <div className="rounded-3xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-amber-500">
                        Real-Time Christian Music Feed
                      </div>
                      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        New Releases ({tracks.length} Songs)
                      </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      <button
                        onClick={() => handleCacheAllOffline(tracks)}
                        disabled={isCachingAllOffline}
                        className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-transform active:scale-95"
                      >
                        <Download className={`w-4 h-4 ${isCachingAllOffline ? 'animate-bounce' : ''}`} />
                        <span>{isCachingAllOffline ? (cacheProgressText || 'Caching Offline...') : 'Save All Offline'}</span>
                      </button>

                      <button
                        onClick={() => setAutoFeedEnabled(!autoFeedEnabled)}
                        className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                          autoFeedEnabled
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        {autoFeedEnabled ? 'Auto-Update: ON' : 'Auto-Update: PAUSED'}
                      </button>

                      <button
                        onClick={() => triggerLiveMusicHarvest(true)}
                        disabled={isSyncingLive}
                        className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer"
                      >
                        <RefreshCw className={`w-4 h-4 ${isSyncingLive ? 'animate-spin' : ''}`} />
                        <span>{isSyncingLive ? 'Checking Releases...' : 'Check For New Music'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {tracks.map((trk) => {
                      const isCurrent = currentTrack.id === trk.id;
                      const isLiked = bookmarkedIds.includes(trk.id);
                      const isOffline = offlineIds.includes(trk.id);
                      return (
                        <div
                          key={trk.id}
                          className={`p-4 sm:p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                            isCurrent
                              ? 'bg-amber-500/10 border-amber-500/60 shadow-lg ring-1 ring-amber-500/30'
                              : 'bg-white dark:bg-[#12141E] border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                          }`}
                        >
                          {/* Top Main Section: Big Album Art + Full Song Name & Artist */}
                          <div className="flex items-start gap-4">
                            {/* Large Album Art with Interactive Play Button */}
                            <button
                              onClick={() => handleSelectTrack(trk)}
                              className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 bg-slate-900 group cursor-pointer shadow-md"
                              title={`Play ${trk.title}`}
                            >
                              <img
                                src={trk.coverUrl}
                                alt={trk.title}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = COVER_HIPHOP_CROWN;
                                }}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div
                                className={`absolute inset-0 flex items-center justify-center transition-all ${
                                  isCurrent && isPlaying
                                    ? 'bg-black/40 opacity-100'
                                    : 'bg-black/50 opacity-0 group-hover:opacity-100'
                                }`}
                              >
                                <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg">
                                  {isCurrent && isPlaying ? (
                                    <Pause className="w-4 h-4 fill-current" />
                                  ) : (
                                    <Play className="w-4 h-4 fill-current ml-0.5" />
                                  )}
                                </div>
                              </div>
                            </button>

                            {/* Full-Width Song Information */}
                            <div className="min-w-0 flex-1 space-y-1">
                              <button
                                onClick={() => handleSelectTrack(trk)}
                                className="text-left w-full group cursor-pointer block"
                              >
                                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-amber-500 transition-colors">
                                  {trk.title}
                                </h2>
                              </button>
                              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate">
                                {trk.artist}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                                <span className="font-mono text-amber-500 font-bold">{formatDuration(trk.duration)}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-medium">{trk.genreLabel}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono">{trk.bpm} BPM</span>
                              </div>
                            </div>
                          </div>

                          {/* Bottom Action Strip: Clean, Spacious, and Accessible */}
                          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80">
                            <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate max-w-[110px] sm:max-w-[180px]">
                              {trk.album}
                            </div>

                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <button
                                onClick={() => handleToggleBookmark(trk.id)}
                                className={`min-h-[36px] px-2.5 rounded-xl flex items-center gap-1 text-xs font-bold cursor-pointer transition-colors ${
                                  isLiked
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-400'
                                }`}
                                title={isLiked ? 'Liked ♥' : 'Like Song ♥'}
                              >
                                <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                                <span className="hidden sm:inline">{isLiked ? 'Liked' : 'Like'}</span>
                              </button>

                              <button
                                onClick={() => handleDownloadTrackToPhone(trk)}
                                className={`min-h-[36px] px-2.5 rounded-xl flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer ${
                                  isOffline
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-500 hover:text-slate-950'
                                }`}
                                title="Download to phone & save offline"
                              >
                                {isOffline ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : (
                                  <Download className="w-3.5 h-3.5" />
                                )}
                                <span className="hidden sm:inline">{isOffline ? 'Saved' : 'Download'}</span>
                              </button>

                              <button
                                onClick={() => setPlaylistPickerTrack(trk)}
                                className="min-h-[36px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Add to Playlist"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Playlist</span>
                              </button>

                              <button
                                onClick={() => handleShareTrack(trk)}
                                className="min-h-[36px] min-w-[36px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                                title="Share song"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setRingtoneStudioTrack(trk)}
                                className="min-h-[36px] min-w-[36px] rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-500 hover:text-slate-950 flex items-center justify-center cursor-pointer transition-colors"
                                title="Add to Ringtones"
                              >
                                <BellRing className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleSelectTrack(trk)}
                                className={`min-h-[36px] px-3 rounded-xl flex items-center gap-1.5 font-bold text-xs shadow-sm cursor-pointer transition-transform active:scale-95 ${
                                  isCurrent && isPlaying
                                    ? 'bg-emerald-500 text-slate-950'
                                    : 'bg-slate-900 dark:bg-slate-800 text-white hover:bg-emerald-500 hover:text-slate-950'
                                }`}
                                title={isCurrent && isPlaying ? 'Pause' : 'Play'}
                              >
                                {isCurrent && isPlaying ? (
                                  <>
                                    <Pause className="w-3.5 h-3.5 fill-current" />
                                    <span>Playing</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                    <span>Play</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 5: OFFLINE VAULT, RINGTONES, BOOKMARKS & SAVED PLAYLISTS */}
              {activeTab === 'library' && (
                <div className="space-y-7">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        Your Liked Songs, Vault & Ringtones
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {bookmarkedIds.length} liked songs · {offlineIds.length} songs cached offline · {savedRingtones.length} custom Christian ringtones
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedPlaylistView({
                            id: 'liked-songs-virtual',
                            name: 'Liked Songs ♥',
                            description: 'All the Christian songs you have liked across Sanctuary Pulse.',
                            coverUrl: COVER_WORSHIP_RNB,
                            category: 'Liked Collection',
                            trackIds: bookmarkedIds,
                            isOfflineSaved: true,
                            createdBy: 'You',
                            followersCount: 'Personal',
                          });
                        }}
                        className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <Heart className="w-4 h-4 fill-current" />
                        <span>Play All Liked Songs ({bookmarkedIds.length})</span>
                      </button>
                      <button
                        onClick={() => setRingtoneStudioTrack(currentTrack)}
                        className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
                      >
                        <BellRing className="w-4 h-4 text-amber-500" />
                        <span>Ringtone Studio</span>
                      </button>
                      <button
                        onClick={() => setIsCreatePlaylistOpen(true)}
                        className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>New Offline Playlist</span>
                      </button>
                    </div>
                  </div>

                  {/* PROMINENT LIKED SONGS VAULT HERO SECTION */}
                  <div className="rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-[#12141E] border border-emerald-500/40 p-5 sm:p-6 shadow-xl space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-700 text-slate-950 flex items-center justify-center shadow-lg shrink-0">
                          <Heart className="w-9 h-9 fill-current" />
                        </div>
                        <div>
                          <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                            Personal Collection
                          </div>
                          <h2 className="text-xl sm:text-2xl font-black text-white">
                            Your Liked Songs ({bookmarkedIds.length})
                          </h2>
                        </div>
                      </div>

                      {bookmarkedIds.length > 0 && (
                        <button
                          onClick={() => {
                            const firstLiked = tracks.find((t) => bookmarkedIds.includes(t.id));
                            if (firstLiked) handleSelectTrack(firstLiked);
                          }}
                          className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg cursor-pointer transition-transform active:scale-95"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>Play Liked Songs</span>
                        </button>
                      )}
                    </div>

                    {bookmarkedIds.length === 0 ? (
                      <div className="p-6 text-center rounded-2xl bg-black/30 border border-white/10 space-y-2">
                        <Heart className="w-8 h-8 text-slate-500 mx-auto" />
                        <div className="text-sm font-bold text-white">No liked songs yet</div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
                        {tracks
                          .filter((t) => bookmarkedIds.includes(t.id))
                          .map((trk) => {
                            const isCurrent = currentTrack.id === trk.id;
                            const isOffline = offlineIds.includes(trk.id);
                            return (
                              <div
                                key={trk.id}
                                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                                  isCurrent
                                    ? 'bg-emerald-500/20 border-emerald-400'
                                    : 'bg-black/40 border-white/10 hover:border-emerald-500/50'
                                }`}
                              >
                                <button
                                  onClick={() => handleSelectTrack(trk)}
                                  className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                                >
                                  <img
                                    src={trk.coverUrl}
                                    alt={trk.title}
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = COVER_WORSHIP_RNB;
                                    }}
                                    className="w-11 h-11 rounded-lg object-cover shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm sm:text-base font-bold text-white truncate">
                                      {trk.title}
                                    </div>
                                    <div className="text-xs sm:text-sm text-slate-300 font-medium truncate mt-0.5">
                                      {trk.artist}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1 truncate">
                                      <span className="font-mono text-emerald-400">{formatDuration(trk.duration)}</span>
                                      <span aria-hidden="true">·</span>
                                      <span>{trk.genreLabel}</span>
                                    </div>
                                  </div>
                                </button>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => handleToggleBookmark(trk.id)}
                                    className="text-emerald-400 bg-emerald-500/15 p-1.5 rounded-lg cursor-pointer"
                                    title="Unlike"
                                  >
                                    <Heart className="w-4 h-4 fill-current" />
                                  </button>
                                  <button
                                    onClick={() => handleDownloadTrackToPhone(trk)}
                                    className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                                      isOffline
                                        ? 'text-emerald-400 bg-emerald-500/15'
                                        : 'text-slate-400 hover:text-emerald-400'
                                    }`}
                                    title="Download to phone & save offline"
                                  >
                                    {isOffline ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                                  </button>
                                  <button
                                    onClick={() => setPlaylistPickerTrack(trk)}
                                    className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                                    title="Add to Playlist"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleShareTrack(trk)}
                                    className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg cursor-pointer"
                                    title="Share song"
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Saved Ringtones Shelf */}
                  <div className="rounded-2xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BellRing className="w-4 h-4 text-amber-500" />
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          Your Saved Phone Ringtones & Devotional Alarms ({savedRingtones.length})
                        </h2>
                      </div>
                      <span className="text-xs font-mono text-amber-500">
                        .WAV & .M4R Ready
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {savedRingtones.map((rt) => {
                        const matchedTrack = tracks.find((t) => t.id === rt.trackId) || currentTrack;
                        return (
                          <div
                            key={rt.id}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={rt.coverUrl}
                                alt={rt.trackTitle}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = COVER_ROCK_ALTAR;
                                }}
                                className="w-10 h-10 rounded-lg object-cover shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {rt.trackTitle}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">
                                  {rt.sectionLabel} · {rt.style.toUpperCase()}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => setRingtoneStudioTrack(matchedTrack)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-bold shrink-0 cursor-pointer"
                            >
                              Download
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {selectedPlaylistView && (
                    <div className="rounded-3xl bg-white dark:bg-[#12141E] border border-amber-500/40 p-6 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-mono text-amber-500">
                            ACTIVE PLAYLIST VIEW · {selectedPlaylistView.category}
                          </div>
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            {selectedPlaylistView.name}
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {selectedPlaylistView.description}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedPlaylistView(null)}
                          className="text-xs text-slate-400 hover:text-white cursor-pointer"
                        >
                          Close View
                        </button>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {tracks
                          .filter((t) => selectedPlaylistView.trackIds.includes(t.id))
                          .map((trk) => (
                            <div
                              key={trk.id}
                              className="py-2.5 flex items-center justify-between gap-3"
                            >
                              <button
                                onClick={() => handleSelectTrack(trk)}
                                className="flex items-center gap-3 text-left min-w-0 flex-1 cursor-pointer"
                              >
                                <img
                                  src={trk.coverUrl}
                                  alt={trk.title}
                                  referrerPolicy="no-referrer"
                                  className="w-10 h-10 rounded-lg object-cover"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                                    {trk.title}
                                  </div>
                                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                                    {trk.artist}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">
                                    <span className="font-mono text-amber-500">{formatDuration(trk.duration)}</span>
                                    <span aria-hidden="true">·</span>
                                    <span>{trk.genreLabel}</span>
                                    <span aria-hidden="true">·</span>
                                    <span>{trk.bpm} BPM</span>
                                  </div>
                                </div>
                              </button>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleToggleBookmark(trk.id)}
                                  className={`p-1.5 rounded-lg cursor-pointer ${
                                    bookmarkedIds.includes(trk.id)
                                      ? 'text-emerald-400 bg-emerald-500/15'
                                      : 'text-slate-400 hover:text-emerald-400'
                                  }`}
                                  title={bookmarkedIds.includes(trk.id) ? 'Liked ♥' : 'Like song ♥'}
                                >
                                  <Heart
                                    className={`w-4 h-4 ${
                                      bookmarkedIds.includes(trk.id) ? 'fill-current' : ''
                                    }`}
                                  />
                                </button>
                                <button
                                  onClick={() => setPlaylistPickerTrack(trk)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                                  title="Add to Playlist"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleShareTrack(trk)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                                  title="Share song"
                                >
                                  <Share2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setRingtoneStudioTrack(trk)}
                                  className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/15 cursor-pointer"
                                  title="Add to Ringtones"
                                >
                                  <BellRing className="w-4 h-4" />
                                </button>
                                <Play
                                  onClick={() => handleSelectTrack(trk)}
                                  className="w-4 h-4 text-amber-500 cursor-pointer"
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Bookmarked Songs & Offline Vault Split */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Offline Downloaded Songs */}
                    <div className="rounded-2xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          Offline Downloaded Full Songs ({offlineIds.length})
                        </h2>
                        <span className="text-xs font-mono text-emerald-500">IndexedDB Ready</span>
                      </div>

                      <div className="space-y-2">
                        {tracks
                          .filter((t) => offlineIds.includes(t.id))
                          .map((trk) => (
                            <div
                              key={trk.id}
                              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3"
                            >
                              <button
                                onClick={() => handleSelectTrack(trk)}
                                className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                              >
                                <img
                                  src={trk.coverUrl}
                                  alt={trk.title}
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = COVER_ROCK_ALTAR;
                                  }}
                                  className="w-10 h-10 rounded-lg object-cover shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                                    {trk.title}
                                  </div>
                                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                                    {trk.artist}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">
                                    <span className="font-mono text-amber-500">{formatDuration(trk.duration)}</span>
                                    <span aria-hidden="true">·</span>
                                    <span>{trk.genreLabel}</span>
                                  </div>
                                </div>
                              </button>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleToggleBookmark(trk.id)}
                                  className={`p-1.5 rounded-lg cursor-pointer ${
                                    bookmarkedIds.includes(trk.id)
                                      ? 'text-emerald-400 bg-emerald-500/15'
                                      : 'text-slate-400 hover:text-emerald-400'
                                  }`}
                                  title={bookmarkedIds.includes(trk.id) ? 'Liked ♥' : 'Like song ♥'}
                                >
                                  <Heart
                                    className={`w-4 h-4 ${
                                      bookmarkedIds.includes(trk.id) ? 'fill-current' : ''
                                    }`}
                                  />
                                </button>
                                <button
                                  onClick={() => setPlaylistPickerTrack(trk)}
                                  className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                                  title="Add to Playlist"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleShareTrack(trk)}
                                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg cursor-pointer"
                                  title="Share song"
                                >
                                  <Share2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setRingtoneStudioTrack(trk)}
                                  className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded-lg cursor-pointer"
                                  title="Add to Ringtones"
                                >
                                  <BellRing className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleToggleOffline(trk)}
                                  className="text-xs font-semibold text-emerald-500 px-2 py-1 rounded bg-emerald-500/10 cursor-pointer"
                                >
                                  Saved ✓
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Right: Bookmarked / Liked Songs */}
                    <div className="rounded-2xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          Liked & Bookmarked Songs ♥ ({bookmarkedIds.length})
                        </h2>
                        <span className="text-xs font-mono text-amber-500">Cloud Synced</span>
                      </div>

                      <div className="space-y-2">
                        {tracks
                          .filter((t) => bookmarkedIds.includes(t.id))
                          .map((trk) => (
                            <div
                              key={trk.id}
                              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3"
                            >
                              <button
                                onClick={() => handleSelectTrack(trk)}
                                className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                              >
                                <img
                                  src={trk.coverUrl}
                                  alt={trk.title}
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = COVER_WORSHIP_RNB;
                                  }}
                                  className="w-10 h-10 rounded-lg object-cover shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                                    {trk.title}
                                  </div>
                                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                                    {trk.artist}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">
                                    <span className="font-mono text-amber-500">{formatDuration(trk.duration)}</span>
                                    <span aria-hidden="true">·</span>
                                    <span>{trk.genreLabel}</span>
                                  </div>
                                </div>
                              </button>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleToggleBookmark(trk.id)}
                                  className="text-emerald-400 bg-emerald-500/15 p-1.5 rounded-lg cursor-pointer"
                                  title="Liked ♥"
                                >
                                  <Heart className="w-4 h-4 fill-current" />
                                </button>
                                <button
                                  onClick={() => setPlaylistPickerTrack(trk)}
                                  className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                                  title="Add to Playlist"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleShareTrack(trk)}
                                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg cursor-pointer"
                                  title="Share song"
                                >
                                  <Share2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setRingtoneStudioTrack(trk)}
                                  className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded-lg cursor-pointer"
                                  title="Add to Ringtones"
                                >
                                  <BellRing className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Persistent Audio Player Bar & Fullscreen Sheet */}
      <PlayerBarAndSheet
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        spectrum={spectrum}
        volume={volume}
        isShuffle={isShuffle}
        isRepeat={isRepeat}
        isBookmarked={bookmarkedIds.includes(currentTrack.id)}
        likedTrackIds={bookmarkedIds}
        isOfflineSaved={offlineIds.includes(currentTrack.id)}
        activeDeviceName={activeDeviceName}
        audioQualityLabel={audioQualityLabel}
        queue={filteredTracks.length > 0 ? filteredTracks : tracks}
        playlists={playlists}
        onTogglePlay={handleTogglePlay}
        onPrev={handlePrevTrack}
        onNext={handleNextTrack}
        onSeek={(sec) => audioEngine.seek(sec)}
        onVolumeChange={(val) => {
          setVolume(val);
          audioEngine.setVolume(val);
        }}
        onToggleShuffle={() => setIsShuffle(!isShuffle)}
        onToggleRepeat={() => setIsRepeat(!isRepeat)}
        onToggleBookmark={handleToggleBookmark}
        onToggleOffline={handleToggleOffline}
        onAddTrackToPlaylist={handleAddTrackToPlaylist}
        onOpenAddToPlaylistModal={(trk) => setPlaylistPickerTrack(trk)}
        onSelectTrack={(trk) => handleSelectTrack(trk, 0)}
        onOpenConnect={() => setIsConnectOpen(true)}
        onOpenEQ={() => setIsEQOpen(true)}
        onShareTrack={handleShareTrack}
        onOpenRingtoneStudio={(trk) => setRingtoneStudioTrack(trk)}
        onOpenFullScreenVideo={() => handleOpenFullScreenVideo()}
        activeTab={activeTab}
      />

      {/* Spotify-Style Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[75] px-4 py-2.5 rounded-2xl bg-emerald-500 text-slate-950 font-extrabold text-xs shadow-2xl flex items-center gap-2.5 animate-bounce">
          <Check className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setPlaylistPickerTrack(currentTrack)}
            className="underline font-bold ml-1 cursor-pointer"
          >
            Playlists
          </button>
        </div>
      )}

      {/* Full-Screen Spotify Video Canvas & Music Video Feed Modal */}
      <FullScreenVideoFeedModal
        isOpen={isVideoFeedOpen}
        onClose={() => setIsVideoFeedOpen(false)}
        tracks={filteredTracks.length > 0 ? filteredTracks : tracks}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        spectrum={spectrum}
        likedTrackIds={bookmarkedIds}
        onSelectTrack={(trk) => handleSelectTrack(trk, 0)}
        onTogglePlay={handleTogglePlay}
        onPrev={handlePrevTrack}
        onNext={handleNextTrack}
        onSeek={(sec) => audioEngine.seek(sec)}
        onToggleLike={handleToggleBookmark}
        onOpenAddToPlaylist={(trk) => setPlaylistPickerTrack(trk)}
        onShareTrack={handleShareTrack}
        onOpenRingtoneStudio={(trk) => setRingtoneStudioTrack(trk)}
      />

      {/* Universal Spotify-Style "Add to Playlist" Modal */}
      <AddToPlaylistModal
        track={playlistPickerTrack}
        onClose={() => setPlaylistPickerTrack(null)}
        playlists={playlists}
        isLiked={playlistPickerTrack ? bookmarkedIds.includes(playlistPickerTrack.id) : false}
        onToggleLike={handleToggleBookmark}
        onToggleTrackInPlaylist={handleToggleTrackInPlaylist}
        onCreatePlaylistWithTrack={handleCreatePlaylistWithTrack}
      />

      {/* Always-Visible Mobile Bottom Tab Bar (z-[70] so it is never hidden by player or video feed) */}
      <nav className="md:hidden grid grid-cols-5 items-center h-[62px] shrink-0 bg-white dark:bg-[#0D0F17] border-t border-slate-200 dark:border-slate-800 px-1 pb-[env(safe-area-inset-bottom)] z-[70]">
        {[
          { id: 'home', label: 'Home', icon: Home },
          { id: 'explore', label: 'Explore', icon: Compass },
          { id: 'calisthenics', label: '365 Coach', icon: Dumbbell },
          { id: 'radar', label: 'Releases', icon: Radio },
          { id: 'library', label: 'Vault', icon: Library },
        ].map((tab) => {
          const Icon = tab.icon;
          const active =
            activeTab === tab.id ||
            (tab.id === 'explore' && activeTab === 'genre');
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as AppTab);
                setSelectedPlaylistView(null);
                setIsVideoFeedOpen(false);
                mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${
                active
                  ? 'text-amber-500 font-extrabold bg-amber-500/10'
                  : 'text-slate-500 dark:text-slate-300 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-bold mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modals: Ringtone Studio, Sanctuary Connect, Hi-Fi EQ, Social Share, Create Playlist */}
      <RingtoneStudioModal
        track={ringtoneStudioTrack}
        onClose={() => setRingtoneStudioTrack(null)}
        savedRingtones={savedRingtones}
        onSaveRingtone={(rt) => setSavedRingtones((prev) => [rt, ...prev])}
        onPreviewTrackAtOffset={(trk, offset) => handleSelectTrack(trk, offset)}
      />

      <SanctuaryConnectModal
        isOpen={isConnectOpen}
        onClose={() => setIsConnectOpen(false)}
        activeDeviceId={activeDeviceId}
        onSelectDevice={(dev: ConnectedDevice) => {
          setActiveDeviceId(dev.id);
          setActiveDeviceName(dev.name);
          broadcastSync({ type: 'DEVICE_CHANGE', deviceId: dev.id, deviceName: dev.name });
        }}
        currentTrack={currentTrack}
        groupSessionCode="ALTAR-365"
      />

      <HiFiEQModal
        isOpen={isEQOpen}
        onClose={() => setIsEQOpen(false)}
        audioQuality={audioQuality}
        onChangeQuality={(q) => setAudioQuality(q)}
        eqPreset={eqPreset}
        eqGains={eqGains}
        onSelectPreset={(name, gains) => {
          setEqPreset(name);
          setEqGains([...gains]);
          audioEngine.setEQGains(gains);
        }}
        onChangeBandGain={(idx, gain) => {
          const updated = [...eqGains];
          updated[idx] = gain;
          setEqPreset('Custom');
          setEqGains(updated);
          audioEngine.setEQGains(updated);
        }}
      />

      <SocialShareModal
        isOpen={!!sharePayload}
        onClose={() => setSharePayload(null)}
        title={sharePayload?.title || ''}
        subtitle={sharePayload?.subtitle || ''}
        shareUrl={sharePayload?.url || window.location.origin}
      />

      {isCreatePlaylistOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreatePlaylist}
            className="w-full max-w-md rounded-3xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Create Offline Christian Playlist
              </h3>
              <button
                type="button"
                onClick={() => setIsCreatePlaylistOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Playlist Name
                </label>
                <input
                  type="text"
                  required
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Playlist name"
                  className="w-full min-h-[42px] px-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  placeholder="Add an optional description"
                  className="w-full min-h-[42px] px-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
            >
              Save & Enable Offline Sync
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
