import React, { useState } from 'react';
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
import { TrackVideoCanvas } from './SpotifyCanvasAndModals';

interface PlayerBarAndSheetProps {
  currentTrack: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  spectrum: number[];
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
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [visualMode, setVisualMode] = useState<'canvas' | 'video' | 'art'>('video');
  const [drawerTab, setDrawerTab] = useState<'upnext' | 'lyrics' | 'playlists'>('upnext');
  const [addedPlaylistId, setAddedPlaylistId] = useState<string | null>(null);

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
      {/* Full-Screen / Expanded Spotify + YouTube Music Style Drawer */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-[#07090E] text-white flex flex-col overflow-hidden">
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
          <div className="relative z-20 flex-1 overflow-y-auto p-4 sm:p-8 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
            <div className="lg:col-span-6 flex flex-col items-center text-center space-y-4 w-full">
              {/* Large Full-Height Video / Canvas Stage (Explicit h-[320px] sm:h-[400px] w-full so it NEVER collapses!) */}
              <div className="relative w-full max-w-lg h-[320px] sm:h-[400px] rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-slate-950">
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
                    className="absolute inset-0 w-full h-full"
                  />
                )}

                <button
                  onClick={() => {
                    setIsExpanded(false);
                    onOpenFullScreenVideo();
                  }}
                  className="absolute top-3 right-3 z-20 px-3 py-1.5 rounded-xl bg-black/75 hover:bg-emerald-500 text-white hover:text-slate-950 text-xs font-bold flex items-center gap-1.5 border border-white/20 cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Full Screen Video</span>
                </button>
              </div>

              <div className="space-y-1 max-w-md">
                <div className="text-xs text-emerald-400 font-semibold">
                  {currentTrack.genreLabel} · {currentTrack.bpm} BPM · Full Song ({formatTime(duration)})
                </div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">
                  {currentTrack.title}
                </h2>
                <p className="text-sm text-slate-300">
                  {currentTrack.artist} · {currentTrack.album}
                </p>
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

