import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, X, WifiOff, Check } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        onClick={async () => {
          if (isInstallable) {
            await install();
          } else {
            setShowGuideModal(true);
          }
        }}
        className="min-h-[40px] px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        title="Install Sanctuary App on Android, iOS, or Desktop"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Install App</span>
      </button>

      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#12141E] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Install Sanctuary Pulse App
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Native offline support for iOS & Android
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                aria-label="Close install guide"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              {isIOS ? (
                <div className="rounded-xl bg-slate-100 dark:bg-slate-900/80 p-4 space-y-3 border border-slate-200 dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Install on iPhone or iPad (Safari):
                  </p>
                  <div className="flex items-center gap-3">
                    <Share className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>1. Tap the <strong>Share</strong> icon in your Safari bottom bar.</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <PlusSquare className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>2. Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-100 dark:bg-slate-900/80 p-4 space-y-3 border border-slate-200 dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Install on Android, iOS, or Desktop:
                  </p>
                  <div className="flex items-start gap-2.5 text-xs leading-relaxed">
                    <Check className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      <strong>Android (Chrome):</strong> Tap the browser menu (⋮) and select <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs leading-relaxed">
                    <Check className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      <strong>iOS (Safari):</strong> Tap the <strong>Share</strong> button and choose <strong>Add to Home Screen</strong>.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs leading-relaxed">
                    <Check className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      <strong>Desktop (Chrome / Edge):</strong> Click the install icon in the right side of the address bar to launch in a standalone window.
                    </span>
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Once installed, your offline playlists, bookmarked songs, and 365-day calisthenics workouts stay cached directly on your device.
              </p>
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC<{ offlineTracksCount: number }> = ({ offlineTracksCount }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-950 shadow-lg">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Offline Vault Active · {offlineTracksCount} tracks ready</span>
    </div>
  );
};
