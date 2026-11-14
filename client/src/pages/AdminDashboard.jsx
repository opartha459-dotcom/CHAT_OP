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
  Wrench,
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
  Mail,
  KeyRound,
  Send,
  Copy,
  Calendar,
  Type,
  Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useSocket } from '../context/SocketContext';
import {
  useTheme,
  THEME_PALETTES,
  TYPOGRAPHY_FONTS,
  FONT_SIZES,
  HEADING_WEIGHTS,
  HEADING_TRANSFORMS,
  adjustBrightness,
  hexToRgba
} from '../context/ThemeContext';
import { GridListView } from '../components/common/GridListView';
import { Avatar } from '../components/common/Avatar';
import { PulseLogo } from '../components/common/PulseLogo';
import { AdminDashboardSkeleton } from '../components/common/Skeleton';
import { LandingCmsTab } from '../components/admin/LandingCmsTab';
import { GenerateCodeModal } from '../components/admin/GenerateCodeModal';
import { OfficialContactSettingsCard } from '../components/admin/OfficialContactSettingsCard';
import { StorageManagementTab } from '../components/admin/StorageManagementTab';

export const AdminDashboard = () => {
  const auth = useAuth();
  const user = auth.user;
  const token = auth.token;
  const navigate = useNavigate();
  const { socket } = useSocket();

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

  // Dynamic Theme & Typography State
  const { adminTheme, updateAdminDefaultTheme } = useTheme();
  const [themeForm, setThemeForm] = useState(() => ({
    accentColor: adminTheme?.accentColor || 'indigo',
    primaryColor: adminTheme?.primaryColor || '#6366f1',
    primaryHover: adminTheme?.primaryHover || '#4f46e5',
    primaryLight: adminTheme?.primaryLight || 'rgba(99, 102, 241, 0.15)',
    primaryBorder: adminTheme?.primaryBorder || 'rgba(99, 102, 241, 0.35)',
    secondaryColor: adminTheme?.secondaryColor || '#10b981',
    mode: adminTheme?.mode || 'dark',
    fontFamily: adminTheme?.fontFamily || 'Inter',
    fontSize: adminTheme?.fontSize || 'medium',
    fontWeightNormal: adminTheme?.fontWeightNormal || '400',
    fontWeightHeading: adminTheme?.fontWeightHeading || '700',
    headingLetterSpacing: adminTheme?.headingLetterSpacing || '-0.02em',
    headingTransform: adminTheme?.headingTransform || 'none'
  }));
  const [savingTheme, setSavingTheme] = useState(false);
  const [themeSuccessMsg, setThemeSuccessMsg] = useState('');

  useEffect(() => {
    if (adminTheme) {
      setThemeForm((prev) => ({
        ...prev,
        ...adminTheme
      }));
    }
  }, [adminTheme]);

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

  // Scheduled Maintenance State
  const [schedules, setSchedules] = useState([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [activeMaintRecord, setActiveMaintRecord] = useState(null);
  const [upcomingMaintRecord, setUpcomingMaintRecord] = useState(null);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [maintTitle, setMaintTitle] = useState('');
  const [maintDesc, setMaintDesc] = useState('');
  const [maintScope, setMaintScope] = useState('full_system');
  const [maintFeatures, setMaintFeatures] = useState(['chat', 'calls', 'status']);
  const [maintStart, setMaintStart] = useState('');
  const [maintEnd, setMaintEnd] = useState('');
  const [maintIsImmediate, setMaintIsImmediate] = useState(false);
  const [maintSubmitting, setMaintSubmitting] = useState(false);
  const [recoverySearch, setRecoverySearch] = useState('');
  const [recoveryStatusFilter, setRecoveryStatusFilter] = useState('all');
  const [recoveryDateFrom, setRecoveryDateFrom] = useState('');
  const [recoveryDateTo, setRecoveryDateTo] = useState('');

  // Verification codes state (manual code dispatch)
  const [verificationCodes, setVerificationCodes] = useState([]);
  const [verificationCodesLoading, setVerificationCodesLoading] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState(new Set());
  const [sendingCodeId, setSendingCodeId] = useState(null);
  const [codeSearch, setCodeSearch] = useState('');
  const [codeFilterStatus, setCodeFilterStatus] = useState('all');
  const [codeFilterAction, setCodeFilterAction] = useState('all');
  const [codeDateFrom, setCodeDateFrom] = useState('');
  const [codeDateTo, setCodeDateTo] = useState('');
  const [isGenerateCodeModalOpen, setIsGenerateCodeModalOpen] = useState(false);

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
      loadAuditLogs(),
      loadRecoveries(),
      loadVerificationCodes()
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadDashboard();
    }
  }, [token, user]);

  // Real-time listeners for admin events (verification codes, maintenance, feature flags, stats, announcements)
  useEffect(() => {
    if (!socket) return;
    try {
      socket.emit('admin:join', { token });
    } catch {}

    const handleNewCodeReq = (newCode) => {
      if (!newCode) return;
      setVerificationCodes((prev) => [newCode, ...prev.filter((c) => c._id !== newCode._id)]);
      showMsg(`New verification request from @${newCode.username || newCode.email}`);
      loadStats();
    };

    const handleMaintenanceState = (state) => {
      if (state) {
        setActiveMaintRecord(state.active || null);
        setUpcomingMaintRecord(state.upcoming || null);
      }
      loadMaintenance();
      loadStats();
    };

    const handleFeaturesState = (flags) => {
      if (flags) {
        setSystemSettings((prev) => ({
          ...(prev || {}),
          featureFlags: { ...(prev?.featureFlags || {}), ...flags }
        }));
      }
    };

    const handleSettingsState = (settings) => {
      if (settings) {
        setSystemSettings(settings);
      }
    };

    const handleStatsState = () => {
      loadStats();
    };

    const handleRecoveriesUpdate = () => {
      loadRecoveries();
      loadStats();
    };

    const handleAnnouncementsUpdate = () => {
      loadAnnouncements();
    };

    const handleVerificationCodesUpdate = () => {
      loadVerificationCodes(true);
    };

    socket.on('admin:new_verification_request', handleNewCodeReq);
    socket.on('maintenance:updated', handleMaintenanceState);
    socket.on('system:features_updated', handleFeaturesState);
    socket.on('admin:settings_updated', handleSettingsState);
    socket.on('admin:stats_updated', handleStatsState);
    socket.on('admin:recoveries_updated', handleRecoveriesUpdate);
    socket.on('admin:announcements_updated', handleAnnouncementsUpdate);
    socket.on('admin:codes_updated', handleVerificationCodesUpdate);

    return () => {
      socket.off('admin:new_verification_request', handleNewCodeReq);
      socket.off('maintenance:updated', handleMaintenanceState);
      socket.off('system:features_updated', handleFeaturesState);
      socket.off('admin:settings_updated', handleSettingsState);
      socket.off('admin:stats_updated', handleStatsState);
      socket.off('admin:recoveries_updated', handleRecoveriesUpdate);
      socket.off('admin:announcements_updated', handleAnnouncementsUpdate);
      socket.off('admin:codes_updated', handleVerificationCodesUpdate);
    };
  }, [socket, token]);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    else if (activeTab === 'codes') {
      loadVerificationCodes();
      const interval = setInterval(() => {
        loadVerificationCodes(true);
      }, 4000);
      return () => clearInterval(interval);
    }
    else if (activeTab === 'groups') loadGroups();
    else if (activeTab === 'announcements') loadAnnouncements();
    else if (activeTab === 'databases') loadDbStatus();
    else if (activeTab === 'audit') loadAuditLogs();
    else if (activeTab === 'settings') loadSystemSettings();
    else if (activeTab === 'recoveries') loadRecoveries();
    else if (activeTab === 'maintenance') loadMaintenance();
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

  // Actions: Dynamic Theme & Typography
  const handleSaveTheme = async (e) => {
    if (e) e.preventDefault();
    setSavingTheme(true);
    setThemeSuccessMsg('');
    try {
      const data = await updateAdminDefaultTheme(themeForm);
      if (data?.success) {
        setThemeSuccessMsg('Theme and typography updated and broadcast live to all users!');
        showMsg('Theme updated across the entire application!');
        setTimeout(() => setThemeSuccessMsg(''), 5000);
      } else {
        showMsg(data?.message || 'Failed to update theme.');
      }
    } catch (err) {
      showMsg('Network error updating theme.');
    } finally {
      setSavingTheme(false);
    }
  };

  const handleResetThemeDefaults = async () => {
    if (!window.confirm('Reset application theme to factory defaults (Indigo & Inter)?')) return;
    const factory = {
      accentColor: 'indigo',
      primaryColor: '#6366f1',
      primaryHover: '#4f46e5',
      primaryLight: 'rgba(99, 102, 241, 0.15)',
      primaryBorder: 'rgba(99, 102, 241, 0.35)',
      secondaryColor: '#10b981',
      mode: 'dark',
      fontFamily: 'Inter',
      fontSize: 'medium',
      fontWeightNormal: '400',
      fontWeightHeading: '700',
      headingLetterSpacing: '-0.02em',
      headingTransform: 'none'
    };
    setThemeForm(factory);
    try {
      await updateAdminDefaultTheme(factory);
      showMsg('Reset to factory theme defaults.');
    } catch {
      showMsg('Failed to reset theme.');
    }
  };

  // ── Scheduled Maintenance Handlers ─────────────────────────────────────────
  const loadMaintenance = async () => {
    setSchedulesLoading(true);
    try {
      const res = await fetch('/api/admin/maintenance', {
        headers: authHeaders(),
        credentials: 'include'
      });
      const d = await res.json();
      if (d.success) {
        setSchedules(d.schedules || []);
        setActiveMaintRecord(d.active || null);
        setUpcomingMaintRecord(d.upcoming || null);
      }
    } catch (e) {
      showMsg('Failed to load maintenance schedules.');
    } finally {
      setSchedulesLoading(false);
    }
  };

  const toLocalDatetimeInput = (dateInput) => {
    if (!dateInput) return '';
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const YYYY = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const DD = pad(d.getDate());
    const HH = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${YYYY}-${MM}-${DD}T${HH}:${mm}`;
  };

  const fromLocalDatetimeInput = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  const openScheduleModal = (existing = null) => {
    if (existing) {
      setEditingSchedule(existing);
      setMaintTitle(existing.title || '');
      setMaintDesc(existing.description || '');
      setMaintScope(existing.scope || 'full_system');
      setMaintFeatures(existing.affectedFeatures || ['chat', 'calls', 'status']);
      setMaintStart(toLocalDatetimeInput(existing.startTime));
      setMaintEnd(toLocalDatetimeInput(existing.endTime));
      setMaintIsImmediate(existing.isImmediate || false);
    } else {
      setEditingSchedule(null);
      setMaintTitle('');
      setMaintDesc('');
      setMaintScope('full_system');
      setMaintFeatures(['chat', 'calls', 'status']);
      const inTenMins = new Date(Date.now() + 10 * 60 * 1000);
      const inOneHour = new Date(Date.now() + 70 * 60 * 1000);
      setMaintStart(toLocalDatetimeInput(inTenMins));
      setMaintEnd(toLocalDatetimeInput(inOneHour));
      setMaintIsImmediate(false);
    }
    setMaintenanceModalOpen(true);
  };

  const handleSaveMaintenance = async (e) => {
    e.preventDefault();
    if (!maintTitle.trim()) {
      showMsg('Maintenance title is required.');
      return;
    }

    const startIso = maintIsImmediate ? new Date().toISOString() : fromLocalDatetimeInput(maintStart);
    const endIso = maintEnd ? fromLocalDatetimeInput(maintEnd) : null;

    if (!maintIsImmediate && !startIso) {
      showMsg('Please provide a valid start date and time.');
      return;
    }

    if (endIso && startIso && new Date(endIso) <= new Date(startIso)) {
      showMsg('End time must be after start time.');
      return;
    }

    setMaintSubmitting(true);
    try {
      const payload = {
        title: maintTitle.trim(),
        description: maintDesc.trim(),
        scope: maintScope,
        affectedFeatures: maintScope === 'partial' ? maintFeatures : [],
        startTime: startIso,
        endTime: endIso,
        isImmediate: maintIsImmediate
      };

      const endpoint = editingSchedule
        ? `/api/admin/maintenance/${editingSchedule._id}`
        : '/api/admin/maintenance';
      const method = editingSchedule ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const d = await res.json();
      if (d.success) {
        showMsg(d.message || 'Maintenance saved successfully.');
        setMaintenanceModalOpen(false);
        loadMaintenance();
      } else {
        showMsg(d.message || 'Error saving maintenance.');
      }
    } catch (err) {
      showMsg('Network error saving maintenance schedule.');
    } finally {
      setMaintSubmitting(false);
    }
  };

  const handleActivateSchedule = async (id) => {
    if (!window.confirm('Activate maintenance mode immediately? Affected features will be unavailable to normal users.')) return;
    try {
      const res = await fetch(`/api/admin/maintenance/${id}/activate`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include'
      });
      const d = await res.json();
      if (d.success) {
        showMsg(d.message || 'Maintenance activated.');
        loadMaintenance();
      }
    } catch {
      showMsg('Failed to activate maintenance.');
    }
  };

  const handleEndSchedule = async (id) => {
    if (!window.confirm('End this maintenance mode now? All services will be immediately restored.')) return;
    try {
      const res = await fetch(`/api/admin/maintenance/${id}/end`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include'
      });
      const d = await res.json();
      if (d.success) {
        showMsg(d.message || 'Maintenance completed.');
        loadMaintenance();
      }
    } catch {
      showMsg('Failed to end maintenance.');
    }
  };

  const handleCancelSchedule = async (id) => {
    if (!window.confirm('Cancel this maintenance schedule?')) return;
    try {
      const res = await fetch(`/api/admin/maintenance/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include'
      });
      const d = await res.json();
      if (d.success) {
        showMsg(d.message || 'Maintenance schedule cancelled.');
        loadMaintenance();
      }
    } catch {
      showMsg('Failed to cancel maintenance.');
    }
  };

  const handleDeleteMaintenanceRecord = async (id, title) => {
    if (!window.confirm(`Permanently delete maintenance record "${title || 'Untitled'}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/maintenance/${id}/permanent`, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include'
      });
      const d = await res.json();
      if (d.success) {
        showMsg(d.message || 'Maintenance record permanently deleted.');
        setSchedules((prev) => prev.filter((s) => s._id !== id));
      } else {
        showMsg(d.message || 'Failed to delete maintenance record.');
      }
    } catch {
      showMsg('Network error deleting maintenance record.');
    }
  };

  const handleClearMaintenanceHistory = async () => {
    const historyCount = schedules.filter((s) => s.status === 'completed' || s.status === 'cancelled').length;
    if (historyCount === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete all ${historyCount} past maintenance history records? This cannot be undone.`)) return;
    try {
      const res = await fetch('/api/admin/maintenance/history', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        credentials: 'include',
        body: JSON.stringify({ all: true })
      });
      const d = await res.json();
      if (d.success) {
        showMsg(d.message || 'All past maintenance history deleted.');
        setSchedules((prev) => prev.filter((s) => s.status !== 'completed' && s.status !== 'cancelled'));
      } else {
        showMsg(d.message || 'Failed to clear maintenance history.');
      }
    } catch {
      showMsg('Network error clearing maintenance history.');
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

  // ----------------------------------------------------
  // VERIFICATION CODE DISPATCH HANDLERS
  // ----------------------------------------------------
  const loadVerificationCodes = async (silent = false) => {
    if (!silent) setVerificationCodesLoading(true);
    try {
      const res = await fetch('/api/admin/verification-codes', { headers: authHeaders(), credentials: 'include' });
      const d = await res.json();
      if (d.success) setVerificationCodes(d.codes || []);
    } catch (e) {
      console.warn('Failed to load verification codes', e);
    } finally {
      if (!silent) setVerificationCodesLoading(false);
    }
  };

  const handleSendVerificationCode = async (codeItemOrId) => {
    const id =
      typeof codeItemOrId === 'object' && codeItemOrId !== null
        ? codeItemOrId._id || codeItemOrId.id
        : codeItemOrId;

    if (!id || id === 'undefined') {
      showMsg('Invalid verification code record.');
      return;
    }

    setSendingCodeId(id);
    try {
      const res = await fetch(`/api/admin/verification-codes/${id}/send`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include'
      });
      const d = await res.json();
      if (d.success) {
        setVerificationCodes((prev) =>
          prev.map((c) => (c._id === id ? { ...c, status: 'sent', sentAt: new Date() } : c))
        );
        showMsg(d.message || 'Verification code sent to user in real-time!');
      } else {
        showMsg(d.message || 'Failed to dispatch code.');
      }
    } catch (e) {
      showMsg('Network error sending verification code.');
    } finally {
      setSendingCodeId(null);
    }
  };

  const handleRevokeCode = async (c) => {
    if (!window.confirm(`Revoke verification code ${c.code} for ${c.email}? This will expire the code immediately.`)) return;
    try {
      const res = await fetch(`/api/admin/verification-codes/${c._id}/revoke`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include'
      });
      const d = await res.json();
      if (d.success) {
        setVerificationCodes((prev) =>
          prev.map((item) => (item._id === c._id ? { ...item, status: 'expired' } : item))
        );
        showMsg(d.message || 'Verification code revoked successfully.');
      } else {
        showMsg(d.message || 'Failed to revoke code.');
      }
    } catch {
      showMsg('Network error revoking code.');
    }
  };

  const handleRegenerateCode = async (c) => {
    try {
      const res = await fetch('/api/admin/verification-codes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        credentials: 'include',
        body: JSON.stringify({
          email: c.email,
          username: c.username,
          userId: c.user?._id || c.user,
          action: c.action || 'email_verification',
          expiryMinutes: 60,
          autoDispatch: true
        })
      });
      const d = await res.json();
      if (d.success) {
        showMsg(d.message || 'New verification code regenerated and dispatched!');
        loadVerificationCodes();
      } else {
        showMsg(d.message || 'Failed to regenerate code.');
      }
    } catch {
      showMsg('Network error regenerating code.');
    }
  };

  const handleDeleteSelectedCodes = async () => {
    const ids = Array.from(selectedCodes);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} selected verification code records?`)) return;
    try {
      const res = await fetch('/api/admin/verification-codes', {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ ids })
      });
      const d = await res.json();
      if (d.success) {
        setVerificationCodes((prev) => prev.filter((c) => !selectedCodes.has(c._id)));
        setSelectedCodes(new Set());
        showMsg(`Deleted ${d.deleted} verification code record(s).`);
      }
    } catch {
      showMsg('Failed to delete verification codes.');
    }
  };

  const handleClearAllCodes = async () => {
    if (!window.confirm('Delete ALL verification code history? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/admin/verification-codes', {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ all: true })
      });
      const d = await res.json();
      if (d.success) {
        setVerificationCodes([]);
        setSelectedCodes(new Set());
        showMsg('Cleared all verification codes.');
      }
    } catch {
      showMsg('Failed to clear verification codes.');
    }
  };

  // ----------------------------------------------------
  // ACCOUNT RECOVERY MULTI-DELETE HANDLERS
  // ----------------------------------------------------
  const handleDeleteSelectedRecoveries = async () => {
    const ids = Array.from(selectedRecoveries);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} selected recovery request(s)?`)) return;
    setDeletingRecoveries(true);
    try {
      const res = await fetch('/api/admin/recoveries', {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ ids })
      });
      const d = await res.json();
      if (d.success) {
        setRecoveries((prev) => prev.filter((r) => !selectedRecoveries.has(r._id)));
        setSelectedRecoveries(new Set());
        showMsg(`Deleted ${d.deleted} recovery request(s).`);
      }
    } catch {
      showMsg('Failed to delete recovery requests.');
    } finally {
      setDeletingRecoveries(false);
    }
  };

  const handleClearAllRecoveries = async () => {
    if (!window.confirm('Are you sure you want to delete ALL recovery request history?')) return;
    setDeletingRecoveries(true);
    try {
      const res = await fetch('/api/admin/recoveries', {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ all: true })
      });
      const d = await res.json();
      if (d.success) {
        setRecoveries([]);
        setSelectedRecoveries(new Set());
        showMsg('Cleared all recovery requests.');
      }
    } catch {
      showMsg('Failed to clear recovery requests.');
    } finally {
      setDeletingRecoveries(false);
    }
  };

  const navSections = [
    {
      label: 'Core Platform',
      items: [
        { id: 'overview', label: 'Overview', icon: TrendingUp },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'groups', label: 'Chats & Messaging', icon: MessageSquare },
        { id: 'announcements', label: 'Announcements', icon: Bell },
      ]
    },
    {
      label: 'Theme & Appearance',
      items: [
        { id: 'theme', label: 'Theme & Typography', icon: Palette },
        { id: 'landing', label: 'Landing Page CMS', icon: Globe },
      ]
    },
    {
      label: 'Features & Control',
      items: [
        { id: 'settings', label: 'Feature Flags', icon: Sliders },
        { id: 'maintenance', label: 'Maintenance', icon: Wrench },
      ]
    },
    {
      label: 'Security & Access',
      items: [
        { id: 'codes', label: 'Code Dispatch', icon: KeyRound },
        { id: 'recoveries', label: 'Account Recoveries', icon: RotateCcw },
        { id: 'audit', label: 'Audit Logs', icon: FileText },
      ]
    },
    {
      label: 'Infrastructure',
      items: [
        { id: 'databases', label: 'Databases & Health', icon: HardDrive },
        { id: 'storage', label: 'Storage & DB Optimization', icon: Database },
      ]
    }
  ];
  const navItems = navSections.flatMap(s => s.items);

  if (auth.loading) {
    return <AdminDashboardSkeleton />;
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
          <nav className="space-y-4">
            {navSections.map((section) => (
              <div key={section.label}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-3 mb-1">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const pendingBadge =
                      item.id === 'codes'
                        ? verificationCodes.filter((c) => c.status === 'pending').length
                        : item.id === 'recoveries'
                        ? recoveries.filter((r) => r.status === 'pending' || r.status === 'partial').length
                        : 0;

                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {pendingBadge > 0 && (
                          <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 font-mono shrink-0">
                            {pendingBadge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
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
              const pendingBadge =
                item.id === 'codes'
                  ? verificationCodes.filter((c) => c.status === 'pending').length
                  : item.id === 'recoveries'
                  ? recoveries.filter((r) => r.status === 'pending' || r.status === 'partial').length
                  : 0;

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
                  {pendingBadge > 0 && (
                    <span className="ml-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-mono">
                      {pendingBadge}
                    </span>
                  )}
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

          {/* TAB: CODE DISPATCH (MANUAL VERIFICATION) */}
          {activeTab === 'codes' && (
            <div className="max-w-6xl space-y-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <KeyRound className="w-5 h-5 text-indigo-500" />
                    <span>Manual Code Dispatch</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Live verification codes for registration and password resets. Review and dispatch directly to users in real-time.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setIsGenerateCodeModalOpen(true)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition cursor-pointer font-semibold shadow-xs"
                    title="Generate and assign a verification code"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Generate Code</span>
                  </button>

                  <button
                    onClick={loadVerificationCodes}
                    disabled={verificationCodesLoading}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer font-medium"
                    title="Refresh codes"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${verificationCodesLoading ? 'animate-spin text-indigo-500' : ''}`} />
                    <span>Refresh</span>
                  </button>

                  {selectedCodes.size > 0 && (
                    <button
                      onClick={handleDeleteSelectedCodes}
                      className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition cursor-pointer font-semibold shadow-xs"
                      title="Delete selected code records"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Selected ({selectedCodes.size})</span>
                    </button>
                  )}

                  {verificationCodes.length > 0 && (
                    <button
                      onClick={handleClearAllCodes}
                      className="flex items-center space-x-1.5 px-3 py-1.5 text-xs border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 rounded-xl transition cursor-pointer font-medium"
                      title="Clear all code history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Filters Bar */}
              {(() => {
                const filteredCodes = verificationCodes.filter((c) => {
                  if (codeSearch.trim()) {
                    const q = codeSearch.toLowerCase();
                    const match =
                      (c.code && c.code.toLowerCase().includes(q)) ||
                      (c.email && c.email.toLowerCase().includes(q)) ||
                      (c.username && c.username.toLowerCase().includes(q));
                    if (!match) return false;
                  }
                  if (codeFilterAction !== 'all' && c.action !== codeFilterAction) return false;
                  if (codeFilterStatus !== 'all' && c.status !== codeFilterStatus) return false;
                  if (codeDateFrom || codeDateTo) {
                    if (!c.createdAt) return false;
                    const itemDate = new Date(c.createdAt);
                    if (codeDateFrom) {
                      const fromDate = new Date(codeDateFrom);
                      fromDate.setHours(0, 0, 0, 0);
                      if (itemDate < fromDate) return false;
                    }
                    if (codeDateTo) {
                      const toDate = new Date(codeDateTo);
                      toDate.setHours(23, 59, 59, 999);
                      if (itemDate > toDate) return false;
                    }
                  }
                  return true;
                });

                const allFilteredSelected =
                  filteredCodes.length > 0 && filteredCodes.every((c) => selectedCodes.has(c._id));

                const handleToggleSelectAllFiltered = () => {
                  if (allFilteredSelected) {
                    setSelectedCodes(new Set());
                  } else {
                    setSelectedCodes(new Set(filteredCodes.map((c) => c._id)));
                  }
                };

                const hasActiveCodeFilters =
                  codeSearch.trim() !== '' ||
                  codeFilterAction !== 'all' ||
                  codeFilterStatus !== 'all' ||
                  !!codeDateFrom ||
                  !!codeDateTo;

                return (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
                      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-[200px]">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={codeSearch}
                            onChange={(e) => setCodeSearch(e.target.value)}
                            placeholder="Search by code, email or username..."
                            className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                          />
                        </div>

                        {/* Filters row */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Action Filter */}
                          <select
                            value={codeFilterAction}
                            onChange={(e) => setCodeFilterAction(e.target.value)}
                            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer font-medium"
                          >
                            <option value="all">Action: All</option>
                            <option value="email_verification">Verify Email</option>
                            <option value="password_reset">Password Reset</option>
                            <option value="account_deletion">Account Deletion</option>
                          </select>

                          {/* Status Filter */}
                          <select
                            value={codeFilterStatus}
                            onChange={(e) => setCodeFilterStatus(e.target.value)}
                            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer font-medium"
                          >
                            <option value="all">Status: All</option>
                            <option value="pending">⏳ Pending Dispatch</option>
                            <option value="sent">🚀 Sent to User</option>
                            <option value="used">✅ Verified / Used</option>
                            <option value="expired">⌛ Expired</option>
                          </select>

                          {/* Date Range Filter */}
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <input
                              type="date"
                              value={codeDateFrom}
                              onChange={(e) => setCodeDateFrom(e.target.value)}
                              title="From date"
                              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer font-medium"
                            />
                            <span className="text-slate-400 text-xs">–</span>
                            <input
                              type="date"
                              value={codeDateTo}
                              min={codeDateFrom || undefined}
                              onChange={(e) => setCodeDateTo(e.target.value)}
                              title="To date"
                              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer font-medium"
                            />
                          </div>

                          {/* Reset filters */}
                          {hasActiveCodeFilters && (
                            <button
                              onClick={() => {
                                setCodeSearch('');
                                setCodeFilterAction('all');
                                setCodeFilterStatus('all');
                                setCodeDateFrom('');
                                setCodeDateTo('');
                              }}
                              className="text-xs px-2.5 py-1.5 text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 font-medium transition cursor-pointer flex items-center space-x-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reset</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Select all bar */}
                      {filteredCodes.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <button
                            type="button"
                            onClick={handleToggleSelectAllFiltered}
                            className="flex items-center space-x-2 font-semibold hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                          >
                            {allFilteredSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-500" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                            <span>
                              {allFilteredSelected
                                ? 'Deselect All'
                                : `Select All Filtered (${selectedCodes.size}/${filteredCodes.length})`}
                            </span>
                          </button>

                          <span className="font-mono text-[11px]">
                            Showing {filteredCodes.length} of {verificationCodes.length} record(s)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Cards List / Grid */}
                    {verificationCodesLoading ? (
                      <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Loading verification codes...</p>
                      </div>
                    ) : filteredCodes.length === 0 ? (
                      <div className="py-16 px-4 flex flex-col items-center justify-center text-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-500">
                          <KeyRound className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">No Verification Codes Found</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                            {hasActiveCodeFilters
                              ? 'No records match your active filters. Try clearing filters.'
                              : 'When a user registers or requests a password reset, their OTP code will appear here for you to send.'}
                          </p>
                        </div>
                        {hasActiveCodeFilters && (
                          <button
                            onClick={() => {
                              setCodeSearch('');
                              setCodeFilterAction('all');
                              setCodeFilterStatus('all');
                              setCodeDateFrom('');
                              setCodeDateTo('');
                            }}
                            className="mt-2 text-xs font-semibold px-3 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition cursor-pointer"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 min-w-0">
                        {filteredCodes.map((c) => {
                          const isSelected = selectedCodes.has(c._id);
                          const isPending = c.status === 'pending';
                          const isSent = c.status === 'sent';
                          const isUsed = c.status === 'used';
                          const isSending = sendingCodeId === c._id;

                          const actionLabel =
                            c.action === 'email_verification'
                              ? 'Email Verification'
                              : c.action === 'password_reset'
                              ? 'Password Reset'
                              : c.action === 'account_deletion'
                              ? 'Account Deletion'
                              : c.action;

                          const actionColor =
                            c.action === 'email_verification'
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60'
                              : c.action === 'password_reset'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800/60';

                          return (
                            <div
                              key={c._id}
                              className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-xs transition flex flex-col justify-between min-w-0 overflow-hidden ${
                                isSelected
                                  ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                                  : isPending
                                  ? 'border-amber-500/50 hover:border-amber-500'
                                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              <div className="space-y-3 min-w-0 overflow-hidden">
                                {/* Card top: Select checkbox + Action Badge + Status */}
                                <div className="flex items-center justify-between gap-2 min-w-0">
                                  <div className="flex items-center space-x-2 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedCodes((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(c._id)) next.delete(c._id);
                                          else next.add(c._id);
                                          return next;
                                        });
                                      }}
                                      className="text-slate-400 hover:text-indigo-500 transition cursor-pointer shrink-0"
                                      title="Select this code"
                                    >
                                      {isSelected ? (
                                        <CheckSquare className="w-4 h-4 text-indigo-500" />
                                      ) : (
                                        <Square className="w-4 h-4" />
                                      )}
                                    </button>

                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border truncate ${actionColor}`}
                                      title={actionLabel}
                                    >
                                      {actionLabel}
                                    </span>
                                  </div>

                                  <div className="shrink-0">
                                    {isPending && (
                                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                        <span>Pending Dispatch</span>
                                      </span>
                                    )}
                                    {isSent && (
                                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                        <span>🚀 Sent to User</span>
                                      </span>
                                    )}
                                    {isUsed && (
                                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        <span>✅ Verified</span>
                                      </span>
                                    )}
                                    {c.status === 'expired' && (
                                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                        <span>⌛ Expired</span>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* User details */}
                                <div className="flex items-center space-x-3 min-w-0 overflow-hidden pt-1">
                                  <Avatar src={c.user?.avatar} name={c.username || c.email} size="md" />
                                  <div className="min-w-0 flex-1 overflow-hidden">
                                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate" title={c.username ? `@${c.username}` : c.email}>
                                      {c.username ? `@${c.username}` : 'Guest User'}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-full" title={c.email}>
                                      {c.email}
                                    </div>
                                  </div>
                                </div>

                                {/* Monospace Code Box */}
                                <div className="bg-slate-950/90 dark:bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-inner">
                                  <div className="min-w-0">
                                    <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block font-mono">
                                      One-Time Passcode (OTP)
                                    </span>
                                    <span className="text-2xl font-mono font-black tracking-widest text-indigo-400 select-all">
                                      {c.code}
                                    </span>
                                  </div>

                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(c.code);
                                      showMsg(`Copied code ${c.code} to clipboard!`);
                                    }}
                                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
                                    title="Copy 6-digit code"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                </div>

                                {/* Timestamps info */}
                                <div className="text-[10px] text-slate-400 font-mono space-y-0.5 pt-0.5">
                                  <div className="flex justify-between">
                                    <span>Requested:</span>
                                    <span className="text-slate-300">{new Date(c.createdAt).toLocaleTimeString()}</span>
                                  </div>
                                  {c.sentAt && (
                                    <div className="flex justify-between">
                                      <span>Sent:</span>
                                      <span className="text-cyan-400">{new Date(c.sentAt).toLocaleTimeString()} {c.sentBy ? `by @${c.sentBy.username}` : ''}</span>
                                    </div>
                                  )}
                                  {c.expiresAt && (
                                    <div className="flex justify-between">
                                      <span>Expires:</span>
                                      <span className="text-amber-400">{new Date(c.expiresAt).toLocaleTimeString()}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Prominent Send & Action Controls */}
                              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleRegenerateCode(c)}
                                    className="py-1.5 px-2.5 rounded-xl text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center justify-center space-x-1 cursor-pointer"
                                    title="Generate new 6-digit code for this user"
                                  >
                                    <RefreshCw className="w-3 h-3 text-indigo-500" />
                                    <span>Regenerate</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleRevokeCode(c)}
                                    disabled={c.status === 'expired' || c.status === 'used'}
                                    className="py-1.5 px-2.5 rounded-xl text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 disabled:opacity-40 transition flex items-center justify-center space-x-1 cursor-pointer"
                                    title="Revoke and expire code immediately"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    <span>Revoke</span>
                                  </button>
                                </div>

                                <button
                                  onClick={() => handleSendVerificationCode(c)}
                                  disabled={isSending || isUsed}
                                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition shadow-md cursor-pointer ${
                                    isUsed
                                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                                      : isPending
                                      ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30'
                                      : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20'
                                  }`}
                                  title="Dispatch code immediately to user"
                                >
                                  <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-bounce' : ''}`} />
                                  <span>
                                    {isSending
                                      ? 'Sending to User...'
                                      : isUsed
                                      ? 'Code Already Used'
                                      : isSent
                                      ? 'Resend Code to User'
                                      : 'Send Code to User'}
                                  </span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
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
                    className={`p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs min-w-0 overflow-hidden ${
                      mode === 'grid' ? 'flex flex-col justify-between h-full space-y-3' : 'flex items-center justify-between'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 overflow-hidden">
                      <Avatar src={u.avatar} name={u.username} size="md" />
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate" title={u.username}>
                            {u.username}
                          </span>
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
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-full" title={u.email}>
                          {u.email}
                        </div>
                        {u.isBanned && (
                          <span className="inline-block mt-1 text-[10px] text-rose-500 font-semibold truncate max-w-full" title={u.banReason || 'Policy violation'}>
                            Banned: {u.banReason || 'Policy violation'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={`flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 ${mode === 'grid' ? 'flex-wrap' : 'flex-nowrap shrink-0'}`}>
                      {u._id !== user?._id && (
                        <button
                          onClick={() => handleStartDirectChat(u._id)}
                          className="px-2 py-1 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition cursor-pointer flex items-center space-x-1 shrink-0"
                          title="Open direct chat with this user"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Chat</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEditUser(u)}
                        className="px-2 py-1 text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer flex items-center space-x-1 shrink-0"
                        title="Edit user profile"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleRoleToggle(u)}
                        className="px-2 py-1 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
                        title="Toggle admin / user role"
                      >
                        {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                      </button>

                      <button
                        onClick={() => handleBanToggle(u)}
                        className={`px-2 py-1 text-[11px] font-semibold rounded-xl transition cursor-pointer shrink-0 ${
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
                          className="px-2 py-1 text-[11px] font-semibold bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded-xl transition cursor-pointer shrink-0"
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
                      className={`p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition hover:border-indigo-500/40 hover:shadow-md min-w-0 overflow-hidden ${
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

                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="flex items-center justify-between gap-1.5 min-w-0">
                              <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate" title={title}>
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
                      className={`p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition hover:border-indigo-500/40 hover:shadow-md min-w-0 overflow-hidden ${
                        mode === 'grid' ? 'flex flex-col justify-between h-full space-y-3' : 'flex items-start justify-between'
                      }`}
                    >
                      <div className={`space-y-2.5 min-w-0 overflow-hidden ${mode === 'grid' ? 'w-full' : 'flex-1 pr-4'}`}>
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <span className="text-base select-none shrink-0" role="img" aria-label="badge">
                            {a.design?.badge || (a.hasPoll ? '🗳️' : '📢')}
                          </span>
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-full" title={a.title}>{a.title}</span>
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
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <RotateCcw className="w-5 h-5 text-indigo-500" />
                    <span>Account Recovery Requests</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Review, approve, or reject user account restoration and data migration requests.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={loadRecoveries}
                    disabled={recoveriesLoading}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer font-medium"
                    title="Refresh requests"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${recoveriesLoading ? 'animate-spin text-indigo-500' : ''}`} />
                    <span>Refresh</span>
                  </button>

                  {selectedRecoveries.size > 0 && (
                    <button
                      onClick={handleDeleteSelectedRecoveries}
                      disabled={deletingRecoveries}
                      className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition cursor-pointer font-semibold shadow-xs"
                      title="Delete selected recovery records"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Selected ({selectedRecoveries.size})</span>
                    </button>
                  )}

                  {recoveries.length > 0 && (
                    <button
                      onClick={handleClearAllRecoveries}
                      disabled={deletingRecoveries}
                      className="flex items-center space-x-1.5 px-3 py-1.5 text-xs border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 rounded-xl transition cursor-pointer font-medium"
                      title="Clear all recovery history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Filters Bar */}
              {(() => {
                const filteredRecoveries = recoveries.filter((r) => {
                  if (recoverySearch.trim()) {
                    const q = recoverySearch.toLowerCase();
                    const match =
                      (r.email && r.email.toLowerCase().includes(q)) ||
                      (r.originalUsername && r.originalUsername.toLowerCase().includes(q)) ||
                      (r.originalEmail && r.originalEmail.toLowerCase().includes(q)) ||
                      (r.user?.username && r.user.username.toLowerCase().includes(q)) ||
                      (r.user?.email && r.user.email.toLowerCase().includes(q));
                    if (!match) return false;
                  }
                  if (recoveryStatusFilter !== 'all' && r.status !== recoveryStatusFilter) return false;
                  if (recoveryDateFrom || recoveryDateTo) {
                    if (!r.createdAt) return false;
                    const ts = new Date(r.createdAt).getTime();
                    if (recoveryDateFrom && ts < new Date(recoveryDateFrom).getTime()) return false;
                    if (recoveryDateTo) {
                      const endOfDay = new Date(recoveryDateTo);
                      endOfDay.setHours(23, 59, 59, 999);
                      if (ts > endOfDay.getTime()) return false;
                    }
                  }
                  return true;
                });

                const allFilteredRecoveriesSelected =
                  filteredRecoveries.length > 0 && filteredRecoveries.every((r) => selectedRecoveries.has(r._id));

                const handleToggleSelectAllFilteredRecoveries = () => {
                  if (allFilteredRecoveriesSelected) {
                    setSelectedRecoveries(new Set());
                  } else {
                    setSelectedRecoveries(new Set(filteredRecoveries.map((r) => r._id)));
                  }
                };

                const hasActiveRecoveryFilters =
                  recoverySearch.trim() !== '' ||
                  recoveryStatusFilter !== 'all' ||
                  !!recoveryDateFrom ||
                  !!recoveryDateTo;

                return (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
                      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-[200px]">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={recoverySearch}
                            onChange={(e) => setRecoverySearch(e.target.value)}
                            placeholder="Search by username, email..."
                            className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                          />
                        </div>

                        {/* Filters row */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Status Filter */}
                          <select
                            value={recoveryStatusFilter}
                            onChange={(e) => setRecoveryStatusFilter(e.target.value)}
                            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer font-medium"
                          >
                            <option value="all">Status: All</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="partial">Partial</option>
                          </select>

                          {/* Date Range Filter */}
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <input
                              type="date"
                              value={recoveryDateFrom}
                              onChange={(e) => setRecoveryDateFrom(e.target.value)}
                              title="From date"
                              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer font-medium"
                            />
                            <span className="text-slate-400 text-xs">–</span>
                            <input
                              type="date"
                              value={recoveryDateTo}
                              min={recoveryDateFrom || undefined}
                              onChange={(e) => setRecoveryDateTo(e.target.value)}
                              title="To date"
                              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer font-medium"
                            />
                          </div>

                          {/* Reset filters */}
                          {hasActiveRecoveryFilters && (
                            <button
                              onClick={() => {
                                setRecoverySearch('');
                                setRecoveryStatusFilter('all');
                                setRecoveryDateFrom('');
                                setRecoveryDateTo('');
                              }}
                              className="text-xs px-2.5 py-1.5 text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 font-medium transition cursor-pointer flex items-center space-x-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reset</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Select all bar */}
                      {filteredRecoveries.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <button
                            type="button"
                            onClick={handleToggleSelectAllFilteredRecoveries}
                            className="flex items-center space-x-2 font-semibold hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                          >
                            {allFilteredRecoveriesSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-500" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                            <span>
                              {allFilteredRecoveriesSelected
                                ? 'Deselect All'
                                : `Select All Filtered (${selectedRecoveries.size}/${filteredRecoveries.length})`}
                            </span>
                          </button>

                          <span className="font-mono text-[11px]">
                            Showing {filteredRecoveries.length} of {recoveries.length} request(s)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    {recoveriesLoading ? (
                      <div className="flex items-center justify-center py-16 text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                        <span className="text-sm">Loading requests...</span>
                      </div>
                    ) : filteredRecoveries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                        <RotateCcw className="w-10 h-10 opacity-30" />
                        <p className="text-sm font-medium">No recovery requests found</p>
                        <p className="text-xs">
                          {hasActiveRecoveryFilters ? 'No requests match your filters.' : 'All clear — no pending account restorations.'}
                        </p>
                        {hasActiveRecoveryFilters && (
                          <button
                            onClick={() => {
                              setRecoverySearch('');
                              setRecoveryStatusFilter('all');
                              setRecoveryDateFrom('');
                              setRecoveryDateTo('');
                            }}
                            className="mt-2 text-xs font-semibold px-3 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition cursor-pointer"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredRecoveries.map(req => {
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

                    const isSelected = selectedRecoveries.has(req._id);

                    return (
                      <div
                        key={req._id}
                        className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 space-y-4 shadow-xs transition min-w-0 overflow-hidden ${
                          isSelected
                            ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-3 flex-wrap min-w-0">
                          <div className="flex items-start space-x-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRecoveries((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(req._id)) next.delete(req._id);
                                  else next.add(req._id);
                                  return next;
                                });
                              }}
                              className="mt-0.5 text-slate-400 hover:text-indigo-500 transition cursor-pointer shrink-0"
                              title="Select this recovery request"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-indigo-500" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>

                            <div className="space-y-0.5 min-w-0 overflow-hidden">
                              <div className="flex items-center space-x-2 flex-wrap gap-1 min-w-0">
                                <span className="text-sm font-bold text-slate-900 dark:text-white truncate" title={req.user?.username || req.originalUsername}>
                                  @{req.user?.username || req.originalUsername}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusColor}`}>
                                  {req.status.toUpperCase()}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${typeColor}`}>
                                  {isMigration ? '📦 DATA MIGRATION' : '🔄 RESTORE'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-full" title={req.user?.email || req.email}>
                                {req.user?.email || req.email}
                              </p>
                            </div>
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
                );
              })()}
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
                      className={`p-3.5 bg-white dark:bg-slate-900 border rounded-2xl shadow-xs transition min-w-0 overflow-hidden ${
                        isSelected
                          ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20'
                          : 'border-slate-200 dark:border-slate-800'
                      } ${
                        mode === 'grid' ? 'flex flex-col gap-3' : 'flex items-center justify-between'
                      }`}
                    >
                      <div className="flex items-start space-x-3 flex-1 min-w-0 pr-3 overflow-hidden">
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

          {/* TAB: MAINTENANCE & DOWNTIME MANAGER */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6 max-w-5xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <Wrench className="w-5 h-5 text-indigo-500" />
                    <span>Scheduled Maintenance Manager</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Schedule automated downtime windows or toggle instant maintenance with granular feature-level control
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => loadMaintenance()}
                    disabled={schedulesLoading}
                    className="p-2 text-slate-500 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                    title="Refresh Schedules"
                  >
                    <RefreshCw className={`w-4 h-4 ${schedulesLoading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => openScheduleModal()}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Schedule Maintenance</span>
                  </button>
                </div>
              </div>

              {/* Status Overview Banner */}
              {activeMaintRecord ? (
                <div className="p-5 bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border-2 border-rose-500/50 rounded-2xl shadow-xl shadow-rose-950/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                          Maintenance Mode Active
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          activeMaintRecord.scope === 'full_system'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {activeMaintRecord.scope === 'full_system' ? 'Full System Outage' : 'Partial / Feature-Specific'}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-white">{activeMaintRecord.title}</h3>
                      {activeMaintRecord.description && (
                        <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                          {activeMaintRecord.description}
                        </p>
                      )}

                      {activeMaintRecord.scope === 'partial' && activeMaintRecord.affectedFeatures?.length > 0 && (
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <span className="text-[11px] text-slate-400 font-medium">Affected Features:</span>
                          {activeMaintRecord.affectedFeatures.map((f) => (
                            <span key={f} className="px-2 py-0.5 bg-slate-800 text-amber-300 rounded-md text-[10px] font-mono border border-slate-700">
                              {f}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center space-x-4 pt-2 text-[11px] text-slate-400">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Started: {new Date(activeMaintRecord.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                        {activeMaintRecord.endTime && (
                          <span className="flex items-center space-x-1">
                            <Hourglass className="w-3.5 h-3.5 text-amber-400" />
                            <span>Expected End: {new Date(activeMaintRecord.endTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => openScheduleModal(activeMaintRecord)}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleEndSchedule(activeMaintRecord._id)}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-600/30 cursor-pointer flex items-center space-x-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>End Maintenance Now</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-emerald-300">All Systems Operational</div>
                      <div className="text-[11px] text-slate-400">No active maintenance in progress. Normal users have full access.</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      openScheduleModal();
                      setMaintIsImmediate(true);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition cursor-pointer"
                  >
                    Quick Emergency Mode
                  </button>
                </div>
              )}

              {/* Upcoming Schedules */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span>Upcoming Maintenance Windows</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {schedules.filter((s) => s.status === 'scheduled').length} scheduled
                  </span>
                </div>

                {schedules.filter((s) => s.status === 'scheduled').length === 0 ? (
                  <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500">
                    <Hourglass className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">No upcoming maintenance windows scheduled</p>
                    <p className="text-[11px] text-slate-400 mt-1">Users will not experience scheduled downtime.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {schedules
                      .filter((s) => s.status === 'scheduled')
                      .map((sch) => {
                        const start = new Date(sch.startTime);
                        const end = sch.endTime ? new Date(sch.endTime) : null;
                        const startsInMin = Math.round((start.getTime() - Date.now()) / (1000 * 60));

                        return (
                          <div
                            key={sch._id}
                            className="p-4 bg-white dark:bg-slate-900 border border-indigo-500/20 hover:border-indigo-500/40 rounded-2xl shadow-xs space-y-3 transition"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                  {startsInMin > 0 ? `Starts in ${startsInMin}m` : 'Starting Soon'}
                                </span>
                                <h4 className="text-sm font-bold text-white mt-1.5">{sch.title}</h4>
                                {sch.description && (
                                  <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{sch.description}</p>
                                )}
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                sch.scope === 'full_system'
                                  ? 'bg-rose-500/10 text-rose-300'
                                  : 'bg-amber-500/10 text-amber-300'
                              }`}>
                                {sch.scope === 'full_system' ? 'Full System' : 'Partial'}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-400 space-y-1 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                              <div className="flex justify-between">
                                <span>Start:</span>
                                <span className="font-mono text-slate-200">{start.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                              </div>
                              {end && (
                                <div className="flex justify-between">
                                  <span>End:</span>
                                  <span className="font-mono text-slate-200">{end.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                </div>
                              )}
                              {sch.scope === 'partial' && sch.affectedFeatures?.length > 0 && (
                                <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                                  <span>Features:</span>
                                  <span className="text-[10px] text-amber-300">{sch.affectedFeatures.join(', ')}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-end space-x-2 pt-1">
                              <button
                                onClick={() => handleActivateSchedule(sch._id)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer flex items-center space-x-1"
                              >
                                <Play className="w-3 h-3" />
                                <span>Activate Now</span>
                              </button>
                              <button
                                onClick={() => openScheduleModal(sch)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleCancelSchedule(sch._id)}
                                className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold rounded-lg border border-rose-800/40 transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Maintenance History */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>Maintenance History</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Past completed and cancelled maintenance downtime logs
                    </p>
                  </div>

                  {schedules.filter((s) => s.status === 'completed' || s.status === 'cancelled').length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearMaintenanceHistory}
                      className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-rose-500 hover:text-white border border-rose-500/30 hover:bg-rose-600 rounded-xl transition cursor-pointer font-medium self-start sm:self-center shadow-xs"
                      title="Clear all past completed and cancelled maintenance records"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear History ({schedules.filter((s) => s.status === 'completed' || s.status === 'cancelled').length})</span>
                    </button>
                  )}
                </div>

                {schedules.filter((s) => s.status === 'completed' || s.status === 'cancelled').length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">No past maintenance history records.</div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {schedules
                      .filter((s) => s.status === 'completed' || s.status === 'cancelled')
                      .map((sch) => (
                        <div key={sch._id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                          <div className="flex items-center space-x-3 min-w-0 pr-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              sch.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-700/50 text-slate-400'
                            }`}>
                              {sch.status}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 dark:text-white truncate">{sch.title}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {sch.scope === 'full_system' ? 'Full System' : `Partial (${(sch.affectedFeatures || []).join(', ')})`}
                                {' • '}
                                {new Date(sch.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 shrink-0">
                            <span className="text-[11px] text-slate-500 font-mono hidden md:inline">
                              {sch.completedAt ? `Ended ${new Date(sch.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteMaintenanceRecord(sch._id, sch.title)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                              title="Delete this maintenance record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: THEME & TYPOGRAPHY MANAGEMENT */}
          {activeTab === 'theme' && (
            <div className="space-y-8 max-w-5xl">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <Palette className="w-5 h-5 text-indigo-500" />
                    <span>Dynamic App Theme & Typography Studio</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Configure the platform-wide default colors and typography. All users who haven't customized their theme automatically synchronize in real time.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleResetThemeDefaults}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Defaults</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTheme}
                    disabled={savingTheme}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    {savingTheme ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>{savingTheme ? 'Broadcasting...' : 'Save & Broadcast'}</span>
                  </button>
                </div>
              </div>

              {themeSuccessMsg && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center space-x-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{themeSuccessMsg}</span>
                </div>
              )}

              {/* Grid: Left Column Controls, Right Column Live Interactive Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left 7 Cols: Theme & Typography Controls */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Card 1: Curated Palette Presets */}
                  <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>Curated Default Palettes</span>
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Instant one-click color harmonies optimized for high readability across components.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {themeForm.accentColor}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-3 gap-2.5">
                      {Object.values(THEME_PALETTES).map((p) => {
                        const isSelected = themeForm.accentColor === p.id || themeForm.primaryColor?.toLowerCase() === p.primary?.toLowerCase();
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setThemeForm((prev) => ({
                                ...prev,
                                accentColor: p.id,
                                primaryColor: p.primary,
                                primaryHover: p.hover,
                                secondaryColor: p.secondary
                              }));
                            }}
                            className={`p-2.5 rounded-2xl border text-left flex items-center space-x-2.5 transition cursor-pointer ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                            }`}
                          >
                            <div className="w-5 h-5 rounded-full shrink-0 shadow-sm flex items-center justify-center" style={{ backgroundColor: p.primary }}>
                              {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{p.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{p.primary}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card 2: Custom Color Palette Fine-Tuning */}
                  <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <Palette className="w-4 h-4 text-indigo-400" />
                      <span>Custom Color Values</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Primary Color */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          Primary Brand Color
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={themeForm.primaryColor || '#6366f1'}
                            onChange={(e) => {
                              const hex = e.target.value;
                              setThemeForm((prev) => ({
                                ...prev,
                                accentColor: 'custom',
                                primaryColor: hex,
                                primaryHover: adjustBrightness(hex, -12)
                              }));
                            }}
                            className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 dark:border-slate-700 bg-transparent p-0.5"
                          />
                          <input
                            type="text"
                            value={themeForm.primaryColor || ''}
                            onChange={(e) => {
                              const hex = e.target.value;
                              setThemeForm((prev) => ({
                                ...prev,
                                accentColor: 'custom',
                                primaryColor: hex,
                                primaryHover: adjustBrightness(hex, -12)
                              }));
                            }}
                            placeholder="#6366f1"
                            className="flex-1 px-3 py-2 text-xs font-mono rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Secondary / Accent Color */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          Secondary / Badge Color
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={themeForm.secondaryColor || '#10b981'}
                            onChange={(e) => {
                              setThemeForm((prev) => ({
                                ...prev,
                                secondaryColor: e.target.value
                              }));
                            }}
                            className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 dark:border-slate-700 bg-transparent p-0.5"
                          />
                          <input
                            type="text"
                            value={themeForm.secondaryColor || ''}
                            onChange={(e) => {
                              setThemeForm((prev) => ({
                                ...prev,
                                secondaryColor: e.target.value
                              }));
                            }}
                            placeholder="#10b981"
                            className="flex-1 px-3 py-2 text-xs font-mono rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Mode (Dark, Light, System) */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        Default Display Mode
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'dark', label: 'Dark Mode (PulseChat Spec)' },
                          { id: 'light', label: 'Light Mode' },
                          { id: 'system', label: 'System Automatic' }
                        ].map((m) => {
                          const isSel = (themeForm.mode || 'dark') === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setThemeForm((prev) => ({ ...prev, mode: m.id }))}
                              className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                                isSel
                                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Typography System */}
                  <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <Type className="w-4 h-4 text-violet-400" />
                      <span>Typography & Font Styles</span>
                    </h3>

                    {/* Font Family Selection */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        Application Font Family
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {TYPOGRAPHY_FONTS.map((font) => {
                          const isSel = (themeForm.fontFamily || 'Inter') === font.id;
                          return (
                            <button
                              key={font.id}
                              type="button"
                              onClick={() => setThemeForm((prev) => ({ ...prev, fontFamily: font.id }))}
                              style={{ fontFamily: font.family }}
                              className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                                isSel
                                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-300 ring-2 ring-violet-500/20'
                                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div>
                                <div className="text-xs font-bold">{font.id}</div>
                                <div className="text-[10px] text-slate-400">The quick brown fox 0123</div>
                              </div>
                              {isSel && <Check className="w-3.5 h-3.5 text-violet-500 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Font Size & Heading Styles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          Base Font Size
                        </label>
                        <select
                          value={themeForm.fontSize || 'medium'}
                          onChange={(e) => setThemeForm((prev) => ({ ...prev, fontSize: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        >
                          {FONT_SIZES.map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          Heading Weight
                        </label>
                        <select
                          value={themeForm.fontWeightHeading || '700'}
                          onChange={(e) => setThemeForm((prev) => ({ ...prev, fontWeightHeading: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        >
                          {HEADING_WEIGHTS.map((w) => (
                            <option key={w.id} value={w.id}>{w.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          Heading Text Transform
                        </label>
                        <select
                          value={themeForm.headingTransform || 'none'}
                          onChange={(e) => setThemeForm((prev) => ({ ...prev, headingTransform: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        >
                          {HEADING_TRANSFORMS.map((t) => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          Heading Letter Spacing
                        </label>
                        <select
                          value={themeForm.headingLetterSpacing || '-0.02em'}
                          onChange={(e) => setThemeForm((prev) => ({ ...prev, headingLetterSpacing: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        >
                          <option value="-0.03em">Tight (-0.03em)</option>
                          <option value="-0.02em">Standard (-0.02em)</option>
                          <option value="0em">Normal (0em)</option>
                          <option value="0.04em">Wide (0.04em)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right 5 Cols: Live Interactive Component Preview Studio */}
                <div className="lg:col-span-5 space-y-4 sticky top-20">
                  <div className="p-5 bg-slate-950 border border-slate-800 rounded-3xl shadow-xl space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono flex items-center space-x-1.5">
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Live Component Preview</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {themeForm.mode} mode
                      </span>
                    </div>

                    {/* Simulated Mini App Interface */}
                    <div
                      className="rounded-2xl p-4 space-y-4 border border-slate-800 bg-[#070b14] text-white"
                      style={{
                        fontFamily: themeForm.fontFamily ? `'${themeForm.fontFamily}', sans-serif` : 'Inter, sans-serif'
                      }}
                    >
                      {/* Mini Navbar */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[11px] font-black shadow-sm"
                            style={{ backgroundColor: themeForm.primaryColor || '#6366f1' }}
                          >
                            P
                          </div>
                          <span
                            className="text-xs font-bold tracking-tight"
                            style={{
                              fontWeight: themeForm.fontWeightHeading || '700',
                              letterSpacing: themeForm.headingLetterSpacing || '-0.02em',
                              textTransform: themeForm.headingTransform || 'none'
                            }}
                          >
                            PulseChat
                          </span>
                        </div>
                        <span
                          className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                          style={{
                            backgroundColor: hexToRgba(themeForm.secondaryColor || '#10b981', 0.2),
                            color: themeForm.secondaryColor || '#10b981'
                          }}
                        >
                          ACTIVE
                        </span>
                      </div>

                      {/* Headings Sample */}
                      <div className="space-y-1">
                        <h4
                          className="text-sm"
                          style={{
                            fontWeight: themeForm.fontWeightHeading || '700',
                            letterSpacing: themeForm.headingLetterSpacing || '-0.02em',
                            textTransform: themeForm.headingTransform || 'none'
                          }}
                        >
                          Heading Sample H1
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Body text rendered with base font ({themeForm.fontSize || 'medium'}).
                        </p>
                      </div>

                      {/* Sample Chat Message Bubbles */}
                      <div className="space-y-2 pt-1">
                        {/* Received Bubble */}
                        <div className="flex items-start space-x-2">
                          <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-400">
                            A
                          </div>
                          <div className="max-w-[75%] p-2 rounded-2xl bg-slate-900 border border-slate-800 text-[11px] text-slate-200">
                            Hello! How does the new theme look?
                          </div>
                        </div>

                        {/* Sent Bubble */}
                        <div className="flex items-start justify-end space-x-2">
                          <div
                            className="max-w-[75%] p-2 rounded-2xl text-[11px] text-white shadow-sm"
                            style={{ backgroundColor: themeForm.primaryColor || '#6366f1' }}
                          >
                            It looks vibrant and instantly synced! 🚀
                          </div>
                        </div>
                      </div>

                      {/* Interactive Buttons Preview */}
                      <div className="pt-2 flex items-center space-x-2">
                        <button
                          type="button"
                          className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white shadow-sm transition"
                          style={{ backgroundColor: themeForm.primaryColor || '#6366f1' }}
                        >
                          Primary Action
                        </button>
                        <button
                          type="button"
                          className="py-2 px-3 rounded-xl text-xs font-bold border transition"
                          style={{
                            borderColor: hexToRgba(themeForm.primaryColor || '#6366f1', 0.4),
                            color: themeForm.primaryColor || '#6366f1',
                            backgroundColor: hexToRgba(themeForm.primaryColor || '#6366f1', 0.1)
                          }}
                        >
                          Secondary
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                      <div className="font-semibold text-slate-300">How Synchronized Theme Works:</div>
                      <div>• When you click Save, the theme is saved in the database.</div>
                      <div>• Socket.io broadcasts to all connected clients immediately.</div>
                      <div>• Users with personal customizations keep their choices intact.</div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveTheme}
                      disabled={savingTheme}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center space-x-2 transition cursor-pointer shadow-lg"
                      style={{ backgroundColor: themeForm.primaryColor || '#6366f1' }}
                    >
                      {savingTheme ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>{savingTheme ? 'Broadcasting Updates...' : 'Apply Default System-Wide'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: LANDING PAGE CMS */}
          {activeTab === 'landing' && (
            <LandingCmsTab
              authHeaders={authHeaders}
              showFeedback={setFeedback}
              token={token}
            />
          )}

          {/* TAB 7: SETTINGS & FEATURE FLAGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-indigo-500" />
                  <span>System Feature Flags & Management</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Centrally enable or disable application features across both frontend interfaces and backend API routes in real-time.
                </p>
              </div>

              {/* Administrator Official Contact Settings Card */}
              <OfficialContactSettingsCard authHeaders={authHeaders} showFeedback={showMsg} />

              {[
                {
                  category: 'Core Communication Modules',
                  items: [
                    {
                      key: 'chatEnabled',
                      label: 'Direct & Group Messaging (Chat System)',
                      desc: 'Enables 1-on-1 private messaging, group conversations, and chat history retrieval'
                    },
                    {
                      key: 'statusesEnabled',
                      label: 'Status Updates & Stories',
                      desc: '24-hour expiring status updates, viewer counts, reactions, and story feeds'
                    },
                    {
                      key: 'callsEnabled',
                      label: 'Voice & Video Calling',
                      desc: 'Real-time WebRTC audio & video peer connections and incoming ring alerts'
                    }
                  ]
                },
                {
                  category: 'Media & Interactive Features',
                  items: [
                    {
                      key: 'fileSharingEnabled',
                      label: 'Media & File Attachments Sharing',
                      desc: 'Uploading and previewing documents, audio clips, videos, and image attachments'
                    },
                    {
                      key: 'voiceMessagesEnabled',
                      label: 'Voice Audio Messages',
                      desc: 'In-app audio recording and waveform player streaming in chat threads'
                    },
                    {
                      key: 'pollsEnabled',
                      label: 'In-Chat Interactive Polls',
                      desc: 'Interactive voting polls with single or multiple choice responses in chats'
                    },
                    {
                      key: 'customAvatarUpload',
                      label: 'Custom Profile Photo Upload & Crop',
                      desc: 'Allow users to upload, zoom and crop their own profile photo. When disabled, only preset avatars or URL input are shown'
                    }
                  ]
                },
                {
                  category: 'Access, Security & System',
                  items: [
                    {
                      key: 'userRegistrationEnabled',
                      label: 'Public User Registration',
                      desc: 'Allow new visitors to register accounts. When disabled, only admins can create users'
                    },
                    {
                      key: 'e2eeEnabled',
                      label: 'End-to-End Encryption Indicators',
                      desc: 'E2EE key negotiation protocols and secure badge verification in conversation views'
                    },
                    {
                      key: 'notificationsEnabled',
                      label: 'Push & Realtime Notifications',
                      desc: 'Sound chimes, visual badge counts, and realtime alert popups for active sessions'
                    },
                    {
                      key: 'announcementsEnabled',
                      label: 'Admin Broadcast Announcements',
                      desc: 'Global announcement banner and interactive polls displayed on user dashboards'
                    }
                  ]
                }
              ].map((grp) => (
                <div key={grp.category} className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {grp.category}
                  </h3>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs divide-y divide-slate-100 dark:divide-slate-800 text-xs overflow-hidden">
                    {grp.items.map((feat) => {
                      const isEnabled = systemSettings?.featureFlags
                        ? systemSettings.featureFlags[feat.key] !== false
                        : true;

                      return (
                        <div key={feat.key} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                          <div className="pr-4">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {feat.label}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isEnabled
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                {isEnabled ? 'ENABLED' : 'DISABLED'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {feat.desc}
                            </div>
                          </div>

                          <button
                            onClick={() => handleToggleFeature(feat.key, isEnabled)}
                            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                              isEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                            title={isEnabled ? 'Click to disable feature' : 'Click to enable feature'}
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
              ))}
            </div>
          )}

          {/* TAB: STORAGE & DATABASE OPTIMIZATION */}
          {activeTab === 'storage' && (
            <StorageManagementTab authHeaders={authHeaders} showFeedback={showMsg} />
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
      {/* ── Scheduled Maintenance Modal ─────────────────────────────────────── */}
      {maintenanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Wrench className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingSchedule ? 'Edit Maintenance Window' : 'Schedule Maintenance'}
                </h3>
              </div>
              <button
                onClick={() => setMaintenanceModalOpen(false)}
                className="text-slate-400 hover:text-white transition p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMaintenance} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Maintenance Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={maintTitle}
                  onChange={(e) => setMaintTitle(e.target.value)}
                  placeholder="e.g. Core Database Upgrade & Infrastructure Migration"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Public Announcement & Description
                </label>
                <textarea
                  rows={2}
                  value={maintDesc}
                  onChange={(e) => setMaintDesc(e.target.value)}
                  placeholder="Explain why maintenance is happening and what users should expect..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Maintenance Timing Mode */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Timing & Activation Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMaintIsImmediate(false);
                      const inTenMins = new Date(Date.now() + 10 * 60 * 1000);
                      const inOneHour = new Date(Date.now() + 70 * 60 * 1000);
                      setMaintStart(toLocalDatetimeInput(inTenMins));
                      setMaintEnd(toLocalDatetimeInput(inOneHour));
                    }}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      !maintIsImmediate
                        ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/20'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs text-white flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Scheduled Ahead</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Announces countdown banner and auto-activates at start time
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMaintIsImmediate(true);
                      const now = new Date();
                      const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
                      setMaintStart(toLocalDatetimeInput(now));
                      setMaintEnd(toLocalDatetimeInput(inOneHour));
                    }}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      maintIsImmediate
                        ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/20'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs text-white flex items-center space-x-1.5">
                      <Play className="w-3.5 h-3.5 text-rose-400" />
                      <span>Activate Immediately</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Starts maintenance instantly upon submission
                    </div>
                  </button>
                </div>
              </div>

              {/* Date & Time Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Start Date & Time {!maintIsImmediate && <span className="text-rose-400">*</span>}
                  </label>
                  <input
                    type="datetime-local"
                    value={maintStart}
                    disabled={maintIsImmediate}
                    onChange={(e) => setMaintStart(e.target.value)}
                    required={!maintIsImmediate}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Estimated End Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={maintEnd}
                    onChange={(e) => setMaintEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                  />
                </div>
              </div>

              {/* Scope Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Maintenance Impact Scope
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMaintScope('full_system')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      maintScope === 'full_system'
                        ? 'border-red-500 bg-red-500/10 ring-2 ring-red-500/20'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">Full System Outage</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Entire app displays maintenance screen for all normal users
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMaintScope('partial')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      maintScope === 'partial'
                        ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">Partial / Feature-Specific</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Only specific features disabled; rest remains online
                    </div>
                  </button>
                </div>
              </div>

              {/* Partial Features Selection */}
              {maintScope === 'partial' && (
                <div className="space-y-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <label className="block text-[11px] font-bold text-slate-300">
                    Select Features Affected by Maintenance:
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { key: 'chat', label: 'Chat & Messaging' },
                      { key: 'calls', label: 'Voice & Video Calls' },
                      { key: 'status', label: 'Status Updates' },
                      { key: 'fileSharing', label: 'File Sharing' },
                      { key: 'polls', label: 'Interactive Polls' },
                      { key: 'registration', label: 'User Registration' }
                    ].map((f) => {
                      const isChecked = maintFeatures.includes(f.key);
                      return (
                        <label
                          key={f.key}
                          className="flex items-center space-x-2 text-slate-300 cursor-pointer p-1.5 rounded-lg hover:bg-slate-900"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setMaintFeatures([...maintFeatures, f.key]);
                              } else {
                                setMaintFeatures(maintFeatures.filter((x) => x !== f.key));
                              }
                            }}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-[11px]">{f.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={maintSubmitting}
                  className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  {maintSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{maintSubmitting ? 'Saving...' : editingSchedule ? 'Update Schedule' : maintIsImmediate ? 'Activate Maintenance Now' : 'Schedule Maintenance'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMaintenanceModalOpen(false)}
                  disabled={maintSubmitting}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Verification Code Modal */}
      <GenerateCodeModal
        isOpen={isGenerateCodeModalOpen}
        onClose={() => setIsGenerateCodeModalOpen(false)}
        users={users}
        authHeaders={authHeaders}
        onGenerated={(newCode, msg) => {
          showMsg(msg || 'Verification code generated!');
          loadVerificationCodes();
        }}
      />
    </>
  );
};

