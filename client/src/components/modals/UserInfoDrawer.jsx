import React, { useState } from 'react';
import { X, Shield, Lock, Flag, UserX, Calendar, CheckCircle2 } from 'lucide-react';
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
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="hidden md:block flex-1" onClick={onClose} />
        <div className="w-full sm:w-96 h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden">
          <div className="h-14 px-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10 flex-shrink-0">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Contact Info</h2>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="flex flex-col items-center text-center">
            <Avatar src={targetUser.avatar} name={targetUser.nickname || targetUser.username} size="xl" />
            <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
              {targetUser.nickname || targetUser.username}
            </h3>
            <p className="text-xs text-slate-400">@{targetUser.username}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 max-w-[240px] italic">
              "{targetUser.bio || 'Using PulseChat'}"
            </p>
          </div>

          {/* Privacy & Encryption badge */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800 dark:text-white">
              <Lock className="w-4 h-4 text-emerald-500" />
              <span>End-to-End Encryption</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Messages to this chat are protected with AES-256-GCM. Plaintext is never stored on the server.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-1.5 pt-2">
            <button
              onClick={handleToggleBlock}
              disabled={loading}
              className={`w-full flex items-center space-x-2.5 p-2.5 rounded-xl text-xs font-medium transition ${
                blocked
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
              }`}
            >
              <UserX className="w-4 h-4" />
              <span>{blocked ? 'Unblock User' : 'Block User'}</span>
            </button>

            <button
              onClick={() => setReportModalOpen(true)}
              className="w-full flex items-center space-x-2.5 p-2.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
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
