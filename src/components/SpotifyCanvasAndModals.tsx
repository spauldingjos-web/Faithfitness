import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Heart,
  Plus,
  Play,
  Pause,
  Check,
  X,
  Film,
  BellRing,
  SkipBack,
  SkipForward,
  Maximize2,
  ListPlus,
  Tv,
  Volume2,
  Share2,
  Download,
} from 'lucide-react';
import { Track, Playlist, COVER_ROCK_ALTAR } from '../data/musicCatalog';
import { audioEngine, getSongSectionAtTime } from '../utils/audioEngine';
import { downloadTrackToDevice } from '../utils/offlineVault';

export interface TimedLyricLine {
  timeSec: number;
  text: string;
}

const clientLyricsCache = new Map<string, TimedLyricLine[]>();
const clientAudioLockedSet = new Set<string>();
const inFlightClientLyricFetches = new Map<string, Promise<TimedLyricLine[]>>();

function parseLrcClient(lrc: string): TimedLyricLine[] {
  const lines = lrc.split('\n');
  const out: TimedLyricLine[] = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  for (const rawLine of lines) {
    const matches = [...rawLine.matchAll(timeRegex)];
    if (matches.length === 0) continue;
    const text = rawLine.replace(timeRegex, '').trim();
    if (!text) continue;
    for (const m of matches) {
      const mins = parseInt(m[1], 10);
      const secs = parseInt(m[2], 10);
      const ms = m[3] ? parseInt(m[3].padEnd(3, '0'), 10) : 0;
      out.push({
        timeSec: mins * 60 + secs + ms / 1000,
        text,
      });
    }
  }
  return out.sort((a, b) => a.timeSec - b.timeSec);
}

function extractCanonicalClientTrack(
  rawArtist: string,
  rawTitle: string
): { cleanArtist: string; primaryArtist: string; cleanTitle: string } {
  let artist = (rawArtist || '').trim();
  let title = (rawTitle || '').trim();

  artist = artist
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/VEVO$/i, '')
    .replace(/\bOfficial\b/gi, '')
    .trim();

  if (title.includes(' - ')) {
    const [left, ...rest] = title.split(' - ');
    const right = rest.join(' - ').trim();
    if (left && right) {
      if (
        !artist ||
        artist.toLowerCase() === 'christian artist' ||
        left.toLowerCase().includes(artist.toLowerCase().split(/\s+/)[0] || '')
      ) {
        if (!artist || artist.toLowerCase() === 'christian artist') {
          artist = left.trim();
        }
        title = right;
      }
    }
  }

  title = title.split(/\s+[|¦]\s+|\s+\/\/\s+/)[0].trim();

  title = title
    .replace(
      /\s*[\(\[][^)\]]*\b(official|lyric|lyrics|video|audio|visualizer|live|hd|hq|4k|remaster|remastered|version|edit|mix|cut|session|master|edition|sanctuary|calisthenics|devotional|unplugged|extended|feat|ft|featuring|with|prod|explicit|clean|single|album|deluxe|vol)\b[^)\]]*[\)\]]/gi,
      ''
    )
    .replace(/\s*\b(feat\.?|ft\.?|featuring)\s+.*$/gi, '')
    .replace(/\s*-\s*(official|lyric|lyrics|music\s+video|audio|live|remastered|visualizer).*$/gi, '')
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  artist = artist
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const primaryArtist =
    artist.split(/\s*(?:,|&|\bfeat\.?\b|\bft\.?\b|\bwith\b|\bx\b|\/)\s*/i)[0]?.trim() || artist;

  return {
    cleanArtist: artist || 'Christian Artist',
    primaryArtist: primaryArtist || artist || 'Christian Artist',
    cleanTitle: title || rawTitle.trim(),
  };
}

