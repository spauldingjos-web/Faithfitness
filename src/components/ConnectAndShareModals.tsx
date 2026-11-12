import React, { useState } from 'react';
import {
  Speaker,
  Smartphone,
  Tv,
  Laptop,
  Headphones,
  Check,
  X,
  Share2,
  Copy,
  Radio,
  Sliders,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { EQ_PRESETS, AudioQuality } from '../utils/audioEngine';
import { Playlist, Track } from '../data/musicCatalog';

export interface ConnectedDevice {
  id: string;
  name: string;
  type: 'phone' | 'tv' | 'tablet' | 'audio';
  status: string;
  hiFiCapable: boolean;
}

export const CONNECTED_DEVICES: ConnectedDevice[] = [
  {
    id: 'dev-this-device',
    name: 'This Device (Sanctuary App)',
    type: 'phone',
    status: 'Active · 24-bit/96kHz FLAC Engine',
    hiFiCapable: true,
  },
  {
    id: 'dev-bike-mount',
    name: 'iPhone 16 Pro · Road Bike Mount',
    type: 'phone',
    status: 'Sanctuary Connect Ready · Offline Vault Synced',
    hiFiCapable: true,
  },
  {
    id: 'dev-home-gym-ipad',
    name: 'Home Gym iPad Pro · Pull-Up Rack',
    type: 'tablet',
    status: '365 Calisthenics Display Ready',
    hiFiCapable: true,
  },
  {
    id: 'dev-living-room-tv',
    name: 'Living Room Apple TV 4K · Sonos Arc',
    type: 'tv',
    status: 'Dolby Atmos Worship Output',
    hiFiCapable: true,
  },
  {
    id: 'dev-earbuds',
    name: 'Garmin Edge + Sweatproof Buds Pro',
    type: 'audio',
    status: 'Bluetooth LE Audio · Cadence Sync',
    hiFiCapable: false,
  },
];

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDeviceId: string;
  onSelectDevice: (device: ConnectedDevice) => void;
  currentTrack: Track | null;
  groupSessionCode: string;
}

