import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Reusable modal shell with consistent backdrop, Escape-to-close,
 * icon header, and responsive sizing across PulseChat.
 */
export const ModalShell = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconTone = 'indigo',
  maxWidth = 'max-w-md',
  headerBg = false,
  bodyPadding = 'p-6',
  children
}) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toneMap = {
    indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]',
    rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)]',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    violet: 'bg-violet-500/10 border-violet-500/20 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`pulse-adaptive-surface w-full ${maxWidth} max-h-[92dvh] bg-white dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800/90 rounded-[28px] shadow-2xl shadow-slate-900/15 dark:shadow-purple-950/30 overflow-hidden flex flex-col`}
      >
        <div
          className={`flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/80 shrink-0 ${
            headerBg ? 'bg-slate-50/90 dark:bg-slate-900/40' : ''
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            {Icon && (
              <div
                className={`w-9 h-9 rounded-2xl border flex items-center justify-center font-bold shrink-0 ${
                  toneMap[iconTone] || toneMap.indigo
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">{title}</h2>
              {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className={`overflow-y-auto ${bodyPadding}`}>{children}</div>
      </div>
    </div>
  );
};
