import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ShieldAlert, Send, CheckCircle2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { PulseLogo } from '../components/common/PulseLogo';

export const DeletionAppealPage = () => {
  const [searchParams] = useSearchParams();
  const prefillEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(prefillEmail);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !reason.trim()) {
      setError('Both fields are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/deletion-appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), reason: reason.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.message || 'Failed to submit appeal. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="mb-8 flex flex-col items-center space-y-3">
        <PulseLogo size="md" animated={false} />
        <h1 className="text-2xl font-bold text-white tracking-tight">Account Deletion Appeal</h1>
        <p className="text-slate-400 text-sm text-center max-w-sm">
          If you believe your account was removed in error, submit an appeal below. An administrator will review your request.
        </p>
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl">
        {submitted ? (
          /* Success State */
          <div className="flex flex-col items-center space-y-4 text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-900/40 border border-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Appeal Submitted</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Your appeal has been sent to the moderation team. You will be contacted at <span className="text-indigo-300 font-medium">{email}</span> if your appeal is approved.
            </p>
            <Link
              to="/login"
              className="mt-2 flex items-center space-x-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </Link>
          </div>
        ) : (
          /* Appeal Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center space-x-2 mb-2">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <span className="text-sm font-semibold text-slate-300">Submit Appeal</span>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Registered Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Reason for Appeal
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={5}
                placeholder="Explain why you believe the deletion was a mistake, or provide any relevant context..."
                required
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition flex items-center justify-center space-x-2"
            >
              {loading
                ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-4 h-4" />
                : <Send className="w-4 h-4" />}
              <span>{loading ? 'Submitting...' : 'Submit Appeal'}</span>
            </button>

            <Link
              to="/login"
              className="flex items-center justify-center space-x-1 text-slate-500 hover:text-slate-300 text-xs transition mt-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
          </form>
        )}
      </div>
    </div>
  );
};

