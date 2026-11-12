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
import { getSongSectionAtTime } from '../utils/audioEngine';
import { downloadTrackToDevice } from '../utils/offlineVault';

interface TrackVideoCanvasProps {
  track: Track;
  isPlaying: boolean;
  currentTime?: number;
  duration?: number;
  spectrum?: number[];
  mode?: 'card' | 'player' | 'fullscreen' | 'mini';
  showOfficialVideoEmbed?: boolean;
  className?: string;
}

/**
 * Renders a Full-Bleed Spotify Canvas / Live Music Video visual layer synced to the full-length audio engine.
 * Combines 60fps beat-reactive stage lighting, kinetic lyrics, and muted YouTube official video visual stream
 * so the 100% full-length audio from /api/music/full-song plays completely uninterrupted.
 */
export const TrackVideoCanvas: React.FC<TrackVideoCanvasProps> = ({
  track,
  isPlaying,
  currentTime = 0,
  duration = 210,
  spectrum = [],
  mode = 'card',
  showOfficialVideoEmbed = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [resolvedYoutubeId, setResolvedYoutubeId] = useState<string | null>(
    track.youtubeVideoId || (track.youtubeCandidates && track.youtubeCandidates[0]) || null
  );

  useEffect(() => {
    let active = true;
    const initialId =
      track.youtubeVideoId || (track.youtubeCandidates && track.youtubeCandidates[0]) || null;
    setResolvedYoutubeId(initialId);

    if (!initialId) {
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
  }, [track.id, track.title, track.artist, track.youtubeVideoId, track.youtubeCandidates]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let frame = 0;

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
    const particles = Array.from({ length: mode === 'mini' ? 10 : 36 }, (_, i) => ({
      x: (i * 37) % 100,
      y: (i * 53) % 100,
      size: 2 + (i % 4) * 1.6,
      speedY: 0.28 + (i % 5) * 0.16,
      speedX: ((i % 3) - 1) * 0.15,
      alpha: 0.35 + (i % 5) * 0.12,
    }));

    const render = () => {
      frame += isPlaying ? 1 : 0.25;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const avgSpec =
        spectrum.length > 0
          ? spectrum.reduce((acc, v) => acc + v, 0) / spectrum.length
          : isPlaying
            ? 48 + Math.sin(frame * 0.15) * 26
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
        const bars = 28;
        const barWidth = w / bars;
        for (let i = 0; i < bars; i++) {
          const specVal =
            spectrum[i % Math.max(1, spectrum.length)] ??
            (isPlaying ? 32 + Math.sin(frame * 0.2 + i * 0.45) * 26 : 12);
          const barH = Math.max(6, (specVal / 100) * (h * 0.24));
          ctx.fillStyle = i % 2 === 0 ? palette.primary : palette.secondary;
          ctx.globalAlpha = 0.45;
          ctx.fillRect(i * barWidth + 2, h - barH, Math.max(2, barWidth - 4), barH);
        }
        ctx.globalAlpha = 1;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [track.id, track.genre, isPlaying, spectrum, mode]);

  const activeLyricIndex =
    track.lyricsSnippet.length > 0
      ? Math.floor((currentTime / Math.max(1, duration)) * track.lyricsSnippet.length) %
        track.lyricsSnippet.length
      : 0;
  const activeSection = getSongSectionAtTime(currentTime, duration);

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

      {/* 60fps Full-Bleed Concert Lighting, Embers & Waveform Canvas */}
      <canvas
        ref={canvasRef}
        width={mode === 'mini' ? 120 : 720}
        height={mode === 'mini' ? 120 : 1280}
        className="absolute inset-0 w-full h-full pointer-events-none block"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Center / Lower-Third Live Kinetic Lyric & Section Overlay on Player */}
      {mode === 'player' && (
        <div className="absolute inset-x-4 bottom-5 z-10 pointer-events-none flex flex-col items-center text-center space-y-2">
          <div className="px-3 py-1 rounded-full bg-black/75 border border-emerald-500/40 backdrop-blur-md text-[10px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>
              {showOfficialVideoEmbed ? 'FULL-SCREEN MUSIC VIDEO + FULL SONG' : 'SPOTIFY VIDEO CANVAS'} ·{' '}
              {activeSection}
            </span>
          </div>
          {track.lyricsSnippet[activeLyricIndex] && (
            <p className="text-sm sm:text-base font-extrabold text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] line-clamp-2 max-w-md px-3.5 py-2 rounded-2xl bg-black/55 backdrop-blur-md border border-white/10">
              “{track.lyricsSnippet[activeLyricIndex]}”
            </p>
          )}
        </div>
      )}
    </div>
  );
};

interface SpotifyVideoFeedStripProps {
  tracks: Track[];
  currentTrack: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  spectrum: number[];
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
export const SpotifyVideoFeedStrip: React.FC<SpotifyVideoFeedStripProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  spectrum,
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
                currentTime={isCurrent ? currentTime : 45}
                duration={isCurrent ? duration : trk.duration}
                spectrum={isCurrent ? spectrum : []}
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
};

interface FullScreenVideoFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  currentTrack: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  spectrum: number[];
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
  currentTime,
  duration,
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

  if (!isOpen) return null;

  const isLiked = likedTrackIds.includes(currentTrack.id);
  const formatTime = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const activeLyricIndex =
    currentTrack.lyricsSnippet.length > 0
      ? Math.floor(
          (currentTime / Math.max(1, duration)) * currentTrack.lyricsSnippet.length
        ) % currentTrack.lyricsSnippet.length
      : 0;
  const activeSection = getSongSectionAtTime(currentTime, duration);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 w-screen h-screen bg-black overflow-hidden select-none"
      style={{ width: '100vw', height: '100vh' }}
    >
      {/* Full-Viewport Video Canvas + Official Music Video Background */}
      <TrackVideoCanvas
        track={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        spectrum={spectrum}
        mode="fullscreen"
        showOfficialVideoEmbed={true}
        className="absolute inset-0 w-full h-full"
      />

      {/* Full-Screen Interactive Overlay Layout */}
      <div className="relative z-20 w-full h-full flex flex-col justify-between p-4 sm:p-6 pointer-events-none">
        {/* Top Bar: Minimal with prominent X at the top to exit */}
        <div className="flex items-center justify-between w-full pointer-events-auto">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white text-xs font-semibold shadow-lg">
            <span className="truncate max-w-[180px] sm:max-w-md font-bold">{currentTrack.title}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-300 truncate max-w-[140px]">{currentTrack.artist}</span>
          </div>

          <button
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-black/70 hover:bg-white/20 text-white flex items-center justify-center border border-white/25 cursor-pointer backdrop-blur-md transition-all active:scale-95 shadow-2xl shrink-0"
            aria-label="Exit full screen"
            title="Exit Full Screen"
          >
            <X className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Middle Stage: Center Lyric Display + Right-Hand Action Rail */}
        <div className="flex-1 flex items-center justify-between gap-4 my-2">
          {/* Center Synchronized Lyric Callout */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-2 sm:px-10 pointer-events-none">
            <div className="px-3 py-1 rounded-full bg-black/65 border border-emerald-500/40 text-xs font-mono text-emerald-400 mb-3">
              {activeSection} · {currentTrack.scriptureReference} · {currentTrack.bpm} BPM
            </div>
            {currentTrack.lyricsSnippet[activeLyricIndex] && (
              <div className="text-lg sm:text-3xl font-extrabold text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)] max-w-2xl px-5 py-3 rounded-3xl bg-black/45 backdrop-blur-md border border-white/15">
                “{currentTrack.lyricsSnippet[activeLyricIndex]}”
              </div>
            )}
          </div>

          {/* Right Side Floating Action Rail: Like ♥, + Playlist, Share, Download to Phone, Ringtone */}
          <div className="flex flex-col items-center gap-3.5 shrink-0 pointer-events-auto">
            <button
              onClick={() => onToggleLike(currentTrack.id)}
              className="flex flex-col items-center gap-1 cursor-pointer"
              title="Like Song ♥"
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all shadow-xl ${
                  isLiked
                    ? 'bg-emerald-500 border-emerald-300 text-slate-950 scale-105'
                    : 'bg-black/70 border-white/25 text-white hover:bg-emerald-500 hover:text-slate-950'
                }`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              </div>
              <span className="text-xs font-extrabold text-white drop-shadow">
                {isLiked ? 'Liked ♥' : 'Like'}
              </span>
            </button>

            <button
              onClick={() => onOpenAddToPlaylist(currentTrack)}
              className="flex flex-col items-center gap-1 cursor-pointer"
              title="Add to Playlist"
            >
              <div className="w-12 h-12 rounded-2xl bg-black/70 hover:bg-amber-500 hover:text-slate-950 border border-white/25 text-white flex items-center justify-center transition-all shadow-xl">
                <ListPlus className="w-5 h-5" />
              </div>
              <span className="text-xs font-extrabold text-white drop-shadow">Playlist</span>
            </button>

            <button
              onClick={() => downloadTrackToDevice(currentTrack)}
              className="flex flex-col items-center gap-1 cursor-pointer"
              title="Download to Phone (iOS / Android)"
            >
              <div className="w-12 h-12 rounded-2xl bg-black/70 hover:bg-emerald-500 hover:text-slate-950 border border-white/25 text-emerald-400 hover:text-slate-950 flex items-center justify-center transition-all shadow-xl">
                <Download className="w-5 h-5" />
              </div>
              <span className="text-xs font-extrabold text-white drop-shadow">Download</span>
            </button>

            <button
              onClick={() => onShareTrack(currentTrack)}
              className="flex flex-col items-center gap-1 cursor-pointer"
              title="Share Song"
            >
              <div className="w-12 h-12 rounded-2xl bg-black/70 hover:bg-emerald-500 hover:text-slate-950 border border-white/25 text-white flex items-center justify-center transition-all shadow-xl">
                <Share2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-extrabold text-white drop-shadow">Share</span>
            </button>

            <button
              onClick={() => onOpenRingtoneStudio(currentTrack)}
              className="flex flex-col items-center gap-1 cursor-pointer"
              title="Add to Ringtones"
            >
              <div className="w-12 h-12 rounded-2xl bg-black/70 hover:bg-amber-500 hover:text-slate-950 border border-white/25 text-amber-400 flex items-center justify-center transition-all shadow-xl">
                <BellRing className="w-5 h-5" />
              </div>
              <span className="text-xs font-extrabold text-white drop-shadow">Ringtone</span>
            </button>
          </div>
        </div>

        {/* Bottom Full-Width Player Dock + Quick Video Track Switcher */}
        <div className="bg-black/75 backdrop-blur-xl border border-white/15 rounded-3xl p-4 sm:p-5 space-y-3 max-w-4xl w-full mx-auto pointer-events-auto">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = COVER_ROCK_ALTAR;
                }}
                className="w-12 h-12 rounded-xl object-cover border border-white/20 shrink-0"
              />
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-extrabold text-white truncate">
                  {currentTrack.title}
                </div>
                <div className="text-xs sm:text-sm text-slate-300 truncate mt-0.5">
                  <span>{currentTrack.artist}</span>
                  <span aria-hidden="true" className="mx-1.5">·</span>
                  <span>{currentTrack.genreLabel}</span>
                  <span aria-hidden="true" className="mx-1.5">·</span>
                  <span className="text-emerald-400 font-mono">{formatTime(duration)}</span>
                </div>
              </div>
            </div>

            {/* Transport Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={onPrev}
                className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
                title="Previous Song"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>
              <button
                onClick={onTogglePlay}
                className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-xl cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                )}
              </button>
              <button
                onClick={onNext}
                className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
                title="Next Song"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>
            </div>
          </div>

          {/* Full-Song Scrubber */}
          <div className="space-y-1">
            <input
              type="range"
              min={0}
              max={duration || 220}
              value={currentTime}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="w-full accent-emerald-500 h-2 bg-white/20 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-xs font-mono text-slate-300">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Horizontal Quick Switcher for Next Videos */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
            {tracks.slice(0, 12).map((t) => {
              const active = t.id === currentTrack.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onSelectTrack(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 cursor-pointer border transition-all ${
                    active
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                  }`}
                >
                  <img
                    src={t.coverUrl}
                    alt={t.title}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = COVER_ROCK_ALTAR;
                    }}
                    className="w-5 h-5 rounded object-cover"
                  />
                  <span className="max-w-[120px] truncate">{t.title}</span>
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