              {/* Full-Song Scrubber */}
              <div className="w-full max-w-md space-y-1.5">
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
                  <span className="text-emerald-400 font-semibold">
                    Full Song · {activeSection}
                  </span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Main Transport Controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={onToggleShuffle}
                  className={`min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center cursor-pointer ${
                    isShuffle ? 'text-amber-400' : 'text-slate-300 hover:text-white'
                  }`}
                  title="Shuffle"
                >
                  <Shuffle className="w-5 h-5" />
                </button>
                <button
                  onClick={onPrev}
                  className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-white hover:bg-white/10 cursor-pointer"
                  title="Previous"
                >
                  <SkipBack className="w-6 h-6 fill-current" />
                </button>
                <button
                  onClick={onTogglePlay}
                  className="w-16 h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 fill-current" />
                  ) : (
                    <Play className="w-7 h-7 fill-current ml-0.5" />
                  )}
                </button>
                <button
                  onClick={onNext}
                  className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-white hover:bg-white/10 cursor-pointer"
                  title="Next"
                >
                  <SkipForward className="w-6 h-6 fill-current" />
                </button>
                <button
                  onClick={onToggleRepeat}
                  className={`min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center cursor-pointer ${
                    isRepeat ? 'text-amber-400' : 'text-slate-300 hover:text-white'
                  }`}
                  title="Repeat"
                >
                  <Repeat className="w-5 h-5" />
                </button>
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
                  <div className="space-y-4 p-2">
                    <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3.5">
                      <div className="text-xs font-bold text-emerald-400">
                        Scripture Anchor · {currentTrack.scriptureReference}
                      </div>
                      <div className="text-xs text-slate-200 mt-1">
                        Full Track ({formatTime(currentTrack.duration)}) · Now in {activeSection}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {currentTrack.lyricsSnippet.map((line, i) => (
                        <p
                          key={i}
                          className="text-base sm:text-lg font-semibold text-white leading-relaxed"
                        >
                          {line}
                        </p>
                      ))}
                    </div>
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

      {/* Persistent Bottom Player Dock (Like Spotify + YouTube Music with Live Video Canvas Thumbnail) */}
      <div className="relative z-40 bg-white/95 dark:bg-[#0D0F17]/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800/90 px-3 sm:px-6 py-2">
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

        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Live Video Canvas Thumbnail + Track Info + Like ♥ + Add to Playlist + Share */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              onClick={onOpenFullScreenVideo}
              className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-emerald-500/50 group cursor-pointer"
              title="Launch 100% Full-Screen Video Feed"
            >
              <TrackVideoCanvas
                track={currentTrack}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                spectrum={spectrum}
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

            <div className="min-w-0 flex-1">
              <button
                onClick={() => setIsExpanded(true)}
                className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate block hover:text-emerald-400 transition-colors text-left cursor-pointer max-w-[160px] sm:max-w-[280px] md:max-w-[420px]"
              >
                {currentTrack.title}
              </button>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                <span className="truncate">{currentTrack.artist}</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-400">{currentTrack.genreLabel}</span>
              </div>
            </div>

            {/* 1-Tap Like ♥, + Playlist, Share, Ringtone right in the player bar */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onToggleBookmark(currentTrack.id)}
                className={`min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                  isBookmarked
                    ? 'text-emerald-400 bg-emerald-500/15'
                    : 'text-slate-400 hover:text-emerald-400'
                }`}
                title={isBookmarked ? 'Liked in Your Library ♥' : 'Like song ♥'}
              >
                <Heart className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>

              <button
                onClick={() => onOpenAddToPlaylistModal(currentTrack)}
                className="min-h-[36px] px-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-emerald-500 hover:text-slate-950 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Add current song to a playlist"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Playlist</span>
              </button>

              <button
                onClick={() => onShareTrack(currentTrack)}
                className="min-h-[36px] min-w-[36px] rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-emerald-500 hover:text-slate-950 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                title="Share current song"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onOpenRingtoneStudio(currentTrack)}
                className="hidden md:flex min-h-[36px] px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-500 hover:text-slate-950 font-semibold text-xs items-center gap-1 transition-colors cursor-pointer"
                title="Add straight to Ringtones"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Ringtone</span>
              </button>

              <button
                onClick={() => {
                  downloadTrackToDevice(currentTrack);
                  onToggleOffline(currentTrack);
                }}
                className={`min-h-[36px] min-w-[36px] px-2 rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                  isOfflineSaved
                    ? 'text-emerald-500 bg-emerald-500/10'
                    : 'text-slate-500 dark:text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10'
                }`}
                title="Download song to phone & cache offline"
              >
                {isOfflineSaved ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
                <span className="hidden sm:inline text-xs font-bold">{isOfflineSaved ? 'Saved' : 'Download'}</span>
              </button>
            </div>
          </div>

          {/* Center: Transport Controls */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={onToggleShuffle}
              className={`hidden md:flex min-h-[40px] min-w-[40px] rounded-xl items-center justify-center cursor-pointer ${
                isShuffle ? 'text-amber-500' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={onPrev}
              className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Previous track"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={onTogglePlay}
              className="w-11 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-md transition-transform active:scale-95 cursor-pointer"
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
              className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Next track"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={onToggleRepeat}
              className={`hidden md:flex min-h-[40px] min-w-[40px] rounded-xl items-center justify-center cursor-pointer ${
                isRepeat ? 'text-amber-500' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Repeat"
            >
              <Repeat className="w-4 h-4" />
            </button>

            <div className="hidden lg:block text-xs font-mono text-slate-500 dark:text-slate-400 pl-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Right: Full-Screen Video Button, Hi-Fi EQ, Sanctuary Connect, Volume */}
          <div className="flex items-center justify-end gap-1.5 flex-1">
            <button
              onClick={onOpenFullScreenVideo}
              className="hidden sm:flex min-h-[38px] px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
              title="Open 100% Full-Screen Video Player"
            >
              <Film className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Full Video</span>
            </button>

            <button
              onClick={onOpenEQ}
              className="hidden md:flex min-h-[38px] px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-mono font-semibold text-amber-500 items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Hi-Fi Audio Quality & 5-Band Equalizer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden 2xl:inline">{audioQualityLabel}</span>
            </button>

            <button
              onClick={onOpenConnect}
              className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-amber-500/20 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Sanctuary Connect — Cross-Device Control"
            >
              <Speaker className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="hidden xl:inline max-w-[110px] truncate">{activeDeviceName}</span>
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
              className="min-h-[38px] min-w-[38px] rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-300 cursor-pointer"
              title="Open Video Canvas, Queue & Lyrics"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
