import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

let genAiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!genAiClient) {
    genAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAiClient;
}

let soundCloudClientId = 'c0lcDb60e4gNCrZY24mdmz9uWo1Ih29e';
let lastClientIdRefresh = 0;

async function getSoundCloudClientId(): Promise<string> {
  const now = Date.now();
  if (now - lastClientIdRefresh < 1000 * 60 * 30 && soundCloudClientId) {
    return soundCloudClientId;
  }
  try {
    const home = await fetch('https://soundcloud.com', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    if (home.ok) {
      const html = await home.text();
      const scriptUrls = [
        ...html.matchAll(/src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g),
      ].map((m) => m[1]);
      for (const sUrl of scriptUrls.slice(-3)) {
        const js = await (await fetch(sUrl)).text();
        const match = js.match(/client_id\s*:\s*"([a-zA-Z0-9]{32})"/);
        if (match && match[1]) {
          soundCloudClientId = match[1];
          lastClientIdRefresh = now;
          break;
        }
      }
    }
  } catch {
    // keep fallback client_id
  }
  return soundCloudClientId;
}

interface SyncedLyricLine {
  timeSec: number;
  text: string;
}

interface LrcMatchPayload {
  synced: SyncedLyricLine[];
  plain: string[];
  lrcDurationSec: number;
  rawLrcDurationSec?: number;
  validDurations?: number[];
  matchedTrackName?: string;
  matchedArtistName?: string;
  hasTrueLrcTimestamps?: boolean;
  aiAudioSynced?: boolean;
  syncMethod?: 'studio-lrc' | 'gemini-audio-listen' | 'youtube-timed' | 'plain-smart';
}

interface AssembledFullSong {
  buffer: Buffer;
  contentType: string;
  durationSec: number;
  matchedTitle: string;
  matchedArtist: string;
  scTrackTitle?: string;
  scUploader?: string;
  scPlayCount?: number;
  scVerified?: boolean;
  tier: number;
  lyrics?: LrcMatchPayload;
}

const fullSongCache = new Map<string, AssembledFullSong>();
const inFlightSongPromises = new Map<string, Promise<AssembledFullSong | null>>();
const lyricsCache = new Map<string, LrcMatchPayload>();
const inFlightLrcPromises = new Map<string, Promise<LrcMatchPayload>>();
const aiVerifiedLyricsCache = new Map<string, LrcMatchPayload>();
const inFlightAiLyricPromises = new Map<string, Promise<LrcMatchPayload>>();

let activeLrcFetches = 0;
const lrcWaitQueue: Array<() => void> = [];
async function withLrcSemaphore<T>(fn: () => Promise<T>): Promise<T> {
  if (activeLrcFetches >= 3) {
    await new Promise<void>((resolve) => lrcWaitQueue.push(resolve));
  }
  activeLrcFetches++;
  try {
    return await fn();
  } finally {
    activeLrcFetches--;
    const next = lrcWaitQueue.shift();
    if (next) next();
  }
}

const EXPLICIT_OR_SECULAR_WORDS = [
  'fuck',
  'fucking',
  'fucker',
  'motherfucker',
  'shit',
  'shitty',
  'bullshit',
  'bitch',
  'bitches',
  'asshole',
  'dick',
  'cock',
  'pussy',
  'cunt',
  'nigga',
  'niggas',
  'nigger',
  'whore',
  'slut',
  'hoe',
  'hoes',
  'thot',
  'porn',
  'sex',
  'sexy',
  'stripper',
  'twerk',
  'onlyfans',
  'weed',
  'blunt',
  'marijuana',
  'kush',
  'molly',
  'percocet',
  'xanax',
  'codeine',
  'cocaine',
  'heroin',
  'meth',
  'satanic',
  '666',
  'anti-christ',
  'antichrist',
  'hail satan',
  'pentagram',
  'explicit',
  'uncensored',
  'dirty version',
  'nsfw',
  'tay-k',
  'lil uzi',
  'playboi carti',
  'travis scott',
  'drake',
  'eminem',
  'kendrick lamar',
  'juice wrld',
  'xxxtentacion',
  'doja cat',
  'cardi b',
  'megan thee stallion',
  'nicki minaj',
  '21 savage',
  'young thug',
  'lil baby',
  'dababy',
  'nba youngboy',
  'king von',
  'lil durk',
  'chief keef',
  'suicideboys',
  'ghostemane',
  'yeat',
  'ice spice',
  'sexxy red',
  'glorilla',
  'kodak black',
  'nle choppa',
  'polo g',
  'pop smoke',
  'slipknot',
  'slayer',
  'cannibal corpse',
  'deicide',
  'behemoth',
  'marilyn manson',
  'lamb of god',
  'pantera',
];

function isProfaneOrSecular(text: string): boolean {
  const lower = (text || '').toLowerCase();
  for (const w of EXPLICIT_OR_SECULAR_WORDS) {
    const regex = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lower)) return true;
  }
  return false;
}

// Strictly identify covers, tributes, instrumentals, remixes, church rehearsals, backing tracks, and non-English versions
function isInstrumentalOrRemakeText(text: string, mode: 'meta' | 'desc' = 'meta'): boolean {
  const t = (text || '').toLowerCase().replace(/_/g, ' ');
  if (!t.trim()) return false;
  if (/[а-яА-ЯёЁ]/.test(t)) return true;

  const phraseBlocklist = [
    'my cover',
    'cover by',
    'cover of',
    'this is a cover',
    'acoustic cover',
    'piano cover',
    'guitar cover',
    'drum cover',
    'bass cover',
    'vocal cover',
    'violin cover',
    'cello cover',
    'choir cover',
    'orchestral cover',
    'ai cover',
    'backing track',
    'scratch track',
    'click track',
    'performance track',
    'multitrack',
    'minus one',
    'no vocals',
    'without vocals',
    'as made popular by',
    'made popular by',
    'made famous by',
    'originally performed',
    'originally by',
    'in the style of',
    'sound-alike',
    'soundalike',
    'type beat',
    'free beat',
    'bass boosted',
    '8d audio',
    'club edit',
    'epic version',
    'sped up',
    'speed up',
    'slowed and reverb',
    'how to play',
    'sunday morning service',
    'sunday service at',
    'worship practice',
    'will lead this song',
    'sharing my gift',
    'party tyme',
    'key by key',
    'praise and worship orchestra',
    'the prayer project',
    'calm worship collective',
    'will morrison',
    'piano dreamers',
    'atlantic notes',
    'music-themes',
    'praise hymn',
    'worship tools',
    'resource edition',
    'split track',
    'backing vocal',
    'cimorelli',
    'after zach',
    'download all songs',
    'top 100',
    'song story',
    'moment on kxoj',
    'tour promo',
    'album preview',
    'preview reel',
    'italian version',
    'spanish version',
    'en español',
    'en espanol',
    'portuguese version',
    'em portugues',
    'ao vivo',
    'russian version',
    '(rus)',
    'radio tapok',
    'sanford ai',
    'thai ver',
    'soaking worship',
    'music box',
    'timestrech',
    'timestretch',
    'a cappella',
    'a capella',
    'acapella',
    'acappella',
    'intro & groove',
    'intro and groove',
    'groove of',
    'instrumental beat',
    'jersey club',
    'twix rerub',
    'drumless',
    'voxless',
    'vocals only',
    'chord progression',
    'song breakdown',
    'versao nao oficial',
    'versão não oficial',
  ];

  if (phraseBlocklist.some((term) => t.includes(term))) return true;

  if (mode === 'meta') {
    if (
      /\b(cover|covers|covered|covering|karaoke|tribute|tributes|remake|pista|playback|rehearsal|bootleg|mashup|blend|megamix|rework|rerub|lesson|tutorial|breakdown|nightcore|instrumental|instrumentals|piano|violin|cello|guitar|drum|drums|bass|flute|sax|saxophone|trumpet|harp|ukulele|orchestra|orchestral|symphony|lofi|lo-fi|beats|soaking|meditation|lullaby|midi|8-bit|8bit|chiptune|remi+x|remixed|rmx|flip|chipmunk|acoustic|slowed|reverb|slower|chopped|chopd|screwed|dubstep|trapnation|teminite|ost|soundtrack|soundtracks|interview|podcast|sermon|demo|techno|dj|solo|acappella|acapella|russian|espanol|portugues|versao|versão|baptist|presbyterian|methodist|lutheran|catholic|chapel|parish|parody|tumbas|jardines|canta|poder)\b/i.test(
        t
      ) ||
      /\/\/\s*track\b/i.test(t) ||
      /\bspeed\s*x\s*\d/i.test(t) ||
      /[a-z]{3,}mix\b/i.test(t) ||
      /[)\]]\s*x\s+[a-z0-9]/i.test(t) ||
      /\([^)]*\b(edit|mix|vs|fast)\b[^)]*\)/i.test(t) ||
      /\bvs\.?\s+/i.test(t)
    ) {
      return true;
    }
  } else {
    if (
      /\b(instrumental|karaoke|tribute|remi+x|rmx|nightcore|lofi|lo-fi|acapella|pista|playback|mashup|blend|megamix|bootleg|cover|backing|multitrack|stems)\b/i.test(
        t
      )
    ) {
      return true;
    }
  }
  return false;
}

function isCoverOrRemakeTrack(text: string): boolean {
  return isInstrumentalOrRemakeText(text, 'meta');
}

function normalizeMatchTokens(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/’/g, "'")
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const TITLE_STOPWORDS = new Set(['the', 'a', 'an', 'and', 'of', 'to', 'in', 'on', 'for', 'my']);

function hasStrictTitleWordMatch(candidateTitle: string, targetCleanTitle: string): boolean {
  const normCand = ` ${normalizeMatchTokens(candidateTitle).replace(/\bbreathe\b/g, 'breath')} `;
  const normTarget = normalizeMatchTokens(targetCleanTitle).replace(/\bbreathe\b/g, 'breath');
  if (!normTarget) return false;
  if (normCand.includes(` ${normTarget} `)) return true;

  const allWords = normTarget.split(' ').filter(Boolean);
  const sigWords = allWords.filter((w) => !TITLE_STOPWORDS.has(w));
  const checkWords = sigWords.length > 0 ? sigWords : allWords;
  return checkWords.every((w) => normCand.includes(` ${w} `));
}

function isSpanishOrNonEnglishLyrics(text: string): boolean {
  if (!text) return false;
  if (/[а-яА-ЯёЁáéíóúñ¿¡]/i.test(text)) return true;
  if (/\b(que|para|tengo|tu|eres|dios|senor|corazon|tierra|cielo|gloria|mi|conmigo)\b/i.test(text) && /\b(el|la|los|las|de|en|y|por|una|tu)\b/i.test(text)) {
    return true;
  }
  return false;
}

function parseLrcString(lrc: string): SyncedLyricLine[] {
  const lines = lrc.split('\n');
  const out: SyncedLyricLine[] = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  for (const rawLine of lines) {
    const matches = [...rawLine.matchAll(timeRegex)];
    if (matches.length === 0) continue;
    const text = rawLine
      .replace(timeRegex, '')
      .replace(/^[\s♪♫]+|[\s♪♫]+$/g, '')
      .trim();
    if (!text) continue;
    for (const m of matches) {
      const mins = parseInt(m[1], 10);
      const secs = parseInt(m[2], 10);
      const ms = m[3] ? parseInt(m[3].padEnd(3, '0'), 10) : 0;
      out.push({
        timeSec: Math.round((mins * 60 + secs + ms / 1000) * 100) / 100,
        text,
      });
    }
  }
  return out.sort((a, b) => a.timeSec - b.timeSec);
}

interface TrackMetaLock {
  durationSec: number;
  matchedTitle: string;
  scTrackTitle?: string;
  scUploader?: string;
  scPlayCount?: number;
  scVerified?: boolean;
  lyrics: LrcMatchPayload;
}

const trackMetaLockCache = new Map<string, TrackMetaLock>();

