import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Loader2, ArrowRight, Mail, Send } from 'lucide-react';
import { PulseLogo } from '../components/common/PulseLogo';
import { useAuth } from '../context/AuthContext';

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const urlEmail = searchParams.get('email') || '';
  const isWaiting = searchParams.get('waiting') === 'true' || searchParams.get('sent') === 'true';

  const navigate = useNavigate();
  const { resendVerification } = useAuth();

  const [status, setStatus] = useState(token ? 'verifying' : isWaiting ? 'waiting' : 'prompt');
  const [message, setMessage] = useState('Verifying your email address...');
  const [resendEmail, setResendEmail] = useState(urlEmail);
  const [resendStatus, setResendStatus] = useState({ loading: false, msg: '', type: '' });
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!token) {
      if (isWaiting) {
        setStatus('waiting');
        setMessage(`Verification link has been sent to ${urlEmail || 'your email'}.`);
      } else {
        setStatus('prompt');
      }
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          setStatus('success');
          setMessage(data.message || 'Your email has been verified successfully!');
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification link is invalid or has expired.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Network error verifying email.');
      }
    };

    verify();
  }, [token, isWaiting, urlEmail]);

  const handleResend = async (e) => {
    e?.preventDefault();
    if (!resendEmail) return;

    setResendStatus({ loading: true, msg: '', type: '' });
    try {
      const data = await resendVerification(resendEmail);
      setResendStatus({ loading: false, msg: data.message || 'Verification email resent!', type: 'success' });
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setResendStatus({ loading: false, msg: err.message || 'Failed to resend email.', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4 font-sans select-none relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl relative z-10 backdrop-blur-xl">
        <div className="flex justify-center">
          <PulseLogo size="md" animated={status === 'verifying'} />
        </div>

        {/* 1. VERIFYING STATE */}
        {status === 'verifying' && (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
            <h2 className="text-lg font-bold">Verifying Email...</h2>
            <p className="text-xs text-slate-400">{message}</p>
          </div>
        )}

        {/* 2. SUCCESS STATE */}
        {status === 'success' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-950/40">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-emerald-300">Email Verified!</h2>
            <p className="text-xs text-slate-300 leading-relaxed">{message}</p>
            <p className="text-[11px] text-slate-400">
              Your account is now fully activated. Please sign in to access encrypted chats.
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2 text-xs shadow-lg shadow-indigo-600/25"
              >
                <span>Sign In to PulseChat</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* 3. WAITING FOR EMAIL VERIFICATION STATE */}
        {status === 'waiting' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-indigo-950/80 border border-indigo-800 flex items-center justify-center text-indigo-400 mx-auto shadow-lg shadow-indigo-950/40">
              <Mail className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Check Your Inbox</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              We've dispatched a verification link to <span className="font-bold text-white">{urlEmail || 'your email'}</span>.
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Click the link inside the email to verify your address. Once verified, you can sign in directly.
            </p>

            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                disabled={resendStatus.loading || resendCooldown > 0}
                onClick={handleResend}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {resendStatus.loading
                    ? 'Resending...'
                    : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend Verification Email'}
                </span>
              </button>

              {resendStatus.msg && (
                <p className={`text-[11px] font-medium ${resendStatus.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {resendStatus.msg}
                </p>
              )}

              <Link
                to="/login"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2 text-xs"
              >
                <span>Back to Sign In</span>
              </Link>
            </div>
          </div>
        )}

        {/* 4. ERROR OR PROMPT STATE */}
        {(status === 'error' || status === 'prompt') && (
          <div className="space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400 mx-auto shadow-lg shadow-rose-950/40">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-rose-300">
              {status === 'error' ? 'Verification Failed' : 'Verify Your Email'}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {status === 'error' ? message : 'Enter your email address below to receive a new verification link.'}
            </p>

            {/* Resend form */}
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
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={resendStatus.loading || resendCooldown > 0 || !resendEmail}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {resendStatus.loading
                    ? 'Dispatching Link...'
                    : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Send Verification Link'}
                </span>
              </button>

              {resendStatus.msg && (
                <p className={`text-[11px] text-center font-medium ${resendStatus.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {resendStatus.msg}
                </p>
              )}
            </form>

            <div className="pt-2 border-t border-slate-800/80">
              <Link
                to="/login"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold hover:underline"
              >
                Return to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
