import React, { useState, useEffect, useMemo } from 'react';
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
  CircleDashed,
  Heart,
  Smile,
  ImageIcon,
  Loader2,
  MessageCircle,
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
  Menu,
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
  Globe,
  Pipette,
  Bold,
  Italic
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
import { AdminAnalyticsCharts } from '../components/admin/AdminAnalyticsCharts';
import { ChatsManagementTab } from '../components/admin/ChatsManagementTab';
import {
  PRESET_BACKGROUNDS,
  PRESET_TEXT_COLORS,
  PRESET_TEXT_GRADIENTS,
  getStoryTextStyle
} from '../utils/storyStyles';
import { decryptMessage, getConversationCryptoKey } from '../utils/crypto';

// Subcomponent to automatically decrypt and render official conversation message content
const OfficialMessageContent = ({ message, conversationId }) => {
  const [text, setText] = useState(message.content || '');

  useEffect(() => {
    let isMounted = true;
    const convId = conversationId || (message.conversation?._id || message.conversation)?.toString();
    const iv = message.encryptionMetadata?.iv;

    if (convId && iv && message.content) {
      getConversationCryptoKey(convId).then((key) => {
        if (key && isMounted) {
          decryptMessage(message.content, iv, key).then((decrypted) => {
            if (isMounted && decrypted) {
              setText(decrypted);
            }
          });
        }
      });
    } else {
      setText(message.content || '');
    }

    return () => {
      isMounted = false;
    };
  }, [message.content, message.encryptionMetadata?.iv, conversationId]);

  return <p className="break-words font-medium">{text}</p>;
};

