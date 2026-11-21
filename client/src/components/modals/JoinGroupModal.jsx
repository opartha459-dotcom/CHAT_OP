import React, { useState } from 'react';
import { X, Users, Link2, ArrowRight, AlertCircle, CheckCircle2, Clipboard } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

export const JoinGroupModal = ({ isOpen, onClose, initialCode = '' }) => {
  const { authHeaders, fetchConversations, selectConversation, conversations } = useChat();
  const [inviteInput, setInviteInput] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  // Extract clean invite code from full link, path, or raw code
  const extractCode = (str) => {
    if (!str) return '';
    const trimmed = str.trim();
    // Matches /join/:code or raw code
    const match = trimmed.match(/(?:join\/|^)([a-fA-F0-9_-]{6,32})/);
    return match ? match[1] : trimmed;
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInviteInput(text.trim());
        setError('');
      }
    } catch {
      // Clipboard permissions denied, ignore
    }
  };

  const handleJoin = async (e) => {
    e?.preventDefault();
    const cleanCode = extractCode(inviteInput);

    if (!cleanCode) {
      setError('Please enter a group invite code or link.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/groups/join/${encodeURIComponent(cleanCode)}`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include'
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMsg(data.message || 'Successfully joined the group!');
        // Refresh conversations list
        await fetchConversations();

        // If groupId returned, find and select it
        if (data.groupId) {
          setTimeout(() => {
            const joined = conversations.find((c) => c._id === data.groupId);
            if (joined) selectConversation(joined);
            onClose();
          }, 800);
        } else {
          setTimeout(onClose, 800);
        }
      } else {
        setError(data.message || 'Failed to join group. Please check the code.');
      }
    } catch (err) {
      console.error('Error joining group', err);
      setError('Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-[#0B0F19] text-slate-100 border border-slate-800/90 rounded-[28px] shadow-2xl shadow-purple-950/30 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.15)] font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Join Group
              </h2>
              <p className="text-xs text-slate-400">Join via invite code or group link</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleJoin} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Group Invite Code or Link
            </label>
            <div className="relative">
              <Link2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. 87063d3f or https://.../join/87063d3f"
                value={inviteInput}
                onChange={(e) => {
                  setInviteInput(e.target.value);
                  setError('');
                }}
                className="w-full pl-10 pr-24 py-2.5 text-sm bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 rounded-2xl transition-all"
                autoFocus
              />
              <button
                type="button"
                onClick={handlePaste}
                title="Paste from clipboard"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-[11px] font-semibold text-slate-300 rounded-xl transition flex items-center space-x-1 cursor-pointer"
              >
                <Clipboard className="w-3 h-3 text-indigo-400" />
                <span>Paste</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Paste the full invite URL (e.g. <span className="font-mono text-indigo-400">/join/code</span>) or type the unique code.
            </p>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-xl transition border border-slate-800/80 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !inviteInput.trim()}
              className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 rounded-xl shadow-lg shadow-purple-600/25 transition flex items-center space-x-1.5 cursor-pointer"
            >
              {loading ? (
                <span>Joining...</span>
              ) : (
                <>
                  <span>Join Group</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
