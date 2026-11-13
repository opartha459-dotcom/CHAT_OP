import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, Copy, Check, X } from 'lucide-react';

const getDismissedCodes = () => {
  try {
    const stored = sessionStorage.getItem('pulsechat_dismissed_incoming_codes');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const IncomingCodeModal = () => {
  const { incomingCode, clearIncomingCode } = useSocket();
  const { user } = useAuth();
  const location = useLocation();
  const [copied, setCopied] = useState(false);
  const [dismissedCodes, setDismissedCodes] = useState(() => new Set(getDismissedCodes()));

  // 1. Never show code modal to ANY admin user or on the /admin route
  if (user && user.role === 'admin') {
    return null;
  }
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  // 2. Never show floating popup modal on dedicated verification/reset pages
  // (These pages already display the code and auto-fill it in their own form)
  if (
    location.pathname === '/verify-email' ||
    location.pathname === '/reset-password' ||
    location.pathname === '/confirm-deletion'
  ) {
    return null;
  }

  if (!incomingCode || !incomingCode.code) return null;

  const currentCode = String(incomingCode.code).trim();
  const currentKey = `${currentCode}|${(incomingCode.email || '').toLowerCase().trim()}`;

  // If user dismissed this exact code or code+email key, stay hidden
  if (dismissedCodes.has(currentKey) || dismissedCodes.has(currentCode)) {
    return null;
  }

  // 3. If a non-admin user is logged in, only show if code matches their account email
  if (
    user &&
    user.email &&
    incomingCode.email &&
    user.email.toLowerCase() !== incomingCode.email.toLowerCase()
  ) {
    return null;
  }

  const handleDismiss = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const stored = getDismissedCodes();
      const updated = Array.from(new Set([...stored, currentKey, currentCode]));
      sessionStorage.setItem('pulsechat_dismissed_incoming_codes', JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to save dismissed code', err);
    }
    setDismissedCodes((prev) => new Set([...prev, currentKey, currentCode]));
    clearIncomingCode();
  };

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(incomingCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.warn('Failed to copy to clipboard', e);
    }
  };

  const actionLabel =
    incomingCode.action === 'password_reset'
      ? 'Password Reset'
      : incomingCode.action === 'account_deletion'
      ? 'Account Deletion'
      : 'Email Verification';

  return (
    <div className="fixed bottom-6 right-4 sm:right-6 z-50 max-w-sm w-[calc(100%-2rem)] sm:w-full animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 border-2 border-indigo-500/80 rounded-3xl p-5 shadow-2xl backdrop-blur-md text-white space-y-3.5 relative overflow-hidden ring-4 ring-indigo-500/20">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-600/30 border border-indigo-500/50 rounded-xl text-indigo-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white tracking-wide">Verification Code from Admin</h4>
              <p className="text-[10px] text-indigo-300 font-medium">{actionLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Dismiss"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed">
          The administrator has dispatched your verification code. Copy and paste it into your verification form.
        </p>

        {/* Code Box */}
        <div className="flex items-center justify-between bg-slate-950 border border-indigo-500/40 rounded-2xl p-3 px-4 shadow-inner">
          <div className="flex items-center space-x-1 tracking-widest font-mono font-extrabold text-xl text-indigo-300 select-all">
            {incomingCode.code}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
        </div>

        {incomingCode.email && (
          <p className="text-[10px] text-slate-400 truncate">
            Dispatched for: <span className="text-indigo-300 font-mono">{incomingCode.email}</span>
          </p>
        )}
      </div>
    </div>
  );
};

