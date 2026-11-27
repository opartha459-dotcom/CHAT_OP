import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, MessageSquare, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PulseLogo } from '../components/common/PulseLogo';

export const NotFoundPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-6 select-none">
      <div className="w-full max-w-md bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xl space-y-5">
        <div className="flex justify-center">
          <PulseLogo size="md" animated={false} />
        </div>

        <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Error 404
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Page Not Found
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            The page you are looking for does not exist or you do not have permission to access it.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center space-x-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </button>

          <Link
            to={isAuthenticated ? '/chat' : '/'}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-600/20 transition"
          >
            {isAuthenticated ? (
              <>
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Back to Chats</span>
              </>
            ) : (
              <>
                <Home className="w-3.5 h-3.5" />
                <span>Back to Home</span>
              </>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
};
