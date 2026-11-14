import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  KeyRound,
  Copy,
  Check,
  ShieldCheck,
  Phone,
  Clock,
  Info,
  RefreshCw,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { PulseLogo } from '../components/common/PulseLogo';
import { useSocket } from '../context/SocketContext';

// Verification Statuses:
// 1. Pending
// 2. Code Received
// 3. Verifying
// 4. Verified
// 5. Invalid Code
// 6. Code Expired

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const urlEmail = searchParams.get('email') || '';

  const navigate = useNavigate();
  const { socket, incomingCode, clearIncomingCode, watchEmail } = useSocket();

  const [email, setEmail] = useState(urlEmail);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState(token ? 'verifying' : 'pending');
  const [statusMessage, setStatusMessage] = useState(
    token
      ? 'Verifying token...'
      : 'Waiting for administrator to generate and dispatch your verification code.'
  );
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [redirectIn, setRedirectIn] = useState(4);

  // Official contact information state (dynamic from DB & socket)
  const [contact, setContact] = useState({
    phone: '+1 (555) 234-5678',
    displayPhone: '+1 (555) 234-5678',
    email: 'admin@pulsechat.internal',
    description: 'Official Administrator Support & Verification Line',
    availableHours: '24/7 Priority Support',
    instructions: 'Contact administration directly to receive your 6-digit verification code.',
    enabled: true
  });

  // Fetch official contact information
  const loadContactInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/system/contact');
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data?.contact && data.contact.enabled !== false) {
          setContact((prev) => ({ ...prev, ...data.contact }));
        }
      }
    } catch (err) {
      console.warn('Could not load official contact info', err);
    }
  }, []);

  useEffect(() => {
    loadContactInfo();
  }, [loadContactInfo]);

  // Listen for dynamic contact updates and code revocation from Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleContactUpdated = (updatedContact) => {
      if (updatedContact) {
        setContact((prev) => ({ ...prev, ...updatedContact }));
      }
    };

    const handleCodeRevoked = (data) => {
      if (!data?.email || data.email.toLowerCase() === email.toLowerCase()) {
        setStatus('code_expired');
        setStatusMessage(data.message || 'Your verification code was revoked or has expired. Please request a new code.');
      }
    };

    socket.on('system:contact_updated', handleContactUpdated);
    socket.on('auth:code_revoked', handleCodeRevoked);

    return () => {
      socket.off('system:contact_updated', handleContactUpdated);
      socket.off('auth:code_revoked', handleCodeRevoked);
    };
  }, [socket, email]);

  // Watch socket room for this email
  useEffect(() => {
    if (email) {
      watchEmail(email);
    }
  }, [email, watchEmail]);

  // Handle incoming code pushed from admin
  useEffect(() => {
    if (!incomingCode) return;

    if (incomingCode.revoked) {
      setStatus('code_expired');
      setStatusMessage('Your verification code has been revoked or expired by an administrator.');
      return;
    }

    if (incomingCode.code && (!incomingCode.action || incomingCode.action === 'email_verification')) {
      setCode(incomingCode.code);
      if (incomingCode.email && !email) {
        setEmail(incomingCode.email);
      }
      setStatus('code_received');
      setStatusMessage(`Administrator dispatched code ${incomingCode.code}. Ready to verify!`);
    }
  }, [incomingCode, email]);

  // Auto-verify if token is present in URL
  useEffect(() => {
    if (!token) return;

    const verifyToken = async () => {
      setStatus('verifying');
      setStatusMessage('Validating your verification token with the security server...');
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          setStatus('verified');
          setStatusMessage('Your account has been successfully verified! Redirecting to sign in...');
        } else {
          if (data.expired) {
            setStatus('code_expired');
            setStatusMessage(data.message || 'Verification link has expired. Please request a new code.');
          } else {
            setStatus('invalid_code');
            setStatusMessage(data.message || 'Verification link is invalid.');
          }
        }
      } catch {
        setStatus('invalid_code');
        setStatusMessage('Network connection failed. Please try again.');
      }
    };

    verifyToken();
  }, [token]);

  // Countdown redirect on verified status
  useEffect(() => {
    if (status !== 'verified') return;
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

  // Submit code for verification
  const handleVerifyCode = async (e) => {
    e?.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode) {
      setStatus('invalid_code');
      setStatusMessage('Please enter your 6-digit verification code.');
      return;
    }

    setLoading(true);
    setStatus('verifying');
    setStatusMessage('Validating code with the administrator security registry...');

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
        setStatus('verified');
        setStatusMessage('Account verified successfully! Welcome to PulseChat.');
        if (clearIncomingCode) clearIncomingCode();
      } else {
        if (data.expired) {
          setStatus('code_expired');
          setStatusMessage(data.message || 'This verification code has expired. Request a new code.');
        } else {
          setStatus('invalid_code');
          setStatusMessage(data.message || 'The verification code entered is invalid. Please double-check.');
        }
      }
    } catch {
      setStatus('invalid_code');
      setStatusMessage('Network communication error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Request code from administrator
  const handleRequestCode = async () => {
    if (!email.trim()) {
      setStatus('invalid_code');
      setStatusMessage('Please provide your registered email address to notify an administrator.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        watchEmail(email.trim().toLowerCase());
        setStatus('pending');
        setStatusMessage('Verification request queued. Administrator has been alerted to dispatch your code.');
      } else {
        setStatus('invalid_code');
        setStatusMessage(data.message || 'Could not queue code request. Please verify your email address.');
      }
    } catch {
      setStatus('invalid_code');
      setStatusMessage('Network error while requesting code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyPhone = () => {
    if (contact?.phone) {
      navigator.clipboard.writeText(contact.phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  // Status badge config
  const statusConfig = {
    pending: {
      label: 'Pending Admin Code',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      icon: Clock
    },
    code_received: {
      label: 'Code Received',
      badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      icon: KeyRound
    },
    verifying: {
      label: 'Verifying Code',
      badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      icon: Loader2
    },
    verified: {
      label: 'Verified',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      icon: CheckCircle2
    },
    invalid_code: {
      label: 'Invalid Code',
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      icon: XCircle
    },
    code_expired: {
      label: 'Code Expired',
      badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      icon: AlertTriangle
    }
  };

  const currentStatusMeta = statusConfig[status] || statusConfig.pending;
  const StatusIcon = currentStatusMeta.icon;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans select-none relative">
      {/* Background ambient accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[320px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative z-10 backdrop-blur-xl">
        {/* Logo and Header */}
        <div className="flex flex-col items-center space-y-3">
          <PulseLogo size="md" animated={status === 'verifying' || loading} />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Administrator Verification
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Secure administrative code verification system
            </p>
          </div>
        </div>

        {/* Informative Notice: Email Delivery Disabled */}
        <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl text-left space-y-1.5">
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold">
            <Info className="w-4 h-4 shrink-0" />
            <span>Email Verification Unavailable</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-300">
            Automated email delivery is intentionally disabled for this deployment. Verification codes are issued directly by system administrators in real-time.
          </p>
        </div>

        {/* Live Status Pill & Tracker */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] px-1">
            <span className="font-semibold text-slate-400 uppercase tracking-wider">Status</span>
            <div className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${currentStatusMeta.badgeClass}`}>
              <StatusIcon className={`w-3.5 h-3.5 ${status === 'verifying' ? 'animate-spin' : ''}`} />
              <span>{currentStatusMeta.label}</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80 text-left">
            {statusMessage}
          </p>
        </div>

        {/* Success / Verified Screen */}
        {status === 'verified' && (
          <div className="space-y-4 py-2 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-700 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-950/50">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-emerald-300">Account Activated</h2>
              <p className="text-xs text-slate-300">
                Your email identity has been confirmed. You may now sign in and begin messaging.
              </p>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Redirecting to Sign In in <span className="font-bold text-white">{redirectIn}s</span>...
            </p>
            <Link
              to="/login"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition flex items-center justify-center space-x-2 text-xs shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <span>Sign In Immediately</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Verification Form (When not verified) */}
        {status !== 'verified' && (
          <div className="space-y-4 text-left">
            {/* Live Incoming Code Box (when admin dispatches) */}
            {status === 'code_received' && code && (
              <div className="p-4 bg-indigo-950/50 border-2 border-indigo-500/70 rounded-2xl space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-indigo-300 text-xs font-bold">
                    <KeyRound className="w-4 h-4" />
                    <span>Dispatched Verification Code</span>
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
                <div className="text-3xl font-mono font-black text-white tracking-widest text-center py-2 bg-slate-950/80 rounded-xl border border-indigo-500/30 select-all">
                  {code}
                </div>
                <p className="text-[11px] text-indigo-300 text-center font-medium">
                  Code auto-filled. Click "Verify Account" below to complete activation.
                </p>
              </div>
            )}

            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    6-Digit Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={handleRequestCode}
                    disabled={loading || !email.trim()}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer disabled:opacity-40 transition flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    <span>Request / Resend Code</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="• • • • • •"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3.5 py-3 text-center tracking-[0.35em] font-mono font-bold text-xl bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !code.trim() || status === 'verifying'}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                {loading || status === 'verifying' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>Verify Account</span>
              </button>
            </form>
          </div>
        )}

        {/* Dynamic Administrator Contact Section */}
        {contact?.enabled && (
          <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-2xl text-left space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                <span>Official Administrator Contact</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {contact.availableHours || 'Active'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              {contact.instructions || 'Contact the administrator to receive your verification code or request expedited activation.'}
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-950/80 border border-indigo-800/50 flex items-center justify-center text-indigo-400 shrink-0">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <div>
                  <a
                    href={`tel:${contact.phone}`}
                    className="text-xs font-mono font-bold text-indigo-300 hover:underline"
                  >
                    {contact.displayPhone || contact.phone}
                  </a>
                  <div className="text-[10px] text-slate-400">{contact.description}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyPhone}
                className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center space-x-1.5 transition cursor-pointer self-start sm:self-center"
              >
                {copiedPhone ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedPhone ? 'Copied' : 'Copy Number'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Return Links */}
        <div className="pt-2 text-center border-t border-slate-800/80 flex items-center justify-center space-x-4 text-xs text-slate-400">
          <Link to="/login" className="hover:text-indigo-400 transition font-medium">
            Return to Sign In
          </Link>
          <span>•</span>
          <Link to="/register" className="hover:text-indigo-400 transition font-medium">
            Create Different Account
          </Link>
        </div>
      </div>
    </div>
  );
};
