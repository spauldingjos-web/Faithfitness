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
  private synthInterval: number | null = null;
  private usingSynthFallback = false;
  private playRequestId = 0;

  private currentTrack: Track | null = null;
  private isPlaying = false;
  private currentTime = 0;
  private activeDuration = 220;
  private volume = 0.85;
  private resolvedDirectUrls = new Map<string, string>();
  private triedDirectFallbackForRequest = new Set<number>();

  private onTickCallback: (
    currentTime: number,
    duration: number,
    spectrum: number[],
    section: SongSection
  ) => void = () => {};
  private onEndedCallback: (() => void) | null = null;

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

  private getOrCreateAudioElement(): HTMLAudioElement {
    if (!this.audioEl) {
      const el = new Audio();
      el.preload = 'auto';
      el.crossOrigin = 'anonymous';
      el.volume = this.volume;
      el.muted = false;
      (el as unknown as { playsInline: boolean }).playsInline = true;
      el.setAttribute('playsinline', 'true');
      el.setAttribute('webkit-playsinline', 'true');

      el.addEventListener('loadedmetadata', () => {
        if (Number.isFinite(el.duration) && el.duration > 20) {
          this.activeDuration = Math.round(el.duration);
          if (this.currentTrack && el.duration > 60) {
            this.currentTrack.duration = this.activeDuration;
          }
          this.emitTick();
        }
      });

      el.addEventListener('timeupdate', () => {
        if (!this.isPlaying || !this.currentTrack || this.usingSynthFallback) return;
        this.currentTime = el.currentTime;
        if (Number.isFinite(el.duration) && el.duration > 20) {
          this.activeDuration = Math.round(el.duration);
        }
        this.emitTick();
      });

      el.addEventListener('error', () => {
        if (!this.isPlaying || !this.currentTrack) return;
        this.handleStreamFallback(this.currentTrack, this.playRequestId, this.currentTime);
      });

      el.addEventListener('ended', () => {
        if (!this.isPlaying || this.usingSynthFallback) return;
        this.isPlaying = false;
        this.currentTime = 0;
        this.stopProgressTimer();
        if (this.onEndedCallback) {
          this.onEndedCallback();
        }
      });

      this.audioEl = el;
    }
    return this.audioEl;
  }

  public hasActiveAudio(): boolean {
    return (
      this.currentTrack !== null &&
      ((this.audioEl !== null && Boolean(this.audioEl.src)) || this.usingSynthFallback)
    );
  }

  public setCallbacks(
    onTick: (
      currentTime: number,
      duration: number,
      spectrum: number[],
      section: SongSection
    ) => void,
    onEnded: () => void
  ) {
    this.onTickCallback = onTick;
    this.onEndedCallback = onEnded;
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

  private clearWatchdogAndSynth() {
    if (this.stallWatchdogTimer !== null) {
      window.clearTimeout(this.stallWatchdogTimer);
      this.stallWatchdogTimer = null;
    }
    if (this.synthInterval !== null) {
      window.clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    this.usingSynthFallback = false;
  }

  /**
   * Immediately stops any currently playing song and resets the singleton audio element.
   */
  public stopCurrentPlayback() {
    this.stopProgressTimer();
    this.clearWatchdogAndSynth();
    if (this.audioEl) {
      try {
        this.audioEl.pause();
        this.audioEl.currentTime = 0;
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

  /**
   * Automatic multi-tier fallback:
   * 1. Direct Apple Music / iTunes global CDN (.m4a)
   * 2. IndexedDB cached blob (if loaded asynchronously)
   * 3. Web Audio harmonic beat/chord synth engine (when completely offline without cache)
   */
  private async handleStreamFallback(track: Track, requestId: number, startOffset = 0) {
    if (requestId !== this.playRequestId || !this.isPlaying) return;

    if (!this.triedDirectFallbackForRequest.has(requestId)) {
      this.triedDirectFallbackForRequest.add(requestId);

      // Check async IndexedDB blob first
      try {
        const blob = await getTrackAudioBlob(track.id);
        if (requestId !== this.playRequestId || !this.isPlaying) return;
        if (blob && blob.size > 1000) {
          const blobUrl = URL.createObjectURL(blob);
          const audio = this.getOrCreateAudioElement();
          audio.removeAttribute('crossorigin');
          audio.src = blobUrl;
          audio.volume = this.volume;
          await audio.play();
          this.startProgressLoop();
          return;
        }
      } catch {
        // continue to direct CDN fallback
      }

      // Check direct Apple Music / iTunes CDN stream
      try {
        const directUrl =
          track.directStreamUrl ||
          this.resolvedDirectUrls.get(track.id) ||
          (await resolveDirectItunesAudioUrl(track));

        if (requestId !== this.playRequestId || !this.isPlaying) return;

        if (directUrl) {
          this.resolvedDirectUrls.set(track.id, directUrl);
          const audio = this.getOrCreateAudioElement();
          audio.removeAttribute('crossorigin');
          audio.src = directUrl;
          audio.volume = this.volume;
          await audio.play();
          if (startOffset > 0 && Number.isFinite(audio.duration) && audio.duration > startOffset + 2) {
            audio.currentTime = startOffset;
          }
          this.startProgressLoop();
          return;
        }
      } catch {
        // fall through to Web Audio synth fallback
      }
    }

    if (requestId !== this.playRequestId || !this.isPlaying) return;
    this.startOfflineSynthFallback(track, startOffset);
  }

  /**
   * Built-in Web Audio API polyphonic chord & rhythm synthesizer so music ALWAYS plays
   * even if the user is in airplane mode / completely offline with no cached tracks.
   */
  private startOfflineSynthFallback(track: Track, startOffset = 0) {
    this.clearWatchdogAndSynth();
    this.usingSynthFallback = true;
    this.currentTime = startOffset;
    this.activeDuration = Math.max(150, track.duration || 210);
    this.ensureAudioContextUnlocked();

    const bpm = Math.max(72, Math.min(180, track.bpm || 128));
    const beatMs = Math.round((60 / bpm) * 1000);
    let step = 0;

    // Warm Christian worship / rock chord progressions (root frequencies in Hz)
    const chordRoots = track.keySignature?.includes('Major')
      ? [261.63, 196.0, 220.0, 174.61] // C - G - Am - F
      : [220.0, 174.61, 261.63, 196.0]; // Am - F - C - G

    const playBeatStep = () => {
      if (!this.isPlaying || !this.usingSynthFallback || !this.ctx) return;
      try {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        const now = this.ctx.currentTime;
        const masterVol = this.volume * 0.22;
        const chordIdx = Math.floor(step / 4) % chordRoots.length;
        const rootFreq = chordRoots[chordIdx];

        // Warm pad triad on beat 0 of every bar
        if (step % 4 === 0) {
          const ratios = [1, 1.25, 1.5, 2];
          ratios.forEach((r) => {
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(rootFreq * r, now);
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(masterVol * 0.35, now + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.0008, now + (beatMs * 3.8) / 1000);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + (beatMs * 3.9) / 1000);
          });
        }

        // Kick / Bass pulse on every beat
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(step % 2 === 0 ? 110 : rootFreq * 0.5, now);
        bassOsc.frequency.exponentialRampToValueAtTime(48, now + 0.14);
        bassGain.gain.setValueAtTime(masterVol * 0.8, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        bassOsc.connect(bassGain);
        bassGain.connect(this.ctx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + 0.2);

        // Melodic arpeggio note
        const arpNotes = [1, 1.5, 2, 1.25];
        const arpOsc = this.ctx.createOscillator();
        const arpGain = this.ctx.createGain();
        arpOsc.type = 'sine';
        arpOsc.frequency.setValueAtTime(rootFreq * arpNotes[step % 4], now);
        arpGain.gain.setValueAtTime(masterVol * 0.3, now);
        arpGain.gain.exponentialRampToValueAtTime(0.001, now + (beatMs * 0.85) / 1000);
        arpOsc.connect(arpGain);
        arpGain.connect(this.ctx.destination);
        arpOsc.start(now);
        arpOsc.stop(now + (beatMs * 0.9) / 1000);

        step++;
      } catch {
        // ignore audio context errors
      }
    };

    playBeatStep();
    this.synthInterval = window.setInterval(playBeatStep, beatMs);
    this.startProgressLoop();
  }

  public loadAndPlay(track: Track, startOffset = 0) {
    const requestId = ++this.playRequestId;

    // 1. Unlock Web Audio & stop previous playback synchronously inside the user gesture!
    this.ensureAudioContextUnlocked();
    this.stopCurrentPlayback();

    this.currentTrack = track;
    this.currentTime = startOffset;
    this.activeDuration = Math.max(150, track.duration || 220);
    this.isPlaying = true;
    this.emitTick();

    // Pre-resolve direct Apple Music CDN URL in background in case primary endpoint is slow/unreachable
    if (!track.directStreamUrl && !this.resolvedDirectUrls.has(track.id)) {
      resolveDirectItunesAudioUrl(track)
        .then((url) => {
          if (url) this.resolvedDirectUrls.set(track.id, url);
        })
        .catch(() => {});
    }

    // 2. Choose initial stream URL synchronously (NO await before audio.play()!)
    const syncBlobUrl = getCachedBlobUrlSync(track.id);
    const audioSrc =
      syncBlobUrl ||
      track.directStreamUrl ||
      this.resolvedDirectUrls.get(track.id) ||
      getFullSongStreamUrl(track);

    const audio = this.getOrCreateAudioElement();
    audio.removeAttribute('crossorigin');
    audio.src = audioSrc;
    audio.volume = this.volume;
    audio.muted = false;

    // Set a 2.8-second watchdog: if primary stream hasn't started playing audio, switch to direct CDN fallback
    this.stallWatchdogTimer = window.setTimeout(() => {
      if (requestId !== this.playRequestId || !this.isPlaying || this.usingSynthFallback) return;
      if (!audio.currentTime || audio.paused || audio.readyState < 2) {
        this.handleStreamFallback(track, requestId, startOffset);
      }
    }, 2800);

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
            audio.currentTime = startOffset;
          }
          this.startProgressLoop();
        })
        .catch(() => {
          if (requestId !== this.playRequestId || !this.isPlaying) return;
          this.handleStreamFallback(track, requestId, startOffset);
        });
    } else {
      this.startProgressLoop();
    }
  }

  public pause() {
    this.playRequestId++;
    this.isPlaying = false;
    this.clearWatchdogAndSynth();
    if (this.audioEl) {
      try {
        this.audioEl.pause();
      } catch {
        // ignore
      }
    }
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

    if (this.usingSynthFallback) {
      this.isPlaying = true;
      this.startOfflineSynthFallback(this.currentTrack, this.currentTime);
      return;
    }

    if (this.audioEl && this.audioEl.src && this.audioEl.readyState >= 2) {
      const requestId = ++this.playRequestId;
      this.isPlaying = true;
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
      !this.usingSynthFallback &&
      this.audioEl &&
      Number.isFinite(this.audioEl.duration) &&
      this.audioEl.duration > 0
    ) {
      this.audioEl.currentTime = Math.min(clamped, Math.max(0, this.audioEl.duration - 0.5));
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
      if (this.usingSynthFallback) {
        this.currentTime += 0.12;
        if (this.currentTime >= this.activeDuration) {
          this.isPlaying = false;
          this.currentTime = 0;
          this.stopProgressTimer();
          this.clearWatchdogAndSynth();
          if (this.onEndedCallback) {
            this.onEndedCallback();
          }
          return;
        }
      } else if (this.audioEl && !this.audioEl.paused) {
        this.currentTime = this.audioEl.currentTime;
        if (Number.isFinite(this.audioEl.duration) && this.audioEl.duration > 20) {
          this.activeDuration = Math.round(this.audioEl.duration);
        }
      }
      this.emitTick();
    }, 120);
  }

  private emitTick() {
    if (!this.onTickCallback || !this.currentTrack) return;
    const spectrum = this.getSpectrum();
    const section = getSongSectionAtTime(this.currentTime, this.activeDuration);
    this.onTickCallback(this.currentTime, this.activeDuration, spectrum, section);
  }

  private getSpectrum(): number[] {
    if (
      !this.isPlaying ||
      !this.currentTrack ||
      (!this.usingSynthFallback && this.audioEl && this.audioEl.paused)
    ) {
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

  /**
   * Fetches the full-length recorded song audio blob for ringtone export.
   */
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
      // fallback to direct iTunes CDN stream
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
