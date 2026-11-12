import React, { useState, useEffect } from 'react';
import {
  Dumbbell,
  Bike,
  BookOpen,
  Play,
  CheckCircle2,
  Timer,
  Flame,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Share2,
  Volume2,
  Award,
  Check,
  Heart,
  Plus,
  Film,
} from 'lucide-react';
import { getCalisthenicsDayPlan, CalisthenicsDayPlan } from '../data/calisthenics365';
import { BANNER_CALISTHENICS, ChristianGenre, Track, COVER_ROCK_ALTAR } from '../data/musicCatalog';
import { audioEngine } from '../utils/audioEngine';
import { ExerciseVideoPlayer } from './ExerciseVideoPlayer';

interface CalisthenicsCoachViewProps {
  activeDay: number;
  completedDays: number[];
  onSelectDay: (day: number) => void;
  onToggleCompleteDay: (day: number) => void;
  onStartWorkoutMusic: (genre: Exclude<ChristianGenre, 'all'>, targetBpm: number) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  onShareWorkout: (plan: CalisthenicsDayPlan) => void;
  isCurrentTrackLiked?: boolean;
  onToggleLikeTrack?: (trackId: string) => void;
  onOpenAddToPlaylist?: (track: Track) => void;
  onShareTrack?: (track: Track) => void;
  onOpenFullScreenVideo?: () => void;
}

