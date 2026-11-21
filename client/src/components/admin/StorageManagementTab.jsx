import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  HardDrive,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Sparkles,
  Users,
  MessageSquare,
  KeyRound,
  FileText,
  Bell,
  Clock,
  Layers,
  HelpCircle,
  Wrench
} from 'lucide-react';

export const StorageManagementTab = ({ authHeaders, showFeedback }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    target: '',
    title: '',
    description: '',
    count: 0
  });
  const [purgeResult, setPurgeResult] = useState(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/storage/metrics', {
        headers: authHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMetrics(data.storage);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch storage metrics', err);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handlePromptCleanup = (target, title, description, count) => {
    setConfirmModal({
      isOpen: true,
      target,
      title,
      description,
      count
    });
  };

  const handleExecuteCleanup = async () => {
    if (!confirmModal.target) return;
    setCleaning(true);
    setPurgeResult(null);

    try {
      const res = await fetch('/api/admin/storage/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        credentials: 'include',
        body: JSON.stringify({ target: confirmModal.target })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPurgeResult(data);
        if (showFeedback) {
          showFeedback(data.message);
        }
        setConfirmModal({ isOpen: false, target: '', title: '', description: '', count: 0 });
        await fetchMetrics();
      } else {
        alert(data.message || 'Storage cleanup failed.');
      }
    } catch {
      alert('Network communication failed during cleanup.');
    } finally {
      setCleaning(false);
    }
  };

  const breakdown = metrics?.breakdown || {};
  const usagePercent = metrics?.usagePercent || 0;
  const isHighUsage = usagePercent > 70;

  return (
    <div className="space-y-6 max-w-5xl animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Database className="w-5 h-5 text-violet-400" />
            <span>MongoDB Storage Optimization & Data Management</span>
          </h2>
          <p className="text-xs text-violet-300/70 mt-0.5">
            Free-tier MongoDB (512MB) storage analytics, collection telemetry, and administrator data purge options.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-[#19142B] hover:bg-violet-900/40 text-violet-200 border border-violet-900/40 rounded-xl transition cursor-pointer font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-violet-400' : ''}`} />
            <span>Refresh Metrics</span>
          </button>

          <button
            onClick={() =>
              handlePromptCleanup(
                'all',
                'Bulk Database Optimization (Safe Purge)',
                'This will purge all expired user sessions, expired/used verification codes, 30+ day audit logs, read notifications, and past maintenance history.',
                (breakdown.sessions?.cleanable || 0) +
                  (breakdown.verificationCodes?.cleanable || 0) +
                  (breakdown.auditLogs?.cleanable || 0) +
                  (breakdown.notifications?.cleanable || 0) +
                  (breakdown.maintenance?.cleanable || 0)
              )
            }
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl shadow-md transition cursor-pointer font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Optimize All Storage</span>
          </button>
        </div>
      </div>

      {purgeResult && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-emerald-200">
                Cleanup Executed Successfully
              </div>
              <div className="text-[11px] text-emerald-300">
                {purgeResult.message}
              </div>
            </div>
          </div>
          <button
            onClick={() => setPurgeResult(null)}
            className="text-xs text-emerald-400 font-semibold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Free Tier Storage Gauge Card */}
      <div className="bg-[#231C38] border border-violet-900/30 rounded-2xl p-6 shadow-lg shadow-black/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                MongoDB Free Tier Utilization (512 MB Cluster)
              </h3>
              <p className="text-xs text-violet-300/70">
                Estimated memory footprint: {metrics?.estimatedSizeMB || '0.00'} MB used of 512 MB
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className={`text-xl font-mono font-black ${isHighUsage ? 'text-rose-400' : 'text-violet-300'}`}>
              {usagePercent}%
            </div>
            <div className="text-[10px] text-violet-300/50 uppercase font-semibold">Allocated Storage</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#19142B] rounded-full h-3 overflow-hidden border border-violet-900/30">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isHighUsage
                ? 'bg-rose-500'
                : usagePercent > 40
                ? 'bg-amber-500'
                : 'bg-gradient-to-r from-violet-600 to-purple-500'
            }`}
            style={{ width: `${Math.max(2, usagePercent)}%` }}
          />
        </div>

        {metrics?.warning && (
          <div className="p-3 bg-amber-950/40 border border-amber-800/60 text-amber-300 rounded-xl text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{metrics.warning}</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-3 bg-[#19142B] rounded-xl border border-violet-900/30">
            <span className="text-[10px] uppercase font-bold text-violet-300/60 block">Total Records</span>
            <span className="text-base font-bold font-mono text-white">
              {metrics?.totalDocuments?.toLocaleString() || 0}
            </span>
          </div>
          <div className="p-3 bg-[#19142B] rounded-xl border border-violet-900/30">
            <span className="text-[10px] uppercase font-bold text-violet-300/60 block">Cleanable Records</span>
            <span className="text-base font-bold font-mono text-amber-400">
              {(
                (breakdown.sessions?.cleanable || 0) +
                (breakdown.verificationCodes?.cleanable || 0) +
                (breakdown.auditLogs?.cleanable || 0) +
                (breakdown.notifications?.cleanable || 0)
              ).toLocaleString()}
            </span>
          </div>
          <div className="p-3 bg-[#19142B] rounded-xl border border-violet-900/30">
            <span className="text-[10px] uppercase font-bold text-violet-300/60 block">Messages with Media</span>
            <span className="text-base font-bold font-mono text-violet-300">
              {breakdown.messages?.mediaCount?.toLocaleString() || 0}
            </span>
          </div>
          <div className="p-3 bg-[#19142B] rounded-xl border border-violet-900/30">
            <span className="text-[10px] uppercase font-bold text-violet-300/60 block">Retention Window</span>
            <span className="text-base font-bold font-mono text-emerald-400">
              14 Days Default
            </span>
          </div>
        </div>
      </div>

      {/* Collections Breakdown Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <Layers className="w-4 h-4 text-violet-400" />
          <span>Collection Inventory & Targeted Cleanup</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sessions Card */}
          <div className="p-4 bg-[#231C38] border border-violet-900/30 rounded-2xl shadow-sm flex flex-col justify-between space-y-3 hover:border-violet-500/40 transition">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/30 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Active & Expired Sessions</h4>
                  <p className="text-[11px] text-violet-300/70">
                    Total: {breakdown.sessions?.count || 0} • Expired: {breakdown.sessions?.expiredCount || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-violet-900/30 flex items-center justify-between">
              <span className="text-[11px] text-violet-300/50">
                {breakdown.sessions?.cleanable || 0} safe to purge
              </span>
              <button
                type="button"
                disabled={!breakdown.sessions?.cleanable}
                onClick={() =>
                  handlePromptCleanup(
                    'sessions',
                    'Purge Expired Sessions',
                    'Permanently remove all user sessions that have passed their expiration deadline.',
                    breakdown.sessions?.cleanable || 0
                  )
                }
                className="px-3 py-1.5 text-xs font-semibold bg-rose-950/50 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 rounded-xl transition cursor-pointer disabled:opacity-40"
              >
                Purge Expired ({breakdown.sessions?.cleanable || 0})
              </button>
            </div>
          </div>

          {/* Verification Codes Card */}
          <div className="p-4 bg-[#231C38] border border-violet-900/30 rounded-2xl shadow-sm flex flex-col justify-between space-y-3 hover:border-violet-500/40 transition">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-300 border border-amber-500/30 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Verification Codes</h4>
                  <p className="text-[11px] text-violet-300/70">
                    Total: {breakdown.verificationCodes?.count || 0} • Pending: {breakdown.verificationCodes?.pendingCount || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-violet-900/30 flex items-center justify-between">
              <span className="text-[11px] text-violet-300/50">
                {breakdown.verificationCodes?.cleanable || 0} expired / used
              </span>
              <button
                type="button"
                disabled={!breakdown.verificationCodes?.cleanable}
                onClick={() =>
                  handlePromptCleanup(
                    'codes',
                    'Purge Expired & Used Codes',
                    'Delete all verification code entries that have expired or have already been consumed.',
                    breakdown.verificationCodes?.cleanable || 0
                  )
                }
                className="px-3 py-1.5 text-xs font-semibold bg-rose-950/50 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 rounded-xl transition cursor-pointer disabled:opacity-40"
              >
                Purge Inactive ({breakdown.verificationCodes?.cleanable || 0})
              </button>
            </div>
          </div>

          {/* Audit Logs Card */}
          <div className="p-4 bg-[#231C38] border border-violet-900/30 rounded-2xl shadow-sm flex flex-col justify-between space-y-3 hover:border-violet-500/40 transition">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Audit & Activity Logs</h4>
                  <p className="text-[11px] text-violet-300/70">
                    Total: {breakdown.auditLogs?.count || 0} • 30+ Days: {breakdown.auditLogs?.olderThan30Days || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-violet-900/30 flex items-center justify-between">
              <span className="text-[11px] text-violet-300/50">
                Keep recent 30 days of security logs
              </span>
              <button
                type="button"
                disabled={!breakdown.auditLogs?.cleanable}
                onClick={() =>
                  handlePromptCleanup(
                    'audit_logs',
                    'Purge 30+ Day Audit Logs',
                    'Delete old security audit records older than 30 days while preserving recent administrative events.',
                    breakdown.auditLogs?.cleanable || 0
                  )
                }
                className="px-3 py-1.5 text-xs font-semibold bg-rose-950/50 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 rounded-xl transition cursor-pointer disabled:opacity-40"
              >
                Purge 30+ Days ({breakdown.auditLogs?.cleanable || 0})
              </button>
            </div>
          </div>

          {/* Notifications Card */}
          <div className="p-4 bg-[#231C38] border border-violet-900/30 rounded-2xl shadow-sm flex flex-col justify-between space-y-3 hover:border-violet-500/40 transition">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Read Notifications</h4>
                  <p className="text-[11px] text-violet-300/70">
                    Total: {breakdown.notifications?.count || 0} • Old Read: {breakdown.notifications?.readOldCount || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-violet-900/30 flex items-center justify-between">
              <span className="text-[11px] text-violet-300/50">
                Purge read notifications older than 30 days
              </span>
              <button
                type="button"
                disabled={!breakdown.notifications?.cleanable}
                onClick={() =>
                  handlePromptCleanup(
                    'notifications',
                    'Purge Old Notifications',
                    'Delete read user notification entries older than 30 days.',
                    breakdown.notifications?.cleanable || 0
                  )
                }
                className="px-3 py-1.5 text-xs font-semibold bg-rose-950/50 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 rounded-xl transition cursor-pointer disabled:opacity-40"
              >
                Purge Old Read ({breakdown.notifications?.cleanable || 0})
              </button>
            </div>
          </div>

          {/* Past Maintenance History Card */}
          <div className="p-4 bg-[#231C38] border border-violet-900/30 rounded-2xl shadow-sm flex flex-col justify-between space-y-3 hover:border-violet-500/40 transition">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/30 flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Past Maintenance History</h4>
                  <p className="text-[11px] text-violet-300/70">
                    Total: {breakdown.maintenance?.count || 0} • Completed / Cancelled: {breakdown.maintenance?.pastCount || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-violet-900/30 flex items-center justify-between">
              <span className="text-[11px] text-violet-300/50">
                Purge past completed and cancelled downtime records
              </span>
              <button
                type="button"
                disabled={!breakdown.maintenance?.cleanable}
                onClick={() =>
                  handlePromptCleanup(
                    'maintenance',
                    'Purge Maintenance History',
                    'Permanently remove all completed and cancelled maintenance schedule history records.',
                    breakdown.maintenance?.cleanable || 0
                  )
                }
                className="px-3 py-1.5 text-xs font-semibold bg-rose-950/50 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 rounded-xl transition cursor-pointer disabled:opacity-40"
              >
                Purge History ({breakdown.maintenance?.cleanable || 0})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#1E1833] border border-violet-900/40 rounded-3xl p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Confirm Data Purge
                </h3>
                <p className="text-xs text-rose-400 font-semibold">{confirmModal.title}</p>
              </div>
            </div>

            <p className="text-xs text-violet-300/80 leading-relaxed">
              {confirmModal.description}
            </p>

            <div className="p-3 bg-[#19142B] rounded-xl border border-violet-900/30 text-xs">
              <span className="font-semibold text-violet-200">
                Records eligible for immediate permanent removal:
              </span>
              <span className="font-mono font-bold text-rose-400 ml-2">
                {confirmModal.count} document(s)
              </span>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                disabled={cleaning}
                onClick={() => setConfirmModal({ isOpen: false, target: '', title: '', description: '', count: 0 })}
                className="px-4 py-2 text-xs font-semibold text-violet-300 hover:text-white hover:bg-violet-900/30 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={cleaning}
                onClick={handleExecuteCleanup}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md transition cursor-pointer flex items-center space-x-1.5"
              >
                {cleaning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Confirm & Purge Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
