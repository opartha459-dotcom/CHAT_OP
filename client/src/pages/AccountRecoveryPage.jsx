import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  ShieldAlert,
  RotateCcw,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Clock,
  Sparkles,
  Loader2
} from 'lucide-react';
import { PulseLogo } from '../components/common/PulseLogo';
import { useAuth } from '../context/AuthContext';

export const AccountRecoveryPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setToken, setUser } = useAuth();

  // Retrieved from login redirect state or query params
  const initialEmail = location.state?.email || new URLSearchParams(location.search).get('email') || '';
  const initialUsername = location.state?.username || '';
  const recoveryDeadline = location.state?.recoveryDeadline || '';

  const [selectedOption, setSelectedOption] = useState('recover'); // 'recover' | 'new'
  const [identifier, setIdentifier] = useState(initialEmail || initialUsername);
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');

  // Option B inputs
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  // Option A Submit: Recover Old Account
  const handleRecoverOldAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback({ text: '', type: '' });

    try {
      const res = await fetch('/api/auth/recover-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, reason })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          text: data.message || 'Recovery request submitted! An administrator will review your request and send an email update.'
        });
      } else {
        setFeedback({
          type: 'error',
          text: data.message || 'Verification failed. Please check your password.'
        });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Network connection failed.' });
    } finally {
      setLoading(false);
    }
  };

  // Option B Submit: Create New Independent Account
  const handleCreateNewAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback({ text: '', type: '' });

    try {
      const res = await fetch('/api/auth/create-alternative-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: initialEmail || identifier,
          password: newPassword,
          newUsername: newUsername.trim()
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          text: 'New account created successfully! Redirecting to chat...'
        });
        if (data.token) {
          localStorage.setItem('pulsechat_token', data.token);
          if (setToken) setToken(data.token);
          if (setUser) setUser(data.user);
        }
        setTimeout(() => navigate('/chat', { replace: true }), 1500);
      } else {
        setFeedback({
          type: 'error',
          text: data.message || 'Could not create new account.'
        });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Network connection error.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 font-sans select-none">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <PulseLogo size="md" animated={false} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Account Under Retention</h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            An existing account associated with{' '}
            <strong className="text-indigo-400">{initialEmail || 'your email'}</strong> is pending deletion.
            All messages, groups, and files are currently retained.
          </p>
          {recoveryDeadline && (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <Clock className="w-3.5 h-3.5" />
              <span>Retention Deadline: {new Date(recoveryDeadline).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Options Switcher */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setSelectedOption('recover');
              setFeedback({ text: '', type: '' });
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer ${
              selectedOption === 'recover'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Option A: Recover Old</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedOption('new');
              setFeedback({ text: '', type: '' });
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer ${
              selectedOption === 'new'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Option B: New Account</span>
          </button>
        </div>

        {/* Feedback Alert */}
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

        {/* Form Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          {selectedOption === 'recover' ? (
            /* OPTION A: RECOVER OLD ACCOUNT */
            <form onSubmit={handleRecoverOldAccount} className="space-y-4 text-xs">
              <div className="p-3 bg-indigo-950/40 border border-indigo-900/60 rounded-2xl text-indigo-200 text-[11px] leading-relaxed">
                <strong className="text-white">Option A Workflow:</strong> Confirm ownership of the retained account. A restoration request will be sent to administrators for review. Upon approval, all your messages, profile, and groups will be restored.
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Username or Email</label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Your username or email"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Original Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reason for Restoration (Optional)</label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Brief reason for restoring your account..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                <span>Submit Recovery Request</span>
              </button>
            </form>
          ) : (
            /* OPTION B: CREATE NEW SEPARATE ACCOUNT */
            <form onSubmit={handleCreateNewAccount} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-2xl text-slate-300 text-[11px] leading-relaxed">
                <strong className="text-white">Option B Workflow:</strong> Creates a brand-new internal account ID with no past messages or groups attached. Old account data will remain separately archived until the retention period expires.
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Registered Email</label>
                <input
                  type="email"
                  disabled
                  value={initialEmail || identifier}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">New Unique Username</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Choose a new username"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create a password (min 6 characters)"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-emerald-600/30"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                <span>Create Separate Account</span>
              </button>
            </form>
          )}

          <div className="pt-2 text-center">
            <Link to="/login" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
              ← Return to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
