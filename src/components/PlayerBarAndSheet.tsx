import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Heart,
  Download,
  Check,
  Speaker,
  Sliders,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  Share2,
  ListMusic,
  BookOpen,
  Plus,
  BellRing,
  Film,
  Tv,
  Disc,
  ListPlus,
  Maximize2,
  X,
} from 'lucide-react';
import { Track, Playlist, COVER_ROCK_ALTAR } from '../data/musicCatalog';
import { SongSection, getSongSectionAtTime } from '../utils/audioEngine';
import { downloadTrackToDevice } from '../utils/offlineVault';
import { TrackVideoCanvas, useTrackTimedLyrics } from './SpotifyCanvasAndModals';

interface PlayerBarAndSheetProps {
  currentTrack: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  spectrum?: number[];
  volume: number;
  isShuffle: boolean;
  isRepeat: boolean;
  isBookmarked: boolean;
  isOfflineSaved: boolean;
  activeDeviceName: string;
  audioQualityLabel: string;
  queue: Track[];
  playlists: Playlist[];
  likedTrackIds: string[];
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (sec: number) => void;
  onVolumeChange: (val: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleBookmark: (trackId: string) => void;
  onToggleOffline: (track: Track) => void;
  onAddTrackToPlaylist: (playlistId: string, trackId: string) => void;
  onOpenAddToPlaylistModal: (track: Track) => void;
  onSelectTrack: (track: Track) => void;
  onOpenConnect: () => void;
  onOpenEQ: () => void;
  onShareTrack: (track: Track) => void;
  onOpenRingtoneStudio: (track: Track) => void;
  onOpenFullScreenVideo: () => void;
  activeTab?: string;
}

export const PlayerBarAndSheet: React.FC<PlayerBarAndSheetProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  spectrum,
  volume,
  isShuffle,
  isRepeat,
  isBookmarked,
  isOfflineSaved,
  activeDeviceName,
  audioQualityLabel,
  queue,
  playlists,
  likedTrackIds,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleShuffle,
  onToggleRepeat,
  onToggleBookmark,
  onToggleOffline,
  onAddTrackToPlaylist,
  onOpenAddToPlaylistModal,
  onSelectTrack,
  onOpenConnect,
  onOpenEQ,
  onShareTrack,
  onOpenRingtoneStudio,
  onOpenFullScreenVideo,
  activeTab,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [visualMode, setVisualMode] = useState<'canvas' | 'video' | 'art'>('video');
  const [showPlayerLyrics, setShowPlayerLyrics] = useState(true);
  const [drawerTab, setDrawerTab] = useState<'upnext' | 'lyrics' | 'playlists'>('upnext');
  const [addedPlaylistId, setAddedPlaylistId] = useState<string | null>(null);
  const timedLyrics = useTrackTimedLyrics(
    currentTrack,
    duration,
    isExpanded && drawerTab === 'lyrics'
  );

  useEffect(() => {
    setIsExpanded(false);
  }, [activeTab]);

