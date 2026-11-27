import React from 'react';
import { ShieldAlert, Inbox, Loader2, ArrowLeft } from 'lucide-react';
import { ModalShell } from '../common/ModalShell';

export const AccessDenied = ({
  title = 'Access Restricted',
  message = 'You do not have permission to view this section or perform this action.',
  onBack
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-slate-900/50 border border-slate-800/80 rounded-2xl">
    <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
      <ShieldAlert className="w-7 h-7" />
    </div>
    <h3 className="text-base font-bold text-white">{title}</h3>
    <p className="text-xs text-slate-400 mt-1.5 max-w-md leading-relaxed">{message}</p>
    {onBack && (
      <button
        type="button"
        onClick={onBack}
        className="mt-5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center space-x-1.5 transition cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Permitted View</span>
      </button>
    )}
  </div>
);

export const EmptyState = ({ icon: Icon = Inbox, title = 'No items found', description = '', action }) => (
  <div className="flex flex-col items-center justify-center py-14 px-6 text-center bg-slate-900/40 border border-slate-800/70 rounded-2xl">
    <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-3">
      <Icon className="w-6 h-6" />
    </div>
    <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
    {description && <p className="text-xs text-slate-400 mt-1 max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const LoadingState = ({ label = 'Loading data...' }) => (
  <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2.5">
    <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
    <span className="text-xs font-medium">{label}</span>
  </div>
);

export const DashboardCard = ({ title, subtitle, action, children, className = '' }) => (
  <div className={`bg-[#1E1833]/90 border border-violet-900/30 rounded-2xl p-4 sm:p-5 shadow-sm ${className}`}>
    {(title || action) && (
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          {title && <h3 className="text-sm font-bold text-white truncate">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    )}
    {children}
  </div>
);

export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmLabel = 'Confirm',
  tone = 'rose',
  loading = false,
  children
}) => (
  <ModalShell
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    icon={ShieldAlert}
    iconTone={tone}
    maxWidth="max-w-md"
    headerBg={true}
  >
    <div className="space-y-4">
      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
      {children}
      <div className="flex items-center justify-end space-x-2.5 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition cursor-pointer disabled:opacity-50 ${
            tone === 'rose'
              ? 'bg-rose-600 hover:bg-rose-500'
              : 'bg-indigo-600 hover:bg-indigo-500'
          }`}
        >
          {loading ? 'Processing...' : confirmLabel}
        </button>
      </div>
    </div>
  </ModalShell>
);
