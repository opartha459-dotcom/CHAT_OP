import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Users,
  Search,
  Trash2,
  Eye,
  ExternalLink,
  Layers,
  RefreshCw,
  X,
  FileText,
  Lock,
  Send,
  Calendar,
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { GridListView } from '../common/GridListView';

export const ChatsManagementTab = ({
  allChats = [],
  loading = false,
  loadAllChats,
  authHeaders,
  navigate,
  showFeedback
}) => {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'group' | 'private'
  const [searchQuery, setSearchQuery] = useState('');

  // Chat inspection state
  const [inspectingChat, setInspectingChat] = useState(null);
  const [inspectMessages, setInspectMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [deletingChatId, setDeletingChatId] = useState(null);

  // Filtered chats
  const filteredChats = useMemo(() => {
    return allChats.filter((c) => {
      // Type filter
      if (filterType !== 'all' && c.type !== filterType) return false;

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const groupName = c.groupDetails?.name?.toLowerCase() || '';
      const groupDesc = c.groupDetails?.description?.toLowerCase() || '';
      const participantMatches = c.participants?.some(
        (p) =>
          p.username?.toLowerCase().includes(q) ||
          p.nickname?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q)
      );

      return groupName.includes(q) || groupDesc.includes(q) || participantMatches;
    });
  }, [allChats, filterType, searchQuery]);

  // Open Chat Inspector Modal
  const handleInspectChat = async (convo) => {
    setInspectingChat(convo);
    setLoadingMessages(true);
    setMessageSearch('');
    try {
      const res = await fetch(`/api/admin/chats/${convo._id}/messages`, {
        headers: authHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          setInspectMessages(d.messages || []);
        } else {
          showFeedback?.(d.message || 'Failed to fetch messages.', 'error');
        }
      } else {
        showFeedback?.('Error loading messages for inspection.', 'error');
      }
    } catch (e) {
      console.warn('Inspect messages error', e);
      showFeedback?.('Failed to load chat messages.', 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Delete an entire chat / conversation
  const handleDeleteEntireChat = async (chatId) => {
    if (
      !window.confirm(
        'Are you sure you want to permanently delete this entire chat conversation and ALL of its messages? This action cannot be undone.'
      )
    ) {
      return;
    }

    setDeletingChatId(chatId);
    try {
      const res = await fetch(`/api/admin/chats/${chatId}`, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        showFeedback?.('Conversation and messages permanently deleted.', 'success');
        if (inspectingChat?._id === chatId) {
          setInspectingChat(null);
        }
        loadAllChats?.();
      } else {
        const d = await res.json().catch(() => ({}));
        showFeedback?.(d.message || 'Failed to delete chat.', 'error');
      }
    } catch (e) {
      console.error('Delete chat error', e);
      showFeedback?.('Failed to delete chat conversation.', 'error');
    } finally {
      setDeletingChatId(null);
    }
  };

  // Moderate / Delete an individual message
  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Delete this message from the conversation?')) return;

    setDeletingMessageId(msgId);
    try {
      const res = await fetch(`/api/admin/messages/${msgId}`, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        setInspectMessages((prev) => prev.filter((m) => m._id !== msgId));
        showFeedback?.('Message removed.', 'success');
      } else {
        const d = await res.json().catch(() => ({}));
        showFeedback?.(d.message || 'Failed to delete message.', 'error');
      }
    } catch (e) {
      console.error('Delete message error', e);
      showFeedback?.('Failed to delete message.', 'error');
    } finally {
      setDeletingMessageId(null);
    }
  };

  // Filter messages in inspection modal
  const filteredMessages = useMemo(() => {
    if (!messageSearch.trim()) return inspectMessages;
    const q = messageSearch.toLowerCase();
    return inspectMessages.filter(
      (m) =>
        m.content?.toLowerCase().includes(q) ||
        m.sender?.username?.toLowerCase().includes(q) ||
        m.sender?.nickname?.toLowerCase().includes(q)
    );
  }, [inspectMessages, messageSearch]);

  const groupCount = allChats.filter((c) => c.type === 'group').length;
  const privateCount = allChats.filter((c) => c.type === 'private').length;
  const totalMsgs = allChats.reduce((acc, c) => acc + (c.messageCount || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* ── TOP KPI SUMMARY CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Chats */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">All Conversations</span>
            <MessageSquare className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {allChats.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Active chat threads</div>
        </div>

        {/* Group Channels */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Group Channels</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {groupCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Multi-user communities</div>
        </div>

        {/* Direct Encrypted Chats */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Direct Messages</span>
            <Lock className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {privateCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">1-on-1 private threads</div>
        </div>

        {/* Total Messages Recorded */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Indexed Messages</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {totalMsgs.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Across all channels</div>
        </div>
      </div>

      {/* ── HEADER & SEARCH / FILTER CONTROLS ────────────────────────────── */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-indigo-500" />
              <span>Chats & Conversations Management</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Inspect messages, search active conversations, and moderate inappropriate content.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={loadAllChats}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
              title="Refresh conversations list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by channel name, description, or participant username..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Segmented Filter Pills */}
          <div className="w-full sm:w-auto grid grid-cols-3 sm:flex items-center gap-1 sm:space-x-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilterType('all')}
              className={`py-1.5 px-2 sm:px-3 text-center rounded-lg transition cursor-pointer text-xs ${
                filterType === 'all'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All ({allChats.length})
            </button>
            <button
              onClick={() => setFilterType('group')}
              className={`py-1.5 px-2 sm:px-3 text-center rounded-lg transition cursor-pointer text-xs ${
                filterType === 'group'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Groups ({groupCount})
            </button>
            <button
              onClick={() => setFilterType('private')}
              className={`py-1.5 px-2 sm:px-3 text-center rounded-lg transition cursor-pointer text-xs ${
                filterType === 'private'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Direct ({privateCount})
            </button>
          </div>
        </div>
      </div>

      {/* ── CONVERSATIONS LIST / GRID ─────────────────────────────────────── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Loading chat conversations...
          </p>
        </div>
      ) : filteredChats.length === 0 ? (
        <div className="py-16 px-4 flex flex-col items-center justify-center text-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-500">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
              No Conversations Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              {searchQuery
                ? 'No conversations match your search query.'
                : 'No active chat conversations exist yet on the platform.'}
            </p>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-xs font-semibold px-3 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition cursor-pointer"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChats.map((c) => {
            const isGroup = c.type === 'group';
            const title = isGroup
              ? c.groupDetails?.name || 'Group Channel'
              : c.participants?.map((p) => `@${p.username}`).join(' ↔ ') || 'Direct Chat';
            const desc = isGroup
              ? c.groupDetails?.description || 'Active group channel'
              : `1-on-1 private encrypted chat (${c.participants?.length || 2} members)`;

            return (
              <div
                key={c._id}
                className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs hover:border-indigo-500/50 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                {/* Card Top Info */}
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
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
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                        {desc}
                      </p>
                    </div>
                  </div>

                  {/* Participant Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {c.participants?.slice(0, 3).map((p) => (
                      <span
                        key={p._id || p}
                        className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] text-slate-600 dark:text-slate-300 font-mono"
                      >
                        <Avatar src={p.avatar} name={p.username || 'User'} size="xs" className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[80px]">@{p.username || 'user'}</span>
                      </span>
                    ))}
                    {(c.participants?.length || 0) > 3 && (
                      <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px] font-mono text-slate-400">
                        +{c.participants.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    <span className="flex items-center space-x-1">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{c.messageCount || 0} messages</span>
                    </span>
                    {c.createdAt && (
                      <span className="text-[10px]">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center space-x-2">
                  <button
                    onClick={() => navigate(`/chat?conversationId=${c._id}`)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                    title="Open directly in User Chat view"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Open</span>
                  </button>

                  <button
                    onClick={() => handleInspectChat(c)}
                    className="flex-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-xs"
                    title="Inspect messages in this thread"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </button>

                  <button
                    onClick={() => handleDeleteEntireChat(c._id)}
                    disabled={deletingChatId === c._id}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition cursor-pointer shrink-0"
                    title="Permanently delete conversation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CHAT INSPECTION MODAL / DRAWER ───────────────────────────────── */}
      {inspectingChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl h-[94vh] sm:h-[90vh] flex flex-col overflow-hidden">
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
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {inspectMessages.length} message(s) recorded in this thread
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => handleInspectChat(inspectingChat)}
                  disabled={loadingMessages}
                  className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  title="Refresh messages"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingMessages ? 'animate-spin text-indigo-500' : ''}`} />
                </button>
                <button
                  onClick={() => handleDeleteEntireChat(inspectingChat._id)}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 dark:hover:bg-rose-900/60 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                  title="Delete entire chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete Thread</span>
                </button>
                <button
                  onClick={() => setInspectingChat(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter / Search Bar inside modal */}
            <div className="px-4 py-2.5 bg-slate-100/60 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={messageSearch}
                  onChange={(e) => setMessageSearch(e.target.value)}
                  placeholder="Filter messages in this conversation..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <span className="text-[11px] font-mono text-slate-400 shrink-0">
                Showing {filteredMessages.length} of {inspectMessages.length}
              </span>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50 dark:bg-slate-950/20">
              {loadingMessages ? (
                <div className="h-full flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Retrieving conversation messages...
                  </p>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center space-y-2 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {messageSearch ? 'No matching messages' : 'Conversation is empty'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xs">
                    {messageSearch
                      ? 'Try another search keyword.'
                      : 'No messages have been sent in this conversation yet.'}
                  </p>
                </div>
              ) : (
                filteredMessages.map((m) => {
                  const sender = m.sender || {};
                  return (
                    <div
                      key={m._id}
                      className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <Avatar
                            src={sender.avatar}
                            name={sender.username || 'User'}
                            size="sm"
                            className="w-7 h-7"
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {sender.nickname || sender.username || 'Unknown Sender'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                @{sender.username || 'unknown'}
                              </span>
                              {sender.role === 'admin' && (
                                <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-[9px] font-bold rounded-md uppercase font-mono">
                                  admin
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <button
                            onClick={() => handleDeleteMessage(m._id)}
                            disabled={deletingMessageId === m._id}
                            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition cursor-pointer"
                            title="Delete this message"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Message Content */}
                      <div className="pl-9 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
                        {m.content || <span className="text-slate-400 italic">[No text content]</span>}
                      </div>

                      {/* Attachments if any */}
                      {m.fileUrl && (
                        <div className="pl-9 pt-1">
                          <a
                            href={m.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-semibold hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Attachment</span>
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
