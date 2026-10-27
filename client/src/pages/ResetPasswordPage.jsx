import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { PulseLogo } from '../components/common/PulseLogo';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  const handleReset = async (e) => {
    e.preventDefault();
    if (!token) {
      setFeedback({ type: 'error', text: 'No reset token provided.' });
      return;
    }
    if (newPassword.length < 6) {
      setFeedback({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    setFeedback({ text: '', type: '' });

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          text: data.message || 'Password reset successfully! Redirecting to login...'
        });
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      } else {
        setFeedback({
          type: 'error',
          text: data.message || 'Invalid or expired password reset link.'
        });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Network connection failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4 font-sans select-none">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-5 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <PulseLogo size="md" animated={false} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Reset Your Password</h1>
          <p className="text-xs text-slate-400">Enter a secure new password for your PulseChat account.</p>
        </div>

        {feedback.text && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center space-x-2.5 border ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your new password"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-indigo-600/30"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            <span>Update Password</span>
          </button>
        </form>

        <div className="text-center pt-2">
          <Link to="/login" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};