export function extractCanonicalArtistAndTitle(
  rawArtist: string,
  rawTitle: string
): { cleanArtist: string; primaryArtist: string; cleanTitle: string } {
  let artist = (rawArtist || '').trim();
  let title = (rawTitle || '').trim();

  // Strip YouTube channel suffixes from artist
  artist = artist
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/VEVO$/i, '')
    .replace(/\bOfficial\b/gi, '')
    .trim();

  // Handle "Artist*Title*" pattern (e.g. "Demon Hunter*I Am A Stone*")
  if (title.includes('*') && !title.includes(' - ')) {
    const starParts = title.split('*').map((s) => s.trim()).filter(Boolean);
    if (starParts.length >= 2) {
      title = `${starParts[0]} - ${starParts[1]}`;
    }
  }

  // If title has "Artist - Song Title" or "Song Title - Artist", split it cleanly
  if (title.includes(' - ')) {
    const [left, ...rest] = title.split(' - ');
    const right = rest.join(' - ').trim();
    if (left && right) {
      const rightIsTag =
        /^(official|lyric|lyrics|music\s+video|audio|live|remastered|visualizer|hd|hq|4k)\b/i.test(
          right
        );
      if (!rightIsTag) {
        const artistFirstWord = artist.toLowerCase().split(/\s+/)[0] || '';
        if (artistFirstWord.length > 2 && right.toLowerCase().includes(artistFirstWord)) {
          // Format was "Song Title - Artist" (e.g. "Gratitude - Brandon Lake")
          title = left.trim();
        } else {
          // Format was "Artist - Song Title" (e.g. "Elevation Worship - Praise" or "Demon Hunter - Artificial Light")
          if (
            !artist ||
            artist.toLowerCase() === 'christian artist' ||
            /\b(records|music|hobby|official|channel|topic|vevo)\b/i.test(artist) ||
            left.toLowerCase().includes(artistFirstWord)
          ) {
            artist = left.trim();
          }
          title = right;
        }
      }
    }
  }

  // Strip pipe or double-slash video descriptions (e.g. "Praise | Official Lyric Video")
  title = title.split(/\s+[|¦]\s+|\s+\/\/\s+/)[0].trim();

  // Strip parenthetical and bracketed suffixes that are not part of the core song title
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

  // Primary artist (first artist before &, comma, feat, with, x)
  const primaryArtist =
    artist
      .split(/\s*(?:,|&|\bfeat\.?\b|\bft\.?\b|\bwith\b|\bx\b|\/)\s*/i)[0]
      ?.trim() || artist;

  return {
    cleanArtist: artist || 'Christian Artist',
    primaryArtist: primaryArtist || artist || 'Christian Artist',
    cleanTitle: title || rawTitle.trim(),
  };
}

function normalizeSearchToken(str: string): string {
  return str
    .toLowerCase()
    .replace(
      /[\(\[][^)\]]*\b(feat|ft|featuring|official|video|audio|lyric|lyrics|version|edit|session|live|master|sanctuary|mix|cut|edition|remaster|remastered|hd|hq|4k|single|album|deluxe|prod)\b[^)\]]*[\)\]]/gi,
      ' '
    )
    .replace(
      /\b(feat|ft|featuring|official|video|audio|lyric|lyrics|version|edit|session|live|master|sanctuary|mix|cut|edition|remaster|remastered)\b.*$/gi,
      ' '
    )
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSmartTimedLinesFromPlain(
  plainLines: string[],
  durationSec: number
): SyncedLyricLine[] {
  const cleaned = plainLines
    .map((l) => l.replace(/^\[.*?\]/g, '').trim())
    .filter((l) => l.length > 1 && !/^(verse|chorus|bridge|intro|outro|pre-chorus|hook|interlude)\b/i.test(l));

  if (cleaned.length === 0) return [];

  const totalDur = Math.max(140, durationSec || 215);
  // Start vocals around 8s and end ~10s before track end
  const introOffset = Math.min(10, Math.max(4, totalDur * 0.04));
  const vocalSpan = Math.max(60, totalDur - introOffset - 10);

  // Weight each line's duration slightly by its word count so longer lines get more time
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

async function fetchYouTubeTimedCaptions(
  videoIdHint: string,
  artist: string,
  title: string,
  targetDurationSec: number
): Promise<SyncedLyricLine[]> {
  try {
    let videoId = (videoIdHint || '').trim();
    if (!videoId) {
      const items = await searchYouTubeRichCatalog(`${artist} ${title} lyrics`);
      if (items.length > 0) {
        videoId = items[0].videoId;
      }
    }
    if (!videoId) return [];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2800);
    const playerRes = await fetch(
      'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
        },
        body: JSON.stringify({
          videoId,
          context: {
            client: {
              clientName: 'ANDROID',
              clientVersion: '19.09.37',
              androidSdkVersion: 30,
              hl: 'en',
              gl: 'US',
            },
          },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    if (!playerRes.ok) return [];

    const playerData = await playerRes.json();
    const captionTracks =
      playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(captionTracks) || captionTracks.length === 0) return [];

    const bestTrack =
      captionTracks.find(
        (t: any) => String(t.languageCode || '').startsWith('en') && t.kind !== 'asr'
      ) ||
      captionTracks.find((t: any) => String(t.languageCode || '').startsWith('en')) ||
      captionTracks[0];

    if (!bestTrack?.baseUrl) return [];

    const capRes = await fetch(`${bestTrack.baseUrl}&fmt=json3`);
    if (!capRes.ok) return [];
    const capJson = await capRes.json();
    const events = Array.isArray(capJson?.events) ? capJson.events : [];

    const lines: SyncedLyricLine[] = [];
    for (const ev of events) {
      if (!Array.isArray(ev?.segs)) continue;
      const rawText = ev.segs
        .map((s: any) => String(s?.utf8 || ''))
        .join('')
        .replace(/\n+/g, ' ')
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/^[\s♪♫]+|[\s♪♫]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!rawText || rawText.length < 3) continue;
      if (/^(music|applause|instrumental|lyrics|subtitles)/i.test(rawText)) continue;
      if (isProfaneOrSecular(rawText)) continue;

      const timeSec = Math.round((Number(ev.tStartMs || 0) / 1000) * 100) / 100;
      if (targetDurationSec > 0 && timeSec > targetDurationSec + 10) continue;

      if (lines.length > 0 && lines[lines.length - 1].text.toLowerCase() === rawText.toLowerCase()) {
        continue;
      }
      lines.push({ timeSec, text: rawText });
    }

    return lines.length >= 6 ? lines : [];
  } catch {
    return [];
  }
}

async function fetchBestLrcLyrics(
  artist: string,
  rawTitle: string,
  targetDurationSec?: number,
  videoIdHint?: string
): Promise<LrcMatchPayload> {
  const { cleanArtist, primaryArtist, cleanTitle } = extractCanonicalArtistAndTitle(
    artist,
    rawTitle
  );
  const searchTitle = normalizeSearchToken(cleanTitle) || cleanTitle;
  const durBucket =
    targetDurationSec && targetDurationSec >= 95 ? Math.round(targetDurationSec) : 0;
  const cacheKey = `${primaryArtist.toLowerCase()}__${searchTitle.toLowerCase()}__${durBucket}`;
  const baseCacheKey = `${primaryArtist.toLowerCase()}__${searchTitle.toLowerCase()}__0`;

  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey)!;
  }
  if (durBucket === 0 && lyricsCache.has(baseCacheKey)) {
    return lyricsCache.get(baseCacheKey)!;
  }
  if (inFlightLrcPromises.has(cacheKey)) {
    return inFlightLrcPromises.get(cacheKey)!;
  }

  const lrcTask = (async (): Promise<LrcMatchPayload> => {
    const allArtistParts = cleanArtist
      .toLowerCase()
      .split(/\s*(?:,|&|\bfeat\.?\b|\bft\.?\b|\bwith\b|\bx\b|\/)\s*/i)
      .map((p) => p.trim())
      .filter((p) => p.length > 1);

    const artistPrimaryWord =
      primaryArtist
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2)[0] || primaryArtist.toLowerCase();

    const urls = [
      `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(primaryArtist)}`,
      `https://lrclib.net/api/search?q=${encodeURIComponent(`${primaryArtist} ${cleanTitle}`)}`,
    ];

    const fetchLrcWithRetry = async (url: string): Promise<any[]> => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5500);
        try {
          const r = await withLrcSemaphore(() =>
            fetch(url, {
              headers: { 'User-Agent': 'SanctuaryPulseChristianMusic/1.0' },
              signal: controller.signal,
            })
          );
          if ((r.status === 429 || r.status >= 500) && attempt < 2) {
            await new Promise((res) => setTimeout(res, 450 * (attempt + 1)));
            continue;
          }
          if (!r.ok) return [];
          const items = await r.json();
          return Array.isArray(items) ? items : [];
        } catch {
          if (attempt < 2) {
            await new Promise((res) => setTimeout(res, 350 * (attempt + 1)));
            continue;
          }
          return [];
        } finally {
          clearTimeout(timer);
        }
      }
      return [];
    };

    // Query LRCLIB endpoints cleanly with timeout + 429 retry
    const lrcResponses = await Promise.allSettled(urls.map(fetchLrcWithRetry));

    const allCandidates: any[] = [];
    for (const res of lrcResponses) {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        allCandidates.push(...res.value);
      }
    }

    const wantsLive = /\blive\b/i.test(rawTitle);
    const valid = allCandidates.filter((it: any) => {
      if (!it?.syncedLyrics && !it?.plainLyrics) return false;
      const rawTrackName = String(it.trackName || it.name || '');
      const rawAlbumName = String(it.albumName || '');
      const textSample = String(it.plainLyrics || it.syncedLyrics || '');

      if (isProfaneOrSecular(textSample)) return false;
      if (isInstrumentalOrRemakeText(`${rawTrackName} ${rawAlbumName}`, 'meta')) return false;
      if (
        !wantsLive &&
        (/\b(live|live at|live from|live version|unplugged)\b/i.test(rawTrackName) ||
          /\b(live|live at|live from|live tour|live version|unplugged)\b/i.test(rawAlbumName))
      ) {
        return false;
      }
      if (isSpanishOrNonEnglishLyrics(textSample)) return false;

      const aNameNorm = normalizeMatchTokens(String(it.artistName || ''));
      const pArtistNorm = normalizeMatchTokens(primaryArtist);

      // Require ALL words of the requested title to match at word boundaries
      const matchesTitle = hasStrictTitleWordMatch(rawTrackName, cleanTitle);
      if (!matchesTitle) return false;

    // Require exact artist alignment (handles multi-artist & featured credits cleanly, rejects wrong artists)
    const matchesArtist =
      (pArtistNorm.length > 0 &&
        (` ${aNameNorm} `.includes(` ${pArtistNorm} `) ||
          ` ${pArtistNorm} `.includes(` ${aNameNorm} `))) ||
      allArtistParts.some((p) => {
        const pn = normalizeMatchTokens(p);
        return pn.length > 1 && ` ${aNameNorm} `.includes(` ${pn} `);
      });

    if (!matchesArtist) return false;

    // If audio duration is known, reject wildly different edits (> 24s diff)
    const dur = Number(it.duration || 0);
    if (durBucket >= 95 && dur > 0 && Math.abs(dur - durBucket) > 24) return false;

    // Skip nearly empty lyric stubs
    if (it.syncedLyrics) {
      const parsed = parseLrcString(String(it.syncedLyrics));
      if (parsed.length < 6) return false;
    }

    return true;
  });

  if (valid.length > 0) {
    valid.sort((a: any, b: any) => {
      const scoreItem = (it: any) => {
        let s = 0;
        const rawTName = String(it.trackName || it.name || '').toLowerCase().trim();
        const tName = normalizeSearchToken(rawTName);
        const aName = String(it.artistName || '').toLowerCase().trim();
        const dur = Number(it.duration || 0);

        if (it.syncedLyrics) s += 190;
        if (tName === searchTitle) s += 120;
        else if (tName.startsWith(searchTitle)) s += 55;

        if (aName === primaryArtist.toLowerCase() || aName === cleanArtist.toLowerCase()) s += 95;
        else if (aName.includes(artistPrimaryWord) || allArtistParts.some((p) => aName.includes(p))) s += 50;

        if (!wantsLive && /\b(live|remix|extended|spontaneous|medley|reprise)\b/i.test(rawTName)) {
          s -= 90;
        }

        if (durBucket >= 95 && dur > 0) {
          const diff = Math.abs(dur - durBucket);
          if (diff <= 2) s += 420;
          else if (diff <= 5) s += 300;
          else if (diff <= 8) s += 180;
          else if (diff <= 14) s += 50;
          else s -= 150;
        } else if (dur >= 150 && dur <= 330) {
          s += 35;
        }
        return s;
      };
      return scoreItem(b) - scoreItem(a);
    });

    const best = valid[0];
    const rawSynced = best.syncedLyrics ? parseLrcString(String(best.syncedLyrics)) : [];
    const plain = best.plainLyrics
      ? String(best.plainLyrics)
          .split('\n')
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 0 && !l.startsWith('['))
      : rawSynced.map((s) => s.text);

    const lrcDur =
      Number(best.duration || 0) ||
      (rawSynced.length > 0 ? rawSynced[rawSynced.length - 1].timeSec + 8 : durBucket || 215);
    const rawLrcDurationSec = Math.round(lrcDur);

    // Only trust LRCLIB timestamps directly if they exist AND match the actual audio duration within 8s
    const durationMatchesAudio =
      durBucket === 0 || Math.abs(lrcDur - durBucket) <= 8;
    const hasTrueLrcTimestamps = rawSynced.length >= 6 && durationMatchesAudio;

    // Only apply micro-drift scaling (<= 8s variance); never stretch > 8s onto a mismatched cut!
    let synced: SyncedLyricLine[];
    if (rawSynced.length >= 4) {
      if (
        durBucket >= 95 &&
        lrcDur >= 95 &&
        Math.abs(lrcDur - durBucket) > 1.5 &&
        Math.abs(lrcDur - durBucket) <= 8
      ) {
        const ratio = durBucket / lrcDur;
        synced = rawSynced.map((line) => ({
          timeSec: Math.round(line.timeSec * ratio * 100) / 100,
          text: line.text,
        }));
      } else {
        synced = rawSynced;
      }
    } else if (plain.length >= 4) {
      synced = buildSmartTimedLinesFromPlain(plain, durBucket || lrcDur || 215);
    } else {
      synced = rawSynced;
    }

      const validDurations = Array.from(
        new Set(
          valid
            .filter((it: any) => Boolean(it.syncedLyrics))
            .map((it: any) => Math.round(Number(it.duration || 0)))
            .filter((d: number) => d >= 95 && d <= 540)
        )
      );
      if (validDurations.length === 0) {
        if (rawLrcDurationSec >= 95) validDurations.push(rawLrcDurationSec);
      }

      const result: LrcMatchPayload = {
        synced,
        plain,
        lrcDurationSec: rawLrcDurationSec,
        rawLrcDurationSec,
        validDurations,
        matchedTrackName: String(best.trackName || best.name || cleanTitle),
        matchedArtistName: String(best.artistName || cleanArtist),
        hasTrueLrcTimestamps,
        syncMethod: rawSynced.length >= 6 ? 'studio-lrc' : 'plain-smart',
      };
      lyricsCache.set(cacheKey, result);
      if (durBucket === 0) {
        lyricsCache.set(baseCacheKey, result);
      }
      return result;
    }

    // Tier 2: Extract real timed captions from YouTube for underground / brand-new uploads not on LRCLIB yet
    const ytCaptionLines = await fetchYouTubeTimedCaptions(
      videoIdHint || '',
      primaryArtist,
      cleanTitle,
      durBucket || 215
    );
    if (ytCaptionLines.length >= 6) {
      const effectiveDur =
        durBucket >= 95
          ? durBucket
          : Math.max(180, Math.round(ytCaptionLines[ytCaptionLines.length - 1].timeSec + 10));
      const result: LrcMatchPayload = {
        synced: ytCaptionLines,
        plain: ytCaptionLines.map((l) => l.text),
        lrcDurationSec: effectiveDur,
        validDurations: [effectiveDur],
        matchedTrackName: cleanTitle,
        matchedArtistName: cleanArtist,
        hasTrueLrcTimestamps: true,
        syncMethod: 'youtube-timed',
      };
      lyricsCache.set(cacheKey, result);
      return result;
    }

    return { synced: [], plain: [], lrcDurationSec: 0, validDurations: [], hasTrueLrcTimestamps: false };
  })();

  inFlightLrcPromises.set(cacheKey, lrcTask);
  try {
    return await lrcTask;
  } finally {
    inFlightLrcPromises.delete(cacheKey);
  }
}

