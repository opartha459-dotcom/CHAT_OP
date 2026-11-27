import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Key } from 'lucide-react';
import { getConversationFingerprint } from '../../utils/crypto';
import { ModalShell } from '../common/ModalShell';

export const E2EEVerifyModal = ({ isOpen, onClose, conversation }) => {
  const [fingerprint, setFingerprint] = useState('E2EE : 256 : GCM : VERIFIED');

  useEffect(() => {
    if (conversation?._id) {
      getConversationFingerprint(conversation._id).then(setFingerprint);
    }
  }, [conversation]);

  if (!isOpen) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="End-to-End Encryption"
      subtitle="Security & Key Verification"
      icon={ShieldCheck}
      iconTone="emerald"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
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
          <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 font-mono text-center text-xs tracking-wider font-semibold text-emerald-400 select-all shadow-inner break-all">
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

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 px-4 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl transition shadow-lg shadow-emerald-600/25 cursor-pointer"
        >
          Got It
        </button>
      </div>
    </ModalShell>
  );
};
