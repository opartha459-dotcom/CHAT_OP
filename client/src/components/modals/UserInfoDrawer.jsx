import React, { useState } from 'react';
import { X, Lock, Flag, UserX } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { Avatar } from '../common/Avatar';
import { ReportModal } from './ReportModal';

export const UserInfoDrawer = ({ isOpen, onClose, targetUser }) => {
  const { authHeaders, fetchConversations } = useChat();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !targetUser) return null;

  const handleToggleBlock = async () => {
    try {
      setLoading(true);
      const endpoint = blocked ? `/api/users/unblock/${targetUser._id}` : `/api/users/block/${targetUser._id}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setBlocked(!blocked);
        fetchConversations();
      }
    } catch (err) {
      console.error('Error toggling block', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none">
        <div className="hidden md:block flex-1" onClick={onClose} />
        <div className="w-full sm:w-96 h-full bg-[#0B0F19] text-slate-100 border-l border-slate-800/90 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden">
          <div className="h-14 px-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40 sticky top-0 z-10 flex-shrink-0">
            <h2 className="text-sm font-bold text-white tracking-tight">Contact Info</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="flex flex-col items-center text-center">
              <Avatar src={targetUser.avatar} name={targetUser.nickname || targetUser.username} size="xl" />
              <h3 className="mt-3 text-base font-bold text-white tracking-tight">
                {targetUser.nickname || targetUser.username}
              </h3>
              <p className="text-xs text-slate-400">@{targetUser.username}</p>
              <p className="text-xs text-slate-300 mt-2 max-w-[240px] italic">
                "{targetUser.bio || 'Using PulseChat'}"
              </p>
            </div>

            {/* Privacy & Encryption badge */}
            <div className="p-3.5 bg-slate-900/40 rounded-2xl border border-slate-800/80 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
                <Lock className="w-4 h-4" />
                <span>End-to-End Encryption</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Messages to this chat are protected with AES-256-GCM. Plaintext is never stored on the server.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleToggleBlock}
                disabled={loading}
                className={`w-full flex items-center space-x-2.5 p-3 rounded-2xl text-xs font-semibold transition-all border cursor-pointer ${
                  blocked
                    ? 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-700/60'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                }`}
              >
                <UserX className="w-4 h-4" />
                <span>{blocked ? 'Unblock User' : 'Block User'}</span>
              </button>

              <button
                onClick={() => setReportModalOpen(true)}
                className="w-full flex items-center space-x-2.5 p-3 rounded-2xl text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all cursor-pointer"
              >
                <Flag className="w-4 h-4" />
                <span>Report User</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        targetUser={targetUser}
      />
    </>
  );
};
