import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, KeyRound, AlertCircle, ArrowRight, Mail, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PulseLogo } from '../components/common/PulseLogo';

export const LoginPage = () => {
  const { login, resendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  let from = '/chat';
  if (location.state?.from) {
    if (typeof location.state.from === 'string') {
      from = location.state.from;
    } else if (location.state.from?.pathname) {
      from = `${location.state.from.pathname}${location.state.from.search || ''}`;
    }
  }
  if (from === '/' || from.startsWith('/login') || from.startsWith('/register') || from.includes('undefined')) {
    from = '/chat';
  }

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendStatus, setResendStatus] = useState({ loading: false, msg: '', type: '' });
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setUnverifiedEmail('');
    setResendStatus({ loading: false, msg: '', type: '' });
    setLoading(true);

    try {
      await login(identifier, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.requiresRecovery) {
        navigate('/account-recovery', {
          state: {
            email: err.recoveryData?.email,
            username: err.recoveryData?.username,
            recoveryDeadline: err.recoveryData?.recoveryDeadline
          }
        });
        return;
      }
      if (err.requiresEmailVerification) {
        setUnverifiedEmail(err.email || identifier);
        setError(err.message || 'Email verification is mandatory before logging in.');
        return;
      }
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!unverifiedEmail && !identifier) return;
    setResendStatus({ loading: true, msg: '', type: '' });
    try {
      const data = await resendVerification(unverifiedEmail || identifier);
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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Creative Brand Logo */}
      <Link to="/" className="mb-8 group transition-transform duration-200 hover:scale-105 active:scale-95">
        <PulseLogo size="lg" animated={true} />
      </Link>

      {/* Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Welcome Back</h2>
          <p className="text-xs text-slate-400 mt-1">Sign in to your encrypted chat workspace</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-950/60 border border-rose-900 text-rose-400 rounded-2xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {unverifiedEmail && (
          <div className="mb-4 p-3.5 bg-amber-950/40 border border-amber-800/60 rounded-2xl text-xs space-y-2.5 animate-in fade-in">
            <div className="flex items-center space-x-2 text-amber-300 font-semibold">
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span>Email Verification Required</span>
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              Your account is not verified yet. Please click the verification link sent to your inbox, or click below to receive a new link.
            </p>
            <div className="pt-1 flex items-center justify-between">
              <button
                type="button"
                disabled={resendStatus.loading || resendCooldown > 0}
                onClick={handleResend}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl font-bold text-[11px] transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Send className="w-3 h-3" />
                <span>
                  {resendStatus.loading
                    ? 'Sending...'
                    : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend Verification Email'}
                </span>
              </button>
            </div>
            {resendStatus.msg && (
              <p className={`text-[11px] font-medium ${resendStatus.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {resendStatus.msg}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Username or Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="alice or alice@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <Link to="/reset-password" className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2 transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer link */}
        <div className="mt-6 text-center text-xs text-slate-400">
          Don't have an account yet?{' '}
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
};