function normalizeClientToken(str: string): string {
  return str
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(
      /\b(feat|ft|featuring|official|video|audio|lyric|lyrics|version|edit|session|live|master|sanctuary|mix|cut|edition|remaster|remastered)\b.*$/gi,
      ' '
    )
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isMetadataPlaceholderLine(line: string): boolean {
  const lower = line.toLowerCase().trim();
  if (!lower || lower.length < 2) return true;
  if (/^\[(ar|ti|al|by|offset|length|re|ve):/i.test(lower)) return true;
  if (
    /\b(full-length|master recording|master stream|bodyweight calisthenics|road bike|sanctuary connect|offline vault|sanctuary forever|universal index|24-bit|96khz|synced at \d+\s*bpm|anchored in)\b/i.test(
      lower
    )
  ) {
    return true;
  }
  return false;
}

function sanitizeRealTimedLyrics(rawLines: TimedLyricLine[]): TimedLyricLine[] {
  if (!Array.isArray(rawLines) || rawLines.length === 0) return [];
  return rawLines
    .filter(
      (l) =>
        l &&
        typeof l.text === 'string' &&
        Number.isFinite(l.timeSec) &&
        l.timeSec >= 0 &&
        !isMetadataPlaceholderLine(l.text)
    )
    .map((l) => ({
      timeSec: Math.round(l.timeSec * 100) / 100,
      text: l.text.replace(/^[\s♪♫]+|[\s♪♫]+$/g, '').trim(),
    }))
    .filter((l) => l.text.length > 0)
    .sort((a, b) => a.timeSec - b.timeSec);
}

function buildSmartTimedLinesFromPlainClient(
  plainLines: string[],
  durationSec: number
): TimedLyricLine[] {
  const cleaned = plainLines
    .map((l) => l.replace(/^\[.*?\]/g, '').trim())
    .filter(
      (l) =>
        l.length > 1 &&
        !isMetadataPlaceholderLine(l) &&
        !/^(verse|chorus|bridge|intro|outro|pre-chorus|hook|interlude)\b/i.test(l)
    );

  if (cleaned.length === 0) return [];

  const totalDur = Math.max(140, durationSec || 215);
  const introOffset = Math.min(10, Math.max(4, totalDur * 0.04));
  const vocalSpan = Math.max(60, totalDur - introOffset - 10);

  const weights = cleaned.map((line) => {
    const words = line.split(/\s+/).filter(Boolean).length;
    return Math.max(2.2, Math.min(6.0, 1.4 + words * 0.38));
  });
  const totalWeight = weights.reduce((acc, w) => acc + w, 0) || 1;

  let cursor = introOffset;
  return cleaned.map((text, idx) => {
    const lineTime = Math.round(cursor * 100) / 100;
    const allocated = (weights[idx] / totalWeight) * vocalSpan;
    cursor += allocated;
    return {
      timeSec: lineTime,
      text,
    };
  });
}

export function buildFallbackTimedLyrics(track: Track, durationSec: number): TimedLyricLine[] {
  const { cleanArtist, cleanTitle } = extractCanonicalClientTrack(track.artist, track.title);
  const realSnippets = Array.isArray(track.lyricsSnippet)
    ? track.lyricsSnippet.filter((s) => !isMetadataPlaceholderLine(s) && !s.includes(' — '))
    : [];

  if (realSnippets.length >= 4) {
    return buildSmartTimedLinesFromPlainClient(realSnippets, durationSec || track.duration || 210);
  }

  return [
    {
      timeSec: 0,
      text: `${cleanTitle} · ${cleanArtist}`,
    },
  ];
}

export function useTrackTimedLyrics(
  track: Track,
  duration: number,
  enabled = true,
  refreshTrigger = 0
): TimedLyricLine[] {
  const safeDur = Math.round(
    Math.max(
      95,
      Number.isFinite(duration) && duration > 0
        ? duration
        : Number.isFinite(track.duration) && track.duration > 0
          ? track.duration
          : 210
    )
  );
  const durationRef = useRef(safeDur);
  durationRef.current = safeDur;

  const { cleanArtist, primaryArtist, cleanTitle } = extractCanonicalClientTrack(
    track.artist,
    track.title
  );
  const searchTitle = normalizeClientToken(cleanTitle) || cleanTitle.toLowerCase();
  const canonicalKey = `${primaryArtist.toLowerCase().trim()}__${searchTitle.toLowerCase().trim()}`;

  const lastTrackIdRef = useRef(track.id);
  const [timedLines, setTimedLines] = useState<TimedLyricLine[]>(() => {
    return clientLyricsCache.get(canonicalKey) || clientLyricsCache.get(track.id) || [];
  });

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const effectiveDuration = durationRef.current;

    const exactCached = clientLyricsCache.get(canonicalKey) || clientLyricsCache.get(track.id);
    const isAudioLocked = clientAudioLockedSet.has(canonicalKey) || clientAudioLockedSet.has(track.id);
    if (refreshTrigger === 0 && isAudioLocked && exactCached && exactCached.length >= 6) {
      if (lastTrackIdRef.current !== track.id || timedLines.length < 4) {
        lastTrackIdRef.current = track.id;
        setTimedLines(exactCached);
      }
      return;
    }

    if (lastTrackIdRef.current !== track.id) {
      lastTrackIdRef.current = track.id;
      setTimedLines(exactCached && exactCached.length >= 4 ? exactCached : []);
    }

    const artistPrimary =
      primaryArtist
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2)[0] || primaryArtist.toLowerCase();

    const cacheSetBoth = (lines: TimedLyricLine[], locked = false) => {
      clientLyricsCache.set(canonicalKey, lines);
      clientLyricsCache.set(track.id, lines);
      if (locked) {
        clientAudioLockedSet.add(canonicalKey);
        clientAudioLockedSet.add(track.id);
      }
    };

    const dedupeKey = `${canonicalKey}__${refreshTrigger}`;
    const existingPromise = inFlightClientLyricFetches.get(dedupeKey);
    if (existingPromise) {
      existingPromise.then((lines) => {
        if (active && lines.length >= 4) {
          setTimedLines(lines);
        }
      });
      return () => {
        active = false;
      };
    }

    const fetchTask = (async (): Promise<TimedLyricLine[]> => {
      let alreadyLockedWithTrueSync = false;
      let bestSyncedSoFar: TimedLyricLine[] = [];

      // 1. Fast canonical check against /api/music/lyrics
      if (refreshTrigger === 0) {
        try {
          const res = await fetch(
            `/api/music/lyrics?title=${encodeURIComponent(cleanTitle)}&artist=${encodeURIComponent(
              cleanArtist
            )}&duration=${effectiveDuration}&videoId=${encodeURIComponent(
              track.youtubeVideoId || track.youtubeCandidates?.[0] || ''
            )}`
          );
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data?.synced) && data.synced.length >= 4) {
              const sanitized = sanitizeRealTimedLyrics(data.synced);
              if (sanitized.length >= 4) {
                bestSyncedSoFar = sanitized;
                const isExact = Boolean(data?.hasTrueLrcTimestamps && sanitized.length >= 6);
                cacheSetBoth(sanitized, Boolean(data?.audioLocked && isExact));
                if (data?.audioLocked && (isExact || data?.aiAudioSynced)) {
                  alreadyLockedWithTrueSync = true;
                  return sanitized;
                }
              }
            }
          }
        } catch {
          // continue to AI audio listener
        }
      }

      // 2. Verify with AI Audio Lyric Listener ONLY if studio-lrc isn't already exact+locked (or user clicked Resync)
      if (!alreadyLockedWithTrueSync || refreshTrigger > 0) {
        try {
          const aiRes = await fetch(
            `/api/music/ai-listen-lyrics?title=${encodeURIComponent(
              cleanTitle
            )}&artist=${encodeURIComponent(cleanArtist)}${refreshTrigger > 0 ? '&force=1' : ''}`
          );
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            if (Array.isArray(aiData?.synced) && aiData.synced.length >= 4) {
              const aiSanitized = sanitizeRealTimedLyrics(aiData.synced);
              if (aiSanitized.length >= 4) {
                const isTrue = Boolean(aiData?.hasTrueLrcTimestamps || aiData?.aiAudioSynced);
                cacheSetBoth(aiSanitized, Boolean(aiData?.audioLocked && isTrue));
                return aiSanitized;
              }
            }
          }
        } catch {
          // fall through if offline
        }
      }

      if (bestSyncedSoFar.length >= 4) {
        return bestSyncedSoFar;
      }

      // 3. Direct browser fallback to LRCLIB API (ONLY exact artist+title queries, never artist-less queries)
      try {
        const urls = [
          `https://lrclib.net/api/search?track_name=${encodeURIComponent(
            cleanTitle
          )}&artist_name=${encodeURIComponent(primaryArtist)}`,
          `https://lrclib.net/api/search?q=${encodeURIComponent(`${primaryArtist} ${cleanTitle}`)}`,
        ];

        const allItems: any[] = [];
        for (const u of urls) {
          try {
            const r = await fetch(u);
            if (r.ok) {
              const arr = await r.json();
              if (Array.isArray(arr) && arr.length > 0) {
                allItems.push(...arr);
                if (allItems.some((it) => it?.syncedLyrics)) break;
              }
            }
          } catch {
            // continue
          }
        }

        const valid = allItems.filter((it: any) => {
          if (!it?.syncedLyrics) return false;
          const rawT = String(it.trackName || it.name || '');
          const rawA = String(it.albumName || '');
          const lyricSample = String(it.plainLyrics || it.syncedLyrics || '');

          if (
            /\b(cover|karaoke|tribute|instrumental|backing track|click track|performance track|pista|playback|remix|rmx|lofi|lo-fi|acoustic|lullaby|piano|guitar|orchestra|symphony|espanol|en español|tumbas|jardines|poder)\b/i.test(
              `${rawT} ${rawA}`
            )
          ) {
            return false;
          }
          if (!/\blive\b/i.test(cleanTitle) && /\b(live|live at|live from|unplugged)\b/i.test(rawT)) {
            return false;
          }
          if (/[а-яА-ЯёЁáéíóúñ¿¡]/i.test(lyricSample)) return false;

          const tName = ` ${normalizeClientToken(rawT)} `;
          const aName = ` ${normalizeClientToken(String(it.artistName || ''))} `;
          const pArt = normalizeClientToken(primaryArtist);
          const stopWords = new Set(['the', 'a', 'an', 'and', 'of', 'to', 'in', 'on', 'for', 'my']);
          const sigTitleWords = searchTitle.split(/\s+/).filter((w) => w.length > 0 && !stopWords.has(w));
          const checkWords = sigTitleWords.length > 0 ? sigTitleWords : searchTitle.split(/\s+/).filter(Boolean);

          const matchesTitle =
            tName.includes(` ${searchTitle} `) ||
            checkWords.every((w) => tName.includes(` ${w} `));
          const matchesArtist =
            (pArt.length > 1 && (aName.includes(` ${pArt} `) || ` ${pArt} `.includes(aName.trim()))) ||
            (artistPrimary.length > 2 && aName.includes(` ${artistPrimary} `));

          const d = Number(it.duration || 0);
          const durOk = !d || Math.abs(d - effectiveDuration) <= 10;

          return matchesTitle && matchesArtist && durOk;
        });

        valid.sort((a: any, b: any) => {
          const score = (it: any) => {
            let s = it.syncedLyrics ? 190 : 0;
            const tName = normalizeClientToken(String(it.trackName || it.name || ''));
            const aName = String(it.artistName || '').toLowerCase();
            if (tName === searchTitle) s += 120;
            if (aName.includes(artistPrimary)) s += 70;
            const d = Number(it.duration || 0);
            if (d > 0) {
              const diff = Math.abs(d - effectiveDuration);
              if (diff <= 3) s += 300;
              else if (diff <= 8) s += 180;
              else s -= 150;
            }
            return s;
          };
          return score(b) - score(a);
        });

        const best = valid[0];
        if (best?.syncedLyrics) {
          const parsed = sanitizeRealTimedLyrics(parseLrcClient(String(best.syncedLyrics)));
          if (parsed.length >= 6) {
            cacheSetBoth(parsed, true);
            return parsed;
          }
        }
      } catch {
        // ignore
      }

      const existing = clientLyricsCache.get(canonicalKey) || clientLyricsCache.get(track.id);
      if (existing && existing.length >= 4) {
        return existing;
      }

      return buildFallbackTimedLyrics(track, effectiveDuration);
    })();

    inFlightClientLyricFetches.set(dedupeKey, fetchTask);
    fetchTask
      .then((lines) => {
        if (active && lines.length > 0) {
          setTimedLines(lines);
        }
      })
      .finally(() => {
        inFlightClientLyricFetches.delete(dedupeKey);
      });

    return () => {
      active = false;
    };
  }, [track.id, track.title, track.artist, enabled, refreshTrigger, canonicalKey, cleanTitle, cleanArtist, primaryArtist]);

  return timedLines;
}

