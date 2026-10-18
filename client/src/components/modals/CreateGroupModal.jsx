import React, { useState, useEffect } from 'react';
import {
  Users,
  X,
  Search,
  Check,
  AlertCircle,
  Shield,
  Sparkles,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border-0 sm:border border-slate-200 dark:border-slate-800 rounded-none sm:rounded-2xl w-full sm:max-w-lg h-full sm:h-auto sm:max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 sticky top-0 z-10 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <button
              onClick={onClose}
              className="p-1 -ml-1 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg sm:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Create New Group
              </h2>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Start a group chat with multiple contacts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition hidden sm:block"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleCreateGroup} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Group Name *
            </label>
            <input
              type="text"
              required
              maxLength={60}
              placeholder="e.g. Design Systems & Launch"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              maxLength={300}
              placeholder="Topic or guidelines for members..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
            />
          </div>

          {/* Selected Member Chips */}
          {selectedUsers.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Selected Members ({selectedUsers.length})
              </label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 max-h-24 overflow-y-auto">
                {selectedUsers.map((u) => (
                  <span
                    key={u._id}
                    className="inline-flex items-center space-x-1 pl-1.5 pr-1 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 text-xs rounded-lg"
                  >
                    <Avatar src={u.avatar} name={u.nickname || u.username} size="xs" />
                    <span className="font-medium text-[11px] truncate max-w-[120px]">
                      {u.nickname || u.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleUserSelection(u)}
                      className="p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full transition ml-0.5"
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
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Select Contacts to Add *
            </label>
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidates by name or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div className="max-h-40 sm:max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-1 space-y-1 bg-white dark:bg-slate-900/50">
              {candidates.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">
                  {searchQuery ? 'No matching contacts' : 'Type name to search...'}
                </div>
              ) : (
                candidates.map((cand) => {
                  const isSelected = selectedUserIds.includes(cand._id);
                  return (
                    <div
                      key={cand._id}
                      onClick={() => toggleUserSelection(cand)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition text-xs select-none active:scale-[0.99] ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Avatar src={cand.avatar} name={cand.nickname || cand.username} size="sm" />
                        <div className="truncate">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {cand.nickname || cand.username}
                          </div>
                          <div className="text-[11px] text-slate-400">@{cand.username}</div>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition flex-shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
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
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-500" />
              <span>Group Options</span>
            </span>
            <label className="flex items-start space-x-2.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyAdminsCanMessage}
                onChange={(e) => setOnlyAdminsCanMessage(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Only administrators can send messages (Announcement channel)</span>
            </label>
            <label className="flex items-start space-x-2.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyAdminsCanAddMembers}
                onChange={(e) => setOnlyAdminsCanAddMembers(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Only administrators can add members</span>
            </label>
          </div>

          {/* Sticky Bottom Submit Bar */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3 bg-white dark:bg-slate-900 sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || selectedUserIds.length === 0}
              className="flex-1 sm:flex-initial px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center justify-center space-x-1.5 cursor-pointer"
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
