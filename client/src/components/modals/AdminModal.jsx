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
  MessageSquare,
  Trash2,
  Eye,
  ArrowLeft,
  Search,
  Lock,
  Shield,
  File,
  Phone,
  Video,
  Download,
  ExternalLink,
  Layers,
  LayoutGrid,
  List
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { getConversationCryptoKey, decryptMessage } from '../../utils/crypto';
import { Avatar } from '../common/Avatar';

export const AdminModal = ({ isOpen, onClose }) => {
  const { user, token } = useAuth();
  const { selectConversation } = useChat();
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [reports, setReports] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Platform Chats oversight state
  const [chats, setChats] = useState([]);
  const [chatQuery, setChatQuery] = useState('');
  const [chatTypeFilter, setChatTypeFilter] = useState('all');
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);


  // ---
  const [auditView, setAuditView] = useState('grid');
  const [auditQuery, setAuditQuery] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  });

  const showMsg = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3500);
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
      .then(async (d) => {
        if (d.success) {
          const decryptedReports = await Promise.all(
            (d.reports || []).map(async (r) => {
              const repMsg = r.reportedMessage;
              if (repMsg?.isEncrypted && repMsg?.encryptionMetadata?.iv && repMsg?.conversation) {
                try {
                  const convKey = await getConversationCryptoKey(repMsg.conversation);
                  if (convKey) {
                    const decrypted = await decryptMessage(
                      repMsg.content,
                      repMsg.encryptionMetadata.iv,
                      convKey
                    );
                    return {
                      ...r,
                      reportedMessage: { ...repMsg, content: decrypted }
                    };
                  }
                } catch (e) { }
              }
              return r;
            })
          );
          setReports(decryptedReports);
        }
      })
      .catch(console.error);

    // Load audit logs
    fetch('/api/admin/audit-logs', { headers: authHeaders(), credentials: 'include' })
      .then((r) => r.json())
      .then((d) => d.success && setAuditLogs(d.logs))
      .catch(console.error);
  }, [isOpen, activeTab, userQuery]);

  // Load chats for admin surveillance & audit
  useEffect(() => {
    if (!isOpen || user?.role !== 'admin' || activeTab !== 'chats') return;

    let url = `/api/admin/chats?query=${encodeURIComponent(chatQuery)}`;
    if (chatTypeFilter !== 'all') {
      url += `&type=${chatTypeFilter}`;
    }

    fetch(url, { headers: authHeaders(), credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setChats(d.conversations || []);
      })
      .catch(console.error);
  }, [isOpen, activeTab, chatQuery, chatTypeFilter]);

  if (!isOpen || user?.role !== 'admin') return null;

  // Delete user permanently
  const handleDeleteUser = async (targetUser) => {
    if (targetUser._id === user?._id) {
      showMsg('You cannot delete your own administrative account.');
      return;
    }

    const confirmed = window.confirm(
      `⚠️ PERMANENT USER DELETION\n\nAre you sure you want to permanently delete user @${targetUser.username} (${targetUser.email})?\n\nThis will remove their account, revoke all login sessions, and purge their participant links. This action CANNOT be undone.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/users/${targetUser._id}`, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        showMsg(`User @${targetUser.username} has been permanently deleted.`);
        setUsers((prev) => prev.filter((u) => u._id !== targetUser._id));
        setStats((prev) => prev ? { ...prev, totalUsers: Math.max(0, prev.totalUsers - 1) } : prev);
      } else {
        showMsg(data.message || 'Failed to delete user.');
      }
    } catch (err) {
      showMsg('Error deleting user account.');
    }
  };

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

  // Load specific conversation messages for admin viewing
  const handleSelectChat = async (conv) => {
    setSelectedChat(conv);
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/admin/chats/${conv._id}/messages`, {
        headers: authHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        const convKey = await getConversationCryptoKey(conv._id);
        const decrypted = await Promise.all(
          (data.messages || []).map(async (msg) => {
            let content = msg.content;
            if (msg.isEncrypted && msg.encryptionMetadata?.iv && convKey) {
              try {
                content = await decryptMessage(msg.content, msg.encryptionMetadata.iv, convKey);
              } catch (e) {
                console.warn('Admin decryption failed for msg:', msg._id, e);
              }
            }

            let replyTo = msg.replyTo;
            if (replyTo?.isEncrypted && replyTo?.encryptionMetadata?.iv && convKey) {
              try {
                const repPlain = await decryptMessage(
                  replyTo.content,
                  replyTo.encryptionMetadata.iv,
                  convKey
                );
                replyTo = { ...replyTo, content: repPlain };
              } catch (e) { }
            }

            return {
              ...msg,
              content,
              replyTo,
              wasEncrypted: msg.isEncrypted
            };
          })
        );
        setChatMessages(decrypted);
      }
    } catch (err) {
      showMsg('Error loading conversation messages.');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Delete message from chat
  const handleDeleteChatMessage = async (messageId) => {
    const confirmDelete = window.confirm('Delete this message from the platform? This cannot be undone.');
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/admin/messages/${messageId}`, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        showMsg('Message deleted by administrator.');
        setChatMessages((prev) => prev.filter((m) => m._id !== messageId));
      } else {
        showMsg(data.message || 'Failed to delete message.');
      }
    } catch (err) {
      showMsg('Error deleting message.');
    }
  };

  // Delete entire conversation
  const handleDeleteConversation = async (convId) => {
    const confirmDelete = window.confirm(
      '⚠️ Delete this entire conversation and all its messages? This cannot be undone.'
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/admin/chats/${convId}`, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        showMsg('Conversation and history deleted.');
        setChats((prev) => prev.filter((c) => c._id !== convId));
        setSelectedChat(null);
        setChatMessages([]);
      } else {
        showMsg(data.message || 'Failed to delete conversation.');
      }
    } catch (err) {
      showMsg('Error deleting conversation.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[90vh] max-h-[850px]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Moderation & Security Center</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded-full uppercase">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-400">Platform telemetry, user governance, chat auditing, and security oversight</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center space-x-1 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          {[
            { id: 'stats', label: 'Overview Metrics', icon: TrendingUp },
            { id: 'users', label: 'User Accounts', icon: Users },
            { id: 'chats', label: 'All Platform Chats', icon: MessageSquare },
            { id: 'reports', label: 'Report Queue', icon: Flag },
            { id: 'audit', label: 'Audit Trail', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id !== 'chats') setSelectedChat(null);
                }}
                className={`flex items-center space-x-2 py-3 px-3.5 text-xs font-medium border-b-2 transition whitespace-nowrap cursor-pointer ${isActive
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
                {tab.id === 'chats' && chats.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold">
                    {chats.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="mx-6 mt-3 p-2.5 text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 rounded-xl flex items-center space-x-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{feedback}</span>
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
                  <span>Direct Chats (1-on-1)</span>
                  <MessageSquare className="w-4 h-4 text-pink-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalDirectChats || 0}</div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 col-span-2 md:col-span-3">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
                  <span>Total System Messages Transmitted</span>
                  <MessageSquare className="w-4 h-4 text-violet-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalMessages}</div>
              </div>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by username, nickname, or email..."
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                {users.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">No users found matching query.</div>
                ) : (
                  users.map((u) => (
                    <div
                      key={u._id}
                      className="p-3.5 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs transition"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <Avatar src={u.avatar} name={u.nickname || u.username} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-800 dark:text-white truncate">
                              {u.nickname || u.username}
                            </span>
                            <span className="text-slate-400 truncate">@{u.username}</span>
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
                          <div className="text-[11px] text-slate-400 truncate">
                            {u.email} · Registered {new Date(u.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
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
                            className="px-2.5 py-1 text-[11px] font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition"
                          >
                            Ban User
                          </button>
                        )}

                        {/* Admin Delete User Button */}
                        <button
                          onClick={() => handleDeleteUser(u)}
                          disabled={u._id === user?._id}
                          className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 dark:border-rose-900/60 rounded-lg transition flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                          title="Permanently Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete User</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* CHATS & SURVEILLANCE TAB */}
          {activeTab === 'chats' && (
            <div className="space-y-4">
              {!selectedChat ? (
                // Chat List Overview
                <>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search chats by group name or participant username..."
                        value={chatQuery}
                        onChange={(e) => setChatQuery(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      />
                    </div>

                    <div className="flex items-center space-x-1.5 self-start sm:self-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      {['all', 'private', 'group'].map((t) => (
                        <button
                          key={t}
                          onClick={() => setChatTypeFilter(t)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition cursor-pointer ${chatTypeFilter === t
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                          {t === 'all' ? 'All Chats' : t === 'private' ? 'Direct DMs' : 'Groups'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {chats.length === 0 ? (
                      <div className="col-span-2 py-12 text-center text-slate-400 text-xs">
                        <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                        No conversations found matching filters.
                      </div>
                    ) : (
                      chats.map((conv) => {
                        const isGrp = conv.type === 'group';
                        const title = isGrp
                          ? conv.groupDetails?.name || 'Unnamed Group'
                          : conv.participants?.map((p) => p.nickname || p.username).join(' & ');

                        return (
                          <div
                            key={conv._id}
                            className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between hover:border-indigo-400 dark:hover:border-indigo-600 transition shadow-xs space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center space-x-3 min-w-0">
                                <Avatar
                                  src={isGrp ? conv.groupDetails?.avatar : conv.participants?.[0]?.avatar}
                                  name={title}
                                  size="md"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center space-x-1.5">
                                    <h4 className="font-semibold text-xs text-slate-800 dark:text-white truncate">
                                      {title}
                                    </h4>
                                    <span
                                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${isGrp
                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                        : 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                                        }`}
                                    >
                                      {conv.type}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                    {conv.participants?.length} participants · {conv.messageCount || 0} messages
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Participants mini list */}
                            <div className="flex flex-wrap gap-1 text-[10px]">
                              {conv.participants?.map((p) => (
                                <span
                                  key={p._id}
                                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md"
                                >
                                  @{p.username}
                                </span>
                              ))}
                            </div>

                            {/* Actions bar */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                              <span className="text-[10px] text-slate-400">
                                Active {new Date(conv.updatedAt).toLocaleDateString()}
                              </span>

                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleSelectChat(conv)}
                                  className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-semibold rounded-lg text-xs flex items-center space-x-1.5 transition cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Messages</span>
                                </button>

                                <button
                                  onClick={() => {
                                    selectConversation(conv);
                                    onClose();
                                  }}
                                  className="px-2.5 py-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs flex items-center space-x-1 transition cursor-pointer"
                                  title="Open conversation directly in main chat window"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Open</span>
                                </button>

                                <button
                                  onClick={() => handleDeleteConversation(conv._id)}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                                  title="Delete entire conversation"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                // Selected Chat Inspector View
                <div className="flex flex-col h-[580px] bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden animate-in fade-in">
                  {/* Chat Inspector Header */}
                  <div className="p-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setSelectedChat(null)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg transition"
                        title="Back to chats list"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-xs text-slate-900 dark:text-white">
                            {selectedChat.type === 'group'
                              ? selectedChat.groupDetails?.name
                              : selectedChat.participants?.map((p) => p.nickname || p.username).join(' & ')}
                          </h3>
                          <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {selectedChat.type}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {selectedChat.participants?.map((p) => `@${p.username}`).join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          selectConversation(selectedChat);
                          onClose();
                        }}
                        className="px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg border border-indigo-200 dark:border-indigo-900/60 flex items-center space-x-1 transition cursor-pointer"
                        title="Open this conversation in the main chat view"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in Chat</span>
                      </button>

                      <button
                        onClick={() => handleDeleteConversation(selectedChat._id)}
                        className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/60 flex items-center space-x-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Chat</span>
                      </button>
                    </div>
                  </div>

                  {/* Messages Stream */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center h-full text-xs text-slate-400">
                        Loading messages for this conversation...
                      </div>
                    ) : chatMessages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-xs text-slate-400">
                        No messages in this chat conversation.
                      </div>
                    ) : (
                      chatMessages.map((msg) => {
                        return (
                          <div
                            key={msg._id}
                            className="p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-1.5 text-xs shadow-xs group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Avatar
                                  src={msg.sender?.avatar}
                                  name={msg.sender?.nickname || msg.sender?.username}
                                  size="xs"
                                />
                                <span className="font-semibold text-slate-800 dark:text-white">
                                  {msg.sender?.nickname || msg.sender?.username}
                                </span>
                                <span className="text-slate-400 text-[11px]">@{msg.sender?.username}</span>
                                {msg.sender?.role === 'admin' && (
                                  <span className="text-[9px] px-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded font-bold">
                                    ADMIN
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] text-slate-400">
                                  {new Date(msg.createdAt).toLocaleString()}
                                </span>
                                <button
                                  onClick={() => handleDeleteChatMessage(msg._id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                  title="Delete message from chat"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Message Content */}
                            <div className="text-slate-700 dark:text-slate-200 pl-7 text-xs leading-relaxed">
                              {msg.replyTo && (
                                <div className="mb-1.5 p-1.5 rounded-md bg-slate-100 dark:bg-slate-800/80 border-l-2 border-indigo-500 text-[11px] text-slate-500 dark:text-slate-400">
                                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                    @{msg.replyTo.sender?.nickname || msg.replyTo.sender?.username || 'User'}:
                                  </span>{' '}
                                  <span className="line-clamp-1">{msg.replyTo.content}</span>
                                </div>
                              )}

                              {msg.messageType === 'call' ? (
                                <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                                  {msg.callMetadata?.callType === 'video' ? (
                                    <Video className="w-4 h-4 text-indigo-500" />
                                  ) : (
                                    <Phone className="w-4 h-4 text-emerald-500" />
                                  )}
                                  <span>
                                    {msg.callMetadata?.status === 'completed'
                                      ? `Call ended (${Math.floor(msg.callMetadata?.duration / 60)}m ${msg.callMetadata?.duration % 60}s)`
                                      : `Missed call`}
                                  </span>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {msg.wasEncrypted && (
                                    <div className="flex items-center space-x-1 mb-0.5">
                                      <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] rounded font-medium">
                                        <Lock className="w-2.5 h-2.5" />
                                        <span>Decrypted E2EE</span>
                                      </span>
                                    </div>
                                  )}
                                  <p className="whitespace-pre-wrap break-words text-slate-800 dark:text-slate-100 text-xs leading-relaxed">
                                    {msg.content}
                                  </p>
                                </div>
                              )}

                              {/* Media/file attachments */}
                              {msg.fileUrl && (
                                <div className="mt-2">
                                  {msg.messageType === 'image' ? (
                                    <img
                                      src={msg.fileUrl}
                                      alt="attachment"
                                      className="max-h-48 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                                    />
                                  ) : (
                                    <a
                                      href={msg.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-indigo-600 dark:text-indigo-400"
                                    >
                                      <File className="w-4 h-4" />
                                      <span>{msg.fileName || 'Attached file'}</span>
                                      <ExternalLink className="w-3 h-3 ml-1 opacity-70" />
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
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
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 flex items-start gap-1.5">
                          {r.reportedMessage.isEncrypted && (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[9px] rounded font-medium flex-shrink-0">
                              <Lock className="w-2.5 h-2.5" />
                              <span>E2EE</span>
                            </span>
                          )}
                          <span>Message Content: "{r.reportedMessage.content}"</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* AUDIT LOG TAB 
          {activeTab === 'audit' && (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden font-mono text-[11px]">
              {auditLogs.length === 0 ? (
                <div className="p-6 text-center text-slate-400">No audit log records found.</div>
              ) : (
                auditLogs.map((log) => (
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
                ))
              )}
            </div>
          )}*****/}

          {/* AUDIT LOG TAB */}
          {activeTab === 'audit' && (
            <div className="space-y-5">

              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Audit Trail
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Review administrative actions and platform activity.
                  </p>
                </div>

                <span className="text-xs font-semibold px-3 py-1.5 rounded-xl
        bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60
        dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900">
                  {auditLogs.length} Records
                </span>
              </div>

              {/* Search, Filter and View Controls */}
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2
          w-4 h-4 text-slate-400" />

                  <input
                    type="text"
                    value={auditQuery}
                    onChange={(e) => setAuditQuery(e.target.value)}
                    placeholder="Search actions, administrators, or details..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm
            bg-white dark:bg-slate-900
            border border-slate-200 dark:border-slate-700
            text-slate-800 dark:text-white
            placeholder:text-slate-400
            outline-none focus:ring-2 focus:ring-indigo-500/30
            focus:border-indigo-500 transition"
                  />
                </div>

                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="px-4 py-3 rounded-xl text-sm
          bg-white dark:bg-slate-900
          border border-slate-200 dark:border-slate-700
          text-slate-700 dark:text-slate-200
          outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value="all">All Actions</option>
                  {[...new Set(auditLogs.map((log) => log.action).filter(Boolean))]
                    .sort()
                    .map((action) => (
                      <option key={action} value={action}>
                        {action}
                      </option>
                    ))}
                </select>

                <div className="flex items-center gap-1 p-1 rounded-xl
        bg-slate-100 dark:bg-slate-800 border border-slate-200
        dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setAuditView('grid')}
                    aria-pressed={auditView === 'grid'}
                    className={`flex items-center justify-center gap-2 px-4 py-2
            rounded-lg text-sm font-medium transition
            ${auditView === 'grid'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                      }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    Grid
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuditView('list')}
                    aria-pressed={auditView === 'list'}
                    className={`flex items-center justify-center gap-2 px-4 py-2
            rounded-lg text-sm font-medium transition
            ${auditView === 'list'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                      }`}
                  >
                    <List className="w-4 h-4" />
                    List
                  </button>
                </div>
              </div>

              {/* Filter Logs */}
              {(() => {
                const filteredLogs = auditLogs.filter((log) => {
                  const actor = log.actor?.username || 'System';
                  const action = log.action || '';
                  const details =
                    typeof log.details === 'string'
                      ? log.details
                      : JSON.stringify(log.details ?? {});

                  const query = auditQuery.trim().toLowerCase();

                  const matchesQuery =
                    !query ||
                    `${action} ${actor} ${details} ${log._id}`
                      .toLowerCase()
                      .includes(query);

                  const matchesAction =
                    auditActionFilter === 'all' ||
                    action === auditActionFilter;

                  return matchesQuery && matchesAction;
                });

                if (filteredLogs.length === 0) {
                  return (
                    <div className="py-16 px-4 text-center rounded-2xl
            border border-dashed border-slate-300 dark:border-slate-700
            bg-slate-50/70 dark:bg-slate-900/50">
                      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl
              bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <FileText className="w-7 h-7 text-slate-400" />
                      </div>

                      <h4 className="font-semibold text-slate-800 dark:text-white">
                        No audit records found
                      </h4>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Try another search term or select a different action.
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          setAuditQuery('');
                          setAuditActionFilter('all');
                        }}
                        className="mt-4 px-4 py-2 rounded-lg text-sm font-medium
                text-indigo-600 dark:text-indigo-400
                hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                      >
                        Clear filters
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    className={
                      auditView === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
                        : 'flex flex-col gap-3'
                    }
                  >
                    {filteredLogs.map((log) => {
                      const actor = log.actor?.username || 'System';
                      const details = (() => {
                        if (typeof log.details === 'string') {
                          try {
                            return JSON.parse(log.details);
                          } catch {
                            return { description: log.details };
                          }
                        }

                        return log.details && typeof log.details === 'object'
                          ? log.details
                          : {};
                      })();

                      const formatLabel = (key) =>
                        key
                          .replace(/([a-z])([A-Z])/g, '$1 $2')
                          .replace(/[_-]/g, ' ')
                          .replace(/\b\w/g, (char) => char.toUpperCase());

                      const formatValue = (value) => {
                        if (value === null || value === undefined) return '—';
                        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
                        if (Array.isArray(value)) return value.join(', ') || 'None';
                        if (typeof value === 'object') return JSON.stringify(value);
                        return String(value);
                      };

                      return (
                        <article
                          key={log._id}
                          className={`group min-w-0 rounded-2xl border
                  border-slate-200 dark:border-slate-800
                  bg-white dark:bg-slate-900
                  hover:border-indigo-300 dark:hover:border-indigo-700
                  hover:shadow-md hover:shadow-indigo-950/5
                  transition-all duration-200
                  ${auditView === 'list'
                              ? 'p-4 flex flex-col sm:flex-row sm:items-start gap-4'
                              : 'p-4 flex flex-col'
                            }`}
                        >
                          {/* Action Icon */}
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 shrink-0 rounded-xl
                    flex items-center justify-center
                    bg-indigo-50 dark:bg-indigo-950/50
                    text-indigo-600 dark:text-indigo-400">
                              <Shield className="w-5 h-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-slate-800
                        dark:text-slate-100 break-words">
                                  {log.action || 'Unknown action'}
                                </span>

                                <span className="text-[10px] uppercase tracking-wide
                        font-semibold px-2 py-1 rounded-md
                        bg-slate-100 dark:bg-slate-800
                        text-slate-500 dark:text-slate-400">
                                  Audit
                                </span>
                              </div>

                              <p className="text-sm mt-1 text-slate-500 dark:text-slate-400">
                                Performed by{' '}
                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                  @{actor}
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Timestamp */}
                          <div className={`${auditView === 'grid'
                            ? 'mt-4 pt-3 border-t border-slate-100 dark:border-slate-800'
                            : 'sm:min-w-44 sm:text-right'
                            }`}>
                            <div className="flex items-center gap-2 text-xs
                    text-slate-500 dark:text-slate-400
                    sm:justify-end">
                              <icon-placeholder />
                              <span>
                                {log.createdAt
                                  ? new Date(log.createdAt).toLocaleString()
                                  : 'Date unavailable'}
                              </span>
                            </div>
                          </div>

                          {/* Details */}
                          <div className={`${auditView === 'grid'
                            ? 'mt-3'
                            : 'sm:w-full sm:max-w-sm'
                            }`}>
                            <p className="text-[11px] font-semibold uppercase
                    tracking-wider text-slate-400 mb-2">
                              Event Details
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {Object.entries(details).length === 0 ? (
                                <p className="text-xs text-slate-400">
                                  No additional details available.
                                </p>
                              ) : (
                                Object.entries(details).map(([key, value]) => (
                                  <div
                                    key={key}
                                    className="min-w-0 rounded-xl border border-slate-200
          dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60
          p-3"
                                  >
                                    <p className="text-[10px] uppercase tracking-wider font-semibold
          text-slate-400 mb-1">
                                      {formatLabel(key)}
                                    </p>

                                    <p className="text-sm font-medium text-slate-800
          dark:text-slate-100 break-words">
                                      {formatValue(value)}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}






        </div>
      </div>
    </div>
  );
};
