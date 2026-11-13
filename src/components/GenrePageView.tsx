import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  Shuffle,
  Download,
  Check,
  Heart,
  Plus,
  Share2,
  BellRing,
  Disc3,
  Music2,
} from 'lucide-react';
import {
  Track,
  ChristianGenre,
  GENRE_CATEGORIES,
  COVER_ROCK_ALTAR,
  COVER_HIPHOP_CROWN,
  COVER_WORSHIP_RNB,
  BANNER_CALISTHENICS,
} from '../data/musicCatalog';
import { SpotifyVideoFeedStrip } from './SpotifyCanvasAndModals';

interface GenrePageViewProps {
  genreId: Exclude<ChristianGenre, 'all'>;
  tracks: Track[];
  currentTrack: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  spectrum: number[];
  bookmarkedIds: string[];
  offlineIds: string[];
  isCachingOffline: boolean;
  onBack: () => void;
  onSelectGenrePage: (genre: Exclude<ChristianGenre, 'all'>) => void;
  onSelectTrack: (track: Track, startOffset?: number) => void;
  onTogglePlay: () => void;
  onShufflePlay: (genreTracks: Track[]) => void;
  onToggleBookmark: (trackId: string) => void;
  onOpenAddToPlaylist: (track: Track) => void;
  onShareTrack: (track: Track) => void;
  onOpenRingtoneStudio: (track: Track) => void;
  onToggleOffline: (track: Track) => void;
  onSaveGenreOffline: (genreTracks: Track[]) => void;
  onOpenFullScreenFeed: (track: Track) => void;
}

function getGenreVisuals(genreId: Exclude<ChristianGenre, 'all'>): {
  banner: string;
  accentGradient: string;
  accentText: string;
} {
  switch (genreId) {
    case 'country-southern':
      return {
        banner: BANNER_CALISTHENICS,
        accentGradient: 'from-amber-950/90 via-[#15120C]/90 to-[#090A0F]',
        accentText: 'text-amber-400',
      };
    case 'metal-hardcore':
    case 'rock':
    case 'punk-ska':
      return {
        banner: COVER_ROCK_ALTAR,
        accentGradient: 'from-rose-950/85 via-[#130E12]/90 to-[#090A0F]',
        accentText: 'text-rose-400',
      };
    case 'hiphop':
    case 'reggae-afro':
      return {
        banner: COVER_HIPHOP_CROWN,
        accentGradient: 'from-emerald-950/85 via-[#0E1514]/90 to-[#090A0F]',
        accentText: 'text-emerald-400',
      };
    case 'workout-edm':
      return {
        banner: BANNER_CALISTHENICS,
        accentGradient: 'from-cyan-950/85 via-[#0C141A]/90 to-[#090A0F]',
        accentText: 'text-cyan-400',
      };
    default:
      return {
        banner: COVER_WORSHIP_RNB,
        accentGradient: 'from-amber-950/80 via-[#11131C]/90 to-[#090A0F]',
        accentText: 'text-amber-400',
      };
  }
}