  const formatTime = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${mins}:${String(rem).padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const activeSection: SongSection = getSongSectionAtTime(currentTime, duration);

  const sectionMarkers: { label: SongSection; ratio: number }[] = [
    { label: 'Intro', ratio: 0.0 },
    { label: 'Verse 1', ratio: 0.12 },
    { label: 'Chorus 1', ratio: 0.3 },
    { label: 'Verse 2', ratio: 0.5 },
    { label: 'Bridge / Breakdown', ratio: 0.67 },
    { label: 'Final Chorus', ratio: 0.8 },
  ];

  return (
    <>
      {/* Full-Screen / Expanded Spotify + YouTube Music Style Drawer (leaves bottom nav visible on mobile!) */}
      {isExpanded && (
        <div className="fixed inset-x-0 top-0 bottom-[62px] md:bottom-0 z-50 bg-[#07090E] text-white flex flex-col overflow-hidden">
          {/* 100% Full-Screen Background Video Canvas behind the entire Expanded Player */}
          {visualMode !== 'art' && (
            <div className="absolute inset-0 w-full h-full opacity-45 pointer-events-none">
              <TrackVideoCanvas
                track={currentTrack}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                spectrum={spectrum}
                mode="fullscreen"
                showOfficialVideoEmbed={visualMode === 'video'}
                className="absolute inset-0 w-full h-full"
              />
            </div>
          )}

          {/* Top Drawer Bar: Clean and Minimal with Close X */}
          <div className="relative z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-white/15 bg-black/70 backdrop-blur-xl shrink-0">
            <button
              onClick={() => setIsExpanded(false)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
              aria-label="Close player"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center min-w-0 flex-1 px-2">
              <div className="text-sm sm:text-base font-extrabold text-white truncate">
                {currentTrack.title}
              </div>
              <div className="text-xs text-slate-300 truncate">
                {currentTrack.artist}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setShowPlayerLyrics((prev) => !prev)}
                className={`min-h-[38px] px-3 rounded-xl font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                  showPlayerLyrics
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
                title={showPlayerLyrics ? 'Hide Lyrics on Video' : 'Show Lyrics on Video'}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{showPlayerLyrics ? 'No Lyrics' : 'Lyrics'}</span>
              </button>

              <button
                onClick={() => {
                  setIsExpanded(false);
                  onOpenFullScreenVideo();
                }}
                className="min-h-[38px] px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
                title="Full Screen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Full Screen</span>
              </button>

              <button
                onClick={() => {
                  downloadTrackToDevice(currentTrack);
                  onToggleOffline(currentTrack);
                }}
                className="min-h-[38px] px-3 rounded-xl bg-white/15 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Download to Phone (iOS / Android)"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>

              <button
                onClick={() => onToggleBookmark(currentTrack.id)}
                className={`min-h-[38px] px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                  isBookmarked
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
                title="Like song ♥"
              >
                <Heart className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                <span className="hidden md:inline">{isBookmarked ? 'Liked' : 'Like'}</span>
              </button>

              <button
                onClick={() => onOpenAddToPlaylistModal(currentTrack)}
                className="min-h-[38px] px-3 rounded-xl bg-white/15 hover:bg-amber-500 hover:text-slate-950 font-bold text-xs flex items-center gap-1.5 text-white cursor-pointer transition-colors"
                title="Add to playlist"
              >
                <ListPlus className="w-4 h-4" />
                <span className="hidden md:inline">Playlist</span>
              </button>

              <button
                onClick={() => onShareTrack(currentTrack)}
                className="min-h-[38px] px-3 rounded-xl bg-white/15 hover:bg-white/25 flex items-center gap-1.5 text-xs font-bold text-white cursor-pointer"
                title="Share track"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onOpenRingtoneStudio(currentTrack)}
                className="hidden lg:flex min-h-[38px] px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs items-center gap-1.5 cursor-pointer"
                title="Ringtone"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Ringtone</span>
              </button>

              <button
                onClick={onOpenEQ}
                className="min-h-[38px] px-2.5 rounded-xl bg-white/15 hover:bg-white/25 flex items-center gap-1 text-xs font-semibold text-white cursor-pointer"
                title="EQ"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
          </div>

          {/* 2-Column Expanded Body */}
          <div className="relative z-20 flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-center">
            <div className="lg:col-span-6 flex flex-col items-center text-center space-y-2.5 sm:space-y-3.5 w-full">
              {/* Responsive Video / Canvas Stage so Scrubber & Play/Fast-Forward buttons stay visible on screen */}
              <div className="relative w-full max-w-lg h-[190px] sm:h-[270px] lg:h-[330px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-slate-950 shrink-0">
                {visualMode === 'art' ? (
                  <img
                    src={currentTrack.coverUrl}
                    alt={currentTrack.title}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = COVER_ROCK_ALTAR;
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <TrackVideoCanvas
                    track={currentTrack}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    spectrum={spectrum}
                    mode="player"
                    showOfficialVideoEmbed={visualMode === 'video'}
                    showLyricsOverlay={showPlayerLyrics}
                    onToggleLyricsOverlay={() => setShowPlayerLyrics((prev) => !prev)}
                    className="absolute inset-0 w-full h-full"
                  />
                )}

                <button
                  onClick={() => {
                    setIsExpanded(false);
                    onOpenFullScreenVideo();
                  }}
                  className="absolute bottom-2.5 right-2.5 z-20 px-3 py-1.5 rounded-xl bg-black/75 hover:bg-emerald-500 text-white hover:text-slate-950 text-xs font-bold flex items-center gap-1.5 border border-white/20 cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Full Screen Video</span>
                </button>
              </div>

              <div className="space-y-0.5 max-w-md">
                <div className="text-[11px] sm:text-xs text-emerald-400 font-semibold">
                  {currentTrack.genreLabel} · {currentTrack.bpm} BPM · Full Song ({formatTime(duration)})
                </div>
                <h2 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight truncate max-w-full">
                  {currentTrack.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 truncate">
                  {currentTrack.artist} · {currentTrack.album}
                </p>
              </div>

              {/* Full-Song Scrubber (Slide Bar) Placed Right Above Transport Controls */}
              <div className="w-full max-w-md space-y-1 bg-black/55 backdrop-blur-md border border-white/15 rounded-2xl p-3">
                <input
                  type="range"
                  min={0}
                  max={duration || 220}
                  value={currentTime}
                  onChange={(e) => onSeek(Number(e.target.value))}
                  className="w-full accent-emerald-400 h-2.5 bg-white/25 rounded-lg cursor-pointer"
                  aria-label="Seek song position"
                />
                <div className="flex justify-between text-xs font-mono text-slate-200">
                  <span>{formatTime(currentTime)}</span>
                  <span className="text-emerald-400 font-semibold">
                    Full Song · {activeSection}
                  </span>
                  <span>{formatTime(duration)}</span>
                </div>

                {/* Main Transport Controls with -15s Go Back & +15s Fast Forward */}
                <div className="flex items-center justify-center gap-2 sm:gap-3 pt-1">
                  <button
                    onClick={onToggleShuffle}
                    className={`min-h-[38px] min-w-[38px] rounded-xl flex items-center justify-center cursor-pointer ${
                      isShuffle ? 'text-amber-400' : 'text-slate-300 hover:text-white'
                    }`}
                    title="Shuffle"
                  >
                    <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={onPrev}
                    className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-white bg-white/10 hover:bg-white/20 cursor-pointer"
                    title="Previous Song"
                  >
                    <SkipBack className="w-5 h-5 fill-current" />
                  </button>
                  <button
                    onClick={() => onSeek(Math.max(0, currentTime - 15))}
                    className="px-2.5 min-h-[40px] rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold flex items-center justify-center cursor-pointer"
                    title="Go Back 15 Seconds"
                  >
                    -15s
                  </button>
                  <button
                    onClick={onTogglePlay}
                    className="w-14 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer shrink-0"
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
                    className="px-2.5 min-h-[40px] rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold flex items-center justify-center cursor-pointer"
                    title="Fast Forward 15 Seconds"
                  >
                    +15s
                  </button>
                  <button
                    onClick={onNext}
                    className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-white bg-white/10 hover:bg-white/20 cursor-pointer"
                    title="Next Song"
                  >
                    <SkipForward className="w-5 h-5 fill-current" />
                  </button>
                  <button
                    onClick={onToggleRepeat}
                    className={`min-h-[38px] min-w-[38px] rounded-xl flex items-center justify-center cursor-pointer ${
                      isRepeat ? 'text-amber-400' : 'text-slate-300 hover:text-white'
                    }`}
                    title="Repeat"
                  >
                    <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>

              {/* Jump to Full Song Section Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-md">
                {sectionMarkers.map((sec) => {
                  const isAct = activeSection === sec.label;
                  return (
                    <button
                      key={sec.label}
                      onClick={() => onSeek(Math.floor(sec.ratio * duration))}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                        isAct
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      {sec.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Tabs (Up Next / Lyrics & Scripture / Add to Playlist) */}
            <div className="lg:col-span-6 rounded-3xl bg-black/75 backdrop-blur-xl border border-white/15 p-5 h-[480px] flex flex-col w-full">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/10 mb-4 shrink-0">
                <button
                  onClick={() => setDrawerTab('upnext')}
                  className={`flex-1 min-h-[38px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                    drawerTab === 'upnext'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-300'
                  }`}
                >
                  <ListMusic className="w-4 h-4" />
                  <span>Up Next ({queue.length})</span>
                </button>
                <button
                  onClick={() => setDrawerTab('lyrics')}
                  className={`flex-1 min-h-[38px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                    drawerTab === 'lyrics'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-300'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Lyrics & Scripture</span>
                </button>
                <button
                  onClick={() => setDrawerTab('playlists')}
                  className={`flex-1 min-h-[38px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                    drawerTab === 'playlists'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-300'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Save to Playlist</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {drawerTab === 'upnext' &&
                  queue.map((trk) => {
                    const active = trk.id === currentTrack.id;
                    const liked = likedTrackIds.includes(trk.id);
                    return (
                      <div
                        key={trk.id}
                        className={`p-2.5 rounded-xl flex items-center justify-between gap-2 transition-colors ${
                          active
                            ? 'bg-emerald-500/20 border border-emerald-500/40'
                            : 'hover:bg-white/10'
                        }`}
                      >
                        <button
                          onClick={() => onSelectTrack(trk)}
                          className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <img
                            src={trk.coverUrl}
                            alt={trk.title}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = COVER_ROCK_ALTAR;
                            }}
                            className="w-10 h-10 rounded-lg object-cover shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-white truncate">
                              {trk.title}
                            </div>
                            <div className="text-xs text-slate-300 truncate mt-0.5">
                              {trk.artist} · {formatTime(trk.duration)} · {trk.genreLabel}
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => onToggleBookmark(trk.id)}
                            className={`p-1.5 rounded-lg cursor-pointer ${
                              liked ? 'text-emerald-400' : 'text-slate-400 hover:text-emerald-400'
                            }`}
                            title="Like song ♥"
                          >
                            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                          </button>
                          <button
                            onClick={() => onOpenAddToPlaylistModal(trk)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-amber-400 cursor-pointer"
                            title="Add song to a playlist"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onShareTrack(trk)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-white cursor-pointer"
                            title="Share song"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onOpenRingtoneStudio(trk)}
                            className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 cursor-pointer"
                            title="Add song to Ringtones"
                          >
                            <BellRing className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                {drawerTab === 'lyrics' && (
                  <div className="space-y-2.5 p-2">
                    {timedLyrics.map((line, i) => {
                      const nextTime = timedLyrics[i + 1]?.timeSec ?? (duration || 220);
                      const isCurrentLine =
                        currentTime >= line.timeSec && currentTime < nextTime;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => onSeek(line.timeSec)}
                          className={`w-full text-left px-3 py-2 rounded-xl transition-all cursor-pointer block ${
                            isCurrentLine
                              ? 'text-lg sm:text-xl font-black text-emerald-400 scale-[1.01] bg-emerald-500/10'
                              : 'text-sm sm:text-base font-bold text-white/60 hover:text-white'
                          }`}
                        >
                          {line.text}
                        </button>
                      );
                    })}
                  </div>
                )}

                {drawerTab === 'playlists' && (
                  <div className="space-y-2">
                    {playlists.map((pl) => {
                      const alreadyIn = pl.trackIds.includes(currentTrack.id);
                      return (
                        <button
                          key={pl.id}
                          onClick={() => {
                            onAddTrackToPlaylist(pl.id, currentTrack.id);
                            setAddedPlaylistId(pl.id);
                            setTimeout(() => setAddedPlaylistId(null), 1800);
                          }}
                          className="w-full p-3 rounded-xl bg-white/10 border border-white/15 flex items-center justify-between text-left hover:border-emerald-500 cursor-pointer"
                        >
                          <div>
                            <div className="text-xs font-bold text-white">{pl.name}</div>
                            <div className="text-[11px] text-slate-300">
                              {pl.trackIds.length} songs ·{' '}
                              {pl.isOfflineSaved ? 'Offline Vault' : 'Cloud Synced'}
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-emerald-400">
                            {addedPlaylistId === pl.id || alreadyIn ? 'Saved ✓' : '+ Add Song'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Player Dock (Clean, non-overlapping on mobile & desktop) */}
      <div className="relative z-40 shrink-0 bg-white/95 dark:bg-[#0D0F17]/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800/90 px-2.5 sm:px-6 py-2">
        {/* Top Micro Scrub Bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5 bg-slate-200 dark:bg-slate-800 cursor-pointer group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            onSeek(ratio * (duration || 220));
          }}
        >
          <div
            className="h-full bg-emerald-500 transition-all duration-100"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-4 pt-0.5">
          {/* Left: Live Video Canvas Thumbnail + Track Info (Cleanly truncated, never overlaps) */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
            <button
              onClick={onOpenFullScreenVideo}
              className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 border border-emerald-500/50 group cursor-pointer"
              title="Open Full-Screen Video Feed"
            >
              <TrackVideoCanvas
                track={currentTrack}
                isPlaying={isPlaying}
                mode="mini"
                className="w-full h-full"
              />
              <span className="absolute bottom-0.5 inset-x-0.5 bg-black/80 text-[8px] font-mono font-bold text-emerald-400 text-center rounded">
                VIDEO
              </span>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Maximize2 className="w-4 h-4 text-white" />
              </div>
            </button>

            <button
              onClick={() => setIsExpanded(true)}
              className="min-w-0 flex-1 text-left cursor-pointer overflow-hidden pr-1"
              title="Expand Player"
            >
              <div className="text-xs sm:text-sm md:text-base font-extrabold text-slate-900 dark:text-white truncate hover:text-emerald-400 transition-colors">
                {currentTrack.title}
              </div>
              <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-300 font-medium truncate mt-0.5">
                {currentTrack.artist}
              </div>
            </button>
          </div>

          {/* Center / Right Unified Controls: Non-overlapping on mobile & full controls on desktop */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              onClick={() => onToggleBookmark(currentTrack.id)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                isBookmarked
                  ? 'text-emerald-400 bg-emerald-500/15'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
              title={isBookmarked ? 'Liked ♥' : 'Like song ♥'}
            >
              <Heart className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={onToggleShuffle}
              className={`hidden md:flex w-9 h-9 rounded-xl items-center justify-center cursor-pointer ${
                isShuffle ? 'text-amber-500' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={onPrev}
              className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Previous track"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={onTogglePlay}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-md transition-transform active:scale-95 cursor-pointer shrink-0"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={onNext}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
              title="Next track"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={() => onOpenAddToPlaylistModal(currentTrack)}
              className="w-9 h-9 sm:w-auto sm:px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-emerald-500 hover:text-slate-950 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer shrink-0"
              title="Add to playlist"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden lg:inline">Playlist</span>
            </button>

            <button
              onClick={() => {
                downloadTrackToDevice(currentTrack);
                onToggleOffline(currentTrack);
              }}
              className={`w-9 h-9 sm:w-auto sm:px-2.5 rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer shrink-0 ${
                isOfflineSaved
                  ? 'text-emerald-500 bg-emerald-500/10'
                  : 'text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 hover:text-emerald-400'
              }`}
              title="Download song to phone"
            >
              {isOfflineSaved ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
              <span className="hidden xl:inline text-xs font-bold">{isOfflineSaved ? 'Saved' : 'Download'}</span>
            </button>

            <button
              onClick={() => onShareTrack(currentTrack)}
              className="hidden sm:flex w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-emerald-500 hover:text-slate-950 text-slate-700 dark:text-slate-200 items-center justify-center transition-colors cursor-pointer"
              title="Share song"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onOpenConnect}
              className="hidden md:flex min-h-[36px] px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-amber-500/20 text-xs font-medium text-slate-700 dark:text-slate-200 items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Sanctuary Connect"
            >
              <Speaker className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="hidden 2xl:inline max-w-[100px] truncate">{activeDeviceName}</span>
            </button>

            <div className="hidden lg:flex items-center gap-1.5 w-20 px-1">
              <button
                onClick={() => onVolumeChange(volume > 0 ? 0 : 0.85)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                title="Mute / Unmute"
              >
                {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                aria-label="Volume"
              />
            </div>

            <button
              onClick={() => setIsExpanded(true)}
              className="w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-300 cursor-pointer shrink-0"
              title="Open Player & Queue"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
