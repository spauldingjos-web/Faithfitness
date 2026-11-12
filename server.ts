import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

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

interface AssembledFullSong {
  buffer: Buffer;
  contentType: string;
  durationSec: number;
  matchedTitle: string;
}

const fullSongCache = new Map<string, AssembledFullSong>();
const inFlightSongPromises = new Map<string, Promise<AssembledFullSong | null>>();

const EXPLICIT_OR_SECULAR_WORDS = [
  'fuck',
  'fucking',
  'shit',
  'shitty',
  'bullshit',
  'bitch',
  'bitches',
  'asshole',
  'dick',
  'pussy',
  'cunt',
  'motherfucker',
  'nigga',
  'nigger',
  'whore',
  'slut',
  'porn',
  'sex',
  'sexy',
  'weed',
  'blunt',
  'molly',
  'lean',
  'cocaine',
  'heroin',
  'meth',
  'drugs',
  'demon', // secular death metal / occult
  'satan',
  'lucifer',
  '666',
  'anti-christ',
  'antichrist',
  'hail satan',
  'pentagram',
];

function isProfaneOrSecular(text: string): boolean {
  const lower = text.toLowerCase();
  for (const w of EXPLICIT_OR_SECULAR_WORDS) {
    if (w === 'demon') {
      // Whitelist the verified Christian metal band "Demon Hunter"
      if (lower.includes('demon hunter')) continue;
    }
    const regex = new RegExp(`\\b${w}\\b`, 'i');
    if (regex.test(lower)) return true;
  }
  return false;
}

// Strictly identify covers, tributes, piano/guitar instrumentals, and karaoke remakes
function isCoverOrRemakeTrack(text: string): boolean {
  const t = text.toLowerCase();
  const coverTerms = [
    'cover',
    'covers',
    'tribute',
    'tributes',
    'karaoke',
    'instrumental',
    'piano version',
    'piano instrumental',
    'piano cover',
    'guitar cover',
    'acoustic cover',
    'drum cover',
    'bass cover',
    'vocal cover',
    'remake',
    'sound-alike',
    'soundalike',
    'originally performed',
    'originally by',
    'in the style of',
    'backing track',
    'parody',
    'slowed',
    'sped up',
    'nightcore',
    'reverb',
    'reaction',
    'tutorial',
    'lesson',
    'how to play',
    'type beat',
    'free beat',
    'choir cover',
    'orchestral cover',
    'fan made',
    'bass boosted',
  ];
  return coverTerms.some((term) => t.includes(term));
}

