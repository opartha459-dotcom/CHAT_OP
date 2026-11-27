import React, { useState } from 'react';
import { Flag, CheckCircle2 } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { ModalShell } from '../common/ModalShell';

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
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Report"
      subtitle="Help keep PulseChat safe and respectful"
      icon={Flag}
      iconTone="rose"
      maxWidth="max-w-sm"
    >
      {success ? (
        <div className="py-6 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <div className="text-sm font-bold text-white">Report Submitted</div>
          <p className="text-xs text-slate-400">Our safety and moderation team has received your ticket.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
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
    </ModalShell>
  );
};