/**
 * AI Audio Lyric Listener & Timestamp Aligner:
 * Uses @google/genai (gemini-4-hydrogen) to listen directly to the assembled song audio bytes
 * (song.buffer) and transcribe/align every sung vocal phrase to its exact timestamp in seconds (timeSec).
 * Bounded by a strict 7.5s timeout so it never blocks or hangs the server.
 */
async function listenAndAlignAudioWithGemini(
  song: AssembledFullSong,
  audioArtist: string,
  audioTitle: string,
  candidateLyrics?: LrcMatchPayload
): Promise<LrcMatchPayload | null> {
  const ai = getGenAI();
  if (!ai || !song.buffer || song.buffer.length < 100000) return null;

  const runAiTask = async (): Promise<LrcMatchPayload | null> => {
    try {
      // Allow up to 5.5 MB inline audio so Gemini hears the full song cleanly through choruses & bridge
      const maxBytes = 5.5 * 1024 * 1024;
      const audioSlice =
        song.buffer.length > maxBytes ? song.buffer.subarray(0, maxBytes) : song.buffer;
      const base64Audio = audioSlice.toString('base64');
      const mimeType = song.contentType || 'audio/mpeg';

      const refLines =
        candidateLyrics && candidateLyrics.plain && candidateLyrics.plain.length >= 4
          ? candidateLyrics.plain.slice(0, 70)
          : [];

      const referenceSection =
        refLines.length >= 4
          ? `\nCandidate reference lyrics for "${audioTitle}" by "${audioArtist}" (ONLY use these words if they match what the singer is actually singing in this audio file; if the singer in the audio is singing different words, transcribe what you actually hear in the audio):\n${refLines.join('\n')}\n`
          : '';

      const promptText = `Listen carefully to this Christian song audio recording ("${audioTitle}" by "${audioArtist}", total duration: ${song.durationSec} seconds).
${referenceSection}
Your task:
1. Listen directly to the vocalist in the attached audio from 0.0 seconds to ${song.durationSec} seconds.
2. Output a JSON array of timed lyric lines in chronological order where each item has:
   - "timeSec": number (the exact timestamp in seconds, e.g. 12.4, when the vocalist begins singing that phrase in the audio).
   - "text": string (the exact sung lyric words heard in that phrase, 4 to 12 words per line).
3. Make sure "timeSec" is 100% synchronized to when the vocals are actually heard in the audio.
4. Do NOT include section headers like "[Verse 1]" or "[Chorus]".`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          {
            inlineData: {
              mimeType,
              data: base64Audio,
            },
          },
          {
            text: promptText,
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                timeSec: { type: Type.NUMBER },
                text: { type: Type.STRING },
              },
              required: ['timeSec', 'text'],
            },
          },
        },
      });

      const rawJson = response.text;
      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed)) {
          const cleanedLines: SyncedLyricLine[] = parsed
            .filter(
              (item: any) =>
                item &&
                typeof item.text === 'string' &&
                Number.isFinite(Number(item.timeSec)) &&
                Number(item.timeSec) >= 0 &&
                Number(item.timeSec) <= song.durationSec + 5
            )
            .map((item: any) => ({
              timeSec: Math.round(Number(item.timeSec) * 100) / 100,
              text: String(item.text)
                .replace(/^\[.*?\]/g, '')
                .replace(/^[\s♪♫]+|[\s♪♫]+$/g, '')
                .trim(),
            }))
            .filter(
              (item: SyncedLyricLine) =>
                item.text.length >= 2 &&
                !/^(verse|chorus|bridge|intro|outro|instrumental|music)\b/i.test(item.text) &&
                !isProfaneOrSecular(item.text)
            )
            .sort((a: SyncedLyricLine, b: SyncedLyricLine) => a.timeSec - b.timeSec);

          if (cleanedLines.length >= 4) {
            return {
              synced: cleanedLines,
              plain: cleanedLines.map((l) => l.text),
              lrcDurationSec: song.durationSec,
              matchedTrackName: audioTitle,
              matchedArtistName: audioArtist,
              hasTrueLrcTimestamps: true,
              aiAudioSynced: true,
              syncMethod: 'gemini-audio-listen',
            };
          }
        }
      }
    } catch {
      // ignore AI error and allow fallback
    }
    return null;
  };

  return Promise.race([
    runAiTask(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 7500)),
  ]);
}

/**
 * Resolves 100% audio-locked lyrics for an AssembledFullSong:
 * 1. Matches the actual SoundCloud audio stream (tier 1 vs tier 2/3 fallback).
 * 2. Checks LRCLIB / YouTube Captions for true studio LRC timestamps matching the exact audio duration.
 * 3. Runs Gemini AI Audio Listener (listenAndAlignAudioWithGemini) when needed or forced, with strict timeout protection.
 */
async function resolveAudioLockedLyricsForSong(
  song: AssembledFullSong,
  requestedArtist: string,
  requestedTitle: string,
  forceAiListen = false
): Promise<LrcMatchPayload> {
  const { cleanArtist, primaryArtist, cleanTitle } = extractCanonicalArtistAndTitle(
    requestedArtist,
    requestedTitle
  );
  const searchTitle = normalizeSearchToken(cleanTitle) || cleanTitle.toLowerCase();
  const songCacheKey = `${primaryArtist.toLowerCase().trim()}__${searchTitle.toLowerCase().trim()}`;

  if (!forceAiListen && aiVerifiedLyricsCache.has(songCacheKey)) {
    const cached = aiVerifiedLyricsCache.get(songCacheKey)!;
    if (cached.synced.length >= 4) return cached;
  }

  const inFlightKey = `${songCacheKey}__${forceAiListen ? 'force' : 'auto'}`;
  if (inFlightAiLyricPromises.has(inFlightKey)) {
    return inFlightAiLyricPromises.get(inFlightKey)!;
  }

  const workPromise = (async (): Promise<LrcMatchPayload> => {
    const parsedMatched = extractCanonicalArtistAndTitle(
      song.matchedArtist || cleanArtist,
      song.matchedTitle || cleanTitle
    );
    const actualAudioArtist =
      song.tier === 1 ? cleanArtist : parsedMatched.cleanArtist || cleanArtist;
    const actualAudioTitle =
      song.tier === 1 ? cleanTitle : parsedMatched.cleanTitle || cleanTitle;

    // 1. Check LRCLIB / YouTube Captions for the ACTUAL audio track & duration
    let candidate = await fetchBestLrcLyrics(
      actualAudioArtist,
      actualAudioTitle,
      song.durationSec
    );

    // Only try requested cleanArtist/cleanTitle if song.tier === 1 (never show lyrics for Song A while playing fallback Song B!)
    if (candidate.synced.length < 4 && song.tier === 1) {
      const altCandidate = await fetchBestLrcLyrics(
        cleanArtist,
        cleanTitle,
        song.durationSec
      );
      if (altCandidate.synced.length > candidate.synced.length) {
        candidate = altCandidate;
      }
    }

    if (candidate.synced.length >= 4) {
      song.lyrics = {
        ...candidate,
        aiAudioSynced: true,
      };
      trackMetaLockCache.set(songCacheKey, {
        durationSec: song.durationSec,
        matchedTitle: song.matchedTitle,
        scTrackTitle: song.scTrackTitle,
        scUploader: song.scUploader,
        scPlayCount: song.scPlayCount,
        scVerified: song.scVerified,
        lyrics: song.lyrics,
      });
    }

    const isExactStudioLrc =
      Boolean(candidate.hasTrueLrcTimestamps) &&
      candidate.synced.length >= 6;

    // 2. If we don't have an exact duration-locked studio LRC (or if forceAiListen=true),
    // have Gemini AI listen directly to song.buffer (bounded by 7.5s timeout)
    if (forceAiListen || !isExactStudioLrc) {
      const aiHeard = await listenAndAlignAudioWithGemini(
        song,
        actualAudioArtist,
        actualAudioTitle,
        candidate
      );
      if (aiHeard && aiHeard.synced.length >= 4) {
        song.lyrics = aiHeard;
        aiVerifiedLyricsCache.set(songCacheKey, aiHeard);
        trackMetaLockCache.set(songCacheKey, {
          durationSec: song.durationSec,
          matchedTitle: song.matchedTitle,
          scTrackTitle: song.scTrackTitle,
          scUploader: song.scUploader,
          scPlayCount: song.scPlayCount,
          scVerified: song.scVerified,
          lyrics: aiHeard,
        });
        return aiHeard;
      }
    }

    const finalPayload: LrcMatchPayload = {
      ...candidate,
      aiAudioSynced: candidate.synced.length >= 4,
    };
    if (finalPayload.synced.length >= 4) {
      song.lyrics = finalPayload;
      aiVerifiedLyricsCache.set(songCacheKey, finalPayload);
      trackMetaLockCache.set(songCacheKey, {
        durationSec: song.durationSec,
        matchedTitle: song.matchedTitle,
        scTrackTitle: song.scTrackTitle,
        scUploader: song.scUploader,
        scPlayCount: song.scPlayCount,
        scVerified: song.scVerified,
        lyrics: finalPayload,
      });
    }
    return finalPayload;
  })();

  inFlightAiLyricPromises.set(inFlightKey, workPromise);
  try {
    return await workPromise;
  } finally {
    inFlightAiLyricPromises.delete(inFlightKey);
  }
}

