import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Check,
  Forward,
  Users,
  UserPlus,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { ModalShell } from '../common/ModalShell';

export const ForwardModal = ({ isOpen, onClose, messages = [], onForwarded }) => {
  const { conversations, authHeaders, fetchConversations } = useChat();
  const { user: currentUser } = useAuth();

  const [query, setQuery] = useState('');
  const [selectedConvIds, setSelectedConvIds] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]); // { _id, nickname, username, avatar }
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedConvIds([]);
      setSelectedUsers([]);
      setSearchedUsers([]);
      setError('');
      setSending(false);
    }
  }, [isOpen]);

  // Search all users in the app when query >= 2 chars
  useEffect(() => {
    const q = query.trim();
    if (!isOpen || q.length < 2) {
      setSearchedUsers([]);
      setSearching(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?query=${encodeURIComponent(q)}`, {
          headers: authHeaders(),
          credentials: 'include',
          signal: controller.signal
        });
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.users)) {
          setSearchedUsers(data.users);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('[Forward User Search Error]', err);
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, query, authHeaders]);

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (conversations || []).filter((c) => {
      if (!q) return true;
      if (c.type === 'group') {
        return c.groupDetails?.name?.toLowerCase().includes(q);
      }
      return (
        c.otherUser?.nickname?.toLowerCase().includes(q) ||
        c.otherUser?.username?.toLowerCase().includes(q)
      );
    });
  }, [conversations, query]);

  // Exclude users that already have a direct conversation in filteredConversations
  const existingDirectUserIds = useMemo(() => {
    const set = new Set();
    if (currentUser?._id) set.add(currentUser._id.toString());
    (conversations || []).forEach((c) => {
      if (c.type !== 'group' && c.otherUser?._id) {
        set.add(c.otherUser._id.toString());
      }
    });
    return set;
  }, [conversations, currentUser?._id]);

  const additionalDirectoryUsers = useMemo(() => {
    return searchedUsers.filter((u) => u._id && !existingDirectUserIds.has(u._id.toString()));
  }, [searchedUsers, existingDirectUserIds]);

  const toggleConversation = (convId) => {
    setSelectedConvIds((prev) =>
      prev.includes(convId) ? prev.filter((id) => id !== convId) : [...prev, convId]
    );
    if (error) setError('');
  };

  const toggleUser = (userObj) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u._id === userObj._id)
        ? prev.filter((u) => u._id !== userObj._id)
        : [...prev, userObj]
    );
    if (error) setError('');
  };

  const totalTargets = selectedConvIds.length + selectedUsers.length;

  const handleForward = async () => {
    if (totalTargets === 0 || messages.length === 0 || sending) return;

    setSending(true);
    setError('');
    try {
      const sortedMessages = [...messages].sort(
        (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
      );

      const res = await fetch('/api/messages/forward', {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          items: sortedMessages.map((m) => ({
            messageId: m._id,
            content: m.content
          })),
          targetConversationIds: selectedConvIds,
          targetUserIds: selectedUsers.map((u) => u._id)
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to forward messages.');
        return;
      }

      await fetchConversations();
      onForwarded?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Network error forwarding messages.');
    } finally {
      setSending(false);
    }
  };

  const previewSummary = useMemo(() => {
    if (messages.length === 0) return '';
    if (messages.length === 1) {
      const m = messages[0];
      if (m.content) return m.content;
      if (m.messageType === 'image') return 'Photo attachment';
      if (m.messageType === 'video') return 'Video attachment';
      if (m.messageType === 'audio') return 'Voice message';
      if (m.fileName) return m.fileName;
      return 'Message';
    }
    return `${messages.length} messages selected`;
  }, [messages]);

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Forward Message"
      subtitle={messages.length > 1 ? `Forwarding ${messages.length} messages` : 'Send to any chat, group, or contact'}
      icon={Forward}
      iconTone="indigo"
      maxWidth="max-w-md"
      headerBg={true}
      bodyPadding="p-0"
    >
      <div className="flex flex-col">
        <div className="p-4 space-y-3">
          {error && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2 text-xs text-rose-500 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Message Preview Pill */}
          <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 truncate flex items-center space-x-2">
            <Forward className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">{previewSummary}</span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats, groups, or any user..."
              className="w-full pl-10 pr-8 py-2.5 text-xs bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 rounded-2xl transition"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Target List */}
          <div className="max-h-72 overflow-y-auto space-y-1 pr-0.5">
            {filteredConversations.length > 0 && (
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 pt-1">
                Recent Chats & Groups
              </div>
            )}

            {filteredConversations.map((conv) => {
              const isGroup = conv.type === 'group';
              const title = isGroup
                ? conv.groupDetails?.name || 'Group'
                : conv.otherUser?.nickname || conv.otherUser?.username || 'User';
              const avatar = isGroup ? conv.groupDetails?.avatar : conv.otherUser?.avatar;
              const isSelected = selectedConvIds.includes(conv._id);

              return (
                <button
                  key={conv._id}
                  type="button"
                  onClick={() => toggleConversation(conv._id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-400/50'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Avatar src={avatar} name={title} size="sm" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate flex items-center space-x-1">
                        <span className="truncate">{title}</span>
                        {isGroup && <Users className="w-3 h-3 text-indigo-400 shrink-0" />}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {isGroup
                          ? `${conv.participants?.length || 0} members`
                          : `@${conv.otherUser?.username || 'user'}`}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}

            {/* Directory Users */}
            {query.trim().length >= 2 && (
              <>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 pt-2 flex items-center space-x-1">
                  <UserPlus className="w-3 h-3" />
                  <span>Other People on PulseChat</span>
                </div>
                {searching ? (
                  <div className="py-4 flex items-center justify-center space-x-2 text-xs text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Searching directory...</span>
                  </div>
                ) : additionalDirectoryUsers.length === 0 && filteredConversations.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">No matching users or chats found.</div>
                ) : (
                  additionalDirectoryUsers.map((u) => {
                    const isSelected = selectedUsers.some((sel) => sel._id === u._id);
                    const name = u.nickname || u.username;
                    return (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() => toggleUser(u)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-400/50'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <Avatar src={u.avatar} name={name} size="sm" />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{name}</div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">@{u.username}</div>
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </>
            )}

            {filteredConversations.length === 0 && query.trim().length < 2 && (
              <div className="py-8 text-center text-xs text-slate-400">
                Type a name or @username to find anyone on PulseChat.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50 dark:bg-[#0B0F19]">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {totalTargets === 0 ? 'Select recipients' : `${totalTargets} selected`}
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={totalTargets === 0 || sending}
              onClick={handleForward}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center space-x-1.5 cursor-pointer"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Forward className="w-3.5 h-3.5" />}
              <span>{sending ? 'Forwarding...' : `Forward${totalTargets > 0 ? ` (${totalTargets})` : ''}`}</span>
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};
