import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
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
  Video,
  ArrowUpRight,
  ArrowDownLeft,
  MoreVertical,
  X
} from 'lucide-react';
import { PulseLogo } from '../common/PulseLogo';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useCall } from '../../context/CallContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../common/Avatar';
import { SidebarSkeleton } from '../common/Skeleton';
import { NewChatModal } from '../modals/NewChatModal';
import { CreateGroupModal } from '../modals/CreateGroupModal';
import { JoinGroupModal } from '../modals/JoinGroupModal';
import { InstallAppModal } from '../modals/InstallAppModal';
import { SettingsModal } from '../modals/SettingsModal';
import { AdminModal } from '../modals/AdminModal';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const Sidebar = () => {
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    selectConversation,
    tab,
    setTab,
    searchQuery,
    setSearchQuery,
    loadingConversations,
    authHeaders
  } = useChat();
  const { startCall } = useCall();
  const { socket, onlineUsers } = useSocket();
  const { theme, setTheme } = useTheme();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isJoinGroupOpen, setIsJoinGroupOpen] = useState(false);
  const [isInstallAppOpen, setIsInstallAppOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

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
    if (tab === 'calls') {
      fetchCallHistory();
    }
  }, [tab, fetchCallHistory]);

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
  const filteredConversations = conversations.filter((c) => {
    // Tab filter
    if (tab === 'pinned' && !c.isPinned) return false;
    if (tab === 'archived' && !c.isArchived) return false;
    if (tab === 'groups' && c.type !== 'group') return false;
    if (tab === 'all' && c.isArchived) return false;

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

  // Filter call history
  const filteredCalls = callHistory.filter((call) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const isGroup = call.conversation?.type === 'group' || call.conversation?.isGroup;
    if (isGroup) {
      return call.conversation?.groupDetails?.name?.toLowerCase().includes(q);
    }
    const otherUser = call.conversation?.participants?.find((p) => (p._id || p) !== user?._id);
    return (
      otherUser?.nickname?.toLowerCase().includes(q) ||
      otherUser?.username?.toLowerCase().includes(q) ||
      call.sender?.nickname?.toLowerCase().includes(q) ||
      call.sender?.username?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <aside className="w-full md:w-80 lg:w-96 h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 select-none">
        {/* Top Navbar */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PulseLogo size="sm" animated={false} />
          </div>

          <div className="flex items-center space-x-1 relative" ref={menuRef}>
            <button
              onClick={() => setIsNewChatOpen(true)}
              title="Start New Direct Chat"
              className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition active:scale-95"
            >
              <MessageSquarePlus className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              title="More options"
              className={`p-2 rounded-xl transition active:scale-95 ${
                isMenuOpen
                  ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Floating Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-800/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xl py-1.5 z-50 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsNewChatOpen(true);
                  }}
                  className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center space-x-2.5 transition text-left"
                >
                  <MessageSquarePlus className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  <span className="font-medium">New Direct Chat</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsCreateGroupOpen(true);
                  }}
                  className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center space-x-2.5 transition text-left"
                >
                  <Users className="w-4 h-4 text-sky-500 flex-shrink-0" />
                  <span className="font-medium">New Group</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsJoinGroupOpen(true);
                  }}
                  className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center space-x-2.5 transition text-left"
                >
                  <UserPlus className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="font-medium">Join Group</span>
                </button>

                {user?.role === 'admin' && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsAdminOpen(true);
                    }}
                    className="w-full px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center space-x-2.5 transition text-left"
                  >
                    <Shield className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">Admin Portal</span>
                  </button>
                )}

                <div className="my-1 border-t border-slate-100 dark:border-slate-700/60" />

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setTheme(theme === 'dark' ? 'light' : 'dark');
                  }}
                  className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center justify-between transition text-left"
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
                    setIsInstallAppOpen(true);
                  }}
                  className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center space-x-2.5 transition text-left"
                >
                  <Smartphone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="font-medium">Install App</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsSettingsOpen(true);
                  }}
                  className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center space-x-2.5 transition text-left"
                >
                  <Settings className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="font-medium">Settings</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search input */}
        <div className="px-4 py-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search chats, contacts, and calls..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/50 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1.5 px-4 pb-2.5 border-b border-slate-100 dark:border-slate-800 text-xs overflow-x-auto no-scrollbar scroll-smooth">
          {[
            { id: 'all', label: 'All' },
            { id: 'pinned', label: 'Pinned' },
            { id: 'groups', label: 'Groups' },
            { id: 'calls', label: 'Calls' },
            { id: 'archived', label: 'Archived' }
          ].map((item) => {
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`px-3 py-1.5 rounded-full font-medium transition flex-shrink-0 active:scale-95 text-xs ${
                  isActive
                    ? 'bg-accent text-white shadow-xs font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-700/70 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area: Call History vs Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100/60 dark:divide-slate-800/40">
          {tab === 'calls' ? (
            loadingCalls ? (
              <SidebarSkeleton count={6} />
            ) : filteredCalls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 px-6">
                <PhoneMissed className="w-8 h-8 stroke-1 mb-2 text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">No call history yet</p>
                <p className="text-[11px] mt-1 text-slate-400">Audio and video calls will be recorded here</p>
              </div>
            ) : (
              filteredCalls.map((call) => {
                const isGroup = call.conversation?.type === 'group' || call.conversation?.isGroup;
                const otherUser = isGroup
                  ? null
                  : call.conversation?.participants?.find((p) => (p._id || p)?.toString() !== user?._id?.toString()) || call.sender;
                const title = isGroup
                  ? call.conversation?.groupDetails?.name || 'Group Call'
                  : otherUser?.nickname || otherUser?.username || 'User';
                const avatarUrl = isGroup ? call.conversation?.groupDetails?.avatar : otherUser?.avatar;
                const otherUserIdStr = (otherUser?._id || otherUser)?.toString();
                const isOnline = !isGroup && (onlineUsers.has(otherUserIdStr) || otherUser?.status === 'online');

                const callMeta = call.callMetadata || {};
                const isVideo = callMeta.callType === 'video';
                const status = callMeta.status || 'completed';
                const isMe = (call.sender?._id || call.sender)?.toString() === user?._id?.toString();
                const duration = callMeta.duration || 0;
                const mins = Math.floor(duration / 60);
                const secs = duration % 60;
                const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

                const isMissed = !isMe && (status === 'missed' || status === 'busy');

                let StatusIcon = isVideo ? Video : Phone;
                let statusColor = 'text-emerald-500';
                let statusLabel = isVideo ? 'Video Call' : 'Voice Call';

                if (isMissed) {
                  StatusIcon = PhoneMissed;
                  statusColor = 'text-rose-500';
                  statusLabel = status === 'busy' ? `Missed (${isVideo ? 'Video' : 'Voice'} • Busy)` : `Missed ${isVideo ? 'Video' : 'Voice'}`;
                } else if (status === 'busy') {
                  StatusIcon = PhoneOff;
                  statusColor = 'text-amber-500';
                  statusLabel = 'User Busy';
                } else if (status === 'rejected') {
                  StatusIcon = PhoneOff;
                  statusColor = 'text-slate-400';
                  statusLabel = 'Declined';
                } else if (isMe) {
                  StatusIcon = ArrowUpRight;
                  statusColor = 'text-emerald-500';
                  statusLabel = `Outgoing • ${durationStr}`;
                } else {
                  StatusIcon = ArrowDownLeft;
                  statusColor = 'text-emerald-500';
                  statusLabel = `Incoming • ${durationStr}`;
                }

                const timeStr = call.createdAt
                  ? new Date(call.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : '';

                const handleStartCall = (e, callType) => {
                  e.stopPropagation();
                  const conv =
                    conversations.find((c) => c._id === (call.conversation?._id || call.conversation)) ||
                    call.conversation;
                  if (!conv) return;

                  startCall({
                    conversationId: conv._id,
                    isGroup: !!isGroup,
                    callType,
                    targetUser: !isGroup ? otherUser : null,
                    participants: conv.participants || []
                  });
                };

                const handleRowClick = () => {
                  const conv = conversations.find(
                    (c) => c._id === (call.conversation?._id || call.conversation)
                  );
                  if (conv) selectConversation(conv);
                };

                return (
                  <div
                    key={call._id}
                    onClick={handleRowClick}
                    className="flex items-center space-x-3 p-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition border-l-4 border-transparent group"
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar src={avatarUrl} name={title} size="md" />
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className={`text-xs font-semibold truncate ${
                          isMissed ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-800 dark:text-white'
                        }`}>
                          {title}
                        </h3>
                        <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">
                          {timeStr}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <StatusIcon className={`w-3.5 h-3.5 flex-shrink-0 ${statusColor}`} />
                        <span className="truncate text-[11px] font-medium">{statusLabel}</span>
                      </div>
                    </div>

                    {/* Direct Call Back action buttons */}
                    <div className="flex items-center space-x-1 flex-shrink-0 pl-1">
                      <button
                        onClick={(e) => handleStartCall(e, 'audio')}
                        title="Voice Call Back"
                        className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition active:scale-95"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleStartCall(e, 'video')}
                        title="Video Call Back"
                        className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition active:scale-95"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )
          ) : tab === 'groups' ? (
            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border-b border-indigo-100/60 dark:border-indigo-900/40 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300">
                <UserPlus className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                <span>Join with Code or Link</span>
              </div>
              <button
                onClick={() => setIsJoinGroupOpen(true)}
                className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
              >
                Join
              </button>
            </div>
          ) : null}

          {tab !== 'calls' && (
            loadingConversations ? (
              <SidebarSkeleton count={6} />
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 px-6">
                <MessageSquarePlus className="w-8 h-8 stroke-1 mb-2 text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">No conversations yet</p>
                <p className="text-[11px] mt-1 text-slate-400">Click + New Chat to connect with someone</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = activeConversation && activeConversation._id === conv._id;
                const isGroup = conv.type === 'group';

                const title = isGroup
                  ? conv.groupDetails?.name || 'Group'
                  : conv.otherUser?.nickname || conv.otherUser?.username || 'User';

                const avatarUrl = isGroup ? conv.groupDetails?.avatar : conv.otherUser?.avatar;

                const isOnline = !isGroup && (
                  onlineUsers.has(conv.otherUser?._id) || conv.otherUser?.status === 'online'
                );

                const lastMsg = conv.lastMessage;
                let snippet = 'No messages yet';
                if (lastMsg) {
                  if (lastMsg.isDeletedForEveryone) snippet = 'This message was deleted';
                  else if (lastMsg.fileUrl) snippet = `📎 ${lastMsg.fileName || 'Attachment'}`;
                  else snippet = lastMsg.content || 'Encrypted message';
                }

                const timeStr = lastMsg?.createdAt
                  ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <div
                    key={conv._id}
                    onClick={() => selectConversation(conv)}
                    className={`flex items-center space-x-3 p-3.5 cursor-pointer transition ${
                      isSelected
                        ? 'bg-accent-light border-l-4 border-accent'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border-l-4 border-transparent'
                    }`}
                  >
                    <Avatar
                      src={avatarUrl}
                      name={title}
                      size="md"
                      showOnlineStatus={!isGroup}
                      isOnline={isOnline}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs font-semibold truncate ${
                          isSelected
                            ? 'text-accent font-bold'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}>
                          {title}
                        </span>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">{timeStr}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate pr-2">
                          {snippet}
                        </p>

                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          {conv.isMuted && <VolumeX className="w-3 h-3 text-slate-400" />}
                          {conv.isPinned && <Pin className="w-3 h-3 text-accent" />}
                          {conv.unreadCount > 0 && (
                            <span className="min-w-4.5 h-4.5 px-1 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>

        {/* User bar at bottom */}
        <div className="p-3 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <Avatar src={user?.avatar} name={user?.nickname || user?.username} size="sm" isOnline={true} showOnlineStatus={true} />
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                {user?.nickname || user?.username}
              </div>
              <div className="text-[11px] text-emerald-500 font-medium">Online</div>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {!isInstalled && (
              <button
                onClick={handleInstallClick}
                title="Install PulseChat on Phone / Desktop"
                className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
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
