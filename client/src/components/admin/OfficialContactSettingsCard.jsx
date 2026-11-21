import React, { useState, useEffect, useMemo } from 'react';
import {
  Phone,
  Mail,
  Clock,
  FileText,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Radio,
  Eye,
  RefreshCw,
  Check
} from 'lucide-react';

const INITIAL_FORM = {
  phone: '+1 (555) 234-5678',
  displayPhone: '+1 (555) 234-5678',
  email: 'admin@pulsechat.internal',
  description: 'Official Administrator Support & Verification Line',
  availableHours: '24/7 Priority Support',
  instructions: 'Contact administration directly to receive your 6-digit verification code.',
  enabled: true
};

export const OfficialContactSettingsCard = ({ authHeaders, showFeedback }) => {
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [savedForm, setSavedForm] = useState({ ...INITIAL_FORM });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const hasChanges = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedForm),
    [form, savedForm]
  );

  // Load existing official contact settings
  useEffect(() => {
    const fetchContact = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/contact', {
          headers: authHeaders(),
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.success && data?.contact) {
            setForm((prev) => ({ ...prev, ...data.contact }));
            setSavedForm((prev) => ({ ...prev, ...data.contact }));
          }
        }
      } catch (err) {
        console.warn('Error loading admin contact settings', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContact();
  }, [authHeaders]);

  const handleSave = async (e) => {
    e?.preventDefault();
    setError('');
    setSavedSuccess(false);

    if (!form.phone.trim()) {
      setError('Official phone number is required.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/contact', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        credentials: 'include',
        body: JSON.stringify({ contact: form })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSavedForm({ ...form });
        setSavedSuccess(true);
        if (showFeedback) {
          showFeedback('Official contact details updated and broadcast to all users!');
        }
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        setError(data.message || 'Failed to update official contact details.');
      }
    } catch {
      setError('Network communication failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ ...savedForm });
    setError('');
  };

  return (
    <div className="bg-[#231C38] border border-violet-900/30 rounded-2xl shadow-lg shadow-black/20 overflow-hidden text-white">
      {/* Header */}
      <div className="p-5 border-b border-violet-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1E1833]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 shrink-0">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Official Administrator Contact</span>
              <span className="flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                <span>Live Socket Sync</span>
              </span>
            </h3>
            <p className="text-xs text-violet-300/70 mt-0.5">
              Contact number displayed on user-facing verification waiting screens, account recovery, and support dialogs.
            </p>
          </div>
        </div>

        {/* Enabled Switch */}
        <div className="flex items-center space-x-2 self-start sm:self-center">
          <span className="text-xs font-semibold text-violet-300">
            {form.enabled ? 'Enabled' : 'Disabled'}
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[#19142B] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-violet-900 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-violet-600 peer-checked:to-purple-600"></div>
          </label>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 p-3 bg-rose-950/40 border border-rose-800/60 text-rose-300 rounded-xl text-xs flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Fields */}
      <form onSubmit={handleSave} className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Raw Phone Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-violet-200 flex items-center space-x-1.5">
              <Phone className="w-3.5 h-3.5 text-violet-400/60" />
              <span>Official Contact Phone (Raw / Tel Link)</span>
            </label>
            <input
              type="text"
              required
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="+15552345678"
              className="w-full text-xs font-mono bg-[#19142B] border border-violet-900/40 rounded-xl px-3.5 py-2.5 text-white placeholder-violet-300/40 focus:outline-hidden focus:ring-2 focus:ring-violet-500"
            />
            <p className="text-[10px] text-violet-300/50">
              Format used for tel: links and automatic dialing.
            </p>
          </div>

          {/* Display Phone Label */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-violet-200">
              Display Phone Label
            </label>
            <input
              type="text"
              value={form.displayPhone}
              onChange={(e) => setForm((prev) => ({ ...prev, displayPhone: e.target.value }))}
              placeholder="+1 (555) 234-5678"
              className="w-full text-xs font-mono bg-[#19142B] border border-violet-900/40 rounded-xl px-3.5 py-2.5 text-white placeholder-violet-300/40 focus:outline-hidden focus:ring-2 focus:ring-violet-500"
            />
            <p className="text-[10px] text-violet-300/50">
              Formatted phone label displayed directly to users.
            </p>
          </div>

          {/* Admin Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-violet-200 flex items-center space-x-1.5">
              <Mail className="w-3.5 h-3.5 text-violet-400/60" />
              <span>Official Support Email</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="admin@pulsechat.internal"
              className="w-full text-xs bg-[#19142B] border border-violet-900/40 rounded-xl px-3.5 py-2.5 text-white placeholder-violet-300/40 focus:outline-hidden focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Hours of Availability */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-violet-200 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-violet-400/60" />
              <span>Available Hours Badge</span>
            </label>
            <input
              type="text"
              value={form.availableHours}
              onChange={(e) => setForm((prev) => ({ ...prev, availableHours: e.target.value }))}
              placeholder="e.g. 24/7 Priority Support or Mon-Fri 9AM-6PM"
              className="w-full text-xs bg-[#19142B] border border-violet-900/40 rounded-xl px-3.5 py-2.5 text-white placeholder-violet-300/40 focus:outline-hidden focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* Description Label */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-violet-200 flex items-center space-x-1.5">
            <FileText className="w-3.5 h-3.5 text-violet-400/60" />
            <span>Support Line Description</span>
          </label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Official Administrator Support & Verification Line"
            className="w-full text-xs bg-[#19142B] border border-violet-900/40 rounded-xl px-3.5 py-2.5 text-white placeholder-violet-300/40 focus:outline-hidden focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {/* Instructions */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-violet-200">
            User Verification Instructions
          </label>
          <textarea
            rows={2}
            value={form.instructions}
            onChange={(e) => setForm((prev) => ({ ...prev, instructions: e.target.value }))}
            placeholder="Contact administration directly to receive your 6-digit verification code."
            className="w-full text-xs bg-[#19142B] border border-violet-900/40 rounded-xl p-3 text-white placeholder-violet-300/40 focus:outline-hidden focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {/* Live User-Facing Preview Card */}
        <div className="p-4 bg-[#19142B] border border-violet-900/30 rounded-xl space-y-2">
          <div className="flex items-center space-x-2 text-[11px] font-bold text-violet-300/60 uppercase tracking-wider">
            <Eye className="w-3.5 h-3.5" />
            <span>Live User Preview (Verification Waiting Screen)</span>
          </div>
          <div className="p-3 bg-[#231C38] border border-violet-900/40 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-mono font-bold text-violet-300">
                  {form.displayPhone || form.phone}
                </div>
                <div className="text-[10px] text-violet-300/60">
                  {form.description} • {form.availableHours}
                </div>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#19142B] border border-violet-900/30 text-violet-300 font-semibold">
              {form.enabled ? 'Active on User Pages' : 'Hidden from Users'}
            </span>
          </div>
        </div>

        {/* Submit Actions — inline (always visible) */}
        <div className="pt-2 flex items-center justify-end space-x-3">
          {savedSuccess && (
            <div className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 font-semibold animate-fadeIn">
              <CheckCircle2 className="w-4 h-4" />
              <span>Saved & Broadcasted</span>
            </div>
          )}
          <button
            type="submit"
            disabled={saving || loading}
            className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center space-x-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>Save &amp; Broadcast Contact</span>
          </button>
        </div>
      </form>

      {/* Floating Unsaved Changes Dock */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1E1833]/95 backdrop-blur-xl border border-violet-500/40 shadow-2xl rounded-2xl px-4 py-2.5 flex items-center space-x-3 text-xs text-white animate-fadeIn">
          <div className="flex items-center space-x-2 pr-3 border-r border-violet-900/40">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_#FBBF24]" />
            <span className="font-semibold text-violet-200">Unsaved Changes</span>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="px-3.5 py-1.5 bg-[#231C38] hover:bg-[#2A2242] text-violet-300 hover:text-white rounded-xl border border-violet-900/30 transition cursor-pointer"
          >
            Cancel / Discard
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-violet-900/50 flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>{saving ? 'Saving...' : 'Save & Publish'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
