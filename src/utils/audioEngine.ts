import { Track } from '../data/musicCatalog';
import {
  getCachedBlobUrlSync,
  getTrackAudioBlob,
  preloadOfflineBlobUrls,
  resolveDirectItunesAudioUrl,
} from './offlineVault';

export type AudioQuality = 'low' | 'normal' | 'high' | 'lossless';

export interface EQBand {
  frequency: number;
  label: string;
  gain: number; // -12 to +12 dB
}

export const EQ_PRESETS: Record<string, number[]> = {
  'Lossless Flat': [0, 0, 0, 0, 0],
  'Workout Bass Boost': [6, 4.5, 0, 2, 3.5],
  'Bike Wind-Cut': [3, 2, 4, 5, 3],
  'Christian Rock Crunch': [4, 2.5, -1, 3.5, 4],
  'Vocal Worship & R&B': [1.5, 1, 3.5, 4, 2.5],
};

export type SongSection =
  | 'Intro'
  | 'Verse 1'
  | 'Chorus 1'
  | 'Verse 2'
  | 'Bridge / Breakdown'
  | 'Final Chorus'
  | 'Outro';

export function getSongSectionAtTime(currentTime: number, duration: number): SongSection {
  const ratio = duration > 0 ? currentTime / duration : 0;
  if (ratio < 0.1) return 'Intro';
  if (ratio < 0.28) return 'Verse 1';
  if (ratio < 0.48) return 'Chorus 1';
  if (ratio < 0.65) return 'Verse 2';
  if (ratio < 0.78) return 'Bridge / Breakdown';
  if (ratio < 0.93) return 'Final Chorus';
  return 'Outro';
}

export function getFullSongStreamUrl(track: Track): string {
  return `/api/music/full-song?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(
    track.artist
  )}&id=${encodeURIComponent(track.id)}`;
}

class SanctuaryAudioEngine {
  private ctx: AudioContext | null = null;
  private eqGains: number[] = [0, 0, 0, 0, 0];

  private audioEl: HTMLAudioElement | null = null;
  private progressTimer: number | null = null;
  private stallWatchdogTimer: number | null = null;
  private playRequestId = 0;

  private currentTrack: Track | null = null;
  private isPlaying = false;
  private currentTime = 0;
  private activeDuration = 220;
  private volume = 0.85;
  private resolvedDirectUrls = new Map<string, string>();
  private triedDirectFallbackForRequest = new Set<number>();
  private prewarmedTrackKeys = new Set<string>();
  private stallRecoveryTimer: number | null = null;
  private mediaSessionCallbacksRegistered = false;

