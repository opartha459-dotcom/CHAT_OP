import React, { useState, useEffect } from 'react';
import { Search, X, MessageSquare, Shield, AlertCircle } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { Avatar } from '../common/Avatar';

export const NewChatModal = ({ isOpen, onClose }) => {
  const { authHeaders, selectConversation, fetchConversations } = useChat();
  const { onlineUsers } = useSocket();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setUsers([]);
      setError('');
      return;
    }

    if (!query || query.trim().length < 2) {
      setUsers([]);
      setLoading(false);
      setError('');
      return;
    }

    const search = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/users/search?query=${encodeURIComponent(query.trim())}`, {
          headers: authHeaders(),
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          setUsers(data.users);
        } else {
          setError(data.message || 'Error searching users');
        }
      } catch (err) {
        setError('Network error searching users');
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 250);
    return () => clearTimeout(debounce);
  }, [isOpen, query, authHeaders]);

  const handleStartChat = async (targetUserId) => {
    try {
      setLoading(true);
      const res = await fetch('/api/chats/private', {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ recipientId: targetUserId })
      });
      const data = await res.json();
      if (data.success) {
        await fetchConversations();
        selectConversation(data.conversation);
        onClose();
      } else {
        setError(data.message || 'Failed to start chat');
      }
    } catch (err) {
      setError('Error initiating conversation');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-white">Start New Chat</h2>
              <p className="text-xs text-slate-400">Discover and message people directly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by username, nickname, or email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              autoFocus
            />
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-4 mt-3 p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-[220px]">
          {loading && users.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-400">
              Searching directory...
            </div>
          ) : query.trim().length < 2 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 px-6">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <Shield className="w-6 h-6 text-accent" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Search by Username or Email</p>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 max-w-xs">
                To protect privacy, registered users are not publicly listed. Type at least 2 letters to find someone.
              </p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 px-4">
              <Search className="w-8 h-8 mb-2 text-slate-400 dark:text-slate-600 stroke-1" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No users found</p>
              <p className="text-xs mt-1">We couldn't find anyone matching "{query.trim()}". Try another search.</p>
            </div>
          ) : (
            users.map((targetUser) => {
              const isOnline = onlineUsers.has(targetUser._id) || targetUser.status === 'online';
              return (
                <div
                  key={targetUser._id}
                  onClick={() => handleStartChat(targetUser._id)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition group"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar
                      src={targetUser.avatar}
                      name={targetUser.nickname || targetUser.username}
                      size="md"
                      showOnlineStatus={true}
                      isOnline={isOnline}
                    />
                    <div className="text-left">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                          {targetUser.nickname || targetUser.username}
                        </span>
                        <span className="text-xs text-slate-400">@{targetUser.username}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                        {targetUser.bio || 'Available on PulseChat'}
                      </p>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 dark:text-indigo-300 rounded-lg transition">
                    Chat
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
