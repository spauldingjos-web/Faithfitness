import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, X, WifiOff, Check, MoreVertical } from 'lucide-react';
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
            const accepted = await install();
            if (!accepted) {
              setShowGuideModal(true);
            }
          } else {
            setShowGuideModal(true);
          }
        }}
        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
        title="Install Sanctuary App on Android, iOS, or Desktop"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Install</span>
      </button>

      {showGuideModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
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
                    Works on Android, iPhone, iPad & Desktop
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                aria-label="Close install guide"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-sm text-slate-700 dark:text-slate-300">
              {isIOS ? (
                <div className="rounded-xl bg-slate-100 dark:bg-slate-900/80 p-4 space-y-3 border border-slate-200 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-white">
                    To Install on iPhone or iPad:
                  </p>
                  <div className="flex items-center gap-3 text-xs">
                    <Share className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>
                      1. Tap the <strong>Share</strong> button in your browser bar.
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <PlusSquare className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>
                      2. Scroll down and tap <strong>Add to Home Screen</strong>.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-100 dark:bg-slate-900/80 p-4 space-y-3 border border-slate-200 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-white">
                    Quick Install on Android / Chrome:
                  </p>
                  <div className="flex items-start gap-2.5 text-xs leading-relaxed">
                    <MoreVertical className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      1. Tap the <strong>3-dots menu (⋮)</strong> in the top-right corner of Chrome.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs leading-relaxed">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      2. Tap <strong>Add to Home screen</strong> or <strong>Install app</strong> (or tap <strong>Open Sanctuary app</strong> if already installed on your phone).
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs leading-relaxed pt-1 border-t border-slate-200 dark:border-slate-800">
                    <Share className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      <strong>On iPhone (Safari):</strong> Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
            >
              Done
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
