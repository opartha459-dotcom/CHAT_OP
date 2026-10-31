import React, { useState, useEffect } from 'react';
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
  Loader2,
  Hourglass,
  Mail,
  ShieldCheck,
  MessageSquare,
  Users,
  PhoneCall,
  Image,
  User,
  Send
} from 'lucide-react';
import { PulseLogo } from '../components/common/PulseLogo';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

// ── Available data items users can request from their old account ─────────────
const DATA_ITEMS = [
  { key: 'chats',        label: 'Chat History',           icon: MessageSquare, desc: 'All messages from your old chats and groups' },
  { key: 'contacts',     label: 'Contacts & Friends',     icon: Users,         desc: 'Your friend list and contact details' },
  { key: 'call_history', label: 'Call History',           icon: PhoneCall,     desc: 'Records of voice and video calls' },
  { key: 'media',        label: 'Shared Media & Files',   icon: Image,         desc: 'Photos, videos, and files you shared' },
  { key: 'profile',      label: 'Profile Info & Bio',     icon: User,          desc: 'Your old username, bio, and avatar' },
];

export const AccountRecoveryPage = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { setToken, setUser } = useAuth();
  const { socket } = useSocket() || {};

  const initialEmail     = location.state?.email || new URLSearchParams(location.search).get('email') || '';
  const initialUsername  = location.state?.username || '';
  const recoveryDeadline = location.state?.recoveryDeadline || '';

  const [selectedOption, setSelectedOption] = useState('recover');
  const [identifier, setIdentifier] = useState(initialEmail || initialUsername);
  const [password, setPassword]     = useState('');
  const [reason, setReason]         = useState('');

  // Option B inputs
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // ── Option A: submitted → waiting screen ─────────────────────────────────
  const [submitted, setSubmitted]       = useState(false);
  const [requestId, setRequestId]       = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');

  // ── Option B: account created → data-item selection ──────────────────────
  const [newAccountCreated, setNewAccountCreated]       = useState(false);
  const [recoveryRequestId, setRecoveryRequestId]       = useState('');
  const [newAccountUsername_, setNewAccountUsername_]   = useState('');
  const [hasPendingOld, setHasPendingOld]               = useState(false);

  // Data-item selection state
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [itemsSubmitting, setItemsSubmitting] = useState(false);
  const [itemsSubmitted, setItemsSubmitted]   = useState(false);
  const [itemsError, setItemsError]           = useState('');

  // ── Real-time: listen for admin decision via socket ───────────────────────
  useEffect(() => {
    if (!socket || !recoveryRequestId) return;
    const handler = (data) => {
      if (data.requestId?.toString() === recoveryRequestId) {
        if (data.items) {
          // Update items in real-time (no reload needed)
          setItemsSubmitted(true);
        }
      }
    };
    socket.on('recovery:item_decision', handler);
    socket.on('recovery:decision', handler);
    return () => {
      socket.off('recovery:item_decision', handler);
      socket.off('recovery:decision', handler);
    };
  }, [socket, recoveryRequestId]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleRecoverOldAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/auth/recover-account', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ identifier, password, reason })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
        setRequestId(data.requestId || '');
        setSubmittedEmail(initialEmail || identifier);
      } else {
        setError(data.message || 'Verification failed. Please check your password.');
      }
    } catch {
      setError('Network connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/auth/create-alternative-account', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email:       initialEmail || identifier,
          password:    newPassword,
          newUsername: newUsername.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Store token
        if (data.token) {
          localStorage.setItem('pulsechat_token', data.token);
          if (setToken) setToken(data.token);
          if (setUser)  setUser(data.user);
        }
        setNewAccountUsername_(data.user?.username || newUsername.trim());
        setHasPendingOld(!!data.hasPendingOldAccount);
        setRecoveryRequestId(data.recoveryRequestId || '');
        setNewAccountCreated(true);
      } else {
        setError(data.message || 'Could not create new account.');
      }
    } catch {
      setError('Network connection error.');
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (key) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleRequestItems = async () => {
    if (selectedItems.size === 0) { setItemsError('Select at least one data type.'); return; }
    setItemsSubmitting(true);
    setItemsError('');
    try {
      const res  = await fetch('/api/auth/request-data-items', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          recoveryRequestId,
          items: Array.from(selectedItems)
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setItemsSubmitted(true);
      } else {
        setItemsError(data.message || 'Failed to submit request.');
      }
    } catch {
      setItemsError('Network error. Please try again.');
    } finally {
      setItemsSubmitting(false);
    }
  };

  // ── SCREEN: Option A waiting-for-review ───────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 font-sans select-none">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex justify-center"><PulseLogo size="md" animated={false} /></div>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-5">
            <div className="w-16 h-16 rounded-full bg-amber-950/60 border border-amber-700/60 flex items-center justify-center text-amber-400 mx-auto">
              <Hourglass className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">Recovery Request Submitted</h2>
              <p className="text-xs text-amber-300 font-semibold uppercase tracking-wider">Pending Administrator Review</p>
            </div>
            <div className="space-y-3 text-left">
              <div className="flex items-start space-x-3 p-3 bg-slate-800/60 border border-slate-700/60 rounded-2xl">
                <ShieldCheck className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-200 font-semibold">What happens next?</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                    An administrator will verify ownership and review your request. Typically <span className="text-slate-200 font-medium">1–3 business days</span>.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-slate-800/60 border border-slate-700/60 rounded-2xl">
                <Mail className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-200 font-semibold">Email notification</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    You'll receive an email at <span className="text-indigo-300 font-semibold">{submittedEmail || 'your email'}</span> once reviewed.
                  </p>
                </div>
              </div>
              {recoveryDeadline && (
                <div className="flex items-start space-x-3 p-3 bg-amber-950/30 border border-amber-800/40 rounded-2xl">
                  <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-200 font-semibold">Retention deadline</p>
                    <p className="text-[11px] text-amber-300 mt-0.5">
                      Data retained until <span className="font-bold">{new Date(recoveryDeadline).toLocaleDateString()}</span>.
                    </p>
                  </div>
                </div>
              )}
              {requestId && (
                <div className="p-3 bg-slate-950/80 border border-slate-700 rounded-2xl text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Reference ID</p>
                  <p className="text-xs font-mono text-slate-300 break-all">{requestId}</p>
                </div>
              )}
            </div>
            <div className="pt-1 space-y-2">
              <Link to="/login" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2 text-xs shadow-lg shadow-indigo-600/25">
                <span>Return to Sign In</span><ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-[10px] text-slate-500">You can close this page — we'll email you when done.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── SCREEN: Option B — account created, choose data to request ────────────
  if (newAccountCreated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 font-sans select-none">
        <div className="w-full max-w-md space-y-5">
          <div className="flex justify-center"><PulseLogo size="md" animated={false} /></div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            {/* Header */}
            <div className="text-center space-y-1">
              <div className="w-14 h-14 rounded-full bg-emerald-950/60 border border-emerald-700/60 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-white mt-2">Account Created!</h2>
              {newAccountUsername_ && (
                <p className="text-xs text-slate-400">Signed in as <span className="text-indigo-300 font-semibold">@{newAccountUsername_}</span></p>
              )}
            </div>

            {/* Data-item request section */}
            {hasPendingOld && !itemsSubmitted && (
              <>
                <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-2xl text-[11px] text-amber-200 leading-relaxed">
                  <strong className="text-amber-100">Your old account data is archived.</strong> Select what you'd like to request from it — an admin will review and approve each item separately.
                </div>

                <div className="space-y-2">
                  {DATA_ITEMS.map(({ key, label, icon: Icon, desc }) => {
                    const checked = selectedItems.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleItem(key)}
                        className={`w-full flex items-center space-x-3 p-3 rounded-2xl border text-left transition ${
                          checked
                            ? 'bg-indigo-600/20 border-indigo-500/60 text-white'
                            : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${checked ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold">{label}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition ${checked ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600'}`}>
                          {checked && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {itemsError && (
                  <div className="flex items-center space-x-2 p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" /><span>{itemsError}</span>
                  </div>
                )}

                <div className="flex space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={handleRequestItems}
                    disabled={itemsSubmitting || selectedItems.size === 0}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2 text-xs"
                  >
                    {itemsSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{itemsSubmitting ? 'Sending...' : `Request ${selectedItems.size > 0 ? selectedItems.size : ''} Item${selectedItems.size !== 1 ? 's' : ''}`}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/chat', { replace: true })}
                    className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition text-xs"
                  >
                    Skip
                  </button>
                </div>
              </>
            )}

            {/* After items submitted / no old account */}
            {(itemsSubmitted || !hasPendingOld) && (
              <div className="space-y-3">
                {itemsSubmitted && (
                  <div className="flex items-start space-x-3 p-3 bg-amber-950/30 border border-amber-800/40 rounded-2xl">
                    <Hourglass className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-200 font-semibold">Data request submitted!</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        An admin will review each item and approve or reject them. You'll be notified in real-time and via email.
                      </p>
                    </div>
                  </div>
                )}
                {!hasPendingOld && (
                  <div className="flex items-start space-x-3 p-3 bg-slate-800/60 border border-slate-700/60 rounded-2xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-200 font-semibold">Fresh start</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">No old account was found for this email — your new account is ready to use.</p>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/chat', { replace: true })}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2 text-xs shadow-lg shadow-indigo-600/25"
                >
                  <span>Go to Chat</span><ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── SCREEN: Normal form ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 font-sans select-none">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2"><PulseLogo size="md" animated={false} /></div>
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
            onClick={() => { setSelectedOption('recover'); setError(''); }}
            className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer ${
              selectedOption === 'recover' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <RotateCcw className="w-4 h-4" /><span>Option A: Recover Old</span>
          </button>
          <button
            type="button"
            onClick={() => { setSelectedOption('new'); setError(''); }}
            className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer ${
              selectedOption === 'new' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" /><span>Option B: New Account</span>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3.5 rounded-2xl text-xs flex items-center space-x-2.5 border bg-rose-950/60 border-rose-800 text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0" /><span>{error}</span>
          </div>
        )}

        {/* Form Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          {selectedOption === 'recover' ? (
            <form onSubmit={handleRecoverOldAccount} className="space-y-4 text-xs">
              <div className="p-3 bg-indigo-950/40 border border-indigo-900/60 rounded-2xl text-indigo-200 text-[11px] leading-relaxed">
                <strong className="text-white">Option A Workflow:</strong> Confirm ownership of the retained account. A restoration request will be sent to administrators for review. Upon approval, all your messages, profile, and groups will be restored.
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Username or Email</label>
                <input
                  type="text" required value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="Your username or email"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Original Password</label>
                <input
                  type="password" required value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reason for Restoration (Optional)</label>
                <textarea
                  rows={2} value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Brief reason for restoring your account..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                <span>{loading ? 'Submitting...' : 'Submit Recovery Request'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreateNewAccount} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-2xl text-slate-300 text-[11px] leading-relaxed">
                <strong className="text-white">Option B Workflow:</strong> Creates a brand-new account. Then you can <strong className="text-amber-300">selectively request</strong> specific data from your old account (chats, contacts, calls, media, profile). Admin approves each item separately.
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Registered Email</label>
                <input
                  type="email" disabled value={initialEmail || identifier}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">New Unique Username</label>
                <input
                  type="text" required value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder="Choose a new username"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">New Password</label>
                <input
                  type="password" required value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Create a password (min 6 characters)"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-emerald-600/30"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                <span>{loading ? 'Creating Account...' : 'Create Separate Account'}</span>
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