  private onTickCallback: (
    currentTime: number,
    duration: number,
    spectrum: number[],
    section: SongSection
  ) => void = () => {};
  private onEndedCallback: (() => void) | null = null;
  private onPrevCallback: (() => void) | null = null;
  private onNextCallback: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      preloadOfflineBlobUrls().catch(() => {});
    }
  }

  private ensureAudioContextUnlocked() {
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  private updateMediaSession(track: Track | null, playing: boolean) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      const ms = navigator.mediaSession;
      if (track && typeof MediaMetadata !== 'undefined') {
        ms.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist,
          album: track.album || 'Sanctuary Pulse Christian Music',
          artwork: track.coverUrl
            ? [{ src: track.coverUrl, sizes: '512x512', type: 'image/jpeg' }]
            : [],
        });
      }
      ms.playbackState = playing ? 'playing' : 'paused';

      if (!this.mediaSessionCallbacksRegistered) {
        this.mediaSessionCallbacksRegistered = true;
        ms.setActionHandler('play', () => {
          if (this.currentTrack) this.resume(this.currentTrack);
        });
        ms.setActionHandler('pause', () => {
          this.pause();
        });
        ms.setActionHandler('previoustrack', () => {
          this.onPrevCallback?.();
        });
        ms.setActionHandler('nexttrack', () => {
          this.onNextCallback?.();
        });
        ms.setActionHandler('seekto', (details) => {
          if (typeof details.seekTime === 'number') {
            this.seek(details.seekTime);
          }
        });
      }
    } catch {
      // ignore unsupported MediaSession properties
    }
  }

  private clearStallRecovery() {
    if (this.stallRecoveryTimer !== null) {
      window.clearTimeout(this.stallRecoveryTimer);
      this.stallRecoveryTimer = null;
    }
  }

  private scheduleStallRecovery() {
    this.clearStallRecovery();
    const capturedReqId = this.playRequestId;
    this.stallRecoveryTimer = window.setTimeout(() => {
      if (capturedReqId !== this.playRequestId || !this.isPlaying || !this.audioEl) return;
      if (this.audioEl.paused || this.audioEl.readyState < 3) {
        this.audioEl.play().catch(() => {});
      }
    }, 2500);
  }

  private getOrCreateAudioElement(): HTMLAudioElement {
    if (!this.audioEl) {
      const el = new Audio();
      el.preload = 'auto';
      el.volume = this.volume;
      el.muted = false;
      (el as unknown as { playsInline: boolean }).playsInline = true;
      el.setAttribute('playsinline', 'true');
      el.setAttribute('webkit-playsinline', 'true');

      el.addEventListener('loadedmetadata', () => {
        if (Number.isFinite(el.duration) && el.duration >= 95) {
          this.activeDuration = Math.round(el.duration);
          if (this.currentTrack) {
            this.currentTrack.duration = this.activeDuration;
          }
          this.emitTick();
        }
      });

      el.addEventListener('canplay', () => {
        this.clearWatchdog();
        this.clearStallRecovery();
        if (this.isPlaying && el.paused) {
          el.play().catch(() => {});
        }
      });

      el.addEventListener('playing', () => {
        this.clearWatchdog();
        this.clearStallRecovery();
        if (this.currentTrack) {
          this.updateMediaSession(this.currentTrack, true);
        }
      });

      el.addEventListener('waiting', () => {
        if (!this.isPlaying || !this.currentTrack) return;
        this.scheduleStallRecovery();
      });

      el.addEventListener('stalled', () => {
        if (!this.isPlaying || !this.currentTrack) return;
        this.scheduleStallRecovery();
      });

      el.addEventListener('timeupdate', () => {
        if (!this.isPlaying || !this.currentTrack) return;
        this.clearStallRecovery();
        this.currentTime = el.currentTime;
        if (Number.isFinite(el.duration) && el.duration >= 95) {
          this.activeDuration = Math.round(el.duration);
        }
        this.emitTick();
      });

      el.addEventListener('pause', () => {
        if (!this.isPlaying || el.ended || !this.currentTrack) return;
        const capturedReq = this.playRequestId;
        window.setTimeout(() => {
          if (capturedReq === this.playRequestId && this.isPlaying && el.paused && !el.ended) {
            el.play().catch(() => {});
          }
        }, 180);
      });

      el.addEventListener('error', () => {
        if (!this.isPlaying || !this.currentTrack) return;
        this.handleStreamFallback(this.currentTrack, this.playRequestId, this.currentTime);
      });

      el.addEventListener('ended', () => {
        if (!this.isPlaying) return;
        const realEndThreshold = Math.max(
          45,
          (Number.isFinite(el.duration) && el.duration >= 95 ? el.duration : this.activeDuration) - 10
        );
        if (
          el.src.includes('/api/music/full-song') &&
          this.currentTime > 3 &&
          this.currentTime < realEndThreshold &&
          !this.triedDirectFallbackForRequest.has(this.playRequestId)
        ) {
          this.handleStreamFallback(this.currentTrack!, this.playRequestId, this.currentTime);
          return;
        }
        this.finishFullTrackPlayback();
      });

      this.audioEl = el;
    }
    return this.audioEl;
  }

  private finishFullTrackPlayback() {
    this.isPlaying = false;
    this.currentTime = 0;
    this.stopProgressTimer();
    this.clearWatchdog();
    this.clearStallRecovery();
    if (this.audioEl) {
      try {
        this.audioEl.pause();
      } catch {
        // ignore
      }
    }
    this.updateMediaSession(this.currentTrack, false);
    if (this.onEndedCallback) {
      this.onEndedCallback();
    }
  }

  public hasActiveAudio(): boolean {
    return (
      this.currentTrack !== null &&
      this.audioEl !== null &&
      Boolean(this.audioEl.src)
    );
  }

  public setCallbacks(
    onTick: (
      currentTime: number,
      duration: number,
      spectrum: number[],
      section: SongSection
    ) => void,
    onEnded: () => void,
    onPrev?: () => void,
    onNext?: () => void
  ) {
    this.onTickCallback = onTick;
    this.onEndedCallback = onEnded;
    if (onPrev) this.onPrevCallback = onPrev;
    if (onNext) this.onNextCallback = onNext;
  }

  public setEQGains(gains: number[]) {
    this.eqGains = [...gains];
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.audioEl) {
      this.audioEl.volume = this.volume;
    }
  }

  private clearWatchdog() {
    if (this.stallWatchdogTimer !== null) {
      window.clearTimeout(this.stallWatchdogTimer);
      this.stallWatchdogTimer = null;
    }
  }

  public stopCurrentPlayback() {
    this.stopProgressTimer();
    this.clearWatchdog();
    this.clearStallRecovery();
    if (this.audioEl) {
      try {
        this.audioEl.pause();
      } catch {
        // ignore reset errors
      }
    }
  }

  public async resolveFullSongCandidates(track: Track): Promise<string[]> {
    return track.youtubeCandidates || (track.youtubeVideoId ? [track.youtubeVideoId] : []);
  }

  public async resolveRealTrackAudioUrl(track: Track): Promise<string> {
    return getFullSongStreamUrl(track);
  }

  public prefetchTracks(tracks: Track[]) {
    if (typeof window === 'undefined' || !tracks || tracks.length === 0) return;
    const toWarm = tracks
      .filter((t) => {
        const key = `${t.artist.toLowerCase().trim()}__${t.title.toLowerCase().trim()}`;
        if (this.prewarmedTrackKeys.has(key)) return false;
        this.prewarmedTrackKeys.add(key);
        return true;
      })
      .slice(0, 4)
      .map((t) => ({ title: t.title, artist: t.artist }));

    if (toWarm.length === 0) return;
    fetch('/api/music/prewarm-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracks: toWarm }),
    }).catch(() => {});
  }

  private async handleStreamFallback(track: Track, requestId: number, startOffset = 0) {
    if (requestId !== this.playRequestId || !this.isPlaying) return;

    if (!this.triedDirectFallbackForRequest.has(requestId)) {
      this.triedDirectFallbackForRequest.add(requestId);

      // 1. Check async IndexedDB full song blob first
      try {
        const blob = await getTrackAudioBlob(track.id);
        if (requestId !== this.playRequestId || !this.isPlaying) return;
        if (blob && blob.size > 1000) {
          const blobUrl = URL.createObjectURL(blob);
          const audio = this.getOrCreateAudioElement();
          audio.src = blobUrl;
          audio.volume = this.volume;
          audio.load();
          if (startOffset > 0) {
            try {
              audio.currentTime = startOffset;
            } catch {
              // ignore
            }
          }
          await audio.play();
          this.startProgressLoop();
          return;
        }
      } catch {
        // continue
      }

      // 2. Retry full-length server stream without downgrading to a 29s preview clip
      try {
        if (requestId !== this.playRequestId || !this.isPlaying) return;
        const retryUrl = `${getFullSongStreamUrl(track)}&retry=1`;
        const audio = this.getOrCreateAudioElement();
        audio.src = retryUrl;
        audio.volume = this.volume;
        audio.load();
        if (startOffset > 2) {
          audio.addEventListener(
            'canplay',
            () => {
              if (requestId === this.playRequestId && audio.duration > startOffset + 2) {
                try {
                  audio.currentTime = startOffset;
                } catch {
                  // ignore
                }
              }
            },
            { once: true }
          );
        }
        await audio.play();
        this.startProgressLoop();
        return;
      } catch {
        // continue
      }

      // 3. Final fallback: ONLY use direct preview URL if /api/music/full-song actually returned 404/500
      try {
        const probe = await fetch(getFullSongStreamUrl(track), { method: 'HEAD' });
        if (probe.ok) {
          const audio = this.getOrCreateAudioElement();
          audio.src = `${getFullSongStreamUrl(track)}&retry=2`;
          audio.volume = this.volume;
          audio.load();
          await audio.play().catch(() => {});
          this.startProgressLoop();
          return;
        }

        const directUrl =
          track.directStreamUrl ||
          this.resolvedDirectUrls.get(track.id) ||
          (await resolveDirectItunesAudioUrl(track));
        if (requestId !== this.playRequestId || !this.isPlaying) return;
        if (directUrl) {
          this.resolvedDirectUrls.set(track.id, directUrl);
          const proxiedUrl = `/api/music/proxy-audio?url=${encodeURIComponent(directUrl)}`;
          const audio = this.getOrCreateAudioElement();
          audio.src = proxiedUrl;
          audio.volume = this.volume;
          audio.load();
          await audio.play();
          this.startProgressLoop();
          return;
        }
      } catch {
        // ignore
      }

      if (requestId === this.playRequestId && this.isPlaying) {
        this.finishFullTrackPlayback();
      }
    }
  }

  public loadAndPlay(track: Track, startOffset = 0) {
    const requestId = ++this.playRequestId;

    // 1. Unlock Web Audio & stop previous playback synchronously inside the user gesture!
    this.ensureAudioContextUnlocked();
    this.stopCurrentPlayback();

    this.currentTrack = track;
    this.currentTime = startOffset;
    this.activeDuration = Math.max(180, track.duration || 220);
    this.isPlaying = true;
    this.updateMediaSession(track, true);
    this.emitTick();
    this.startProgressLoop();

    // 2. ALWAYS prioritize 100% Full-Length song stream (/api/music/full-song) or cached offline full song blob!
    const syncBlobUrl = getCachedBlobUrlSync(track.id);
    const audioSrc = syncBlobUrl || getFullSongStreamUrl(track);

    const audio = this.getOrCreateAudioElement();
    audio.src = audioSrc;
    audio.volume = this.volume;
    audio.muted = false;
    audio.load();

    // Allow 18 seconds for cold full-length 3-8 minute master song assembly before retrying
    this.stallWatchdogTimer = window.setTimeout(() => {
      if (requestId !== this.playRequestId || !this.isPlaying) return;
      if (!audio.currentTime && (audio.paused || audio.readyState < 2)) {
        this.handleStreamFallback(track, requestId, startOffset);
      }
    }, 18000);

    // 3. Call audio.play() synchronously within the user's click/tap event!
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          if (requestId !== this.playRequestId || !this.isPlaying) {
            audio.pause();
            return;
          }
          if (
            startOffset > 0 &&
            Number.isFinite(audio.duration) &&
            audio.duration > startOffset + 2
          ) {
            try {
              audio.currentTime = startOffset;
            } catch {
              // ignore
            }
          }
          this.startProgressLoop();
        })
        .catch((err) => {
          if (requestId !== this.playRequestId || !this.isPlaying) return;
          if (err?.name === 'AbortError') return;
          this.handleStreamFallback(track, requestId, startOffset);
        });
    }
  }

  public pause() {
    this.playRequestId++;
    this.isPlaying = false;
    this.clearWatchdog();
    this.clearStallRecovery();
    if (this.audioEl) {
      try {
        this.audioEl.pause();
      } catch {
        // ignore
      }
    }
    this.updateMediaSession(this.currentTrack, false);
    this.stopProgressTimer();
    this.emitTick();
  }

  public resume(fallbackTrack?: Track) {
    this.ensureAudioContextUnlocked();
    const targetTrack = this.currentTrack || fallbackTrack;
    if (!targetTrack) return;

    if (!this.currentTrack) {
      this.loadAndPlay(targetTrack, this.currentTime);
      return;
    }

    if (this.audioEl && this.audioEl.src && this.audioEl.readyState >= 2) {
      const requestId = ++this.playRequestId;
      this.isPlaying = true;
      this.updateMediaSession(targetTrack, true);
      this.startProgressLoop();
      this.audioEl
        .play()
        .then(() => {
          if (requestId !== this.playRequestId) {
            this.audioEl?.pause();
            return;
          }
          this.startProgressLoop();
        })
        .catch(() => {
          if (this.currentTrack) {
            this.loadAndPlay(this.currentTrack, this.currentTime);
          }
        });
    } else {
      this.loadAndPlay(this.currentTrack, this.currentTime);
    }
  }

  public seek(seconds: number) {
    if (!this.currentTrack) return;
    const clamped = Math.max(0, Math.min(this.activeDuration, seconds));
    this.currentTime = clamped;
    if (
      this.audioEl &&
      Number.isFinite(this.audioEl.duration) &&
      this.audioEl.duration > 0
    ) {
      try {
        this.audioEl.currentTime = Math.min(clamped, Math.max(0, this.audioEl.duration - 0.5));
      } catch {
        // ignore
      }
    }
    this.emitTick();
  }

  private stopProgressTimer() {
    if (this.progressTimer !== null) {
      window.clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  private startProgressLoop() {
    this.stopProgressTimer();
    this.progressTimer = window.setInterval(() => {
      if (!this.isPlaying || !this.currentTrack) return;
      if (this.audioEl) {
        if (this.audioEl.paused && !this.audioEl.ended && this.audioEl.readyState >= 2) {
          this.audioEl.play().catch(() => {});
        }
        if (!this.audioEl.paused) {
          this.currentTime = this.audioEl.currentTime;
          if (Number.isFinite(this.audioEl.duration) && this.audioEl.duration >= 95) {
            this.activeDuration = Math.round(this.audioEl.duration);
          }
          this.emitTick();
        }
      }
    }, 65);
  }

  private emitTick() {
    if (!this.onTickCallback || !this.currentTrack) return;
    const spectrum = this.getSpectrum();
    const section = getSongSectionAtTime(this.currentTime, this.activeDuration);
    this.onTickCallback(this.currentTime, this.activeDuration, spectrum, section);
  }

  private getSpectrum(): number[] {
    if (!this.isPlaying || !this.currentTrack || !this.audioEl || this.audioEl.paused) {
      return Array(16).fill(8);
    }
    const bars: number[] = [];
    const bpmFactor = (this.currentTrack.bpm || 128) / 60;
    const eqBoost = (this.eqGains[0] || 0) * 1.5;
    for (let i = 0; i < 16; i++) {
      const wave1 = Math.abs(Math.sin(this.currentTime * bpmFactor * Math.PI + i * 0.45));
      const wave2 = Math.abs(Math.cos(this.currentTime * bpmFactor * 0.5 * Math.PI - i * 0.3));
      const energy = 22 + (wave1 * 0.65 + wave2 * 0.35) * 68 + eqBoost;
      bars.push(Math.max(12, Math.min(100, Math.round(energy))));
    }
    return bars;
  }

  public playRestTimerBeep(isFinalGo: boolean) {
    try {
      this.ensureAudioContextUnlocked();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isFinalGo ? 880 : 440, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinalGo ? 0.35 : 0.12));
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + (isFinalGo ? 0.36 : 0.14));
    } catch {
      // ignore
    }
  }

  public async renderRingtoneBlob(
    track: Track,
    _durationSeconds: number,
    _style: 'call' | 'alarm' | 'notification'
  ): Promise<Blob> {
    try {
      const fullUrl = getFullSongStreamUrl(track);
      const resp = await fetch(fullUrl);
      if (resp.ok) {
        const contentType = resp.headers.get('content-type') || '';
        if (contentType.includes('audio') || contentType.includes('octet-stream')) {
          return await resp.blob();
        }
      }
    } catch {
      // fallback
    }
    const directUrl =
      track.directStreamUrl ||
      this.resolvedDirectUrls.get(track.id) ||
      (await resolveDirectItunesAudioUrl(track));
    if (directUrl) {
      const r = await fetch(directUrl);
      if (r.ok) return await r.blob();
    }
    throw new Error('Could not fetch song audio for ringtone.');
  }
}

export const audioEngine = new SanctuaryAudioEngine();
