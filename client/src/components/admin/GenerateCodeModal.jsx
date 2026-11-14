import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  Sparkles,
  Send,
  Loader2,
  Clock,
  User as UserIcon,
  Mail,
  ShieldAlert
} from 'lucide-react';

export const GenerateCodeModal = ({ isOpen, onClose, onGenerated, users = [], authHeaders }) => {
  const [targetType, setTargetType] = useState('select'); // 'select' | 'manual'
  const [selectedUserId, setSelectedUserId] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualUsername, setManualUsername] = useState('');
  const [action, setAction] = useState('email_verification');
  const [customCode, setCustomCode] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState('60');
  const [autoDispatch, setAutoDispatch] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Generate random 6-digit number
  const handleRandomizeCode = () => {
    const random = Math.floor(100000 + Math.random() * 900000).toString();
    setCustomCode(random);
  };

  useEffect(() => {
    if (isOpen) {
      handleRandomizeCode();
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let email = '';
    let username = '';
    let userId = null;

    if (targetType === 'select') {
      if (!selectedUserId) {
        setError('Please select a user from the list.');
        return;
      }
      const u = users.find((item) => item._id === selectedUserId);
      if (u) {
        userId = u._id;
        email = u.email;
        username = u.username;
      }
    } else {
      if (!manualEmail.trim()) {
        setError('Please provide a target email address.');
        return;
      }
      email = manualEmail.trim();
      username = manualUsername.trim();
    }

    if (customCode && !/^[0-9]{6}$/.test(customCode.trim())) {
      setError('Verification code must be exactly 6 digits.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/verification-codes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({
          userId,
          email,
          username,
          action,
          customCode: customCode.trim(),
          expiryMinutes: parseInt(expiryMinutes, 10),
          autoDispatch
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (onGenerated) onGenerated(data.code, data.message);
        onClose();
      } else {
        setError(data.message || 'Failed to generate verification code.');
      }
    } catch {
      setError('Network communication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Generate Verification Code
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Issue and assign an official verification code
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left overflow-y-auto max-h-[80vh]">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* User Target Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Target User / Identity
              </label>
              <div className="flex items-center space-x-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setTargetType('select')}
                  className={`font-semibold cursor-pointer ${
                    targetType === 'select'
                      ? 'text-indigo-600 dark:text-indigo-400 underline'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  From User List
                </button>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() => setTargetType('manual')}
                  className={`font-semibold cursor-pointer ${
                    targetType === 'manual'
                      ? 'text-indigo-600 dark:text-indigo-400 underline'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  Manual Email/Username
                </button>
              </div>
            </div>

            {targetType === 'select' ? (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">-- Choose User ({users.length} available) --</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    @{u.username} — {u.email} {u.isEmailVerified ? '(Verified)' : '(Unverified)'}
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Username (optional)"
                    value={manualUsername}
                    onChange={(e) => setManualUsername(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action / Purpose */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Action Purpose
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="email_verification">Email Verification (Account Activation)</option>
              <option value="password_reset">Password Reset</option>
              <option value="account_deletion">Account Deletion Authorization</option>
              <option value="account_recovery">Account Recovery Verification</option>
            </select>
          </div>

          {/* 6-Digit Code with Generator */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                6-Digit Verification Code
              </label>
              <button
                type="button"
                onClick={handleRandomizeCode}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer font-semibold"
              >
                <Sparkles className="w-3 h-3" />
                <span>Generate Random</span>
              </button>
            </div>

            <input
              type="text"
              required
              maxLength={6}
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 583921"
              className="w-full text-center text-xl font-mono font-bold tracking-widest bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 text-indigo-600 dark:text-indigo-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Expiration Duration */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Code Expiry Duration</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '15 Mins', value: '15' },
                { label: '1 Hour', value: '60' },
                { label: '24 Hours', value: '1440' },
                { label: '3 Days', value: '4320' }
              ].map((item) => (
                <button
                  type="button"
                  key={item.value}
                  onClick={() => setExpiryMinutes(item.value)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                    expiryMinutes === item.value
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-500'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Auto Dispatch Toggle */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Dispatch Live to User
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Broadcast code via Socket.IO directly to user's waiting screen
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoDispatch}
                onChange={(e) => setAutoDispatch(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition cursor-pointer flex items-center space-x-2"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{autoDispatch ? 'Generate & Dispatch' : 'Generate Code'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
