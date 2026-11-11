import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, User, Mail, KeyRound, AlertCircle, ArrowRight, Sparkles, CheckCircle2, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import { useMaintenance } from '../context/MaintenanceContext';
import { PulseLogo } from '../components/common/PulseLogo';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80'
];

export const RegisterPage = () => {
  const { register, resendVerification } = useAuth();
  const { featureFlags } = useFeatureFlags();
  const { isFeatureInMaintenance } = useMaintenance();
  const navigate = useNavigate();
  const location = useLocation();

  const isRegistrationInMaintenance = isFeatureInMaintenance('registration');
  const isRegistrationDisabled = featureFlags.userRegistrationEnabled === false || isRegistrationInMaintenance;

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

  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registeredSuccess, setRegisteredSuccess] = useState(null);
  const [resendStatus, setResendStatus] = useState({ loading: false, msg: '', type: '' });
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await register({
        username: username.trim().toLowerCase(),
        nickname: nickname.trim() || username.trim(),
        email: email.trim().toLowerCase(),
        password,
        avatar: selectedAvatar
      });

      if (res?.requiresEmailVerification) {
        setRegisteredSuccess({
          email: email.trim().toLowerCase(),
          username: username.trim().toLowerCase()
        });
        return;
      }
      navigate(from, { replace: true });
    } catch (err) {
      if (err.requiresRecovery) {
        navigate('/account-recovery', {
          state: {
            email: err.recoveryData?.email || email.trim().toLowerCase(),
            username: err.recoveryData?.username,
            recoveryDeadline: err.recoveryData?.recoveryDeadline
          }
        });
        return;
      }
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!registeredSuccess?.email) return;
    setResendStatus({ loading: true, msg: '', type: '' });
    try {
      await resendVerification(registeredSuccess.email);
      // Navigate to the waiting page so user sees clear "check your inbox" UI
      navigate(`/verify-email?waiting=true&email=${encodeURIComponent(registeredSuccess.email)}`, { replace: true });
    } catch (err) {
      setResendStatus({ loading: false, msg: err.message || 'Failed to resend email.', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[320px] bg-indigo-600/15 rounded-full blur-[130px] pointer-events-none" />

      {/* Creative Brand Logo */}
      <Link to="/" className="mb-8 group transition-transform duration-200 hover:scale-105 active:scale-95">
        <PulseLogo size="lg" animated={true} />
      </Link>

      {/* Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
        {registeredSuccess ? (
          <div className="text-center space-y-4 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-950/40">
              <Mail className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Verify Your Email</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              We've sent a verification link to <span className="font-bold text-white">{registeredSuccess.email}</span>.
              Please check your inbox and click the link to activate your account.
            </p>

            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-[11px] text-slate-400 space-y-1">
              <p>Email verification is mandatory before you can sign in.</p>
              <p className="text-[10px] text-slate-500">Didn't receive the email? Check your spam/junk folder.</p>
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="button"
                disabled={resendStatus.loading || resendCooldown > 0}
                onClick={handleResend}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {resendStatus.loading
                    ? 'Resending Email...'
                    : resendCooldown > 0
                    ? `Resend available in ${resendCooldown}s`
                    : 'Resend Verification Email'}
                </span>
              </button>

              {resendStatus.msg && (
                <p className={`text-xs font-medium ${resendStatus.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {resendStatus.msg}
                </p>
              )}

              <Link
                to="/login"
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2 transition hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight">Create Your Account</h2>
              <p className="text-xs text-slate-400 mt-1">End-to-End Encrypted messaging starts here</p>
            </div>

            {isRegistrationDisabled && (
              <div className="mb-4 p-3 bg-amber-950/60 border border-amber-900 text-amber-300 rounded-2xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span>
                  {isRegistrationInMaintenance
                    ? 'User registration is temporarily unavailable due to scheduled maintenance.'
                    : 'New user registration is currently disabled by administrators.'}
                </span>
              </div>
            )}

        {error && (
          <div className="mb-4 p-3 bg-rose-950/60 border border-rose-900 text-rose-400 rounded-2xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Avatar selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 text-center">
              Choose Avatar
            </label>
            <div className="flex items-center justify-center space-x-2.5">
              {PRESET_AVATARS.map((avUrl, i) => (
                <img
                  key={i}
                  src={avUrl}
                  alt={`Avatar ${i}`}
                  onClick={() => setSelectedAvatar(avUrl)}
                  className={`w-9 h-9 rounded-full object-cover cursor-pointer transition ring-2 ${
                    selectedAvatar === avUrl
                      ? 'ring-indigo-500 scale-110'
                      : 'ring-transparent opacity-60 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Username *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                minLength={3}
                maxLength={30}
                placeholder="alice_wonder"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Display Name (Nickname)
            </label>
            <input
              type="text"
              maxLength={50}
              placeholder="Alice"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="alice@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Password * (min 6 characters)
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || isRegistrationDisabled}
            className="w-full py-3 px-4 mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2 transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>{loading ? 'Creating Account & Keys...' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">
            Sign In
          </Link>
        </div>
          </>
        )}
      </div>
    </div>
  );
};