// Subcomponent to automatically decrypt and render story reply text in cards
const StoryReplyMessageText = ({ reply }) => {
  const [text, setText] = useState(reply.message || '');

  useEffect(() => {
    let isMounted = true;
    const convId = reply.conversationId?.toString();
    const iv = reply.encryptionMetadata?.iv;

    if (convId && iv && reply.message) {
      getConversationCryptoKey(convId).then((key) => {
        if (key && isMounted) {
          decryptMessage(reply.message, iv, key).then((decrypted) => {
            if (isMounted && decrypted) {
              setText(decrypted);
            }
          });
        }
      });
    } else {
      setText(reply.message || '');
    }

    return () => {
      isMounted = false;
    };
  }, [reply.message, reply.encryptionMetadata?.iv, reply.conversationId]);

  return <span>{text}</span>;
};

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  // Trash DB Retention State
  const [trashAccounts, setTrashAccounts] = useState([]);
  const [trashStats, setTrashStats] = useState(null);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashFilter, setTrashFilter] = useState('all'); // 'all' | 'admin_deleted' | 'self_deleted'
  const [trashSearch, setTrashSearch] = useState('');
  const [purgingTrashId, setPurgingTrashId] = useState(null);
  const [restoringTrashId, setRestoringTrashId] = useState(null);

  // Dynamic Theme & Typography State
  const { adminTheme, updateAdminDefaultTheme } = useTheme();
  const INITIAL_THEME_FORM = {
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
  };
  const [themeForm, setThemeForm] = useState(() => ({ ...INITIAL_THEME_FORM }));
  const [savedThemeForm, setSavedThemeForm] = useState(() => ({ ...INITIAL_THEME_FORM }));
  const [savingTheme, setSavingTheme] = useState(false);
  const [themeSuccessMsg, setThemeSuccessMsg] = useState('');
  const themeHasChanges = useMemo(() => JSON.stringify(themeForm) !== JSON.stringify(savedThemeForm), [themeForm, savedThemeForm]);

  useEffect(() => {
    if (adminTheme) {
      setThemeForm((prev) => ({
        ...prev,
        ...adminTheme
      }));
      setSavedThemeForm((prev) => ({
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

  // Loader Config state
  const DEFAULT_LOADER = {
    style: 'cyber', rainChars: '01', customChars: '',
    rainColor: '#10b981', rainGlowColor: '#059669', bgColor: '#050811',
    accentColor: '#10b981', panelTitle: 'PULSE|CHAT',
    panelSubtitle: '01 GREEN DATA MATRIX // QUANTUM ENCRYPTED',
    securityBadge: 'CYBER TUNNEL ACTIVE // SECURE HANDSHAKE OK',
    statusMessages: [
      'STREAMING 01 DATA CLOUD MATRIX...',
      'VERIFYING QUANTUM E2EE SESSION...',
      'DECRYPTING WORKSPACE ENVIRONMENT...',
      'SYNCHRONIZING CONVERSATIONS & CHATS...',
      'SYSTEM SYNCHRONIZED // DIVIDING GATE...',
    ],
    showBinaryTicker: true, showSecurityBadge: true,
    splitDuration: 800, minDuration: 2000,
  };
  const [loaderForm, setLoaderForm] = useState(DEFAULT_LOADER);
  const [savedLoaderForm, setSavedLoaderForm] = useState(DEFAULT_LOADER);
  const [loaderSaving, setLoaderSaving] = useState(false);
  const loaderHasChanges = useMemo(() => JSON.stringify(loaderForm) !== JSON.stringify(savedLoaderForm), [loaderForm, savedLoaderForm]);

  // Announcement Modal & Edit state
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);
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

  // Official Pulse Stories Admin State
  const [adminStories, setAdminStories] = useState([]);
  const [loadingAdminStories, setLoadingAdminStories] = useState(false);
  const [adminStoryReplies, setAdminStoryReplies] = useState([]);
  const [loadingStoryReplies, setLoadingStoryReplies] = useState(false);
  const [storySubTab, setStorySubTab] = useState('stories'); // 'stories' | 'replies'
  const [replySearchQuery, setReplySearchQuery] = useState('');
  const [createStoryModalOpen, setCreateStoryModalOpen] = useState(false);
  const [storyPublisherName, setStoryPublisherName] = useState('PulseChat');
  const [storyPublisherAvatar, setStoryPublisherAvatar] = useState('/icons/icon-192.png');
  const [storyType, setStoryType] = useState('text'); // 'text' | 'media'
  const [storyText, setStoryText] = useState('');
  const [storyMediaUrl, setStoryMediaUrl] = useState('');
  const [storyBgTheme, setStoryBgTheme] = useState('royal');
  const [storyBgStyle, setStoryBgStyle] = useState(PRESET_BACKGROUNDS[0].style);
  const [storyBgTab, setStoryBgTab] = useState('presets'); // 'presets' | 'gradient' | 'solid'
  const [storyCustomBg1, setStoryCustomBg1] = useState('#ec4899');
  const [storyCustomBg2, setStoryCustomBg2] = useState('#8b5cf6');
  const [storyCustomBgAngle, setStoryCustomBgAngle] = useState(135);
  const [storyCustomBgSolid, setStoryCustomBgSolid] = useState('#1e1b4b');
  const [storyTextColor, setStoryTextColor] = useState('#ffffff');
  const [storyTextGradient, setStoryTextGradient] = useState('');
  const [storyTextTab, setStoryTextTab] = useState('presets'); // 'presets' | 'gradients' | 'custom_color' | 'custom_gradient'
  const [storyCustomTextColor, setStoryCustomTextColor] = useState('#ffffff');
  const [storyCustomText1, setStoryCustomText1] = useState('#facc15');
  const [storyCustomText2, setStoryCustomText2] = useState('#f43f5e');
  const [storyCustomTextAngle, setStoryCustomTextAngle] = useState(135);
  const [storyFont, setStoryFont] = useState('sans');
  const [storyIsBold, setStoryIsBold] = useState(false);
  const [storyIsItalic, setStoryIsItalic] = useState(false);
  const [storyHasPoll, setStoryHasPoll] = useState(false);
  const [storyPollQuestion, setStoryPollQuestion] = useState('');
  const [storyPollOptions, setStoryPollOptions] = useState(['', '']);
  const [storyDurationHours, setStoryDurationHours] = useState(24);
  const [isPublishingStory, setIsPublishingStory] = useState(false);
  const [storyInspectModal, setStoryInspectModal] = useState(null);

  // Collaborative Story Editing State
  const [editStoryModalOpen, setEditStoryModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  const [editStoryAuthor, setEditStoryAuthor] = useState('');
  const [editStoryText, setEditStoryText] = useState('');
  const [editStoryMediaUrl, setEditStoryMediaUrl] = useState('');
  const [editStoryBg, setEditStoryBg] = useState('');
  const [editStoryBgTab, setEditStoryBgTab] = useState('presets'); // 'presets' | 'gradient' | 'solid'
  const [editStoryCustomBg1, setEditStoryCustomBg1] = useState('#ec4899');
  const [editStoryCustomBg2, setEditStoryCustomBg2] = useState('#8b5cf6');
  const [editStoryCustomBgAngle, setEditStoryCustomBgAngle] = useState(135);
  const [editStoryCustomBgSolid, setEditStoryCustomBgSolid] = useState('#1e1b4b');
  const [editStoryTextColor, setEditStoryTextColor] = useState('#ffffff');
  const [editStoryTextGradient, setEditStoryTextGradient] = useState('');
  const [editStoryTextTab, setEditStoryTextTab] = useState('presets'); // 'presets' | 'gradients' | 'custom_color' | 'custom_gradient'
  const [editStoryCustomTextColor, setEditStoryCustomTextColor] = useState('#ffffff');
  const [editStoryCustomText1, setEditStoryCustomText1] = useState('#facc15');
  const [editStoryCustomText2, setEditStoryCustomText2] = useState('#f43f5e');
  const [editStoryCustomTextAngle, setEditStoryCustomTextAngle] = useState(135);
  const [editStoryFont, setEditStoryFont] = useState('sans');
  const [editStoryIsBold, setEditStoryIsBold] = useState(false);
  const [editStoryIsItalic, setEditStoryIsItalic] = useState(false);
  const [savingEditStory, setSavingEditStory] = useState(false);

  // Official Story Reply Conversation Drawer/Modal State
  const [officialReplyModalOpen, setOfficialReplyModalOpen] = useState(false);
  const [activeReplyUser, setActiveReplyUser] = useState(null);
  const [activeReplyStory, setActiveReplyStory] = useState(null);
  const [activeReplyConvId, setActiveReplyConvId] = useState(null);
  const [officialConvMessages, setOfficialConvMessages] = useState([]);
  const [loadingOfficialConv, setLoadingOfficialConv] = useState(false);
  const [officialResponseText, setOfficialResponseText] = useState('');
  const [sendingOfficialResponse, setSendingOfficialResponse] = useState(false);

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

  const loadTrashAccounts = async () => {
    setTrashLoading(true);
    try {
      const res = await fetch('/api/admin/trash/accounts', {
        headers: authHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          setTrashAccounts(d.trashAccounts || []);
          setTrashStats(d.stats || null);
        }
      }
    } catch (e) {
      console.warn('Error loading trash accounts', e);
    } finally {
      setTrashLoading(false);
    }
  };

  const handleRestoreTrashAccount = async (acc) => {
    if (!window.confirm(`Restore account @${acc.username} back to active status?`)) return;
    setRestoringTrashId(acc._id);
    try {
      const res = await fetch(`/api/admin/trash/restore/${acc._id}`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include'
      });
      const d = await res.json();
      if (d.success) {
        showMsg(d.message);
        loadTrashAccounts();
        loadUsers();
        loadStats();
      } else {
        showMsg(d.message || 'Failed to restore account.');
      }
    } catch (e) {
      showMsg('Network error restoring account.');
    } finally {
      setRestoringTrashId(null);
    }
  };

  const handlePurgeTrashAccount = async (acc) => {
    if (!window.confirm(`Permanently and irreversibly wipe @${acc.username} from the database? This cannot be undone.`)) return;
    setPurgingTrashId(acc._id);
    try {
      const res = await fetch(`/api/admin/trash/purge/${acc._id}`, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include'
      });
      const d = await res.json();
      if (d.success) {
        showMsg(d.message);
        loadTrashAccounts();
        loadStats();
      } else {
        showMsg(d.message || 'Failed to purge account.');
      }
    } catch (e) {
      showMsg('Network error purging account.');
    } finally {
      setPurgingTrashId(null);
    }
  };

  const handlePurgeExpiredTrash = async () => {
    if (!window.confirm('Run automated purge on all accounts that have passed their 14-day retention window?')) return;
    try {
      const res = await fetch('/api/admin/trash/purge-expired', {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include'
      });
      const d = await res.json();
      if (d.success) {
        showMsg(d.message || 'Expired retention purge executed.');
        loadTrashAccounts();
        loadStats();
      } else {
        showMsg(d.message || 'Failed to run purge.');
      }
    } catch (e) {
      showMsg('Network error running purge.');
    }
  };

  const loadSystemSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', { headers: authHeaders(), credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          setSystemSettings(d.settings);
          if (d.settings?.loaderConfig) {
            setLoaderForm(prev => ({ ...prev, ...d.settings.loaderConfig }));
            setSavedLoaderForm(prev => ({ ...prev, ...d.settings.loaderConfig }));
          }
        }
      }
    } catch (e) {
      console.warn('Error loading system settings', e);
    }
  };

  const handleSaveLoaderConfig = async () => {
    setLoaderSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ loaderConfig: loaderForm })
      });
      const d = await res.json();
      if (d.success) {
        showMsg('Loader config saved! Reload the app to preview.');
        if (d.settings?.loaderConfig) {
          setLoaderForm(prev => ({ ...prev, ...d.settings.loaderConfig }));
          setSavedLoaderForm(prev => ({ ...prev, ...d.settings.loaderConfig }));
        } else {
          setSavedLoaderForm(loaderForm);
        }
      } else {
        showMsg('Failed to save loader config', 'error');
      }
    } catch {
      showMsg('Network error saving loader config', 'error');
    } finally {
      setLoaderSaving(false);
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

  const loadAdminStories = async () => {
    try {
      setLoadingAdminStories(true);
      const res = await fetch('/api/admin/stories', { headers: authHeaders(), credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        if (d.success && Array.isArray(d.stories)) setAdminStories(d.stories);
      }
    } catch (e) {
      console.warn('Error loading admin stories', e);
    } finally {
      setLoadingAdminStories(false);
    }
  };

  const loadAdminStoryReplies = async () => {
    try {
      setLoadingStoryReplies(true);
      const res = await fetch('/api/admin/stories/replies', { headers: authHeaders(), credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        if (d.success && Array.isArray(d.replies)) {
          const decryptedReplies = await Promise.all(
            d.replies.map(async (r) => {
              const convId = r.conversationId?.toString();
              const iv = r.encryptionMetadata?.iv;
              if (convId && iv && r.message) {
                try {
                  const convKey = await getConversationCryptoKey(convId);
                  if (convKey) {
                    const plain = await decryptMessage(r.message, iv, convKey);
                    return { ...r, message: plain };
                  }
                } catch (e) {}
              }
              return r;
            })
          );
          setAdminStoryReplies(decryptedReplies);
        }
      }
    } catch (e) {
      console.warn('Error loading story replies', e);
    } finally {
      setLoadingStoryReplies(false);
    }
  };

  // Full dashboard reload pass
  const loadDashboard = async () => {
    setRefreshing(true);
    await Promise.allSettled([
      loadStats(),
      loadDbStatus(),
      loadTrashAccounts(),
      loadSystemSettings(),
      loadUsers(),
      loadGroups(),
      loadAdminStories(),
      loadAdminStoryReplies(),
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

    const handleAdminStoryViewed = (payload) => {
      if (!payload?.statusId) return;
      setAdminStories((prevStories) =>
        prevStories.map((story) => {
          if (story._id?.toString() !== payload.statusId?.toString()) {
            return story;
          }
          const viewers = story.viewers || [];
          const viewerId = (payload.viewer?._id || payload.viewer?.user?._id || payload.viewer?.user || payload.viewer)?.toString();
          const exists = viewerId && viewers.some(
            (v) => ((v.user?._id || v.user)?._id || (v.user?._id || v.user))?.toString() === viewerId
          );
          const updatedViewers = exists
            ? viewers
            : payload.viewer
            ? [...viewers, { user: payload.viewer, viewedAt: payload.viewer.viewedAt || new Date() }]
            : viewers;

          return {
            ...story,
            viewers: updatedViewers,
            viewersCount: payload.totalViewers || updatedViewers.length
          };
        })
      );

      setStoryInspectModal((prev) => {
        if (!prev || prev._id?.toString() !== payload.statusId?.toString()) return prev;
        const viewers = prev.viewers || [];
        const viewerId = (payload.viewer?._id || payload.viewer?.user?._id || payload.viewer?.user || payload.viewer)?.toString();
        const exists = viewerId && viewers.some(
          (v) => ((v.user?._id || v.user)?._id || (v.user?._id || v.user))?.toString() === viewerId
        );
        const updatedViewers = exists
          ? viewers
          : payload.viewer
          ? [...viewers, { user: payload.viewer, viewedAt: payload.viewer.viewedAt || new Date() }]
          : viewers;
        return {
          ...prev,
          viewers: updatedViewers,
          viewersCount: payload.totalViewers || updatedViewers.length
        };
      });
    };

    const handleAdminStoryReaction = (payload) => {
      if (!payload?.statusId) return;
      setAdminStories((prevStories) =>
        prevStories.map((story) => {
          if (story._id?.toString() !== payload.statusId?.toString()) return story;
          return {
            ...story,
            reactions: payload.reactions || story.reactions,
            viewers: payload.viewers || story.viewers,
            viewersCount: payload.totalViewers ?? story.viewers?.length ?? 0
          };
        })
      );
      setStoryInspectModal((prev) => {
        if (!prev || prev._id?.toString() !== payload.statusId?.toString()) return prev;
        return {
          ...prev,
          reactions: payload.reactions || prev.reactions,
          viewers: payload.viewers || prev.viewers,
          viewersCount: payload.totalViewers ?? prev.viewers?.length ?? 0
        };
      });
    };

    const handleAdminStoryPoll = (payload) => {
      if (!payload?.statusId) return;
      setAdminStories((prevStories) =>
        prevStories.map((story) => {
          if (story._id?.toString() !== payload.statusId?.toString()) return story;
          return {
            ...story,
            poll: payload.poll || story.poll,
            viewers: payload.viewers || story.viewers,
            viewersCount: payload.totalViewers ?? story.viewers?.length ?? 0
          };
        })
      );
      setStoryInspectModal((prev) => {
        if (!prev || prev._id?.toString() !== payload.statusId?.toString()) return prev;
        return {
          ...prev,
          poll: payload.poll || prev.poll,
          viewers: payload.viewers || prev.viewers,
          viewersCount: payload.totalViewers ?? prev.viewers?.length ?? 0
        };
      });
    };

    const handleAdminStoryReply = async (payload) => {
      if (!payload?.statusId) return;
      let replyMessage = payload.message;
      const convId = payload.conversationId?.toString();
      const iv = payload.encryptionMetadata?.iv;
      if (convId && iv && replyMessage) {
        try {
          const convKey = await getConversationCryptoKey(convId);
          if (convKey) {
            replyMessage = await decryptMessage(replyMessage, iv, convKey);
          }
        } catch (e) {}
      }

      const replyId = (payload.replyId || payload._id || `${payload.conversationId || ''}_${payload.message}_${payload.sender?._id || ''}`)?.toString();
      const newReply = {
        _id: replyId,
        replyId,
        message: replyMessage,
        createdAt: payload.createdAt || new Date(),
        conversationId: payload.conversationId,
        user: payload.sender,
        story: payload.story
      };
      setAdminStoryReplies((prev) => {
        if (!prev) return [newReply];
        if (
          prev.some((r) => {
            const rId = (r.replyId || r._id)?.toString();
            if (rId && rId === replyId) return true;
            if (
              r.conversationId?.toString() === payload.conversationId?.toString() &&
              r.message === replyMessage &&
              Math.abs(new Date(r.createdAt) - new Date(payload.createdAt || new Date())) < 5000
            ) return true;
            return false;
          })
        ) {
          return prev;
        }
        return [newReply, ...prev];
      });

      // Also update replies in adminStories
      setAdminStories((prevStories) =>
        prevStories.map((story) => {
          if (story._id?.toString() !== payload.statusId?.toString()) return story;
          const replies = story.replies || [];
          if (
            replies.some((r) => {
              const rId = (r.replyId || r._id)?.toString();
              return rId && rId === replyId;
            })
          ) {
            return story;
          }
          return {
            ...story,
            replies: [...replies, newReply],
            repliesCount: (story.repliesCount || replies.length) + 1
          };
        })
      );
    };

    const handleAdminOfficialReply = async (payload) => {
      if (!payload?.message) return;
      let msg = payload.message;
      const convId = (payload.conversationId || msg.conversation?._id || msg.conversation || activeReplyConvId)?.toString();
      const iv = msg.encryptionMetadata?.iv;
      if (convId && iv && msg.content) {
        try {
          const convKey = await getConversationCryptoKey(convId);
          if (convKey) {
            const plain = await decryptMessage(msg.content, iv, convKey);
            msg = { ...msg, content: plain };
          }
        } catch (e) {}
      }
      const incomingId = (msg._id?.toString() || msg._id);
      setOfficialConvMessages((prev) => {
        if (!prev || prev.length === 0) return [msg];
        if (prev.some((m) => (m._id?.toString() || m._id) === incomingId)) return prev;
        return [...prev, msg];
      });
      loadAdminStoryReplies();
    };

    const handleAdminStoryCreated = (payload) => {
      const s = payload?.status;
      if (s?.isAdminStory) {
        setAdminStories((prev) => [s, ...prev.filter((item) => item._id !== s._id)]);
      }
    };

    const handleAdminStoryUpdated = (payload) => {
      const s = payload?.story || payload?.status;
      if (s?._id) {
        setAdminStories((prev) => prev.map((item) => (item._id === s._id ? { ...item, ...s } : item)));
      }
    };

    const handleAdminStoryDeleted = (payload) => {
      const sId = payload?.statusId;
      if (sId) {
        setAdminStories((prev) => prev.filter((item) => item._id !== sId));
      }
    };

    socket.on('admin:new_verification_request', handleNewCodeReq);
    socket.on('maintenance:updated', handleMaintenanceState);
    socket.on('system:features_updated', handleFeaturesState);
    socket.on('admin:settings_updated', handleSettingsState);
    socket.on('admin:stats_updated', handleStatsState);
    socket.on('admin:recoveries_updated', handleRecoveriesUpdate);
    socket.on('admin:announcements_updated', handleAnnouncementsUpdate);
    socket.on('admin:codes_updated', handleVerificationCodesUpdate);
    socket.on('status:viewed', handleAdminStoryViewed);
    socket.on('status:admin_story_viewed', handleAdminStoryViewed);
    socket.on('status:admin_story_reaction', handleAdminStoryReaction);
    socket.on('status:admin_story_poll', handleAdminStoryPoll);
    socket.on('status:admin_story_reply', handleAdminStoryReply);
    socket.on('status:reply', handleAdminStoryReply);
    socket.on('admin:official_reply_sent', handleAdminOfficialReply);
    socket.on('status:admin_story_created', handleAdminStoryCreated);
    socket.on('status:admin_story_updated', handleAdminStoryUpdated);
    socket.on('status:admin_story_deleted', handleAdminStoryDeleted);
    socket.on('status:deleted', handleAdminStoryDeleted);

    return () => {
      socket.off('admin:new_verification_request', handleNewCodeReq);
      socket.off('maintenance:updated', handleMaintenanceState);
      socket.off('system:features_updated', handleFeaturesState);
      socket.off('admin:settings_updated', handleSettingsState);
      socket.off('admin:stats_updated', handleStatsState);
      socket.off('admin:recoveries_updated', handleRecoveriesUpdate);
      socket.off('admin:announcements_updated', handleAnnouncementsUpdate);
      socket.off('admin:codes_updated', handleVerificationCodesUpdate);
      socket.off('status:viewed', handleAdminStoryViewed);
      socket.off('status:admin_story_viewed', handleAdminStoryViewed);
      socket.off('status:admin_story_reaction', handleAdminStoryReaction);
      socket.off('status:admin_story_poll', handleAdminStoryPoll);
      socket.off('status:admin_story_reply', handleAdminStoryReply);
      socket.off('status:reply', handleAdminStoryReply);
      socket.off('admin:official_reply_sent', handleAdminOfficialReply);
      socket.off('status:admin_story_created', handleAdminStoryCreated);
      socket.off('status:admin_story_updated', handleAdminStoryUpdated);
      socket.off('status:admin_story_deleted', handleAdminStoryDeleted);
      socket.off('status:deleted', handleAdminStoryDeleted);
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
    else if (activeTab === 'stories') {
      loadAdminStories();
      loadAdminStoryReplies();
    }
    else if (activeTab === 'announcements') loadAnnouncements();
    else if (activeTab === 'databases') {
      loadDbStatus();
      loadTrashAccounts();
      loadSystemSettings();
    }
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
        showMsg(d.message || `User @${deleteUserModal.user.username} deleted and moved to Trash DB.`);
        loadStats();
        loadTrashAccounts();
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
    if (isSavingAnnouncement) return; // Prevent double-share / multiple submissions on quick clicks

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

    setIsSavingAnnouncement(true);
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
    } finally {
      setIsSavingAnnouncement(false);
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

  // Actions: Official Pulse Stories
  const handleOpenCreateStory = () => {
    setStoryPublisherName('PulseChat');
    setStoryPublisherAvatar('/icons/icon-192.png');
    setStoryType('text');
    setStoryText('');
    setStoryMediaUrl('');
    setStoryBgTheme('royal');
    setStoryBgStyle(PRESET_BACKGROUNDS[0].style);
    setStoryBgTab('presets');
    setStoryTextColor('#ffffff');
    setStoryTextGradient('');
    setStoryTextTab('presets');
    setStoryFont('sans');
    setStoryIsBold(false);
    setStoryIsItalic(false);
    setStoryHasPoll(false);
    setStoryPollQuestion('');
    setStoryPollOptions(['', '']);
    setStoryDurationHours(24);
    setCreateStoryModalOpen(true);
  };

  const handlePublishAdminStory = async (e) => {
    e.preventDefault();
    if (isPublishingStory) return; // Prevent double-submit

    const cleanAuthor = (storyPublisherName || 'PulseChat').trim();
    const cleanText = storyText.trim();

    if (storyType === 'text' && !cleanText && !storyHasPoll) {
      showMsg('Story text or poll is required.');
      return;
    }

    if (storyType === 'media' && !storyMediaUrl.trim()) {
      showMsg('Media URL is required for media stories.');
      return;
    }

    if (storyHasPoll) {
      const validOptions = storyPollOptions.map((o) => o.trim()).filter(Boolean);
      if (validOptions.length < 2) {
        showMsg('A poll requires at least 2 valid options.');
        return;
      }
    }

    setIsPublishingStory(true);
    try {
      const payload = {
        officialAuthorName: cleanAuthor,
        officialAuthorAvatar: (storyPublisherAvatar && !storyPublisherAvatar.includes('1618005182384'))
          ? storyPublisherAvatar.trim()
          : '/icons/icon-192.png',
        type: storyType,
        text: cleanText,
        mediaUrl: storyMediaUrl.trim(),
        style: {
          background: storyType === 'media' && !storyBgStyle ? PRESET_BACKGROUNDS[0].style : storyBgStyle,
          font: storyFont,
          textColor: storyTextColor,
          textGradient: storyTextGradient,
          bold: storyIsBold,
          italic: storyIsItalic
        },
        hasPoll: storyHasPoll,
        poll: storyHasPoll
          ? {
              question: storyPollQuestion.trim() || cleanText || 'Official PulseChat Poll',
              options: storyPollOptions.map((o) => o.trim()).filter(Boolean)
            }
          : undefined,
        durationHours: Number(storyDurationHours) || 24
      };

      const res = await fetch('/api/admin/stories', {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const d = await res.json();
      if (d.success) {
        showMsg(d.message || `Story published as "${cleanAuthor}"!`);
        setCreateStoryModalOpen(false);
        loadAdminStories();
      } else {
        showMsg(d.message || 'Could not publish story.');
      }
    } catch (err) {
      showMsg('Failed to publish official story.');
    } finally {
      setIsPublishingStory(false);
    }
  };

  const handleDeleteAdminStory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this official story? It will immediately disappear for all users.')) return;
    try {
      const res = await fetch(`/api/admin/stories/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include'
      });
      const d = await res.json();
      if (d.success) {
        showMsg('Story deleted successfully.');
        loadAdminStories();
      } else {
        showMsg(d.message || 'Failed to delete story.');
      }
    } catch (e) {
      showMsg('Network error deleting story.');
    }
  };

  const handleToggleAdminStoryPoll = async (id) => {
    try {
      const res = await fetch(`/api/admin/stories/${id}/poll/close`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include'
      });
      const d = await res.json();
      if (d.success) {
        showMsg(d.message || 'Poll status updated.');
        loadAdminStories();
      } else {
        showMsg(d.message || 'Failed to toggle poll.');
      }
    } catch (e) {
      showMsg('Network error.');
    }
  };

  const handleOpenEditStory = (story) => {
    setEditingStory(story);
    setEditStoryAuthor(story.officialAuthorName || 'PulseChat');
    setEditStoryText(story.text || '');
    setEditStoryMediaUrl(story.mediaUrl || '');
    setEditStoryBg(story.style?.background || PRESET_BACKGROUNDS[0].style);
    setEditStoryBgTab('presets');
    setEditStoryTextColor(story.style?.textColor || '#ffffff');
    setEditStoryTextGradient(story.style?.textGradient || '');
    setEditStoryTextTab('presets');
    setEditStoryFont(story.style?.font || 'sans');
    setEditStoryIsBold(Boolean(story.style?.bold === true || story.style?.bold === 'true'));
    setEditStoryIsItalic(Boolean(story.style?.italic === true || story.style?.italic === 'true'));
    setEditStoryModalOpen(true);
  };

  const handleSaveEditStory = async (e) => {
    if (e) e.preventDefault();
    if (!editingStory?._id) return;
    setSavingEditStory(true);
    try {
      const res = await fetch(`/api/admin/stories/${editingStory._id}`, {
        method: 'PUT',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          officialAuthorName: editStoryAuthor.trim(),
          text: editStoryText.trim(),
          mediaUrl: editStoryMediaUrl.trim(),
          style: {
            ...(editingStory.style || {}),
            background: editStoryBg,
            textColor: editStoryTextColor,
            textGradient: editStoryTextGradient,
            font: editStoryFont,
            bold: editStoryIsBold,
            italic: editStoryIsItalic
          }
        })
      });
      const d = await res.json();
      if (d.success) {
        showMsg('Official story updated successfully.');
        setEditStoryModalOpen(false);
        setEditingStory(null);
        loadAdminStories();
      } else {
        showMsg(d.message || 'Failed to update story.');
      }
    } catch (err) {
      showMsg('Network error updating story.');
    } finally {
      setSavingEditStory(false);
    }
  };

  const openOfficialReplyConversation = async (replyUser, story, conversationId) => {
    if (!replyUser?._id) return;
    setActiveReplyUser(replyUser);
    setActiveReplyStory(story);
    setActiveReplyConvId(conversationId || null);
    setOfficialResponseText('');
    setOfficialReplyModalOpen(true);
    setLoadingOfficialConv(true);
    try {
      const res = await fetch(`/api/admin/stories/replies/conversation/${replyUser._id}`, {
        headers: authHeaders(),
        credentials: 'include'
      });
      const d = await res.json();
      if (d.success) {
        const rawMessages = d.messages || [];
        const convId = (d.conversation?._id || conversationId)?.toString();
        if (d.conversation?._id) {
          setActiveReplyConvId(d.conversation._id);
        }
        if (convId) {
          const convKey = await getConversationCryptoKey(convId);
          if (convKey) {
            const decryptedMessages = await Promise.all(
              rawMessages.map(async (m) => {
                const iv = m.encryptionMetadata?.iv;
                if (iv && m.content) {
                  try {
                    const plain = await decryptMessage(m.content, iv, convKey);
                    return { ...m, content: plain };
                  } catch (e) {
                    return m;
                  }
                }
                return m;
              })
            );
            setOfficialConvMessages(decryptedMessages);
          } else {
            setOfficialConvMessages(rawMessages);
          }
        } else {
          setOfficialConvMessages(rawMessages);
        }
      }
    } catch (err) {
      console.error('Error loading official conversation:', err);
    } finally {
      setLoadingOfficialConv(false);
    }
  };

  const handleSendOfficialResponse = async (e) => {
    if (e) e.preventDefault();
    if (!officialResponseText.trim() || !activeReplyUser?._id || sendingOfficialResponse) return;
    setSendingOfficialResponse(true);
    const msgToSend = officialResponseText.trim();
    try {
      const res = await fetch('/api/admin/stories/replies/send', {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          userId: activeReplyUser._id,
          conversationId: activeReplyConvId,
          message: msgToSend
        })
      });
      const d = await res.json();
      if (d.success) {
        setOfficialResponseText('');
        if (d.reply) {
          const replyId = (d.reply._id?.toString() || d.reply._id);
          setOfficialConvMessages((prev) => {
            if (!prev) return [d.reply];
            if (prev.some((m) => (m._id?.toString() || m._id) === replyId)) return prev;
            return [...prev, d.reply];
          });
        }
        showMsg('Official reply delivered to user chat.');
        loadAdminStoryReplies();
      } else {
        showMsg(d.message || 'Failed to send official response.');
      }
    } catch (err) {
      showMsg('Network error sending response.');
    } finally {
      setSendingOfficialResponse(false);
    }
  };

  const handleDeleteAdminConversation = async (convId) => {
    if (!window.confirm('Delete this conversation history completely? This will remove all messages in this thread.')) return;
    try {
      const res = await fetch(`/api/admin/stories/replies/conversation/${convId}`, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include'
      });
      const d = await res.json();
      if (d.success) {
        showMsg('Conversation deleted successfully.');
        setOfficialReplyModalOpen(false);
        loadAdminStoryReplies();
      } else {
        showMsg(d.message || 'Failed to delete conversation.');
      }
    } catch (err) {
      showMsg('Network error.');
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
        setSavedThemeForm({ ...themeForm });
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
      setSavedThemeForm(factory);
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
        { id: 'stories', label: 'Create Story', icon: CircleDashed },
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
      <div className="h-screen bg-[#161226] text-white flex flex-col font-sans selection:bg-purple-500 selection:text-white overflow-hidden">
      {/* Top Navigation Bar — Craveat Dark Theme */}
      <header className="h-14 sm:h-16 bg-[#1E1833] border-b border-violet-900/30 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          {/* Back arrow — icon only on mobile */}
          <button
            onClick={() => navigate('/chat')}
            className="p-1.5 sm:p-2 text-violet-300/80 hover:text-white hover:bg-violet-900/30 rounded-xl transition cursor-pointer shrink-0"
            title="Back to Chat"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Shield icon — hidden on smallest screens */}
          <div className="hidden xs:flex w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 items-center justify-center text-white shadow-[0_0_12px_rgba(168,85,247,0.4)] shrink-0">
            <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>

          {/* Active tab label */}
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-sm sm:text-base font-bold tracking-tight text-white capitalize truncate max-w-[130px] sm:max-w-xs">
                {navItems.find((n) => n.id === activeTab)?.label || 'Dashboard'}
              </span>
              <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-mono bg-fuchsia-500/15 text-fuchsia-300 font-semibold border border-fuchsia-500/30 leading-none">
                ADMIN
              </span>
            </div>
          </div>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center space-x-2.5 shrink-0">
          {/* Live Refresh Button */}
          <button
            onClick={loadDashboard}
            disabled={refreshing}
            className="p-2 sm:px-3 sm:py-1.5 bg-[#231C38] hover:bg-violet-900/40 border border-violet-900/40 text-violet-200 hover:text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-violet-400 ${refreshing ? 'animate-spin text-pink-400' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          {feedback && (
            <div className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Quick Exit to Messenger */}
          <button
            onClick={() => navigate('/chat')}
            className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/30 text-violet-200 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            title="Open Messenger"
          >
            <MessageSquare className="w-3.5 h-3.5 text-violet-400" />
            <span>Open Chat</span>
          </button>

          {/* Mobile Hamburger Drawer Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 text-violet-200 bg-[#231C38] border border-violet-900/40 rounded-xl hover:bg-violet-900/40 transition cursor-pointer relative"
            aria-label="Open Admin Menu"
          >
            <Menu className="w-5 h-5" />
            {(verificationCodes.some((c) => c.status === 'pending') || recoveries.some((r) => r.status === 'pending')) && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-pink-500 rounded-full ring-2 ring-[#1E1833] animate-pulse" />
            )}
          </button>

          {/* Admin Avatar Pill */}
          <div className="hidden md:flex items-center space-x-2.5 pl-2.5 border-l border-violet-900/30 shrink-0">
            <Avatar
              src={user?.avatar}
              name={user?.username}
              size="sm"
              ringClass="ring-1 ring-violet-500/60"
            />
            <div className="text-left text-xs shrink-0">
              <div className="font-semibold text-white truncate max-w-[110px] leading-tight">{user?.username}</div>
              <div className="text-[10px] text-violet-400/80 uppercase font-mono font-medium leading-tight">Super Admin</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar Nav — Craveat Modern Plum Left Column */}
        <aside className="w-64 bg-[#1E1833] border-r border-violet-900/30 hidden md:flex flex-col h-full shrink-0 select-none">
          {/* Craveat Brand Banner */}
          <div className="px-5 py-4 flex items-center space-x-2.5 border-b border-violet-900/30 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center text-white shadow-md shadow-violet-900/50 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-white tracking-wider flex items-center space-x-1 font-mono">
                <span>PULSE</span><span className="text-violet-400">CHAT</span>
              </div>
              <p className="text-[10px] text-violet-300/50 font-mono">Administration Hub</p>
            </div>
          </div>

          {/* Categorized Nav Sections - Smooth Full-Height Scroll */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin scrollbar-thumb-violet-900/50 hover:scrollbar-thumb-violet-700/60 min-h-0">
            {navSections.map((section) => (
              <div key={section.label}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400/60 px-3 mb-1.5 font-mono">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id || (item.id === 'groups' && activeTab === 'chats');
                    const pendingBadge =
                      item.id === 'codes'
                        ? verificationCodes.filter((c) => c.status === 'pending').length
                        : item.id === 'recoveries'
                        ? recoveries.filter((r) => r.status === 'pending' || r.status === 'partial').length
                        : item.id === 'groups' && allChats.length > 0
                        ? allChats.length
                        : 0;

                    const isAlertBadge = item.id === 'codes' || item.id === 'recoveries';

                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-r from-violet-600/30 to-purple-600/20 text-white border-l-4 border-violet-500 shadow-sm ring-1 ring-violet-500/20'
                            : 'text-violet-200/70 hover:text-white hover:bg-violet-900/25'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-violet-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'text-violet-400/70'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {pendingBadge > 0 && (
                          <span
                            className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono shrink-0 ${
                              isAlertBadge
                                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30 shadow-[0_0_8px_rgba(236,72,153,0.3)]'
                                : 'bg-violet-900/50 text-violet-200 border border-violet-700/30'
                            }`}
                          >
                            {pendingBadge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Info Card: Database Health & Back to Messenger */}
          <div className="p-3 border-t border-violet-900/30 bg-[#1A142C] space-y-2 shrink-0">
            <div className="p-2.5 bg-[#241E3A] rounded-xl border border-violet-900/40 text-xs space-y-1 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-violet-400/80 uppercase font-mono tracking-wider">Cluster State</span>
                <span className="flex items-center space-x-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34D399]" />
                  <span className="text-[10px] text-emerald-400 font-bold font-mono">ONLINE</span>
                </span>
              </div>
              <div className="font-mono text-[11px] text-violet-200 truncate">
                {dbStatus?.name || 'pulsechat'} ({dbStatus?.latencyMs || 2}ms)
              </div>
            </div>

            <button
              onClick={() => navigate('/chat')}
              className="w-full flex items-center justify-center space-x-2 py-2 text-xs font-semibold text-violet-300 hover:text-white hover:bg-violet-900/30 rounded-xl transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Messenger</span>
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto pb-28 md:pb-8 bg-[#161226] min-h-0">
          {/* Mobile Tab Scroller */}
          <div className="md:hidden flex items-center space-x-2 overflow-x-auto pb-2.5 mb-3 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || (item.id === 'groups' && activeTab === 'chats');
              const pendingBadge =
                item.id === 'codes'
                  ? verificationCodes.filter((c) => c.status === 'pending').length
                  : item.id === 'recoveries'
                  ? recoveries.filter((r) => r.status === 'pending' || r.status === 'partial').length
                  : item.id === 'groups' && allChats.length > 0
                  ? allChats.length
                  : 0;

              const isAlertBadge = item.id === 'codes' || item.id === 'recoveries';

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center space-x-1.5 transition shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md'
                      : 'bg-[#1E1833] text-violet-300/70 border border-violet-900/30'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                  {pendingBadge > 0 && (
                    <span
                      className={`ml-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full font-mono ${
                        isAlertBadge
                          ? 'bg-pink-500 text-white'
                          : isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-violet-900 text-violet-300'
                      }`}
                    >
                      {pendingBadge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* TAB 1: OVERVIEW — CRAVEAT SIGNATURE DASHBOARD */}
          {activeTab === 'overview' && (
            <div className="space-y-6 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-violet-400" />
                    <span>Dashboard Overview</span>
                  </h2>
                  <p className="text-xs text-violet-300/70 mt-0.5">
                    Live operational metrics, throughput trends, and real-time platform telemetry
                  </p>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={loadDashboard}
                    disabled={refreshing}
                    className="px-3 py-1.5 bg-[#231C38] hover:bg-violet-900/40 border border-violet-900/40 text-violet-200 hover:text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
                    title="Refresh all metrics"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-violet-400 ${refreshing ? 'animate-spin text-pink-400' : ''}`} />
                    <span>{refreshing ? 'Syncing...' : 'Live Refresh'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setAnnouncementModalOpen(true);
                      setModalTab('content');
                    }}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-lg shadow-violet-600/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Broadcast</span>
                  </button>
                </div>
              </div>

              {/* ── CRAVEAT TOP ROW: 5 KPI STAT CARDS ─────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* 1. Total Users */}
                <div
                  onClick={() => setActiveTab('users')}
                  className="p-4 sm:p-5 bg-[#231C38] border border-violet-900/30 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.35)] hover:border-violet-500/50 transition flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono leading-tight tracking-tight">
                      {stats?.totalUsers !== undefined ? stats.totalUsers : (users.length || 0)}
                    </div>
                    <div className="text-[11px] font-semibold text-violet-300/70 uppercase tracking-wider mt-1">
                      Total Users
                    </div>
                    <div className="text-[10px] text-emerald-400 font-medium mt-1 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{stats?.activeToday || 1} active today</span>
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 text-violet-300 flex items-center justify-center group-hover:scale-110 transition shadow-inner shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                {/* 2. Active Channels */}
                <div
                  onClick={() => setActiveTab('groups')}
                  className="p-4 sm:p-5 bg-[#231C38] border border-violet-900/30 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.35)] hover:border-violet-500/50 transition flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono leading-tight tracking-tight">
                      {allChats.length || stats?.totalGroups || 0}
                    </div>
                    <div className="text-[11px] font-semibold text-violet-300/70 uppercase tracking-wider mt-1">
                      Total Channels
                    </div>
                    <div className="text-[10px] text-fuchsia-400 font-medium mt-1">
                      {groups.length} communities
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-fuchsia-500/20 to-pink-500/20 border border-fuchsia-500/30 text-fuchsia-300 flex items-center justify-center group-hover:scale-110 transition shadow-inner shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                </div>

                {/* 3. Messages Sent */}
                <div
                  onClick={() => setActiveTab('groups')}
                  className="p-4 sm:p-5 bg-[#231C38] border border-violet-900/30 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.35)] hover:border-violet-500/50 transition flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono leading-tight tracking-tight">
                      {stats?.totalMessages ? (stats.totalMessages > 1000 ? `${(stats.totalMessages / 1000).toFixed(1)}k` : stats.totalMessages) : '1.2k'}
                    </div>
                    <div className="text-[11px] font-semibold text-violet-300/70 uppercase tracking-wider mt-1">
                      Total Messages
                    </div>
                    <div className="text-[10px] text-cyan-400 font-medium mt-1">
                      All-time traffic
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-sky-500/20 border border-cyan-500/30 text-cyan-300 flex items-center justify-center group-hover:scale-110 transition shadow-inner shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>

                {/* 4. Verification Codes */}
                <div
                  onClick={() => setActiveTab('codes')}
                  className="p-4 sm:p-5 bg-[#231C38] border border-violet-900/30 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.35)] hover:border-violet-500/50 transition flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono leading-tight tracking-tight">
                      {verificationCodes.filter((c) => c.status === 'pending').length}
                    </div>
                    <div className="text-[11px] font-semibold text-violet-300/70 uppercase tracking-wider mt-1">
                      Pending Codes
                    </div>
                    <div className="text-[10px] text-amber-400 font-medium mt-1">
                      Awaiting dispatch
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center group-hover:scale-110 transition shadow-inner shrink-0">
                    <KeyRound className="w-5 h-5" />
                  </div>
                </div>

                {/* 5. Announcements / Retention Trash */}
                <div
                  onClick={() => setActiveTab('announcements')}
                  className="p-4 sm:p-5 bg-[#231C38] border border-violet-900/30 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.35)] hover:border-violet-500/50 transition flex items-center justify-between group cursor-pointer col-span-2 sm:col-span-1"
                >
                  <div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono leading-tight tracking-tight">
                      {announcements.length}
                    </div>
                    <div className="text-[11px] font-semibold text-violet-300/70 uppercase tracking-wider mt-1">
                      Broadcasts
                    </div>
                    <div className="text-[10px] text-pink-400 font-medium mt-1">
                      Active community polls
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-rose-500/20 border border-pink-500/30 text-pink-300 flex items-center justify-center group-hover:scale-110 transition shadow-inner shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Visual Analytics Charts (Craveat 3-circle gauge, Donut, Ranked items, Double Bar, Area Wave) */}
              <AdminAnalyticsCharts
                stats={stats}
                allChats={allChats}
                users={users}
                setActiveTab={setActiveTab}
                authHeaders={authHeaders}
              />

              {/* Quick Navigation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div
                  onClick={() => setActiveTab('users')}
                  className="p-5 bg-[#231C38] border border-violet-900/30 rounded-2xl sm:rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:border-violet-500/50 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-300 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-violet-400 group-hover:translate-x-1 transition" />
                  </div>
                  <h3 className="font-bold text-sm text-white mt-4">User Management</h3>
                  <p className="text-xs text-violet-300/70 mt-1">
                    Inspect accounts, manage roles, and review account security.
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('groups')}
                  className="p-5 bg-[#231C38] border border-violet-900/30 rounded-2xl sm:rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:border-fuchsia-500/50 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 text-fuchsia-300 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-fuchsia-400 group-hover:translate-x-1 transition" />
                  </div>
                  <h3 className="font-bold text-sm text-white mt-4">Chats & Messaging</h3>
                  <p className="text-xs text-violet-300/70 mt-1">
                    Inspect conversation threads, search channels, and moderate messages.
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('storage')}
                  className="p-5 bg-[#231C38] border border-violet-900/30 rounded-2xl sm:rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:border-cyan-500/50 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                      <Database className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition" />
                  </div>
                  <h3 className="font-bold text-sm text-white mt-4">Storage Management</h3>
                  <p className="text-xs text-violet-300/70 mt-1">
                    Monitor MongoDB collection storage, purge logs, and optimize database quota.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CODE DISPATCH (MANUAL VERIFICATION) */}
          {activeTab === 'codes' && (
            <div className="w-full space-y-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                    <KeyRound className="w-5 h-5 text-violet-400" />
                    <span>Manual Code Dispatch</span>
                  </h2>
                  <p className="text-xs text-violet-300/70 mt-0.5">
                    Live verification codes for registration and password resets. Review and dispatch directly to users in real-time.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setIsGenerateCodeModalOpen(true)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl transition cursor-pointer font-semibold shadow-md shadow-violet-950/50"
                    title="Generate and assign a verification code"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Generate Code</span>
                  </button>

                  <button
                    onClick={loadVerificationCodes}
                    disabled={verificationCodesLoading}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-[#19142B] hover:bg-violet-900/40 text-violet-200 border border-violet-900/40 rounded-xl transition cursor-pointer font-medium"
                    title="Refresh codes"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${verificationCodesLoading ? 'animate-spin text-violet-400' : ''}`} />
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
                      className="flex items-center space-x-1.5 px-3 py-1.5 text-xs border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer font-medium"
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
                    <div className="p-3.5 bg-[#231C38] border border-violet-900/30 rounded-2xl shadow-lg shadow-black/20 space-y-3">
                      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-[200px]">
                          <Search className="w-4 h-4 text-violet-400/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={codeSearch}
                            onChange={(e) => setCodeSearch(e.target.value)}
                            placeholder="Search by code, email or username..."
                            className="w-full text-xs bg-[#19142B] border border-violet-900/40 rounded-xl pl-9 pr-3 py-2 text-white placeholder-violet-300/40 focus:outline-hidden focus:ring-2 focus:ring-violet-500/50"
                          />
                        </div>

                        {/* Filters row */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Action Filter */}
                          <select
                            value={codeFilterAction}
                            onChange={(e) => setCodeFilterAction(e.target.value)}
                            className="text-xs bg-[#19142B] border border-violet-900/40 rounded-xl px-3 py-2 text-violet-200 focus:outline-hidden cursor-pointer font-medium"
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
                            className="text-xs bg-[#19142B] border border-violet-900/40 rounded-xl px-3 py-2 text-violet-200 focus:outline-hidden cursor-pointer font-medium"
                          >
                            <option value="all">Status: All</option>
                            <option value="pending">⏳ Pending Dispatch</option>
                            <option value="sent">🚀 Sent to User</option>
                            <option value="used">✅ Verified / Used</option>
                            <option value="expired">⌛ Expired</option>
                          </select>

                          {/* Date Range Filter */}
                          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                            <Calendar className="w-3.5 h-3.5 text-violet-400/60 shrink-0" />
                            <input
                              type="date"
                              value={codeDateFrom}
                              onChange={(e) => setCodeDateFrom(e.target.value)}
                              title="From date"
                              className="text-xs bg-[#19142B] border border-violet-900/40 rounded-xl px-2 py-1.5 text-violet-200 focus:outline-hidden cursor-pointer font-medium max-w-[135px] sm:max-w-none"
                            />
                            <span className="text-violet-400/60 text-xs">–</span>
                            <input
                              type="date"
                              value={codeDateTo}
                              min={codeDateFrom || undefined}
                              onChange={(e) => setCodeDateTo(e.target.value)}
                              title="To date"
                              className="text-xs bg-[#19142B] border border-violet-900/40 rounded-xl px-2 py-1.5 text-violet-200 focus:outline-hidden cursor-pointer font-medium max-w-[135px] sm:max-w-none"
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
                              className="text-xs px-2.5 py-1.5 text-violet-400 hover:text-rose-400 font-medium transition cursor-pointer flex items-center space-x-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reset</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Select all bar */}
                      {filteredCodes.length > 0 && (
                        <div className="pt-2 border-t border-violet-900/30 flex items-center justify-between text-xs text-violet-300/70">
                          <button
                            type="button"
                            onClick={handleToggleSelectAllFiltered}
                            className="flex items-center space-x-2 font-semibold hover:text-white transition cursor-pointer"
                          >
                            {allFilteredSelected ? (
                              <CheckSquare className="w-4 h-4 text-violet-400" />
                            ) : (
                              <Square className="w-4 h-4 text-violet-400/60" />
                            )}
                            <span>
                              {allFilteredSelected
                                ? 'Deselect All'
                                : `Select All Filtered (${selectedCodes.size}/${filteredCodes.length})`}
                            </span>
                          </button>

                          <span className="font-mono text-[11px] text-violet-300/60">
                            Showing {filteredCodes.length} of {verificationCodes.length} record(s)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Cards List / Grid */}
                    {verificationCodesLoading ? (
                      <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-[#231C38] border border-violet-900/30 rounded-2xl">
                        <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
                        <p className="text-xs text-violet-300/70 font-mono">Loading verification codes...</p>
                      </div>
                    ) : filteredCodes.length === 0 ? (
                      <div className="py-16 px-4 flex flex-col items-center justify-center text-center space-y-3 bg-[#231C38] border border-violet-900/30 rounded-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                          <KeyRound className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white">No Verification Codes Found</h3>
                          <p className="text-xs text-violet-300/70 mt-1 max-w-sm">
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
                            className="mt-2 text-xs font-semibold px-3 py-1.5 bg-violet-600/20 text-violet-300 border border-violet-500/30 rounded-xl hover:bg-violet-600/30 transition cursor-pointer"
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
                              ? 'bg-violet-600/20 text-violet-300 border-violet-500/30'
                              : c.action === 'password_reset'
                              ? 'bg-amber-600/20 text-amber-300 border-amber-500/30'
                              : 'bg-rose-600/20 text-rose-300 border-rose-500/30';

                          return (
                            <div
                              key={c._id}
                              className={`p-4 bg-[#231C38] border rounded-2xl shadow-lg transition flex flex-col justify-between min-w-0 overflow-hidden ${
                                isSelected
                                  ? 'border-violet-500 ring-2 ring-violet-500/30'
                                  : isPending
                                  ? 'border-amber-500/50 hover:border-amber-400'
                                  : 'border-violet-900/30 hover:border-violet-500/40'
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
                                      className="text-violet-400/60 hover:text-white transition cursor-pointer shrink-0"
                                      title="Select this code"
                                    >
                                      {isSelected ? (
                                        <CheckSquare className="w-4 h-4 text-violet-400" />
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
                                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
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
                                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                                        <span>⌛ Expired</span>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* User details */}
                                <div className="flex items-center space-x-3 min-w-0 overflow-hidden pt-1">
                                  <Avatar src={c.user?.avatar} name={c.username || c.email} size="md" />
                                  <div className="min-w-0 flex-1 overflow-hidden">
                                    <div className="font-bold text-xs text-white truncate" title={c.username ? `@${c.username}` : c.email}>
                                      {c.username ? `@${c.username}` : 'Guest User'}
                                    </div>
                                    <div className="text-[11px] text-violet-300/70 truncate max-w-full" title={c.email}>
                                      {c.email}
                                    </div>
                                  </div>
                                </div>

                                {/* Monospace Code Box */}
                                <div className="bg-[#161226] border border-violet-900/50 rounded-xl p-3 flex items-center justify-between shadow-inner">
                                  <div className="min-w-0">
                                    <span className="text-[9px] uppercase tracking-wider font-bold text-violet-300/60 block font-mono">
                                      One-Time Passcode (OTP)
                                    </span>
                                    <span className="text-2xl font-mono font-black tracking-widest text-violet-300 select-all">
                                      {c.code}
                                    </span>
                                  </div>

                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(c.code);
                                      showMsg(`Copied code ${c.code} to clipboard!`);
                                    }}
                                    className="p-2 rounded-lg bg-[#231C38] hover:bg-violet-900/40 text-violet-300 hover:text-white border border-violet-900/40 transition cursor-pointer shrink-0"
                                    title="Copy 6-digit code"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                </div>

                                {/* Timestamps info */}
                                <div className="text-[10px] text-violet-300/60 font-mono space-y-0.5 pt-0.5">
                                  <div className="flex justify-between">
                                    <span>Requested:</span>
                                    <span className="text-violet-200">{new Date(c.createdAt).toLocaleTimeString()}</span>
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
                              <div className="pt-3 mt-3 border-t border-violet-900/30 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleRegenerateCode(c)}
                                    className="py-1.5 px-2.5 rounded-xl text-[11px] font-semibold bg-[#19142B] hover:bg-violet-900/40 text-violet-200 border border-violet-900/40 transition flex items-center justify-center space-x-1 cursor-pointer"
                                    title="Generate new 6-digit code for this user"
                                  >
                                    <RefreshCw className="w-3 h-3 text-violet-400" />
                                    <span>Regenerate</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleRevokeCode(c)}
                                    disabled={c.status === 'expired' || c.status === 'used'}
                                    className="py-1.5 px-2.5 rounded-xl text-[11px] font-semibold bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-800/40 disabled:opacity-40 transition flex items-center justify-center space-x-1 cursor-pointer"
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
                                      ? 'bg-[#19142B] text-violet-400/40 border border-violet-900/30 cursor-not-allowed opacity-60'
                                      : isPending
                                      ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-violet-950/50'
                                      : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/50'
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
            <div className="w-full">
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
                    className={`p-4 bg-[#231C38] border border-violet-900/30 hover:border-violet-700/50 rounded-2xl shadow-xs min-w-0 overflow-hidden transition-all ${
                      mode === 'grid' ? 'flex flex-col justify-between h-full space-y-3' : 'flex flex-col sm:flex-row sm:items-center justify-between gap-3'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 overflow-hidden">
                      <Avatar src={u.avatar} name={u.username} size="md" />
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="font-bold text-xs text-white truncate" title={u.username}>
                            @{u.username}
                          </span>
                          <span
                            className={`shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase ${
                              u.role === 'admin'
                                ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                                : 'bg-[#19142B] text-violet-300/70 border border-violet-900/30'
                            }`}
                          >
                            {u.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-violet-300/60 truncate max-w-full font-mono mt-0.5" title={u.email}>
                          {u.email}
                        </div>
                        {u.isBanned && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] bg-rose-950/60 text-rose-300 border border-rose-800/40 font-semibold truncate max-w-full" title={u.banReason || 'Policy violation'}>
                            Banned: {u.banReason || 'Policy violation'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-violet-900/20">
                      {u._id !== user?._id && (
                        <button
                          onClick={() => handleStartDirectChat(u._id)}
                          className="px-2.5 py-1.5 text-[11px] font-semibold bg-[#19142B] hover:bg-[#1E1833] text-emerald-400 border border-emerald-900/40 rounded-xl transition cursor-pointer flex items-center space-x-1 shrink-0"
                          title="Open direct chat with this user"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Chat</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEditUser(u)}
                        className="px-2.5 py-1.5 text-[11px] font-semibold bg-[#19142B] hover:bg-[#1E1833] text-violet-300 border border-violet-900/40 rounded-xl transition cursor-pointer flex items-center space-x-1 shrink-0"
                        title="Edit user profile"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleRoleToggle(u)}
                        className="px-2.5 py-1.5 text-[11px] font-semibold bg-[#19142B] hover:bg-[#1E1833] text-violet-200 border border-violet-900/30 rounded-xl transition cursor-pointer shrink-0"
                        title="Toggle admin / user role"
                      >
                        {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                      </button>

                      <button
                        onClick={() => handleBanToggle(u)}
                        className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-xl transition cursor-pointer shrink-0 border ${
                          u.isBanned
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40 hover:bg-emerald-900/40'
                            : 'bg-rose-950/40 text-rose-400 border-rose-900/40 hover:bg-rose-900/40'
                        }`}
                        title={u.isBanned ? 'Lift ban' : 'Ban account'}
                      >
                        {u.isBanned ? 'Unban' : 'Ban'}
                      </button>

                      {u.role !== 'admin' && (
                        <button
                          onClick={() => { setDeleteUserModal({ user: u }); setDeleteReason(''); }}
                          className="px-2.5 py-1.5 text-[11px] font-semibold bg-rose-950/50 text-rose-400 hover:bg-rose-900/70 border border-rose-900/50 rounded-xl transition cursor-pointer shrink-0"
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

          {/* TAB 3: CHATS & MESSAGING */}
          {(activeTab === 'groups' || activeTab === 'chats') && (
            <ChatsManagementTab
              allChats={allChats}
              loading={loading}
              loadAllChats={loadGroups}
              authHeaders={authHeaders}
              navigate={navigate}
              showFeedback={showMsg}
            />
          )}

          {/* TAB: PULSE STORIES STUDIO */}
          {activeTab === 'stories' && (
            <div className="w-full space-y-6">
              {/* Studio Header Card */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[#1C1530] border border-violet-900/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-600 to-fuchsia-600 flex items-center justify-center text-white shadow-lg shadow-violet-950/60 shrink-0">
                      <CircleDashed className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
                        <span>Pulse Stories Studio</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase tracking-wider">
                          Official Stories
                        </span>
                      </h2>
                      <p className="text-xs text-violet-300/70">
                        Broadcast 24-hour visual stories to all PulseChat members. Stories pin at the top of the Stories feed for all users.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 shrink-0">
                  <button
                    onClick={loadAdminStories}
                    disabled={loadingAdminStories}
                    className="p-2.5 bg-[#231C38] hover:bg-[#2A2242] text-violet-300 hover:text-white rounded-2xl border border-violet-900/30 transition cursor-pointer"
                    title="Refresh Stories"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingAdminStories ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={handleOpenCreateStory}
                    className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold rounded-2xl text-xs flex items-center space-x-2 transition cursor-pointer shadow-lg shadow-violet-950/60 active:scale-95"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Create Story</span>
                  </button>
                </div>
              </div>

              {/* Subtab Switcher: Stories Studio vs Story Replies */}
              <div className="flex items-center space-x-2 border-b border-violet-900/30 pb-2">
                <button
                  type="button"
                  onClick={() => setStorySubTab('stories')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                    storySubTab === 'stories'
                      ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-950/60'
                      : 'text-violet-300/70 hover:text-white hover:bg-violet-900/20'
                  }`}
                >
                  <CircleDashed className="w-3.5 h-3.5" />
                  <span>Official Stories ({adminStories.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStorySubTab('replies');
                    loadAdminStoryReplies();
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                    storySubTab === 'replies'
                      ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-950/60'
                      : 'text-violet-300/70 hover:text-white hover:bg-violet-900/20'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Story Replies</span>
                  {adminStoryReplies.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500/20 text-sky-300 border border-sky-400/30 font-mono font-bold">
                      {adminStoryReplies.length}
                    </span>
                  )}
                </button>
              </div>

              {storySubTab === 'stories' && (
                <>
              {/* KPI Metrics Summary */}
              {(() => {
                const now = new Date();
                const activeStories = adminStories.filter((s) => new Date(s.expiresAt) > now);
                const totalViews = adminStories.reduce((acc, s) => acc + (s.viewers?.length || 0), 0);
                const totalReactions = adminStories.reduce((acc, s) => acc + (s.reactions?.length || 0), 0);
                const totalPollVotes = adminStories.reduce((acc, s) => {
                  if (!s.poll?.options) return acc;
                  return acc + s.poll.options.reduce((pAcc, opt) => pAcc + (opt.votes?.length || 0), 0);
                }, 0);

                return (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="p-4 rounded-2xl bg-[#1C1530] border border-violet-900/30 shadow-md">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-violet-400">Active Stories</div>
                      <div className="text-2xl font-extrabold text-white font-mono mt-1">{activeStories.length}</div>
                      <div className="text-[10px] text-violet-300/60 mt-0.5">{adminStories.length} total published</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#1C1530] border border-violet-900/30 shadow-md">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-violet-400">Total Views</div>
                      <div className="text-2xl font-extrabold text-white font-mono mt-1">{totalViews}</div>
                      <div className="text-[10px] text-emerald-400 mt-0.5">Across all official stories</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#1C1530] border border-violet-900/30 shadow-md">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-violet-400">Emoji Reactions</div>
                      <div className="text-2xl font-extrabold text-white font-mono mt-1">{totalReactions}</div>
                      <div className="text-[10px] text-fuchsia-400 mt-0.5">Live user reactions</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#1C1530] border border-violet-900/30 shadow-md">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-violet-400">Community Votes</div>
                      <div className="text-2xl font-extrabold text-white font-mono mt-1">{totalPollVotes}</div>
                      <div className="text-[10px] text-indigo-400 mt-0.5">Poll responses received</div>
                    </div>
                  </div>
                );
              })()}

              {/* Stories Cards Grid */}
              {adminStories.length === 0 ? (
                <div className="py-16 px-4 rounded-3xl bg-[#1C1530]/60 border border-violet-900/30 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shadow-lg">
                    <CircleDashed className="w-8 h-8 stroke-[1.5]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">No Official Stories Yet</h3>
                    <p className="text-xs text-violet-300/60 max-w-md mx-auto">
                      Publish your first official story as &quot;PulseChat&quot;. It will immediately broadcast to every user&apos;s story feed in real-time.
                    </p>
                  </div>
                  <button
                    onClick={handleOpenCreateStory}
                    className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold rounded-2xl text-xs flex items-center space-x-2 transition cursor-pointer shadow-md shadow-violet-950/60"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Official Story</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                  {adminStories.map((story) => {
                    const isExpired = new Date(story.expiresAt) <= new Date();
                    const hoursRemaining = Math.max(0, Math.round((new Date(story.expiresAt) - new Date()) / (1000 * 60 * 60)));
                    const viewersCount = story.viewers?.length || 0;
                    const reactionsCount = story.reactions?.length || 0;
                    const pollTotalVotes = story.poll?.options?.reduce((acc, opt) => acc + (opt.votes?.length || 0), 0) || 0;

                    return (
                      <div
                        key={story._id}
                        className="rounded-3xl bg-[#1C1530] border border-violet-900/40 shadow-xl overflow-hidden flex flex-col justify-between transition hover:border-violet-600/50"
                      >
                        {/* Story Card Top Header */}
                        <div className="p-4 border-b border-violet-900/30 flex items-center justify-between">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 p-[1.5px] shrink-0">
                              <div className="w-full h-full rounded-full bg-[#1C1530] overflow-hidden flex items-center justify-center font-bold text-white text-xs">
                                <img
                                  src={
                                    (story.officialAuthorAvatar && !story.officialAuthorAvatar.includes('1618005182384'))
                                      ? story.officialAuthorAvatar
                                      : '/icons/icon-192.png'
                                  }
                                  alt="PulseChat"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = '/icons/icon.svg';
                                  }}
                                />
                              </div>
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-white flex items-center space-x-1.5 truncate">
                                <span>{story.officialAuthorName || 'PulseChat'}</span>
                                <span className="px-1.5 py-0.2 rounded-full text-[8px] bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold tracking-wider shrink-0">
                                  OFFICIAL
                                </span>
                              </div>
                              <div className="text-[10px] text-violet-400/60 flex items-center space-x-1">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{isExpired ? 'Expired' : `Expires in ${hoursRemaining}h`}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteAdminStory(story._id)}
                            className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                            title="Delete this official story"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Story Visual Canvas */}
                        <div
                          className="h-56 p-4 flex flex-col justify-center items-center text-center relative overflow-hidden select-none"
                          style={{ background: story.style?.background || 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
                        >
                          {story.type === 'media' && story.mediaUrl && (
                            <img
                              src={story.mediaUrl}
                              alt="Story media"
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          )}

                          <div className="relative z-10 space-y-2 max-w-xs">
                            {story.text && (
                              <p
                                className={`text-sm sm:text-base leading-snug drop-shadow-md line-clamp-4 ${
                                  story.style?.font === 'serif' ? 'font-serif' : story.style?.font === 'mono' ? 'font-mono' : 'font-sans'
                                } ${story.style?.bold ? 'font-bold' : 'font-normal'} ${story.style?.italic ? 'italic' : 'not-italic'}`}
                                style={getStoryTextStyle(story.style)}
                              >
                                {story.text}
                              </p>
                            )}

                            {story.hasPoll && story.poll && (
                              <div className="p-2.5 rounded-2xl bg-black/45 backdrop-blur-md border border-white/20 text-left space-y-1.5 shadow-lg">
                                <div className="text-[11px] font-bold text-white flex items-center space-x-1">
                                  <Vote className="w-3 h-3 text-purple-300" />
                                  <span className="truncate">{story.poll.question || 'Community Poll'}</span>
                                </div>
                                <div className="space-y-1">
                                  {(story.poll.options || []).slice(0, 3).map((opt, oIdx) => {
                                    const optVotes = opt.votes?.length || 0;
                                    const pct = pollTotalVotes > 0 ? Math.round((optVotes / pollTotalVotes) * 100) : 0;
                                    return (
                                      <div
                                        key={oIdx}
                                        className="h-6 rounded-lg bg-white/10 relative overflow-hidden flex items-center justify-between px-2 text-[10px] text-white"
                                      >
                                        <div
                                          className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-300"
                                          style={{ width: `${pct}%` }}
                                        />
                                        <span className="relative z-10 truncate">{opt.text}</span>
                                        <span className="relative z-10 font-mono font-bold opacity-80">{pct}%</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Story Card Engagement Footer */}
                        <div className="p-3.5 bg-[#171129] border-t border-violet-900/30 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-3 text-violet-300/80">
                            <span className="flex items-center space-x-1" title="Views">
                              <Eye className="w-3.5 h-3.5 text-violet-400" />
                              <span className="font-mono font-bold">{viewersCount}</span>
                            </span>
                            <span className="flex items-center space-x-1" title="Reactions">
                              <Heart className="w-3.5 h-3.5 text-rose-400" />
                              <span className="font-mono font-bold">{reactionsCount}</span>
                            </span>
                            {story.hasPoll && (
                              <span className="flex items-center space-x-1" title="Poll Votes">
                                <Vote className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="font-mono font-bold">{pollTotalVotes}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-1.5">
                            {story.hasPoll && (
                              <button
                                type="button"
                                onClick={() => handleToggleAdminStoryPoll(story._id)}
                                className="px-2 py-1 text-[11px] font-semibold bg-[#231C38] hover:bg-[#2A2242] text-violet-200 rounded-lg border border-violet-900/30 transition cursor-pointer"
                              >
                                {story.poll?.isClosed ? 'Reopen Poll' : 'Close Poll'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditStory(story)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-[#231C38] hover:bg-[#2A2242] text-violet-200 rounded-lg border border-violet-900/30 transition cursor-pointer flex items-center space-x-1"
                              title="Edit official story content & styling"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setStoryInspectModal(story)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 rounded-lg border border-violet-500/30 transition cursor-pointer"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
                </>
              )}

              {storySubTab === 'replies' && (
                <div className="space-y-4">
                  {/* Search and Action Bar */}
                  <div className="p-4 rounded-2xl bg-[#1C1530] border border-violet-900/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-400/60" />
                      <input
                        type="text"
                        value={replySearchQuery}
                        onChange={(e) => setReplySearchQuery(e.target.value)}
                        placeholder="Search replies by user, message, or story..."
                        className="w-full pl-10 pr-4 py-2 bg-[#120B24] border border-violet-900/50 rounded-xl text-xs text-white placeholder:text-violet-400/40 focus:outline-none focus:border-violet-500 transition"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={loadAdminStoryReplies}
                        disabled={loadingStoryReplies}
                        className="px-3.5 py-2 bg-[#231C38] hover:bg-[#2A2242] text-violet-300 hover:text-white rounded-xl border border-violet-900/30 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                        title="Refresh replies"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingStoryReplies ? 'animate-spin' : ''}`} />
                        <span>Refresh Replies</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Badges */}
                  {(() => {
                    const uniqueSenders = new Set(adminStoryReplies.map((r) => (r.user?._id || r.user)?.toString())).size;
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-2xl bg-[#1C1530] border border-violet-900/30">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Total Replies</div>
                          <div className="text-xl font-extrabold text-white font-mono mt-1">{adminStoryReplies.length}</div>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-[#1C1530] border border-violet-900/30">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Unique Senders</div>
                          <div className="text-xl font-extrabold text-white font-mono mt-1">{uniqueSenders}</div>
                        </div>
                        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-[#1C1530] border border-violet-900/30">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Latest Activity</div>
                          <div className="text-xs font-semibold text-white mt-1 truncate">
                            {adminStoryReplies[0] ? new Date(adminStoryReplies[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Replies Grid / List */}
                  {(() => {
                    const query = replySearchQuery.toLowerCase().trim();
                    const filteredReplies = adminStoryReplies.filter((r) => {
                      if (!query) return true;
                      const senderName = (r.user?.nickname || r.user?.username || '').toLowerCase();
                      const email = (r.user?.email || '').toLowerCase();
                      const msg = (r.message || '').toLowerCase();
                      const storyText = (r.story?.text || '').toLowerCase();
                      return senderName.includes(query) || email.includes(query) || msg.includes(query) || storyText.includes(query);
                    });

                    if (filteredReplies.length === 0) {
                      return (
                        <div className="p-12 text-center rounded-3xl bg-[#1C1530]/60 border border-violet-900/30">
                          <MessageCircle className="w-10 h-10 text-violet-400/40 mx-auto mb-3" />
                          <h3 className="text-base font-bold text-white">No Story Replies Found</h3>
                          <p className="text-xs text-violet-400/70 mt-1 max-w-sm mx-auto">
                            {replySearchQuery ? 'No replies match your search filter.' : 'When users reply directly to your stories, incoming messages appear here in real time.'}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredReplies.map((reply) => {
                          const senderDisplayName = reply.user?.nickname || reply.user?.username || 'User';
                          const senderAvatar = reply.user?.avatar;

                          return (
                            <div
                              key={reply._id}
                              className="rounded-3xl bg-[#1C1530] border border-violet-900/40 p-4 shadow-xl flex flex-col justify-between hover:border-violet-600/50 transition group space-y-3.5"
                            >
                              {/* Sender Details & Timestamp */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2.5 min-w-0">
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 p-[1.5px] shrink-0">
                                    <div className="w-full h-full rounded-full bg-[#1C1530] flex items-center justify-center font-bold text-white text-xs overflow-hidden">
                                      {senderAvatar ? (
                                        <img src={senderAvatar} alt={senderDisplayName} className="w-full h-full object-cover" />
                                      ) : (
                                        senderDisplayName[0]?.toUpperCase()
                                      )}
                                    </div>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-xs text-white truncate flex items-center space-x-1.5">
                                      <span>{senderDisplayName}</span>
                                      {reply.user?.username && (
                                        <span className="text-[10px] text-violet-400/60 font-mono">
                                          @{reply.user.username}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-violet-400/60 truncate">
                                      {reply.user?.email || 'PulseChat Member'}
                                    </div>
                                  </div>
                                </div>

                                <div className="text-[10px] text-violet-400/60 shrink-0 font-mono">
                                  {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(reply.createdAt).toLocaleDateString()}
                                </div>
                              </div>

                              {/* Original Story Reference Card */}
                              <div className="p-2.5 rounded-2xl bg-[#120B24] border border-violet-900/50 flex items-center space-x-2.5 overflow-hidden">
                                {reply.story?.mediaUrl ? (
                                  <img
                                    src={reply.story.mediaUrl}
                                    alt="Story media"
                                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-violet-800/40"
                                  />
                                ) : (
                                  <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-[9px] font-black uppercase shrink-0 shadow-sm"
                                    style={{ background: reply.story?.style?.background || 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
                                  >
                                    Story
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="text-[10px] font-bold text-violet-300 flex items-center space-x-1">
                                    <span>Story: {reply.story?.officialAuthorName || 'Official'}</span>
                                    {reply.story?.isAdminStory && (
                                      <span className="px-1 py-0.2 rounded text-[8px] bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-extrabold uppercase">
                                        Official
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-violet-200/80 line-clamp-1 mt-0.5">
                                    {reply.story?.text || (reply.story?.mediaUrl ? 'Photo / Media' : 'Story Content')}
                                  </p>
                                </div>
                              </div>

                              {/* User's Reply Message Bubble */}
                              <div className="p-3 rounded-2xl bg-gradient-to-r from-violet-950/60 to-purple-950/40 border border-violet-800/40">
                                <div className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-1 flex items-center space-x-1">
                                  <MessageSquare className="w-2.5 h-2.5" />
                                  <span>User Reply</span>
                                </div>
                                <div className="text-xs sm:text-sm text-white font-medium break-words leading-relaxed">
                                  <StoryReplyMessageText reply={reply} />
                                </div>
                              </div>

                              {/* Action Button: View Conversation & Reply */}
                              <div className="pt-1 flex items-center justify-end">
                                <button
                                  type="button"
                                  onClick={() => openOfficialReplyConversation(reply.user, reply.story, reply.conversationId)}
                                  className="px-3.5 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-md shadow-violet-950/50 active:scale-95"
                                  title="Open shared official conversation thread to respond as PulseChat"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>View & Reply (Official)</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
          {activeTab === 'announcements' && (
            <div className="w-full">
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
                    className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-md shadow-violet-950/50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Announcement</span>
                  </button>
                }
                renderItem={(a, mode) => {
                  const themeColors = {
                    default: 'bg-[#19142B] text-violet-200 border-violet-900/40',
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
                    'minimal-glass': 'bg-[#1E1833] text-violet-200 border-violet-900/40'
                  };
                  const themeClass = themeColors[a.design?.theme] || themeColors.default;

                  return (
                    <div
                      className={`p-4 bg-[#231C38] border border-violet-900/30 rounded-2xl shadow-lg transition hover:border-violet-500/40 hover:shadow-violet-950/40 min-w-0 overflow-hidden ${
                        mode === 'grid' ? 'flex flex-col justify-between h-full space-y-3' : 'flex items-start justify-between'
                      }`}
                    >
                      <div className={`space-y-2.5 min-w-0 overflow-hidden ${mode === 'grid' ? 'w-full' : 'flex-1 pr-4'}`}>
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <span className="text-base select-none shrink-0" role="img" aria-label="badge">
                            {a.design?.badge || (a.hasPoll ? '🗳️' : '📢')}
                          </span>
                          <span className="font-bold text-xs text-white truncate max-w-full" title={a.title}>{a.title}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono uppercase font-semibold ${
                              a.type === 'critical'
                                ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                                : a.type === 'warning'
                                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                                : 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                            }`}
                          >
                            {a.type}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border shadow-xs ${themeClass}`}>
                            🎨 {a.design?.theme || 'default'}
                          </span>
                          {a.hasPoll && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold font-mono bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/30 flex items-center space-x-1">
                              <BarChart3 className="w-3 h-3" />
                              <span>Poll Attached</span>
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border ${
                              a.isPublished !== false
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {a.isPublished !== false ? '● Live' : '⏸ Stopped'}
                          </span>
                          <span className="text-[10px] text-violet-400/60 font-mono">
                            Audience: {a.targetAudience}
                          </span>
                        </div>

                        <p className="text-xs text-violet-200 line-clamp-2 leading-relaxed">
                          {a.content}
                        </p>

                        {/* Attached Poll Breakdown & Results */}
                        {a.hasPoll && a.poll && (
                          <div className="p-3 bg-[#19142B] border border-violet-900/40 rounded-xl space-y-2 text-xs">
                            <div className="flex items-center justify-between font-semibold gap-2">
                              <span className="truncate text-violet-300 flex items-center space-x-1.5">
                                <Vote className="w-3.5 h-3.5 shrink-0 text-violet-400" />
                                <span className="font-bold truncate">{a.poll.question || 'Poll Question'}</span>
                              </span>
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold shrink-0 ${
                                  a.poll.isClosed
                                    ? 'bg-rose-950/60 text-rose-400 border border-rose-800'
                                    : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
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
                                          <span className="truncate font-medium flex items-center space-x-1 text-violet-200">
                                            <span>{opt.text}</span>
                                            {isWinner && (
                                              <span className="text-[9px] font-bold text-amber-400 uppercase px-1 rounded bg-amber-500/10">
                                                {a.poll.isClosed ? 'Winner' : 'Leading'}
                                              </span>
                                            )}
                                          </span>
                                          <span className="font-mono text-violet-400/70 text-[10px]">
                                            <strong>{pct}%</strong> ({vCount} {vCount === 1 ? 'vote' : 'votes'})
                                          </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-[#161226] rounded-full overflow-hidden border border-violet-900/30">
                                          <div
                                            className={`h-full transition-all duration-300 rounded-full ${
                                              isWinner
                                                ? 'bg-amber-400'
                                                : 'bg-gradient-to-r from-violet-600 to-purple-500'
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

                            <div className="text-[10px] text-violet-400/60 font-mono flex items-center justify-between pt-1 border-t border-violet-900/30">
                              <span>{a.poll.options?.length || 0} options · {a.totalPollVotes || 0} total votes</span>
                              <span>{a.poll.allowMultiple ? 'Multi-choice' : 'Single-choice'}</span>
                            </div>
                          </div>
                        )}

                        <div className="text-[10px] text-violet-400/60 font-mono pt-1">
                          Acknowledged by {a.acknowledgmentCount || 0} users •{' '}
                          {new Date(a.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Bottom action buttons */}
                      <div className={`pt-2.5 border-t border-violet-900/30 flex items-center gap-1.5 ${mode === 'grid' ? 'w-full mt-2' : 'shrink-0'}`}>
                        <button
                          onClick={() => handleTogglePublishAnnouncement(a)}
                          className={`flex-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer flex items-center justify-center space-x-1 ${
                            a.isPublished !== false
                              ? 'border-rose-800/60 text-rose-300 hover:bg-rose-950/40'
                              : 'border-emerald-800/60 text-emerald-300 hover:bg-emerald-950/40'
                          }`}
                          title={a.isPublished !== false ? 'Stop broadcasting this announcement' : 'Resume broadcasting announcement'}
                        >
                          {a.isPublished !== false ? (
                            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                          ) : (
                            <Play className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          <span>{a.isPublished !== false ? 'Stop' : 'Resume'}</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditAnnouncement(a)}
                          className="flex-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-violet-900/40 bg-[#19142B] hover:bg-violet-900/30 text-violet-200 transition cursor-pointer flex items-center justify-center space-x-1"
                          title="Edit announcement content & theme color"
                        >
                          <Pencil className="w-3.5 h-3.5 text-violet-400" />
                          <span>Edit</span>
                        </button>

                        {a.hasPoll && a.poll && (
                          <button
                            onClick={() => handleTogglePollClosed(a._id)}
                            className={`flex-1 px-2 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer flex items-center justify-center space-x-1 ${
                              a.poll.isClosed
                                ? 'border-emerald-800/60 text-emerald-300 hover:bg-emerald-950/40'
                                : 'border-amber-800/60 text-amber-300 hover:bg-amber-950/40'
                            }`}
                            title={a.poll.isClosed ? 'Reopen poll voting' : 'Close poll voting'}
                          >
                            {a.poll.isClosed ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            <span>{a.poll.isClosed ? 'Reopen' : 'Close'}</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteAnnouncement(a._id)}
                          className="p-1.5 text-violet-400/60 hover:text-rose-400 rounded-xl hover:bg-rose-950/40 transition cursor-pointer"
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
            <div className="space-y-6 w-full">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Database className="w-5 h-5 text-violet-400" />
                  <span>Database Management</span>
                </h2>
                <p className="text-xs text-violet-300/70">
                  Inspect connection health, logical category assignments, and query response time
                </p>
              </div>

              {/* Status Header Banner */}
              <div className="p-5 bg-[#231C38] border border-violet-900/30 rounded-2xl shadow-lg shadow-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold">
                    <HardDrive className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                      <span>MongoDB Primary Instance</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {dbStatus?.connectionState || 'Connected'}
                      </span>
                    </h3>
                    <p className="text-xs text-violet-300/70 mt-0.5 font-mono">
                      Host: {dbStatus?.host || '127.0.0.1'} | Database: {dbStatus?.name || 'pulsechat'} | Latency: {dbStatus?.latencyMs || 0}ms
                    </p>
                  </div>
                </div>

                <button
                  onClick={loadDbStatus}
                  className="px-3 py-1.5 bg-[#19142B] hover:bg-violet-900/40 text-violet-200 border border-violet-900/40 font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-violet-400" />
                  <span>Refresh Ping</span>
                </button>
              </div>

              {/* Logical Category Allocation Table */}
              <div className="bg-[#231C38] border border-violet-900/30 rounded-2xl shadow-lg shadow-black/20 p-5 space-y-4">
                <h3 className="font-bold text-sm text-white">
                  Logical Category Separation & Database Mapping
                </h3>
                <div className="divide-y divide-violet-900/30 text-xs">
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white">1. Users & Authentication Data</span>
                      <p className="text-[11px] text-violet-300/60">Credentials, public keys, privacy preferences, sessions</p>
                    </div>
                    <span className="font-mono text-xs px-2.5 py-1 bg-[#19142B] border border-violet-900/30 rounded-lg text-violet-300 font-semibold">
                      Target: {dbStatus?.assignments?.authDb || 'primary'}
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white">2. Direct-Message (1-on-1) Data</span>
                      <p className="text-[11px] text-violet-300/60">End-to-end encrypted direct chat records, delivery state</p>
                    </div>
                    <span className="font-mono text-xs px-2.5 py-1 bg-[#19142B] border border-violet-900/30 rounded-lg text-violet-300 font-semibold">
                      Target: {dbStatus?.assignments?.messagesDb || 'primary'}
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white">3. Group-Chat & Channel Data</span>
                      <p className="text-[11px] text-violet-300/60">Group rosters, invite codes, admins, shared group history</p>
                    </div>
                    <span className="font-mono text-xs px-2.5 py-1 bg-[#19142B] border border-violet-900/30 rounded-lg text-violet-300 font-semibold">
                      Target: {dbStatus?.assignments?.groupsDb || 'primary'}
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white">4. Activity & Security Audit Logs</span>
                      <p className="text-[11px] text-violet-300/60">Administrative moderation logs, login telemetry</p>
                    </div>
                    <span className="font-mono text-xs px-2.5 py-1 bg-[#19142B] border border-violet-900/30 rounded-lg text-violet-300 font-semibold">
                      Target: {dbStatus?.assignments?.auditDb || 'primary'}
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white">5. Deleted-Account Retention (Trash DB)</span>
                      <p className="text-[11px] text-violet-300/60">Isolated retention store during recovery window</p>
                    </div>
                    <span className="font-mono text-xs px-2.5 py-1 bg-[#19142B] border border-violet-900/30 rounded-lg text-rose-400 font-semibold">
                      Target: {dbStatus?.assignments?.retentionDb || 'isolated_retention'}
                    </span>
                  </div>
                </div>
              </div>

              {/* TRASH DB: DELETED ACCOUNTS & RETENTION STORE */}
              <div className="bg-[#231C38] border border-violet-900/30 rounded-2xl shadow-lg shadow-black/20 p-5 space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-violet-900/30">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-300 border border-rose-500/30 flex items-center justify-center font-bold shrink-0">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-sm sm:text-base text-white">
                          Deleted-Account Retention Store (Trash DB)
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/60 text-rose-300 border border-rose-800/60">
                          {trashStats?.totalInTrash ?? trashAccounts.length} Retained
                        </span>
                      </div>
                      <p className="text-xs text-violet-300/70 mt-0.5">
                        Accounts removed by administrators or self-deleted. Retained for 14 days before automated purge, with admin messages and one-click restoration.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    <button
                      onClick={loadTrashAccounts}
                      disabled={trashLoading}
                      className="px-3 py-1.5 bg-[#19142B] hover:bg-violet-900/40 text-violet-200 border border-violet-900/40 font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer"
                      title="Refresh Trash DB"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${trashLoading ? 'animate-spin text-rose-400' : ''}`} />
                      <span>Refresh Trash</span>
                    </button>

                    <button
                      onClick={handlePurgeExpiredTrash}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-md shadow-rose-950/40"
                      title="Purge all accounts past their 14-day retention deadline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Purge Expired</span>
                    </button>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-[#19142B] rounded-xl border border-violet-900/30">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300/60 block font-mono">
                      Total in Trash
                    </span>
                    <span className="text-2xl font-black text-rose-400">
                      {trashStats?.totalInTrash ?? trashAccounts.length}
                    </span>
                    <span className="text-[10px] text-violet-400/60 block mt-0.5">Retained accounts</span>
                  </div>

                  <div className="p-3.5 bg-[#19142B] rounded-xl border border-violet-900/30">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300/60 block font-mono">
                      Deleted by Admin
                    </span>
                    <span className="text-2xl font-black text-violet-300">
                      {trashStats?.totalAdminDeleted ?? trashAccounts.filter(a => a.deletionStatus === 'deleted_by_admin').length}
                    </span>
                    <span className="text-[10px] text-violet-400/60 block mt-0.5">With admin messages</span>
                  </div>

                  <div className="p-3.5 bg-[#19142B] rounded-xl border border-violet-900/30">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300/60 block font-mono">
                      User Self-Deleted
                    </span>
                    <span className="text-2xl font-black text-amber-400">
                      {trashStats?.totalSelfDeleted ?? trashAccounts.filter(a => a.deletionStatus !== 'deleted_by_admin').length}
                    </span>
                    <span className="text-[10px] text-violet-400/60 block mt-0.5">Self-service queue</span>
                  </div>

                  <div className="p-3.5 bg-[#19142B] rounded-xl border border-violet-900/30">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300/60 block font-mono">
                      Retention Policy
                    </span>
                    <span className="text-2xl font-black text-emerald-400">
                      14 Days
                    </span>
                    <span className="text-[10px] text-violet-400/60 block mt-0.5 font-mono">isolated_retention</span>
                  </div>
                </div>

                {/* Profile Data Request Visibility Quick-Toggle */}
                {(() => {
                  const isOldDataEnabled = systemSettings?.featureFlags?.allowOldDataRequests !== false;
                  return (
                    <div className="p-3.5 bg-[#19142B] border border-violet-900/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/30 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                          <RotateCcw className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap">
                            <h4 className="text-xs font-bold text-white">
                              User Profile "Request Old Data" Option
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isOldDataEnabled
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-[#231C38] text-violet-400 border border-violet-900/30'
                            }`}>
                              {isOldDataEnabled ? 'Active (Visible in Profile)' : 'Off (Hidden from Profiles)'}
                            </span>
                          </div>
                          <p className="text-[11px] text-violet-300/60 mt-0.5">
                            Allows users who delete their account, create a new one, and skip import to still request their historical data from their profile settings. Turn off anytime to hide the option from all users.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleFeature('allowOldDataRequests', isOldDataEnabled)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center space-x-1.5 ${
                          isOldDataEnabled
                            ? 'bg-rose-950/60 text-rose-300 hover:bg-rose-900/60 border border-rose-800/60'
                            : 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 shadow-xs'
                        }`}
                        title={isOldDataEnabled ? 'Click to hide the Request Old Data option from user profiles' : 'Click to show the Request Old Data option in user profiles'}
                      >
                        <span>{isOldDataEnabled ? 'Hide from User Profiles' : 'Enable in User Profiles'}</span>
                      </button>
                    </div>
                  );
                })()}

                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-violet-400/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={trashSearch}
                      onChange={(e) => setTrashSearch(e.target.value)}
                      placeholder="Search trash by username, email, or admin reason..."
                      className="w-full text-xs bg-[#19142B] border border-violet-900/40 rounded-xl pl-9 pr-3 py-2 text-white placeholder-violet-300/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50 font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 p-1 bg-[#19142B] rounded-xl border border-violet-900/30 shrink-0">
                    {[
                      { id: 'all', label: 'All Trash' },
                      { id: 'admin_deleted', label: 'Admin Deleted' },
                      { id: 'self_deleted', label: 'Self Deleted' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setTrashFilter(tab.id)}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                          trashFilter === tab.id
                            ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-xs'
                            : 'text-violet-300/70 hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accounts List */}
                {(() => {
                  const filteredTrash = trashAccounts.filter((acc) => {
                    if (trashFilter === 'admin_deleted' && acc.deletionStatus !== 'deleted_by_admin') return false;
                    if (trashFilter === 'self_deleted' && acc.deletionStatus === 'deleted_by_admin') return false;
                    if (trashSearch.trim()) {
                      const q = trashSearch.toLowerCase();
                      const match =
                        (acc.username && acc.username.toLowerCase().includes(q)) ||
                        (acc.email && acc.email.toLowerCase().includes(q)) ||
                        (acc.deletionReason && acc.deletionReason.toLowerCase().includes(q));
                      if (!match) return false;
                    }
                    return true;
                  });

                  if (trashLoading) {
                    return (
                      <div className="py-12 flex flex-col items-center justify-center space-y-2 text-violet-300/70 text-xs font-mono">
                        <RefreshCw className="w-6 h-6 animate-spin text-violet-400" />
                        <span>Loading Trash DB records...</span>
                      </div>
                    );
                  }

                  if (filteredTrash.length === 0) {
                    return (
                      <div className="py-12 px-4 text-center bg-[#19142B] rounded-2xl border border-dashed border-violet-900/40 space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                        <h4 className="text-xs font-bold text-white">Trash Database is Clean</h4>
                        <p className="text-[11px] text-violet-300/60 max-w-sm mx-auto">
                          {trashSearch || trashFilter !== 'all'
                            ? 'No retained accounts match the active search or filter.'
                            : 'No user accounts are currently retained in the trash database. Deleted users will be held here for 14 days.'}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {filteredTrash.map((acc) => {
                        const isAdminDeleted = acc.deletionStatus === 'deleted_by_admin';
                        const isRestoring = restoringTrashId === acc._id;
                        const isPurging = purgingTrashId === acc._id;

                        return (
                          <div
                            key={acc._id}
                            className="p-4 bg-[#19142B] border border-violet-900/30 rounded-2xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-violet-500/40 transition"
                          >
                            <div className="space-y-2.5 min-w-0 flex-1">
                              {/* Top identity & badges */}
                              <div className="flex items-center space-x-3 min-w-0">
                                <Avatar src={acc.avatar} name={acc.username} size="md" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-xs text-white truncate">
                                      @{acc.username}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                                        isAdminDeleted
                                          ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                                          : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                                      }`}
                                    >
                                      {isAdminDeleted ? 'Deleted by Admin' : 'Self-Requested'}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-violet-300/60 truncate">
                                    {acc.email}
                                  </div>
                                </div>
                              </div>

                              {/* Admin Reason Box */}
                              <div className="p-2.5 bg-[#231C38] rounded-xl border border-violet-900/40 text-xs">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300/60 block font-mono">
                                  Message / Reason Left for User:
                                </span>
                                <p className="text-violet-100 font-medium text-xs mt-0.5 leading-relaxed">
                                  "{acc.deletionReason || 'Account removed by administrator.'}"
                                </p>
                              </div>

                              {/* Timestamps & Retention Info */}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-violet-300/60 font-mono">
                                <span>
                                  Deleted: {acc.deletedAt ? new Date(acc.deletedAt).toLocaleDateString() : 'Recent'}
                                </span>
                                {acc.deletedByAdmin && (
                                  <span>
                                    By: <strong className="text-violet-200">@{acc.deletedByAdmin.username}</strong>
                                  </span>
                                )}
                                <span className={`flex items-center space-x-1 ${acc.daysLeft <= 2 ? 'text-rose-400 font-bold' : 'text-amber-400'}`}>
                                  <Clock className="w-3 h-3" />
                                  <span>
                                    {acc.daysLeft <= 0 ? 'Retention expired (ready to purge)' : `${acc.daysLeft} days remaining in Trash DB`}
                                  </span>
                                </span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-violet-900/30">
                              <button
                                onClick={() => handleRestoreTrashAccount(acc)}
                                disabled={isRestoring || isPurging}
                                className="px-3.5 py-2 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                                title="Restore account back to active status"
                              >
                                <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                                <span>{isRestoring ? 'Restoring...' : 'Restore Account'}</span>
                              </button>

                              <button
                                onClick={() => handlePurgeTrashAccount(acc)}
                                disabled={isRestoring || isPurging}
                                className="px-3.5 py-2 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                                title="Permanently wipe from database immediately"
                              >
                                <Trash2 className={`w-3.5 h-3.5 ${isPurging ? 'animate-spin' : ''}`} />
                                <span>{isPurging ? 'Purging...' : 'Purge Permanently'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB: ACCOUNT RECOVERIES */}
          {activeTab === 'recoveries' && (
            <div className="w-full space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                    <RotateCcw className="w-5 h-5 text-violet-400" />
                    <span>Account Recovery Requests</span>
                  </h2>
                  <p className="text-xs text-violet-300/70 mt-0.5">
                    Review, approve, or reject user account restoration and data migration requests.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={loadRecoveries}
                    disabled={recoveriesLoading}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-[#19142B] hover:bg-violet-900/40 text-violet-200 border border-violet-900/40 rounded-xl transition cursor-pointer font-medium"
                    title="Refresh requests"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${recoveriesLoading ? 'animate-spin text-violet-400' : ''}`} />
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
                      className="flex items-center space-x-1.5 px-3 py-1.5 text-xs border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer font-medium"
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
                    <div className="p-3.5 bg-[#231C38] border border-violet-900/30 rounded-2xl shadow-lg shadow-black/20 space-y-3">
                      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-[200px]">
                          <Search className="w-4 h-4 text-violet-400/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={recoverySearch}
                            onChange={(e) => setRecoverySearch(e.target.value)}
                            placeholder="Search by username, email..."
                            className="w-full text-xs bg-[#19142B] border border-violet-900/40 rounded-xl pl-9 pr-3 py-2 text-white placeholder-violet-300/40 focus:outline-hidden focus:ring-2 focus:ring-violet-500/50"
                          />
                        </div>

                        {/* Filters row */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Status Filter */}
                          <select
                            value={recoveryStatusFilter}
                            onChange={(e) => setRecoveryStatusFilter(e.target.value)}
                            className="text-xs bg-[#19142B] border border-violet-900/40 rounded-xl px-3 py-2 text-violet-200 focus:outline-hidden cursor-pointer font-medium"
                          >
                            <option value="all">Status: All</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="partial">Partial</option>
                          </select>

                          {/* Date Range Filter */}
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-violet-400/60 shrink-0" />
                            <input
                              type="date"
                              value={recoveryDateFrom}
                              onChange={(e) => setRecoveryDateFrom(e.target.value)}
                              title="From date"
                              className="text-xs bg-[#19142B] border border-violet-900/40 rounded-xl px-2 py-1.5 text-violet-200 focus:outline-hidden cursor-pointer font-medium"
                            />
                            <span className="text-violet-400/60 text-xs">–</span>
                            <input
                              type="date"
                              value={recoveryDateTo}
                              min={recoveryDateFrom || undefined}
                              onChange={(e) => setRecoveryDateTo(e.target.value)}
                              title="To date"
                              className="text-xs bg-[#19142B] border border-violet-900/40 rounded-xl px-2 py-1.5 text-violet-200 focus:outline-hidden cursor-pointer font-medium"
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
                              className="text-xs px-2.5 py-1.5 text-violet-400 hover:text-rose-400 font-medium transition cursor-pointer flex items-center space-x-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reset</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Select all bar */}
                      {filteredRecoveries.length > 0 && (
                        <div className="pt-2 border-t border-violet-900/30 flex items-center justify-between text-xs text-violet-300/70">
                          <button
                            type="button"
                            onClick={handleToggleSelectAllFilteredRecoveries}
                            className="flex items-center space-x-2 font-semibold hover:text-white transition cursor-pointer"
                          >
                            {allFilteredRecoveriesSelected ? (
                              <CheckSquare className="w-4 h-4 text-violet-400" />
                            ) : (
                              <Square className="w-4 h-4 text-violet-400/60" />
                            )}
                            <span>
                              {allFilteredRecoveriesSelected
                                ? 'Deselect All'
                                : `Select All Filtered (${selectedRecoveries.size}/${filteredRecoveries.length})`}
                            </span>
                          </button>

                          <span className="font-mono text-[11px] text-violet-300/60">
                            Showing {filteredRecoveries.length} of {recoveries.length} request(s)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    {recoveriesLoading ? (
                      <div className="flex items-center justify-center py-16 text-violet-300/70 bg-[#231C38] border border-violet-900/30 rounded-2xl">
                        <RefreshCw className="w-6 h-6 animate-spin mr-2 text-violet-400" />
                        <span className="text-sm">Loading requests...</span>
                      </div>
                    ) : filteredRecoveries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-violet-400/70 space-y-2 bg-[#231C38] border border-violet-900/30 rounded-2xl">
                        <RotateCcw className="w-10 h-10 opacity-30" />
                        <p className="text-sm font-medium text-white">No recovery requests found</p>
                        <p className="text-xs text-violet-300/60">
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
                            className="mt-2 text-xs font-semibold px-3 py-1.5 bg-violet-600/20 text-violet-300 border border-violet-500/30 rounded-xl hover:bg-violet-600/30 transition cursor-pointer"
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
                      : isPartial ? 'text-violet-300 bg-violet-950/40 border-violet-700/50'
                      : 'text-rose-400 bg-rose-950/40 border-rose-700/50';
                    const typeColor    = isMigration
                      ? 'text-fuchsia-300 bg-fuchsia-950/40 border-fuchsia-700/50'
                      : 'text-cyan-300 bg-cyan-950/40 border-cyan-700/50';

                    const isSelected = selectedRecoveries.has(req._id);

                    return (
                      <div
                        key={req._id}
                        className={`bg-[#231C38] border rounded-2xl p-5 space-y-4 shadow-lg transition min-w-0 overflow-hidden ${
                          isSelected
                            ? 'border-violet-500 ring-2 ring-violet-500/30'
                            : 'border-violet-900/30 hover:border-violet-500/40'
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
                              className="mt-0.5 text-violet-400/60 hover:text-white transition cursor-pointer shrink-0"
                              title="Select this recovery request"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-violet-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>

                            <div className="space-y-0.5 min-w-0 overflow-hidden">
                              <div className="flex items-center space-x-2 flex-wrap gap-1 min-w-0">
                                <span className="text-sm font-bold text-white truncate" title={req.user?.username || req.originalUsername}>
                                  @{req.user?.username || req.originalUsername}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusColor}`}>
                                  {req.status.toUpperCase()}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${typeColor}`}>
                                  {isMigration ? '📦 DATA MIGRATION' : '🔄 RESTORE'}
                                </span>
                              </div>
                              <p className="text-xs text-violet-300/70 truncate max-w-full" title={req.user?.email || req.email}>
                                {req.user?.email || req.email}
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-[11px] text-violet-400/70 space-y-0.5 font-mono">
                            <p>Submitted: {new Date(req.createdAt).toLocaleString()}</p>
                            {req.user?.recoveryDeadline && (
                              <p className="text-amber-400">Deadline: {new Date(req.user.recoveryDeadline).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>

                        {/* Data migration: show old → new account link + per-item controls */}
                        {isMigration && req.newAccount && (
                          <div className="bg-[#19142B] border border-violet-900/40 rounded-xl p-3 text-xs space-y-3">
                            <p className="text-violet-300 font-bold text-[10px] uppercase tracking-wider">Data Migration Request</p>
                            <div className="flex items-center space-x-3 flex-wrap gap-2">
                              <div className="flex-1 bg-[#161226] border border-violet-900/30 rounded-lg p-2 space-y-0.5 min-w-[120px]">
                                <p className="text-[10px] text-violet-400/60 font-bold uppercase">Old Account</p>
                                <p className="text-rose-300 font-semibold">@{req.user?.username || req.originalUsername}</p>
                                <p className="text-violet-400/60 text-[10px]">{req.originalEmail || req.user?.email || req.email}</p>
                              </div>
                              <span className="text-violet-400 text-lg">→</span>
                              <div className="flex-1 bg-[#161226] border border-violet-900/30 rounded-lg p-2 space-y-0.5 min-w-[120px]">
                                <p className="text-[10px] text-violet-400/60 font-bold uppercase">New Account</p>
                                <p className="text-emerald-300 font-semibold">@{req.newAccount.username}</p>
                                <p className="text-violet-400/60 text-[10px]">{req.newAccount.email}</p>
                              </div>
                            </div>

                            {/* Per-item data controls */}
                            {req.requestedItems && req.requestedItems.length > 0 && (
                              <div className="space-y-2 pt-1">
                                <p className="text-[10px] text-violet-300 font-bold uppercase tracking-wider">Requested Data Items</p>
                                {req.requestedItems.map(item => {
                                  const itemPending  = item.status === 'pending';
                                  const itemApproved = item.status === 'approved';
                                  return (
                                    <div key={item.key} className="flex items-center justify-between bg-[#161226] border border-violet-900/30 rounded-lg px-3 py-2 gap-2">
                                      <div className="flex items-center space-x-2">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${itemApproved ? 'bg-emerald-400' : item.status === 'rejected' ? 'bg-rose-400' : 'bg-amber-400'}`} />
                                        <span className="text-xs text-white font-medium">{item.label}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${itemApproved ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800' : item.status === 'rejected' ? 'bg-rose-950/60 text-rose-300 border border-rose-800' : 'bg-amber-950/60 text-amber-300 border border-amber-800'}`}>
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
                              <p className="text-[10px] text-violet-400/60 italic">User hasn't selected specific data items yet.</p>
                            )}
                          </div>
                        )}

                        {/* Linked user data grid */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[11px]">
                          <div className="bg-[#19142B] border border-violet-900/30 rounded-xl p-2.5 space-y-0.5">
                            <p className="text-violet-400/60 uppercase tracking-wider font-bold text-[10px]">Old Acct Status</p>
                            <p className="text-white font-semibold">{req.user?.deletionStatus || '—'}</p>
                          </div>
                          <div className="bg-[#19142B] border border-violet-900/30 rounded-xl p-2.5 space-y-0.5">
                            <p className="text-violet-400/60 uppercase tracking-wider font-bold text-[10px]">Registered</p>
                            <p className="text-white font-semibold">{req.user?.createdAt ? new Date(req.user.createdAt).toLocaleDateString() : '—'}</p>
                          </div>
                          <div className="bg-[#19142B] border border-violet-900/30 rounded-xl p-2.5 space-y-0.5">
                            <p className="text-violet-400/60 uppercase tracking-wider font-bold text-[10px]">Request ID</p>
                            <p className="text-violet-300 font-mono text-[10px] break-all">{req._id?.slice(-8)}</p>
                          </div>
                          <div className="bg-[#19142B] border border-violet-900/30 rounded-xl p-2.5 space-y-0.5">
                            <p className="text-violet-400/60 uppercase tracking-wider font-bold text-[10px]">IP Address</p>
                            <p className="text-white font-semibold">{req.ipAddress || '—'}</p>
                          </div>
                        </div>

                        {/* User note */}
                        {req.userNote && (
                          <div className="bg-[#19142B] border border-violet-900/40 rounded-xl p-3">
                            <p className="text-[10px] text-violet-300 font-bold uppercase tracking-wider mb-1">User's Note</p>
                            <p className="text-xs text-violet-200 leading-relaxed">{req.userNote}</p>
                          </div>
                        )}

                        {/* Admin decision (resolved) */}
                        {!isPending && req.adminDecisionReason && (
                          <div className={`rounded-xl p-3 border text-xs ${isApproved ? 'bg-emerald-950/30 border-emerald-800/40' : 'bg-rose-950/30 border-rose-800/40'}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isApproved ? 'text-emerald-300' : 'text-rose-300'}`}>
                              Admin Decision
                            </p>
                            <p className="text-violet-200">{req.adminDecisionReason}</p>
                            {req.decidedAt && <p className="text-violet-400/60 text-[10px] mt-1">{new Date(req.decidedAt).toLocaleString()}</p>}
                          </div>
                        )}

                        {/* Action buttons — pending only */}
                        {isPending && (
                          <div className="flex items-center space-x-3 pt-1">
                            <button
                              onClick={() => { setResolveModal({ request: req, action: 'approve' }); setResolveReason(''); setResolveMsg({ text: '', type: '' }); }}
                              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isMigration ? 'Approve Migration' : 'Approve & Restore'}</span>
                            </button>
                            <button
                              onClick={() => { setResolveModal({ request: req, action: 'reject' }); setResolveReason(''); setResolveMsg({ text: '', type: '' }); }}
                              className="flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer"
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
            <div className="w-full">
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
                      className="px-3 py-1.5 bg-[#19142B] hover:bg-violet-900/40 text-violet-200 border border-violet-900/40 font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer"
                      title="Select or deselect all audit log entries"
                    >
                      {selectedAuditLogs.size > 0 && selectedAuditLogs.size === auditLogs.length ? (
                        <CheckSquare className="w-4 h-4 text-violet-400" />
                      ) : (
                        <Square className="w-4 h-4 text-violet-400/60" />
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
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-md shadow-rose-950/40"
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
                        className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer"
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
                      className={`p-3.5 bg-[#231C38] border rounded-2xl shadow-sm transition min-w-0 overflow-hidden ${
                        isSelected
                          ? 'border-violet-500 ring-2 ring-violet-500/30 bg-[#1E1833]'
                          : 'border-violet-900/30 hover:border-violet-500/40'
                      } ${
                        mode === 'grid' ? 'flex flex-col gap-3' : 'flex items-center justify-between'
                      }`}
                    >
                      <div className="flex items-start space-x-3 flex-1 min-w-0 pr-3 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectAuditLog(log._id)}
                          className="mt-0.5 text-violet-400/60 hover:text-white transition cursor-pointer shrink-0"
                          title={isSelected ? 'Deselect log' : 'Select log'}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-violet-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-bold text-xs text-violet-300 truncate">
                              {log.action}
                            </span>
                            <span className="text-[11px] text-violet-400/70 font-mono shrink-0 truncate">
                              by @{actorName}
                            </span>
                          </div>
                          <p className="text-xs text-violet-200 mt-1 line-clamp-2">
                            {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 mt-2 sm:mt-0">
                        <span className="text-[10px] text-violet-400/60 font-mono">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSingleAuditLog(log._id)}
                          className="p-1.5 text-violet-400/60 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition cursor-pointer"
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
            <div className="space-y-6 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                    <Wrench className="w-5 h-5 text-violet-400" />
                    <span>Scheduled Maintenance Manager</span>
                  </h2>
                  <p className="text-xs text-violet-300/70 mt-0.5">
                    Schedule automated downtime windows or toggle instant maintenance with granular feature-level control
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => loadMaintenance()}
                    disabled={schedulesLoading}
                    className="p-2 text-violet-300 hover:text-white rounded-xl hover:bg-violet-900/40 transition cursor-pointer"
                    title="Refresh Schedules"
                  >
                    <RefreshCw className={`w-4 h-4 ${schedulesLoading ? 'animate-spin text-violet-400' : ''}`} />
                  </button>
                  <button
                    onClick={() => openScheduleModal()}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-violet-950/50 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Schedule Maintenance</span>
                  </button>
                </div>
              </div>

              {/* Status Overview Banner */}
              {activeMaintRecord ? (
                <div className="p-5 bg-gradient-to-r from-rose-950/40 via-[#231C38] to-[#1E1833] border-2 border-rose-500/50 rounded-2xl shadow-xl shadow-black/40 relative overflow-hidden">
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
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {activeMaintRecord.scope === 'full_system' ? 'Full System Outage' : 'Partial / Feature-Specific'}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-white">{activeMaintRecord.title}</h3>
                      {activeMaintRecord.description && (
                        <p className="text-xs text-violet-200 max-w-2xl leading-relaxed">
                          {activeMaintRecord.description}
                        </p>
                      )}

                      {activeMaintRecord.scope === 'partial' && activeMaintRecord.affectedFeatures?.length > 0 && (
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <span className="text-[11px] text-violet-400 font-medium">Affected Features:</span>
                          {activeMaintRecord.affectedFeatures.map((f) => (
                            <span key={f} className="px-2 py-0.5 bg-[#19142B] text-amber-300 rounded-md text-[10px] font-mono border border-violet-900/40">
                              {f}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center space-x-4 pt-2 text-[11px] text-violet-300/60 font-mono">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-violet-400" />
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
                        className="px-3 py-2 bg-[#19142B] hover:bg-violet-900/40 text-violet-200 border border-violet-900/30 rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleEndSchedule(activeMaintRecord._id)}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-950/40 cursor-pointer flex items-center space-x-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>End Maintenance Now</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex items-center justify-between shadow-md">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-emerald-300">All Systems Operational</div>
                      <div className="text-[11px] text-violet-300/70">No active maintenance in progress. Normal users have full access.</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      openScheduleModal();
                      setMaintIsImmediate(true);
                    }}
                    className="px-3 py-1.5 bg-[#19142B] hover:bg-violet-900/40 text-violet-200 text-xs font-medium rounded-lg border border-violet-900/40 transition cursor-pointer"
                  >
                    Quick Emergency Mode
                  </button>
                </div>
              )}

              {/* Upcoming Schedules */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-violet-400" />
                    <span>Upcoming Maintenance Windows</span>
                  </h3>
                  <span className="text-[11px] text-violet-400/70">
                    {schedules.filter((s) => s.status === 'scheduled').length} scheduled
                  </span>
                </div>

                {schedules.filter((s) => s.status === 'scheduled').length === 0 ? (
                  <div className="p-8 text-center bg-[#231C38] border border-violet-900/30 rounded-2xl text-xs text-violet-300/70">
                    <Hourglass className="w-8 h-8 text-violet-400/40 mx-auto mb-2" />
                    <p className="font-medium text-white">No upcoming maintenance windows scheduled</p>
                    <p className="text-[11px] text-violet-300/60 mt-1">Users will not experience scheduled downtime.</p>
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
                            className="p-4 bg-[#231C38] border border-violet-900/30 hover:border-violet-500/40 rounded-2xl shadow-lg space-y-3 transition"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-600/20 text-violet-300 border border-violet-500/30">
                                  {startsInMin > 0 ? `Starts in ${startsInMin}m` : 'Starting Soon'}
                                </span>
                                <h4 className="text-sm font-bold text-white mt-1.5">{sch.title}</h4>
                                {sch.description && (
                                  <p className="text-xs text-violet-300/70 line-clamp-2 mt-0.5">{sch.description}</p>
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

                            <div className="text-[11px] text-violet-300/70 space-y-1 bg-[#19142B] p-2.5 rounded-xl border border-violet-900/40">
                              <div className="flex justify-between">
                                <span>Start:</span>
                                <span className="font-mono text-white">{start.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                              </div>
                              {end && (
                                <div className="flex justify-between">
                                  <span>End:</span>
                                  <span className="font-mono text-white">{end.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                </div>
                              )}
                              {sch.scope === 'partial' && sch.affectedFeatures?.length > 0 && (
                                <div className="flex justify-between items-center pt-1 border-t border-violet-900/30">
                                  <span>Features:</span>
                                  <span className="text-[10px] text-amber-300">{sch.affectedFeatures.join(', ')}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-end space-x-2 pt-1">
                              <button
                                onClick={() => handleActivateSchedule(sch._id)}
                                className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer flex items-center space-x-1"
                              >
                                <Play className="w-3 h-3" />
                                <span>Activate Now</span>
                              </button>
                              <button
                                onClick={() => openScheduleModal(sch)}
                                className="px-3 py-1.5 bg-[#19142B] hover:bg-violet-900/40 text-violet-200 border border-violet-900/30 text-xs font-semibold rounded-lg transition cursor-pointer"
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
              <div className="space-y-3 pt-4 border-t border-violet-900/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-violet-400" />
                      <span>Maintenance History</span>
                    </h3>
                    <p className="text-[11px] text-violet-300/70 mt-0.5">
                      Past completed and cancelled maintenance downtime logs
                    </p>
                  </div>

                  {schedules.filter((s) => s.status === 'completed' || s.status === 'cancelled').length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearMaintenanceHistory}
                      className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-white border border-rose-500/30 hover:bg-rose-600 rounded-xl transition cursor-pointer font-medium self-start sm:self-center shadow-xs"
                      title="Clear all past completed and cancelled maintenance records"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear History ({schedules.filter((s) => s.status === 'completed' || s.status === 'cancelled').length})</span>
                    </button>
                  )}
                </div>

                {schedules.filter((s) => s.status === 'completed' || s.status === 'cancelled').length === 0 ? (
                  <div className="p-4 text-center text-xs text-violet-300/60 bg-[#231C38] border border-violet-900/30 rounded-2xl">No past maintenance history records.</div>
                ) : (
                  <div className="bg-[#231C38] border border-violet-900/30 rounded-2xl overflow-hidden divide-y divide-violet-900/30 text-xs">
                    {schedules
                      .filter((s) => s.status === 'completed' || s.status === 'cancelled')
                      .map((sch) => (
                        <div key={sch._id} className="p-3.5 flex items-center justify-between hover:bg-[#1E1833] transition">
                          <div className="flex items-center space-x-3 min-w-0 pr-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              sch.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-[#19142B] text-violet-400 border border-violet-900/30'
                            }`}>
                              {sch.status}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-white truncate">{sch.title}</div>
                              <div className="text-[11px] text-violet-300/60 truncate font-mono">
                                {sch.scope === 'full_system' ? 'Full System' : `Partial (${(sch.affectedFeatures || []).join(', ')})`}
                                {' • '}
                                {new Date(sch.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 shrink-0">
                            <span className="text-[11px] text-violet-400/60 font-mono hidden md:inline">
                              {sch.completedAt ? `Ended ${new Date(sch.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteMaintenanceRecord(sch._id, sch.title)}
                              className="p-1.5 text-violet-400/60 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
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
            <div className="space-y-8 w-full">
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

          {/* Theme Tab — Unsaved Changes Floating Dock */}
          {themeHasChanges && activeTab === 'theme' && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1E1833]/95 backdrop-blur-xl border border-violet-500/40 shadow-2xl rounded-2xl px-4 py-2.5 flex items-center space-x-3 text-xs text-white animate-fadeIn">
              <div className="flex items-center space-x-2 pr-3 border-r border-violet-900/40">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_#FBBF24]" />
                <span className="font-semibold text-violet-200">Unsaved Changes</span>
              </div>
              <button type="button" onClick={() => setThemeForm({ ...savedThemeForm })} className="px-3.5 py-1.5 bg-[#231C38] hover:bg-[#2A2242] text-violet-300 hover:text-white rounded-xl border border-violet-900/30 transition cursor-pointer">
                Cancel / Discard
              </button>
              <button type="button" disabled={savingTheme} onClick={handleSaveTheme} className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-violet-900/50 flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer">
                {savingTheme ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{savingTheme ? 'Saving...' : 'Save & Publish'}</span>
              </button>
            </div>
          )}

          {/* TAB 7: SETTINGS & FEATURE FLAGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 w-full">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-violet-400" />
                  <span>System Feature Flags & Management</span>
                </h2>
                <p className="text-xs text-violet-300/70 mt-0.5">
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
                    },
                    {
                      key: 'allowOldDataRequests',
                      label: 'User Profile: Request Old/Deleted Account Data',
                      desc: 'Allows users with deleted or archived accounts in retention to request their historical data (chats, media, contacts) directly from their profile settings even after skipping initial onboarding import. When disabled, this option is completely hidden from user profiles.'
                    }
                  ]
                }
              ].map((grp) => (
                <div key={grp.category} className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-violet-300/60">
                    {grp.category}
                  </h3>
                  <div className="bg-[#231C38] border border-violet-900/30 rounded-2xl shadow-lg divide-y divide-violet-900/30 text-xs overflow-hidden">
                    {grp.items.map((feat) => {
                      const isEnabled = systemSettings?.featureFlags
                        ? systemSettings.featureFlags[feat.key] !== false
                        : true;

                      return (
                        <div key={feat.key} className="p-4 flex items-center justify-between hover:bg-[#1E1833] transition">
                          <div className="pr-4">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-sm text-white">
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
                            <div className="text-xs text-violet-300/70 mt-1">
                              {feat.desc}
                            </div>
                          </div>

                          <button
                            onClick={() => handleToggleFeature(feat.key, isEnabled)}
                            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                              isEnabled ? 'bg-gradient-to-r from-violet-600 to-purple-600' : 'bg-[#19142B] border border-violet-900/40'
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

              {/* ── LOADER / SPLASH SCREEN CONFIGURATOR ─────────────────────────── */}
              <div className="space-y-4 pt-4 border-t border-slate-800/80">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-emerald-400" />
                    <span>Intro Loader & Rain Stream Configuration</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Customize the cyber intro screen shown on application start — rain characters, visual theme, branding text, and split timing.
                  </p>
                </div>

                <div className="bg-[#0B0F19] border border-slate-800/80 rounded-2xl p-5 space-y-5 text-xs shadow-xl">

                  {/* Row 1: Style + Rain Characters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Rain Characters / Symbols</label>
                      <select
                        value={loaderForm.rainChars}
                        onChange={e => setLoaderForm(p => ({ ...p, rainChars: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/60 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
                      >
                        <option value="01">Binary (0 and 1)</option>
                        <option value="hex">Hexadecimal (0-9, A-F)</option>
                        <option value="katakana">Matrix Katakana (Japanese)</option>
                        <option value="symbols">Cyber Symbols (✦ ◈ ⬡ Ψ Ω)</option>
                        <option value="ascii">ASCII Art (@ # $ % & *)</option>
                        <option value="custom">Custom Characters / Emojis</option>
                      </select>
                    </div>

                    {loaderForm.rainChars === 'custom' && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Custom Characters</label>
                        <input
                          type="text"
                          value={loaderForm.customChars}
                          onChange={e => setLoaderForm(p => ({ ...p, customChars: e.target.value }))}
                          placeholder="e.g. ░▒▓█ or ABC or ✦✧◈"
                          className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/60 text-white placeholder-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        />
                      </div>
                    )}
                  </div>

                  {/* Row 2: Color Customization */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Color Palette & Laser Divide Glow</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { key: 'rainColor',     label: 'Stream Rain'    },
                        { key: 'rainGlowColor', label: 'Rain Glow'      },
                        { key: 'accentColor',   label: 'Brand / HUD'    },
                        { key: 'bgColor',       label: 'Background'     },
                      ].map(({ key, label }) => (
                        <div key={key} className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="color"
                              value={loaderForm[key]}
                              onChange={e => setLoaderForm(p => ({ ...p, [key]: e.target.value }))}
                              className="w-8 h-8 rounded-lg border border-slate-700 cursor-pointer bg-transparent p-0.5"
                            />
                            <input
                              type="text"
                              value={loaderForm[key]}
                              onChange={e => setLoaderForm(p => ({ ...p, [key]: e.target.value }))}
                              className="flex-1 min-w-0 px-2 py-1 bg-slate-900 border border-slate-800 text-white font-mono rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Row 3: Branding & Text Customization */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Brand Title <span className="normal-case text-slate-500 font-normal">(use | to split accent color, e.g. PULSE|CHAT)</span>
                      </label>
                      <input
                        type="text"
                        value={loaderForm.panelTitle}
                        onChange={e => setLoaderForm(p => ({ ...p, panelTitle: e.target.value }))}
                        placeholder="PULSE|CHAT"
                        className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/60 text-white placeholder-slate-600 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Subtitle / Matrix Tagline</label>
                      <input
                        type="text"
                        value={loaderForm.panelSubtitle}
                        onChange={e => setLoaderForm(p => ({ ...p, panelSubtitle: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/60 text-white placeholder-slate-600 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Security Badge Status Text</label>
                      <input
                        type="text"
                        value={loaderForm.securityBadge}
                        onChange={e => setLoaderForm(p => ({ ...p, securityBadge: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/60 text-white placeholder-slate-600 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      />
                    </div>
                  </div>

                  {/* Row 4: Status Messages (Phased loading steps) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Sequential Telemetry Messages <span className="normal-case text-slate-500 font-normal">(Phases: 0-30%, 30-60%, 60-85%, 85-99%, 100%)</span>
                    </label>
                    <div className="space-y-2">
                      {loaderForm.statusMessages.map((msg, i) => (
                        <div key={i} className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold text-slate-500 w-5 text-right shrink-0">{i + 1}.</span>
                          <input
                            type="text"
                            value={msg}
                            onChange={e => {
                              const next = [...loaderForm.statusMessages];
                              next[i] = e.target.value;
                              setLoaderForm(p => ({ ...p, statusMessages: next }));
                            }}
                            className="flex-1 px-3 py-1.5 bg-slate-900/80 border border-slate-700/60 text-white placeholder-slate-600 rounded-xl font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Row 5: Durations & Visual Toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Minimum Show Time (ms)</label>
                      <input
                        type="number"
                        min={500} max={10000} step={100}
                        value={loaderForm.minDuration}
                        onChange={e => setLoaderForm(p => ({ ...p, minDuration: +e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/60 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Split Divide Duration (ms)</label>
                      <input
                        type="number"
                        min={200} max={2500} step={50}
                        value={loaderForm.splitDuration}
                        onChange={e => setLoaderForm(p => ({ ...p, splitDuration: +e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/60 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      />
                    </div>
                    <div className="flex flex-col justify-center space-y-2.5 pt-2">
                      {[
                        { key: 'showBinaryTicker',  label: 'Live Binary Ticker' },
                        { key: 'showSecurityBadge', label: 'Bottom Security Badge' },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center space-x-2.5 cursor-pointer select-none">
                          <button
                            type="button"
                            onClick={() => setLoaderForm(p => ({ ...p, [key]: !p[key] }))}
                            className={`relative w-8 h-4.5 rounded-full transition cursor-pointer ${loaderForm[key] ? 'bg-emerald-600' : 'bg-slate-700'}`}
                          >
                            <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${loaderForm[key] ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                          <span className="text-slate-300 font-semibold text-[11px]">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Live Simulation Preview */}
                  <div
                    className="p-4 rounded-xl border border-slate-800 font-mono text-xs space-y-1.5 transition"
                    style={{ backgroundColor: loaderForm.bgColor }}
                  >
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Live Theme Preview</div>
                    <div className="text-base font-black tracking-widest" style={{ textShadow: `0 0 10px ${loaderForm.accentColor}` }}>
                      {loaderForm.panelTitle.includes('|') ? (
                        <>
                          <span className="text-white">{loaderForm.panelTitle.split('|')[0]}</span>
                          <span style={{ color: loaderForm.accentColor }}>{loaderForm.panelTitle.split('|')[1]}</span>
                        </>
                      ) : (
                        <span style={{ color: loaderForm.accentColor }}>{loaderForm.panelTitle}</span>
                      )}
                    </div>
                    <div className="text-[10px] tracking-wider" style={{ color: `${loaderForm.accentColor}cc` }}>
                      {loaderForm.panelSubtitle}
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden mt-2 border border-slate-800">
                      <div className="h-full w-2/3 rounded-full" style={{ backgroundColor: loaderForm.accentColor, boxShadow: `0 0 10px ${loaderForm.accentColor}` }} />
                    </div>
                    {loaderForm.showSecurityBadge && (
                      <div className="flex items-center space-x-1.5 pt-1 text-[10px] text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: loaderForm.accentColor }} />
                        <span>{loaderForm.securityBadge}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-3 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={handleSaveLoaderConfig}
                      disabled={loaderSaving}
                      className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                    >
                      {loaderSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>{loaderSaving ? 'Saving Changes...' : 'Save Intro Loader Settings'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoaderForm(DEFAULT_LOADER)}
                      className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                      Reset Defaults
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: STORAGE & DATABASE OPTIMIZATION */}
          {activeTab === 'storage' && (
            <StorageManagementTab authHeaders={authHeaders} showFeedback={showMsg} />
          )}

          {/* Loader Tab — Unsaved Changes Floating Dock */}
          {loaderHasChanges && activeTab === 'settings' && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1E1833]/95 backdrop-blur-xl border border-violet-500/40 shadow-2xl rounded-2xl px-4 py-2.5 flex items-center space-x-3 text-xs text-white animate-fadeIn">
              <div className="flex items-center space-x-2 pr-3 border-r border-violet-900/40">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_#FBBF24]" />
                <span className="font-semibold text-violet-200">Unsaved Changes</span>
              </div>
              <button type="button" onClick={() => setLoaderForm({ ...savedLoaderForm })} className="px-3.5 py-1.5 bg-[#231C38] hover:bg-[#2A2242] text-violet-300 hover:text-white rounded-xl border border-violet-900/30 transition cursor-pointer">
                Cancel / Discard
              </button>
              <button type="button" disabled={loaderSaving} onClick={handleSaveLoaderConfig} className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-violet-900/50 flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer">
                {loaderSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{loaderSaving ? 'Saving...' : 'Save & Publish'}</span>
              </button>
            </div>
          )}
        </main>
      </div>

      {/* CREATE ANNOUNCEMENT MODAL WITH DESIGN & POLL SUITE */}
      {announcementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl bg-[#0B0F19] rounded-3xl border border-slate-800/80 shadow-2xl p-4 sm:p-6 space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span>{editingAnnouncement ? 'Edit Announcement & Theme' : 'Create Rich Announcement'}</span>
                  {hasPoll && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300">
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
                className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/60 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center space-x-1 p-1 bg-slate-800/60 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setModalTab('content')}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                  modalTab === 'content'
                    ? 'bg-slate-700 text-indigo-400 shadow-xs'
                    : 'text-slate-400 hover:text-white'
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
                    ? 'bg-slate-700 text-indigo-400 shadow-xs'
                    : 'text-slate-400 hover:text-white'
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
                    ? 'bg-slate-700 text-indigo-400 shadow-xs'
                    : 'text-slate-400 hover:text-white'
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
                    <label className="block font-semibold mb-1 text-slate-300">
                      Announcement Title
                    </label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. PulseChat 2.0 Feature Release & Poll"
                      className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/60 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-300">
                      Message Content
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Detailed announcement description broadcasted to users..."
                      className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/60 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1 text-slate-300">
                        Category Type
                      </label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/60 text-white rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      >
                        <option value="info">Info (Standard)</option>
                        <option value="feature">New Feature (Highlight)</option>
                        <option value="warning">Warning (Caution)</option>
                        <option value="critical">Critical (Urgent)</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1 text-slate-300">
                        Audience Target
                      </label>
                      <select
                        value={newAudience}
                        onChange={(e) => setNewAudience(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/60 text-white rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
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
                    <label className="block font-semibold mb-2 text-slate-300">
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
                        { id: 'minimal-glass', label: 'Minimal Glass', class: 'bg-slate-800 border-slate-600 text-slate-200' }
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
                      <label className="block font-semibold mb-1 text-slate-300">
                        Typography Font
                      </label>
                      <select
                        value={designFont}
                        onChange={(e) => setDesignFont(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/60 text-white rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      >
                        <option value="sans">Modern Sans (Clean)</option>
                        <option value="serif">Editorial Serif (Prestigious)</option>
                        <option value="mono">Tech Mono (Code / Developer)</option>
                        <option value="display">Bold Display (Headline)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1 text-slate-300">
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
                                : 'bg-slate-800 hover:bg-slate-700'
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
                    <label className="block font-semibold mb-1 text-slate-300">
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
                              : 'bg-slate-900/80 border-slate-700/60 text-slate-400 hover:text-white'
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
                  <div className="p-3 bg-indigo-950/40 border border-indigo-900/60 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white flex items-center space-x-1.5">
                        <Vote className="w-4 h-4 text-indigo-400" />
                        <span>Embed Interactive Poll</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
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
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {hasPoll ? (
                    <div className="space-y-3 p-3 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                      <div>
                        <label className="block font-semibold mb-1 text-slate-300">
                          Poll Question
                        </label>
                        <input
                          type="text"
                          value={pollQuestion}
                          onChange={(e) => setPollQuestion(e.target.value)}
                          placeholder={newTitle || 'e.g. Which feature should we build next?'}
                          className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/60 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block font-semibold text-slate-300">
                          Poll Options (min 2, max 10)
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
                                  if (pollOptions.length < 10) {
                                    setPollOptions([...pollOptions, '']);
                                  }
                                }
                              }}
                              placeholder={`Option ${idx + 1}`}
                              className="flex-1 px-3 py-1.5 bg-slate-900/80 border border-slate-700/60 text-white placeholder-slate-500 rounded-xl"
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

                        {pollOptions.length < 10 && (
                          <button
                            type="button"
                            onClick={() => setPollOptions([...pollOptions, ''])}
                            className="text-xs font-semibold text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer pt-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Another Option</span>
                          </button>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-700/50 flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="allowMultiple"
                          checked={allowMultiple}
                          onChange={(e) => setAllowMultiple(e.target.checked)}
                          className="rounded text-indigo-600 cursor-pointer"
                        />
                        <label htmlFor="allowMultiple" className="font-semibold text-slate-300 cursor-pointer">
                          Allow users to select multiple options
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-500">
                      Toggle the switch above to attach a community poll to this announcement.
                    </div>
                  )}
                </div>
              )}

              {/* LIVE PREVIEW BOX */}
              <div className="mt-4 pt-3 border-t border-slate-800/60">
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
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                <div className="text-[11px] text-slate-500">
                  Target: <span className="font-semibold text-slate-300 uppercase">{newAudience}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAnnouncementModalOpen(false);
                      setEditingAnnouncement(null);
                    }}
                    className="px-4 py-2 text-slate-400 font-semibold hover:bg-slate-800/60 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingAnnouncement}
                    className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-sm flex items-center space-x-1.5 ${
                      isSavingAnnouncement
                        ? 'opacity-50 cursor-not-allowed pointer-events-none'
                        : 'cursor-pointer'
                    }`}
                  >
                    {isSavingAnnouncement ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{editingAnnouncement ? 'Save Changes' : 'Share / Publish Announcement'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE OFFICIAL STORY MODAL */}
      {createStoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-4xl bg-[#130E24] rounded-3xl border border-violet-900/50 shadow-2xl p-4 sm:p-6 space-y-4 max-h-[92vh] flex flex-col text-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-violet-900/40">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-600 to-fuchsia-600 flex items-center justify-center text-white shadow-md shadow-violet-950/60">
                  <CircleDashed className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>Create Official Pulse Story</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase tracking-wider">
                      Broadcast to All
                    </span>
                  </h3>
                  <p className="text-xs text-violet-300/60">
                    Stories broadcast to all users and appear in the existing PulseChat Stories section.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateStoryModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-violet-900/30 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Two-Column Form & Mockup Preview */}
            <form onSubmit={handlePublishAdminStory} className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
              {/* Left Column: Form Controls (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* 1. Publisher Display Name */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-300 text-xs">
                    Publisher Name (Author Display Name)
                  </label>
                  <input
                    type="text"
                    required
                    value={storyPublisherName}
                    onChange={(e) => setStoryPublisherName(e.target.value)}
                    placeholder="PulseChat"
                    className="w-full px-3.5 py-2.5 bg-[#1C1530] border border-violet-900/40 rounded-xl text-white placeholder-slate-500 font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                  <p className="text-[10px] text-violet-400/60">
                    Default is <strong className="text-violet-300">&quot;PulseChat&quot;</strong>. You can change this to any name you wish (e.g. Pulse Team, Security, System Updates).
                  </p>
                </div>

                {/* 2. Story Type Toggle */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-300 text-xs">
                    Story Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setStoryType('text')}
                      className={`py-2 px-3 rounded-xl font-bold transition flex items-center justify-center space-x-2 cursor-pointer border ${
                        storyType === 'text'
                          ? 'bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-950/50'
                          : 'bg-[#1C1530] text-slate-400 border-violet-900/30 hover:text-white'
                      }`}
                    >
                      <Type className="w-4 h-4" />
                      <span>Text Canvas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStoryType('media')}
                      className={`py-2 px-3 rounded-xl font-bold transition flex items-center justify-center space-x-2 cursor-pointer border ${
                        storyType === 'media'
                          ? 'bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-950/50'
                          : 'bg-[#1C1530] text-slate-400 border-violet-900/30 hover:text-white'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Media Image URL</span>
                    </button>
                  </div>
                </div>

                {/* Media URL if media type */}
                {storyType === 'media' && (
                  <div className="space-y-1 animate-fadeIn">
                    <label className="block font-bold text-slate-300 text-xs">
                      Media Image / Banner URL
                    </label>
                    <input
                      type="url"
                      required
                      value={storyMediaUrl}
                      onChange={(e) => setStoryMediaUrl(e.target.value)}
                      placeholder="https://example.com/story-banner.jpg"
                      className="w-full px-3.5 py-2.5 bg-[#1C1530] border border-violet-900/40 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    />
                  </div>
                )}

                {/* 3. Visual Background Designer */}
                {storyType === 'text' && (
                  <div className="space-y-2 p-3 bg-[#18112e] rounded-2xl border border-violet-900/40">
                    <div className="flex items-center justify-between pb-1.5 border-b border-violet-900/30">
                      <div className="flex items-center space-x-1.5 font-bold text-slate-200 text-xs">
                        <Palette className="w-3.5 h-3.5 text-violet-400" />
                        <span>Background Canvas</span>
                      </div>
                      <div className="flex items-center space-x-1 bg-[#130d24] p-0.5 rounded-lg border border-violet-900/40">
                        <button
                          type="button"
                          onClick={() => setStoryBgTab('presets')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                            storyBgTab === 'presets' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Presets
                        </button>
                        <button
                          type="button"
                          onClick={() => setStoryBgTab('gradient')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                            storyBgTab === 'gradient' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Gradient
                        </button>
                        <button
                          type="button"
                          onClick={() => setStoryBgTab('solid')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                            storyBgTab === 'solid' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Solid
                        </button>
                      </div>
                    </div>

                    {storyBgTab === 'presets' && (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-32 overflow-y-auto pr-1">
                        {PRESET_BACKGROUNDS.map((bg) => (
                          <button
                            key={bg.id}
                            type="button"
                            onClick={() => setStoryBgStyle(bg.style)}
                            className={`h-8 rounded-lg flex items-center justify-center font-bold text-[9px] text-white shadow-xs transition border relative cursor-pointer ${
                              storyBgStyle === bg.style ? 'border-white ring-2 ring-violet-400 scale-102' : 'border-transparent opacity-80 hover:opacity-100'
                            }`}
                            style={{ background: bg.style }}
                          >
                            {bg.label}
                            {storyBgStyle === bg.style && <Check className="w-3 h-3 absolute top-0.5 right-0.5" />}
                          </button>
                        ))}
                      </div>
                    )}

                    {storyBgTab === 'gradient' && (
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-300 mb-1">Color 1 (Start)</label>
                            <div className="flex items-center space-x-1.5 p-1 bg-[#1C1530] rounded-xl border border-violet-900/40">
                              <input
                                type="color"
                                value={storyCustomBg1}
                                onChange={(e) => {
                                  setStoryCustomBg1(e.target.value);
                                  setStoryBgStyle(`linear-gradient(${storyCustomBgAngle}deg, ${e.target.value} 0%, ${storyCustomBg2} 100%)`);
                                }}
                                className="w-6 h-6 rounded-lg border-0 cursor-pointer bg-transparent"
                              />
                              <span className="font-mono text-[10px] text-white uppercase">{storyCustomBg1}</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-300 mb-1">Color 2 (End)</label>
                            <div className="flex items-center space-x-1.5 p-1 bg-[#1C1530] rounded-xl border border-violet-900/40">
                              <input
                                type="color"
                                value={storyCustomBg2}
                                onChange={(e) => {
                                  setStoryCustomBg2(e.target.value);
                                  setStoryBgStyle(`linear-gradient(${storyCustomBgAngle}deg, ${storyCustomBg1} 0%, ${e.target.value} 100%)`);
                                }}
                                className="w-6 h-6 rounded-lg border-0 cursor-pointer bg-transparent"
                              />
                              <span className="font-mono text-[10px] text-white uppercase">{storyCustomBg2}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 mb-1">Angle / Direction</label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {[45, 90, 135, 180].map((deg) => (
                              <button
                                key={deg}
                                type="button"
                                onClick={() => {
                                  setStoryCustomBgAngle(deg);
                                  setStoryBgStyle(`linear-gradient(${deg}deg, ${storyCustomBg1} 0%, ${storyCustomBg2} 100%)`);
                                }}
                                className={`py-1 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                                  storyCustomBgAngle === deg ? 'bg-violet-600 text-white border-violet-400' : 'bg-[#1C1530] text-slate-300 border-violet-900/40 hover:bg-violet-900/30'
                                }`}
                              >
                                {deg}°
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {storyBgTab === 'solid' && (
                      <div className="space-y-1.5 text-xs">
                        <label className="block text-[10px] font-bold text-slate-300">Choose Solid Color</label>
                        <div className="flex items-center space-x-2 p-1.5 bg-[#1C1530] rounded-xl border border-violet-900/40">
                          <input
                            type="color"
                            value={storyCustomBgSolid}
                            onChange={(e) => {
                              setStoryCustomBgSolid(e.target.value);
                              setStoryBgStyle(e.target.value);
                            }}
                            className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={storyCustomBgSolid}
                            onChange={(e) => {
                              setStoryCustomBgSolid(e.target.value);
                              setStoryBgStyle(e.target.value);
                            }}
                            className="flex-1 bg-transparent text-white font-mono text-xs uppercase outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Text Color & Gradient Styling */}
                <div className="space-y-2 p-3 bg-[#18112e] rounded-2xl border border-violet-900/40">
                  <div className="flex items-center justify-between pb-1.5 border-b border-violet-900/30">
                    <div className="flex items-center space-x-1.5 font-bold text-slate-200 text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Text Color & Gradients</span>
                    </div>
                    <div className="flex items-center space-x-1 bg-[#130d24] p-0.5 rounded-lg border border-violet-900/40">
                      <button
                        type="button"
                        onClick={() => setStoryTextTab('presets')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          storyTextTab === 'presets' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Solid
                      </button>
                      <button
                        type="button"
                        onClick={() => setStoryTextTab('gradients')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          storyTextTab === 'gradients' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Gradient
                      </button>
                      <button
                        type="button"
                        onClick={() => setStoryTextTab('custom_color')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          storyTextTab === 'custom_color' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Custom
                      </button>
                      <button
                        type="button"
                        onClick={() => setStoryTextTab('custom_gradient')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          storyTextTab === 'custom_gradient' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Custom Grad
                      </button>
                    </div>
                  </div>

                  {storyTextTab === 'presets' && (
                    <div className="flex items-center justify-start flex-wrap gap-2 py-1">
                      {PRESET_TEXT_COLORS.map((col) => (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => {
                            setStoryTextColor(col.value);
                            setStoryTextGradient('');
                          }}
                          className={`w-7 h-7 rounded-full shadow-xs transition transform hover:scale-110 active:scale-95 border flex items-center justify-center cursor-pointer ${
                            storyTextColor === col.value && !storyTextGradient ? 'ring-2 ring-white border-white scale-110' : 'border-white/20'
                          }`}
                          style={{ background: col.value }}
                          title={col.label}
                        >
                          {storyTextColor === col.value && !storyTextGradient && (
                            <Check className={`w-3 h-3 stroke-[3] ${col.value === '#ffffff' || col.value === '#facc15' ? 'text-black' : 'text-white'}`} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {storyTextTab === 'gradients' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 py-1">
                      {PRESET_TEXT_GRADIENTS.map((grad) => (
                        <button
                          key={grad.id}
                          type="button"
                          onClick={() => {
                            setStoryTextGradient(grad.value);
                            setStoryTextColor(grad.value);
                          }}
                          className={`h-7 rounded-lg px-2 flex items-center justify-center font-black text-xs transition border cursor-pointer ${
                            storyTextGradient === grad.value ? 'ring-2 ring-white border-white' : 'border-white/20 hover:border-white/60'
                          }`}
                          style={{ background: grad.value, color: '#000000' }}
                        >
                          <span className="drop-shadow-sm font-extrabold text-[9px]">{grad.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {storyTextTab === 'custom_color' && (
                    <div className="space-y-1.5 text-xs">
                      <label className="block text-[10px] font-bold text-slate-300">Choose Custom Text Color</label>
                      <div className="flex items-center space-x-2 p-1.5 bg-[#1C1530] rounded-xl border border-violet-900/40">
                        <input
                          type="color"
                          value={storyCustomTextColor}
                          onChange={(e) => {
                            setStoryCustomTextColor(e.target.value);
                            setStoryTextColor(e.target.value);
                            setStoryTextGradient('');
                          }}
                          className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                        />
                        <input
                          type="text"
                          value={storyCustomTextColor}
                          onChange={(e) => {
                            setStoryCustomTextColor(e.target.value);
                            setStoryTextColor(e.target.value);
                            setStoryTextGradient('');
                          }}
                          className="flex-1 bg-transparent text-white font-mono text-xs uppercase outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {storyTextTab === 'custom_gradient' && (
                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 mb-1">Color 1 (Start)</label>
                          <div className="flex items-center space-x-1.5 p-1 bg-[#1C1530] rounded-xl border border-violet-900/40">
                            <input
                              type="color"
                              value={storyCustomText1}
                              onChange={(e) => {
                                setStoryCustomText1(e.target.value);
                                const grad = `linear-gradient(${storyCustomTextAngle}deg, ${e.target.value} 0%, ${storyCustomText2} 100%)`;
                                setStoryTextGradient(grad);
                                setStoryTextColor(grad);
                              }}
                              className="w-6 h-6 rounded-lg border-0 cursor-pointer bg-transparent"
                            />
                            <span className="font-mono text-[10px] text-white uppercase">{storyCustomText1}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 mb-1">Color 2 (End)</label>
                          <div className="flex items-center space-x-1.5 p-1 bg-[#1C1530] rounded-xl border border-violet-900/40">
                            <input
                              type="color"
                              value={storyCustomText2}
                              onChange={(e) => {
                                setStoryCustomText2(e.target.value);
                                const grad = `linear-gradient(${storyCustomTextAngle}deg, ${storyCustomText1} 0%, ${e.target.value} 100%)`;
                                setStoryTextGradient(grad);
                                setStoryTextColor(grad);
                              }}
                              className="w-6 h-6 rounded-lg border-0 cursor-pointer bg-transparent"
                            />
                            <span className="font-mono text-[10px] text-white uppercase">{storyCustomText2}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">Angle / Direction</label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[45, 90, 135, 180].map((deg) => (
                            <button
                              key={deg}
                              type="button"
                              onClick={() => {
                                setStoryCustomTextAngle(deg);
                                const grad = `linear-gradient(${deg}deg, ${storyCustomText1} 0%, ${storyCustomText2} 100%)`;
                                setStoryTextGradient(grad);
                                setStoryTextColor(grad);
                              }}
                              className={`py-1 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                                storyCustomTextAngle === deg ? 'bg-violet-600 text-white border-violet-400' : 'bg-[#1C1530] text-slate-300 border-violet-900/40 hover:bg-violet-900/30'
                              }`}
                            >
                              {deg}°
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Typography Font, Bold/Italic & Duration */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-300 text-xs">Typography</label>
                    <select
                      value={storyFont}
                      onChange={(e) => setStoryFont(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1C1530] border border-violet-900/40 rounded-xl text-white font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    >
                      <option value="sans">Modern Sans</option>
                      <option value="serif">Editorial Serif</option>
                      <option value="mono">Tech Mono</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-300 text-xs">Formatting</label>
                    <div className="flex items-center space-x-1.5 h-[38px]">
                      <button
                        type="button"
                        onClick={() => setStoryIsBold(!storyIsBold)}
                        className={`flex-1 h-full rounded-xl flex items-center justify-center font-bold text-xs border transition cursor-pointer ${
                          storyIsBold ? 'bg-violet-600 border-violet-400 text-white' : 'bg-[#1C1530] border-violet-900/40 text-slate-300 hover:text-white'
                        }`}
                        title="Toggle Bold"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setStoryIsItalic(!storyIsItalic)}
                        className={`flex-1 h-full rounded-xl flex items-center justify-center font-bold text-xs border transition cursor-pointer ${
                          storyIsItalic ? 'bg-violet-600 border-violet-400 text-white' : 'bg-[#1C1530] border-violet-900/40 text-slate-300 hover:text-white'
                        }`}
                        title="Toggle Italic"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-300 text-xs">Duration</label>
                    <select
                      value={storyDurationHours}
                      onChange={(e) => setStoryDurationHours(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#1C1530] border border-violet-900/40 rounded-xl text-white font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    >
                      <option value={24}>24 Hours</option>
                      <option value={48}>48 Hours</option>
                      <option value={72}>72 Hours</option>
                      <option value={168}>7 Days</option>
                    </select>
                  </div>
                </div>

                {/* 5. Story Text / Message */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-300 text-xs">
                      Story Message Text
                    </label>
                    <span className="text-[10px] text-violet-400 font-mono">{storyText.length}/700</span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={700}
                    value={storyText}
                    onChange={(e) => setStoryText(e.target.value)}
                    placeholder="Enter the official story announcement text..."
                    className="w-full px-3.5 py-2.5 bg-[#1C1530] border border-violet-900/40 rounded-xl text-white placeholder-slate-500 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>

                {/* 6. Community Poll Embed */}
                <div className="p-3.5 rounded-2xl bg-[#1C1530] border border-violet-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white flex items-center space-x-1.5">
                        <Vote className="w-4 h-4 text-purple-400" />
                        <span>Embed Interactive Poll</span>
                      </div>
                      <div className="text-[10px] text-violet-300/60">
                        Allow users to vote in a live poll attached to this story
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={storyHasPoll}
                        onChange={(e) => setStoryHasPoll(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                    </label>
                  </div>

                  {storyHasPoll && (
                    <div className="space-y-2.5 pt-2 border-t border-violet-900/30 animate-fadeIn">
                      <div>
                        <label className="block font-semibold text-slate-300 text-[11px] mb-1">
                          Poll Question
                        </label>
                        <input
                          type="text"
                          value={storyPollQuestion}
                          onChange={(e) => setStoryPollQuestion(e.target.value)}
                          placeholder="e.g. Which platform feature should we prioritize?"
                          className="w-full px-3 py-1.5 bg-[#130E24] border border-violet-900/40 rounded-xl text-white text-xs focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-semibold text-slate-300 text-[11px]">
                          Options (min 2, max 6)
                        </label>
                        {storyPollOptions.map((opt, i) => (
                          <div key={i} className="flex items-center space-x-1.5">
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const next = [...storyPollOptions];
                                next[i] = e.target.value;
                                setStoryPollOptions(next);
                              }}
                              placeholder={`Option ${i + 1}`}
                              className="flex-1 px-3 py-1.5 bg-[#130E24] border border-violet-900/40 rounded-xl text-white text-xs"
                            />
                            {storyPollOptions.length > 2 && (
                              <button
                                type="button"
                                onClick={() => setStoryPollOptions(storyPollOptions.filter((_, idx) => idx !== i))}
                                className="p-1.5 text-rose-400 hover:text-rose-200 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}

                        {storyPollOptions.length < 6 && (
                          <button
                            type="button"
                            onClick={() => setStoryPollOptions([...storyPollOptions, ''])}
                            className="text-[11px] text-violet-400 hover:text-violet-300 font-bold flex items-center space-x-1 cursor-pointer pt-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Poll Option</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Live Mobile Mockup Preview (5 cols) */}
              <div className="lg:col-span-5 flex flex-col items-center justify-start space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-violet-300 flex items-center space-x-1.5 self-start">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Live User App Preview</span>
                </div>

                {/* Mockup Frame */}
                <div
                  className="w-full max-w-[280px] h-[480px] rounded-[36px] border-4 border-slate-700/80 shadow-2xl relative overflow-hidden flex flex-col justify-between p-4 transition-all duration-300 select-none"
                  style={{
                    background:
                      storyType === 'media' && storyMediaUrl
                        ? `url("${storyMediaUrl}") center/cover no-repeat`
                        : storyBgStyle
                  }}
                >
                  {/* Top Bar inside mockup */}
                  <div className="space-y-2 relative z-10">
                    {/* Story progress bar */}
                    <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
                      <div className="w-1/2 h-full bg-white rounded-full animate-pulse" />
                    </div>

                    {/* Author & official badge */}
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-900 border border-white/30 flex items-center justify-center shrink-0">
                        <img
                          src={
                            (storyPublisherAvatar && !storyPublisherAvatar.includes('1618005182384'))
                              ? storyPublisherAvatar
                              : '/icons/icon-192.png'
                          }
                          alt="PulseChat"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/icons/icon.svg';
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-[11px] text-white flex items-center space-x-1 truncate">
                          <span>{storyPublisherName || 'PulseChat'}</span>
                          <span className="px-1 py-0.2 rounded-full text-[7px] bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold">
                            OFFICIAL
                          </span>
                        </div>
                        <div className="text-[9px] text-white/70">Just now · 24h</div>
                      </div>
                    </div>
                  </div>

                  {/* Story Text / Poll content inside mockup */}
                  <div className="flex-1 flex flex-col justify-center items-center text-center my-3 relative z-10 px-2 space-y-2">
                    <p
                      className={`text-sm leading-snug drop-shadow-md ${
                        storyFont === 'serif' ? 'font-serif' : storyFont === 'mono' ? 'font-mono' : 'font-sans'
                      } ${storyIsBold ? 'font-bold' : 'font-normal'} ${storyIsItalic ? 'italic' : 'not-italic'}`}
                      style={getStoryTextStyle({ textColor: storyTextColor, textGradient: storyTextGradient, bold: storyIsBold, italic: storyIsItalic })}
                    >
                      {storyText || 'Story text preview will render here...'}
                    </p>

                    {storyHasPoll && (
                      <div className="w-full p-2.5 rounded-2xl bg-black/50 backdrop-blur-md border border-white/20 text-left space-y-1.5 shadow-lg">
                        <div className="text-[10px] font-bold text-white flex items-center space-x-1">
                          <Vote className="w-3 h-3 text-purple-300" />
                          <span className="truncate">{storyPollQuestion || storyText || 'Official Poll'}</span>
                        </div>
                        <div className="space-y-1">
                          {storyPollOptions.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className="h-6 rounded-lg bg-white/10 px-2 flex items-center justify-between text-[9px] text-white"
                            >
                              <span className="truncate">{opt || `Option ${oIdx + 1}`}</span>
                              <span className="font-mono opacity-70">0%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom reaction bar inside mockup */}
                  <div className="flex items-center justify-between text-white/80 pt-2 border-t border-white/20 relative z-10">
                    <div className="flex items-center space-x-1 text-sm">
                      <span>❤️</span>
                      <span>😂</span>
                      <span>🔥</span>
                      <span>👏</span>
                    </div>
                    <span className="text-[9px] font-bold text-white/90">Reply</span>
                  </div>
                </div>
              </div>

              {/* Form Action Controls */}
              <div className="lg:col-span-12 flex items-center justify-between pt-3 border-t border-violet-900/40">
                <div className="text-[11px] text-violet-400/80">
                  Visible to: <strong className="text-white">All PulseChat Members</strong> · Disappearing Story
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setCreateStoryModalOpen(false)}
                    className="px-4 py-2 text-violet-300 hover:text-white hover:bg-violet-900/30 font-semibold rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPublishingStory}
                    className={`px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-violet-950/60 flex items-center space-x-2 ${
                      isPublishingStory ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer active:scale-95'
                    }`}
                  >
                    {isPublishingStory ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Publish Official Story</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT STORY ENGAGEMENT MODAL */}
      {storyInspectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#16102B] rounded-3xl border border-violet-900/50 shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-violet-900/30">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Story Engagement</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-violet-600 text-white font-bold">
                    {storyInspectModal.officialAuthorName || 'PulseChat'}
                  </span>
                </h3>
                <p className="text-[11px] text-violet-300/60">
                  {storyInspectModal.viewers?.length || 0} total views · {storyInspectModal.reactions?.length || 0} reactions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStoryInspectModal(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-violet-900/30 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Poll breakdown if present */}
              {storyInspectModal.hasPoll && storyInspectModal.poll && (
                <div className="p-3 rounded-2xl bg-[#1F1738] border border-violet-900/30 space-y-2">
                  <div className="font-bold text-violet-300 flex items-center space-x-1.5">
                    <Vote className="w-3.5 h-3.5" />
                    <span>{storyInspectModal.poll.question || 'Poll Results'}</span>
                  </div>
                  <div className="space-y-1.5">
                    {(storyInspectModal.poll.options || []).map((opt, idx) => {
                      const count = opt.votes?.length || 0;
                      return (
                        <div key={idx} className="p-2 rounded-xl bg-[#140E26] flex items-center justify-between text-xs">
                          <span className="font-medium text-white">{opt.text}</span>
                          <span className="font-mono text-violet-400 font-bold">{count} vote{count === 1 ? '' : 's'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Viewers List */}
              <div className="space-y-2">
                <div className="font-bold text-slate-300 text-xs flex items-center space-x-1.5">
                  <Eye className="w-3.5 h-3.5 text-violet-400" />
                  <span>Viewers ({storyInspectModal.viewers?.length || 0})</span>
                </div>
                {(!storyInspectModal.viewers || storyInspectModal.viewers.length === 0) ? (
                  <div className="py-6 text-center text-slate-500 text-xs">No user views recorded yet.</div>
                ) : (
                  <div className="space-y-1">
                    {storyInspectModal.viewers.map((v, i) => (
                      <div key={i} className="p-2 rounded-xl bg-[#1F1738] flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Avatar src={v.user?.avatar} name={v.user?.nickname || v.user?.username || 'User'} size="sm" />
                          <div>
                            <div className="font-bold text-white text-xs">{v.user?.nickname || v.user?.username || 'Member'}</div>
                            <div className="text-[10px] text-violet-400/60 font-mono">@{v.user?.username}</div>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(v.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reactions List */}
              {storyInspectModal.reactions && storyInspectModal.reactions.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-violet-900/30">
                  <div className="font-bold text-slate-300 text-xs flex items-center space-x-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-400" />
                    <span>Reactions ({storyInspectModal.reactions.length})</span>
                  </div>
                  <div className="space-y-1">
                    {storyInspectModal.reactions.map((r, i) => (
                      <div key={i} className="p-2 rounded-xl bg-[#1F1738] flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Avatar src={r.user?.avatar} name={r.user?.nickname || r.user?.username || 'User'} size="sm" />
                          <span className="font-bold text-white text-xs">{r.user?.nickname || r.user?.username}</span>
                        </div>
                        <span className="text-base">{r.emoji}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Collaborative Edit Story Modal */}
      {editStoryModalOpen && editingStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xl bg-[#130E24] rounded-3xl border border-violet-900/50 shadow-2xl p-5 space-y-4 max-h-[92vh] flex flex-col text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-violet-900/40">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-300">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit Official Story</h3>
                  <p className="text-xs text-violet-300/60">Collaborative update — changes sync to all admins and users in real time</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setEditStoryModalOpen(false); setEditingStory(null); }}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-violet-900/30 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStory} className="space-y-4 overflow-y-auto pr-1 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Publisher Display Name</label>
                <input
                  type="text"
                  value={editStoryAuthor}
                  onChange={(e) => setEditStoryAuthor(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#1C1530] border border-violet-900/40 rounded-xl text-white font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  placeholder="PulseChat"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Story Text</label>
                <textarea
                  rows={3}
                  value={editStoryText}
                  onChange={(e) => setEditStoryText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#1C1530] border border-violet-900/40 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                  placeholder="Official story text..."
                />
              </div>

              {editingStory.type === 'media' && (
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Media Image URL</label>
                  <input
                    type="url"
                    value={editStoryMediaUrl}
                    onChange={(e) => setEditStoryMediaUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#1C1530] border border-violet-900/40 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    placeholder="https://..."
                  />
                </div>
              )}

              {/* Typography & Formatting for Edit */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-300">Typography</label>
                  <select
                    value={editStoryFont}
                    onChange={(e) => setEditStoryFont(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1C1530] border border-violet-900/40 rounded-xl text-white font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  >
                    <option value="sans">Modern Sans</option>
                    <option value="serif">Editorial Serif</option>
                    <option value="mono">Tech Mono</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block font-bold text-slate-300">Formatting</label>
                  <div className="flex items-center space-x-1.5 h-[38px]">
                    <button
                      type="button"
                      onClick={() => setEditStoryIsBold(!editStoryIsBold)}
                      className={`flex-1 h-full rounded-xl flex items-center justify-center font-bold text-xs border transition cursor-pointer ${
                        editStoryIsBold ? 'bg-violet-600 border-violet-400 text-white' : 'bg-[#1C1530] border-violet-900/40 text-slate-300 hover:text-white'
                      }`}
                      title="Toggle Bold"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditStoryIsItalic(!editStoryIsItalic)}
                      className={`flex-1 h-full rounded-xl flex items-center justify-center font-bold text-xs border transition cursor-pointer ${
                        editStoryIsItalic ? 'bg-violet-600 border-violet-400 text-white' : 'bg-[#1C1530] border-violet-900/40 text-slate-300 hover:text-white'
                      }`}
                      title="Toggle Italic"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Background Designer for Edit */}
              <div className="space-y-2 p-3 bg-[#18112e] rounded-2xl border border-violet-900/40">
                <div className="flex items-center justify-between pb-1.5 border-b border-violet-900/30">
                  <div className="flex items-center space-x-1.5 font-bold text-slate-200 text-xs">
                    <Palette className="w-3.5 h-3.5 text-violet-400" />
                    <span>Background Canvas</span>
                  </div>
                  <div className="flex items-center space-x-1 bg-[#130d24] p-0.5 rounded-lg border border-violet-900/40">
                    <button
                      type="button"
                      onClick={() => setEditStoryBgTab('presets')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                        editStoryBgTab === 'presets' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Presets
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditStoryBgTab('gradient')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                        editStoryBgTab === 'gradient' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Gradient
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditStoryBgTab('solid')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                        editStoryBgTab === 'solid' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Solid
                    </button>
                  </div>
                </div>

                {editStoryBgTab === 'presets' && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {PRESET_BACKGROUNDS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setEditStoryBg(preset.style)}
                        className={`h-8 rounded-lg flex items-center justify-center font-bold text-[9px] text-white shadow-xs transition border relative cursor-pointer ${
                          editStoryBg === preset.style ? 'border-white ring-2 ring-violet-500 scale-102' : 'border-transparent opacity-80 hover:opacity-100'
                        }`}
                        style={{ background: preset.style }}
                      >
                        {preset.label}
                        {editStoryBg === preset.style && <Check className="w-3 h-3 absolute top-0.5 right-0.5" />}
                      </button>
                    ))}
                  </div>
                )}

                {editStoryBgTab === 'gradient' && (
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">Color 1 (Start)</label>
                        <div className="flex items-center space-x-1.5 p-1 bg-[#1C1530] rounded-xl border border-violet-900/40">
                          <input
                            type="color"
                            value={editStoryCustomBg1}
                            onChange={(e) => {
                              setEditStoryCustomBg1(e.target.value);
                              setEditStoryBg(`linear-gradient(${editStoryCustomBgAngle}deg, ${e.target.value} 0%, ${editStoryCustomBg2} 100%)`);
                            }}
                            className="w-6 h-6 rounded-lg border-0 cursor-pointer bg-transparent"
                          />
                          <span className="font-mono text-[10px] text-white uppercase">{editStoryCustomBg1}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">Color 2 (End)</label>
                        <div className="flex items-center space-x-1.5 p-1 bg-[#1C1530] rounded-xl border border-violet-900/40">
                          <input
                            type="color"
                            value={editStoryCustomBg2}
                            onChange={(e) => {
                              setEditStoryCustomBg2(e.target.value);
                              setEditStoryBg(`linear-gradient(${editStoryCustomBgAngle}deg, ${editStoryCustomBg1} 0%, ${e.target.value} 100%)`);
                            }}
                            className="w-6 h-6 rounded-lg border-0 cursor-pointer bg-transparent"
                          />
                          <span className="font-mono text-[10px] text-white uppercase">{editStoryCustomBg2}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">Angle / Direction</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[45, 90, 135, 180].map((deg) => (
                          <button
                            key={deg}
                            type="button"
                            onClick={() => {
                              setEditStoryCustomBgAngle(deg);
                              setEditStoryBg(`linear-gradient(${deg}deg, ${editStoryCustomBg1} 0%, ${editStoryCustomBg2} 100%)`);
                            }}
                            className={`py-1 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                              editStoryCustomBgAngle === deg ? 'bg-violet-600 text-white border-violet-400' : 'bg-[#1C1530] text-slate-300 border-violet-900/40 hover:bg-violet-900/30'
                            }`}
                          >
                            {deg}°
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {editStoryBgTab === 'solid' && (
                  <div className="space-y-1.5 text-xs">
                    <label className="block text-[10px] font-bold text-slate-300">Choose Solid Color</label>
                    <div className="flex items-center space-x-2 p-1.5 bg-[#1C1530] rounded-xl border border-violet-900/40">
                      <input
                        type="color"
                        value={editStoryCustomBgSolid}
                        onChange={(e) => {
                          setEditStoryCustomBgSolid(e.target.value);
                          setEditStoryBg(e.target.value);
                        }}
                        className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={editStoryCustomBgSolid}
                        onChange={(e) => {
                          setEditStoryCustomBgSolid(e.target.value);
                          setEditStoryBg(e.target.value);
                        }}
                        className="flex-1 bg-transparent text-white font-mono text-xs uppercase outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Text Color & Gradient Styling for Edit */}
              <div className="space-y-2 p-3 bg-[#18112e] rounded-2xl border border-violet-900/40">
                <div className="flex items-center justify-between pb-1.5 border-b border-violet-900/30">
                  <div className="flex items-center space-x-1.5 font-bold text-slate-200 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Text Color & Gradients</span>
                  </div>
                  <div className="flex items-center space-x-1 bg-[#130d24] p-0.5 rounded-lg border border-violet-900/40">
                    <button
                      type="button"
                      onClick={() => setEditStoryTextTab('presets')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                        editStoryTextTab === 'presets' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Solid
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditStoryTextTab('gradients')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                        editStoryTextTab === 'gradients' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Gradient
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditStoryTextTab('custom_color')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                        editStoryTextTab === 'custom_color' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Custom
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditStoryTextTab('custom_gradient')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                        editStoryTextTab === 'custom_gradient' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Custom Grad
                    </button>
                  </div>
                </div>

                {editStoryTextTab === 'presets' && (
                  <div className="flex items-center justify-start flex-wrap gap-2 py-1">
                    {PRESET_TEXT_COLORS.map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => {
                          setEditStoryTextColor(col.value);
                          setEditStoryTextGradient('');
                        }}
                        className={`w-7 h-7 rounded-full shadow-xs transition transform hover:scale-110 active:scale-95 border flex items-center justify-center cursor-pointer ${
                          editStoryTextColor === col.value && !editStoryTextGradient ? 'ring-2 ring-white border-white scale-110' : 'border-white/20'
                        }`}
                        style={{ background: col.value }}
                        title={col.label}
                      >
                        {editStoryTextColor === col.value && !editStoryTextGradient && (
                          <Check className={`w-3 h-3 stroke-[3] ${col.value === '#ffffff' || col.value === '#facc15' ? 'text-black' : 'text-white'}`} />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {editStoryTextTab === 'gradients' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 py-1">
                    {PRESET_TEXT_GRADIENTS.map((grad) => (
                      <button
                        key={grad.id}
                        type="button"
                        onClick={() => {
                          setEditStoryTextGradient(grad.value);
                          setEditStoryTextColor(grad.value);
                        }}
                        className={`h-7 rounded-lg px-2 flex items-center justify-center font-black text-xs transition border cursor-pointer ${
                          editStoryTextGradient === grad.value ? 'ring-2 ring-white border-white' : 'border-white/20 hover:border-white/60'
                        }`}
                        style={{ background: grad.value, color: '#000000' }}
                      >
                        <span className="drop-shadow-sm font-extrabold text-[9px]">{grad.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {editStoryTextTab === 'custom_color' && (
                  <div className="space-y-1.5 text-xs">
                    <label className="block text-[10px] font-bold text-slate-300">Choose Custom Text Color</label>
                    <div className="flex items-center space-x-2 p-1.5 bg-[#1C1530] rounded-xl border border-violet-900/40">
                      <input
                        type="color"
                        value={editStoryCustomTextColor}
                        onChange={(e) => {
                          setEditStoryCustomTextColor(e.target.value);
                          setEditStoryTextColor(e.target.value);
                          setEditStoryTextGradient('');
                        }}
                        className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={editStoryCustomTextColor}
                        onChange={(e) => {
                          setEditStoryCustomTextColor(e.target.value);
                          setEditStoryTextColor(e.target.value);
                          setEditStoryTextGradient('');
                        }}
                        className="flex-1 bg-transparent text-white font-mono text-xs uppercase outline-none"
                      />
                    </div>
                  </div>
                )}

                {editStoryTextTab === 'custom_gradient' && (
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">Color 1 (Start)</label>
                        <div className="flex items-center space-x-1.5 p-1 bg-[#1C1530] rounded-xl border border-violet-900/40">
                          <input
                            type="color"
                            value={editStoryCustomText1}
                            onChange={(e) => {
                              setEditStoryCustomText1(e.target.value);
                              const grad = `linear-gradient(${editStoryCustomTextAngle}deg, ${e.target.value} 0%, ${editStoryCustomText2} 100%)`;
                              setEditStoryTextGradient(grad);
                              setEditStoryTextColor(grad);
                            }}
                            className="w-6 h-6 rounded-lg border-0 cursor-pointer bg-transparent"
                          />
                          <span className="font-mono text-[10px] text-white uppercase">{editStoryCustomText1}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">Color 2 (End)</label>
                        <div className="flex items-center space-x-1.5 p-1 bg-[#1C1530] rounded-xl border border-violet-900/40">
                          <input
                            type="color"
                            value={editStoryCustomText2}
                            onChange={(e) => {
                              setEditStoryCustomText2(e.target.value);
                              const grad = `linear-gradient(${editStoryCustomTextAngle}deg, ${editStoryCustomText1} 0%, ${e.target.value} 100%)`;
                              setEditStoryTextGradient(grad);
                              setEditStoryTextColor(grad);
                            }}
                            className="w-6 h-6 rounded-lg border-0 cursor-pointer bg-transparent"
                          />
                          <span className="font-mono text-[10px] text-white uppercase">{editStoryCustomText2}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">Angle / Direction</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[45, 90, 135, 180].map((deg) => (
                          <button
                            key={deg}
                            type="button"
                            onClick={() => {
                              setEditStoryCustomTextAngle(deg);
                              const grad = `linear-gradient(${deg}deg, ${editStoryCustomText1} 0%, ${editStoryCustomText2} 100%)`;
                              setEditStoryTextGradient(grad);
                              setEditStoryTextColor(grad);
                            }}
                            className={`py-1 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                              editStoryCustomTextAngle === deg ? 'bg-violet-600 text-white border-violet-400' : 'bg-[#1C1530] text-slate-300 border-violet-900/40 hover:bg-violet-900/30'
                            }`}
                          >
                            {deg}°
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Mini Preview inside Edit Modal */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-300 text-xs">Live Edit Preview</label>
                <div
                  className="w-full h-32 rounded-2xl p-4 flex flex-col justify-center items-center text-center relative overflow-hidden select-none border border-violet-900/40 shadow-inner"
                  style={{
                    background:
                      editingStory.type === 'media' && editStoryMediaUrl
                        ? `url("${editStoryMediaUrl}") center/cover no-repeat`
                        : editStoryBg
                  }}
                >
                  <p
                    className={`text-sm leading-snug drop-shadow-md line-clamp-3 ${
                      editStoryFont === 'serif' ? 'font-serif' : editStoryFont === 'mono' ? 'font-mono' : 'font-sans'
                    } ${editStoryIsBold ? 'font-bold' : 'font-normal'} ${editStoryIsItalic ? 'italic' : 'not-italic'}`}
                    style={getStoryTextStyle({
                      textColor: editStoryTextColor,
                      textGradient: editStoryTextGradient,
                      bold: editStoryIsBold,
                      italic: editStoryIsItalic
                    })}
                  >
                    {editStoryText || 'Story text preview...'}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-violet-900/30">
                <button
                  type="button"
                  onClick={() => { setEditStoryModalOpen(false); setEditingStory(null); }}
                  className="px-4 py-2 bg-[#231C38] hover:bg-[#2A2242] text-violet-300 rounded-xl font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditStory}
                  className="px-5 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {savingEditStory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Conversation Thread Modal */}
      {officialReplyModalOpen && activeReplyUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl bg-[#130E24] rounded-3xl border border-violet-900/50 shadow-2xl p-4 sm:p-6 space-y-4 max-h-[92vh] flex flex-col text-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-violet-900/40">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 via-purple-600 to-fuchsia-600 p-[1.5px] shrink-0">
                  <div className="w-full h-full rounded-full bg-[#1C1530] flex items-center justify-center font-bold text-white text-xs overflow-hidden">
                    {activeReplyUser.avatar ? (
                      <img src={activeReplyUser.avatar} alt={activeReplyUser.username} className="w-full h-full object-cover" />
                    ) : (
                      (activeReplyUser.nickname || activeReplyUser.username || 'U')[0]?.toUpperCase()
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white truncate">
                      {activeReplyUser.nickname || activeReplyUser.username}
                    </h3>
                    {activeReplyUser.username && (
                      <span className="text-xs text-violet-400/60 font-mono">
                        @{activeReplyUser.username}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white uppercase tracking-wider shrink-0">
                      Official Thread
                    </span>
                  </div>
                  <p className="text-[11px] text-violet-300/60 truncate">
                    {activeReplyUser.email || 'PulseChat User'} · Unified Official Responses
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                {activeReplyConvId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteAdminConversation(activeReplyConvId)}
                    className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                    title="Delete Conversation History"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setOfficialReplyModalOpen(false); setActiveReplyUser(null); }}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-violet-900/30 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Story Context Banner */}
            {activeReplyStory && (
              <div className="p-2.5 rounded-2xl bg-[#1C1530] border border-violet-900/40 flex items-center space-x-3 shrink-0">
                {activeReplyStory.mediaUrl ? (
                  <img
                    src={activeReplyStory.mediaUrl}
                    alt="Story"
                    className="w-10 h-10 rounded-xl object-cover border border-violet-800/40 shrink-0"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-[9px] font-black uppercase text-white shrink-0"
                    style={{ background: activeReplyStory.style?.background || 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
                  >
                    Story
                  </div>
                )}
                <div className="min-w-0 flex-1 text-xs">
                  <div className="font-bold text-violet-300 flex items-center space-x-1.5 text-[10px]">
                    <span>Original Story: {activeReplyStory.officialAuthorName || 'PulseChat'}</span>
                    <span className="px-1 py-0.2 rounded text-[8px] bg-violet-500/20 text-violet-300 border border-violet-500/30 font-bold uppercase">
                      Reference
                    </span>
                  </div>
                  <p className="text-violet-200/80 line-clamp-1 text-[11px] mt-0.5">
                    {activeReplyStory.text || (activeReplyStory.mediaUrl ? 'Photo / Media' : 'Story Content')}
                  </p>
                </div>
              </div>
            )}

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto space-y-3 p-3 rounded-2xl bg-[#0D091A] border border-violet-900/30 min-h-[260px] max-h-[380px]">
              {loadingOfficialConv ? (
                <div className="py-12 flex flex-col items-center justify-center text-violet-400/60 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                  <span className="text-xs">Loading official conversation history...</span>
                </div>
              ) : officialConvMessages.length === 0 ? (
                <div className="py-12 text-center text-violet-400/50 text-xs">
                  No previous messages in this official conversation. Type below to send the first response!
                </div>
              ) : (
                officialConvMessages.map((msg, mIdx) => {
                  const isFromOfficial = Boolean(msg.isOfficialResponse || msg.sender?.isOfficial || (msg.sender?.username || '').toLowerCase() === 'pulsechat_official');

                  return (
                    <div
                      key={msg._id || mIdx}
                      className={`flex flex-col ${isFromOfficial ? 'items-end' : 'items-start'}`}
                    >
                      {/* Sender label */}
                      <span className="text-[10px] text-violet-400/60 font-semibold mb-1 px-1">
                        {isFromOfficial ? 'PulseChat Official' : activeReplyUser.nickname || activeReplyUser.username}
                      </span>

                      {/* Bubble */}
                      <div
                        className={`max-w-[82%] rounded-2xl p-3 text-xs leading-relaxed shadow-md ${
                          isFromOfficial
                            ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-tr-xs'
                            : 'bg-[#1C1530] text-violet-100 border border-violet-900/50 rounded-tl-xs'
                        }`}
                      >
                        {/* Story reply banner if attached */}
                        {msg.storyReply && (
                          <div className="mb-2 p-2 rounded-xl bg-black/30 border border-white/10 text-[10px]">
                            <div className="font-bold text-violet-300">Replied to Story:</div>
                            <div className="text-white/80 line-clamp-1">{msg.storyReply.storyText || 'Media Story'}</div>
                          </div>
                        )}
                        <OfficialMessageContent message={msg} conversationId={activeReplyConvId} />
                        <div className="flex items-center justify-end space-x-1.5 mt-1 text-[9px] opacity-75 font-mono">
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      {/* Internal Admin Audit Badge (Visible only to admins) */}
                      {isFromOfficial && msg.adminResponder && (
                        <div className="text-[9px] text-violet-400/70 mt-0.5 px-1 font-mono">
                          Replied by Admin: {msg.adminResponder.nickname || msg.adminResponder.username || 'Admin'}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply Input Bar */}
            <form onSubmit={handleSendOfficialResponse} className="space-y-2 pt-1">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={officialResponseText}
                  onChange={(e) => setOfficialResponseText(e.target.value)}
                  placeholder={`Reply to @${activeReplyUser.username || 'user'} as PulseChat...`}
                  className="flex-1 px-4 py-2.5 bg-[#1C1530] border border-violet-900/50 rounded-2xl text-xs text-white placeholder-violet-400/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
                <button
                  type="submit"
                  disabled={!officialResponseText.trim() || sendingOfficialResponse}
                  className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-2xl text-xs shadow-md transition cursor-pointer disabled:opacity-40 flex items-center space-x-1.5 shrink-0"
                >
                  {sendingOfficialResponse ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Reply</span>
                </button>
              </div>
              <p className="text-[10px] text-violet-400/60 px-1">
                Unified Official Response · User sees response from <strong className="text-violet-300">PulseChat</strong>. All admins can see this history.
              </p>
            </form>
          </div>
        </div>
      )}
      {userModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#1E1833] rounded-3xl border border-violet-900/40 shadow-2xl p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-violet-900/30">
              <div className="flex items-center space-x-3">
                <Avatar src={editingUser.avatar} name={editingUser.username} size="md" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Edit User @{editingUser.username}
                  </h3>
                  <p className="text-xs text-violet-300/60">Update account role, profile details, and access state</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setUserModalOpen(false);
                  setEditingUser(null);
                }}
                className="text-violet-400/60 hover:text-white p-1.5 rounded-xl hover:bg-violet-900/30 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-violet-200">Nickname / Display Name</label>
                <input
                  type="text"
                  value={userForm.nickname}
                  onChange={(e) => setUserForm({ ...userForm, nickname: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full px-3.5 py-2.5 bg-[#19142B] border border-violet-900/40 text-white placeholder-violet-400/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-violet-200">Email Address</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#19142B] border border-violet-900/40 text-white placeholder-violet-400/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-violet-200">Bio</label>
                <textarea
                  rows={2}
                  value={userForm.bio}
                  onChange={(e) => setUserForm({ ...userForm, bio: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#19142B] border border-violet-900/40 text-white placeholder-violet-400/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-semibold mb-1 text-violet-200">Account Role</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#19142B] border border-violet-900/40 text-white rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  >
                    <option value="user">Standard User</option>
                    <option value="admin">Platform Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-violet-200">Account Status</label>
                  <select
                    value={userForm.isBanned ? 'banned' : 'active'}
                    onChange={(e) => setUserForm({ ...userForm, isBanned: e.target.value === 'banned' })}
                    className="w-full px-3.5 py-2.5 bg-[#19142B] border border-violet-900/40 text-white rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  >
                    <option value="active">Active &amp; Allowed</option>
                    <option value="banned">Suspended / Banned</option>
                  </select>
                </div>
              </div>

              {userForm.isBanned && (
                <div>
                  <label className="block font-semibold mb-1 text-rose-300">Ban Reason</label>
                  <input
                    type="text"
                    value={userForm.banReason}
                    onChange={(e) => setUserForm({ ...userForm, banReason: e.target.value })}
                    placeholder="Violation of terms or harassment..."
                    className="w-full px-3.5 py-2.5 bg-[#161226] border border-rose-800/60 text-white placeholder-rose-300/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                  />
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-violet-900/30">
                <button
                  type="button"
                  onClick={() => {
                    setUserModalOpen(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2.5 bg-[#231C38] hover:bg-[#2A2242] border border-violet-900/30 text-violet-300 font-semibold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-xl transition cursor-pointer shadow-lg shadow-violet-900/40 flex items-center space-x-1.5"
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
          <div className="w-full max-w-4xl bg-[#1E1833] rounded-3xl border border-violet-900/40 shadow-2xl h-[88vh] flex flex-col overflow-hidden text-slate-100">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-violet-900/30 flex items-center justify-between shrink-0 bg-[#1C1630]">
              <div className="flex items-center space-x-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                    inspectingChat.type === 'group'
                      ? 'bg-violet-600/20 text-violet-300 border-violet-500/30'
                      : 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30'
                  }`}
                >
                  {inspectingChat.type === 'group' ? <Layers className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-sm sm:text-base text-white truncate">
                      {inspectingChat.type === 'group'
                        ? inspectingChat.groupDetails?.name || 'Group Channel'
                        : inspectingChat.participants?.map((p) => `@${p.username}`).join(' ↔ ') || 'Direct Chat'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-[#19142B] text-violet-300 border border-violet-900/40">
                      {inspectingChat.type}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-violet-300/60 mt-0.5">
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
                  className="px-2.5 py-1.5 bg-[#231C38] hover:bg-[#2A2242] border border-violet-900/40 text-violet-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                  title="Open this conversation directly in Chat"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-violet-400" />
                  <span className="hidden sm:inline">Open in Chat</span>
                </button>

                <button
                  onClick={() => handleInspectChat(inspectingChat)}
                  disabled={loadingMessages}
                  className="p-2 text-violet-400 hover:text-white hover:bg-violet-900/30 rounded-xl transition cursor-pointer"
                  title="Refresh chat messages"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingMessages ? 'animate-spin text-violet-400' : ''}`} />
                </button>
                <button
                  onClick={() => handleDeleteEntireChat(inspectingChat._id)}
                  className="px-2.5 py-1.5 bg-rose-950/50 hover:bg-rose-900/70 border border-rose-900/50 text-rose-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
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
                  className="p-2 text-violet-400/60 hover:text-white rounded-xl hover:bg-violet-900/30 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Participants Bar */}
            <div className="px-4 py-2 border-b border-violet-900/20 bg-[#19142B] flex items-center space-x-2 overflow-x-auto text-xs shrink-0">
              <span className="text-violet-400/60 font-mono text-[11px] uppercase font-semibold shrink-0">Members:</span>
              {inspectingChat.participants?.map((p) => (
                <div
                  key={p._id}
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#231C38] border border-violet-900/30 text-violet-200 text-[11px] shrink-0"
                >
                  <Avatar src={p.avatar} name={p.username} size="xs" />
                  <span className="font-semibold">@{p.username}</span>
                  {p.role === 'admin' && (
                    <span className="text-[9px] px-1 rounded bg-violet-600/30 text-violet-300 border border-violet-500/30 font-bold">
                      ADMIN
                    </span>
                  )}
                  {p.isBanned && (
                    <span className="text-[9px] px-1 rounded bg-rose-950/60 text-rose-300 border border-rose-800/40 font-bold">
                      BANNED
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Messages Stream */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-[#161226]">
              {loadingMessages ? (
                <div className="h-full flex flex-col items-center justify-center text-violet-400/60 space-y-2 py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-violet-400" />
                  <p className="text-xs">Loading message stream...</p>
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-violet-400/40 space-y-2 py-16">
                  <MessageSquare className="w-10 h-10 stroke-1" />
                  <p className="text-xs font-semibold">No messages recorded in this conversation.</p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg._id}
                    className="p-3 sm:p-4 bg-[#231C38] border border-violet-900/30 rounded-2xl shadow-2xs flex items-start justify-between gap-3 group hover:border-violet-700/50 transition"
                  >
                    <div className="flex items-start space-x-3 min-w-0 flex-1">
                      <Avatar src={msg.sender?.avatar} name={msg.sender?.username} size="sm" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-white">
                            @{msg.sender?.username || 'Unknown'}
                          </span>
                          {msg.sender?.nickname && (
                            <span className="text-[11px] text-violet-300/60">({msg.sender.nickname})</span>
                          )}
                          {msg.sender?.role === 'admin' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-600/30 text-violet-300 border border-violet-500/30 uppercase">
                              Admin
                            </span>
                          )}
                          <span className="text-[10px] text-violet-400/60 font-mono">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                            {new Date(msg.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Content */}
                        {msg.isDeletedForEveryone ? (
                          <p className="text-xs italic text-violet-400/50">This message was deleted by user.</p>
                        ) : (
                          <p className="text-xs text-violet-100 whitespace-pre-wrap leading-relaxed">
                            {msg.content || ''}
                          </p>
                        )}

                        {/* Interactive Poll Visualization for Admin Inspector */}
                        {(msg.messageType === 'poll' || msg.poll) && (
                          <div className="mt-2.5 p-3 bg-[#19142B] border border-violet-900/40 rounded-xl space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-white">
                              <div className="flex items-center space-x-1.5 text-violet-400">
                                <BarChart3 className="w-4 h-4 shrink-0" />
                                <span className="font-semibold">{msg.poll?.question || msg.content || 'Poll'}</span>
                              </div>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#161226] text-violet-300 border border-violet-900/30 shrink-0">
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
                                    <div className="text-[11px] text-violet-400/50 italic">No poll options recorded.</div>
                                  );
                                }

                                return options.map((opt, optIdx) => {
                                  const voteCount = opt.votes?.length || 0;
                                  const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

                                  return (
                                    <div key={optIdx} className="space-y-1">
                                      <div className="flex justify-between items-center text-[11px] text-violet-200">
                                        <span className="font-medium">{opt.text}</span>
                                        <span className="font-mono text-violet-400/70">
                                          {voteCount} votes ({percentage}%)
                                        </span>
                                      </div>
                                      <div className="w-full h-2 bg-[#161226] rounded-full overflow-hidden border border-violet-900/30">
                                        <div
                                          className="h-full bg-gradient-to-r from-violet-600 to-purple-600 rounded-full transition-all duration-300"
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
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#1E1833] border border-rose-900/50 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-rose-900/30">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-950/60 border border-rose-800/50 flex items-center justify-center text-rose-400">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Permanently Delete User</h3>
                  <span className="text-[11px] text-rose-400/80 font-mono">14-Day Retention Trash DB</span>
                </div>
              </div>
              <button onClick={() => setDeleteUserModal(null)} className="text-violet-400/60 hover:text-white p-1.5 rounded-xl hover:bg-violet-900/30 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#19142B] border border-violet-900/30 rounded-2xl p-3 text-xs space-y-1">
              <p className="text-violet-300/70">Username: <span className="text-white font-bold">@{deleteUserModal.user.username}</span></p>
              <p className="text-violet-300/70">Email: <span className="text-violet-300 font-mono">{deleteUserModal.user.email}</span></p>
            </div>

            <p className="text-xs text-violet-200/80 leading-relaxed">
              This will immediately <span className="text-rose-400 font-semibold">force-logout the user</span>, revoke active sessions, record your reason, and move the account to the <span className="text-amber-300 font-semibold">Trash DB (14-day retention)</span>. When the user attempts to log in with their old credentials, they will be shown your deletion reason.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-violet-300 uppercase tracking-wider mb-1.5">
                Reason for Deletion (shown to user on login) <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Repeated violation of community guidelines, spamming groups, offensive language..."
                className="w-full px-3.5 py-2.5 bg-[#161226] border border-violet-900/40 rounded-xl text-white text-xs placeholder-violet-400/40 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              />
            </div>

            <div className="flex items-center space-x-3 pt-2 border-t border-violet-900/20">
              <button
                onClick={handleDeleteUser}
                disabled={deleteLoading || !deleteReason.trim()}
                className="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-rose-950/50"
              >
                {deleteLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{deleteLoading ? 'Deleting...' : 'Delete & Move to Trash DB'}</span>
              </button>
              <button
                onClick={() => setDeleteUserModal(null)}
                disabled={deleteLoading}
                className="px-4 py-2.5 bg-[#231C38] hover:bg-[#2A2242] text-violet-300 border border-violet-900/30 text-xs font-semibold rounded-xl transition cursor-pointer"
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
          <div className="w-full max-w-xl bg-[#0B0F19] rounded-3xl border border-slate-800/80 shadow-2xl p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <div className="flex items-center space-x-2">
                <Wrench className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  {editingSchedule ? 'Edit Maintenance Window' : 'Schedule Maintenance'}
                </h3>
              </div>
              <button
                onClick={() => setMaintenanceModalOpen(false)}
                className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/60 transition cursor-pointer"
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

      {/* ── MOBILE BOTTOM NAVIGATION BAR (Phones only) ────────────────────── */}
      <nav
        aria-label="Mobile Admin Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1E1833]/95 backdrop-blur-xl border-t border-violet-900/40 px-2 py-1 flex items-center justify-around shadow-2xl safe-area-bottom"
      >
        {/* Overview */}
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-1.5 px-1 flex flex-col items-center justify-center transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'text-white font-bold'
              : 'text-violet-400/60 hover:text-white'
          }`}
        >
          <TrendingUp className={`w-5 h-5 ${activeTab === 'overview' ? 'scale-110 text-violet-400' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight">Overview</span>
        </button>

        {/* Chats & Messaging */}
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 py-1.5 px-1 flex flex-col items-center justify-center transition-all cursor-pointer relative ${
            activeTab === 'groups' || activeTab === 'chats'
              ? 'text-white font-bold'
              : 'text-violet-400/60 hover:text-white'
          }`}
        >
          <MessageSquare className={`w-5 h-5 ${activeTab === 'groups' || activeTab === 'chats' ? 'scale-110 text-violet-400' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight">Chats</span>
          {allChats.length > 0 && (
            <span className="absolute top-1 right-2 px-1 py-0.2 rounded-full text-[8px] font-mono font-bold bg-violet-600/30 border border-violet-500/30 text-violet-300">
              {allChats.length}
            </span>
          )}
        </button>

        {/* Users */}
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-1.5 px-1 flex flex-col items-center justify-center transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'text-white font-bold'
              : 'text-violet-400/60 hover:text-white'
          }`}
        >
          <Users className={`w-5 h-5 ${activeTab === 'users' ? 'scale-110 text-violet-400' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight">Users</span>
        </button>

        {/* Verification Codes */}
        <button
          onClick={() => setActiveTab('codes')}
          className={`flex-1 py-1.5 px-1 flex flex-col items-center justify-center transition-all cursor-pointer relative ${
            activeTab === 'codes'
              ? 'text-white font-bold'
              : 'text-violet-400/60 hover:text-white'
          }`}
        >
          <KeyRound className={`w-5 h-5 ${activeTab === 'codes' ? 'scale-110 text-violet-400' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight">Codes</span>
          {verificationCodes.filter((c) => c.status === 'pending').length > 0 && (
            <span className="absolute top-1 right-2 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-amber-500 text-white animate-pulse">
              {verificationCodes.filter((c) => c.status === 'pending').length}
            </span>
          )}
        </button>

        {/* More Menu (Opens Drawer) */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex-1 py-1.5 px-1 flex flex-col items-center justify-center text-violet-400/60 hover:text-white transition-all cursor-pointer relative"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">More</span>
          {recoveries.filter((r) => r.status === 'pending' || r.status === 'partial').length > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-500" />
          )}
        </button>
      </nav>

      {/* ── MOBILE SLIDE-OVER DRAWER MENU ─────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex animate-fadeIn">
          {/* Backdrop */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
          />

          {/* Drawer Sheet */}
          <div className="relative w-4/5 max-w-xs bg-[#161226] h-full shadow-2xl flex flex-col z-10 border-r border-violet-900/40 animate-slideRight text-white select-none">
            {/* Drawer Header */}
            <div className="p-4 border-b border-violet-900/40 flex items-center justify-between bg-[#1E1833] shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center text-white shadow-xs shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs text-white truncate">Admin Control Center</h3>
                  <p className="text-[10px] text-violet-300/60 truncate">All Modules &amp; Settings</p>
                </div>
              </div>

              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-violet-400 hover:text-white rounded-lg hover:bg-violet-900/40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Categorized Navigation in Drawer - Full Height Scroll */}
            <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-4 scrollbar-thin scrollbar-thumb-violet-900/50">
              {navSections.map((section) => (
                <div key={section.label}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-violet-400/60 px-2.5 mb-1 font-mono">
                    {section.label}
                  </p>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id || (item.id === 'groups' && activeTab === 'chats');
                      const pendingBadge =
                        item.id === 'codes'
                          ? verificationCodes.filter((c) => c.status === 'pending').length
                          : item.id === 'recoveries'
                          ? recoveries.filter((r) => r.status === 'pending' || r.status === 'partial').length
                          : item.id === 'groups' && allChats.length > 0
                          ? allChats.length
                          : 0;

                      const isAlertBadge = item.id === 'codes' || item.id === 'recoveries';

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                            isActive
                              ? 'bg-gradient-to-r from-violet-600/30 to-purple-600/20 text-white border-l-4 border-violet-500 shadow-xs'
                              : 'text-violet-300/70 hover:text-white hover:bg-violet-900/20'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-violet-400' : 'text-violet-400/60'}`} />
                            <span className="truncate">{item.label}</span>
                          </div>
                          {pendingBadge > 0 && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full font-mono shrink-0 ${
                                isAlertBadge
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-violet-600/30 text-violet-300 border border-violet-500/30'
                              }`}
                            >
                              {pendingBadge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer Bottom Bar: Back to Chat app */}
            <div className="p-3 border-t border-violet-900/40 bg-[#1E1833] shrink-0">
              <button
                onClick={() => navigate('/chat')}
                className="w-full py-2 px-3 bg-[#19142B] hover:bg-violet-900/40 text-violet-200 border border-violet-900/40 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-violet-400" />
                <span>Return to PulseChat</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