/**
 * Pure Boxless Kinetic Lyric-Video Renderer:
 * Words pop up, bounce, and glide upward continuously in front of the live video with ZERO banner or box behind them.
 * Keeps 100% real studio LRC timestamps untouched and shows an animated boxless intro/instrumental countdown before vocals enter.
 */
export const KineticLyricVideoStage: React.FC<{
  timedLyrics: TimedLyricLine[];
  currentTime: number;
  duration: number;
  isPlaying?: boolean;
  compact?: boolean;
  onSeek?: (sec: number) => void;
}> = ({ timedLyrics, currentTime, duration, compact = false, onSeek }) => {
  const heavyTextOutline: React.CSSProperties = {
    textShadow:
      '0 4px 18px rgba(0,0,0,0.98), 0 2px 5px rgba(0,0,0,0.98), 0 -1px 4px rgba(0,0,0,0.95), 0 0 30px rgba(0,0,0,0.9)',
  };

  const activeWordGlowOutline: React.CSSProperties = {
    textShadow:
      '0 6px 24px rgba(0,0,0,0.99), 0 2px 6px rgba(0,0,0,0.99), 0 0 28px rgba(16,185,129,0.95)',
  };

  const safeTime = Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : 0;

  // Loading state while fetching real synced lyrics
  if (!timedLyrics || timedLyrics.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center text-center select-none pointer-events-none px-4 py-3">
        <div
          style={heavyTextOutline}
          className="text-base sm:text-2xl font-black text-emerald-300 tracking-wide animate-pulse"
        >
          ♪ Syncing Official Song Lyrics...
        </div>
      </div>
    );
  }

  const firstVocalSec = timedLyrics[0].timeSec;

  // Instrumental Intro state: before the singer's first lyric timestamp (e.g., 0:00 -> firstVocalSec)
  // Renders a lively boxless countdown + previews the opening lyric lines so timestamps stay 100% accurate!
  if (safeTime < firstVocalSec && timedLyrics.length >= 2) {
    const secsUntilVocal = Math.max(1, Math.ceil(firstVocalSec - safeTime));
    const introProgress = firstVocalSec > 0 ? Math.max(0, Math.min(1, safeTime / firstVocalSec)) : 0;
    const introGlidePx = Math.round((0.5 - introProgress) * (compact ? 10 : 20) * 10) / 10;
    const beatPulse = Math.floor(safeTime * 2.5) % 3;

    return (
      <div
        style={{
          transform: `translate3d(0, ${introGlidePx}px, 0)`,
          willChange: 'transform',
        }}
        className="w-full flex flex-col items-center justify-center text-center select-none pointer-events-none px-2 sm:px-6 space-y-2.5 sm:space-y-4"
      >
        <div
          style={activeWordGlowOutline}
          className={`font-black text-emerald-300 tracking-wide ${
            compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-xl'
          }`}
        >
          ♪ Instrumental Intro · Vocal enters in {secsUntilVocal}s{' '}
          <span className="inline-block ml-1 tracking-widest">
            {beatPulse === 0 ? '● ○ ○' : beatPulse === 1 ? '● ● ○' : '● ● ●'}
          </span>
        </div>

        {/* Opening Line Preview (Ready to Pop as soon as vocalist enters) */}
        <div
          onClick={() => onSeek && onSeek(timedLyrics[0].timeSec)}
          style={{
            ...heavyTextOutline,
            opacity: Math.min(0.96, 0.55 + introProgress * 0.41),
          }}
          className={`pointer-events-auto font-black text-white cursor-pointer max-w-4xl ${
            compact
              ? 'text-lg sm:text-2xl'
              : 'text-2xl sm:text-4xl md:text-5xl tracking-tight'
          }`}
        >
          {timedLyrics[0].text}
        </div>

        {timedLyrics[1] && (
          <div
            onClick={() => onSeek && onSeek(timedLyrics[1].timeSec)}
            style={{
              ...heavyTextOutline,
              opacity: 0.45,
            }}
            className={`pointer-events-auto font-extrabold text-white/80 cursor-pointer max-w-3xl ${
              compact ? 'text-xs sm:text-sm line-clamp-1' : 'text-sm sm:text-2xl line-clamp-1'
            }`}
          >
            {timedLyrics[1].text}
          </div>
        )}
      </div>
    );
  }

  // Find active line index based on exact currentTime
  let activeIndex = 0;
  for (let i = 0; i < timedLyrics.length; i++) {
    if (safeTime >= timedLyrics[i].timeSec) {
      activeIndex = i;
    } else {
      break;
    }
  }

  const activeLine = timedLyrics[activeIndex];
  const nextLineTime =
    timedLyrics[activeIndex + 1]?.timeSec ?? Math.max(activeLine.timeSec + 4.0, duration || 210);
  const totalGap = Math.max(0.8, nextLineTime - activeLine.timeSec);
  // Cap the word-by-word sing-along window to a natural vocal phrase duration (max 6.5s)
  // so during a 15s guitar solo after a line, the words finish at normal speed instead of dragging slowly
  const vocalPhraseWindow = Math.min(totalGap, Math.max(1.8, activeLine.text.split(/\s+/).length * 0.48));
  const rawVocalProgress = (safeTime - activeLine.timeSec) / vocalPhraseWindow;
  const lineProgress = Math.max(0, Math.min(1, rawVocalProgress));
  const gapProgress = Math.max(0, Math.min(1, (safeTime - activeLine.timeSec) / totalGap));

  const isInInstrumentalBreak =
    totalGap >= 9.0 && safeTime - activeLine.timeSec > vocalPhraseWindow + 1.2 && nextLineTime > safeTime;
  const secsUntilNextVocal = Math.max(1, Math.ceil(nextLineTime - safeTime));

  const words = activeLine.text.split(/\s+/).filter(Boolean);
  const exactWordFloat = lineProgress * words.length;
  const activeWordIndex = Math.min(words.length - 1, Math.floor(exactWordFloat));
  const wordSubProgress = exactWordFloat - Math.floor(exactWordFloat);

  const prevLine2 = activeIndex >= 2 ? timedLyrics[activeIndex - 2] : null;
  const prevLine1 = activeIndex >= 1 ? timedLyrics[activeIndex - 1] : null;
  const nextLine1 = timedLyrics[activeIndex + 1] || null;
  const nextLine2 = timedLyrics[activeIndex + 2] || null;

  // Continuous upward lyric-video glide
  const verticalGlidePx = Math.round((0.5 - gapProgress) * (compact ? 12 : 24) * 10) / 10;

  return (
    <div
      style={{
        transform: `translate3d(0, ${verticalGlidePx}px, 0)`,
        willChange: 'transform',
      }}
      className="w-full flex flex-col items-center justify-center text-center select-none pointer-events-none px-2 sm:px-6 space-y-2 sm:space-y-3.5"
    >
      {/* Previous Line -2 (Rising & Fading Out at Top) */}
      {!compact && prevLine2 && (
        <div
          onClick={() => onSeek && onSeek(prevLine2.timeSec)}
          style={{
            ...heavyTextOutline,
            opacity: Math.max(0.1, 0.38 - gapProgress * 0.28),
          }}
          className="pointer-events-auto text-xs sm:text-lg font-extrabold text-white -translate-y-2 scale-90 cursor-pointer truncate max-w-2xl"
        >
          {prevLine2.text}
        </div>
      )}

      {/* Previous Line -1 (Floating Above Active Line) */}
      {prevLine1 && (
        <div
          onClick={() => onSeek && onSeek(prevLine1.timeSec)}
          style={{
            ...heavyTextOutline,
            opacity: Math.max(0.28, 0.68 - gapProgress * 0.3),
          }}
          className={`pointer-events-auto font-extrabold text-white -translate-y-1 scale-95 cursor-pointer max-w-3xl ${
            compact ? 'text-xs sm:text-sm line-clamp-1' : 'text-sm sm:text-2xl line-clamp-1'
          }`}
        >
          {prevLine1.text}
        </div>
      )}

      {/* CURRENT ACTIVE LINE: Word-by-Word Pop-Up & Bounce Animation Directly Over Video (Zero Box/Banner!) */}
      <div
        key={activeIndex}
        className={`flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-3.5 gap-y-1.5 max-w-4xl py-1 ${
          compact
            ? 'text-lg sm:text-2xl font-black'
            : 'text-2xl sm:text-4xl md:text-5xl font-black tracking-tight'
        }`}
      >
        {words.map((word, wIdx) => {
          const isCurrentWord = wIdx === activeWordIndex && lineProgress < 1;
          const isPastWord = wIdx < activeWordIndex || lineProgress >= 1;
          const bounceY = isCurrentWord
            ? -Math.sin(wordSubProgress * Math.PI) * 9 - 4
            : isPastWord
              ? -2
              : 2;
          const wordScale = isCurrentWord
            ? 1.14 + Math.sin(wordSubProgress * Math.PI) * 0.08
            : isPastWord
              ? 1.02
              : 0.94;

          return (
            <span
              key={`${activeIndex}-${wIdx}`}
              style={{
                ...(isCurrentWord ? activeWordGlowOutline : heavyTextOutline),
                transform: `translate3d(0, ${bounceY.toFixed(1)}px, 0) scale(${wordScale.toFixed(3)})`,
                transition: 'color 120ms ease, transform 90ms linear',
              }}
              className={`inline-block ${
                isCurrentWord
                  ? 'text-emerald-300'
                  : isPastWord
                    ? 'text-white'
                    : 'text-white/70'
              }`}
            >
              {word}
            </span>
          );
        })}
      </div>

      {/* Mid-Song Instrumental Solo / Bridge Countdown (if there is a long instrumental break > 9s) */}
      {isInInstrumentalBreak && (
        <div
          style={activeWordGlowOutline}
          className="text-xs sm:text-base font-black text-emerald-300 tracking-wide animate-pulse"
        >
          ♪ Instrumental Break · Next vocal in {secsUntilNextVocal}s
        </div>
      )}

      {/* Upcoming Line +1 (Rising Into View From Below) */}
      {nextLine1 && (
        <div
          onClick={() => onSeek && onSeek(nextLine1.timeSec)}
          style={{
            ...heavyTextOutline,
            opacity: Math.min(0.92, 0.5 + gapProgress * 0.42),
          }}
          className={`pointer-events-auto font-extrabold text-white translate-y-1 scale-95 cursor-pointer max-w-3xl ${
            compact ? 'text-xs sm:text-sm line-clamp-1' : 'text-sm sm:text-2xl line-clamp-1'
          }`}
        >
          {nextLine1.text}
        </div>
      )}

      {/* Upcoming Line +2 */}
      {!compact && nextLine2 && (
        <div
          onClick={() => onSeek && onSeek(nextLine2.timeSec)}
          style={{
            ...heavyTextOutline,
            opacity: Math.min(0.55, 0.2 + gapProgress * 0.32),
          }}
          className="pointer-events-auto text-xs sm:text-lg font-extrabold text-white translate-y-2 scale-90 cursor-pointer truncate max-w-2xl"
        >
          {nextLine2.text}
        </div>
      )}
    </div>
  );
};