export const SanctuaryConnectModal: React.FC<ConnectModalProps> = ({
  isOpen,
  onClose,
  activeDeviceId,
  onSelectDevice,
  currentTrack,
  groupSessionCode,
}) => {
  const [copiedSession, setCopiedSession] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinedGroupMsg, setJoinedGroupMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const getDeviceIcon = (type: ConnectedDevice['type']) => {
    switch (type) {
      case 'phone':
        return <Smartphone className="w-5 h-5" />;
      case 'tv':
        return <Tv className="w-5 h-5" />;
      case 'tablet':
        return <Laptop className="w-5 h-5" />;
      default:
        return <Headphones className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Speaker className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Sanctuary Connect
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cross-device cloud playback & live group workout sync
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

        {/* Device List */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Select Playback & Workout Target Device
          </div>
          {CONNECTED_DEVICES.map((dev) => {
            const isActive = dev.id === activeDeviceId;
            return (
              <button
                key={dev.id}
                onClick={() => onSelectDevice(dev)}
                className={`w-full min-h-[58px] p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/10 border-amber-500/50 text-slate-900 dark:text-white'
                    : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isActive
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {getDeviceIcon(dev.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">{dev.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {dev.status}
                    </div>
                  </div>
                </div>
                {isActive && (
                  <span className="text-xs font-mono font-bold text-amber-500 shrink-0 ml-2">
                    Connected
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Live Group Jam Session (Like Spotify Jam) */}
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <Users className="w-4 h-4 text-amber-500" />
              <span>Live Group Workout & Worship Jam</span>
            </div>
            <span className="font-mono text-xs text-amber-500">Code: {groupSessionCode}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Invite friends on Android, iOS, or desktop to listen to{' '}
            <strong>{currentTrack?.title || 'your queue'}</strong> and train together in real time.
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/?jam=${groupSessionCode}`
                );
                setCopiedSession(true);
                setTimeout(() => setCopiedSession(false), 2500);
              }}
              className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copiedSession ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSession ? 'Jam Invite Link Copied' : 'Copy Group Jam Link'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              placeholder="Enter Jam code"
              className="flex-1 min-h-[38px] px-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={() => {
                if (joinCodeInput.trim()) {
                  setJoinedGroupMsg(`Synced to Group Jam ${joinCodeInput.trim()}`);
                  setJoinCodeInput('');
                }
              }}
              className="min-h-[38px] px-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold cursor-pointer"
            >
              Join
            </button>
          </div>
          {joinedGroupMsg && (
            <p className="text-xs text-emerald-500 font-medium">{joinedGroupMsg}</p>
          )}
        </div>
      </div>
    </div>
  );
};

interface HiFiEQModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioQuality: AudioQuality;
  onChangeQuality: (q: AudioQuality) => void;
  eqPreset: string;
  eqGains: number[];
  onSelectPreset: (presetName: string, gains: number[]) => void;
  onChangeBandGain: (index: number, gain: number) => void;
}

export const HiFiEQModal: React.FC<HiFiEQModalProps> = ({
  isOpen,
  onClose,
  audioQuality,
  onChangeQuality,
  eqPreset,
  eqGains,
  onSelectPreset,
  onChangeBandGain,
}) => {
  if (!isOpen) return null;

  const bandLabels = ['60Hz Sub', '230Hz Punch', '910Hz Warmth', '3.6kHz Presence', '14kHz Air'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Hi-Fi Audio & 5-Band DSP Equalizer
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time Web Audio DSP + Lossless streaming & offline bitrates
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

        {/* Streaming & Offline Quality Tier */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Streaming & Offline Vault Audio Resolution
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'lossless', title: 'Lossless Hi-Fi', desc: '24-bit / 96kHz FLAC' },
              { id: 'high', title: 'High Quality', desc: '320 kbps AAC Master' },
              { id: 'normal', title: 'Normal', desc: '160 kbps Balanced' },
              { id: 'low', title: 'Data Saver', desc: '64 kbps Outdoor Cellular' },
            ].map((tier) => (
              <button
                key={tier.id}
                onClick={() => onChangeQuality(tier.id as AudioQuality)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  audioQuality === tier.id
                    ? 'bg-amber-500/10 border-amber-500 text-slate-900 dark:text-white'
                    : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="text-xs font-bold">{tier.title}</div>
                <div className="text-[11px] font-mono opacity-80 mt-0.5">{tier.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* EQ Presets */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Acoustic & Workout Presets
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(EQ_PRESETS).map(([name, gains]) => (
              <button
                key={name}
                onClick={() => onSelectPreset(name, gains)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  eqPreset === name
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* 5-Band Sliders */}
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          {bandLabels.map((label, idx) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-28 text-xs font-mono text-slate-600 dark:text-slate-300 shrink-0">
                {label}
              </span>
              <input
                type="range"
                min={-12}
                max={12}
                step={0.5}
                value={eqGains[idx] ?? 0}
                onChange={(e) => onChangeBandGain(idx, parseFloat(e.target.value))}
                className="flex-1 accent-amber-500 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="w-12 text-right text-xs font-mono text-amber-500">
                {(eqGains[idx] ?? 0) > 0 ? `+${eqGains[idx]}` : eqGains[idx] ?? 0} dB
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  shareUrl: string;
}

export const SocialShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  shareUrl,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyLink = (platformTag?: string) => {
    const url = platformTag ? `${shareUrl}&ref=${platformTag}` : shareUrl;
    navigator.clipboard.writeText(`${title} — ${subtitle} | Listen & Train on Sanctuary Pulse: ${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Share2 className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Cross-Platform Social Share
            </h3>
          </div>
          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-[#181B28] p-5 border border-slate-800 text-white space-y-2">
          <div className="text-[11px] font-mono text-amber-400">SANCTUARY PULSE UNIVERSAL CARD</div>
          <div className="text-base font-bold">{title}</div>
          <div className="text-xs text-slate-300">{subtitle}</div>
          <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Compatible with Spotify, YouTube Music, Apple Music & Sanctuary</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {[
            { id: 'spotify', label: 'Copy Spotify Card Link' },
            { id: 'ytmusic', label: 'Copy YouTube Music Link' },
            { id: 'instagram', label: 'Share to Story / Status' },
            { id: 'sms', label: 'Send to Workout Partner' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => copyLink(item.id)}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-amber-500 hover:text-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => copyLink()}
          className="w-full min-h-[46px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Universal Share Link Copied to Clipboard!' : 'Copy Universal Share Link'}</span>
        </button>
      </div>
    </div>
  );
};
