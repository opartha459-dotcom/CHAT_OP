import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  KeyRound,
  Copy,
  Check,
  ShieldCheck
} from 'lucide-react';
import { PulseLogo } from '../components/common/PulseLogo';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const urlEmail = searchParams.get('email') || '';

  const navigate = useNavigate();
  const { resendVerification } = useAuth();
  const { incomingCode, watchEmail } = useSocket();

  const [email, setEmail] = useState(urlEmail);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState(token ? 'verifying' : 'ready'); // 'verifying' | 'success' | 'ready'
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });
  const [copied, setCopied] = useState(false);
  const [redirectIn, setRedirectIn] = useState(4);

  // Watch socket room for this email
  useEffect(() => {
    if (email) {
      watchEmail(email);
    }
  }, [email, watchEmail]);

  // If incomingCode matches email or this page is waiting, auto-fill code!
  useEffect(() => {
    if (incomingCode?.code && (!incomingCode.action || incomingCode.action === 'email_verification')) {
      setCode(incomingCode.code);
      if (incomingCode.email && !email) {
        setEmail(incomingCode.email);
      }
      setFeedback({
        type: 'success',
        text: `Admin dispatched your code: ${incomingCode.code}. Click "Verify Account" below!`
      });
    }
  }, [incomingCode]);

  // Auto-verify if token is present in URL
  useEffect(() => {
    if (!token) return;

    const verify = async () => {
      setStatus('verifying');
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          setStatus('success');
        } else {
          setStatus('ready');
          setFeedback({
            type: 'error',
            text: data.message || 'Verification link is invalid or has expired.'
          });
        }
      } catch {
        setStatus('ready');
        setFeedback({ type: 'error', text: 'Network connection failed. Please try again.' });
      }
    };

    verify();
  }, [token]);

  // Countdown redirect on success
  useEffect(() => {
    if (status !== 'success') return;
    const interval = setInterval(() => {
      setRedirectIn((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate('/login', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status, navigate]);

  // Submit manual code verification
  const handleVerifyCode = async (e) => {
    e?.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode) {
      setFeedback({ type: 'error', text: 'Please enter the verification code.' });
      return;
    }

    setLoading(true);
    setFeedback({ text: '', type: '' });

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cleanCode,
          email: email.trim().toLowerCase()
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatus('success');
      } else {
        setFeedback({
          type: 'error',
          text: data.message || 'Invalid or expired verification code.'
        });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Request fresh code from admin
  const handleRequestCode = async () => {
    if (!email.trim()) {
      setFeedback({ type: 'error', text: 'Please enter your registered email address first.' });
      return;
    }

    setLoading(true);
    setFeedback({ text: '', type: '' });

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        watchEmail(email.trim().toLowerCase());
        setFeedback({
          type: 'success',
          text: 'Request sent to admin! The admin will send your code shortly.'
        });
      } else {
        setFeedback({
          type: 'error',
          text: data.message || 'Could not request code. Please check your email.'
        });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network error requesting code.' });
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

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl relative z-10 backdrop-blur-xl">
        <div className="flex justify-center">
          <PulseLogo size="md" animated={status === 'verifying' || loading} />
        </div>

        {status === 'verifying' && (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
            <h2 className="text-lg font-bold">Verifying Code...</h2>
            <p className="text-xs text-slate-400">Confirming your verification code, please wait.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 mx-auto shadow-lg">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-emerald-300">Email Verified!</h2>
            <p className="text-xs text-slate-300">Your account is fully activated. Welcome to PulseChat!</p>
            <p className="text-[11px] text-slate-500">
              Redirecting to Sign In in <span className="font-semibold text-white">{redirectIn}s</span>...
            </p>
            <Link
              to="/login"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2 text-xs shadow-lg shadow-indigo-600/25"
            >
              <span>Sign In Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {status === 'ready' && (
          <div className="space-y-5 text-left">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-white tracking-tight">Verify Your Account</h2>
              <p className="text-xs text-slate-400">
                Enter your registered email and the verification code sent by the admin.
              </p>
            </div>

            {/* Live Incoming Code Box from Admin */}
            {incomingCode?.code && (
              <div className="p-4 bg-indigo-950/60 border-2 border-indigo-500/60 rounded-2xl space-y-2 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-indigo-400 text-xs font-bold">
                    <KeyRound className="w-4 h-4" />
                    <span>Admin Dispatched Code</span>
                  </div>
                  <button
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
                  Click 'Verify Account' below to complete activation.
                </p>
              </div>
            )}

            {feedback.text && (
              <div
                className={`p-3 rounded-2xl text-xs flex items-center space-x-2 border ${
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

            <form onSubmit={handleVerifyCode} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    6-Digit Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={handleRequestCode}
                    disabled={loading}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    Request / Resend Code
                  </button>
                </div>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="e.g. 123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3.5 py-3 text-center tracking-widest font-mono font-bold text-lg bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Verify Account</span>
              </button>
            </form>

            <div className="pt-2 text-center border-t border-slate-800/80">
              <Link to="/login" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">
                Return to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
