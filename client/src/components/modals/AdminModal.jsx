import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Flag,
  FileText,
  X,
  AlertTriangle,
  CheckCircle,
  Ban,
  UserCheck,
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';

export const AdminModal = ({ isOpen, onClose }) => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [reports, setReports] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  });

  const showMsg = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3000);
  };

  useEffect(() => {
    if (!isOpen || user?.role !== 'admin') return;

    // Load stats
    fetch('/api/admin/stats', { headers: authHeaders(), credentials: 'include' })
      .then((r) => r.json())
      .then((d) => d.success && setStats(d.stats))
      .catch(console.error);

    // Load users
    fetch(`/api/admin/users?query=${encodeURIComponent(userQuery)}`, {
      headers: authHeaders(),
      credentials: 'include'
    })
      .then((r) => r.json())
      .then((d) => d.success && setUsers(d.users))
      .catch(console.error);

    // Load reports
    fetch('/api/admin/reports?status=pending', { headers: authHeaders(), credentials: 'include' })
      .then((r) => r.json())
      .then((d) => d.success && setReports(d.reports))
      .catch(console.error);

    // Load audit logs
    fetch('/api/admin/audit-logs', { headers: authHeaders(), credentials: 'include' })
      .then((r) => r.json())
      .then((d) => d.success && setAuditLogs(d.logs))
      .catch(console.error);
  }, [isOpen, activeTab, userQuery]);

  if (!isOpen || user?.role !== 'admin') return null;

  // Ban user
  const handleBan = async (targetUserId, targetUsername) => {
    const reason = window.prompt(`Reason for banning @${targetUsername}:`, 'Violation of community safety guidelines');
    if (!reason) return;

    try {
      const res = await fetch(`/api/admin/users/${targetUserId}/ban`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (data.success) {
        showMsg(`User @${targetUsername} has been banned.`);
        setUsers((prev) =>
          prev.map((u) => (u._id === targetUserId ? { ...u, isBanned: true, banReason: reason } : u))
        );
      }
    } catch (err) {
      showMsg('Failed to ban user.');
    }
  };

  // Unban user
  const handleUnban = async (targetUserId, targetUsername) => {
    try {
      const res = await fetch(`/api/admin/users/${targetUserId}/unban`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        showMsg(`User @${targetUsername} unbanned.`);
        setUsers((prev) =>
          prev.map((u) => (u._id === targetUserId ? { ...u, isBanned: false } : u))
        );
      }
    } catch (err) {
      showMsg('Failed to unban user.');
    }
  };

  // Toggle role
  const handleToggleRole = async (targetUser) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    try {
      const res = await fetch(`/api/admin/users/${targetUser._id}/role`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (data.success) {
        showMsg(`Updated @${targetUser.username} role to ${newRole}`);
        setUsers((prev) =>
          prev.map((u) => (u._id === targetUser._id ? { ...u, role: newRole } : u))
        );
      }
    } catch (err) {
      showMsg('Failed to update role.');
    }
  };

  // Resolve report
  const handleResolveReport = async (reportId, status) => {
    const actionTaken = window.prompt(`Action taken for this report:`, 'Reviewed by administrator');
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ status, actionTaken })
      });
      const data = await res.json();
      if (data.success) {
        showMsg(`Report marked as ${status}.`);
        setReports((prev) => prev.filter((r) => r._id !== reportId));
      }
    } catch (err) {
      showMsg('Error resolving report.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Moderation & Admin Portal</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded-full uppercase">
                  Privileged
                </span>
              </div>
              <p className="text-xs text-slate-400">Platform telemetry, account safety, and report review</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center space-x-1 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {[
            { id: 'stats', label: 'Overview Metrics', icon: TrendingUp },
            { id: 'users', label: 'User Accounts', icon: Users },
            { id: 'reports', label: 'Report Queue', icon: Flag },
            { id: 'audit', label: 'Audit Trail', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-3 px-4 text-xs font-medium border-b-2 transition ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.id === 'reports' && reports.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {reports.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="mx-6 mt-3 p-2.5 text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 rounded-xl flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Content Pane */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* OVERVIEW STATS */}
          {activeTab === 'stats' && stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
                  <span>Total Registered Users</span>
                  <Users className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalUsers}</div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
                  <span>Active Today</span>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.activeToday}</div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
                  <span>Pending Abuse Reports</span>
                  <Flag className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.pendingReports}</div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
                  <span>Banned Accounts</span>
                  <Ban className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.bannedUsers}</div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
                  <span>Active Groups</span>
                  <Users className="w-4 h-4 text-sky-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalGroups}</div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
                  <span>Total Messages Sent</span>
                  <MessageSquare className="w-4 h-4 text-violet-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalMessages}</div>
              </div>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search by username or email..."
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
              />

              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {users.map((u) => (
                  <div
                    key={u._id}
                    className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar src={u.avatar} name={u.nickname || u.username} size="sm" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-800 dark:text-white">
                            {u.nickname || u.username}
                          </span>
                          <span className="text-slate-400">@{u.username}</span>
                          {u.role === 'admin' && (
                            <span className="px-1.5 py-0.5 text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold rounded">
                              ADMIN
                            </span>
                          )}
                          {u.isBanned && (
                            <span className="px-1.5 py-0.5 text-[9px] bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold rounded">
                              BANNED
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {u.email} · Registered {new Date(u.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleRole(u)}
                        className="px-2.5 py-1 text-[11px] font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        {u.role === 'admin' ? 'Demote to User' : 'Make Admin'}
                      </button>

                      {u.isBanned ? (
                        <button
                          onClick={() => handleUnban(u._id, u.username)}
                          className="px-2.5 py-1 text-[11px] font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition"
                        >
                          Unban
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBan(u._id, u.username)}
                          className="px-2.5 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                        >
                          Ban User
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REPORTS TAB */}
          {activeTab === 'reports' && (
            <div className="space-y-3">
              {reports.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  All reports have been reviewed and resolved!
                </div>
              ) : (
                reports.map((r) => (
                  <div
                    key={r._id}
                    className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                          {r.category}
                        </span>
                        <span className="text-slate-400">
                          Filed by @{r.reporter?.username} · {new Date(r.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="space-x-2">
                        <button
                          onClick={() => handleResolveReport(r._id, 'dismissed')}
                          className="px-2.5 py-1 text-[11px] text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => handleResolveReport(r._id, 'resolved')}
                          className="px-2.5 py-1 text-[11px] text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                        >
                          Take Action & Resolve
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800">
                      <p className="font-medium text-slate-800 dark:text-white">{r.reason}</p>
                      {r.reportedUser && (
                        <p className="text-[11px] text-slate-400 mt-1">
                          Reported User: @{r.reportedUser.username}
                        </p>
                      )}
                      {r.reportedMessage && (
                        <p className="text-[11px] text-slate-400 mt-1">
                          Message Content: "{r.reportedMessage.content}"
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* AUDIT LOG TAB */}
          {activeTab === 'audit' && (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden font-mono text-[11px]">
              {auditLogs.map((log) => (
                <div key={log._id} className="p-2.5 bg-white dark:bg-slate-900 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      [{log.action}]
                    </span>
                    <span className="text-slate-600 dark:text-slate-300">
                      by @{log.actor?.username || 'System'}
                    </span>
                    <span className="text-slate-400">({JSON.stringify(log.details)})</span>
                  </div>
                  <span className="text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
