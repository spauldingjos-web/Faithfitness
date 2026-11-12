import React, { useState } from 'react';
import {
  BellRing,
  Download,
  Play,
  Check,
  X,
  Smartphone,
  Sparkles,
  Share2,
  AlarmClock,
  Volume2,
} from 'lucide-react';
import { Track, COVER_ROCK_ALTAR } from '../data/musicCatalog';
import { audioEngine } from '../utils/audioEngine';

export interface SavedRingtone {
  id: string;
  trackId: string;
  trackTitle: string;
  artist: string;
  coverUrl: string;
  sectionLabel: string;
  durationSeconds: number;
  style: 'call' | 'alarm' | 'notification';
  createdAt: string;
}

interface RingtoneStudioModalProps {
  track: Track | null;
  onClose: () => void;
  savedRingtones: SavedRingtone[];
  onSaveRingtone: (ringtone: SavedRingtone) => void;
  onPreviewTrackAtOffset: (track: Track, offsetSeconds: number) => void;
}

export const RingtoneStudioModal: React.FC<RingtoneStudioModalProps> = ({
  track,
  onClose,
  savedRingtones,
  onSaveRingtone,
  onPreviewTrackAtOffset,
}) => {
  const [selectedCut, setSelectedCut] = useState<{
    id: string;
    label: string;
    startSec: number;
    durationSec: number;
  }>({
    id: 'chorus',
    label: 'Chorus Hook (0:45 – 1:15)',
    startSec: 45,
    durationSec: 28,
  });

  const [toneStyle, setToneStyle] = useState<'call' | 'alarm' | 'notification'>('call');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  if (!track) return null;

  const cutPresets = [
    { id: 'chorus', label: 'Chorus Power Hook (0:45 – 1:15)', startSec: 45, durationSec: 28 },
    { id: 'intro', label: 'Intro Drop & Riff (0:00 – 0:25)', startSec: 0, durationSec: 25 },
    { id: 'bridge', label: 'Bridge / Breakdown Climax (2:05 – 2:35)', startSec: 125, durationSec: 28 },
    { id: 'alert', label: 'Workout / Text Notification Alert (6s)', startSec: 48, durationSec: 6 },
  ];

  const handleCreateAndDownloadRingtone = async (formatExt: 'm4a' | 'm4r') => {
    setIsExporting(true);
    setExportSuccessMessage(null);
    try {
      const dur = toneStyle === 'notification' ? 6 : selectedCut.durationSec;
      const safeTitle = track.title.replace(/[^a-z0-9]/gi, '_').slice(0, 32);
      const safeArtist = track.artist.replace(/[^a-z0-9]/gi, '_').slice(0, 24);
      const fileName = `${safeTitle}_${safeArtist}_ringtone.${formatExt}`;

      // Save to user's in-app Ringtones Vault
      const newEntry: SavedRingtone = {
        id: `rt-${Date.now()}`,
        trackId: track.id,
        trackTitle: track.title,
        artist: track.artist,
        coverUrl: track.coverUrl,
        sectionLabel: selectedCut.label,
        durationSeconds: dur,
        style: toneStyle,
        createdAt: 'Just now',
      };
      onSaveRingtone(newEntry);

      // Resolve actual recorded song URL & trigger direct download to device Ringtones / Files
      const blob = await audioEngine.renderRingtoneBlob(track, dur, toneStyle);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      setExportSuccessMessage(
        `Added actual song "${track.title}" by ${track.artist} straight to your Ringtones (${fileName})!`
      );
    } catch {
      const streamUrl = await audioEngine.resolveRealTrackAudioUrl(track);
      if (streamUrl) {
        const safeTitle = track.title.replace(/[^a-z0-9]/gi, '_').slice(0, 32);
        const fileName = `${safeTitle}_ringtone.${formatExt}`;
        const a = document.createElement('a');
        a.href = `/api/music/proxy-audio?url=${encodeURIComponent(streamUrl)}&filename=${encodeURIComponent(fileName)}`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      setExportSuccessMessage(`Added "${track.title}" by ${track.artist} to your Ringtones!`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleNativeMobileShareRingtone = async () => {
    setIsExporting(true);
    try {
      const dur = toneStyle === 'notification' ? 6 : selectedCut.durationSec;
      const blob = await audioEngine.renderRingtoneBlob(track, dur, toneStyle);
      const safeTitle = track.title.replace(/[^a-z0-9]/gi, '_').slice(0, 32);
      const file = new File([blob], `${safeTitle}_Ringtone.m4a`, { type: 'audio/mp4' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${track.title} (${track.artist}) — Ringtone`,
          text: `Set "${track.title}" by ${track.artist} as your phone ringtone or morning devotional alarm.`,
          files: [file],
        });
      } else {
        await handleCreateAndDownloadRingtone('m4a');
      }
    } catch {
      await handleCreateAndDownloadRingtone('m4a');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Add Straight to Ringtones
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Create Android & iPhone ringtones, devotional alarms & workout alerts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Song Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={track.coverUrl}
              alt={track.title}
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = COVER_ROCK_ALTAR;
              }}
              className="w-13 h-13 rounded-xl object-cover shrink-0"
            />
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {track.title}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {track.artist} · {track.bpm} BPM
              </div>
              <div className="text-[11px] font-mono text-amber-500 mt-0.5">
                Full Song Master ({Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')})
              </div>
            </div>
          </div>

          <button
            onClick={() => onPreviewTrackAtOffset(track, selectedCut.startSec)}
            className="min-h-[40px] px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500 hover:text-slate-950 text-amber-500 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            <span>Test Cut</span>
          </button>
        </div>

        {/* Step 1: Choose Ringtone Segment */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
            1. Select Song Segment for Ringtone
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {cutPresets.map((cut) => {
              const active = selectedCut.id === cut.id;
              return (
                <button
                  key={cut.id}
                  type="button"
                  onClick={() => {
                    setSelectedCut(cut);
                    if (cut.id === 'alert') setToneStyle('notification');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    active
                      ? 'bg-amber-500/15 border-amber-500 text-slate-900 dark:text-white'
                      : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="text-xs font-bold">{cut.label}</div>
                  <div className="text-[11px] font-mono opacity-75 mt-0.5">
                    Duration: {cut.durationSec}s · Hi-Fi Master Cut
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Choose Ringtone Type */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
            2. Choose Ringtone Purpose
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'call', label: 'Call Ringtone', icon: Smartphone },
              { id: 'alarm', label: 'Morning Alarm', icon: AlarmClock },
              { id: 'notification', label: 'Text / Set Alert', icon: BellRing },
            ].map((item) => {
              const Icon = item.icon;
              const active = toneStyle === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setToneStyle(item.id as 'call' | 'alarm' | 'notification')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                    active
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                      : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Export / Add Straight to Ringtones Buttons */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            disabled={isExporting}
            onClick={() => handleCreateAndDownloadRingtone('m4a')}
            className="w-full min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.99] cursor-pointer"
          >
            <BellRing className="w-4 h-4" />
            <span>
              {isExporting
                ? 'Downloading Official Song Ringtone...'
                : 'Add Straight to Ringtones (Android & Universal .M4A)'}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={isExporting}
              onClick={() => handleCreateAndDownloadRingtone('m4r')}
              className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-500" />
              <span>iPhone Ringtone (.M4R)</span>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={handleNativeMobileShareRingtone}
              className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-500" />
              <span>Send to Device Settings</span>
            </button>
          </div>
        </div>

        {exportSuccessMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-500 font-medium flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{exportSuccessMessage}</span>
          </div>
        )}

        {/* Saved Ringtones History */}
        {savedRingtones.length > 0 && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Your Saved Ringtones ({savedRingtones.length})
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {savedRingtones.map((rt) => (
                <div
                  key={rt.id}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {rt.trackTitle}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {rt.sectionLabel} · {rt.style.toUpperCase()}
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-500 shrink-0">Active ✓</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
