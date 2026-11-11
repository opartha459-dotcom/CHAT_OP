import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Lock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Mail,
  KeyRound,
  ArrowRight,
  Copy,
  Check,
  Send,
  ShieldCheck
} from 'lucide-react';
import { PulseLogo } from '../components/common/PulseLogo';
import { useSocket } from '../context/SocketContext';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const urlEmail = searchParams.get('email') || '';
  const navigate = useNavigate();
  const { incomingCode, watchEmail } = useSocket();

  const [email, setEmail] = useState(urlEmail);
  const [code, setCode] = useState(token || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(token ? 'reset' : 'request'); // 'request' | 'reset' | 'success'
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });
  const [copied, setCopied] = useState(false);

  // Watch socket room for this email
  useEffect(() => {
    if (email) {
      watchEmail(email);
    }
  }, [email, watchEmail]);

  // If incoming code is for password reset, auto-fill and advance to reset step!
  useEffect(() => {
    if (incomingCode?.code && (!incomingCode.action || incomingCode.action === 'password_reset')) {
      setCode(incomingCode.code);
      if (incomingCode.email && !email) {
        setEmail(incomingCode.email);
      }
      setStep('reset');
      setFeedback({
        type: 'success',
        text: `Admin dispatched your reset code: ${incomingCode.code}. Now choose your new password below!`
      });
    }
  }, [incomingCode]);

  // Step 1: Request reset code from admin
  const handleRequestCode = async (e) => {
    e?.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setFeedback({ type: 'error', text: 'Please enter your registered email address.' });
      return;
    }

    setLoading(true);
    setFeedback({ text: '', type: '' });

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        watchEmail(cleanEmail);
        setStep('reset');
        setFeedback({
          type: 'success',
          text: 'Reset code requested! An admin will send your code shortly.'
        });
      } else {
        setFeedback({
          type: 'error',
          text: data.message || 'Could not find an account with that email.'
        });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network connection failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset password with code
  const handleResetPassword = async (e) => {
    e?.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode) {
      setFeedback({ type: 'error', text: 'Please enter the reset code sent by the admin.' });
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
        body: JSON.stringify({
          code: cleanCode,
          token: cleanCode,
          email: email.trim().toLowerCase(),
          newPassword
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStep('success');
        setFeedback({
          type: 'success',
          text: 'Password updated successfully! Redirecting to login...'
        });
        setTimeout(() => navigate('/login', { replace: true }), 2500);
      } else {
        setFeedback({
          type: 'error',
          text: data.message || 'Invalid or expired password reset code.'
        });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network error resetting password.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (incomingCode?.code) {
      navigator.clipboard.writeText(incomingCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4 font-sans select-none relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-5 shadow-2xl relative z-10 backdrop-blur-xl">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <PulseLogo size="md" animated={loading} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            {step === 'success'
              ? 'Password Reset Complete'
              : step === 'reset'
              ? 'Enter Reset Code & New Password'
              : 'Forgot Your Password?'}
          </h1>
          <p className="text-xs text-slate-400">
            {step === 'success'
              ? 'You can now sign in with your new credentials.'
              : step === 'reset'
              ? 'Enter the 6-digit code provided by the administrator.'
              : 'Enter your registered email and an admin will send your reset code.'}
          </p>
        </div>

        {/* Live Admin Code Notification */}
        {incomingCode?.code && step !== 'success' && (
          <div className="p-4 bg-indigo-950/60 border-2 border-indigo-500/60 rounded-2xl space-y-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-indigo-400 text-xs font-bold">
                <KeyRound className="w-4 h-4" />
                <span>Admin Sent Reset Code</span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="text-[11px] px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center space-x-1 font-semibold transition cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="text-2xl font-mono font-black text-white tracking-widest text-center py-1 bg-slate-950/80 rounded-xl border border-indigo-500/30">
              {incomingCode.code}
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              Code auto-filled. Enter your new password below!
            </p>
          </div>
        )}

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

        {/* STEP 1: Request Code */}
        {step === 'request' && (
          <form onSubmit={handleRequestCode} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Registered Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-indigo-600/30"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Request Reset Code</span>
            </button>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep('reset')}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium hover:underline"
              >
                Already have a code?
              </button>
              <Link to="/login" className="text-[11px] text-slate-400 hover:text-white transition">
                Return to Login
              </Link>
            </div>
          </form>
        )}

        {/* STEP 2: Enter Code & New Password */}
        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Registered Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold">6-Digit Reset Code</label>
                <button
                  type="button"
                  onClick={handleRequestCode}
                  disabled={loading}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Resend / Request
                </button>
              </div>
              <input
                type="text"
                required
                maxLength={10}
                placeholder="e.g. 742918"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3.5 py-2.5 text-center tracking-widest font-mono font-bold text-base bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
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
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !code.trim() || !newPassword}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-indigo-600/30"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>Update Password</span>
            </button>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep('request')}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Back to email request
              </button>
              <Link to="/login" className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium">
                Return to Login
              </Link>
            </div>
          </form>
        )}

        {/* STEP 3: Success */}
        {step === 'success' && (
          <div className="space-y-4 pt-2 text-center animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 mx-auto shadow-lg">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <Link
              to="/login"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2 text-xs shadow-lg shadow-indigo-600/25"
            >
              <span>Go to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
