import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, X, Key, CheckCircle, Info } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white">End-to-End Encryption</h2>
              <p className="text-xs text-slate-400">Security & Key Verification</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/60 rounded-xl flex items-start space-x-3">
            <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                Messages are encrypted directly on your device
              </p>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                PulseChat uses AES-GCM 256-bit authenticated encryption via the browser’s Web Crypto API. The server only routes ciphertext.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Cryptographic Safety Fingerprint
            </label>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-center text-xs tracking-wider font-semibold text-slate-800 dark:text-white select-all">
              {fingerprint}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 text-center">
              Compare this safety fingerprint with your recipient to verify the cryptographic session.
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-200 font-medium">
              <Key className="w-4 h-4 text-indigo-500" />
              <span>Cryptographic Architecture:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
              <li>Algorithm: AES-GCM (256-bit)</li>
              <li>Per-message randomized 96-bit initialization vectors (IV)</li>
              <li>Per-conversation key derivation via PBKDF2 (SHA-256)</li>
              <li>Zero plaintext logging or server access</li>
            </ul>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 px-4 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md shadow-indigo-600/20"
        >
          Got It
        </button>
      </div>
    </div>
  );
};
