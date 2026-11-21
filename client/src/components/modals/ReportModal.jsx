import React, { useState } from 'react';
import { Flag, X, CheckCircle2 } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

export const ReportModal = ({ isOpen, onClose, targetUser, targetMessage, targetGroup }) => {
  const { authHeaders } = useChat();
  const [category, setCategory] = useState('spam');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide details for the moderation report.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          reportedUserId: targetUser?._id,
          reportedMessageId: targetMessage?._id,
          reportedGroupId: targetGroup?._id,
          category,
          reason: reason.trim()
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Error filing report');

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setReason('');
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm bg-[#0B0F19] text-slate-100 border border-slate-800/90 rounded-[28px] shadow-2xl shadow-purple-950/30 overflow-hidden flex flex-col p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.15)] font-bold">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Submit Report</h2>
              <p className="text-xs text-slate-400">Help keep PulseChat safe and respectful</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <div className="text-sm font-bold text-white">Report Submitted</div>
            <p className="text-xs text-slate-400">Our safety and moderation team has received your ticket.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="py-4 space-y-3.5">
            {error && (
              <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-900/90 border border-slate-800 text-white rounded-2xl focus:outline-none focus:border-rose-500/80 focus:ring-1 focus:ring-rose-500/50 transition-all"
              >
                <option value="spam">Spam or unwanted advertising</option>
                <option value="harassment">Harassment or bullying</option>
                <option value="inappropriate_content">Inappropriate or offensive content</option>
                <option value="violence">Threats of harm or violence</option>
                <option value="other">Other policy violation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Details & Context
              </label>
              <textarea
                rows={3}
                required
                placeholder="Describe what occurred..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 rounded-2xl focus:outline-none focus:border-rose-500/80 focus:ring-1 focus:ring-rose-500/50 resize-none transition-all"
              />
            </div>

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
                disabled={submitting || !reason.trim()}
                className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-40 rounded-xl shadow-lg shadow-rose-600/25 transition cursor-pointer"
              >
                {submitting ? 'Submitting...' : 'Send Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
