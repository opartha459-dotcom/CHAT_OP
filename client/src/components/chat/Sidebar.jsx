import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  MessageSquarePlus,
  Users,
  Settings,
  Shield,
  Search,
  Pin,
  Archive,
  VolumeX,
  Lock,
  Sun,
  Moon,
  LogOut,
  UserPlus,
  Smartphone,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
  PhoneCall,
  Video,
  ArrowUpRight,
  ArrowDownLeft,
  MoreVertical,
  X,
  BellRing,
  Camera,
  Edit3,
  Plus,
  CircleDashed,
  Radio,
  Check,
  CheckCheck,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  User,
  Palette,
  Laptop,
  KeyRound,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useCall } from '../../context/CallContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import { useStatus } from '../../context/StatusContext';
import { Avatar } from '../common/Avatar';
import { SidebarSkeleton } from '../common/Skeleton';
import { NewChatModal } from '../modals/NewChatModal';
import { CreateGroupModal } from '../modals/CreateGroupModal';
import { JoinGroupModal } from '../modals/JoinGroupModal';
import { InstallAppModal } from '../modals/InstallAppModal';
import { SettingsModal } from '../modals/SettingsModal';
import { SettingsPanel } from '../settings/SettingsPanel';
import { AdminModal } from '../modals/AdminModal';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { StatusRail } from '../status/StatusRail';