async function assembleFullLengthSong(
  artist: string,
  title: string
): Promise<AssembledFullSong | null> {
  const { cleanArtist, primaryArtist, cleanTitle } = extractCanonicalArtistAndTitle(
    artist,
    title
  );
  const searchTitle = normalizeSearchToken(cleanTitle) || cleanTitle.toLowerCase();
  const cacheKey = `${primaryArtist.toLowerCase().trim()}__${searchTitle.toLowerCase().trim()}`;

  if (fullSongCache.has(cacheKey)) {
    return fullSongCache.get(cacheKey)!;
  }
  if (inFlightSongPromises.has(cacheKey)) {
    return inFlightSongPromises.get(cacheKey)!;
  }

  const promise = (async (): Promise<AssembledFullSong | null> => {
    try {
      const clientId = await getSoundCloudClientId();
      const baseCacheKey = `${primaryArtist.toLowerCase()}__${searchTitle.toLowerCase()}__0`;
      let cachedLrc = lyricsCache.get(baseCacheKey);

      // Reliable LRCLIB duration peek so we lock onto the official studio duration (never padded video rips or wrong edits!)
      if (!cachedLrc) {
        try {
          cachedLrc = await Promise.race([
            fetchBestLrcLyrics(cleanArtist, cleanTitle),
            new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 4200)),
          ]);
        } catch {
          // ignore
        }
      }

      const knownLrcDurations = Array.from(
        new Set(
          (cachedLrc?.validDurations && cachedLrc.validDurations.length > 0
            ? cachedLrc.validDurations
            : cachedLrc && cachedLrc.lrcDurationSec >= 95
            ? [cachedLrc.lrcDurationSec]
            : []
          ).filter((d) => d >= 95 && d <= 540)
        )
      );
      const targetStudioDurSec =
        knownLrcDurations[0] || (cachedLrc && cachedLrc.lrcDurationSec >= 95 ? cachedLrc.lrcDurationSec : 220);
      const wantsLive = /\blive\b/i.test(title);

      // STRICT TIER-1 ONLY: NEVER substitute a different song by the artist or genre!
      const queries = [
        { q: `${primaryArtist} ${cleanTitle}`, requireTitleMatch: true, tier: 1 },
        { q: `${cleanTitle} ${primaryArtist}`, requireTitleMatch: true, tier: 1 },
      ];

      const titleWords = searchTitle
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2);
      const titlePrimaryWord = titleWords[0] || searchTitle.toLowerCase();

      const OFFICIAL_RECORD_LABELS = [
        'atlantic records',
        'solid state',
        'facedown',
        'tooth & nail',
        'tooth and nail',
        'reach records',
        'rapzilla',
        'eonemusic',
        'ardent',
        'umpg',
        'themercyme',
        'flix_records',
        'capitol',
        'provident',
        'sparrow',
        'centricity',
        'integrity',
        'bethel',
        'elevation',
        'gotee',
        'word entertainment',
        'curb',
        'essential',
        'fair trade',
        'hassle records',
        'hiatus records',
        'canzion',
      ];

      const INDIE_VERIFIED_WHITELIST = [
        'kamban',
        't-strike',
        't strike',
        'bloodrage',
        'relient k',
        'five iron frenzy',
        'matthew parker',
        'miles minnick',
        'needtobreathe',
        'limoblaze',
        'capital kings',
      ];

      // Run Tier-1 SoundCloud searches in PARALLEL and pool/deduplicate all clean candidates globally
      const scSearchResults = await Promise.allSettled(
        queries.map(async (qSpec) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 4500);
          try {
            const sr = await fetch(
              `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(
                qSpec.q
              )}&client_id=${clientId}&limit=30`,
              { signal: controller.signal }
            );
            if (!sr.ok) return [];
            const sd = await sr.json();
            return Array.isArray(sd?.collection) ? sd.collection : [];
          } finally {
            clearTimeout(timer);
          }
        })
      );

      const pooledMap = new Map<number, any>();
      for (const res of scSearchResults) {
        if (res.status === 'fulfilled') {
          for (const item of res.value) {
            if (item?.id && !pooledMap.has(item.id)) {
              pooledMap.set(item.id, item);
            }
          }
        }
      }

      const normFullArtist = normalizeMatchTokens(primaryArtist);
      const normArtistCompact = normFullArtist.replace(/\s+/g, '');

      const candidates = Array.from(pooledMap.values()).filter((x: any) => {
        if (x.publisher_metadata?.explicit === true) return false;
        const cTitle = String(x.title || '');
        const cGenre = String(x.genre || '');
        const cAlbum = String(x.publisher_metadata?.album_title || '');
        const cUser = String(x.user?.username || '');
        const cDesc = String(x.description || '').slice(0, 450);
        const cTags = String(x.tag_list || '');
        const pubArtist = String(x.publisher_metadata?.artist || '').toLowerCase().trim();
        const labelName = String(x.label_name || x.publisher_metadata?.publisher || '').toLowerCase();

        const titleAndUser = `${cTitle} ${cUser}`.toLowerCase();
        if (isProfaneOrSecular(titleAndUser)) return false;

        // Strictly reject covers, instrumentals, backing tracks, click tracks, lo-fi, remixes, church rehearsals across title, genre, user, album!
        if (isInstrumentalOrRemakeText(`${cTitle} ${cGenre} ${cUser} ${cAlbum}`, 'meta')) return false;
        if (isInstrumentalOrRemakeText(`${cTags} ${cDesc}`, 'desc')) return false;
        if (!wantsLive && /\b(live|live at|live from|live version|unplugged)\b/i.test(cTitle)) {
          return false;
        }

        // Block known amateur/church/false-positive uploader accounts and secular collisions (e.g. Trippie Redd, Sexyy Red, Kaymuni, God MC)
        if (
          /\b(delaney crowder|resse crowder|key by key|party tyme|praise and worship orchestra|baptist|methodist|presbyterian|lutheran|catholic|parish|chapel|bible church|community church|worship center|trippie redd|sexyy red|kaymuni|god mc|praise hymn|praisesong)\b/i.test(
            `${cTitle} ${cUser} ${pubArtist} ${cDesc}`
          ) ||
          cUser.toLowerCase().includes('disciple ♛')
        ) {
          return false;
        }

        const durSec = Math.round((x.duration || 0) / 1000);
        if (durSec < 95 || durSec > 540) return false;

        // If we know the official studio LRC durations, enforce +-22s lock against valid album/radio editions
        if (
          knownLrcDurations.length > 0 &&
          !knownLrcDurations.some((d) => Math.abs(durSec - d) <= 22)
        ) {
          return false;
        }

        // Strict word-boundary match on ALL words of requested title
        if (!hasStrictTitleWordMatch(cTitle, cleanTitle)) return false;

        // Reject "SongTitle by Someone Else" amateur uploads (skip matches that are inside the song's own cleanTitle like "Washed By The Water")
        const titleWithoutTarget = normalizeMatchTokens(cTitle)
          .replace(normalizeMatchTokens(cleanTitle), ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (
          /\bby\s+[a-z]{2,}\s+[a-z]{2,}/i.test(titleWithoutTarget) &&
          !` ${normalizeMatchTokens(cTitle)} `.includes(` ${normFullArtist} `)
        ) {
          return false;
        }

        // Strict word-boundary artist check (prevents "Red" matching "Trippie Redd", or "KB" matching random initials)
        if (pubArtist) {
          const normPub = normalizeMatchTokens(pubArtist);
          if (
            normPub.length > 1 &&
            !` ${normPub} `.includes(` ${normFullArtist} `) &&
            !` ${normFullArtist} `.includes(` ${normPub} `) &&
            !OFFICIAL_RECORD_LABELS.some((lbl) => pubArtist.includes(lbl))
          ) {
            return false;
          }
        }

        const cUserNorm = ` ${normalizeMatchTokens(cUser)} `;
        const cTitleNorm = ` ${normalizeMatchTokens(cTitle)} `;
        const cPubNorm = ` ${normalizeMatchTokens(pubArtist)} `;
        const artistCompactMatch =
          normArtistCompact.length >= 5 &&
          (cUserNorm.replace(/\s+/g, '').includes(normArtistCompact) ||
            cPubNorm.replace(/\s+/g, '').includes(normArtistCompact));
        const hasExactArtistWord =
          cUserNorm.includes(` ${normFullArtist} `) ||
          cTitleNorm.includes(` ${normFullArtist} `) ||
          cPubNorm.includes(` ${normFullArtist} `) ||
          artistCompactMatch;

        if (!hasExactArtistWord) return false;

        const playCount = Number(x.playback_count || 0);
        const isIndieWhitelisted = INDIE_VERIFIED_WHITELIST.some((w) => normFullArtist.includes(w));
        const hasOfficialAccountOrLabel =
          cUserNorm.includes(` ${normFullArtist} `) ||
          cUserNorm.replace(/\s+/g, '').includes(normArtistCompact) ||
          OFFICIAL_RECORD_LABELS.some(
            (lbl) => cUser.toLowerCase().includes(lbl) || labelName.includes(lbl)
          ) ||
          Boolean(x.user?.verified || x.user?.badges?.verified);

        const matchesLrcClosely =
          Boolean(cachedLrc && cachedLrc.lrcDurationSec >= 95 && Math.abs(durSec - cachedLrc.lrcDurationSec) <= 12);

        if (!hasOfficialAccountOrLabel && !isIndieWhitelisted && playCount < 1000) {
          return false;
        }

        return x.media?.transcodings?.some(
          (tr: any) =>
            !tr.snipped &&
            tr.preset !== 'abr_sq' &&
            !String(tr.format?.mime_type || '').includes('mpegurl') &&
            (tr.format?.protocol === 'progressive' || tr.format?.protocol === 'hls')
        );
      });

      if (candidates.length > 0) {
        candidates.sort((a: any, b: any) => {
          const scoreCandidate = (cand: any) => {
            const cTitle = String(cand.title || '').toLowerCase();
            const cNormTitle = normalizeSearchToken(cTitle);
            const cUser = String(cand.user?.username || '').toLowerCase();
            const pubArtist = String(cand.publisher_metadata?.artist || '').toLowerCase();
            const labelName = String(
              cand.label_name || cand.publisher_metadata?.publisher || ''
            ).toLowerCase();
            const cDurSec = Math.round((cand.duration || 0) / 1000);
            const durDiff =
              knownLrcDurations.length > 0
                ? Math.min(...knownLrcDurations.map((d) => Math.abs(cDurSec - d)))
                : Math.abs(cDurSec - targetStudioDurSec);
            const playCount = Number(cand.playback_count || 0);
            const isOfficialUser =
              cUser.replace(/\s+/g, '').includes(normArtistCompact) ||
              OFFICIAL_RECORD_LABELS.some(
                (lbl) => cUser.includes(lbl) || labelName.includes(lbl)
              ) ||
              Boolean(cand.user?.verified || cand.user?.badges?.verified);

            let score = 0;
            if (
              cand.media?.transcodings?.some(
                (t: any) => !t.snipped && t.format?.protocol === 'progressive'
              )
            ) {
              score += 35;
            }
            if (isOfficialUser) score += 220;
            if (pubArtist.includes(normFullArtist) && (isOfficialUser || playCount >= 2500)) score += 120;
            if (playCount > 0) score += Math.min(240, Math.round(Math.log10(playCount + 1) * 48));

            if (
              cNormTitle === searchTitle ||
              cNormTitle === `${normFullArtist} ${searchTitle}` ||
              cNormTitle === `${searchTitle} ${normFullArtist}`
            ) {
              score += 180;
            } else if (cTitle.includes(cleanTitle.toLowerCase())) {
              score += 75;
            } else if (cNormTitle.includes(titlePrimaryWord)) {
              score += 25;
            }

            if (cand.user?.verified || cand.user?.badges?.verified) score += 75;

            if (knownLrcDurations.length > 0) {
              if (durDiff <= 3) score += 460;
              else if (durDiff <= 6) score += 340;
              else if (durDiff <= 10) score += 180;
              else if (durDiff <= 15) score += 40;
              else score -= 280;
            } else {
              if (cDurSec >= 150 && cDurSec <= 320) score += 45;
              else if (cDurSec > 400) score -= 50;
            }

            if (/\b(official\s+)?music\s+video\b/i.test(cTitle) && (knownLrcDurations.length === 0 || durDiff > 4)) {
              score -= 220;
            }

            return score;
          };

          return scoreCandidate(b) - scoreCandidate(a);
        });

        const tier = 1;
        for (const chosen of candidates.slice(0, 4)) {
          try {
            const tr =
              chosen.media.transcodings.find(
                (x: any) => !x.snipped && x.format?.protocol === 'progressive'
              ) ||
              chosen.media.transcodings.find(
                (x: any) =>
                  !x.snipped &&
                  x.format?.protocol === 'hls' &&
                  x.format?.mime_type === 'audio/mpeg'
              ) ||
              chosen.media.transcodings.find(
                (x: any) =>
                  !x.snipped &&
                  x.format?.protocol === 'hls' &&
                  x.preset !== 'abr_sq' &&
                  !String(x.format?.mime_type || '').includes('mpegurl')
              );

            if (!tr) continue;
            const sRes = await fetch(`${tr.url}?client_id=${clientId}`);
            if (!sRes.ok) continue;
            const sData = await sRes.json();
            if (!sData?.url) continue;

            const chosenDurSec = Math.round(chosen.duration / 1000);
            const rawChosenArtist = String(
              chosen.publisher_metadata?.artist || chosen.user?.username || cleanArtist
            );
            const parsedChosen = extractCanonicalArtistAndTitle(
              rawChosenArtist,
              String(chosen.title || cleanTitle)
            );
            const finalMatchedArtist = tier === 1 ? cleanArtist : parsedChosen.cleanArtist;
            const finalMatchedTitle = tier === 1 ? cleanTitle : parsedChosen.cleanTitle;

            if (tr.format.protocol === 'progressive') {
              const upstream = await fetch(sData.url);
              if (!upstream.ok) continue;
              const buf = Buffer.from(await upstream.arrayBuffer());
              if (buf.length < 250000) continue;
              const assembled: AssembledFullSong = {
                buffer: buf,
                contentType: 'audio/mpeg',
                durationSec: chosenDurSec,
                matchedTitle: finalMatchedTitle,
                matchedArtist: finalMatchedArtist,
                scTrackTitle: String(chosen.title || ''),
                scUploader: String(chosen.user?.username || ''),
                scPlayCount: Number(chosen.playback_count || 0),
                scVerified: Boolean(chosen.user?.verified || chosen.user?.badges?.verified),
                tier,
              };
              if (fullSongCache.size >= 90) {
                const oldestKey = fullSongCache.keys().next().value;
                if (oldestKey) fullSongCache.delete(oldestKey);
              }
              fullSongCache.set(cacheKey, assembled);

              // Immediately start AI Audio Listener & Lyric Lock in background on the assembled song buffer!
              void resolveAudioLockedLyricsForSong(assembled, cleanArtist, cleanTitle, false).catch(
                () => {}
              );

              return assembled;
            }

            const m3u8Res = await fetch(sData.url);
            if (!m3u8Res.ok) continue;
            const m3u8 = await m3u8Res.text();
            if (m3u8.includes('#EXT-X-KEY')) continue;

            const mapMatch = m3u8.match(/#EXT-X-MAP:URI="([^"]+)"/);
            const segUrls = m3u8
              .split('\n')
              .map((l) => l.trim())
              .filter((l) => l.startsWith('http'));
            const allUrls = mapMatch ? [mapMatch[1], ...segUrls] : segUrls;
            if (allUrls.length === 0) continue;

            const buffers = await Promise.all(
              allUrls.map(async (u) => {
                const r = await fetch(u);
                return Buffer.from(await r.arrayBuffer());
              })
            );
            const combined = Buffer.concat(buffers);
            if (combined.length < 250000) continue;

            const contentType = tr.format.mime_type?.includes('mp4')
              ? 'audio/mp4'
              : 'audio/mpeg';
            const assembled: AssembledFullSong = {
              buffer: combined,
              contentType,
              durationSec: chosenDurSec,
              matchedTitle: finalMatchedTitle,
              matchedArtist: finalMatchedArtist,
              scTrackTitle: String(chosen.title || ''),
              scUploader: String(chosen.user?.username || ''),
              scPlayCount: Number(chosen.playback_count || 0),
              scVerified: Boolean(chosen.user?.verified || chosen.user?.badges?.verified),
              tier,
            };

            if (fullSongCache.size >= 90) {
              const oldestKey = fullSongCache.keys().next().value;
              if (oldestKey) fullSongCache.delete(oldestKey);
            }
            fullSongCache.set(cacheKey, assembled);

            // Immediately start AI Audio Listener & Lyric Lock in background on the assembled song buffer!
            void resolveAudioLockedLyricsForSong(assembled, cleanArtist, cleanTitle, false).catch(
              () => {}
            );

            return assembled;
          } catch {
            // try next candidate
          }
        }
      }
    } catch {
      // ignore
    }

    return null;
  })();

  inFlightSongPromises.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inFlightSongPromises.delete(cacheKey);
  }
}