export const CalisthenicsCoachView: React.FC<CalisthenicsCoachViewProps> = ({
  activeDay,
  completedDays,
  onSelectDay,
  onToggleCompleteDay,
  onStartWorkoutMusic,
  currentTrack,
  isPlaying,
  onShareWorkout,
  isCurrentTrackLiked = false,
  onToggleLikeTrack,
  onOpenAddToPlaylist,
  onShareTrack,
  onOpenFullScreenVideo,
}) => {
  const plan = getCalisthenicsDayPlan(activeDay);
  const isDayCompleted = completedDays.includes(activeDay);

  // Track completed sets per exercise: key = `${exerciseId}-set-${setIndex}`
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({});
  const [activeMode, setActiveMode] = useState<'calisthenics' | 'bike' | 'devotional'>('calisthenics');

  // Rest countdown timer state
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const [, setRestTotalSeconds] = useState<number>(90);

  useEffect(() => {
    if (restSecondsLeft === null) return;
    if (restSecondsLeft <= 0) {
      audioEngine.playRestTimerBeep(true);
      setRestSecondsLeft(null);
      return;
    }
    if (restSecondsLeft <= 3) {
      audioEngine.playRestTimerBeep(false);
    }
    const timer = window.setTimeout(() => {
      setRestSecondsLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [restSecondsLeft]);

  const startRestTimer = (seconds: number) => {
    setRestTotalSeconds(seconds);
    setRestSecondsLeft(seconds);
  };

  const toggleSet = (exerciseId: string, setIdx: number, restSec: number) => {
    const key = `${exerciseId}-${setIdx}`;
    const nextVal = !completedSets[key];
    setCompletedSets((prev) => ({ ...prev, [key]: nextVal }));
    if (nextVal) {
      startRestTimer(restSec);
    }
  };

  const totalSetsInWorkout = plan.exercises.reduce((acc, ex) => acc + ex.sets, 0);
  const completedSetsInWorkout = plan.exercises.reduce((acc, ex) => {
    let count = 0;
    for (let s = 1; s <= ex.sets; s++) {
      if (completedSets[`${ex.id}-${s}`]) count++;
    }
    return acc + count;
  }, 0);

  const progressPct = totalSetsInWorkout > 0 ? Math.round((completedSetsInWorkout / totalSetsInWorkout) * 100) : 0;

  // Quick 7-day window around activeDay
  const startWindow = Math.max(1, Math.min(359, activeDay - 3));
  const visibleDays = Array.from({ length: 7 }, (_, i) => startWindow + i);

  return (
    <div className="space-y-6 pb-8">
      {/* Top Hero Banner with Workout + Music Sync */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800/80 bg-slate-900">
        <img
          src={BANNER_CALISTHENICS}
          alt="Smart Home Calisthenics Studio"
          referrerPolicy="no-referrer"
          className="w-full h-56 sm:h-64 object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090A0F] via-[#090A0F]/65 to-transparent" />

        <div className="absolute inset-0 p-5 sm:p-7 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
              <span>365-Day Smart Calisthenics & Devotional</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">Week {plan.weekNumber} of 52</span>
              <span aria-hidden="true">·</span>
              <span>{plan.difficultyBadge}</span>
            </div>

            <div className="flex items-center gap-2">
              {currentTrack && onToggleLikeTrack && (
                <button
                  onClick={() => onToggleLikeTrack(currentTrack.id)}
                  className={`min-h-[40px] px-3 py-1.5 rounded-xl backdrop-blur-md text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isCurrentTrackLiked
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  title="Like current workout song"
                >
                  <Heart className={`w-3.5 h-3.5 ${isCurrentTrackLiked ? 'fill-current' : ''}`} />
                  <span>{isCurrentTrackLiked ? 'Liked ♥' : 'Like ♥'}</span>
                </button>
              )}

              {currentTrack && onOpenAddToPlaylist && (
                <button
                  onClick={() => onOpenAddToPlaylist(currentTrack)}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white/10 hover:bg-emerald-500 hover:text-slate-950 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Add current workout song to Playlist"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Playlist</span>
                </button>
              )}

              <button
                onClick={() => onShareWorkout(plan)}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Day {plan.dayNumber}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <p className="text-xs text-slate-300 mb-1">{plan.phaseTitle}</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {plan.workoutTitle}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono">
                <span>{plan.estimatedMinutes} Min</span>
                <span aria-hidden="true">·</span>
                <span>Target Tempo: {plan.targetBpm} BPM</span>
                <span aria-hidden="true">·</span>
                <span>{plan.devotional.scriptureRef}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => onStartWorkoutMusic(plan.recommendedGenre, plan.targetBpm)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-[0.98] cursor-pointer whitespace-nowrap"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {isPlaying && currentTrack
                    ? `Playing ${currentTrack.bpm} BPM Workout Mix`
                    : `Play ${plan.targetBpm} BPM Workout Mix`}
                </span>
              </button>

              {onOpenFullScreenVideo && (
                <button
                  onClick={onOpenFullScreenVideo}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg cursor-pointer whitespace-nowrap"
                >
                  <Film className="w-4 h-4" />
                  <span>Full-Screen Music Video</span>
                </button>
              )}

              <button
                onClick={() => onToggleCompleteDay(plan.dayNumber)}
                className={`min-h-[44px] px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                  isDayCompleted
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-white/15 hover:bg-white/25 text-white border border-white/15'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isDayCompleted ? 'Day Completed' : 'Complete Day'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Workout Song Bar with Like ♥, + Playlist, Share & Full-Screen Video */}
      {currentTrack && (
        <div className="rounded-2xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800/80 p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = COVER_ROCK_ALTAR;
              }}
              className="w-11 h-11 rounded-xl object-cover shrink-0"
            />
            <div className="min-w-0">
              <div className="text-[11px] font-mono text-amber-500">
                ACTIVE WORKOUT SOUNDTRACK · {currentTrack.bpm} BPM · FULL SONG
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {currentTrack.title} — {currentTrack.artist}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onToggleLikeTrack && (
              <button
                onClick={() => onToggleLikeTrack(currentTrack.id)}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  isCurrentTrackLiked
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-emerald-500 hover:text-slate-950'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isCurrentTrackLiked ? 'fill-current' : ''}`} />
                <span>{isCurrentTrackLiked ? 'Liked ♥' : 'Like ♥'}</span>
              </button>
            )}
            {onOpenAddToPlaylist && (
              <button
                onClick={() => onOpenAddToPlaylist(currentTrack)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Playlist</span>
              </button>
            )}
            {onShareTrack && (
              <button
                onClick={() => onShareTrack(currentTrack)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Song</span>
              </button>
            )}
            {onOpenFullScreenVideo && (
              <button
                onClick={onOpenFullScreenVideo}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-500 hover:text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Full-Screen Video</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 365-Day Navigator & Quarter Selector */}
      <div className="rounded-2xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800/80 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { q: 1, label: 'Q1: Days 1–90 (Foundation)', start: 1 },
              { q: 2, label: 'Q2: Days 91–180 (Explosive)', start: 91 },
              { q: 3, label: 'Q3: Days 181–270 (Muscle-Up & Levers)', start: 181 },
              { q: 4, label: 'Q4: Days 271–365 (Elite Spartan)', start: 271 },
            ].map((item) => (
              <button
                key={item.q}
                onClick={() => onSelectDay(item.start)}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  plan.quarterNumber === item.q
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-slate-500 dark:text-slate-400">
            <Award className="w-4 h-4 text-amber-500" />
            <span>{completedDays.length} / 365 Days Completed</span>
          </div>
        </div>

        {/* Horizontal 7-Day Scroller + Slider */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectDay(Math.max(1, activeDay - 1))}
            disabled={activeDay <= 1}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 grid grid-cols-7 gap-1.5">
            {visibleDays.map((d) => {
              const isSelected = d === activeDay;
              const isDone = completedDays.includes(d);
              return (
                <button
                  key={d}
                  onClick={() => onSelectDay(d)}
                  className={`min-h-[52px] rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                      : isDone
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-500/40'
                  }`}
                >
                  <span className="text-[10px] opacity-75">DAY</span>
                  <span className="text-sm font-mono font-bold">{d}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onSelectDay(Math.min(365, activeDay + 1))}
            disabled={activeDay >= 365}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
            aria-label="Next day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Full Year Scrubber */}
        <div className="flex items-center gap-3 pt-1">
          <span className="text-xs font-mono text-slate-500">Day 1</span>
          <input
            type="range"
            min={1}
            max={365}
            value={activeDay}
            onChange={(e) => onSelectDay(Number(e.target.value))}
            className="flex-1 accent-amber-500 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
            aria-label="Jump to any day from 1 to 365"
          />
          <span className="text-xs font-mono text-slate-500">Day 365</span>
        </div>
      </div>

      {/* Mode Switcher + Rest Timer Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-[#12141E] border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveMode('calisthenics')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeMode === 'calisthenics'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Dumbbell className="w-4 h-4 text-amber-500" />
            <span>Calisthenics Sets ({progressPct}%)</span>
          </button>
          <button
            onClick={() => setActiveMode('bike')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeMode === 'bike'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bike className="w-4 h-4 text-amber-500" />
            <span>Bike Ride Cadence</span>
          </button>
          <button
            onClick={() => setActiveMode('devotional')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeMode === 'devotional'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span>Daily Devotional</span>
          </button>
        </div>

        {/* Live Rest Timer Controls */}
        <div className="flex items-center gap-2 bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl">
          <Timer className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Rest Timer:</span>
          {restSecondsLeft !== null ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-amber-500">
                {Math.floor(restSecondsLeft / 60)}:{String(restSecondsLeft % 60).padStart(2, '0')}
              </span>
              <button
                onClick={() => setRestSecondsLeft(null)}
                className="text-xs text-slate-400 hover:text-slate-900 dark:hover:text-white px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                Skip
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {[60, 90, 120].map((sec) => (
                <button
                  key={sec}
                  onClick={() => startRestTimer(sec)}
                  className="px-2 py-1 rounded-md text-xs font-mono bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  {sec}s
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Split: Exercises + Daily Scripture Devotional */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Active Mode Content */}
        <div className="lg:col-span-7 space-y-4">
          {activeMode === 'calisthenics' && (
            <div className="space-y-3">
              {plan.exercises.map((ex, idx) => (
                <div
                  key={ex.id}
                  className="rounded-2xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800/80 p-4 sm:p-5 transition-colors"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono font-semibold text-amber-500">0{idx + 1}</span>
                        <span aria-hidden="true">·</span>
                        <span>{ex.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{ex.equipment}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        {ex.name}
                      </h3>
                    </div>

                    <div className="text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                      <div>
                        {ex.sets} Sets × {ex.repsOrHold}
                      </div>
                      <div className="text-slate-400">
                        Rest {ex.restSeconds}s · Tempo {ex.tempo}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <ExerciseVideoPlayer exercise={ex} />
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                    <strong className="text-slate-800 dark:text-slate-200">Coach Cue:</strong> {ex.formCue}
                  </p>

                  {/* Interactive Set Checkboxes */}
                  <div className="flex flex-wrap items-center gap-2">
                    {Array.from({ length: ex.sets }, (_, sIdx) => {
                      const setNum = sIdx + 1;
                      const done = !!completedSets[`${ex.id}-${setNum}`];
                      return (
                        <button
                          key={setNum}
                          onClick={() => toggleSet(ex.id, setNum, ex.restSeconds)}
                          className={`min-h-[42px] px-3.5 py-2 rounded-xl font-mono text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
                            done
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-50 dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-500/50'
                          }`}
                        >
                          <Check className={`w-3.5 h-3.5 ${done ? 'opacity-100' : 'opacity-30'}`} />
                          <span>Set {setNum}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeMode === 'bike' && (
            <div className="rounded-2xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800/80 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-amber-500 font-semibold">
                    Outdoor Road & Indoor Cycling Protocol
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {plan.bikeProtocol.title}
                  </h3>
                </div>
                <Bike className="w-8 h-8 text-amber-500" />
              </div>

              <ExerciseVideoPlayer
                exercise={{
                  id: `bike-demo-${plan.dayNumber}`,
                  name: `${plan.bikeProtocol.title} (${plan.bikeProtocol.targetCadenceRpm})`,
                  category: 'Legs & Plyo',
                  sets: 6,
                  repsOrHold: plan.bikeProtocol.targetCadenceRpm,
                  restSeconds: 60,
                  tempo: 'Cadence Lock',
                  equipment: 'Road / Stationary Bike',
                  formCue: plan.bikeProtocol.intervalsSummary,
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 p-3.5 border border-slate-200/70 dark:border-slate-800">
                  <div className="text-xs text-slate-500">Duration</div>
                  <div className="text-lg font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                    {plan.bikeProtocol.durationMinutes} Minutes
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 p-3.5 border border-slate-200/70 dark:border-slate-800">
                  <div className="text-xs text-slate-500">Target Cadence</div>
                  <div className="text-lg font-mono font-bold text-amber-500 mt-0.5">
                    {plan.bikeProtocol.targetCadenceRpm}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 p-3.5 border border-slate-200/70 dark:border-slate-800">
                  <div className="text-xs text-slate-500">Effort Zone</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                    {plan.bikeProtocol.intensityZone}
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-200/70 dark:border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  Interval Structure
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-mono">
                  {plan.bikeProtocol.intervalsSummary}
                </p>
              </div>

              <button
                onClick={() => onStartWorkoutMusic('workout-edm', 160)}
                className="w-full min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>Launch 160+ BPM Cycling EDM & CHH Cadence Mix</span>
              </button>
            </div>
          )}

          {activeMode === 'devotional' && (
            <div className="rounded-2xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800/80 p-6 space-y-4">
              <div className="text-xs font-medium text-amber-500">
                {plan.devotional.scriptureRef} · Daily Word & Conditioning
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {plan.devotional.title}
              </h3>
              <blockquote className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-sm italic text-slate-800 dark:text-slate-200 leading-relaxed">
                “{plan.devotional.scriptureText}”
              </blockquote>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {plan.devotional.reflection}
              </p>
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1.5">
                <div className="text-xs font-bold text-amber-500">Daily Discipline Challenge</div>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                  {plan.devotional.dailyDisciplineChallenge}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right 5 Cols: Always-Visible Daily Devotional & Scripture Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800/80 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-500">
                <BookOpen className="w-4 h-4" />
                <span>Daily Devotional · Day {plan.dayNumber} of 365</span>
              </div>
              <span className="text-xs font-mono text-slate-500">{plan.devotional.scriptureRef}</span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {plan.devotional.title}
            </h3>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 text-xs sm:text-sm italic text-slate-700 dark:text-slate-200 leading-relaxed">
              “{plan.devotional.scriptureText}”
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {plan.devotional.reflection}
            </p>

            <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/80 space-y-2">
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                Prayer Focus while Training:
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {plan.devotional.prayerFocus}
              </p>
            </div>

            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-500 mb-1">
                <Flame className="w-3.5 h-3.5" />
                <span>Today’s Strict Rule</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {plan.devotional.dailyDisciplineChallenge}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setCompletedSets({})}
                className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Sets</span>
              </button>

              <button
                onClick={() => onStartWorkoutMusic('worship', 92)}
                className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-amber-500" />
                <span>Play Devotional Worship</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
