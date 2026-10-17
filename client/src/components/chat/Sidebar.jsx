import React, { useState } from 'react';
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
  Smartphone
} from 'lucide-react';
import { PulseLogo } from '../common/PulseLogo';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../common/Avatar';
import { NewChatModal } from '../modals/NewChatModal';
import { CreateGroupModal } from '../modals/CreateGroupModal';
import { JoinGroupModal } from '../modals/JoinGroupModal';
import { InstallAppModal } from '../modals/InstallAppModal';
import { SettingsModal } from '../modals/SettingsModal';
import { AdminModal } from '../modals/AdminModal';

export const Sidebar = () => {
  const { user } = useAuth();
  const { conversations, activeConversation, selectConversation, tab, setTab, searchQuery, setSearchQuery } = useChat();
  const { onlineUsers } = useSocket();
  const { theme, setTheme } = useTheme();

  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isJoinGroupOpen, setIsJoinGroupOpen] = useState(false);
  const [isInstallAppOpen, setIsInstallAppOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

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

  return (
    <>
      <aside className="w-full md:w-80 lg:w-96 h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 select-none">
        {/* Top Navbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PulseLogo size="sm" animated={true} textClassName="text-slate-900 dark:text-white" />
            <span className="hidden sm:inline-flex px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-md items-center space-x-0.5">
              <Lock className="w-2.5 h-2.5 inline mr-0.5" />
              <span>E2EE</span>
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsNewChatOpen(true)}
              title="Start New Direct Chat"
              className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <MessageSquarePlus className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsCreateGroupOpen(true)}
              title="Create New Group"
              className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <Users className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsJoinGroupOpen(true)}
              title="Join Group with Code or Link"
              className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <UserPlus className="w-4 h-4" />
            </button>

            {user?.role === 'admin' && (
              <button
                onClick={() => setIsAdminOpen(true)}
                title="Admin Moderation Portal"
                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
              >
                <Shield className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle Theme"
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              title="Settings"
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search chats, contacts, and groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 px-4 pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
          {[
            { id: 'all', label: 'All Chats' },
            { id: 'pinned', label: 'Pinned', icon: Pin },
            { id: 'groups', label: 'Groups', icon: Users },
            { id: 'archived', label: 'Archived', icon: Archive }
          ].map((item) => {
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  isActive
                    ? 'bg-accent-light text-accent'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100/60 dark:divide-slate-800/40">
          {tab === 'groups' && (
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
          )}

          {filteredConversations.length === 0 ? (
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
            <button
              onClick={() => setIsInstallAppOpen(true)}
              title="Install PulseChat on Phone / Desktop"
              className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition"
            >
              <Smartphone className="w-4 h-4" />
            </button>
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
