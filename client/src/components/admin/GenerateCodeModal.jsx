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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-[#1E1833] border border-violet-900/40 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col text-white">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-violet-900/40 flex items-center justify-between bg-[#161226]">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Generate Verification Code
              </h3>
              <p className="text-[11px] sm:text-xs text-violet-300/70">
                Issue and assign an official verification code
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-violet-400 hover:text-white rounded-xl hover:bg-violet-900/30 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-left overflow-y-auto max-h-[80vh]">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 text-rose-300 rounded-xl text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* User Target Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-violet-200">
                Target User / Identity
              </label>
              <div className="flex items-center space-x-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setTargetType('select')}
                  className={`font-semibold cursor-pointer ${
                    targetType === 'select'
                      ? 'text-violet-400 underline'
                      : 'text-violet-400/60 hover:text-white'
                  }`}
                >
                  From User List
                </button>
                <span className="text-violet-900">|</span>
                <button
                  type="button"
                  onClick={() => setTargetType('manual')}
                  className={`font-semibold cursor-pointer ${
                    targetType === 'manual'
                      ? 'text-violet-400 underline'
                      : 'text-violet-400/60 hover:text-white'
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
                className="w-full text-xs bg-[#19142B] border border-violet-900/40 rounded-xl px-3 py-2.5 text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500 cursor-pointer"
              >
                <option value="" className="bg-[#19142B] text-violet-300">-- Choose User ({users.length} available) --</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id} className="bg-[#19142B] text-white">
                    @{u.username} — {u.email} {u.isEmailVerified ? '(Verified)' : '(Unverified)'}
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-violet-400/60 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    className="w-full text-xs bg-[#19142B] border border-violet-900/40 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-violet-300/40 focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 text-violet-400/60 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Username (optional)"
                    value={manualUsername}
                    onChange={(e) => setManualUsername(e.target.value)}
                    className="w-full text-xs bg-[#19142B] border border-violet-900/40 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-violet-300/40 focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action / Purpose */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-violet-200">
              Action Purpose
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full text-xs bg-[#19142B] border border-violet-900/40 rounded-xl px-3 py-2.5 text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500 cursor-pointer"
            >
              <option value="email_verification" className="bg-[#19142B]">Email Verification (Account Activation)</option>
              <option value="password_reset" className="bg-[#19142B]">Password Reset</option>
              <option value="account_deletion" className="bg-[#19142B]">Account Deletion Authorization</option>
              <option value="account_recovery" className="bg-[#19142B]">Account Recovery Verification</option>
            </select>
          </div>

          {/* 6-Digit Code with Generator */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-violet-200">
                6-Digit Verification Code
              </label>
              <button
                type="button"
                onClick={handleRandomizeCode}
                className="text-[11px] text-violet-400 hover:text-white hover:underline flex items-center space-x-1 cursor-pointer font-semibold"
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
              className="w-full text-center text-xl font-mono font-bold tracking-widest bg-[#19142B] border border-violet-900/40 rounded-xl py-2.5 text-violet-300 focus:outline-hidden focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Expiration Duration */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-violet-200 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-violet-400/60" />
              <span>Code Expiry Duration</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 border-violet-500 text-white shadow-xs'
                      : 'border-violet-900/40 bg-[#19142B] text-violet-300 hover:text-white hover:bg-violet-900/30'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Auto Dispatch Toggle */}
          <div className="p-3.5 bg-[#19142B] border border-violet-900/40 rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">
                Dispatch Live to User
              </div>
              <div className="text-[11px] text-violet-300/60">
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
              <div className="w-9 h-5 bg-[#231C38] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-violet-900 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-violet-600 peer-checked:to-purple-600"></div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-violet-300 hover:text-white hover:bg-violet-900/30 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl shadow-md transition cursor-pointer flex items-center space-x-2"
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
