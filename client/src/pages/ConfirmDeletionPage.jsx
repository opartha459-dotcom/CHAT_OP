import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, CheckCircle2, AlertTriangle, Loader2, Clock, KeyRound, ArrowRight, Clipboard, Mail, Radio, Edit3 } from 'lucide-react';
import { PulseLogo } from '../components/common/PulseLogo';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export const ConfirmDeletionPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { logout, user } = useAuth();
  const { incomingCode, clearIncomingCode, watchEmail } = useSocket();
  const navigate = useNavigate();

  const urlEmail = searchParams.get('email') || '';
  const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('pulsechat_target_deletion_email') || '' : '';
  const [email, setEmail] = useState((urlEmail || user?.email || savedEmail || '').toLowerCase().trim());
  const [editingEmail, setEditingEmail] = useState(!email);

  const [code, setCode] = useState(token || '');
  const [status, setStatus] = useState(token ? 'confirming' : 'input'); // 'input' | 'confirming' | 'confirmed' | 'error'
  const [message, setMessage] = useState('');
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  // Sync email from auth user if email is empty
  useEffect(() => {
    if (!email && user?.email) {
      setEmail(user.email.toLowerCase().trim());
      setEditingEmail(false);
    }
  }, [user?.email, email]);

  // Watch for email socket notifications
  useEffect(() => {
    if (email && watchEmail) {
      watchEmail(email);
    }
  }, [email, watchEmail]);

  // Poll/Fetch latest dispatched code on mount in case admin already sent it
  useEffect(() => {
    if (!email || code) return;
    let isCancelled = false;

    fetch(`/api/auth/pending-code?email=${encodeURIComponent(email)}&action=account_deletion`)
      .then((r) => r.json())
      .then((data) => {
        if (!isCancelled && data.success && data.code) {
          setCode(data.code);
          setAutoFilled(true);
          setMessage(`Verification code ${data.code} dispatched by administrator! Click "Confirm & Delete Account" below.`);
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [email]);

  // Auto-fill from incoming real-time socket code from Admin
  useEffect(() => {
    if (incomingCode?.code && (!incomingCode.action || incomingCode.action === 'account_deletion')) {
      setCode(incomingCode.code);
      setAutoFilled(true);
      if (incomingCode.email && !email) {
        setEmail(incomingCode.email);
        setEditingEmail(false);
      }
      setMessage(`Verification code ${incomingCode.code} received from administrator! Click "Confirm & Delete Account" below.`);
    }
  }, [incomingCode]);

  // If token is provided in URL, auto-confirm
  useEffect(() => {
    if (token) {
      handleConfirm(token);
    }
  }, [token]);

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const cleaned = (text || '').replace(/\D/g, '').slice(0, 6);
      if (cleaned) {
        setCode(cleaned);
      }
    } catch {}
  };

  const handleConfirm = async (codeToSubmit) => {
    const finalCode = (codeToSubmit || code).trim();
    if (!finalCode) {
      setStatus('error');
      setMessage('Please enter your 6-digit confirmation code.');
      return;
    }

    setSubmitting(true);
    setStatus('confirming');
    setMessage('Processing deletion confirmation...');

    try {
      const res = await fetch('/api/auth/confirm-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: finalCode, token: finalCode, email: email || undefined })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatus('confirmed');
        setMessage(data.message);
        setDeadline(data.recoveryDeadline);
        if (clearIncomingCode) clearIncomingCode();
        try {
          localStorage.removeItem('pulsechat_target_deletion_email');
        } catch {}
        if (logout) logout();
      } else {
        setStatus('input');
        setMessage(data.message || 'Invalid or expired confirmation code.');
      }
    } catch (err) {
      setStatus('input');
      setMessage('Network error confirming deletion.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4 font-sans select-none">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
        <div className="flex justify-center">
          <PulseLogo size="md" animated={status === 'confirming'} />
        </div>

        {status === 'input' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleConfirm(code);
            }}
            className="space-y-4"
          >
            <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400 mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-rose-300">Confirm Account Deletion</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter the 6-digit verification code dispatched by the administrator.
              </p>
            </div>

            {/* Target Account Badge / Input */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 text-left">
              {!editingEmail && email ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 min-w-0">
                    <Mail className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Account</p>
                      <p className="text-xs text-white font-mono truncate">{email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-[10px] text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Live</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingEmail(true)}
                      className="text-slate-400 hover:text-white p-1 rounded transition"
                      title="Change email"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase font-semibold block">Account Email</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                      placeholder="user@example.com"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                    />
                    {email && (
                      <button
                        type="button"
                        onClick={() => setEditingEmail(false)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
                      >
                        Set
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {message && (
              <div className={`p-3 rounded-xl text-xs transition ${
                autoFilled
                  ? 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-300'
                  : 'bg-rose-950/40 border border-rose-800/60 text-rose-300'
              }`}>
                {message}
              </div>
            )}

            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, ''));
                    setAutoFilled(false);
                  }}
                  placeholder="123456"
                  className={`w-full text-center tracking-[0.5em] font-mono text-2xl py-3 px-4 bg-slate-950 border rounded-2xl text-white focus:outline-none focus:ring-2 transition ${
                    autoFilled
                      ? 'border-emerald-500/80 ring-2 ring-emerald-500/40 text-emerald-300'
                      : 'border-slate-700 focus:ring-rose-500/50'
                  }`}
                  autoFocus
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-white transition py-0.5 px-2 rounded hover:bg-slate-800/60 cursor-pointer"
                >
                  <Clipboard className="w-3 h-3" />
                  <span>Paste code</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || code.length < 6}
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-2xl text-xs transition cursor-pointer flex items-center justify-center space-x-2 shadow-lg shadow-rose-600/30"
            >
              <span>Confirm & Delete Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2">
              <Link to="/chat" className="text-xs text-slate-400 hover:text-white transition">
                Cancel and return to chat
              </Link>
            </div>
          </form>
        )}

        {status === 'confirming' && (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
            <h2 className="text-lg font-bold">Confirming Deletion...</h2>
            <p className="text-xs text-slate-400">{message}</p>
          </div>
        )}

        {status === 'confirmed' && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400 mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-rose-300">Account Marked for Deletion</h2>
            <p className="text-xs text-slate-300 leading-relaxed">{message}</p>
            <div className="p-3 bg-slate-800/80 rounded-2xl text-[11px] text-slate-400 leading-relaxed text-left border border-slate-700">
              <strong className="text-white block mb-1">How Recovery Works:</strong>
              If you log in with your credentials before the deadline, you will be offered the choice to submit an account recovery request to restore all your retained messages and groups.
            </div>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-block px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition"
              >
                Return to Login
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-950/80 border border-amber-800 flex items-center justify-center text-amber-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-amber-300">Action Expired or Invalid</h2>
            <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition"
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
