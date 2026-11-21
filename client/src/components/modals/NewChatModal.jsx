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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-[#0B0F19] text-slate-100 border border-slate-800/90 rounded-[28px] shadow-2xl shadow-purple-950/30 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.15)] font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Start New Chat</h2>
              <p className="text-xs text-slate-400">Discover and message people directly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search bar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/20">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by username, nickname, or email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/50 rounded-2xl transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-4 mt-3 p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[220px]">
          {loading && users.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-400">
              Searching directory...
            </div>
          ) : query.trim().length < 2 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 px-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3 text-purple-400">
                <Shield className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-200">Search by Username or Email</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                To protect privacy, registered users are not publicly listed. Type at least 2 letters to find someone.
              </p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 px-4">
              <Search className="w-8 h-8 mb-2 text-slate-600 stroke-1" />
              <p className="text-sm font-medium text-slate-300">No users found</p>
              <p className="text-xs mt-1 text-slate-500">We couldn't find anyone matching "{query.trim()}". Try another search.</p>
            </div>
          ) : (
            users.map((targetUser) => {
              const isOnline = Boolean(targetUser._id && onlineUsers.has(targetUser._id.toString()));
              return (
                <div
                  key={targetUser._id}
                  onClick={() => handleStartChat(targetUser._id)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/40 hover:bg-slate-800/70 border border-slate-800/70 hover:border-purple-500/30 cursor-pointer transition-all group"
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
                        <span className="text-sm font-semibold text-white group-hover:text-purple-400 transition">
                          {targetUser.nickname || targetUser.username}
                        </span>
                        <span className="text-xs text-slate-400">@{targetUser.username}</span>
                      </div>
                      <p className="text-xs text-slate-400 truncate max-w-[200px]">
                        {targetUser.bio || 'Available on PulseChat'}
                      </p>
                    </div>
                  </div>
                  <button className="px-3.5 py-1.5 text-xs font-semibold bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-xl transition shadow-sm">
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
