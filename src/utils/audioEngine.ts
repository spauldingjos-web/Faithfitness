import { Track } from '../data/musicCatalog';
import { getTrackAudioBlob } from './offlineVault';

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

  // Single strictly-managed HTMLAudioElement streaming 100% Full-Length (3-8 min) songs from /api/music/full-song
  private audioEl: HTMLAudioElement | null = null;
  private progressTimer: number | null = null;
  private playRequestId = 0;

  private currentTrack: Track | null = null;
  private isPlaying = false;
  private currentTime = 0;
  private activeDuration = 220;
  private volume = 0.85;

  private onTickCallback: (
    currentTime: number,
    duration: number,
    spectrum: number[],
    section: SongSection
  ) => void = () => {};
  private onEndedCallback: (() => void) | null = null;

  private getOrCreateAudioElement(): HTMLAudioElement {
    if (!this.audioEl) {
      const el = new Audio();
      el.preload = 'auto';
      el.volume = this.volume;

      el.addEventListener('loadedmetadata', () => {
        if (Number.isFinite(el.duration) && el.duration > 40) {
          this.activeDuration = Math.round(el.duration);
          if (this.currentTrack) {
            this.currentTrack.duration = this.activeDuration;
          }
          this.emitTick();
        }
      });

      el.addEventListener('timeupdate', () => {
        if (!this.isPlaying || !this.currentTrack) return;
        this.currentTime = el.currentTime;
        if (Number.isFinite(el.duration) && el.duration > 40) {
          this.activeDuration = Math.round(el.duration);
        }
        this.emitTick();
      });

      el.addEventListener('ended', () => {
        if (!this.isPlaying) return;
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

  /**
   * Immediately stops any currently playing song and resets the singleton audio element.
   */
  public stopCurrentPlayback() {
    this.stopProgressTimer();
    if (this.audioEl) {
      try {
        this.audioEl.pause();
        this.audioEl.currentTime = 0;
        this.audioEl.removeAttribute('src');
        this.audioEl.load();
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

  public async loadAndPlay(track: Track, startOffset = 0) {
    const requestId = ++this.playRequestId;

    // 1. IMMEDIATELY stop the previous song so two songs never overlap
    this.stopCurrentPlayback();

    this.currentTrack = track;
    this.currentTime = startOffset;
    this.activeDuration = Math.max(150, track.duration || 220);
    this.isPlaying = true;
    this.emitTick();

    // 2. Stream from local offline IndexedDB blob if cached, else stream online
    let audioSrc = getFullSongStreamUrl(track);
    try {
      const cachedBlob = await getTrackAudioBlob(track.id);
      if (cachedBlob && cachedBlob.size > 1000) {
        audioSrc = URL.createObjectURL(cachedBlob);
      }
    } catch {
      // use online stream
    }

    if (requestId !== this.playRequestId) return;

    const audio = this.getOrCreateAudioElement();
    audio.src = audioSrc;
    audio.volume = this.volume;

    try {
      await audio.play();
      if (requestId !== this.playRequestId || !this.isPlaying) {
        audio.pause();
        return;
      }
      if (startOffset > 0 && Number.isFinite(audio.duration) && audio.duration > startOffset + 2) {
        audio.currentTime = startOffset;
      }
      this.startProgressLoop();
    } catch {
      if (requestId !== this.playRequestId) return;
      this.isPlaying = false;
      this.emitTick();
    }
  }

  public pause() {
    this.playRequestId++;
    this.isPlaying = false;
    if (this.audioEl) {
      this.audioEl.pause();
    }
    this.stopProgressTimer();
    this.emitTick();
  }

  public async resume() {
    if (!this.currentTrack) return;
    if (this.audioEl && this.audioEl.src) {
      const requestId = ++this.playRequestId;
      this.isPlaying = true;
      try {
        await this.audioEl.play();
        if (requestId !== this.playRequestId) {
          this.audioEl.pause();
          return;
        }
        this.startProgressLoop();
      } catch {
        await this.loadAndPlay(this.currentTrack, this.currentTime);
      }
    } else {
      await this.loadAndPlay(this.currentTrack, this.currentTime);
    }
  }

  public seek(seconds: number) {
    if (!this.currentTrack) return;
    const clamped = Math.max(0, Math.min(this.activeDuration, seconds));
    this.currentTime = clamped;
    if (this.audioEl && Number.isFinite(this.audioEl.duration) && this.audioEl.duration > 0) {
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
      if (this.audioEl && !this.audioEl.paused) {
        this.currentTime = this.audioEl.currentTime;
        if (Number.isFinite(this.audioEl.duration) && this.audioEl.duration > 40) {
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
    if (!this.isPlaying || !this.currentTrack || (this.audioEl && this.audioEl.paused)) {
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
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
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
   * Fetches the full-length recorded song audio blob from /api/music/full-song for ringtone export.
   */
  public async renderRingtoneBlob(
    track: Track,
    _durationSeconds: number,
    _style: 'call' | 'alarm' | 'notification'
  ): Promise<Blob> {
    const fullUrl = getFullSongStreamUrl(track);
    const resp = await fetch(fullUrl);
    if (resp.ok) {
      return await resp.blob();
    }
    throw new Error('Could not fetch full song audio for ringtone.');
  }
}

export const audioEngine = new SanctuaryAudioEngine();
