import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, X, Key } from 'lucide-react';
import { getConversationFingerprint } from '../../utils/crypto';

export const E2EEVerifyModal = ({ isOpen, onClose, conversation }) => {
  const [fingerprint, setFingerprint] = useState('E2EE : 256 : GCM : VERIFIED');

  useEffect(() => {
    if (conversation?._id) {
      getConversationFingerprint(conversation._id).then(setFingerprint);
    }
  }, [conversation]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-[#0B0F19] text-slate-100 border border-slate-800/90 rounded-[28px] shadow-2xl shadow-purple-950/30 overflow-hidden flex flex-col p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.15)] font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">End-to-End Encryption</h2>
              <p className="text-xs text-slate-400">Security & Key Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <div className="p-4 bg-emerald-950/25 border border-emerald-500/20 rounded-2xl flex items-start space-x-3">
            <Lock className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-emerald-300">
                Messages are encrypted directly on your device
              </p>
              <p className="text-slate-400 leading-relaxed">
                PulseChat uses AES-GCM 256-bit authenticated encryption via the browser’s Web Crypto API. The server only routes ciphertext.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Cryptographic Safety Fingerprint
            </label>
            <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 font-mono text-center text-xs tracking-wider font-semibold text-emerald-400 select-all shadow-inner">
              {fingerprint}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 text-center">
              Compare this safety fingerprint with your recipient to verify the cryptographic session.
            </p>
          </div>

          <div className="p-3.5 bg-slate-900/40 rounded-2xl border border-slate-800/80 space-y-2 text-xs text-slate-400">
            <div className="flex items-center space-x-2 text-slate-200 font-medium">
              <Key className="w-4 h-4 text-purple-400" />
              <span>Cryptographic Architecture:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-400">
              <li>Algorithm: AES-GCM (256-bit)</li>
              <li>Per-message randomized 96-bit initialization vectors (IV)</li>
              <li>Per-conversation key derivation via PBKDF2 (SHA-256)</li>
              <li>Zero plaintext logging or server access</li>
            </ul>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 px-4 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl transition shadow-lg shadow-emerald-600/25 cursor-pointer"
        >
          Got It
        </button>
      </div>
    </div>
  );
};