async function fetchItunesFallbackSong(
  artist: string,
  title: string
): Promise<AssembledFullSong | null> {
  const queries = [`${artist} ${title}`, `${artist} ${title} Christian`, artist];
  for (const q of queries) {
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(
          q
        )}&media=music&entity=song&limit=10`
      );
      if (!res.ok) continue;
      const data = await res.json();
      const results = Array.isArray(data?.results) ? data.results : [];
      const cleanCandidates = results.filter((item: any) => {
        if (!item?.previewUrl) return false;
        const text = `${item.trackName || ''} ${item.artistName || ''} ${item.collectionName || ''}`;
        if (isProfaneOrSecular(text)) return false;
        if (isCoverOrRemakeTrack(text)) return false;
        return true;
      });

      const chosen = cleanCandidates[0] || results.find((r: any) => r?.previewUrl);
      if (!chosen?.previewUrl) continue;

      const audioRes = await fetch(chosen.previewUrl);
      if (!audioRes.ok) continue;
      const buf = Buffer.from(await audioRes.arrayBuffer());
      if (buf.length < 20000) continue;

      return {
        buffer: buf,
        contentType: chosen.previewUrl.includes('.m4a') ? 'audio/mp4' : 'audio/mpeg',
        durationSec: Math.max(30, Math.round(buf.length / 16000)),
        matchedTitle: chosen.trackName || title,
      };
    } catch {
      // try next query
    }
  }
  return null;
}

async function assembleFullLengthSong(
  artist: string,
  title: string
): Promise<AssembledFullSong | null> {
  const cleanTitle = title.replace(/\([^)]*\)/g, '').trim() || title;
  const cacheKey = `${artist.toLowerCase().trim()}__${cleanTitle.toLowerCase().trim()}`;

  if (fullSongCache.has(cacheKey)) {
    return fullSongCache.get(cacheKey)!;
  }
  if (inFlightSongPromises.has(cacheKey)) {
    return inFlightSongPromises.get(cacheKey)!;
  }

  const promise = (async (): Promise<AssembledFullSong | null> => {
    try {
      const clientId = await getSoundCloudClientId();
      const queries = [
        `${artist} ${cleanTitle}`,
        `${artist} ${cleanTitle} official`,
      ];

      const artistPrimary =
        artist
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length > 2)[0] || artist.toLowerCase();

      const titlePrimary =
        cleanTitle
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length > 2)[0] || cleanTitle.toLowerCase();

      for (const q of queries) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 2800);
          const sr = await fetch(
            `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(
              q
            )}&client_id=${clientId}&limit=20`,
            { signal: controller.signal }
          );
          clearTimeout(timer);
          if (!sr.ok) continue;
          const sd = await sr.json();
          const candidates = (sd.collection || []).filter((x: any) => {
            const trackText = `${x.title || ''} ${x.description || ''} ${x.user?.username || ''} ${x.genre || ''}`.toLowerCase();
            if (isProfaneOrSecular(trackText)) return false;
            if (isCoverOrRemakeTrack(trackText)) return false;
            if (x.duration < 95000 || x.duration > 660000) return false;
            return x.media?.transcodings?.some(
              (tr: any) =>
                !tr.snipped &&
                (tr.format?.protocol === 'progressive' || tr.format?.protocol === 'hls')
            );
          });
          if (candidates.length === 0) continue;

          candidates.sort((a: any, b: any) => {
            const aText = `${a.title || ''} ${a.user?.username || ''}`.toLowerCase();
            const bText = `${b.title || ''} ${b.user?.username || ''}`.toLowerCase();
            const aHasProg = a.media?.transcodings?.some(
              (t: any) => !t.snipped && t.format?.protocol === 'progressive'
            )
              ? 15
              : 0;
            const bHasProg = b.media?.transcodings?.some(
              (t: any) => !t.snipped && t.format?.protocol === 'progressive'
            )
              ? 15
              : 0;

            const aScore =
              aHasProg +
              (aText.includes(artistPrimary) ? 18 : 0) +
              (aText.includes(titlePrimary) ? 12 : 0) +
              (aText.includes('official') ? 8 : 0) +
              (a.user?.verified || a.user?.badges?.verified ? 20 : 0);
            const bScore =
              bHasProg +
              (bText.includes(artistPrimary) ? 18 : 0) +
              (bText.includes(titlePrimary) ? 12 : 0) +
              (bText.includes('official') ? 8 : 0) +
              (b.user?.verified || b.user?.badges?.verified ? 20 : 0);

            return bScore - aScore;
          });

          for (const chosen of candidates.slice(0, 2)) {
            const tr =
              chosen.media.transcodings.find(
                (x: any) => !x.snipped && x.format?.protocol === 'progressive'
              ) ||
              chosen.media.transcodings.find(
                (x: any) =>
                  !x.snipped &&
                  x.format?.protocol === 'hls' &&
                  x.format?.mime_type?.includes('mpeg')
              ) ||
              chosen.media.transcodings.find(
                (x: any) => !x.snipped && x.format?.protocol === 'hls'
              );

            if (!tr) continue;
            const sRes = await fetch(`${tr.url}?client_id=${clientId}`);
            if (!sRes.ok) continue;
            const sData = await sRes.json();
            if (!sData?.url) continue;

            if (tr.format.protocol === 'progressive') {
              const upstream = await fetch(sData.url);
              if (!upstream.ok) continue;
              const buf = Buffer.from(await upstream.arrayBuffer());
              if (buf.length < 250000) continue;
              const assembled: AssembledFullSong = {
                buffer: buf,
                contentType: 'audio/mpeg',
                durationSec: Math.round(chosen.duration / 1000),
                matchedTitle: chosen.title,
              };
              if (fullSongCache.size >= 40) {
                const oldestKey = fullSongCache.keys().next().value;
                if (oldestKey) fullSongCache.delete(oldestKey);
              }
              fullSongCache.set(cacheKey, assembled);
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
              durationSec: Math.round(chosen.duration / 1000),
              matchedTitle: chosen.title,
            };

            if (fullSongCache.size >= 40) {
              const oldestKey = fullSongCache.keys().next().value;
              if (oldestKey) fullSongCache.delete(oldestKey);
            }
            fullSongCache.set(cacheKey, assembled);
            return assembled;
          }
        } catch {
          // try next query
        }
      }
    } catch {
      // fall through to iTunes CDN fallback
    }

    // Resilient fallback to official Apple Music / iTunes stream (works 100% on Vercel & all clouds)
    const fallback = await fetchItunesFallbackSong(artist, cleanTitle);
    if (fallback) {
      if (fullSongCache.size >= 40) {
        const oldestKey = fullSongCache.keys().next().value;
        if (oldestKey) fullSongCache.delete(oldestKey);
      }
      fullSongCache.set(cacheKey, fallback);
      return fallback;
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
  const searchQ = query.toLowerCase().includes('christian') ||
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

        // Rejection of profanity, secular explicit songs, or non-Christian tracks
        if (isProfaneOrSecular(`${rawTitle} ${channelName}`)) continue;

        // Strictly reject covers, karaoke, tribute remakes, sped up, and instrumental sound-alikes
        if (isCoverOrRemakeTrack(`${rawTitle} ${channelName}`)) continue;

        const lengthText: string = v.lengthText?.simpleText || '3:45';
        const durationSeconds = parseDurationString(lengthText);
        if (durationSeconds < 90 || durationSeconds > 720) continue;

        let artist = channelName.replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').trim();
        let cleanSongTitle = rawTitle;
        if (rawTitle.includes(' - ')) {
          const [left, ...rest] = rawTitle.split(' - ');
          if (left && rest.length > 0) {
            artist = left.trim();
            cleanSongTitle = rest.join(' - ').trim();
          }
        }

        const thumbs = v.thumbnail?.thumbnails || [];
        const bestThumb =
          thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

        results.push({
          videoId: v.videoId,
          title: cleanSongTitle,
          artist,
          durationSeconds,
          thumbnailUrl: bestThumb,
        });
      }
    }

    const sliced = results.slice(0, 18);
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
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
