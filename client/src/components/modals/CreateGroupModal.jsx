import React, { useState, useEffect } from 'react';
import {
  Users,
  X,
  Search,
  Check,
  AlertCircle,
  Shield,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { Avatar } from '../common/Avatar';

export const CreateGroupModal = ({ isOpen, onClose }) => {
  const { authHeaders, selectConversation, fetchConversations } = useChat();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [onlyAdminsCanMessage, setOnlyAdminsCanMessage] = useState(false);
  const [onlyAdminsCanAddMembers, setOnlyAdminsCanAddMembers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setAvatar('');
      setSelectedUserIds([]);
      setSelectedUsers([]);
      setError('');
      return;
    }

    const searchUsers = async () => {
      try {
        const res = await fetch(`/api/users/search?query=${encodeURIComponent(searchQuery)}`, {
          headers: authHeaders(),
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          setCandidates(data.users || []);
        }
      } catch (err) {
        console.error('Failed to fetch candidate members', err);
      }
    };

    const debounce = setTimeout(searchUsers, 200);
    return () => clearTimeout(debounce);
  }, [isOpen, searchQuery, authHeaders]);

  const toggleUserSelection = (targetUser) => {
    if (selectedUserIds.includes(targetUser._id)) {
      setSelectedUserIds((prev) => prev.filter((id) => id !== targetUser._id));
      setSelectedUsers((prev) => prev.filter((u) => u._id !== targetUser._id));
    } else {
      setSelectedUserIds((prev) => [...prev, targetUser._id]);
      setSelectedUsers((prev) => [...prev, targetUser]);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a group name.');
      return;
    }
    if (selectedUserIds.length === 0) {
      setError('Please select at least 1 member to add.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          avatar,
          participantIds: selectedUserIds,
          onlyAdminsCanMessage,
          onlyAdminsCanAddMembers
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Error creating group');
      }

      await fetchConversations();
      selectConversation(data.group);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create group.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-lg h-full sm:h-auto sm:max-h-[88vh] bg-[#0B0F19] text-slate-100 border border-slate-800/90 rounded-2xl sm:rounded-[28px] shadow-2xl shadow-purple-950/30 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-800/80 bg-slate-900/40 sticky top-0 z-10 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-1 -ml-1 text-slate-400 hover:text-white rounded-lg sm:hidden cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.15)] font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Create New Group
              </h2>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Start a group chat with multiple contacts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-slate-400 hover:text-white hidden sm:flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleCreateGroup} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Group Name *
            </label>
            <input
              type="text"
              required
              maxLength={60}
              placeholder="e.g. Design Systems & Launch"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/50 rounded-2xl transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              maxLength={300}
              placeholder="Topic or guidelines for members..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 text-xs sm:text-sm bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/50 rounded-2xl transition-all resize-none"
            />
          </div>

          {/* Selected Member Chips */}
          {selectedUsers.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Selected Members ({selectedUsers.length})
              </label>
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-900/40 rounded-2xl border border-slate-800/80 max-h-24 overflow-y-auto">
                {selectedUsers.map((u) => (
                  <span
                    key={u._id}
                    className="inline-flex items-center space-x-1 pl-1.5 pr-1 py-1 bg-purple-950/60 border border-purple-500/30 text-purple-200 text-xs rounded-xl"
                  >
                    <Avatar src={u.avatar} name={u.nickname || u.username} size="xs" />
                    <span className="font-medium text-[11px] truncate max-w-[120px]">
                      {u.nickname || u.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleUserSelection(u)}
                      className="p-0.5 hover:bg-purple-800/60 rounded-full transition ml-0.5 text-purple-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Add Members Search */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Select Contacts to Add *
            </label>
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidates by name or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 text-xs bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/50 rounded-2xl transition-all"
              />
            </div>

            <div className="max-h-40 sm:max-h-36 overflow-y-auto border border-slate-800/80 rounded-2xl p-1.5 space-y-1 bg-slate-900/30">
              {candidates.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-500">
                  {searchQuery ? 'No matching contacts' : 'Type name to search...'}
                </div>
              ) : (
                candidates.map((cand) => {
                  const isSelected = selectedUserIds.includes(cand._id);
                  return (
                    <div
                      key={cand._id}
                      onClick={() => toggleUserSelection(cand)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition text-xs select-none ${
                        isSelected
                          ? 'bg-purple-900/30 border border-purple-500/40 text-purple-200'
                          : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Avatar src={cand.avatar} name={cand.nickname || cand.username} size="sm" />
                        <div className="truncate">
                          <div className="font-semibold text-white truncate">
                            {cand.nickname || cand.username}
                          </div>
                          <div className="text-[11px] text-slate-400">@{cand.username}</div>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition flex-shrink-0 ${
                          isSelected
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'border-slate-700 bg-slate-800/80'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Group Permissions Options */}
          <div className="p-3.5 bg-slate-900/40 rounded-2xl border border-slate-800/80 space-y-2.5">
            <span className="text-xs font-semibold text-slate-300 flex items-center space-x-2">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>Group Options</span>
            </span>
            <label className="flex items-start space-x-2.5 text-xs text-slate-400 cursor-pointer hover:text-slate-300 transition">
              <input
                type="checkbox"
                checked={onlyAdminsCanMessage}
                onChange={(e) => setOnlyAdminsCanMessage(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-purple-600 focus:ring-purple-500 bg-slate-900"
              />
              <span>Only administrators can send messages (Announcement channel)</span>
            </label>
            <label className="flex items-start space-x-2.5 text-xs text-slate-400 cursor-pointer hover:text-slate-300 transition">
              <input
                type="checkbox"
                checked={onlyAdminsCanAddMembers}
                onChange={(e) => setOnlyAdminsCanAddMembers(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-purple-600 focus:ring-purple-500 bg-slate-900"
              />
              <span>Only administrators can add members</span>
            </label>
          </div>

          {/* Sticky Bottom Submit Bar */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end space-x-3 bg-[#0B0F19] sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-xl transition border border-slate-800/80"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || selectedUserIds.length === 0}
              className="flex-1 sm:flex-initial px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 rounded-xl shadow-lg shadow-purple-600/25 transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <span>{loading ? 'Creating Group...' : 'Create Group'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