interface TrackVideoCanvasProps {
  track: Track;
  isPlaying: boolean;
  currentTime?: number;
  duration?: number;
  spectrum?: number[];
  mode?: 'card' | 'player' | 'fullscreen' | 'mini';
  showOfficialVideoEmbed?: boolean;
  showLyricsOverlay?: boolean;
  onToggleLyricsOverlay?: () => void;
  className?: string;
}

/**
 * Renders a Full-Bleed Spotify Canvas / Live Music Video visual layer synced to the full-length audio engine.
 * Combines 60fps beat-reactive stage lighting, kinetic lyrics, and muted YouTube official video visual stream
 * so the 100% full-length audio from /api/music/full-song plays completely uninterrupted.
 */
const EMPTY_SPECTRUM: number[] = [];

export const TrackVideoCanvas: React.FC<TrackVideoCanvasProps> = React.memo(({
  track,
  isPlaying,
  currentTime = 0,
  duration = 210,
  spectrum = EMPTY_SPECTRUM,
  mode = 'card',
  showOfficialVideoEmbed = false,
  showLyricsOverlay = true,
  onToggleLyricsOverlay,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spectrumRef = useRef<number[]>(spectrum);
  spectrumRef.current = spectrum;

  const firstCandidate =
    track.youtubeVideoId || (track.youtubeCandidates && track.youtubeCandidates[0]) || null;
  const [resolvedYoutubeId, setResolvedYoutubeId] = useState<string | null>(firstCandidate);

  useEffect(() => {
    let active = true;
    setResolvedYoutubeId((prev) => (prev === firstCandidate ? prev : firstCandidate));

    if (showOfficialVideoEmbed && !firstCandidate) {
      fetch(
        `/api/music/resolve?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`
      )
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!active || !data) return;
          if (data.youtubeVideoId) {
            setResolvedYoutubeId(data.youtubeVideoId);
          } else if (Array.isArray(data.youtubeCandidates) && data.youtubeCandidates[0]) {
            setResolvedYoutubeId(data.youtubeCandidates[0]);
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [track.id, track.title, track.artist, firstCandidate, showOfficialVideoEmbed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let frame = 0;
    let lastDrawAt = 0;

    const getPalette = () => {
      switch (track.genre) {
        case 'metal-hardcore':
          return { primary: '#ef4444', secondary: '#f97316', glow: 'rgba(239,68,68,0.5)' };
        case 'hiphop':
          return { primary: '#f59e0b', secondary: '#10b981', glow: 'rgba(245,158,11,0.5)' };
        case 'rock':
          return { primary: '#fb923c', secondary: '#e11d48', glow: 'rgba(251,146,60,0.5)' };
        case 'worship':
          return { primary: '#38bdf8', secondary: '#fbbf24', glow: 'rgba(56,189,248,0.45)' };
        case 'workout-edm':
          return { primary: '#22d3ee', secondary: '#a855f7', glow: 'rgba(34,211,238,0.5)' };
        default:
          return { primary: '#10b981', secondary: '#f59e0b', glow: 'rgba(16,185,129,0.45)' };
      }
    };

    const palette = getPalette();
    const particleCount = mode === 'mini' ? 8 : mode === 'card' ? 16 : 32;
    const particles = Array.from({ length: particleCount }, (_, i) => ({
      x: (i * 37) % 100,
      y: (i * 53) % 100,
      size: 2 + (i % 4) * 1.4,
      speedY: 0.35 + (i % 5) * 0.2,
      speedX: ((i % 3) - 1) * 0.18,
      alpha: 0.35 + (i % 5) * 0.12,
    }));

    const drawFrame = () => {
      frame += isPlaying ? 1 : 0;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const liveSpec = isPlaying
        ? (spectrumRef.current.length > 0 ? spectrumRef.current : audioEngine.getLiveSpectrum())
        : spectrumRef.current;
      const avgSpec =
        liveSpec.length > 0
          ? liveSpec.reduce((acc, v) => acc + v, 0) / liveSpec.length
          : isPlaying
            ? 48 + Math.sin(frame * 0.18) * 26
            : 20;
      const beatPulse = Math.min(1, avgSpec / 85);

      // 1. Concert Arena Laser & Spotlight Beams across full height
      const beamCount = mode === 'mini' ? 2 : 5;
      for (let b = 0; b < beamCount; b++) {
        const angle = Math.sin(frame * 0.022 + b * 1.4) * 0.42;
        const startX = (w / (beamCount + 1)) * (b + 1);
        const grad = ctx.createLinearGradient(startX, 0, startX + Math.sin(angle) * w * 0.5, h);
        grad.addColorStop(0, b % 2 === 0 ? palette.glow : 'rgba(255,255,255,0.2)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startX - 16, 0);
        ctx.lineTo(startX + 16, 0);
        ctx.lineTo(startX + Math.sin(angle) * w * 0.55 + 90, h);
        ctx.lineTo(startX + Math.sin(angle) * w * 0.55 - 90, h);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }

      // 2. Beat-Reactive Center Stage Ring & Halo
      const centerGrad = ctx.createRadialGradient(
        w * 0.5,
        h * 0.45,
        10,
        w * 0.5,
        h * 0.45,
        Math.max(w, h) * (0.4 + beatPulse * 0.2)
      );
      centerGrad.addColorStop(0, palette.glow);
      centerGrad.addColorStop(0.55, 'rgba(15, 23, 42, 0.2)');
      centerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = centerGrad;
      ctx.fillRect(0, 0, w, h);

      // 3. Floating Stage Embers / Particles across the entire screen
      particles.forEach((p) => {
        if (isPlaying) {
          p.y -= p.speedY * (1 + beatPulse * 1.5);
          p.x += p.speedX;
          if (p.y < -5) p.y = 105;
          if (p.x < -5) p.x = 105;
          if (p.x > 105) p.x = -5;
        }
        const px = (p.x / 100) * w;
        const py = (p.y / 100) * h;
        ctx.beginPath();
        ctx.arc(px, py, p.size * (1 + beatPulse * 0.55), 0, Math.PI * 2);
        ctx.fillStyle = p.size > 3.2 ? palette.primary : palette.secondary;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // 4. Audio Equalizer Wave Ribbon
      if (mode !== 'mini') {
        const bars = mode === 'card' ? 16 : 24;
        const barWidth = w / bars;
        for (let i = 0; i < bars; i++) {
          const specVal =
            liveSpec[i % Math.max(1, liveSpec.length)] ??
            (isPlaying ? 32 + Math.sin(frame * 0.2 + i * 0.45) * 26 : 12);
          const barH = Math.max(6, (specVal / 100) * (h * 0.24));
          ctx.fillStyle = i % 2 === 0 ? palette.primary : palette.secondary;
          ctx.globalAlpha = 0.45;
          ctx.fillRect(i * barWidth + 2, h - barH, Math.max(2, barWidth - 4), barH);
        }
        ctx.globalAlpha = 1;
      }
    };

    // Draw initial static lighting frame cleanly without running an idle 60fps loop when paused
    drawFrame();

    if (!isPlaying) {
      return;
    }

    const renderLoop = (now: number) => {
      // Cap active canvas animation at ~28fps so mobile & downloaded PWAs stay responsive without image lag
      if (now - lastDrawAt >= 35) {
        lastDrawAt = now;
        drawFrame();
      }
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [track.id, track.genre, isPlaying, mode]);

  const timedLyrics = useTrackTimedLyrics(track, duration, mode === 'player' && showLyricsOverlay);

  const isAbsoluteOrFixed =
    className.includes('absolute') || className.includes('fixed') || mode === 'fullscreen';

  return (
    <div
      className={`${
        isAbsoluteOrFixed ? ' inset-0' : 'relative'
      } w-full h-full overflow-hidden bg-[#07090E] ${className}`}
      style={{
        position: mode === 'fullscreen' ? 'absolute' : undefined,
        top: mode === 'fullscreen' ? 0 : undefined,
        left: mode === 'fullscreen' ? 0 : undefined,
        right: mode === 'fullscreen' ? 0 : undefined,
        bottom: mode === 'fullscreen' ? 0 : undefined,
        width: '100%',
        height: '100%',
      }}
    >
      {/* Full-Screen Animated Artist / Concert Backdrop */}
      <img
        src={track.coverUrl}
        alt={track.title}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = COVER_ROCK_ALTAR;
        }}
        className={`absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ${
          isPlaying ? 'scale-110' : 'scale-100'
        } opacity-75`}
        style={{
          width: '100%',
          height: '100%',
          filter: 'saturate(1.35) contrast(1.15)',
        }}
      />

      {/* Full-Screen Muted Official YouTube Music Video Stream (Visuals synced while Full-Length Audio plays from /api/music/full-song) */}
      {showOfficialVideoEmbed && resolvedYoutubeId && (
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          <iframe
            key={resolvedYoutubeId}
            src={`https://www.youtube-nocookie.com/embed/${resolvedYoutubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${resolvedYoutubeId}&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3`}
            title={`${track.title} Official Music Video Canvas`}
            allow="autoplay; encrypted-media"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[177.78vh] min-w-full min-h-full h-[56.25vw] pointer-events-none opacity-90"
            style={{ border: 0 }}
          />
        </div>
      )}

      {/* Cinema Gradient Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#07090E]/90 via-transparent to-black/50 pointer-events-none" />

      {/* Beat-Reactive Concert Lighting, Embers & Waveform Canvas */}
      <canvas
        ref={canvasRef}
        width={mode === 'mini' ? 96 : mode === 'card' ? 240 : 540}
        height={mode === 'mini' ? 96 : mode === 'card' ? 400 : 960}
        className="absolute inset-0 w-full h-full pointer-events-none block"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Center Live Kinetic Lyric Video Overlay on Player (Zero Banner Box!) */}
      {mode === 'player' && (
        <div className="absolute inset-x-3 inset-y-3 z-10 pointer-events-none flex flex-col items-center justify-between text-center">
          <div className="w-full flex items-center justify-end">
            {onToggleLyricsOverlay && (
              <button
                type="button"
                onClick={onToggleLyricsOverlay}
                className={`pointer-events-auto px-3 py-1 rounded-xl text-xs font-extrabold border transition-all cursor-pointer shadow-lg ${
                  showLyricsOverlay
                    ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                    : 'bg-black/80 text-white border-white/25 hover:bg-white/20'
                }`}
              >
                {showLyricsOverlay ? 'No Lyrics' : 'Show Lyrics'}
              </button>
            )}
          </div>

          {showLyricsOverlay && (
            <div className="my-auto w-full">
              <KineticLyricVideoStage
                timedLyrics={timedLyrics}
                currentTime={currentTime}
                duration={duration}
                isPlaying={isPlaying}
                compact={true}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
});

interface SpotifyVideoFeedStripProps {
  tracks: Track[];
  currentTrack: Track;
  isPlaying: boolean;
  currentTime?: number;
  duration?: number;
  spectrum?: number[];
  likedTrackIds: string[];
  onSelectTrack: (track: Track) => void;
  onTogglePlay: () => void;
  onToggleLike: (trackId: string) => void;
  onOpenAddToPlaylist: (track: Track) => void;
  onShareTrack: (track: Track) => void;
  onOpenFullScreenFeed: (startTrack: Track) => void;
}

/**
 * Spotify-style Vertical 9:16 Video Canvas Preview Row on the Home Screen.
 * Every card has explicit full 9:16 dimensions + Like ♥, + Playlist, and Share buttons.
 */
export const SpotifyVideoFeedStrip: React.FC<SpotifyVideoFeedStripProps> = React.memo(({
  tracks,
  currentTrack,
  isPlaying,
  likedTrackIds,
  onSelectTrack,
  onTogglePlay,
  onToggleLike,
  onOpenAddToPlaylist,
  onShareTrack,
  onOpenFullScreenFeed,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const previewTracks = tracks.slice(0, 12);

  const formatDuration = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <section className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              Music Video Canvases
            </h2>
          </div>
        </div>

        <button
          onClick={() => onOpenFullScreenFeed(currentTrack)}
          className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-transform active:scale-95"
        >
          <Maximize2 className="w-4 h-4" />
          <span>Full Screen</span>
        </button>
      </div>

      {/* Horizontal Scroll of Tall 9:16 Spotify Video Canvas Cards (Explicit height so it never collapses) */}
      <div className="flex items-stretch gap-4 overflow-x-auto pb-3 no-scrollbar">
        {previewTracks.map((trk) => {
          const isCurrent = currentTrack.id === trk.id;
          const isLiked = likedTrackIds.includes(trk.id);
          const isCardActive = (isCurrent && isPlaying) || hoveredId === trk.id;

          return (
            <div
              key={trk.id}
              onMouseEnter={() => setHoveredId(trk.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`relative w-[225px] sm:w-[250px] h-[370px] sm:h-[410px] rounded-3xl overflow-hidden shrink-0 border transition-all group ${
                isCurrent
                  ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-2xl'
                  : 'border-slate-200 dark:border-slate-800/90 hover:border-emerald-500/60 shadow-lg'
              }`}
            >
              {/* Full-Card Live Looping Video Canvas Background */}
              <TrackVideoCanvas
                track={trk}
                isPlaying={isCardActive}
                mode="card"
                showOfficialVideoEmbed={isCurrent && isPlaying}
                className="absolute inset-0 w-full h-full"
              />

              {/* Top Bar: Genre Badge + Full Duration + Expand Full Screen Button */}
              <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between gap-1">
                <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-bold text-emerald-400 border border-white/15 truncate">
                  {trk.genreLabel}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="px-2 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-mono text-white border border-white/15">
                    {formatDuration(trk.duration)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenFullScreenFeed(trk);
                    }}
                    className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center shadow cursor-pointer"
                    title="Watch Full-Screen Video"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Center Play/Pause Full Song Trigger */}
              <button
                onClick={() => {
                  if (isCurrent) {
                    onTogglePlay();
                  } else {
                    onSelectTrack(trk);
                  }
                }}
                className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer"
                title={`Play full song: ${trk.title}`}
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-2xl ${
                    isCurrent && isPlaying
                      ? 'bg-emerald-500 text-slate-950 scale-105'
                      : 'bg-black/65 text-white border border-white/25 opacity-90 group-hover:opacity-100 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-slate-950'
                  }`}
                >
                  {isCurrent && isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  )}
                </div>
              </button>

              {/* Bottom Info + Like ♥, + Playlist, and Share Action Bar */}
              <div className="absolute inset-x-0 bottom-0 z-20 p-3.5 bg-gradient-to-t from-black via-black/85 to-transparent space-y-2.5">
                <div
                  onClick={() => onOpenFullScreenFeed(trk)}
                  className="cursor-pointer space-y-0.5"
                >
                  <div className="text-sm font-extrabold text-white truncate group-hover:text-emerald-400 transition-colors">
                    {trk.title}
                  </div>
                  <div className="text-xs text-slate-300 truncate">{trk.artist}</div>
                  {trk.lyricsSnippet[0] && (
                    <div className="text-[11px] text-emerald-300/90 italic line-clamp-1 pt-0.5">
                      “{trk.lyricsSnippet[0]}”
                    </div>
                  )}
                </div>

                {/* Action Buttons: Like ♥, + Playlist, Share */}
                <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-white/15">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLike(trk.id);
                    }}
                    className={`min-h-[34px] px-2.5 rounded-xl flex items-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                      isLiked
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-white/15 hover:bg-white/25 text-white'
                    }`}
                    title={isLiked ? 'Liked ♥' : 'Like Song ♥'}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                    <span>{isLiked ? 'Liked' : 'Like'}</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAddToPlaylist(trk);
                    }}
                    className="min-h-[34px] px-2.5 rounded-xl bg-white/15 hover:bg-amber-500 hover:text-slate-950 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Add song to a playlist"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Playlist</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShareTrack(trk);
                    }}
                    className="min-h-[34px] min-w-[34px] rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
                    title="Share song"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
});

interface FullScreenVideoFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  currentTrack: Track;
  isPlaying: boolean;
  currentTime?: number;
  duration: number;
  spectrum?: number[];
  likedTrackIds: string[];
  onSelectTrack: (track: Track) => void;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (sec: number) => void;
  onToggleLike: (trackId: string) => void;
  onOpenAddToPlaylist: (track: Track) => void;
  onShareTrack: (track: Track) => void;
  onOpenRingtoneStudio: (track: Track) => void;
}

/**
 * TRUE 100% Full-Screen Edge-to-Edge Spotify Video Canvas & Official Music Video Player.
 * Fills the entire 100vw x 100vh screen while playing the complete full-length song,
 * with Like ♥, + Playlist, Share, and Ringtone controls right on screen.
 */
export const FullScreenVideoFeedModal: React.FC<FullScreenVideoFeedModalProps> = ({
  isOpen,
  onClose,
  tracks,
  currentTrack,
  isPlaying,
  currentTime: externalTime,
  duration: externalDuration,
  spectrum,
  likedTrackIds,
  onSelectTrack,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onToggleLike,
  onOpenAddToPlaylist,
  onShareTrack,
  onOpenRingtoneStudio,
}) => {
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const lastSwipeTime = useRef<number>(0);
  const [showLyrics, setShowLyrics] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sanctuary_fullscreen_lyrics') !== 'off';
    } catch {
      return true;
    }
  });

  const toggleLyrics = useCallback(() => {
    setShowLyrics((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sanctuary_fullscreen_lyrics', next ? 'on' : 'off');
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartY.current = t.clientY;
    touchStartX.current = t.clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return;
    const t = e.changedTouches[0];
    const deltaY = t.clientY - touchStartY.current;
    const deltaX = t.clientX - touchStartX.current;
    touchStartY.current = null;
    touchStartX.current = null;

    // Only trigger if vertical swipe is dominant and exceeds 45px
    if (Math.abs(deltaY) > 45 && Math.abs(deltaY) > Math.abs(deltaX) * 1.2) {
      const now = Date.now();
      if (now - lastSwipeTime.current < 450) return;
      lastSwipeTime.current = now;

      if (deltaY < 0) {
        onNext();
      } else {
        onPrev();
      }
    }
  };

  // Keyboard Up/Down arrow navigation when in full screen
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        onNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ') {
        e.preventDefault();
        onTogglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onNext, onPrev, onClose, onTogglePlay]);

  const [lyricOffsetSec, setLyricOffsetSec] = useState(0);
  const [aiResyncCount, setAiResyncCount] = useState(0);
  const [isAiResyncing, setIsAiResyncing] = useState(false);

  // Reset manual offset when track changes
  useEffect(() => {
    setLyricOffsetSec(0);
    setAiResyncCount(0);
    setIsAiResyncing(false);
  }, [currentTrack.id]);

  const [liveProgress, setLiveProgress] = useState(() => ({
    currentTime: externalTime ?? audioEngine.getCurrentTime(),
    duration: externalDuration || audioEngine.getDuration(),
  }));

  useEffect(() => {
    if (!isOpen) return;
    return audioEngine.subscribeProgress((t, d) => {
      setLiveProgress({ currentTime: t, duration: d });
    });
  }, [isOpen]);

  const currentTime = externalTime ?? liveProgress.currentTime;
  const duration = Math.max(externalDuration || 0, liveProgress.duration || 0) || currentTrack.duration;

  const timedLyrics = useTrackTimedLyrics(
    currentTrack,
    duration,
    isOpen && showLyrics,
    aiResyncCount
  );

  const handleForceAiAudioSync = useCallback(() => {
    setIsAiResyncing(true);
    setLyricOffsetSec(0);
    setAiResyncCount((prev) => prev + 1);
    window.setTimeout(() => {
      setIsAiResyncing(false);
    }, 2800);
  }, []);

  if (!isOpen) return null;

  const isLiked = likedTrackIds.includes(currentTrack.id);
  const formatTime = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const activeSection = getSongSectionAtTime(currentTime, duration);
  const syncedCurrentTime = Math.max(0, currentTime + lyricOffsetSec);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-x-0 top-0 bottom-[62px] md:bottom-0 z-[65] bg-black overflow-hidden select-none flex flex-col"
    >
      {/* Full-Viewport Video Canvas + Official Music Video Background */}
      <TrackVideoCanvas
        track={currentTrack}
        isPlaying={isPlaying}
        currentTime={syncedCurrentTime}
        duration={duration}
        spectrum={spectrum}
        mode="fullscreen"
        showOfficialVideoEmbed={true}
        className="absolute inset-0 w-full h-full"
      />

      {/* Full-Screen Interactive Overlay Layout: flex-col with min-h-0 middle stage so bottom controls NEVER get pushed off-screen */}
      <div className="relative z-20 w-full h-full flex flex-col justify-between p-2.5 sm:p-5 pointer-events-none overflow-hidden">
        {/* Top Bar: Track Pill + AI Audio Listener Button + Lyric Sync Nudge (-0.5s / +0.5s) + 'No Lyrics / Show Lyrics' Toggle + Exit X */}
        <div className="flex items-center justify-between gap-2 w-full pointer-events-auto shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-white text-xs font-semibold shadow-lg min-w-0">
            <span className="truncate max-w-[100px] sm:max-w-md font-bold">{currentTrack.title}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-300 truncate max-w-[80px] sm:max-w-[150px]">{currentTrack.artist}</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {showLyrics && (
              <button
                type="button"
                onClick={handleForceAiAudioSync}
                className="min-h-[34px] sm:min-h-[38px] px-2.5 sm:px-3 rounded-full bg-black/80 hover:bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 font-extrabold text-[11px] sm:text-xs flex items-center gap-1.5 cursor-pointer backdrop-blur-md shadow-lg"
                title="AI Audio Listener: Have AI listen to this song's audio stream and lock exact lyric timing"
              >
                <span className={`w-2 h-2 rounded-full bg-emerald-400 ${isAiResyncing ? 'animate-ping' : ''}`} />
                <span>{isAiResyncing ? 'AI Hearing Audio...' : 'AI Audio Sync ✓'}</span>
              </button>
            )}

            {showLyrics && (
              <div className="hidden sm:flex items-center gap-1 bg-black/75 border border-white/20 rounded-full px-2 py-1 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setLyricOffsetSec((prev) => Math.round((prev - 0.5) * 10) / 10)}
                  className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/25 text-[11px] font-mono font-bold text-white cursor-pointer"
                  title="Lyrics earlier (-0.5s)"
                >
                  -0.5s
                </button>
                {lyricOffsetSec !== 0 && (
                  <button
                    type="button"
                    onClick={() => setLyricOffsetSec(0)}
                    className="text-[10px] font-mono text-emerald-400 px-1 cursor-pointer"
                    title="Reset lyric sync offset"
                  >
                    {lyricOffsetSec > 0 ? `+${lyricOffsetSec}s` : `${lyricOffsetSec}s`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setLyricOffsetSec((prev) => Math.round((prev + 0.5) * 10) / 10)}
                  className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/25 text-[11px] font-mono font-bold text-white cursor-pointer"
                  title="Lyrics later (+0.5s)"
                >
                  +0.5s
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={toggleLyrics}
              className={`min-h-[38px] sm:min-h-[42px] px-3.5 sm:px-4 rounded-full font-extrabold text-xs sm:text-sm flex items-center gap-1.5 border transition-all cursor-pointer shadow-xl ${
                showLyrics
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-300'
                  : 'bg-black/80 hover:bg-white/20 text-white border-white/30'
              }`}
              title={showLyrics ? 'Click to hide lyrics (No Lyrics)' : 'Click to show big lyrics on video'}
            >
              <span>{showLyrics ? 'No Lyrics' : 'Show Lyrics'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/80 hover:bg-white/20 text-white flex items-center justify-center border border-white/25 cursor-pointer backdrop-blur-md transition-all active:scale-95 shadow-2xl shrink-0"
              aria-label="Exit full screen"
              title="Exit Full Screen"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Middle Stage: Pure Boxless Kinetic Lyric Video Floating Directly Over the Video (Zero Banner!) */}
        <div className="flex-1 min-h-0 flex items-center justify-between gap-2 sm:gap-4 my-1 overflow-hidden">
          <div className="flex-1 min-w-0 flex flex-col items-center justify-center text-center pointer-events-none">
            {showLyrics && (
              <KineticLyricVideoStage
                timedLyrics={timedLyrics}
                currentTime={syncedCurrentTime}
                duration={duration}
                isPlaying={isPlaying}
                onSeek={onSeek}
              />
            )}
          </div>

          {/* Right Side Floating Action Rail: Compact on mobile so it never overflows vertically */}
          <div className="flex flex-col items-center gap-1.5 sm:gap-3 shrink-0 pointer-events-auto py-1">
            <button
              onClick={() => onToggleLike(currentTrack.id)}
              className="flex flex-col items-center gap-0.5 cursor-pointer"
              title="Like Song ♥"
            >
              <div
                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center border transition-all shadow-xl ${
                  isLiked
                    ? 'bg-emerald-500 border-emerald-300 text-slate-950 scale-105'
                    : 'bg-black/75 border-white/25 text-white hover:bg-emerald-500 hover:text-slate-950'
                }`}
              >
                <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isLiked ? 'fill-current' : ''}`} />
              </div>
              <span className="text-[10px] sm:text-xs font-extrabold text-white drop-shadow">
                {isLiked ? 'Liked' : 'Like'}
              </span>
            </button>

            <button
              onClick={() => onOpenAddToPlaylist(currentTrack)}
              className="flex flex-col items-center gap-0.5 cursor-pointer"
              title="Add to Playlist"
            >
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-black/75 hover:bg-amber-500 hover:text-slate-950 border border-white/25 text-white flex items-center justify-center transition-all shadow-xl">
                <ListPlus className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[10px] sm:text-xs font-extrabold text-white drop-shadow">Playlist</span>
            </button>

            <button
              onClick={() => downloadTrackToDevice(currentTrack)}
              className="flex flex-col items-center gap-0.5 cursor-pointer"
              title="Download to Phone (iOS / Android)"
            >
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-black/75 hover:bg-emerald-500 hover:text-slate-950 border border-white/25 text-emerald-400 hover:text-slate-950 flex items-center justify-center transition-all shadow-xl">
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[10px] sm:text-xs font-extrabold text-white drop-shadow">Save</span>
            </button>

            <button
              onClick={() => onShareTrack(currentTrack)}
              className="flex flex-col items-center gap-0.5 cursor-pointer"
              title="Share Song"
            >
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-black/75 hover:bg-emerald-500 hover:text-slate-950 border border-white/25 text-white flex items-center justify-center transition-all shadow-xl">
                <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[10px] sm:text-xs font-extrabold text-white drop-shadow">Share</span>
            </button>

            <button
              onClick={() => onOpenRingtoneStudio(currentTrack)}
              className="hidden sm:flex flex-col items-center gap-0.5 cursor-pointer"
              title="Add to Ringtones"
            >
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-black/75 hover:bg-amber-500 hover:text-slate-950 border border-white/25 text-amber-400 flex items-center justify-center transition-all shadow-xl">
                <BellRing className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[10px] sm:text-xs font-extrabold text-white drop-shadow">Ringtone</span>
            </button>
          </div>
        </div>

        {/* Bottom Full-Width Player Dock: shrink-0 so Scrubber, Rewind, Play/Pause, Fast-Forward are ALWAYS 100% visible */}
        <div className="shrink-0 bg-black/85 backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-3xl p-3 sm:p-4 space-y-2 sm:space-y-3 max-w-4xl w-full mx-auto pointer-events-auto shadow-2xl">
          {/* 1. Prominent Interactive Slide Bar (Scrubber) FIRST so it is never cut off */}
          <div className="space-y-1">
            <input
              type="range"
              min={0}
              max={duration || 220}
              value={currentTime}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="w-full accent-emerald-400 h-2.5 bg-white/25 rounded-lg cursor-pointer"
              aria-label="Seek song position"
            />
            <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono text-slate-200">
              <span>{formatTime(currentTime)}</span>
              <span className="text-emerald-400 font-bold truncate px-2">
                {currentTrack.title} · {activeSection}
              </span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* 2. Transport Controls Row: Go Back (-15s), Prev Track, Play/Pause, Next Track, Fast Forward (+15s) */}
          <div className="flex items-center justify-between gap-2">
            <div className="hidden sm:flex items-center gap-2.5 min-w-0 flex-1">
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = COVER_ROCK_ALTAR;
                }}
                className="w-10 h-10 rounded-xl object-cover border border-white/20 shrink-0"
              />
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-white truncate">
                  {currentTrack.title}
                </div>
                <div className="text-xs text-slate-300 truncate">
                  {currentTrack.artist} · {currentTrack.genreLabel}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={onPrev}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition-colors"
                title="Previous Song"
              >
                <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              </button>

              <button
                onClick={() => onSeek(Math.max(0, currentTime - 15))}
                className="px-2.5 h-10 sm:h-11 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-mono font-bold flex items-center justify-center cursor-pointer transition-colors"
                title="Go Back 15 Seconds"
              >
                -15s
              </button>

              <button
                onClick={onTogglePlay}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-xl cursor-pointer transition-transform active:scale-95 shrink-0"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={() => onSeek(Math.min(duration || 220, currentTime + 15))}
                className="px-2.5 h-10 sm:h-11 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-mono font-bold flex items-center justify-center cursor-pointer transition-colors"
                title="Fast Forward 15 Seconds"
              >
                +15s
              </button>

              <button
                onClick={onNext}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition-colors"
                title="Next Song"
              >
                <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              </button>
            </div>
          </div>

          {/* 3. Horizontal Quick Switcher for Next Videos */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {tracks.slice(0, 12).map((t) => {
              const active = t.id === currentTrack.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onSelectTrack(t)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shrink-0 cursor-pointer border transition-all ${
                    active
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                  }`}
                >
                  <img
                    src={t.coverUrl}
                    alt={t.title}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = COVER_ROCK_ALTAR;
                    }}
                    className="w-4 h-4 rounded object-cover"
                  />
                  <span className="max-w-[105px] truncate">{t.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

interface AddToPlaylistModalProps {
  track: Track | null;
  onClose: () => void;
  playlists: Playlist[];
  isLiked: boolean;
  onToggleLike: (trackId: string) => void;
  onToggleTrackInPlaylist: (playlistId: string, trackId: string) => void;
  onCreatePlaylistWithTrack: (name: string, description: string, trackId: string) => void;
}

/**
 * Universal Spotify-style "Add to Playlist" Modal.
 * Accessible from every song card, track row, search result, video preview, mini-player, and full-screen player.
 */
export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  track,
  onClose,
  playlists,
  isLiked,
  onToggleLike,
  onToggleTrackInPlaylist,
  onCreatePlaylistWithTrack,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  if (!track) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreatePlaylistWithTrack(
      newTitle.trim(),
      newDesc.trim() || `Custom Christian mix featuring ${track.artist}`,
      track.id
    );
    setNewTitle('');
    setNewDesc('');
    setShowNewForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={track.coverUrl}
              alt={track.title}
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = COVER_ROCK_ALTAR;
              }}
              className="w-12 h-12 rounded-xl object-cover shrink-0"
            />
            <div className="min-w-0">
              <div className="text-[11px] font-mono uppercase text-emerald-500 font-bold">
                Save to Your Library
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                {track.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{track.artist}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1-Tap Liked Songs Row */}
        <button
          onClick={() => onToggleLike(track.id)}
          className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
            isLiked
              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
              : 'bg-slate-50 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-slate-950 flex items-center justify-center shadow">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div className="text-left">
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Liked Songs ♥
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Pinned at the top of your library
              </div>
            </div>
          </div>
          <div
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
              isLiked
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {isLiked ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Liked</span>
              </>
            ) : (
              <>
                <Heart className="w-3.5 h-3.5" />
                <span>Like</span>
              </>
            )}
          </div>
        </button>

        {/* Existing Playlists List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
            <span>Your Playlists ({playlists.length})</span>
            <button
              type="button"
              onClick={() => setShowNewForm(!showNewForm)}
              className="text-amber-500 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showNewForm ? 'Cancel New' : 'New Playlist'}</span>
            </button>
          </div>

          {showNewForm && (
            <form
              onSubmit={handleCreate}
              className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-amber-500/40 space-y-2.5"
            >
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Playlist name"
                className="w-full min-h-[38px] px-3 rounded-xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full min-h-[36px] px-3 rounded-xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="w-full min-h-[38px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Create & Add “{track.title}”
              </button>
            </form>
          )}

          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {playlists.map((pl) => {
              const inPlaylist = pl.trackIds.includes(track.id);
              return (
                <button
                  key={pl.id}
                  onClick={() => onToggleTrackInPlaylist(pl.id, track.id)}
                  className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                    inPlaylist
                      ? 'bg-amber-500/10 border-amber-500/50'
                      : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={pl.coverUrl}
                      alt={pl.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = COVER_ROCK_ALTAR;
                      }}
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {pl.name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {pl.trackIds.length} songs · {pl.isOfflineSaved ? 'Offline Ready' : 'Cloud'}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 ${
                      inPlaylist
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {inPlaylist ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full min-h-[42px] rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
};
