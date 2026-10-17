import React from 'react';
import { X, Smartphone, Download, Share2, PlusSquare, Check, Sparkles, Shield, Zap } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const InstallAppModal = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await promptInstall();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-br from-indigo-600 to-violet-700 text-white overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <button
              onClick={onClose}
              className="p-1.5 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center space-x-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white p-2 shadow-lg flex-shrink-0 flex items-center justify-center">
              <img src="/icons/icon.svg" alt="PulseChat" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h2 className="text-lg font-bold tracking-tight">Install PulseChat</h2>
                <span className="px-1.5 py-0.5 bg-white/20 text-white text-[10px] font-bold rounded-md uppercase">
                  App
                </span>
              </div>
              <p className="text-xs text-indigo-100 mt-0.5">
                Install ready for your phone & desktop
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Status banner */}
          {isInstalled ? (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center space-x-2.5">
              <Check className="w-5 h-5 flex-shrink-0 text-emerald-500" />
              <span>PulseChat is already installed and running as a standalone app!</span>
            </div>
          ) : isInstallable ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Install PulseChat onto your phone or computer for a fast, full-screen native app experience without browser address bars.
              </p>
              <button
                onClick={handleInstallClick}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Install PulseChat Now</span>
              </button>
            </div>
          ) : isIOS ? (
            /* iOS Instructions */
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-800 dark:text-white flex items-center space-x-1.5">
                <Smartphone className="w-4 h-4 text-indigo-500" />
                <span>How to Install on iPhone / iPad (Safari)</span>
              </div>
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start space-x-2.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                    1
                  </span>
                  <div className="flex items-center space-x-1">
                    <span>Tap the</span>
                    <Share2 className="w-3.5 h-3.5 text-indigo-500 inline" />
                    <span className="font-semibold text-slate-800 dark:text-white">Share button</span>
                    <span>at the bottom of Safari.</span>
                  </div>
                </div>

                <div className="flex items-start space-x-2.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                    2
                  </span>
                  <div className="flex items-center space-x-1">
                    <span>Scroll down and select</span>
                    <PlusSquare className="w-3.5 h-3.5 text-indigo-500 inline" />
                    <span className="font-semibold text-slate-800 dark:text-white">'Add to Home Screen'</span>.
                  </div>
                </div>

                <div className="flex items-start space-x-2.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                    3
                  </span>
                  <div>
                    <span>Tap <span className="font-semibold text-slate-800 dark:text-white">'Add'</span> in the top-right corner to finish.</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Android / Generic Instructions */
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-800 dark:text-white flex items-center space-x-1.5">
                <Smartphone className="w-4 h-4 text-indigo-500" />
                <span>How to Install on Android / Chrome</span>
              </div>
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start space-x-2.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                    1
                  </span>
                  <div>
                    <span>Tap the <span className="font-semibold text-slate-800 dark:text-white">three dots menu (⋮)</span> in the top-right corner of Chrome.</span>
                  </div>
                </div>

                <div className="flex items-start space-x-2.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                    2
                  </span>
                  <div className="flex items-center space-x-1">
                    <span>Tap</span>
                    <Download className="w-3.5 h-3.5 text-indigo-500 inline" />
                    <span className="font-semibold text-slate-800 dark:text-white">'Install App'</span>
                    <span>or 'Add to Home screen'.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Benefits Grid */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              <Zap className="w-4 h-4 mx-auto text-amber-500 mb-1" />
              <div className="text-[11px] font-semibold text-slate-800 dark:text-white">Fast Launch</div>
              <div className="text-[10px] text-slate-400">Instant home icon</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              <Shield className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
              <div className="text-[11px] font-semibold text-slate-800 dark:text-white">Encrypted</div>
              <div className="text-[10px] text-slate-400">Secure storage</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              <Sparkles className="w-4 h-4 mx-auto text-indigo-500 mb-1" />
              <div className="text-[11px] font-semibold text-slate-800 dark:text-white">Full-Screen</div>
              <div className="text-[10px] text-slate-400">Native mobile UI</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