function formatDur(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const GenrePageView: React.FC<GenrePageViewProps> = ({
  genreId,
  tracks,
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  spectrum,
  bookmarkedIds,
  offlineIds,
  isCachingOffline,
  onBack,
  onSelectGenrePage,
  onSelectTrack,
  onTogglePlay,
  onShufflePlay,
  onToggleBookmark,
  onOpenAddToPlaylist,
  onShareTrack,
  onOpenRingtoneStudio,
  onToggleOffline,
  onSaveGenreOffline,
  onOpenFullScreenFeed,
}) => {
  const [selectedArtist, setSelectedArtist] = useState<string>('all');
  const [workoutFilter, setWorkoutFilter] = useState<string>('all');

  useEffect(() => {
    setSelectedArtist('all');
    setWorkoutFilter('all');
  }, [genreId]);

  const categoryMeta =
    GENRE_CATEGORIES.find((c) => c.id === genreId) || GENRE_CATEGORIES[1];
  const visuals = getGenreVisuals(genreId);

  const genreTracks = useMemo(
    () => tracks.filter((t) => t.genre === genreId),
    [tracks, genreId]
  );

  const artistsInGenre = useMemo(() => {
    const counts = new Map<string, number>();
    for (const trk of genreTracks) {
      counts.set(trk.artist, (counts.get(trk.artist) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [genreTracks]);

  const visibleTracks = useMemo(() => {
    return genreTracks.filter((t) => {
      if (selectedArtist !== 'all' && t.artist !== selectedArtist) return false;
      if (
        workoutFilter !== 'all' &&
        !t.workoutSuitability.includes(workoutFilter as Track['workoutSuitability'][number])
      ) {
        return false;
      }
      return true;
    });
  }, [genreTracks, selectedArtist, workoutFilter]);

  const activeInGenre = genreTracks.some((t) => t.id === currentTrack.id);

  return (
    <div className="space-y-7 pb-6">
      {/* Top Back Bar & Seamless Genre Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800 hover:border-amber-500 text-slate-800 dark:text-slate-100 text-xs font-bold inline-flex items-center gap-2 self-start cursor-pointer whitespace-nowrap transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-amber-500" />
          <span>Back to All Genres</span>
        </button>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {GENRE_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
            const active = cat.id === genreId;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedArtist('all');
                  setWorkoutFilter('all');
                  onSelectGenrePage(cat.id as Exclude<ChristianGenre, 'all'>);
                }}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-500/50'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dedicated Genre Hero Stage */}
      <section className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800/80 bg-slate-950 p-6 sm:p-8 min-h-[230px] flex flex-col justify-between gap-5">
        <img
          src={genreTracks[0]?.coverUrl || visuals.banner}
          alt={categoryMeta.label}
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = visuals.banner;
          }}
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className={`absolute inset-0 bg-gradient-to-r ${visuals.accentGradient}`} />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-300">
            <Disc3 className={`w-4 h-4 ${visuals.accentText}`} />
            <span className={`font-bold ${visuals.accentText}`}>Christian Genre Channel</span>
            <span aria-hidden="true">·</span>
            <span>{categoryMeta.bpmRange}</span>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-semibold">
            {genreTracks.length} Official Songs · {artistsInGenre.length} Artists
          </span>
        </div>

        <div className="relative z-10 max-w-2xl space-y-2">
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            {categoryMeta.label}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Featured Artists: {categoryMeta.subtitle}. Every recording includes official studio vocals and synchronized lyrics.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              const first = visibleTracks[0] || genreTracks[0];
              if (!first) return;
              if (activeInGenre && currentTrack.id === first.id) {
                onTogglePlay();
              } else {
                onSelectTrack(first, 0);
              }
            }}
            disabled={genreTracks.length === 0}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg cursor-pointer whitespace-nowrap transition-transform active:scale-95 disabled:opacity-50"
          >
            {activeInGenre && isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause {categoryMeta.label.split(' ')[0]}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Play All ({visibleTracks.length})</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onShufflePlay(visibleTracks.length > 0 ? visibleTracks : genreTracks)}
            disabled={genreTracks.length === 0}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <Shuffle className="w-4 h-4" />
            <span>Shuffle Genre</span>
          </button>

          <button
            type="button"
            onClick={() => onSaveGenreOffline(visibleTracks.length > 0 ? visibleTracks : genreTracks)}
            disabled={isCachingOffline || genreTracks.length === 0}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 border border-white/15 cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{isCachingOffline ? 'Caching...' : 'Save Genre Offline'}</span>
          </button>
        </div>
      </section>

      {/* Official Artists Filter Row */}
      {artistsInGenre.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Music2 className="w-4 h-4 text-amber-500" />
              <span>Artists in {categoryMeta.label}</span>
            </h2>
            {selectedArtist !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedArtist('all')}
                className="text-xs font-semibold text-amber-500 hover:underline cursor-pointer"
              >
                Show All Artists
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              type="button"
              onClick={() => setSelectedArtist('all')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                selectedArtist === 'all'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500/50'
              }`}
            >
              All Artists ({genreTracks.length})
            </button>
            {artistsInGenre.map((art) => {
              const active = selectedArtist === art.name;
              return (
                <button
                  key={art.name}
                  type="button"
                  onClick={() => setSelectedArtist(active ? 'all' : art.name)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    active
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-emerald-500/50'
                  }`}
                >
                  {art.name} ({art.count})
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Video Canvas Strip scoped to this Genre */}
      {visibleTracks.length > 0 && (
        <SpotifyVideoFeedStrip
          tracks={visibleTracks}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          spectrum={spectrum}
          likedTrackIds={bookmarkedIds}
          onSelectTrack={(trk) => onSelectTrack(trk, 0)}
          onTogglePlay={onTogglePlay}
          onToggleLike={onToggleBookmark}
          onOpenAddToPlaylist={onOpenAddToPlaylist}
          onShareTrack={onShareTrack}
          onOpenFullScreenFeed={onOpenFullScreenFeed}
        />
      )}

      {/* Full Genre Tracklist Table */}
      <section className="rounded-3xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              {selectedArtist === 'all' ? `${categoryMeta.label} Songs` : `${selectedArtist} — ${categoryMeta.label}`} ({visibleTracks.length})
            </h2>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All Vibes' },
              { id: 'Calisthenics Strength', label: 'Calisthenics' },
              { id: 'Bike Cadence', label: 'Bike Cadence' },
              { id: 'HIIT Finisher', label: 'HIIT' },
              { id: 'Mobility & Cooldown', label: 'Cooldown' },
            ].map((wf) => (
              <button
                key={wf.id}
                type="button"
                onClick={() => setWorkoutFilter(wf.id)}
                className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                  workoutFilter === wf.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-white'
                }`}
              >
                {wf.label}
              </button>
            ))}
          </div>
        </div>

        {visibleTracks.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              No tracks match this filter yet — live stream continues uploading new {categoryMeta.label} releases.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedArtist('all');
                setWorkoutFilter('all');
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer"
            >
              Reset Genre Filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {visibleTracks.map((trk, idx) => {
              const active = currentTrack.id === trk.id;
              const bookmarked = bookmarkedIds.includes(trk.id);
              const offline = offlineIds.includes(trk.id);
              return (
                <div
                  key={trk.id}
                  className={`px-4 sm:px-5 py-3 flex items-center justify-between gap-3 transition-colors ${
                    active ? 'bg-amber-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => (active ? onTogglePlay() : onSelectTrack(trk, 0))}
                    className="flex items-center gap-3.5 min-w-0 flex-1 text-left cursor-pointer group"
                  >
                    <span className="w-6 text-xs font-mono text-slate-400">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-slate-900">
                      <img
                        src={trk.coverUrl}
                        alt={trk.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = visuals.banner;
                        }}
                        className="w-full h-full object-cover"
                      />
                      <div
                        className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                          active ? 'bg-black/45 opacity-100' : 'bg-black/45 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {active && isPlaying ? (
                          <Pause className="w-4 h-4 text-amber-400 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                        {trk.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {trk.artist}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-amber-500">
                          {formatDur(trk.duration)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{trk.bpm} BPM</span>
                        <span aria-hidden="true">·</span>
                        <span>{trk.album}</span>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleBookmark(trk.id)}
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
                      type="button"
                      onClick={() => onOpenAddToPlaylist(trk)}
                      className="min-h-[36px] px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-emerald-500 hover:text-slate-950 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Add song to a Playlist"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Playlist</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onShareTrack(trk)}
                      className="min-h-[36px] min-w-[36px] rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-amber-500 hover:text-slate-950 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                      title="Share song"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenRingtoneStudio(trk)}
                      className="min-h-[36px] px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-slate-950 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Add song straight to Ringtones"
                    >
                      <BellRing className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Ringtone</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleOffline(trk)}
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
        )}
      </section>
    </div>
  );
};