// Stream 100% FULL-LENGTH (2.5 to 8 minute) songs with full HTTP Range support for instant scrubbing & ringtone export
app.get('/api/music/full-song', async (req, res) => {
  const title = String(req.query.title || '').trim();
  const artist = String(req.query.artist || '').trim();
  const downloadFilename = String(req.query.filename || '').trim();

  if (!title && !artist) {
    res.status(400).json({ error: 'Missing title or artist' });
    return;
  }

  try {
    const song = await assembleFullLengthSong(artist, title);
    if (!song) {
      res.status(404).json({ error: 'Full song stream not found' });
      return;
    }

    const totalLength = song.buffer.length;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Type', song.contentType);
    res.setHeader('X-Full-Duration-Sec', String(song.durationSec));

    if (downloadFilename) {
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    }

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;
      const clampedStart = Math.max(0, Math.min(start, totalLength - 1));
      const clampedEnd = Math.max(clampedStart, Math.min(end, totalLength - 1));
      const chunkLength = clampedEnd - clampedStart + 1;

      res.status(206);
      res.setHeader('Content-Range', `bytes ${clampedStart}-${clampedEnd}/${totalLength}`);
      res.setHeader('Content-Length', String(chunkLength));
      res.end(song.buffer.subarray(clampedStart, clampedEnd + 1));
      return;
    }

    res.status(200);
    res.setHeader('Content-Length', String(totalLength));
    res.end(song.buffer);
  } catch {
    res.status(500).json({ error: 'Failed to stream full song' });
  }
});

// Pre-warm audio buffer & audio-locked lyrics for upcoming queue / visible tracks so playback starts instantaneously
app.post('/api/music/prewarm-batch', async (req, res) => {
  const inputTracks = Array.isArray(req.body?.tracks) ? req.body.tracks.slice(0, 5) : [];
  res.json({ queued: inputTracks.length });
  void (async () => {
    for (const item of inputTracks) {
      const title = String(item?.title || '').trim();
      const artist = String(item?.artist || '').trim();
      if (!title || !artist) continue;
      try {
        const song = await assembleFullLengthSong(artist, title);
        if (song) {
          await resolveAudioLockedLyricsForSong(song, artist, title, false);
        }
      } catch {
        // ignore prewarm error
      }
    }
  })();
});

interface YouTubeRichTrackItem {
  videoId: string;
  title: string;
  artist: string;
  durationSeconds: number;
  thumbnailUrl: string;
}

const searchEverywhereCache = new Map<string, YouTubeRichTrackItem[]>();

function parseDurationString(lengthText?: string): number {
  if (!lengthText) return 225;
  const parts = lengthText.split(':').map((n) => parseInt(n, 10));
  if (parts.some((n) => Number.isNaN(n))) return 225;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 225;
}

async function searchYouTubeRichCatalog(query: string): Promise<YouTubeRichTrackItem[]> {
  const key = query.toLowerCase().trim();
  if (searchEverywhereCache.has(key)) {
    return searchEverywhereCache.get(key)!;
  }

  // Ensure searches explicitly target Christian music releases
  const searchQ =
    query.toLowerCase().includes('christian') ||
    query.toLowerCase().includes('worship') ||
    query.toLowerCase().includes('gospel') ||
    query.toLowerCase().includes('kamban') ||
    query.toLowerCase().includes('t-strike') ||
    query.toLowerCase().includes('bloodrage') ||
    query.toLowerCase().includes('demon hunter') ||
    query.toLowerCase().includes('skillet') ||
    query.toLowerCase().includes('lecrae') ||
    query.toLowerCase().includes('tobymac')
      ? query
      : `${query} Christian music`;

  try {
    const response = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        query: searchQ,
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240726.00.00',
            hl: 'en',
            gl: 'US',
          },
        },
      }),
    });
    if (!response.ok) return [];
    const data = await response.json();
    const sectionContents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
        ?.contents || [];

    const results: YouTubeRichTrackItem[] = [];
    for (const sec of sectionContents) {
      const items = sec?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const v = item?.videoRenderer;
        if (!v || !v.videoId) continue;
        const rawTitle: string = v.title?.runs?.[0]?.text || '';
        const channelName: string =
          v.ownerText?.runs?.[0]?.text || v.longBylineText?.runs?.[0]?.text || 'Christian Artist';

        // Reject profanity, secular explicit songs, covers, or non-single compilations/mixes/sermons
        const combinedMeta = `${rawTitle} ${channelName}`;
        if (isProfaneOrSecular(combinedMeta)) continue;
        if (isCoverOrRemakeTrack(combinedMeta)) continue;
        if (
          /\b(mix|playlist|compilation|full\s+album|nonstop|1\s*hour|2\s*hours|top\s+\d+|mashup|medley|sermon|podcast|interview|reaction|shorts|rehearsal|sunday\s+service|baptist|chapel|parish|cover\s+by)\b/i.test(
            combinedMeta
          )
        ) {
          continue;
        }

        const lengthText: string = v.lengthText?.simpleText || '3:45';
        const durationSeconds = parseDurationString(lengthText);
        // Single studio songs are between 1:40 (100s) and 7:30 (450s)
        if (durationSeconds < 100 || durationSeconds > 450) continue;

        const { cleanArtist, cleanTitle } = extractCanonicalArtistAndTitle(channelName, rawTitle);
        if (!cleanTitle || cleanTitle.length < 2) continue;

        // Require YouTube channel to be an Official Artist Channel, Topic channel, VEVO, Record Label, or match the artist name
        const hasOfficialBadge = Array.isArray(v.ownerBadges) && v.ownerBadges.length > 0;
        const lowerChannel = channelName.toLowerCase();
        const lowerArtistPrimary =
          cleanArtist
            .toLowerCase()
            .replace(/[^a-z0-9 ]/g, ' ')
            .split(/\s+/)
            .filter((w) => w.length > 2)[0] || cleanArtist.toLowerCase();
        const isOfficialChannel =
          hasOfficialBadge ||
          lowerChannel.includes('- topic') ||
          lowerChannel.includes('vevo') ||
          lowerChannel.includes('records') ||
          lowerChannel.includes('official') ||
          lowerChannel.includes(lowerArtistPrimary);
        if (!isOfficialChannel) continue;

        const thumbs = v.thumbnail?.thumbnails || [];
        const bestThumb =
          thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

        results.push({
          videoId: v.videoId,
          title: cleanTitle,
          artist: cleanArtist,
          durationSeconds,
          thumbnailUrl: bestThumb,
        });
      }
    }

    const sliced = results.slice(0, 14);
    searchEverywhereCache.set(key, sliced);
    return sliced;
  } catch {
    return [];
  }
}

