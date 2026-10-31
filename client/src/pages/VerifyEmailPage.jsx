import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Loader2, ArrowRight, Mail, Send, RefreshCw } from 'lucide-react';
import { PulseLogo } from '../components/common/PulseLogo';
import { useAuth } from '../context/AuthContext';

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token     = searchParams.get('token');
  const urlEmail  = searchParams.get('email') || '';
  const isWaiting = searchParams.get('waiting') === 'true' || searchParams.get('sent') === 'true';

  const navigate = useNavigate();
  const { resendVerification } = useAuth();

  // ── Core state ──────────────────────────────────────────────────────────────
  // status: 'verifying' | 'success' | 'waiting' | 'error' | 'prompt'
  const [status, setStatus]           = useState(token ? 'verifying' : isWaiting ? 'waiting' : 'prompt');
  const [errorMessage, setErrorMessage] = useState('');

  // Track email resend
  const [resendEmail, setResendEmail]   = useState(urlEmail);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError]   = useState('');
  const [emailSent, setEmailSent]       = useState(false);   // ← the tracking variable
  const [sentToEmail, setSentToEmail]   = useState('');      // which address was it sent to

  // Cooldown timer
  const [cooldown, setCooldown]         = useState(0);
  const cooldownRef                     = useRef(null);

  // Auto-redirect countdown after success
  const [redirectIn, setRedirectIn]     = useState(5);

  // ── Auto-verify when token in URL ──────────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    const verify = async () => {
      try {
        const res  = await fetch('/api/auth/verify-email', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ token })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          setStatus('success');
        } else if (data.expired) {
          // Backend auto-sent a new email OR token was cleared — tell user
          setEmailSent(true);
          setSentToEmail(data.email || urlEmail);
          setErrorMessage(data.message || 'Link expired. A fresh verification email has been sent.');
          setStatus('error');
        } else {
          setStatus('error');
          setErrorMessage(data.message || 'Verification link is invalid or has expired.');
        }
      } catch {
        setStatus('error');
        setErrorMessage('Network error. Please check your connection and try again.');
      }
    };

    verify();
  }, [token, urlEmail]);

  // ── Auto-redirect to /login after success ──────────────────────────────────
  useEffect(() => {
    if (status !== 'success') return;
    const interval = setInterval(() => {
      setRedirectIn(prev => {
        if (prev <= 1) { clearInterval(interval); navigate('/login', { replace: true }); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status, navigate]);

  // ── Cooldown helper ────────────────────────────────────────────────────────
  const startCooldown = () => {
    setCooldown(60);
    clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Handle resend ──────────────────────────────────────────────────────────
  const handleResend = async (e) => {
    e?.preventDefault();
    const addr = resendEmail.trim();
    if (!addr) return;

    setResendLoading(true);
    setResendError('');

    try {
      await resendVerification(addr);
      // ✅ Mark email as sent — this drives the success view
      setEmailSent(true);
      setSentToEmail(addr);
      startCooldown();
    } catch (err) {
      setResendError(err.message || 'Failed to send email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  // ── Resend form (shared between error + prompt states) ────────────────────
  const ResendForm = () => (
    <form onSubmit={handleResend} className="space-y-2.5 pt-1 text-left">
      <div>
        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Email Address
        </label>
        <input
          type="email"
          required
          placeholder="your.email@example.com"
          value={resendEmail}
          onChange={e => setResendEmail(e.target.value)}
          className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {resendError && (
        <p className="text-[11px] text-rose-400 font-medium">{resendError}</p>
      )}

      <button
        type="submit"
        disabled={resendLoading || cooldown > 0 || !resendEmail}
        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-md"
      >
        {resendLoading
          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Sending...</span></>
          : cooldown > 0
          ? <><RefreshCw className="w-3.5 h-3.5" /><span>Resend in {cooldown}s</span></>
          : <><Send className="w-3.5 h-3.5" /><span>Send Verification Link</span></>}
      </button>
    </form>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4 font-sans select-none relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl relative z-10 backdrop-blur-xl">
        <div className="flex justify-center">
          <PulseLogo size="md" animated={status === 'verifying'} />
        </div>

        {/* ── VERIFYING ──────────────────────────────────────────────────────── */}
        {status === 'verifying' && (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
            <h2 className="text-lg font-bold">Verifying Email...</h2>
            <p className="text-xs text-slate-400">Confirming your link, please wait.</p>
          </div>
        )}

        {/* ── SUCCESS ────────────────────────────────────────────────────────── */}
        {status === 'success' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 mx-auto shadow-lg">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-emerald-300">Email Verified!</h2>
            <p className="text-xs text-slate-300">Your account is now fully activated. Welcome to PulseChat!</p>
            <p className="text-[11px] text-slate-500">
              Redirecting to Sign In in <span className="font-semibold text-white">{redirectIn}s</span>…
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

        {/* ── EMAIL SENT SUCCESS ─────────────────────────────────────────────── */}
        {/* This shows whenever emailSent === true, regardless of current status */}
        {emailSent && status !== 'success' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 mx-auto shadow-lg">
              <Mail className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Check Your Inbox!</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              A fresh verification link was sent to{' '}
              <span className="font-bold text-indigo-300">{sentToEmail || 'your email'}</span>.
              <br />Click the link inside to activate your account.
            </p>

            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-[11px] text-emerald-300 font-medium">
              ✅ Email dispatched successfully
            </div>

            <p className="text-[11px] text-slate-500">
              Not in inbox? Check your <span className="text-slate-300">spam / junk</span> folder.
            </p>

            <div className="pt-1 space-y-2">
              {/* Allow resend again after cooldown */}
              <button
                type="button"
                disabled={cooldown > 0}
                onClick={() => { setEmailSent(false); setResendError(''); }}
                className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-semibold text-xs rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{cooldown > 0 ? `Resend available in ${cooldown}s` : "Didn't receive it? Resend"}</span>
              </button>
              <Link
                to="/login"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center justify-center text-xs"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        )}

        {/* ── WAITING (came from register/login resend) ───────────────────── */}
        {status === 'waiting' && !emailSent && (
          <div className="space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-indigo-950/80 border border-indigo-800 flex items-center justify-center text-indigo-400 mx-auto shadow-lg">
              <Mail className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Check Your Inbox</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              A verification link was sent to{' '}
              <span className="font-bold text-white">{urlEmail || 'your email'}</span>.
            </p>
            <p className="text-[11px] text-slate-500">Didn't get it? Check spam or resend below.</p>

            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                disabled={resendLoading || cooldown > 0 || !resendEmail}
                onClick={handleResend}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center space-x-2"
              >
                {resendLoading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Resending...</span></>
                  : cooldown > 0
                  ? <><RefreshCw className="w-3.5 h-3.5" /><span>Resend in {cooldown}s</span></>
                  : <><Send className="w-3.5 h-3.5" /><span>Resend Verification Email</span></>}
              </button>
              <Link to="/login" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center justify-center text-xs">
                Back to Sign In
              </Link>
            </div>
          </div>
        )}

        {/* ── ERROR (link invalid/expired) — show resend form ────────────── */}
        {status === 'error' && !emailSent && (
          <div className="space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400 mx-auto shadow-lg">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-rose-300">Link Expired</h2>
            <p className="text-xs text-slate-400 leading-relaxed">{errorMessage}</p>
            <p className="text-[11px] text-slate-500">Enter your email to receive a brand-new verification link.</p>

            <ResendForm />

            <div className="pt-1 border-t border-slate-800/80">
              <Link to="/login" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">
                Return to Login
              </Link>
            </div>
          </div>
        )}

        {/* ── PROMPT (no token, no waiting param) ───────────────────────── */}
        {status === 'prompt' && !emailSent && (
          <div className="space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
              <Mail className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Verify Your Email</h2>
            <p className="text-xs text-slate-400">Enter your email to receive a verification link.</p>

            <ResendForm />

            <div className="pt-1 border-t border-slate-800/80">
              <Link to="/login" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">
                Return to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
