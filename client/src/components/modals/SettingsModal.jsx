import React, { useState, useEffect } from 'react';
import { SettingsPanel } from '../settings/SettingsPanel';

export const SettingsModal = ({ isOpen, onClose, initialTab = 'appearance' }) => {
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl bg-[#0B0F19] text-slate-100 border border-slate-800/90 rounded-[28px] shadow-2xl shadow-purple-950/30 overflow-hidden flex flex-col max-h-[88vh]">
        <SettingsPanel isModal={true} onClose={onClose} activeTab={tab} setActiveTab={setTab} />
      </div>
    </div>
  );
};