// Search everywhere across YouTube Music, SoundCloud & Underground Christian Archives
app.get('/api/music/search-everywhere', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) {
    res.json({ items: [] });
    return;
  }
  const items = await searchYouTubeRichCatalog(q);
  res.json({ items });
});

app.get('/api/music/lyrics', async (req, res) => {
  const title = String(req.query.title || '').trim();
  const artist = String(req.query.artist || '').trim();
  const requestedDuration = Number(req.query.duration || 0);
  const videoId = String(req.query.videoId || '').trim();

  const { cleanArtist, primaryArtist, cleanTitle } = extractCanonicalArtistAndTitle(artist, title);
  const searchTitle = normalizeSearchToken(cleanTitle) || cleanTitle.toLowerCase();
  const songCacheKey = `${primaryArtist.toLowerCase().trim()}__${searchTitle.toLowerCase().trim()}`;

  // 1. Check AI-verified cache or locked trackMetaLockCache first
  const aiVerified = aiVerifiedLyricsCache.get(songCacheKey);
  const lockedMeta = trackMetaLockCache.get(songCacheKey);
  if (aiVerified && aiVerified.synced.length >= 4) {
    const cachedSong = fullSongCache.get(songCacheKey);
    res.json({
      ...aiVerified,
      audioDurationSec: cachedSong?.durationSec || lockedMeta?.durationSec || aiVerified.lrcDurationSec,
      matchedAudioTitle: cachedSong?.matchedTitle || lockedMeta?.matchedTitle || aiVerified.matchedTrackName || cleanTitle,
      matchedAudioArtist: cachedSong?.matchedArtist || aiVerified.matchedArtistName || cleanArtist,
      scTrackTitle: cachedSong?.scTrackTitle || lockedMeta?.scTrackTitle,
      scUploader: cachedSong?.scUploader || lockedMeta?.scUploader,
      scPlayCount: cachedSong?.scPlayCount ?? lockedMeta?.scPlayCount,
      scVerified: cachedSong?.scVerified ?? lockedMeta?.scVerified,
      audioLocked: true,
      aiAudioSynced: true,
    });
    return;
  }

  if (lockedMeta && (lockedMeta.lyrics.synced.length > 0 || lockedMeta.lyrics.plain.length > 0)) {
    const cachedSong = fullSongCache.get(songCacheKey);
    res.json({
      ...lockedMeta.lyrics,
      audioDurationSec: lockedMeta.durationSec,
      matchedAudioTitle: lockedMeta.matchedTitle || lockedMeta.lyrics.matchedTrackName || cleanTitle,
      matchedAudioArtist: lockedMeta.lyrics.matchedArtistName || cleanArtist,
      scTrackTitle: cachedSong?.scTrackTitle || lockedMeta.scTrackTitle,
      scUploader: cachedSong?.scUploader || lockedMeta.scUploader,
      scPlayCount: cachedSong?.scPlayCount ?? lockedMeta.scPlayCount,
      scVerified: cachedSong?.scVerified ?? lockedMeta.scVerified,
      audioLocked: true,
    });
    return;
  }

  // Always lock /api/music/lyrics to the actual assembled audio stream (shares in-flight promise with /api/music/full-song)
  try {
    const song = await assembleFullLengthSong(cleanArtist, cleanTitle);
    if (song) {
      const locked = await resolveAudioLockedLyricsForSong(song, cleanArtist, cleanTitle, false);
      res.json({
        ...locked,
        audioDurationSec: song.durationSec,
        matchedAudioTitle: song.matchedTitle || cleanTitle,
        matchedAudioArtist: song.matchedArtist || cleanArtist,
        scTrackTitle: song.scTrackTitle,
        scUploader: song.scUploader,
        scPlayCount: song.scPlayCount,
        scVerified: song.scVerified,
        audioLocked: true,
        aiAudioSynced: true,
      });
      return;
    }
  } catch {
    // fall through
  }

  // Fallback lookup only matches exact title & artist in LRCLIB
  const targetDur = requestedDuration >= 95 ? Math.round(requestedDuration) : undefined;
  const payload = await fetchBestLrcLyrics(cleanArtist, cleanTitle, targetDur, videoId);
  res.json({
    ...payload,
    audioDurationSec: payload.lrcDurationSec || targetDur || 0,
    matchedAudioTitle: payload.matchedTrackName || cleanTitle,
    matchedAudioArtist: payload.matchedArtistName || cleanArtist,
    audioLocked: false,
  });
});

// Fast server-side track verification (ensures unencrypted non-instrumental SoundCloud vocal audio + clean English lyrics exist)
const verifyBatchCache = new Map<
  string,
  { verified: boolean; durationSec: number; matchedTitle: string; matchedArtist: string; hasLyrics: boolean; ts: number }
>();

