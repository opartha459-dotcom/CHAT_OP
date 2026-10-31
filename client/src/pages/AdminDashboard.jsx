import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Users,
  Flag,
  FileText,
  TrendingUp,
  MessageSquare,
  Trash2,
  Ban,
  UserCheck,
  Search,
  Lock,
  Shield,
  Layers,
  Database,
  Bell,
  Sliders,
  Settings,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Radio,
  ExternalLink,
  Activity,
  HardDrive,
  Vote,
  BarChart3,
  Palette,
  Eye,
  Check,
  Unlock,
  Pencil,
  Play,
  Square,
  CheckSquare,
  X,
  RotateCcw,
  Clock,
  Hourglass,
  XCircle,
  Mail
} from 'lucide-react';import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { GridListView } from '../components/common/GridListView';
import { Avatar } from '../components/common/Avatar';
import { PulseLogo } from '../components/common/PulseLogo';

export const AdminDashboard = () => {
  const auth = useAuth();
  const user = auth.user;
  const token = auth.token;
  const navigate = useNavigate();

  // Fail-safe auth headers extractor
  const authHeaders = (isJson = true) => {
    if (typeof auth.authHeaders === 'function') {
      return auth.authHeaders(isJson);
    }
    const stored = token || localStorage.getItem('pulsechat_token');
    const headers = {};
    if (isJson) headers['Content-Type'] = 'application/json';
    if (stored) headers['Authorization'] = `Bearer ${stored}`;
    return headers;
  };

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Recovery requests state
  const [recoveries, setRecoveries] = useState([]);
  const [recoveriesLoading, setRecoveriesLoading] = useState(false);
  const [resolveModal, setResolveModal] = useState(null); // { request, action: 'approve'|'reject' }
  const [resolveReason, setResolveReason] = useState('');
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveMsg, setResolveMsg] = useState({ text: '', type: '' });
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Data collections
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [allChats, setAllChats] = useState([]);
  const [chatTypeFilter, setChatTypeFilter] = useState('all'); // 'all' | 'group' | 'private'
  const [announcements, setAnnouncements] = useState([]);
  const [reports, setReports] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedAuditLogs, setSelectedAuditLogs] = useState(new Set());
  const [dbStatus, setDbStatus] = useState(null);
  const [systemSettings, setSystemSettings] = useState(null);

  // Chat Monitoring & Inspection State
  const [inspectingChat, setInspectingChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // User Edit Modal State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    nickname: '',
    bio: '',
    email: '',
    role: 'user',
    isBanned: false,
    banReason: ''
  });

  // Delete User Modal State
  const [deleteUserModal, setDeleteUserModal] = useState(null); // { user }
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Recovery request multi-select delete state
  const [selectedRecoveries, setSelectedRecoveries] = useState(new Set());
  const [deletingRecoveries, setDeletingRecoveries] = useState(false);

  // Announcement Modal & Edit state
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [modalTab, setModalTab] = useState('content'); // 'content' | 'design' | 'poll'
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState('info');
  const [newAudience, setNewAudience] = useState('all');

  // Announcement Poll State
  const [hasPoll, setHasPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);

  // Announcement Design State
  const [designTheme, setDesignTheme] = useState('default');
  const [designFont, setDesignFont] = useState('sans');
  const [designBadge, setDesignBadge] = useState('📢');
  const [designAnimation, setDesignAnimation] = useState('none');

  const showMsg = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 4000);
  };

  // Guard: non-admins redirected to chat
  useEffect(() => {
    if (!auth.loading) {
      if (!user) {
        navigate('/login', { replace: true });
      } else if (user.role !== 'admin') {
        navigate('/chat', { replace: true });
      }
    }
  }, [user, auth.loading, navigate]);

  // Load initial stats & settings
  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', { headers: authHeaders(), credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        if (d.success) setStats(d.stats);
      }
    } catch (e) {
      console.warn('Error loading admin stats', e);
    }
  };

  const loadDbStatus = async () => {
    try {
      const res = await fetch('/api/admin/database/status', { headers: authHeaders(), credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        if (d.success) setDbStatus(d.database);
      }
    } catch (e) {
      console.warn('Error loading db status', e);
    }
  };

  const loadSystemSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', { headers: authHeaders(), credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        if (d.success) setSystemSettings(d.settings);
      }
    } catch (e) {
      console.warn('Error loading system settings', e);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users?limit=100', { headers: authHeaders(), credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        if (d.success) setUsers(d.users || []);
      }
    } catch (e) {
      console.warn('Error loading users', e);
    }
  };

  const loadGroups = async () => {
    try {
      const res = await fetch('/api/admin/chats', { headers: authHeaders(), credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          const list = d.conversations || d.chats || [];
          setAllChats(list);
          setGroups(list.filter((c) => c.type === 'group'));
        }
      }
    } catch (e) {
      console.warn('Error loading groups', e);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements/admin/all', { headers: authHeaders(), credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        if (d.success) setAnnouncements(d.announcements || []);
      }
    } catch (e) {
      console.warn('Error loading announcements', e);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs', { headers: authHeaders(), credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        if (d.success) setAuditLogs(d.logs || []);
      }
    } catch (e) {
      console.warn('Error loading audit logs', e);
    }
  };

  // Full dashboard reload pass
  const loadDashboard = async () => {
    setRefreshing(true);
    await Promise.allSettled([
      loadStats(),
      loadDbStatus(),
      loadSystemSettings(),
      loadUsers(),
      loadGroups(),
      loadAnnouncements(),
      loadAuditLogs()
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadDashboard();
    }
  }, [token, user]);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    else if (activeTab === 'groups') loadGroups();
    else if (activeTab === 'announcements') loadAnnouncements();
    else if (activeTab === 'databases') loadDbStatus();
    else if (activeTab === 'audit') loadAuditLogs();
    else if (activeTab === 'settings') loadSystemSettings();
    else if (activeTab === 'recoveries') loadRecoveries();
    else if (activeTab === 'recoveries') loadRecoveries();
  }, [activeTab]);

  // Actions: User Management
  const handleBanToggle = async (targetUser) => {
    const action = targetUser.isBanned ? 'unban' : 'ban';
    if (!window.confirm(`Are you sure you want to ${action} user "${targetUser.username}"?`)) return;

    try {
      const endpoint = targetUser.isBanned
        ? `/api/admin/users/${targetUser._id}/unban`
        : `/api/admin/users/${targetUser._id}/ban`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ reason: 'Admin moderation action' })
      });
      const d = await res.json();
      if (d.success) {
        showMsg(`User ${targetUser.username} ${action}ned successfully.`);
        loadUsers();
        loadStats();
      } else {
        showMsg(d.message || 'Action failed.');
      }
    } catch (e) {
      showMsg('Network error.');
    }
  };

  const handleRoleToggle = async (targetUser) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Change role of "${targetUser.username}" to ${newRole}?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${targetUser._id}/role`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ role: newRole })
      });
      const d = await res.json();
      if (d.success) {
        showMsg(`User role updated to ${newRole}.`);
        loadUsers();
      } else {
        showMsg(d.message || 'Failed to update role.');
      }
    } catch (e) {
      showMsg('Network error.');
    }
  };

  // User Profile Edit Modal Handlers
  const handleOpenEditUser = (u) => {
    setEditingUser(u);
    setUserForm({
      nickname: u.nickname || '',
      bio: u.bio || '',
      email: u.email || '',
      role: u.role || 'user',
      isBanned: Boolean(u.isBanned),
      banReason: u.banReason || ''
    });
    setUserModalOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!deleteUserModal?.user) return;
    if (!deleteReason.trim()) { showMsg('Please provide a deletion reason.'); return; }
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteUserModal.user._id}`, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ reason: deleteReason.trim() })
      });
      const d = await res.json();
      if (d.success) {
        setUsers((prev) => prev.filter((u) => u._id !== deleteUserModal.user._id));
        setDeleteUserModal(null);
        setDeleteReason('');
        showMsg(`User @${deleteUserModal.user.username} permanently deleted.`);
        loadStats();
      } else {
        showMsg(d.message || 'Failed to delete user.');
      }
    } catch (e) {
      showMsg('Network error deleting user.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaveUser = async (e) => {
    e?.preventDefault?.();
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/admin/users/${editingUser._id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          nickname: userForm.nickname,
          bio: userForm.bio,
          email: userForm.email,
          role: userForm.role
        })
      });
      const d = await res.json();

      if (Boolean(editingUser.isBanned) !== Boolean(userForm.isBanned)) {
        const banEndpoint = userForm.isBanned
          ? `/api/admin/users/${editingUser._id}/ban`
          : `/api/admin/users/${editingUser._id}/unban`;
        await fetch(banEndpoint, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ reason: userForm.banReason || 'Administrative update' })
        });
      }

      if (d.success) {
        showMsg(`User @${editingUser.username} updated.`);
        setUserModalOpen(false);
        setEditingUser(null);
        loadUsers();
        loadStats();
      } else {
        showMsg(d.message || 'Failed to update user.');
      }
    } catch (e) {
      showMsg('Failed to update user profile.');
    }
  };

  // Chat Monitoring & Inspection Handlers
  const handleInspectChat = async (convo) => {
    setInspectingChat(convo);
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/admin/chats/${convo._id}/messages`, {
        headers: authHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          setChatMessages(d.messages || []);
        }
      }
    } catch (e) {
      showMsg('Failed to load chat messages.');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleDeleteChatMessage = async (msgId) => {
    if (!window.confirm('Delete this message permanently from the platform?')) return;
    try {
      const res = await fetch(`/api/admin/messages/${msgId}`, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include'
      });
      const d = await res.json();
      if (d.success) {
        setChatMessages((prev) => prev.filter((m) => m._id !== msgId));
        showMsg('Message deleted by admin.');
        loadGroups();
        loadStats();
      } else {
        showMsg(d.message || 'Failed to delete message.');
      }
    } catch (e) {
      showMsg('Network error deleting message.');
    }
  };

  const handleDeleteEntireChat = async (chatId) => {
    if (!window.confirm('DANGER: Delete this entire chat and all its messages permanently?')) return;
    try {
      const res = await fetch(`/api/admin/chats/${chatId}`, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include'
      });
      const d = await res.json();
      if (d.success) {
        showMsg('Conversation deleted.');
        setInspectingChat(null);
        setChatMessages([]);
        loadGroups();
        loadStats();
      } else {
        showMsg(d.message || 'Failed to delete conversation.');
      }
    } catch (e) {
      showMsg('Network error deleting chat.');
    }
  };

  // Actions: Announcements
  const handleOpenCreateAnnouncement = () => {
    setEditingAnnouncement(null);
    setNewTitle('');
    setNewContent('');
    setNewType('info');
    setNewAudience('all');
    setHasPoll(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setAllowMultiple(false);
    setDesignTheme('default');
    setDesignFont('sans');
    setDesignBadge('📢');
    setDesignAnimation('none');
    setModalTab('content');
    setAnnouncementModalOpen(true);
  };

  const handleOpenEditAnnouncement = (a) => {
    setEditingAnnouncement(a);
    setNewTitle(a.title || '');
    setNewContent(a.content || '');
    setNewType(a.type || 'info');
    setNewAudience(a.targetAudience || 'all');
    setHasPoll(Boolean(a.hasPoll));
    setPollQuestion(a.poll?.question || '');
    setPollOptions(a.poll?.options?.length ? a.poll.options.map((o) => o.text) : ['', '']);
    setAllowMultiple(Boolean(a.poll?.allowMultiple));
    setDesignTheme(a.design?.theme || 'default');
    setDesignFont(a.design?.font || 'sans');
    setDesignBadge(a.design?.badge || (a.hasPoll ? '🗳️' : '📢'));
    setDesignAnimation(a.design?.animation || 'none');
    setModalTab('content');
    setAnnouncementModalOpen(true);
  };

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      showMsg('Title and content are required.');
      return;
    }

    if (hasPoll) {
      const validOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (validOptions.length < 2) {
        showMsg('A poll requires at least 2 valid options.');
        setModalTab('poll');
        return;
      }
    }

    try {
      const payload = {
        title: newTitle.trim(),
        content: newContent.trim(),
        type: newType,
        targetAudience: newAudience,
        hasPoll,
        poll: hasPoll
          ? {
              question: pollQuestion.trim() || newTitle.trim(),
              options: pollOptions.map((o) => o.trim()).filter(Boolean),
              allowMultiple
            }
          : undefined,
        design: {
          theme: designTheme,
          font: designFont,
          badge: designBadge,
          animation: designAnimation
        }
      };

      const endpoint = editingAnnouncement
        ? `/api/announcements/admin/${editingAnnouncement._id}`
        : '/api/announcements/admin';
      const method = editingAnnouncement ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      const d = await res.json();
      if (d.success) {
        showMsg(editingAnnouncement ? 'Announcement & color updated.' : 'Announcement published.');
        setAnnouncementModalOpen(false);
        setEditingAnnouncement(null);
        loadAnnouncements();
      } else {
        showMsg(d.message || 'Could not save announcement.');
      }
    } catch (e) {
      showMsg('Failed to save announcement.');
    }
  };

  const handleTogglePollClosed = async (id) => {
    try {
      const res = await fetch(`/api/announcements/admin/${id}/poll/close`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include'
      });
      const d = await res.json();
      if (d.success) {
        showMsg(d.message);
        loadAnnouncements();
      } else {
        showMsg(d.message || 'Could not update poll state.');
      }
    } catch (e) {
      showMsg('Failed to toggle poll state.');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      const res = await fetch(`/api/announcements/admin/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      const d = await res.json();
      if (d.success) {
        showMsg('Announcement deleted.');
        loadAnnouncements();
      }
    } catch (e) {
      showMsg('Network error.');
    }
  };

  const handleTogglePublishAnnouncement = async (a) => {
    try {
      const willPublish = a.isPublished === false;
      const res = await fetch(`/api/announcements/admin/${a._id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ isPublished: willPublish })
      });
      const d = await res.json();
      if (d.success) {
        showMsg(willPublish ? 'Announcement resumed broadcasting.' : 'Announcement broadcasting stopped.');
        loadAnnouncements();
      } else {
        showMsg(d.message || 'Could not update announcement broadcast state.');
      }
    } catch (e) {
      showMsg('Failed to toggle announcement broadcast.');
    }
  };

  // Actions: Direct & Group Chat Navigation
  const handleOpenInChat = (chat) => {
    localStorage.setItem('pulsechat_pending_chat', chat._id);
    navigate('/chat');
  };

  const handleStartDirectChat = async (targetUserId) => {
    try {
      const res = await fetch('/api/chats/private', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ recipientId: targetUserId })
      });
      const d = await res.json();
      if (d.success && d.conversation) {
        localStorage.setItem('pulsechat_pending_chat', d.conversation._id);
        navigate('/chat');
      } else {
        showMsg(d.message || 'Could not open direct chat');
      }
    } catch (err) {
      showMsg('Network error opening direct chat');
    }
  };

  // Actions: Audit Log Multi-Select & Batch Delete
  const handleToggleSelectAuditLog = (id) => {
    setSelectedAuditLogs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllAuditLogs = () => {
    if (selectedAuditLogs.size === auditLogs.length) {
      setSelectedAuditLogs(new Set());
    } else {
      setSelectedAuditLogs(new Set(auditLogs.map((l) => l._id)));
    }
  };

  const handleDeleteSelectedAuditLogs = async () => {
    const ids = Array.from(selectedAuditLogs);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} selected audit log record(s)?`)) return;

    try {
      const res = await fetch('/api/admin/audit-logs', {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ ids })
      });
      const d = await res.json();
      if (d.success) {
        showMsg(d.message || 'Audit logs deleted.');
        setSelectedAuditLogs(new Set());
        loadAuditLogs();
      } else {
        showMsg(d.message || 'Could not delete audit logs.');
      }
    } catch (e) {
      showMsg('Network error deleting audit logs.');
    }
  };

  const handleClearAllAuditLogs = async () => {
    if (!window.confirm('Are you sure you want to clear ALL audit logs? This cannot be undone.')) return;

    try {
      const res = await fetch('/api/admin/audit-logs', {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ all: true })
      });
      const d = await res.json();
      if (d.success) {
        showMsg(d.message || 'All audit logs cleared.');
        setSelectedAuditLogs(new Set());
        loadAuditLogs();
      } else {
        showMsg(d.message || 'Could not clear audit logs.');
      }
    } catch (e) {
      showMsg('Network error clearing audit logs.');
    }
  };

  const handleDeleteSingleAuditLog = async (id) => {
    try {
      const res = await fetch('/api/admin/audit-logs', {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ ids: [id] })
      });
      const d = await res.json();
      if (d.success) {
        showMsg('Audit log removed.');
        setSelectedAuditLogs((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        loadAuditLogs();
      }
    } catch (e) {
      showMsg('Network error.');
    }
  };

  // Actions: Feature Flag Toggle
  const handleToggleFeature = async (flagKey, currentValue) => {
    try {
      const updatedFlags = {
        ...(systemSettings?.featureFlags || {}),
        [flagKey]: !currentValue
      };

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ featureFlags: updatedFlags })
      });
      const d = await res.json();
      if (d.success) {
        setSystemSettings(d.settings);
        showMsg(`Updated feature flag: ${flagKey}`);
      }
    } catch (e) {
      showMsg('Failed to update feature setting.');
    }
  };

  // ── Recovery Requests ─────────────────────────────────────────────────────
  const loadRecoveries = async () => {
    setRecoveriesLoading(true);
    try {
      const res = await fetch('/api/admin/recoveries', { headers: authHeaders(), credentials: 'include' });
      const d = await res.json();
      if (d.success) setRecoveries(d.requests || []);
    } catch { /* ignore */ }
    setRecoveriesLoading(false);
  };

  const handleResolveRecovery = async () => {
    if (!resolveModal) return;
    setResolveLoading(true);
    setResolveMsg({ text: '', type: '' });
    try {
      const res = await fetch(`/api/admin/recoveries/${resolveModal.request._id}/resolve`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ action: resolveModal.action, reason: resolveReason })
      });
      const d = await res.json();
      if (d.success) {
        setResolveMsg({ text: d.message || 'Done.', type: 'success' });
        setRecoveries(prev => prev.map(r =>
          r._id === resolveModal.request._id
            ? { ...r, status: resolveModal.action === 'approve' ? 'approved' : 'rejected' }
            : r
        ));
        setTimeout(() => {
          setResolveModal(null);
          setResolveReason('');
          setResolveMsg({ text: '', type: '' });
        }, 1500);
      } else {
        setResolveMsg({ text: d.message || 'Failed.', type: 'error' });
      }
    } catch {
      setResolveMsg({ text: 'Network error.', type: 'error' });
    }
    setResolveLoading(false);
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'groups', label: 'Chats & Groups', icon: MessageSquare },
    { id: 'announcements', label: 'Announcements', icon: Bell },
    { id: 'recoveries', label: 'Account Recoveries', icon: RotateCcw },
    { id: 'databases', label: 'Databases & Health', icon: HardDrive },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
    { id: 'settings', label: 'System Settings', icon: Sliders }
  ];

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm font-medium text-slate-400">Verifying Administrator Permissions...</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/chat')}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Back to Chat"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
                <span>PulseChat Admin</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 font-semibold border border-rose-200 dark:border-rose-800">
                  Root RBAC
                </span>
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadDashboard}
            disabled={refreshing}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          {feedback && (
            <div className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{feedback}</span>
            </div>
          )}

          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <Avatar src={user?.avatar} name={user?.username} size="sm" />
            <div className="hidden md:block text-left text-xs">
              <div className="font-semibold text-slate-800 dark:text-white">{user?.username}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Administrator</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 hidden md:flex flex-col justify-between shrink-0">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Database Health Status Card */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase font-mono">Database</span>
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  dbStatus?.status === 'healthy' || dbStatus?.state === 'connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-emerald-500'
                }`}
              />
            </div>
            <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
              {dbStatus?.name || 'pulsechat'} ({dbStatus?.latencyMs || 2}ms)
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {/* Mobile Tab Scroller */}
          <div className="md:hidden flex items-center space-x-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center space-x-1.5 transition ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 max-w-6xl">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">System Overview</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Real-time operational metrics, quick actions, and active records
                </p>
              </div>

              {/* Quick Action Broadcast Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200 dark:border-indigo-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Broadcast Announcement or Poll</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Publish announcements with custom gradient themes, typography, and interactive voting.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAnnouncementModalOpen(true);
                    setModalTab('content');
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-sm shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Announcement</span>
                </button>
              </div>

              {/* Stats Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div
                  onClick={() => setActiveTab('users')}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs cursor-pointer hover:border-indigo-500/50 transition group"
                >
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-medium">Total Users</span>
                    <Users className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                    {stats?.totalUsers !== undefined ? stats.totalUsers : (users.length || 0)}
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                    {stats?.activeToday || 1} active in last 24h
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('groups')}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs cursor-pointer hover:border-sky-500/50 transition group"
                >
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-medium">Groups</span>
                    <Layers className="w-4 h-4 text-sky-500 group-hover:scale-110 transition" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                    {stats?.totalGroups !== undefined ? stats.totalGroups : (groups.length || 0)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Encrypted Channels</div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-medium">Direct Chats</span>
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                    {stats?.totalDirectChats || 0}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">1-on-1 Sessions</div>
                </div>

                <div
                  onClick={() => setActiveTab('announcements')}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs cursor-pointer hover:border-amber-500/50 transition group"
                >
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-medium">Announcements</span>
                    <Bell className="w-4 h-4 text-amber-500 group-hover:scale-110 transition" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                    {announcements.length}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Broadcasts & Polls</div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-medium">Messages Sent</span>
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                    {stats?.totalMessages || 0}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">All-time throughput</div>
                </div>
              </div>

              {/* Quick Actions & Navigation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div
                  onClick={() => setActiveTab('users')}
                  className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs hover:border-indigo-500/50 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-4">User Management</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Inspect accounts, toggle moderation bans, and adjust access roles.
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('announcements')}
                  className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs hover:border-indigo-500/50 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400 flex items-center justify-center">
                      <Bell className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-4">Announcements</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Publish real-time news alerts, release notes, and community polls.
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('databases')}
                  className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs hover:border-indigo-500/50 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400 flex items-center justify-center">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-4">Database Health</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Inspect MongoDB connections, category allocations, and query latency.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USERS */}
          {activeTab === 'users' && (
            <div className="max-w-6xl">
              <GridListView
                title="User Accounts"
                subtitle="Search, inspect, and manage system user accounts"
                items={users}
                loading={loading}
                initialView="grid"
                storageKey="admin_users"
                searchKeys={['username', 'email', 'nickname']}
                searchPlaceholder="Search users by name or email..."
                dateKey="createdAt"
                filters={[
                  {
                    key: 'role',
                    label: 'Role',
                    options: [
                      { label: 'Admin', value: 'admin' },
                      { label: 'User', value: 'user' }
                    ]
                  },
                  {
                    key: 'isBanned',
                    label: 'Status',
                    options: [
                      { label: 'Active', value: false },
                      { label: 'Banned', value: true }
                    ]
                  }
                ]}
                sortOptions={[
                  { label: 'Newest First', key: 'createdAt', direction: 'desc' },
                  { label: 'Username (A-Z)', key: 'username', direction: 'asc' }
                ]}
                renderItem={(u, mode) => (
                  <div
                    className={`p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs ${
                      mode === 'grid' ? 'flex flex-col gap-3' : 'flex items-center justify-between'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Avatar src={u.avatar} name={u.username} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{u.username}</span>
                          <span
                            className={`shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase ${
                              u.role === 'admin'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {u.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{u.email}</div>
                        {u.isBanned && (
                          <span className="inline-block mt-1 text-[10px] text-rose-500 font-semibold truncate">
                            Banned: {u.banReason || 'Policy violation'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={`flex items-center gap-1.5 mt-1 ${mode === 'grid' ? 'flex-wrap' : 'flex-nowrap'}`}>
                      {u._id !== user?._id && (
                        <button
                          onClick={() => handleStartDirectChat(u._id)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition cursor-pointer flex items-center space-x-1"
                          title="Open direct chat with this user"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Chat</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEditUser(u)}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer flex items-center space-x-1"
                        title="Edit user profile"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleRoleToggle(u)}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                        title="Toggle admin / user role"
                      >
                        {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                      </button>

                      <button
                        onClick={() => handleBanToggle(u)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-xl transition cursor-pointer ${
                          u.isBanned
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400 hover:bg-rose-100'
                        }`}
                        title={u.isBanned ? 'Lift ban' : 'Ban account'}
                      >
                        {u.isBanned ? 'Unban' : 'Ban'}
                      </button>

                      {u.role !== 'admin' && (
                        <button
                          onClick={() => { setDeleteUserModal({ user: u }); setDeleteReason(''); }}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded-xl transition cursor-pointer"
                          title="Permanently delete user"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {/* TAB 3: CHATS & GROUPS */}
          {activeTab === 'groups' && (
            <div className="max-w-6xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span>Chat Channels & Direct Messages</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Monitor live conversations, inspect full message threads, and moderate abusive content
                  </p>
                </div>

                <div className="flex items-center space-x-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setChatTypeFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      chatTypeFilter === 'all'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    All ({allChats.length})
                  </button>
                  <button
                    onClick={() => setChatTypeFilter('group')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      chatTypeFilter === 'group'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Groups ({allChats.filter((c) => c.type === 'group').length})
                  </button>
                  <button
                    onClick={() => setChatTypeFilter('private')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      chatTypeFilter === 'private'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Direct ({allChats.filter((c) => c.type === 'private').length})
                  </button>
                </div>
              </div>

              <GridListView
                title=""
                items={allChats.filter((c) => chatTypeFilter === 'all' || c.type === chatTypeFilter)}
                loading={loading}
                initialView="grid"
                storageKey="admin_all_chats"
                searchKeys={['groupDetails.name', 'groupDetails.description', 'participants.username', 'participants.nickname']}
                searchPlaceholder="Search conversations by name or participant..."
                dateKey="createdAt"
                renderItem={(c, mode) => {
                  const isGroup = c.type === 'group';
                  const title = isGroup
                    ? c.groupDetails?.name || 'Group Channel'
                    : c.participants?.map((p) => `@${p.username}`).join(' ↔ ') || 'Direct Chat';
                  const desc = isGroup
                    ? c.groupDetails?.description || 'Active group channel'
                    : `1-on-1 private encrypted chat (${c.participants?.length || 2} members)`;

                  return (
                    <div
                      className={`p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition hover:border-indigo-500/40 hover:shadow-md ${
                        mode === 'grid' ? 'flex flex-col justify-between h-full min-h-[220px]' : 'flex items-center justify-between'
                      }`}
                    >
                      <div className={`space-y-3 ${mode === 'grid' ? 'w-full' : 'flex items-start space-x-3 min-w-0 flex-1 pr-4'}`}>
                        <div className="flex items-start space-x-3 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                              isGroup
                                ? 'bg-purple-100 text-purple-600 dark:bg-purple-950/80 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50'
                                : 'bg-cyan-100 text-cyan-600 dark:bg-cyan-950/80 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/50'
                            }`}
                          >
                            {isGroup ? <Layers className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {title}
                              </h4>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase shrink-0 ${
                                  isGroup
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                    : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300'
                                }`}
                              >
                                {c.type}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                              {desc}
                            </p>
                          </div>
                        </div>

                        {/* Badges / Stats */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono pt-1">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                            👥 {c.participants?.length || 0} members
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                            💬 {c.messageCount || 0} msgs
                          </span>
                          {c.createdAt && (
                            <span className="text-slate-400">
                              {new Date(c.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className={`pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 ${mode === 'grid' ? 'w-full mt-3' : 'shrink-0'}`}>
                        <button
                          onClick={() => handleOpenInChat(c)}
                          className="flex-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                          title="Open and navigate directly to this conversation in Chat"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Chat</span>
                        </button>

                        <button
                          onClick={() => handleInspectChat(c)}
                          className="flex-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-xs"
                          title="Inspect conversation messages"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>

                        <button
                          onClick={() => handleDeleteEntireChat(c._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                }}
              />
            </div>
          )}

          {/* TAB 4: ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <div className="max-w-6xl">
              <GridListView
                title="Announcements Feed"
                subtitle="Create, publish, and manage notifications broadcast to all users"
                items={announcements}
                loading={loading}
                initialView="grid"
                storageKey="admin_announcements"
                searchKeys={['title', 'content']}
                searchPlaceholder="Search announcements..."
                dateKey="createdAt"
                headerActions={
                  <button
                    onClick={handleOpenCreateAnnouncement}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Announcement</span>
                  </button>
                }
                renderItem={(a, mode) => {
                  const themeColors = {
                    default: 'bg-slate-800 text-slate-200 border-slate-700',
                    'cyber-glow': 'bg-gradient-to-r from-purple-900 to-cyan-900 text-cyan-200 border-cyan-400',
                    cyberpunk: 'bg-gradient-to-r from-purple-900 to-cyan-900 text-cyan-200 border-cyan-400',
                    'sunset-fire': 'bg-gradient-to-r from-rose-900 to-amber-900 text-amber-200 border-amber-400',
                    sunset: 'bg-gradient-to-r from-rose-900 to-amber-900 text-amber-200 border-amber-400',
                    'emerald-matrix': 'bg-gradient-to-r from-emerald-900 to-teal-900 text-emerald-200 border-emerald-400',
                    emerald: 'bg-gradient-to-r from-emerald-900 to-teal-900 text-emerald-200 border-emerald-400',
                    'royal-amethyst': 'bg-gradient-to-r from-indigo-900 to-violet-900 text-violet-200 border-violet-400',
                    amethyst: 'bg-gradient-to-r from-indigo-900 to-violet-900 text-violet-200 border-violet-400',
                    'ocean-wave': 'bg-gradient-to-r from-blue-900 to-sky-900 text-sky-200 border-sky-400',
                    ocean: 'bg-gradient-to-r from-blue-900 to-sky-900 text-sky-200 border-sky-400',
                    'crimson-ruby': 'bg-gradient-to-r from-red-900 to-rose-900 text-rose-200 border-rose-400',
                    ruby: 'bg-gradient-to-r from-red-900 to-rose-900 text-rose-200 border-rose-400',
                    'minimal-glass': 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300'
                  };
                  const themeClass = themeColors[a.design?.theme] || themeColors.default;

                  return (
                    <div
                      className={`p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition hover:border-indigo-500/40 hover:shadow-md ${
                        mode === 'grid' ? 'flex flex-col justify-between h-full space-y-3' : 'flex items-start justify-between'
                      }`}
                    >
                      <div className={`space-y-2.5 ${mode === 'grid' ? 'w-full' : 'flex-1 pr-4'}`}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-base select-none shrink-0" role="img" aria-label="badge">
                            {a.design?.badge || (a.hasPoll ? '🗳️' : '📢')}
                          </span>
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{a.title}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono uppercase font-semibold ${
                              a.type === 'critical'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                                : a.type === 'warning'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400'
                            }`}
                          >
                            {a.type}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border shadow-xs ${themeClass}`}>
                            🎨 {a.design?.theme || 'default'}
                          </span>
                          {a.hasPoll && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold font-mono bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 flex items-center space-x-1">
                              <BarChart3 className="w-3 h-3" />
                              <span>Poll Attached</span>
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border ${
                              a.isPublished !== false
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {a.isPublished !== false ? '● Live' : '⏸ Stopped'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Audience: {a.targetAudience}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {a.content}
                        </p>

                        {/* Attached Poll Breakdown & Results */}
                        {a.hasPoll && a.poll && (
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-2 text-xs">
                            <div className="flex items-center justify-between font-semibold gap-2">
                              <span className="truncate text-indigo-600 dark:text-indigo-400 flex items-center space-x-1.5">
                                <Vote className="w-3.5 h-3.5 shrink-0" />
                                <span className="font-bold truncate">{a.poll.question || 'Poll Question'}</span>
                              </span>
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold shrink-0 ${
                                  a.poll.isClosed
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                                }`}
                              >
                                {a.poll.isClosed ? '🔒 Closed · Results' : '● Live Voting'}
                              </span>
                            </div>

                            {/* Options live percentage visualization */}
                            {Array.isArray(a.poll.options) && a.poll.options.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                {(() => {
                                  const tot = a.totalPollVotes || a.poll.options.reduce((s, o) => s + (o.votes?.length || 0), 0) || 0;
                                  let topVote = 0;
                                  a.poll.options.forEach((o) => {
                                    const c = o.votes?.length || 0;
                                    if (c > topVote) topVote = c;
                                  });
                                  return a.poll.options.map((opt, optIdx) => {
                                    const vCount = opt.votes ? opt.votes.length : 0;
                                    const pct = tot > 0 ? Math.round((vCount / tot) * 100) : 0;
                                    const isWinner = topVote > 0 && vCount === topVote;
                                    return (
                                      <div key={optIdx} className="space-y-0.5">
                                        <div className="flex items-center justify-between text-[11px]">
                                          <span className="truncate font-medium flex items-center space-x-1">
                                            <span>{opt.text}</span>
                                            {isWinner && (
                                              <span className="text-[9px] font-bold text-amber-500 uppercase px-1 rounded bg-amber-500/10">
                                                {a.poll.isClosed ? 'Winner' : 'Leading'}
                                              </span>
                                            )}
                                          </span>
                                          <span className="font-mono text-slate-500 dark:text-slate-400 text-[10px]">
                                            <strong>{pct}%</strong> ({vCount} {vCount === 1 ? 'vote' : 'votes'})
                                          </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full transition-all duration-300 rounded-full ${
                                              isWinner
                                                ? 'bg-amber-500'
                                                : 'bg-indigo-600 dark:bg-indigo-500'
                                            }`}
                                            style={{ width: `${pct}%` }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            )}

                            <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                              <span>{a.poll.options?.length || 0} options · {a.totalPollVotes || 0} total votes</span>
                              <span>{a.poll.allowMultiple ? 'Multi-choice' : 'Single-choice'}</span>
                            </div>
                          </div>
                        )}

                        <div className="text-[10px] text-slate-400 font-mono pt-1">
                          Acknowledged by {a.acknowledgmentCount || 0} users •{' '}
                          {new Date(a.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Bottom action buttons */}
                      <div className={`pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 ${mode === 'grid' ? 'w-full mt-2' : 'shrink-0'}`}>
                        <button
                          onClick={() => handleTogglePublishAnnouncement(a)}
                          className={`flex-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer flex items-center justify-center space-x-1 ${
                            a.isPublished !== false
                              ? 'border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                              : 'border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          }`}
                          title={a.isPublished !== false ? 'Stop broadcasting this announcement' : 'Resume broadcasting announcement'}
                        >
                          {a.isPublished !== false ? (
                            <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                          ) : (
                            <Play className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                          <span>{a.isPublished !== false ? 'Stop' : 'Resume'}</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditAnnouncement(a)}
                          className="flex-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer flex items-center justify-center space-x-1"
                          title="Edit announcement content & theme color"
                        >
                          <Pencil className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Edit</span>
                        </button>

                        {a.hasPoll && a.poll && (
                          <button
                            onClick={() => handleTogglePollClosed(a._id)}
                            className={`flex-1 px-2 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer flex items-center justify-center space-x-1 ${
                              a.poll.isClosed
                                ? 'border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                : 'border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                            }`}
                            title={a.poll.isClosed ? 'Reopen poll voting' : 'Close poll voting'}
                          >
                            {a.poll.isClosed ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            <span>{a.poll.isClosed ? 'Reopen' : 'Close'}</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteAnnouncement(a._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                          title="Delete announcement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                }}
              />
            </div>
          )}

          {/* TAB 5: DATABASES */}
          {activeTab === 'databases' && (
            <div className="space-y-6 max-w-5xl">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Database Management</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Inspect connection health, logical category assignments, and query response time
                </p>
              </div>

              {/* Status Header Banner */}
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <HardDrive className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                      <span>MongoDB Primary Instance</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {dbStatus?.connectionState || 'Connected'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                      Host: {dbStatus?.host || '127.0.0.1'} | Database: {dbStatus?.name || 'pulsechat'} | Latency: {dbStatus?.latencyMs || 0}ms
                    </p>
                  </div>
                </div>

                <button
                  onClick={loadDbStatus}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Ping</span>
                </button>
              </div>

              {/* Logical Category Allocation Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs p-5 space-y-4">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Logical Category Separation & Database Mapping
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-white">1. Users & Authentication Data</span>
                      <p className="text-[11px] text-slate-500">Credentials, public keys, privacy preferences, sessions</p>
                    </div>
                    <span className="font-mono text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-indigo-600 dark:text-indigo-400 font-semibold">
                      Target: {dbStatus?.assignments?.authDb || 'primary'}
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-white">2. Direct-Message (1-on-1) Data</span>
                      <p className="text-[11px] text-slate-500">End-to-end encrypted direct chat records, delivery state</p>
                    </div>
                    <span className="font-mono text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-indigo-600 dark:text-indigo-400 font-semibold">
                      Target: {dbStatus?.assignments?.messagesDb || 'primary'}
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-white">3. Group-Chat & Channel Data</span>
                      <p className="text-[11px] text-slate-500">Group rosters, invite codes, admins, shared group history</p>
                    </div>
                    <span className="font-mono text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-indigo-600 dark:text-indigo-400 font-semibold">
                      Target: {dbStatus?.assignments?.groupsDb || 'primary'}
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-white">4. Activity & Security Audit Logs</span>
                      <p className="text-[11px] text-slate-500">Administrative moderation logs, login telemetry</p>
                    </div>
                    <span className="font-mono text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-indigo-600 dark:text-indigo-400 font-semibold">
                      Target: {dbStatus?.assignments?.auditDb || 'primary'}
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-white">5. Deleted-Account Retention (Trash DB)</span>
                      <p className="text-[11px] text-slate-500">Isolated retention store during recovery window</p>
                    </div>
                    <span className="font-mono text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-rose-600 dark:text-rose-400 font-semibold">
                      Target: {dbStatus?.assignments?.retentionDb || 'isolated_retention'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ACCOUNT RECOVERIES */}
          {activeTab === 'recoveries' && (
            <div className="max-w-5xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Account Recovery Requests</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Review, approve or reject user account restoration requests.</p>
                </div>
                <button onClick={loadRecoveries} className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition">
                  <RefreshCw className="w-3.5 h-3.5" /><span>Refresh</span>
                </button>
              </div>

              {recoveriesLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" /><span className="text-sm">Loading requests...</span>
                </div>
              ) : recoveries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-2">
                  <RotateCcw className="w-10 h-10 opacity-30" />
                  <p className="text-sm font-medium">No recovery requests</p>
                  <p className="text-xs">All clear — no pending account restorations.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recoveries.map(req => {
                    const isPending    = req.status === 'pending' || req.status === 'partial';
                    const isApproved   = req.status === 'approved';
                    const isPartial    = req.status === 'partial';
                    const isMigration  = req.requestType === 'data_migration';
                    const statusColor  = isPending ? 'text-amber-400 bg-amber-950/40 border-amber-700/50'
                      : isApproved ? 'text-emerald-400 bg-emerald-950/40 border-emerald-700/50'
                      : isPartial ? 'text-indigo-400 bg-indigo-950/40 border-indigo-700/50'
                      : 'text-rose-400 bg-rose-950/40 border-rose-700/50';
                    const typeColor    = isMigration
                      ? 'text-purple-300 bg-purple-950/40 border-purple-700/50'
                      : 'text-blue-300 bg-blue-950/40 border-blue-700/50';

                    return (
                      <div key={req._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-2 flex-wrap gap-1">
                              <span className="text-sm font-bold text-white">@{req.user?.username || req.originalUsername}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                                {req.status.toUpperCase()}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeColor}`}>
                                {isMigration ? '📦 DATA MIGRATION' : '🔄 RESTORE'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">{req.user?.email || req.email}</p>
                          </div>
                          <div className="text-right text-[11px] text-slate-500 space-y-0.5">
                            <p>Submitted: {new Date(req.createdAt).toLocaleString()}</p>
                            {req.user?.recoveryDeadline && (
                              <p className="text-amber-400">Deadline: {new Date(req.user.recoveryDeadline).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>

                        {/* Data migration: show old → new account link + per-item controls */}
                        {isMigration && req.newAccount && (
                          <div className="bg-purple-950/30 border border-purple-800/40 rounded-xl p-3 text-xs space-y-3">
                            <p className="text-purple-300 font-bold text-[10px] uppercase tracking-wider">Data Migration Request</p>
                            <div className="flex items-center space-x-3 flex-wrap gap-2">
                              <div className="flex-1 bg-slate-900 rounded-lg p-2 space-y-0.5 min-w-[120px]">
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Old Account</p>
                                <p className="text-rose-300 font-semibold">@{req.user?.username || req.originalUsername}</p>
                                <p className="text-slate-500 text-[10px]">{req.originalEmail || req.user?.email || req.email}</p>
                              </div>
                              <span className="text-slate-500 text-lg">→</span>
                              <div className="flex-1 bg-slate-900 rounded-lg p-2 space-y-0.5 min-w-[120px]">
                                <p className="text-[10px] text-slate-500 font-bold uppercase">New Account</p>
                                <p className="text-emerald-300 font-semibold">@{req.newAccount.username}</p>
                                <p className="text-slate-500 text-[10px]">{req.newAccount.email}</p>
                              </div>
                            </div>

                            {/* Per-item data controls */}
                            {req.requestedItems && req.requestedItems.length > 0 && (
                              <div className="space-y-2 pt-1">
                                <p className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">Requested Data Items</p>
                                {req.requestedItems.map(item => {
                                  const itemPending  = item.status === 'pending';
                                  const itemApproved = item.status === 'approved';
                                  return (
                                    <div key={item.key} className="flex items-center justify-between bg-slate-900/80 rounded-lg px-3 py-2 gap-2">
                                      <div className="flex items-center space-x-2">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${itemApproved ? 'bg-emerald-400' : item.status === 'rejected' ? 'bg-rose-400' : 'bg-amber-400'}`} />
                                        <span className="text-xs text-slate-200 font-medium">{item.label}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${itemApproved ? 'bg-emerald-900/60 text-emerald-300' : item.status === 'rejected' ? 'bg-rose-900/60 text-rose-300' : 'bg-amber-900/60 text-amber-300'}`}>
                                          {item.status.toUpperCase()}
                                        </span>
                                      </div>
                                      {itemPending && (
                                        <div className="flex items-center space-x-1.5 shrink-0">
                                          <button
                                            onClick={async () => {
                                              const r = await fetch(`/api/admin/recoveries/${req._id}/items/${item.key}/resolve`, {
                                                method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, credentials: 'include',
                                                body: JSON.stringify({ action: 'approve' })
                                              });
                                              const d = await r.json();
                                              if (d.success) setRecoveries(prev => prev.map(x => x._id === req._id ? { ...x, requestedItems: d.overallStatus ? x.requestedItems.map(i => i.key === item.key ? { ...i, status: 'approved' } : i) : x.requestedItems, status: d.overallStatus || x.status } : x));
                                            }}
                                            className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg transition"
                                          >✓ Approve</button>
                                          <button
                                            onClick={async () => {
                                              const r = await fetch(`/api/admin/recoveries/${req._id}/items/${item.key}/resolve`, {
                                                method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, credentials: 'include',
                                                body: JSON.stringify({ action: 'reject' })
                                              });
                                              const d = await r.json();
                                              if (d.success) setRecoveries(prev => prev.map(x => x._id === req._id ? { ...x, requestedItems: x.requestedItems.map(i => i.key === item.key ? { ...i, status: 'rejected' } : i), status: d.overallStatus || x.status } : x));
                                            }}
                                            className="px-2 py-1 bg-rose-700 hover:bg-rose-600 text-white text-[10px] font-bold rounded-lg transition"
                                          >✕ Reject</button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {req.requestedItems && req.requestedItems.length === 0 && (
                              <p className="text-[10px] text-slate-500 italic">User hasn't selected specific data items yet.</p>
                            )}
                          </div>
                        )}

                        {/* Linked user data grid */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[11px]">
                          <div className="bg-slate-800/60 rounded-xl p-2.5 space-y-0.5">
                            <p className="text-slate-500 uppercase tracking-wider font-bold text-[10px]">Old Acct Status</p>
                            <p className="text-white font-semibold">{req.user?.deletionStatus || '—'}</p>
                          </div>
                          <div className="bg-slate-800/60 rounded-xl p-2.5 space-y-0.5">
                            <p className="text-slate-500 uppercase tracking-wider font-bold text-[10px]">Registered</p>
                            <p className="text-white font-semibold">{req.user?.createdAt ? new Date(req.user.createdAt).toLocaleDateString() : '—'}</p>
                          </div>
                          <div className="bg-slate-800/60 rounded-xl p-2.5 space-y-0.5">
                            <p className="text-slate-500 uppercase tracking-wider font-bold text-[10px]">Request ID</p>
                            <p className="text-indigo-300 font-mono text-[10px] break-all">{req._id?.slice(-8)}</p>
                          </div>
                          <div className="bg-slate-800/60 rounded-xl p-2.5 space-y-0.5">
                            <p className="text-slate-500 uppercase tracking-wider font-bold text-[10px]">IP Address</p>
                            <p className="text-white font-semibold">{req.ipAddress || '—'}</p>
                          </div>
                        </div>

                        {/* User note */}
                        {req.userNote && (
                          <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-xl p-3">
                            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider mb-1">User's Note</p>
                            <p className="text-xs text-slate-300 leading-relaxed">{req.userNote}</p>
                          </div>
                        )}

                        {/* Admin decision (resolved) */}
                        {!isPending && req.adminDecisionReason && (
                          <div className={`rounded-xl p-3 border text-xs ${isApproved ? 'bg-emerald-950/30 border-emerald-800/40' : 'bg-rose-950/30 border-rose-800/40'}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isApproved ? 'text-emerald-300' : 'text-rose-300'}`}>
                              Admin Decision
                            </p>
                            <p className="text-slate-300">{req.adminDecisionReason}</p>
                            {req.decidedAt && <p className="text-slate-500 text-[10px] mt-1">{new Date(req.decidedAt).toLocaleString()}</p>}
                          </div>
                        )}

                        {/* Action buttons — pending only */}
                        {isPending && (
                          <div className="flex items-center space-x-3 pt-1">
                            <button
                              onClick={() => { setResolveModal({ request: req, action: 'approve' }); setResolveReason(''); setResolveMsg({ text: '', type: '' }); }}
                              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-md"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isMigration ? 'Approve Migration' : 'Approve & Restore'}</span>
                            </button>
                            <button
                              onClick={() => { setResolveModal({ request: req, action: 'reject' }); setResolveReason(''); setResolveMsg({ text: '', type: '' }); }}
                              className="flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition shadow-md"
                            >
                              <XCircle className="w-3.5 h-3.5" /><span>Reject</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="max-w-6xl">
              <GridListView
                title="Audit Trail"
                subtitle="Administrative action history, moderation telemetry, and security events"
                items={auditLogs}
                loading={loading}
                storageKey="admin_audit"
                searchKeys={['action', 'details', 'admin.username', 'actor.username']}
                searchPlaceholder="Search audit events..."
                dateKey="createdAt"
                headerActions={
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllAuditLogs}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer"
                      title="Select or deselect all audit log entries"
                    >
                      {selectedAuditLogs.size > 0 && selectedAuditLogs.size === auditLogs.length ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span>
                        {selectedAuditLogs.size === auditLogs.length && auditLogs.length > 0
                          ? 'Deselect All'
                          : `Select All (${selectedAuditLogs.size}/${auditLogs.length})`}
                      </span>
                    </button>

                    {selectedAuditLogs.size > 0 && (
                      <button
                        type="button"
                        onClick={handleDeleteSelectedAuditLogs}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-sm animate-in fade-in"
                        title="Delete selected audit log records"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Selected ({selectedAuditLogs.size})</span>
                      </button>
                    )}

                    {auditLogs.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllAuditLogs}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer"
                        title="Permanently clear entire audit trail"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Clear All</span>
                      </button>
                    )}
                  </div>
                }
                renderItem={(log, mode) => {
                  const isSelected = selectedAuditLogs.has(log._id);
                  const actorName = log.admin?.username || log.actor?.username || 'Admin';

                  return (
                    <div
                      className={`p-3.5 bg-white dark:bg-slate-900 border rounded-2xl shadow-xs transition ${
                        isSelected
                          ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20'
                          : 'border-slate-200 dark:border-slate-800'
                      } ${
                        mode === 'grid' ? 'flex flex-col gap-3' : 'flex items-center justify-between'
                      }`}
                    >
                      <div className="flex items-start space-x-3 flex-1 min-w-0 pr-3">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectAuditLog(log._id)}
                          className="mt-0.5 text-slate-400 hover:text-indigo-600 transition cursor-pointer shrink-0"
                          title={isSelected ? 'Deselect log' : 'Select log'}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 truncate">
                              {log.action}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono shrink-0 truncate">
                              by @{actorName}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                            {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 mt-2 sm:mt-0">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSingleAuditLog(log._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Delete this audit log record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }}
              />
            </div>
          )}

          {/* TAB 7: SETTINGS & FEATURE FLAGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">System Feature Flags</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Toggle application features without triggering cold redeployments
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {[
                  { key: 'callsEnabled', label: 'Voice & Video Calling', desc: 'Real-time WebRTC audio & video peer connections' },
                  { key: 'pollsEnabled', label: 'In-Chat Interactive Polls', desc: 'Direct-message and group polling system' },
                  { key: 'statusesEnabled', label: 'Text Statuses', desc: 'WhatsApp-style 24h expiring status updates' },
                  { key: 'voiceMessagesEnabled', label: 'Voice Audio Messages', desc: 'Audio recording and streaming in conversations' },
                  { key: 'fileSharingEnabled', label: 'Media & File Uploads', desc: 'Uploading documents, videos, and image attachments' },
                  { key: 'announcementsEnabled', label: 'Admin News & Announcements', desc: 'Display global broadcast banner in user view' }
                ].map((feat) => {
                  const isEnabled = systemSettings?.featureFlags
                    ? systemSettings.featureFlags[feat.key] !== false
                    : true;

                  return (
                    <div key={feat.key} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{feat.label}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{feat.desc}</div>
                      </div>

                      <button
                        onClick={() => handleToggleFeature(feat.key, isEnabled)}
                        className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                          isEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                            isEnabled ? 'right-1' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* CREATE ANNOUNCEMENT MODAL WITH DESIGN & POLL SUITE */}
      {announcementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>{editingAnnouncement ? 'Edit Announcement & Theme' : 'Create Rich Announcement'}</span>
                  {hasPoll && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      With Poll
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingAnnouncement
                    ? 'Update announcement content, color gradient theme, and poll options'
                    : 'Design broadcast announcements and launch community polls'}
                </p>
              </div>
              <button
                onClick={() => {
                  setAnnouncementModalOpen(false);
                  setEditingAnnouncement(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setModalTab('content')}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                  modalTab === 'content'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>1. Content</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('design')}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                  modalTab === 'design'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>2. Design & Styling</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('poll')}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                  modalTab === 'poll'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Vote className="w-3.5 h-3.5" />
                <span>3. Community Poll {hasPoll && '✓'}</span>
              </button>
            </div>

            <form
              onSubmit={handleSaveAnnouncement}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                  e.preventDefault();
                }
              }}
              className="flex-1 overflow-y-auto space-y-4 text-xs pr-1"
            >
              {/* TAB 1: CONTENT */}
              {modalTab === 'content' && (
                <div className="space-y-3.5 animate-in fade-in duration-150">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Announcement Title
                    </label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. PulseChat 2.0 Feature Release & Poll"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Message Content
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Detailed announcement description broadcasted to users..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Category Type
                      </label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer"
                      >
                        <option value="info">Info (Standard)</option>
                        <option value="feature">New Feature (Highlight)</option>
                        <option value="warning">Warning (Caution)</option>
                        <option value="critical">Critical (Urgent)</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Audience Target
                      </label>
                      <select
                        value={newAudience}
                        onChange={(e) => setNewAudience(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer"
                      >
                        <option value="all">All Users (Public)</option>
                        <option value="users">Standard Members Only</option>
                        <option value="admins">Administrators Only</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DESIGN & STYLING ("with dezine option") */}
              {modalTab === 'design' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Theme Presets */}
                  <div>
                    <label className="block font-semibold mb-2 text-slate-700 dark:text-slate-300">
                      Visual Gradient Theme
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'default', label: 'Indigo Night', class: 'bg-slate-900 border-slate-600 text-slate-200' },
                        { id: 'cyber-glow', label: 'Cyberpunk Neon', class: 'bg-gradient-to-r from-purple-900 to-cyan-900 border-cyan-400 text-cyan-200' },
                        { id: 'sunset-fire', label: 'Sunset Fire', class: 'bg-gradient-to-r from-rose-900 to-amber-900 border-amber-400 text-amber-200' },
                        { id: 'emerald-matrix', label: 'Emerald Matrix', class: 'bg-gradient-to-r from-emerald-900 to-teal-900 border-emerald-400 text-emerald-200' },
                        { id: 'royal-amethyst', label: 'Royal Amethyst', class: 'bg-gradient-to-r from-indigo-900 to-violet-900 border-violet-400 text-violet-200' },
                        { id: 'ocean-wave', label: 'Ocean Wave', class: 'bg-gradient-to-r from-blue-900 to-sky-900 border-sky-400 text-sky-200' },
                        { id: 'crimson-ruby', label: 'Crimson Ruby', class: 'bg-gradient-to-r from-red-900 to-rose-900 border-rose-400 text-rose-200' },
                        { id: 'minimal-glass', label: 'Minimal Glass', class: 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200' }
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setDesignTheme(t.id)}
                          className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition cursor-pointer relative ${
                            t.class
                          } ${designTheme === t.id ? 'ring-2 ring-indigo-500 scale-102' : 'opacity-70 hover:opacity-100'}`}
                        >
                          <div className="truncate">{t.label}</div>
                          {designTheme === t.id && (
                            <Check className="w-3.5 h-3.5 absolute top-1.5 right-1.5 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font and Badge */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Typography Font
                      </label>
                      <select
                        value={designFont}
                        onChange={(e) => setDesignFont(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer"
                      >
                        <option value="sans">Modern Sans (Clean)</option>
                        <option value="serif">Editorial Serif (Prestigious)</option>
                        <option value="mono">Tech Mono (Code / Developer)</option>
                        <option value="display">Bold Display (Headline)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Badge Icon / Emoji
                      </label>
                      <div className="flex items-center space-x-1.5">
                        {['📢', '🗳️', '🚀', '🔥', '⚠️', '💡', '🛠️', '💎'].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setDesignBadge(emoji)}
                            className={`p-1.5 text-base rounded-xl transition cursor-pointer ${
                              designBadge === emoji
                                ? 'bg-indigo-600 text-white shadow-xs scale-110'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Animation Effect */}
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Attention Animation
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'none', label: 'None' },
                        { id: 'shimmer', label: 'Shimmer Wave' },
                        { id: 'pulse', label: 'Subtle Pulse' },
                        { id: 'glow', label: 'Neon Glow' }
                      ].map((anim) => (
                        <button
                          key={anim.id}
                          type="button"
                          onClick={() => setDesignAnimation(anim.id)}
                          className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            designAnimation === anim.id
                              ? 'bg-indigo-600 text-white border-indigo-500'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {anim.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: COMMUNITY POLL */}
              {modalTab === 'poll' && (
                <div className="space-y-3.5 animate-in fade-in duration-150">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <Vote className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Embed Interactive Poll</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Collect instant user votes with live percentage visualizers
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasPoll}
                        onChange={(e) => {
                          setHasPoll(e.target.checked);
                          if (e.target.checked && designBadge === '📢') setDesignBadge('🗳️');
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {hasPoll ? (
                    <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                      <div>
                        <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          Poll Question
                        </label>
                        <input
                          type="text"
                          value={pollQuestion}
                          onChange={(e) => setPollQuestion(e.target.value)}
                          placeholder={newTitle || 'e.g. Which feature should we build next?'}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block font-semibold text-slate-700 dark:text-slate-300">
                          Poll Options (min 2, max 6)
                        </label>
                        {pollOptions.map((opt, idx) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const next = [...pollOptions];
                                next[idx] = e.target.value;
                                setPollOptions(next);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (pollOptions.length < 6) {
                                    setPollOptions([...pollOptions, '']);
                                  }
                                }
                              }}
                              placeholder={`Option ${idx + 1}`}
                              className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                            />
                            {pollOptions.length > 2 && (
                              <button
                                type="button"
                                onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                                className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}

                        {pollOptions.length < 6 && (
                          <button
                            type="button"
                            onClick={() => setPollOptions([...pollOptions, ''])}
                            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer pt-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Another Option</span>
                          </button>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="allowMultiple"
                          checked={allowMultiple}
                          onChange={(e) => setAllowMultiple(e.target.checked)}
                          className="rounded text-indigo-600 cursor-pointer"
                        />
                        <label htmlFor="allowMultiple" className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                          Allow users to select multiple options
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400">
                      Toggle the switch above to attach a community poll to this announcement.
                    </div>
                  )}
                </div>
              )}

              {/* LIVE PREVIEW BOX */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Live Audience Preview</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs space-y-2">
                  <div className="flex items-center space-x-2">
                    <span>{designBadge}</span>
                    <span className="font-bold">{newTitle || 'Announcement Title Preview'}</span>
                    {hasPoll && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/20 text-indigo-300 uppercase">
                        Poll
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 opacity-80 text-[11px]">
                    {newContent || 'Announcement content will be rendered here with your selected theme and typography.'}
                  </p>
                  {hasPoll && (
                    <div className="pt-2 space-y-1.5">
                      <div className="text-[11px] font-semibold text-indigo-300">
                        {pollQuestion || newTitle || 'Poll Question Preview'}
                      </div>
                      {pollOptions.map((opt, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-lg bg-white/5 border border-white/10 text-[11px] flex items-center justify-between"
                        >
                          <span>{opt || `Option ${i + 1}`}</span>
                          <span className="font-mono text-slate-400">0%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Form Controls */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-500">
                  Target: <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase">{newAudience}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAnnouncementModalOpen(false);
                      setEditingAnnouncement(null);
                    }}
                    className="px-3 py-2 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition cursor-pointer shadow-sm flex items-center space-x-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{editingAnnouncement ? 'Save Changes' : 'Publish Announcement'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER PROFILE MODAL */}
      {userModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <Avatar src={editingUser.avatar} name={editingUser.username} size="md" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Edit User @{editingUser.username}
                  </h3>
                  <p className="text-xs text-slate-500">Update account role, profile details, and access state</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setUserModalOpen(false);
                  setEditingUser(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Nickname / Display Name</label>
                <input
                  type="text"
                  value={userForm.nickname}
                  onChange={(e) => setUserForm({ ...userForm, nickname: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Email Address</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Bio</label>
                <textarea
                  rows={2}
                  value={userForm.bio}
                  onChange={(e) => setUserForm({ ...userForm, bio: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Account Role</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer"
                  >
                    <option value="user">Standard User</option>
                    <option value="admin">Platform Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Account Status</label>
                  <select
                    value={userForm.isBanned ? 'banned' : 'active'}
                    onChange={(e) => setUserForm({ ...userForm, isBanned: e.target.value === 'banned' })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer"
                  >
                    <option value="active">Active & Allowed</option>
                    <option value="banned">Suspended / Banned</option>
                  </select>
                </div>
              </div>

              {userForm.isBanned && (
                <div>
                  <label className="block font-semibold mb-1 text-rose-500">Ban Reason</label>
                  <input
                    type="text"
                    value={userForm.banReason}
                    onChange={(e) => setUserForm({ ...userForm, banReason: e.target.value })}
                    placeholder="Violation of terms or harassment..."
                    className="w-full px-3 py-2 bg-rose-50/50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl"
                  />
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setUserModalOpen(false);
                    setEditingUser(null);
                  }}
                  className="px-3 py-2 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition cursor-pointer shadow-sm flex items-center space-x-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save User Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHAT MONITORING & MESSAGE INSPECTOR MODAL */}
      {inspectingChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl h-[88vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-900/80">
              <div className="flex items-center space-x-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                    inspectingChat.type === 'group'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                      : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300'
                  }`}
                >
                  {inspectingChat.type === 'group' ? <Layers className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                      {inspectingChat.type === 'group'
                        ? inspectingChat.groupDetails?.name || 'Group Channel'
                        : inspectingChat.participants?.map((p) => `@${p.username}`).join(' ↔ ') || 'Direct Chat'}
                    </h3>
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {inspectingChat.type}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                    <span>{inspectingChat.participants?.length || 0} participants</span>
                    <span>•</span>
                    <span>{chatMessages.length} messages loaded</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => {
                    handleOpenInChat(inspectingChat);
                    setInspectingChat(null);
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                  title="Open this conversation directly in Chat"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden sm:inline">Open in Chat</span>
                </button>

                <button
                  onClick={() => handleInspectChat(inspectingChat)}
                  disabled={loadingMessages}
                  className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  title="Refresh chat messages"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingMessages ? 'animate-spin text-indigo-500' : ''}`} />
                </button>
                <button
                  onClick={() => handleDeleteEntireChat(inspectingChat._id)}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 dark:hover:bg-rose-900/60 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                  title="Delete entire chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete Chat</span>
                </button>
                <button
                  onClick={() => {
                    setInspectingChat(null);
                    setChatMessages([]);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Participants Bar */}
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex items-center space-x-2 overflow-x-auto text-xs shrink-0">
              <span className="text-slate-400 font-mono text-[11px] uppercase font-semibold shrink-0">Members:</span>
              {inspectingChat.participants?.map((p) => (
                <div
                  key={p._id}
                  className="inline-flex items-center space-x-1.5 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] shrink-0"
                >
                  <Avatar src={p.avatar} name={p.username} size="xs" />
                  <span className="font-semibold">@{p.username}</span>
                  {p.role === 'admin' && (
                    <span className="text-[9px] px-1 rounded bg-purple-200 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                      ADMIN
                    </span>
                  )}
                  {p.isBanned && (
                    <span className="text-[9px] px-1 rounded bg-rose-200 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold">
                      BANNED
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Messages Stream */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/50">
              {loadingMessages ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                  <p className="text-xs">Loading message stream...</p>
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-16">
                  <MessageSquare className="w-10 h-10 stroke-1" />
                  <p className="text-xs font-semibold">No messages recorded in this conversation.</p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg._id}
                    className="p-3 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-2xs flex items-start justify-between gap-3 group hover:border-slate-300 dark:hover:border-slate-700 transition"
                  >
                    <div className="flex items-start space-x-3 min-w-0 flex-1">
                      <Avatar src={msg.sender?.avatar} name={msg.sender?.username} size="sm" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            @{msg.sender?.username || 'Unknown'}
                          </span>
                          {msg.sender?.nickname && (
                            <span className="text-[11px] text-slate-400">({msg.sender.nickname})</span>
                          )}
                          {msg.sender?.role === 'admin' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 uppercase">
                              Admin
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                            {new Date(msg.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Content */}
                        {msg.isDeletedForEveryone ? (
                          <p className="text-xs italic text-slate-400">This message was deleted by user.</p>
                        ) : (
                          <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                            {msg.content || ''}
                          </p>
                        )}

                        {/* Interactive Poll Visualization for Admin Inspector */}
                        {(msg.messageType === 'poll' || msg.poll) && (
                          <div className="mt-2.5 p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                              <div className="flex items-center space-x-1.5 text-indigo-600 dark:text-indigo-400">
                                <BarChart3 className="w-4 h-4 shrink-0" />
                                <span className="font-semibold">{msg.poll?.question || msg.content || 'Poll'}</span>
                              </div>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                                {msg.poll?.isClosed ? 'Closed' : 'Active'} • {msg.poll?.allowsMultiple ? 'Multi' : 'Single'}
                              </span>
                            </div>

                            {/* Options list */}
                            <div className="space-y-1.5 pt-1">
                              {(() => {
                                const options = msg.poll?.options || [];
                                const totalVotes = options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);

                                if (options.length === 0) {
                                  return (
                                    <div className="text-[11px] text-slate-400 italic">No poll options recorded.</div>
                                  );
                                }

                                return options.map((opt, optIdx) => {
                                  const voteCount = opt.votes?.length || 0;
                                  const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

                                  return (
                                    <div key={optIdx} className="space-y-1">
                                      <div className="flex justify-between items-center text-[11px] text-slate-700 dark:text-slate-200">
                                        <span className="font-medium">{opt.text}</span>
                                        <span className="font-mono text-slate-500 dark:text-slate-400">
                                          {voteCount} votes ({percentage}%)
                                        </span>
                                      </div>
                                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Attachment Preview if any */}
                        {msg.fileUrl && (
                          <div className="pt-1.5">
                            {msg.messageType === 'image' ? (
                              <img
                                src={msg.fileUrl}
                                alt="Attachment"
                                className="max-h-48 rounded-xl border border-slate-200 dark:border-slate-700 object-cover"
                              />
                            ) : (
                              <a
                                href={msg.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center space-x-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>{msg.fileName || 'View Attachment'}</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteChatMessage(msg._id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition opacity-60 group-hover:opacity-100 cursor-pointer shrink-0"
                      title="Delete this message"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>

      {/* ── Resolve Recovery Modal ─────────────────────────────────────────── */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {resolveModal.action === 'approve'
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  : <XCircle className="w-5 h-5 text-rose-400" />}
                <h3 className={`text-base font-bold ${resolveModal.action === 'approve' ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {resolveModal.action === 'approve' ? 'Approve & Restore Account' : 'Reject Recovery Request'}
                </h3>
              </div>
              <button onClick={() => setResolveModal(null)} className="text-slate-500 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-xs space-y-1">
              <p className="text-slate-400">Account: <span className="text-white font-semibold">{resolveModal.request.user?.username || resolveModal.request.originalUsername}</span></p>
              <p className="text-slate-400">Email: <span className="text-indigo-300">{resolveModal.request.user?.email || resolveModal.request.email}</span></p>
            </div>

            {resolveModal.action === 'approve' ? (
              <p className="text-xs text-slate-300 leading-relaxed">
                This will <span className="text-emerald-300 font-semibold">restore the account to active status</span>, reconnect all old messages, groups, and profile data, and send the user an approval email.
              </p>
            ) : (
              <p className="text-xs text-slate-300 leading-relaxed">
                This will <span className="text-rose-300 font-semibold">reject the recovery request</span> and notify the user via email. The account remains in retention until the deadline.
              </p>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                {resolveModal.action === 'approve' ? 'Approval Note (optional)' : 'Rejection Reason (recommended)'}
              </label>
              <textarea
                rows={2}
                value={resolveReason}
                onChange={e => setResolveReason(e.target.value)}
                placeholder={resolveModal.action === 'approve'
                  ? 'e.g. Identity verified via email...'
                  : 'e.g. Could not verify account ownership...'}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {resolveMsg.text && (
              <div className={`p-2.5 rounded-xl text-xs font-medium flex items-center space-x-2 border ${
                resolveMsg.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-800 text-rose-300'
              }`}>
                {resolveMsg.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                <span>{resolveMsg.text}</span>
              </div>
            )}

            <div className="flex items-center space-x-3 pt-1">
              <button
                onClick={handleResolveRecovery}
                disabled={resolveLoading}
                className={`flex-1 py-2.5 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-2 disabled:opacity-50 ${
                  resolveModal.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {resolveLoading
                  ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  : resolveModal.action === 'approve'
                  ? <CheckCircle2 className="w-3.5 h-3.5" />
                  : <XCircle className="w-3.5 h-3.5" />}
                <span>{resolveLoading ? 'Processing...' : resolveModal.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}</span>
              </button>
              <button
                onClick={() => setResolveModal(null)}
                disabled={resolveLoading}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete User Modal ────────────────────────────────────────────────── */}
      {deleteUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-slate-900 border border-red-800/50 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-5 h-5 text-red-400" />
                <h3 className="text-base font-bold text-red-300">Permanently Delete User</h3>
              </div>
              <button onClick={() => setDeleteUserModal(null)} className="text-slate-500 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-xs space-y-1">
              <p className="text-slate-400">Username: <span className="text-white font-semibold">@{deleteUserModal.user.username}</span></p>
              <p className="text-slate-400">Email: <span className="text-indigo-300">{deleteUserModal.user.email}</span></p>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will <span className="text-red-300 font-semibold">permanently remove</span> the account, revoke all sessions, and send the user a deletion email with an appeal link. This action cannot be undone.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Reason for Deletion <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={3}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Repeated violation of community guidelines, spam, harassment..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center space-x-3 pt-1">
              <button
                onClick={handleDeleteUser}
                disabled={deleteLoading || !deleteReason.trim()}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-2"
              >
                {deleteLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{deleteLoading ? 'Deleting...' : 'Permanently Delete'}</span>
              </button>
              <button
                onClick={() => setDeleteUserModal(null)}
                disabled={deleteLoading}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