export const Sidebar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const {
    conversations,
    activeConversation,
    selectConversation,
    searchQuery,
    setSearchQuery,
    loadingConversations,
    authHeaders,
    mainTab,
    setMainTab,
    settingsSubTab,
    setSettingsSubTab
  } = useChat();
  const { startCall } = useCall();
  const { socket, onlineUsers, typingMap } = useSocket();
  const { theme, setTheme } = useTheme();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  // Status Context for Statuses & Status Rings
  const {
    feed: statusFeed,
    hasActiveStatus,
    hasUnviewedStatus,
    hasAnyUnviewed,
    setActiveUserId,
    myStatusGroup,
    otherStatusGroups,
    setCreateModalOpen
  } = useStatus();

  // Mobile Settings Slide-over state
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

  // Chats Filter Pills State ('all' | 'unread' | 'pinned' | 'groups')
  const [chatFilter, setChatFilter] = useState('all');

  const settingsNavItems = [
    {
      id: 'appearance',
      label: 'Appearance & Sound',
      description: 'Color theme, accent color, text size',
      icon: Palette,
      iconBg: 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
    },
    {
      id: 'profile',
      label: 'Profile',
      description: 'Avatar, display name, bio',
      icon: User,
      iconBg: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
    },
    {
      id: 'privacy',
      label: 'Privacy & Safety',
      description: 'Last seen, read receipts, blocked users',
      icon: Shield,
      iconBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
    },
    {
      id: 'install',
      label: 'Install on Phone',
      description: 'Add to iPhone or Android home screen',
      icon: Smartphone,
      iconBg: 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
    },
    {
      id: 'sessions',
      label: 'Devices & Sessions',
      description: 'Active logins and linked devices',
      icon: Laptop,
      iconBg: 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
    },
    {
      id: 'account',
      label: 'Account & Security',
      description: 'Password, data export, delete account',
      icon: KeyRound,
      iconBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
    }
  ];

  // Modals state
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isJoinGroupOpen, setIsJoinGroupOpen] = useState(false);
  const [isInstallAppOpen, setIsInstallAppOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPushBannerDismissed, setIsPushBannerDismissed] = useState(false);
  const [viewedStatusesExpanded, setViewedStatusesExpanded] = useState(false);
  const menuRef = useRef(null);

  const { permissionState, requestCallNotifications } = usePushNotifications();

  const handleInstallClick = async () => {
    if (isInstallable) {
      const installed = await promptInstall();
      if (!installed) {
        setIsInstallAppOpen(true);
      }
    } else {
      setIsInstallAppOpen(true);
    }
  };

  // Close more menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  // Call History State
  const [callHistory, setCallHistory] = useState([]);
  const [loadingCalls, setLoadingCalls] = useState(false);

  const fetchCallHistory = useCallback(async () => {
    try {
      setLoadingCalls(true);
      const res = await fetch('/api/messages/calls/history', {
        headers: authHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success && data.calls) {
        setCallHistory(data.calls);
      }
    } catch (err) {
      console.error('Failed to load call history:', err);
    } finally {
      setLoadingCalls(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (mainTab === 'calls') {
      fetchCallHistory();
    }
  }, [mainTab, fetchCallHistory]);

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (msg) => {
      if (msg.messageType === 'call') {
        setCallHistory((prev) => [msg, ...prev.filter((c) => c._id !== msg._id)]);
      }
    };
    socket.on('message:new', handleNewMessage);
    return () => socket.off('message:new', handleNewMessage);
  }, [socket]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Filter pills
      if (chatFilter === 'pinned' && !c.isPinned) return false;
      if (chatFilter === 'groups' && c.type !== 'group') return false;
      if (chatFilter === 'unread' && (!c.unreadCount || c.unreadCount <= 0)) return false;
      if (chatFilter === 'all' && c.isArchived) return false;
      if (chatFilter === 'archived' && !c.isArchived) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (c.type === 'group') {
          return c.groupDetails?.name?.toLowerCase().includes(q);
        }
        return (
          c.otherUser?.nickname?.toLowerCase().includes(q) ||
          c.otherUser?.username?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [conversations, chatFilter, searchQuery]);

  // Count unread conversations for bottom navigation badge
  const totalUnreadChats = useMemo(() => {
    return conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [conversations]);

  // Count archived chats
  const archivedCount = useMemo(() => {
    return conversations.filter((c) => c.isArchived).length;
  }, [conversations]);

  // Filter call history
  const filteredCalls = useMemo(() => {
    return callHistory.filter((call) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const isGroup = call.conversation?.type === 'group' || call.conversation?.isGroup;
      if (isGroup) {
        return call.conversation?.groupDetails?.name?.toLowerCase().includes(q);
      }
      const otherUser = call.conversation?.participants?.find(
        (p) => (p._id || p)?.toString() !== user?._id?.toString()
      );
      return (
        otherUser?.nickname?.toLowerCase().includes(q) ||
        otherUser?.username?.toLowerCase().includes(q) ||
        call.sender?.nickname?.toLowerCase().includes(q) ||
        call.sender?.username?.toLowerCase().includes(q)
      );
    });
  }, [callHistory, searchQuery, user?._id]);

  // Communities / Groups list
  const groupConversations = useMemo(() => {
    return conversations.filter((c) => c.type === 'group');
  }, [conversations]);

  // Format timestamp helper
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();
    if (isYesterday) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <aside className="w-full md:w-80 lg:w-96 h-full flex flex-col bg-white dark:bg-slate-950 border-r border-slate-200/80 dark:border-slate-800/80 select-none relative overflow-hidden">
        {/* ============================================================ */}
        {/* 1. TOP HEADER - WHATSAPP STYLE                                */}
        {/* ============================================================ */}
        <div className="pt-3 px-4 pb-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-900 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-20 flex-shrink-0">
          {/* Main Title based on active tab */}
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white capitalize">
              {mainTab === 'chats'
                ? 'Chats'
                : mainTab === 'updates'
                ? 'Updates'
                : mainTab === 'calls'
                ? 'Calls'
                : mainTab === 'communities'
                ? 'Communities'
                : 'Settings'}
            </h1>
          </div>

          {/* Action icons at top right */}
          <div className="flex items-center space-x-1" ref={menuRef}>
            {/* Camera Button (Opens Status/Photo) */}
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              title="Camera / Add Status"
              className="p-2 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition active:scale-95 cursor-pointer"
            >
              <Camera className="w-5 h-5 stroke-[2]" />
            </button>

            {/* Main Action (+) Button */}
            {mainTab === 'chats' ? (
              <button
                type="button"
                onClick={() => setIsNewChatOpen(true)}
                title="New Chat"
                className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-full transition active:scale-95 cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
              </button>
            ) : mainTab === 'updates' ? (
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                title="Create Status Update"
                className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-full transition active:scale-95 cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </button>
            ) : mainTab === 'calls' ? (
              <button
                type="button"
                onClick={() => setIsNewChatOpen(true)}
                title="Start a Call"
                className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-full transition active:scale-95 cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <PhoneCall className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </button>
            ) : mainTab === 'communities' ? (
              <button
                type="button"
                onClick={() => setIsCreateGroupOpen(true)}
                title="New Group"
                className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-full transition active:scale-95 cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
              </button>
            ) : null}

            {/* Triple Dots Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                title="Options"
                className={`p-2 rounded-full transition active:scale-95 cursor-pointer ${
                  isMenuOpen
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                    : 'text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <MoreVertical className="w-5 h-5 stroke-[2]" />
              </button>

              {/* Floating Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-1.5 z-50 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsNewChatOpen(true);
                    }}
                    className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center space-x-2.5 transition text-left cursor-pointer"
                  >
                    <MessageSquarePlus className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="font-medium">New Direct Chat</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsCreateGroupOpen(true);
                    }}
                    className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center space-x-2.5 transition text-left cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-sky-500 flex-shrink-0" />
                    <span className="font-medium">New Group</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsJoinGroupOpen(true);
                    }}
                    className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center space-x-2.5 transition text-left cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <span className="font-medium">Join Group with Code</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setCreateModalOpen(true);
                    }}
                    className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center space-x-2.5 transition text-left cursor-pointer"
                  >
                    <Radio className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span className="font-medium">Post Status Update</span>
                  </button>

                  {user?.role === 'admin' && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate('/admin');
                      }}
                      className="w-full px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center space-x-2.5 transition text-left cursor-pointer"
                    >
                      <Shield className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium">Admin Dashboard</span>
                    </button>
                  )}

                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setTheme(theme === 'dark' ? 'light' : 'dark');
                    }}
                    className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between transition text-left cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      {theme === 'dark' ? (
                        <Sun className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      ) : (
                        <Moon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      )}
                      <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 capitalize">{theme}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setMainTab('settings');
                      selectConversation(null);
                      setMobileSettingsOpen(false);
                    }}
                    className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center space-x-2.5 transition text-left cursor-pointer text-purple-600 dark:text-purple-400 font-semibold"
                  >
                    <Settings className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span>Settings</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. SEARCH BAR (Meta AI style matching Image 2)                */}
        {/* ============================================================ */}
        {mainTab !== 'settings' && (
          <div className="px-4 py-2 flex-shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ask Meta AI or Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 3. FILTER PILLS (Matching Image 2: All | Unread | Favourites | Groups | +) */}
        {/* ============================================================ */}
        {mainTab === 'chats' && !searchQuery && (
          <div className="flex items-center space-x-1.5 px-4 pb-2 border-b border-slate-100 dark:border-slate-900 text-xs overflow-x-auto no-scrollbar scroll-smooth flex-shrink-0">
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'pinned', label: 'Favourites' },
              { id: 'groups', label: 'Groups' }
            ].map((item) => {
              const isActive = chatFilter === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setChatFilter(item.id)}
                  className={`px-3.5 py-1.5 rounded-full font-semibold transition flex-shrink-0 active:scale-95 text-xs cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/30'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Quick '+' pill */}
            <button
              onClick={() => setIsNewChatOpen(true)}
              className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white transition flex-shrink-0 cursor-pointer"
              title="New chat"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Telegram/WhatsApp Style Incoming Call Ringing Banner */}
        {permissionState !== 'granted' && !isPushBannerDismissed && mainTab === 'chats' && (
          <div className="mx-3 my-2 p-2.5 bg-gradient-to-br from-indigo-950/70 via-indigo-900/40 to-slate-900/90 border border-indigo-500/30 rounded-2xl flex items-start space-x-2.5 shadow-md flex-shrink-0">
            <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
              <BellRing className="w-3.5 h-3.5 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white">Enable Call Ringing</h4>
                <button
                  onClick={() => setIsPushBannerDismissed(true)}
                  className="text-slate-400 hover:text-slate-200 p-0.5 cursor-pointer"
                  title="Dismiss"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[10px] text-slate-300 leading-snug">
                Ring your phone for calls even when screen is locked.
              </p>
              <button
                onClick={requestCallNotifications}
                className="mt-1.5 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-semibold transition cursor-pointer flex items-center space-x-1"
              >
                <span>Turn On</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 4. MAIN SCROLLABLE CONTENT AREA BY ACTIVE TAB                 */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-slate-100/60 dark:divide-slate-900">
          {/* TAB: CHATS */}
          {mainTab === 'chats' && (
            <>
              {/* Optional 24h Status Rail */}
              {!searchQuery && chatFilter === 'all' && <StatusRail />}

              {/* Archived Row (Matching Image 2) */}
              {archivedCount > 0 && !searchQuery && chatFilter === 'all' && (
                <div
                  onClick={() => setChatFilter('archived')}
                  className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer transition text-xs font-medium border-b border-slate-100 dark:border-slate-900"
                >
                  <div className="flex items-center space-x-3 text-slate-700 dark:text-slate-300">
                    <Archive className="w-4 h-4 text-slate-400" />
                    <span>Archived</span>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    {archivedCount}
                  </span>
                </div>
              )}

              {/* Back to All filter button if inside archived */}
              {chatFilter === 'archived' && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-200">Archived Chats</span>
                  <button
                    onClick={() => setChatFilter('all')}
                    className="text-emerald-600 font-bold hover:underline cursor-pointer"
                  >
                    Back to All
                  </button>
                </div>
              )}

              {/* Chat list */}
              {loadingConversations ? (
                <SidebarSkeleton count={6} />
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 px-6">
                  <MessageSquare className="w-10 h-10 stroke-1 mb-2 text-slate-300 dark:text-slate-700" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No chats found</p>
                  <p className="text-[11px] mt-1 text-slate-400">
                    {searchQuery ? 'Try another search term' : 'Start a chat by tapping + above'}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isGroup = conv.type === 'group';
                  const title = isGroup
                    ? conv.groupDetails?.name || 'Group'
                    : conv.otherUser?.nickname || conv.otherUser?.username || 'User';
                  const avatarUrl = isGroup ? conv.groupDetails?.avatar : conv.otherUser?.avatar;
                  const otherUserId = conv.otherUser?._id;
                  const isOnline = !isGroup && (onlineUsers.has(otherUserId) || conv.otherUser?.status === 'online');

                  const hasStatus = !isGroup && hasActiveStatus(otherUserId);
                  const hasUnviewed = !isGroup && hasUnviewedStatus(otherUserId);

                  const rawTypers = typingMap[conv._id] || [];
                  const isTyping = rawTypers.length > 0;

                  const isSelected = activeConversation?._id === conv._id;
                  const lastMsg = conv.lastMessage;
                  const unread = conv.unreadCount || 0;

                  return (
                    <div
                      key={conv._id}
                      onClick={() => selectConversation(conv)}
                      className={`px-4 py-3 flex items-center space-x-3 cursor-pointer transition relative group ${
                        isSelected
                          ? 'bg-emerald-500/10 dark:bg-emerald-500/15'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900/60'
                      }`}
                    >
                      {/* Avatar with WhatsApp Status Ring */}
                      <div className="relative flex-shrink-0">
                        <div
                          onClick={(e) => {
                            if (hasStatus) {
                              e.stopPropagation();
                              setActiveUserId(otherUserId?.toString());
                            }
                          }}
                          className={`rounded-full p-0.5 transition-transform ${
                            hasStatus
                              ? hasUnviewed
                                ? 'bg-gradient-to-tr from-emerald-400 via-teal-500 to-indigo-500 shadow-sm cursor-pointer hover:scale-105 active:scale-95'
                                : 'border-2 border-slate-300 dark:border-slate-700 p-0.5 cursor-pointer'
                              : ''
                          }`}
                          title={hasStatus ? 'View Status Update' : ''}
                        >
                          <Avatar
                            src={avatarUrl}
                            name={title}
                            size="md"
                            isOnline={isOnline}
                            showOnlineStatus={!hasStatus}
                          />
                        </div>
                      </div>

                      {/* Chat details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {title}
                          </h3>
                          <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 flex-shrink-0 ml-1">
                            {formatTime(lastMsg?.createdAt || conv.updatedAt)}
                          </span>
                        </div>

                        {/* Last message preview with WhatsApp icons */}
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate flex items-center space-x-1">
                            {isTyping ? (
                              <span className="text-emerald-500 font-medium italic animate-pulse">
                                {isGroup ? `${rawTypers[0]?.name || 'Someone'} is typing...` : 'typing...'}
                              </span>
                            ) : (
                              <>
                                {/* Checkmarks if sender is me */}
                                {lastMsg && (lastMsg.sender?._id || lastMsg.sender)?.toString() === user?._id?.toString() && (
                                  <CheckCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 inline" />
                                )}
                                <span className="truncate">
                                  {lastMsg?.messageType === 'poll'
                                    ? `📊 ${lastMsg.poll?.question || 'Poll'}`
                                    : lastMsg?.messageType === 'call'
                                    ? `📞 Call`
                                    : lastMsg?.content || 'No messages yet'}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Unread badge & Pin */}
                          <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                            {conv.isPinned && (
                              <Pin className="w-3 h-3 text-slate-400 fill-slate-400 rotate-45" />
                            )}
                            {unread > 0 && (
                              <span className="min-w-4.5 h-4.5 px-1 rounded-full bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center shadow-xs">
                                {unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* TAB: UPDATES (WHATSAPP STATUS TAB) */}
          {mainTab === 'updates' && (
            <div className="p-4 space-y-5">
              {/* Status Section */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  <span>Status</span>
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:underline cursor-pointer"
                  >
                    Privacy
                  </button>
                </div>

                {/* My Status Card */}
                <div
                  onClick={() => {
                    if (myStatusGroup) {
                      setActiveUserId(user?._id?.toString());
                    } else {
                      setCreateModalOpen(true);
                    }
                  }}
                  className="flex items-center space-x-3 p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition"
                >
                  <div className="relative">
                    <div className={`p-0.5 rounded-full ${
                      myStatusGroup ? 'bg-gradient-to-tr from-emerald-400 to-indigo-500' : ''
                    }`}>
                      <Avatar src={user?.avatar} name={user?.nickname || user?.username} size="md" />
                    </div>
                    {/* Add (+) badge */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreateModalOpen(true);
                      }}
                      className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      My Status
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {myStatusGroup ? `${myStatusGroup.statuses?.length} active story · Tap to view` : 'Tap to add status update'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Updates from Contacts (Unviewed) */}
              {otherStatusGroups.filter((g) => !g.allViewed).length > 0 && (
                <div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Recent Updates
                  </div>
                  <div className="space-y-1">
                    {otherStatusGroups
                      .filter((g) => !g.allViewed)
                      .map((group) => {
                        const displayName = group.user?.nickname || group.user?.username || 'User';
                        const latestStatus = group.statuses?.[group.statuses.length - 1];

                        return (
                          <div
                            key={group.user?._id}
                            onClick={() => setActiveUserId(group.user?._id?.toString())}
                            className="flex items-center space-x-3 p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition"
                          >
                            <div className="p-0.5 rounded-full bg-gradient-to-tr from-emerald-400 via-teal-500 to-indigo-500 animate-pulse">
                              <Avatar src={group.user?.avatar} name={displayName} size="md" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                {displayName}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {formatTime(latestStatus?.createdAt || group.latestCreatedAt)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Viewed Updates */}
              {otherStatusGroups.filter((g) => g.allViewed).length > 0 && (
                <div>
                  <button
                    onClick={() => setViewedStatusesExpanded(!viewedStatusesExpanded)}
                    className="flex items-center justify-between w-full text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-1 cursor-pointer"
                  >
                    <span>Viewed Updates</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${viewedStatusesExpanded ? 'rotate-90' : ''}`} />
                  </button>

                  {viewedStatusesExpanded && (
                    <div className="space-y-1 mt-1">
                      {otherStatusGroups
                        .filter((g) => g.allViewed)
                        .map((group) => {
                          const displayName = group.user?.nickname || group.user?.username || 'User';
                          return (
                            <div
                              key={group.user?._id}
                              onClick={() => setActiveUserId(group.user?._id?.toString())}
                              className="flex items-center space-x-3 p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition opacity-80 hover:opacity-100"
                            >
                              <div className="p-0.5 rounded-full border-2 border-slate-300 dark:border-slate-700">
                                <Avatar src={group.user?.avatar} name={displayName} size="md" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                  {displayName}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {formatTime(group.latestCreatedAt)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: CALLS */}
          {mainTab === 'calls' && (
            <div className="divide-y divide-slate-100 dark:divide-slate-900">
              {loadingCalls ? (
                <SidebarSkeleton count={6} />
              ) : filteredCalls.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 px-6">
                  <PhoneMissed className="w-10 h-10 stroke-1 mb-2 text-slate-300 dark:text-slate-700" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No calls yet</p>
                  <p className="text-[11px] mt-1 text-slate-400">Recent calls will be shown here</p>
                </div>
              ) : (
                filteredCalls.map((call) => {
                  const isGroup = call.conversation?.type === 'group' || call.conversation?.isGroup;
                  const otherUser = isGroup
                    ? null
                    : call.conversation?.participants?.find(
                        (p) => (p._id || p)?.toString() !== user?._id?.toString()
                      ) || call.sender;
                  const title = isGroup
                    ? call.conversation?.groupDetails?.name || 'Group Call'
                    : otherUser?.nickname || otherUser?.username || 'User';
                  const avatarUrl = isGroup ? call.conversation?.groupDetails?.avatar : otherUser?.avatar;

                  const callMeta = call.callMetadata || {};
                  const isVideo = callMeta.callType === 'video';
                  const status = callMeta.status || 'completed';
                  const isMe = (call.sender?._id || call.sender)?.toString() === user?._id?.toString();
                  const isMissed = !isMe && (status === 'missed' || status === 'busy');

                  return (
                    <div
                      key={call._id}
                      className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/60 transition"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <Avatar src={avatarUrl} name={title} size="md" />
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {title}
                          </h4>
                          <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
                            {isMissed ? (
                              <PhoneMissed className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                            ) : isMe ? (
                              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            )}
                            <span className={isMissed ? 'text-rose-500 font-medium' : ''}>
                              {isMissed ? 'Missed' : isMe ? 'Outgoing' : 'Incoming'}
                            </span>
                            <span>·</span>
                            <span>{formatTime(call.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Call Button */}
                      {!isGroup && otherUser && (
                        <button
                          type="button"
                          onClick={() => startCall(call.conversation?._id, isVideo ? 'video' : 'audio', otherUser)}
                          className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-full transition cursor-pointer"
                          title={`Call back ${title}`}
                        >
                          {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB: COMMUNITIES / GROUPS */}
          {mainTab === 'communities' && (
            <div className="p-4 space-y-4">
              {/* New Community / Group button */}
              <div
                onClick={() => setIsCreateGroupOpen(true)}
                className="flex items-center space-x-3 p-3 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 rounded-2xl cursor-pointer transition"
              >
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    New Community / Group
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Create groups and invite contacts
                  </div>
                </div>
              </div>

              {/* Group Conversations List */}
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Your Groups ({groupConversations.length})
                </div>

                {groupConversations.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    You have not joined any groups yet.
                  </div>
                ) : (
                  groupConversations.map((conv) => (
                    <div
                      key={conv._id}
                      onClick={() => selectConversation(conv)}
                      className="flex items-center space-x-3 p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition"
                    >
                      <Avatar
                        src={conv.groupDetails?.avatar}
                        name={conv.groupDetails?.name || 'Group'}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {conv.groupDetails?.name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {conv.participants?.length || 0} members · {formatTime(conv.updatedAt)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: SETTINGS (AUTHENTIC WHATSAPP SETTINGS LIST) */}
          {mainTab === 'settings' && (
            <div className="p-3.5 space-y-3.5 overflow-y-auto no-scrollbar">
              {/* Profile Card Header */}
              <div
                onClick={() => {
                  setSettingsSubTab('profile');
                  setMobileSettingsOpen(true);
                }}
                className={`flex items-center space-x-3.5 p-3.5 rounded-2xl cursor-pointer transition ${
                  settingsSubTab === 'profile'
                    ? 'bg-purple-500/15 border border-purple-500/40 shadow-sm'
                    : 'bg-slate-50 dark:bg-[#0E1422] hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800/80'
                }`}
              >
                <Avatar src={user?.avatar} name={user?.nickname || user?.username} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white truncate">
                      {user?.nickname || user?.username || 'FATTY'}
                    </span>
                    {user?.role === 'admin' && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#311119] text-[#F43F5E] border border-[#881337] rounded-md flex-shrink-0">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-mono">
                    @{user?.username || 'user'}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </div>

              {/* Grouped Settings Items */}
              <div className="bg-slate-50 dark:bg-[#0E1422] border border-slate-200/60 dark:border-slate-800/80 rounded-2xl overflow-hidden divide-y divide-slate-200/60 dark:divide-slate-800/60 shadow-xs">
                {settingsNavItems.map((item) => {
                  const Icon = item.icon;
                  const isSelected = settingsSubTab === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSettingsSubTab(item.id);
                        setMobileSettingsOpen(true);
                      }}
                      className={`flex items-center justify-between p-3.5 cursor-pointer transition ${
                        isSelected
                          ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300'
                          : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${item.iconBg}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs truncate text-slate-800 dark:text-white">{item.label}</div>
                          <div className="text-[10px] text-slate-400 truncate">{item.description}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </div>
                  );
                })}
              </div>

              {/* Bottom Actions */}
              <div className="pt-2 space-y-2">
                {user?.role === 'admin' && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-semibold text-[#F43F5E] bg-[#1F101A] hover:bg-[#2C1424] border border-[#641A2D] transition cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Shield className="w-4 h-4 text-[#F43F5E]" />
                      <span>Admin Dashboard</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#F43F5E]" />
                  </button>
                )}

                <button
                  onClick={logout}
                  className="w-full flex items-center space-x-2.5 p-3 rounded-2xl text-xs font-semibold text-[#F43F5E] hover:bg-rose-500/10 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}

          {/* Mobile Detail Slide-Over */}
          {mobileSettingsOpen && mainTab === 'settings' && (
            <div className="absolute inset-0 z-50 bg-[#0B0F19] flex flex-col md:hidden animate-in slide-in-from-right duration-200">
              <div className="flex items-center space-x-2 px-4 py-3.5 border-b border-slate-800 bg-[#080C14] flex-shrink-0">
                <button
                  onClick={() => setMobileSettingsOpen(false)}
                  className="flex items-center space-x-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Settings</span>
                </button>
                <div className="flex-1 text-center font-bold text-xs text-white truncate pr-6">
                  {settingsNavItems.find((n) => n.id === settingsSubTab)?.label}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar">
                <SettingsPanel
                  isModal={false}
                  showNavigation={false}
                  activeTab={settingsSubTab}
                  setActiveTab={setSettingsSubTab}
                />
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* 5. BOTTOM NAVIGATION BAR - AUTHENTIC WHATSAPP (Image 1)      */}
        {/* ============================================================ */}
        <div className="h-16 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl flex items-center justify-around px-2 z-30 flex-shrink-0 shadow-lg">
          {/* 1. Updates (Status) */}
          <button
            type="button"
            onClick={() => setMainTab('updates')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer relative ${
              mainTab === 'updates'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="relative">
              <CircleDashed className={`w-5 h-5 stroke-[2] ${mainTab === 'updates' ? 'stroke-[2.5]' : ''}`} />
              {hasAnyUnviewed && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-medium">Updates</span>
          </button>

          {/* 2. Calls */}
          <button
            type="button"
            onClick={() => setMainTab('calls')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer relative ${
              mainTab === 'calls'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Phone className={`w-5 h-5 stroke-[2] ${mainTab === 'calls' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] mt-0.5 tracking-tight font-medium">Calls</span>
          </button>

          {/* 3. Communities (Groups) */}
          <button
            type="button"
            onClick={() => setMainTab('communities')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer relative ${
              mainTab === 'communities'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className={`w-5 h-5 stroke-[2] ${mainTab === 'communities' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] mt-0.5 tracking-tight font-medium">Communities</span>
          </button>

          {/* 4. Chats (Main) */}
          <button
            type="button"
            onClick={() => setMainTab('chats')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer relative ${
              mainTab === 'chats'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="relative">
              <MessageSquare className={`w-5 h-5 stroke-[2] ${mainTab === 'chats' ? 'fill-emerald-600/10 stroke-[2.5]' : ''}`} />
              {totalUnreadChats > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-emerald-500 text-white font-bold text-[9px] flex items-center justify-center shadow-xs">
                  {totalUnreadChats}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-medium">Chats</span>
          </button>

          {/* 5. Settings */}
          <button
            type="button"
            onClick={() => setMainTab('settings')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer relative ${
              mainTab === 'settings'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Settings className={`w-5 h-5 stroke-[2] ${mainTab === 'settings' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] mt-0.5 tracking-tight font-medium">Settings</span>
          </button>
        </div>
      </aside>

      {/* Modals */}
      <NewChatModal isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} />
      <CreateGroupModal isOpen={isCreateGroupOpen} onClose={() => setIsCreateGroupOpen(false)} />
      <JoinGroupModal isOpen={isJoinGroupOpen} onClose={() => setIsJoinGroupOpen(false)} />
      <InstallAppModal isOpen={isInstallAppOpen} onClose={() => setIsInstallAppOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
    </>
  );
};