async function verifySingleTrackForCatalog(
  artist: string,
  title: string,
  hintDuration?: number
): Promise<{
  verified: boolean;
  durationSec: number;
  matchedTitle: string;
  matchedArtist: string;
  hasLyrics: boolean;
}> {
  const { cleanArtist, primaryArtist, cleanTitle } = extractCanonicalArtistAndTitle(artist, title);
  const searchTitle = normalizeSearchToken(cleanTitle) || cleanTitle.toLowerCase();
  const key = `${primaryArtist.toLowerCase()}__${searchTitle.toLowerCase()}`;

  const cached = verifyBatchCache.get(key);
  if (cached && Date.now() - cached.ts < 1000 * 60 * 30) {
    return cached;
  }

  if (isProfaneOrSecular(`${artist} ${title}`) || isInstrumentalOrRemakeText(`${title} ${artist}`, 'meta')) {
    const fail = { verified: false, durationSec: 0, matchedTitle: cleanTitle, matchedArtist: cleanArtist, hasLyrics: false, ts: Date.now() };
    verifyBatchCache.set(key, fail);
    return fail;
  }

  try {
    const clientId = await getSoundCloudClientId();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    let scItems: any[] = [];
    try {
      const sr = await fetch(
        `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(`${primaryArtist} ${cleanTitle}`)}&client_id=${clientId}&limit=15`,
        { signal: controller.signal }
      );
      if (sr.ok) {
        const sd = await sr.json();
        scItems = Array.isArray(sd?.collection) ? sd.collection : [];
      }
    } finally {
      clearTimeout(timer);
    }

    const normFullArtist = normalizeMatchTokens(primaryArtist);
    const normArtistCompact = normFullArtist.replace(/\s+/g, '');
    const wantsLive = /\blive\b/i.test(title);

    const scMatches = scItems.filter((x: any) => {
      if (x.publisher_metadata?.explicit === true) return false;
      const cTitle = String(x.title || '');
      const cGenre = String(x.genre || '');
      const cAlbum = String(x.publisher_metadata?.album_title || '');
      const cUser = String(x.user?.username || '');
      const cDesc = String(x.description || '').slice(0, 350);
      const cTags = String(x.tag_list || '');
      const pubArtist = String(x.publisher_metadata?.artist || '').toLowerCase().trim();
      if (isProfaneOrSecular(`${cTitle} ${cUser}`)) return false;
      if (isInstrumentalOrRemakeText(`${cTitle} ${cGenre} ${cUser} ${cAlbum}`, 'meta')) return false;
      if (isInstrumentalOrRemakeText(`${cTags} ${cDesc}`, 'desc')) return false;
      if (!wantsLive && /\b(live|live at|live from|live version|unplugged)\b/i.test(cTitle)) return false;
      if (
        /\b(delaney crowder|resse crowder|key by key|party tyme|praise and worship orchestra|baptist|methodist|presbyterian|lutheran|catholic|parish|chapel|trippie redd|sexyy red|kaymuni|god mc|praise hymn)\b/i.test(
          `${cTitle} ${cUser} ${pubArtist} ${cDesc}`
        )
      ) {
        return false;
      }

      const durSec = Math.round((x.duration || 0) / 1000);
      if (durSec < 95 || durSec > 540) return false;
      if (hintDuration && hintDuration >= 95 && Math.abs(durSec - hintDuration) > 35) return false;
      if (!hasStrictTitleWordMatch(cTitle, cleanTitle)) return false;

      const titleWithoutTarget = normalizeMatchTokens(cTitle)
        .replace(normalizeMatchTokens(cleanTitle), ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (
        /\bby\s+[a-z]{2,}\s+[a-z]{2,}/i.test(titleWithoutTarget) &&
        !` ${normalizeMatchTokens(cTitle)} `.includes(` ${normFullArtist} `)
      ) {
        return false;
      }

      if (pubArtist) {
        const normPub = normalizeMatchTokens(pubArtist);
        if (normPub.length > 1 && !` ${normPub} `.includes(` ${normFullArtist} `) && !` ${normFullArtist} `.includes(` ${normPub} `)) {
          return false;
        }
      }

      const cUserNorm = ` ${normalizeMatchTokens(cUser)} `;
      const cTitleNorm = ` ${normalizeMatchTokens(cTitle)} `;
      const cPubNorm = ` ${normalizeMatchTokens(pubArtist)} `;
      const hasArtist =
        cUserNorm.includes(` ${normFullArtist} `) ||
        cTitleNorm.includes(` ${normFullArtist} `) ||
        cPubNorm.includes(` ${normFullArtist} `) ||
        (normArtistCompact.length >= 5 && cUserNorm.replace(/\s+/g, '').includes(normArtistCompact));
      if (!hasArtist) return false;

      const playCount = Number(x.playback_count || 0);
      const isOfficial =
        cUserNorm.includes(` ${normFullArtist} `) ||
        Boolean(x.user?.verified || x.user?.badges?.verified) ||
        playCount >= 1000;
      if (!isOfficial) return false;

      return x.media?.transcodings?.some(
        (tr: any) =>
          !tr.snipped &&
          tr.preset !== 'abr_sq' &&
          !String(tr.format?.mime_type || '').includes('mpegurl') &&
          (tr.format?.protocol === 'progressive' || tr.format?.protocol === 'hls')
      );
    });

    if (scMatches.length === 0) {
      const fail = { verified: false, durationSec: 0, matchedTitle: cleanTitle, matchedArtist: cleanArtist, hasLyrics: false, ts: Date.now() };
      verifyBatchCache.set(key, fail);
      return fail;
    }

    // Fetch LRCLIB valid durations in parallel before picking top candidate so duration parity aligns 100% with assembleFullLengthSong
    const initialLrc = await Promise.race([
      fetchBestLrcLyrics(cleanArtist, cleanTitle),
      new Promise<LrcMatchPayload>((resolve) =>
        setTimeout(() => resolve({ synced: [], plain: [], lrcDurationSec: 0 }), 2000)
      ),
    ]);
    const validDurs = initialLrc.validDurations || (initialLrc.lrcDurationSec >= 95 ? [initialLrc.lrcDurationSec] : []);

    scMatches.sort((a: any, b: any) => {
      const scoreCand = (c: any) => {
        const dSec = Math.round((c.duration || 0) / 1000);
        const minDiff = validDurs.length > 0 ? Math.min(...validDurs.map((vd) => Math.abs(dSec - vd))) : 99;
        let sc = Math.min(200, Math.round(Math.log10((Number(c.playback_count || 0)) + 1) * 40));
        if (c.user?.verified || c.user?.badges?.verified) sc += 80;
        if (minDiff <= 3) sc += 400;
        else if (minDiff <= 8) sc += 250;
        else if (minDiff > 15 && validDurs.length > 0) sc -= 250;
        return sc;
      };
      return scoreCand(b) - scoreCand(a);
    });
    const top = scMatches[0];
    const durSec = Math.round((top.duration || 0) / 1000);

    // Require true synced LRC timestamps matching the actual SoundCloud audio duration within 8 seconds
    const lrc = await Promise.race([
      fetchBestLrcLyrics(cleanArtist, cleanTitle, durSec),
      new Promise<LrcMatchPayload>((resolve) =>
        setTimeout(() => resolve({ synced: [], plain: [], lrcDurationSec: 0 }), 2200)
      ),
    ]);

    const rawLrcDur = lrc.rawLrcDurationSec || lrc.lrcDurationSec || 0;
    const hasSyncedLyrics =
      lrc.synced.length >= 6 &&
      Boolean(lrc.hasTrueLrcTimestamps) &&
      (rawLrcDur < 95 || Math.abs(durSec - rawLrcDur) <= 8);

    const ok = hasSyncedLyrics;
    const result = {
      verified: ok,
      durationSec: durSec,
      matchedTitle: cleanTitle,
      matchedArtist: cleanArtist,
      hasLyrics: hasSyncedLyrics,
      ts: Date.now(),
    };
    verifyBatchCache.set(key, result);
    return result;
  } catch {
    return { verified: false, durationSec: 0, matchedTitle: cleanTitle, matchedArtist: cleanArtist, hasLyrics: false };
  }
}

app.post('/api/music/verify-batch', async (req, res) => {
  const inputTracks = Array.isArray(req.body?.tracks) ? req.body.tracks.slice(0, 24) : [];
  if (inputTracks.length === 0) {
    res.json({ verified: [] });
    return;
  }

  const verifiedOut: Array<{
    id: string;
    durationSec: number;
    matchedTitle: string;
    matchedArtist: string;
    hasLyrics: boolean;
  }> = [];

  for (let i = 0; i < inputTracks.length; i += 3) {
    const chunk = inputTracks.slice(i, i + 3);
    const checked = await Promise.all(
      chunk.map(async (item: any) => {
        const id = String(item?.id || '');
        const title = String(item?.title || '');
        const artist = String(item?.artist || '');
        const duration = Number(item?.duration || 0);
        if (!id || !title || !artist) return null;
        const r = await verifySingleTrackForCatalog(artist, title, duration);
        return r.verified ? { id, ...r } : null;
      })
    );
    for (const c of checked) {
      if (c) verifiedOut.push(c);
    }
  }

  res.json({ verified: verifiedOut });
});

/**
 * Dedicated AI Audio Lyric Listener Endpoint:
 * Ensures the song's actual audio stream is assembled, listens to the audio bytes with Gemini AI
 * (or locks exact duration-verified studio LRC to the actual audio track), and returns 100% audio-synced lyrics.
 */
app.get('/api/music/ai-listen-lyrics', async (req, res) => {
  const title = String(req.query.title || '').trim();
  const artist = String(req.query.artist || '').trim();
  const force = req.query.force === '1' || req.query.force === 'true';

  if (!title && !artist) {
    res.status(400).json({ error: 'Missing title or artist' });
    return;
  }

  const { cleanArtist, cleanTitle } = extractCanonicalArtistAndTitle(artist, title);

  try {
    const song = await assembleFullLengthSong(cleanArtist, cleanTitle);
    if (!song) {
      const fallbackPayload = await fetchBestLrcLyrics(cleanArtist, cleanTitle);
      res.json({
        ...fallbackPayload,
        audioDurationSec: fallbackPayload.lrcDurationSec || 215,
        audioLocked: false,
        aiAudioSynced: false,
      });
      return;
    }

    const lockedLyrics = await resolveAudioLockedLyricsForSong(
      song,
      cleanArtist,
      cleanTitle,
      force
    );

    res.json({
      ...lockedLyrics,
      audioDurationSec: song.durationSec,
      matchedAudioTitle: song.matchedTitle,
      matchedAudioArtist: song.matchedArtist,
      audioLocked: true,
      aiAudioSynced: true,
    });
  } catch {
    res.status(500).json({ error: 'AI audio lyric listener failed' });
  }
});

app.get('/api/music/resolve', async (req, res) => {
  const title = String(req.query.title || '').trim();
  const artist = String(req.query.artist || '').trim();
  const fullStreamUrl = `/api/music/full-song?title=${encodeURIComponent(
    title
  )}&artist=${encodeURIComponent(artist)}`;
  res.json({
    videoId: null,
    videoIds: [],
    previewUrl: fullStreamUrl,
    fullSongUrl: fullStreamUrl,
    artworkUrl: null,
    durationSeconds: null,
    trackName: title,
    artistName: artist,
    albumName: null,
  });
});

app.get('/api/music/proxy-audio', async (req, res) => {
  const targetUrl = String(req.query.url || '').trim();
  const downloadFilename = String(req.query.filename || '').trim();

  if (targetUrl.startsWith('/api/music/full-song')) {
    res.redirect(
      downloadFilename
        ? `${targetUrl}&filename=${encodeURIComponent(downloadFilename)}`
        : targetUrl
    );
    return;
  }

  if (!targetUrl || !targetUrl.startsWith('https://')) {
    res.status(400).json({ error: 'Invalid audio URL' });
    return;
  }

  try {
    const upstream = await fetch(targetUrl);
    if (!upstream.ok) {
      res.status(upstream.status).end();
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'audio/mp4';
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);
    if (downloadFilename) {
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    }

    const arrayBuffer = await upstream.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch {
    res.status(500).json({ error: 'Failed to proxy audio stream' });
  }
});

interface DiscoveredServerTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  genreLabel: string;
  duration: number;
  bpm: number;
  coverUrl: string;
  youtubeVideoId?: string;
  scriptureReference: string;
}

const SERVER_PERPETUAL_SEEDS: Array<{
  artist: string;
  genre: string;
  genreLabel: string;
  bpm: number;
  verse: string;
}> = [
  { artist: 'Skillet', genre: 'rock', genreLabel: 'Christian Hard Rock', bpm: 150, verse: 'Joshua 1:9' },
  { artist: 'Lecrae', genre: 'hiphop', genreLabel: 'Christian Hip-Hop', bpm: 142, verse: 'Romans 1:16' },
  { artist: 'Chris Tomlin', genre: 'worship', genreLabel: 'Modern Worship', bpm: 102, verse: 'Psalm 95:1' },
  { artist: 'Demon Hunter', genre: 'metal-hardcore', genreLabel: 'Christian Metal', bpm: 164, verse: 'Hebrews 13:5' },
  { artist: 'NEEDTOBREATHE', genre: 'country-southern', genreLabel: 'Christian Southern Rock', bpm: 126, verse: 'Proverbs 17:17' },
  { artist: 'TobyMac', genre: 'hiphop', genreLabel: 'Christian Hip-Hop / Pop', bpm: 136, verse: 'Philippians 4:13' },
  { artist: 'Casting Crowns', genre: 'worship', genreLabel: 'Modern Worship', bpm: 94, verse: 'John 11:25' },
  { artist: 'Red', genre: 'rock', genreLabel: 'Christian Alt Metal', bpm: 148, verse: 'Psalm 34:18' },
  { artist: 'Thousand Foot Krutch', genre: 'rock', genreLabel: 'Christian Rock', bpm: 156, verse: 'Ephesians 6:10' },
  { artist: 'Relient K', genre: 'punk-ska', genreLabel: 'Christian Pop-Punk', bpm: 158, verse: 'Psalm 32:7' },
  { artist: 'Andy Mineo', genre: 'hiphop', genreLabel: 'Christian Hip-Hop', bpm: 146, verse: 'Romans 8:31' },
  { artist: 'MercyMe', genre: 'worship', genreLabel: 'Praise & Worship', bpm: 96, verse: 'Revelation 21:4' },
  { artist: 'Flyleaf', genre: 'rock', genreLabel: 'Christian Alt Rock', bpm: 152, verse: 'Psalm 139:7' },
  { artist: 'August Burns Red', genre: 'metal-hardcore', genreLabel: 'Christian Metalcore', bpm: 170, verse: 'Proverbs 27:17' },
  { artist: 'Big Daddy Weave', genre: 'country-southern', genreLabel: 'Christian Country & Soul', bpm: 118, verse: 'Psalm 107:2' },
  { artist: 'Jonathan McReynolds', genre: 'rnb', genreLabel: 'Gospel R&B & Soul', bpm: 96, verse: 'Ephesians 2:8' },
  { artist: 'Limoblaze', genre: 'reggae-afro', genreLabel: 'Afro-Gospel', bpm: 114, verse: 'Romans 8:32' },
  { artist: 'Capital Kings', genre: 'workout-edm', genreLabel: 'Christian Electronic / EDM', bpm: 150, verse: '1 John 4:18' },
  { artist: 'Jeremy Camp', genre: 'worship', genreLabel: 'Modern Worship', bpm: 108, verse: '2 Corinthians 5:7' },
  { artist: 'Newsboys', genre: 'worship', genreLabel: 'Christian Praise Rock', bpm: 128, verse: 'Psalm 118:24' },
  { artist: 'Switchfoot', genre: 'rock', genreLabel: 'Christian Alt Rock', bpm: 144, verse: 'John 10:10' },
  { artist: 'Forrest Frank', genre: 'hiphop', genreLabel: 'Christian Pop / CHH', bpm: 132, verse: 'Psalm 118:24' },
  { artist: 'NF', genre: 'hiphop', genreLabel: 'Christian Hip-Hop', bpm: 136, verse: 'Psalm 23:4' },
  { artist: 'P.O.D.', genre: 'rock', genreLabel: 'Christian Nu-Metal / Rock', bpm: 150, verse: 'Joshua 1:9' },
  { artist: 'Underoath', genre: 'metal-hardcore', genreLabel: 'Christian Post-Hardcore', bpm: 166, verse: '2 Corinthians 5:17' },
  { artist: 'The Devil Wears Prada', genre: 'metal-hardcore', genreLabel: 'Christian Metalcore', bpm: 172, verse: 'Isaiah 41:10' },
  { artist: 'Building 429', genre: 'country-southern', genreLabel: 'Christian Country Rock', bpm: 124, verse: 'Hebrews 11:16' },
  { artist: 'Tenth Avenue North', genre: 'country-southern', genreLabel: 'Christian Southern / AC', bpm: 116, verse: 'Romans 8:38' },
  { artist: 'MxPx', genre: 'punk-ska', genreLabel: 'Christian Skate Punk', bpm: 168, verse: 'Galatians 6:5' },
  { artist: 'Anberlin', genre: 'punk-ska', genreLabel: 'Christian Alt Rock', bpm: 156, verse: '1 Corinthians 13:13' },
  { artist: 'Hillsong UNITED', genre: 'worship', genreLabel: 'Modern Worship', bpm: 92, verse: 'Matthew 14:29' },
  { artist: 'Phil Wickham', genre: 'worship', genreLabel: 'Modern Worship', bpm: 120, verse: 'Ephesians 2:8' },
  { artist: 'Kari Jobe', genre: 'worship', genreLabel: 'Soaking Worship', bpm: 84, verse: 'Revelation 4:8' },
  { artist: 'Matthew West', genre: 'ai-originals', genreLabel: 'Contemporary Christian', bpm: 118, verse: 'Colossians 3:13' },
  { artist: 'Colton Dixon', genre: 'ai-originals', genreLabel: 'Contemporary Christian', bpm: 120, verse: 'Isaiah 43:2' },
  { artist: 'Disciple', genre: 'rock', genreLabel: 'Christian Heavy Rock', bpm: 158, verse: 'Romans 8:37' },
  { artist: 'Christafari', genre: 'reggae-afro', genreLabel: 'Christian Roots Reggae', bpm: 114, verse: 'Mark 11:9' },
  { artist: 'Matthew Parker', genre: 'workout-edm', genreLabel: 'Christian Electronic / EDM', bpm: 146, verse: 'Psalm 16:11' },
  { artist: 'Israel Houghton', genre: 'rnb', genreLabel: 'Gospel Praise & Soul', bpm: 124, verse: 'Psalm 107:1' },
  { artist: 'KB', genre: 'hiphop', genreLabel: 'Christian Trap / CHH', bpm: 148, verse: '1 Corinthians 15:57' },
  { artist: 'Trip Lee', genre: 'hiphop', genreLabel: 'Christian Hip-Hop', bpm: 144, verse: 'Romans 1:16' },
  { artist: 'Anne Wilson', genre: 'country-southern', genreLabel: 'Christian Country', bpm: 116, verse: 'Matthew 11:28' },
  { artist: 'Zach Williams', genre: 'country-southern', genreLabel: 'Christian Southern Rock', bpm: 118, verse: 'John 8:36' },
  { artist: 'Tauren Wells', genre: 'ai-originals', genreLabel: 'Contemporary Christian', bpm: 122, verse: 'Jeremiah 1:5' },
  { artist: 'Crowder', genre: 'country-southern', genreLabel: 'Christian Folk / Country', bpm: 120, verse: 'Psalm 100:2' },
  { artist: 'Elevation Worship', genre: 'worship', genreLabel: 'Praise & Worship', bpm: 128, verse: 'Psalm 95:1' },
  { artist: 'Brandon Lake', genre: 'worship', genreLabel: 'Modern Worship', bpm: 112, verse: 'Psalm 103:1' },
  { artist: 'Hawk Nelson', genre: 'punk-ska', genreLabel: 'Christian Pop-Punk', bpm: 160, verse: 'Romans 8:38' },
];

const discoveredCatalogPool: DiscoveredServerTrack[] = [];
const discoveredCatalogKeys = new Set<string>();
let serverHarvestCursor = 0;
let serverHarvestInFlight: Promise<void> | null = null;

async function harvestServerDiscoveryBatch(): Promise<void> {
  if (serverHarvestInFlight) return serverHarvestInFlight;
  serverHarvestInFlight = (async () => {
    try {
      const seedIdx = serverHarvestCursor++;
      const seed = SERVER_PERPETUAL_SEEDS[seedIdx % SERVER_PERPETUAL_SEEDS.length];
      const round = Math.floor(seedIdx / SERVER_PERPETUAL_SEEDS.length);
      const offset = (round % 12) * 15;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      let items: any[] = [];
      try {
        const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
          seed.artist
        )}&media=music&entity=song&limit=18&offset=${offset}`;
        const itRes = await fetch(itunesUrl, {
          headers: { 'User-Agent': 'SanctuaryPulseChristianMusic/1.0' },
          signal: controller.signal,
        });
        if (itRes.ok) {
          const itJson = await itRes.json();
          if (Array.isArray(itJson?.results)) items = itJson.results;
        }
      } finally {
        clearTimeout(timer);
      }

      // Also check YouTube rich catalog for newer / unreleased YouTube-only drops
      if (items.length < 4) {
        const ytItems = await searchYouTubeRichCatalog(
          `${seed.artist} ${round > 0 ? 'official audio' : ''}`.trim()
        );
        for (const y of ytItems) {
          items.push({
            trackId: `yt-${y.videoId}`,
            trackName: y.title,
            artistName: y.artist,
            collectionName: 'Official Release',
            trackTimeMillis: (y.durationSeconds || 215) * 1000,
            artworkUrl100: y.thumbnailUrl,
            youtubeVideoId: y.videoId,
          });
        }
      }

      const normSeedArtist = normalizeMatchTokens(seed.artist);
      const filteredCandidates: Array<{
        id: string;
        title: string;
        artist: string;
        album: string;
        duration: number;
        coverUrl: string;
        youtubeVideoId?: string;
      }> = [];

      for (const item of items) {
        const rawTitle = String(item.trackName || '').trim();
        const rawArtist = String(item.artistName || '').trim();
        if (!rawTitle || !rawArtist) continue;
        if (item.trackExplicitness === 'explicit' || item.collectionExplicitness === 'explicit') continue;
        if (isProfaneOrSecular(`${rawTitle} ${rawArtist}`)) continue;
        if (isInstrumentalOrRemakeText(`${rawTitle} ${item.collectionName || ''} ${rawArtist}`, 'meta')) continue;

        const { cleanArtist, cleanTitle } = extractCanonicalArtistAndTitle(rawArtist, rawTitle);
        if (!cleanTitle || cleanTitle.length < 2) continue;

        // Require candidate artist to match the targeted verified Christian artist
        const normItemArtist = ` ${normalizeMatchTokens(cleanArtist)} `;
        if (!normItemArtist.includes(` ${normSeedArtist} `) && !` ${normSeedArtist} `.includes(normItemArtist)) {
          continue;
        }

        const cKey = `${cleanArtist.toLowerCase()}__${normalizeSearchToken(cleanTitle)}`;
        if (discoveredCatalogKeys.has(cKey)) continue;

        const durSec = Math.round((item.trackTimeMillis || 0) / 1000);
        if (durSec > 0 && (durSec < 100 || durSec > 480)) continue;

        const cover = item.artworkUrl100
          ? String(item.artworkUrl100).replace('100x100bb', '600x600bb')
          : '';
        filteredCandidates.push({
          id: `srv-chr-${item.trackId}`,
          title: cleanTitle,
          artist: seed.artist,
          album: String(item.collectionName || 'Official Christian Release'),
          duration: durSec || 215,
          coverUrl: cover,
          youtubeVideoId: item.youtubeVideoId,
        });
      }

      // Verify up to 10 candidates strictly against SoundCloud official vocal + duration-locked LRC
      let addedThisRound = 0;
      for (const cand of filteredCandidates.slice(0, 10)) {
        if (addedThisRound >= 4) break;
        const ver = await verifySingleTrackForCatalog(cand.artist, cand.title, cand.duration);
        if (!ver.verified) continue;
        const cKey = `${cand.artist.toLowerCase()}__${normalizeSearchToken(ver.matchedTitle)}`;
        if (discoveredCatalogKeys.has(cKey)) continue;
        discoveredCatalogKeys.add(cKey);
        discoveredCatalogPool.push({
          id: cand.id,
          title: ver.matchedTitle,
          artist: cand.artist,
          album: cand.album,
          genre: seed.genre,
          genreLabel: seed.genreLabel,
          duration: ver.durationSec >= 95 ? ver.durationSec : cand.duration,
          bpm: seed.bpm,
          coverUrl: cand.coverUrl,
          youtubeVideoId: cand.youtubeVideoId,
          scriptureReference: seed.verse,
        });
        addedThisRound++;
      }
    } catch {
      // ignore transient error
    } finally {
      serverHarvestInFlight = null;
    }
  })();
  return serverHarvestInFlight;
}

// Perpetual Verified Christian Release Feed (never stalls, strictly SoundCloud vocal + synced-LRC verified)
async function handleDiscoverNext(req: any, res: any) {
  const rawLimit = req.method === 'POST' ? req.body?.limit : req.query.limit;
  const limit = Math.min(12, Math.max(1, Number(rawLimit || 4)));

  const excludeSet = new Set<string>();
  const addExcludeVariants = (raw: string) => {
    const clean = raw.trim().toLowerCase();
    if (!clean) return;
    excludeSet.add(clean);
    const parts = clean.split('::');
    if (parts.length === 2) {
      const aNorm = normalizeMatchTokens(parts[0]);
      const aTok = normalizeSearchToken(parts[0]);
      const bNorm = normalizeMatchTokens(parts[1]);
      const bTok = normalizeSearchToken(parts[1]);
      excludeSet.add(`${aNorm}::${bNorm}`);
      excludeSet.add(`${aTok}::${bNorm}`);
      excludeSet.add(`${aNorm}::${bTok}`);
      excludeSet.add(`${aTok}::${bTok}`);
    }
  };

  if (req.method === 'POST' && Array.isArray(req.body?.exclude)) {
    for (const item of req.body.exclude) {
      if (typeof item === 'string') addExcludeVariants(item);
    }
  } else if (typeof req.query.exclude === 'string' && req.query.exclude.trim()) {
    for (const item of req.query.exclude.split(',')) {
      addExcludeVariants(item);
    }
  }

  const isExcluded = (t: DiscoveredServerTrack) => {
    const artistRaw = t.artist.toLowerCase().trim();
    const artistTok = normalizeMatchTokens(t.artist);
    const titleTok = normalizeSearchToken(t.title);
    const titleTok2 = normalizeMatchTokens(t.title);
    return (
      excludeSet.has(`${artistRaw}::${titleTok}`) ||
      excludeSet.has(`${artistTok}::${titleTok}`) ||
      excludeSet.has(`${titleTok}::${artistTok}`) ||
      excludeSet.has(`${titleTok2}::${artistTok}`) ||
      excludeSet.has(`${artistTok}::${titleTok2}`)
    );
  };

  const unseen = () => discoveredCatalogPool.filter((t) => !isExcluded(t));

  // If pool has fewer unseen tracks than requested, run up to 3 fast harvest cycles right now
  for (let attempts = 0; attempts < 3 && unseen().length < limit; attempts++) {
    await harvestServerDiscoveryBatch();
  }

  const batch = unseen().slice(0, limit);
  // Proactively warm next harvest cycle in background so subsequent requests are instantaneous
  if (unseen().length < limit + 6) {
    void harvestServerDiscoveryBatch().catch(() => {});
  }

  res.json({
    tracks: batch,
    totalServerPool: discoveredCatalogPool.length,
    cursor: serverHarvestCursor,
  });
}

app.get('/api/music/discover-next', handleDiscoverNext);
app.post('/api/music/discover-next', handleDiscoverNext);

async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sanctuary Pulse server running on http://0.0.0.0:${PORT}`);

    // Pre-warm flagship verified studio tracks across core genres gently on startup for instant first-click playback
    const initialPrewarm = [
      { artist: 'Skillet', title: 'Monster' },
      { artist: 'Cory Asbury', title: 'Reckless Love' },
      { artist: 'NEEDTOBREATHE', title: 'Brother' },
      { artist: 'Andy Mineo', title: "You Can't Stop Me" },
      { artist: 'Relient K', title: 'Be My Escape' },
    ];
    void (async () => {
      for (const item of initialPrewarm) {
        try {
          await assembleFullLengthSong(item.artist, item.title);
          await new Promise((r) => setTimeout(r, 850));
        } catch {
          // ignore
        }
      }
      // Warm perpetual verified discovery pool gently so new songs are ready for installed/downloaded apps immediately
      for (let i = 0; i < 6; i++) {
        try {
          await harvestServerDiscoveryBatch();
          await new Promise((r) => setTimeout(r, 1200));
        } catch {
          // ignore
        }
      }
    })();
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
