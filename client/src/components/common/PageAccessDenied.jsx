import React from 'react';
import { Lock, ArrowLeft } from 'lucide-react';
import { getRoleDisplayLabel } from '../../utils/permissions';

export const PageAccessDenied = ({
  pageName = 'This Page',
  message,
  user,
  onGoBack
}) => {
  return (
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-slate-950/60 select-none">
      <div className="w-full max-w-sm p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 dark:text-rose-400">
          <Lock className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Role: {getRoleDisplayLabel(user)}
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {pageName} Access Restricted
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {message || 'You do not have permission to access this page. Please contact your administrator.'}
          </p>
        </div>

        {onGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-md"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Allowed Section</span>
          </button>
        )}
      </div>
    </div>
  );
};
