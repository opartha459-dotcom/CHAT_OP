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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-white">
                Join Group
              </h2>
              <p className="text-xs text-slate-400">Join via invite code or group link</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleJoin} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Group Invite Code or Link
            </label>
            <div className="relative">
              <Link2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. 87063d3f or https://.../join/87063d3f"
                value={inviteInput}
                onChange={(e) => {
                  setInviteInput(e.target.value);
                  setError('');
                }}
                className="w-full pl-10 pr-20 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                autoFocus
              />
              <button
                type="button"
                onClick={handlePaste}
                title="Paste from clipboard"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[11px] font-medium text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition flex items-center space-x-1"
              >
                <Clipboard className="w-3 h-3" />
                <span>Paste</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Paste the full invite URL (e.g. <span className="font-mono text-indigo-500">/join/code</span>) or type the unique code.
            </p>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !inviteInput.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center space-x-1.5"
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
