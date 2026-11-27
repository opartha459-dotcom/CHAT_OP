import React, { useState, useEffect } from 'react';
import {
  Users,
  X,
  Search,
  Check,
  AlertCircle,
  Shield,
  ArrowRight,
  Sparkles,
  Megaphone,
  UserPlus,
  Loader2,
  Link2,
  Clipboard,
  CheckCircle2
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { Avatar } from '../common/Avatar';
import { ModalShell } from '../common/ModalShell';

export const CreateGroupModal = ({ isOpen, onClose, initialTab = 'create' }) => {
  const { authHeaders, selectConversation, fetchConversations, conversations } = useChat();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [onlyAdminsCanMessage, setOnlyAdminsCanMessage] = useState(false);
  const [onlyAdminsCanAddMembers, setOnlyAdminsCanAddMembers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Join Group tab state
  const [inviteInput, setInviteInput] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccessMsg, setJoinSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'create');
    } else {
      setInviteInput('');
      setJoinError('');
      setJoinSuccessMsg('');
      setError('');
    }
  }, [isOpen, initialTab]);

  const extractCode = (str) => {
    const match = str.trim().match(/(?:join\/|^)([a-fA-F0-9_-]{6,32})/);
    return match ? match[1] : str.trim();
  };

  const handlePasteInvite = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInviteInput(text);
        setJoinError('');
      }
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    const cleanCode = extractCode(inviteInput);
    if (!cleanCode) {
      setJoinError('Please enter a valid invite link or code');
      return;
    }

    setJoinLoading(true);
    setJoinError('');
    setJoinSuccessMsg('');
    try {
      const res = await fetch(`/api/groups/join/${encodeURIComponent(cleanCode)}`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setJoinSuccessMsg(data.message || 'Successfully joined group!');
        await fetchConversations();
        if (data.groupId) {
          const target = conversations.find((c) => c._id === data.groupId);
          if (target) selectConversation(target);
        }
        setTimeout(() => {
          onClose();
        }, 700);
      } else {
        setJoinError(data.message || 'Failed to join group');
      }
    } catch (err) {
      setJoinError(err.message || 'Network error while joining group');
    } finally {
      setJoinLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setAvatar('');
      setSearchQuery('');
      setSelectedUserIds([]);
      setSelectedUsers([]);
      setOnlyAdminsCanMessage(false);
      setOnlyAdminsCanAddMembers(false);
      setError('');
      return;
    }

    const searchUsers = async () => {
      setSearching(true);
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
      } finally {
        setSearching(false);
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

  const groupInitials = name.trim()
    ? name
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'GP';

  const isJoinTab = activeTab === 'join';

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={isJoinTab ? 'Join a Group' : 'Create New Group'}
      subtitle={
        isJoinTab
          ? 'Enter an invite code or link to join an existing channel'
          : 'Build a collaborative channel with your contacts'
      }
      icon={isJoinTab ? Link2 : Users}
      iconTone={isJoinTab ? 'indigo' : 'violet'}
      maxWidth="max-w-lg"
      headerBg={true}
      bodyPadding="p-0"
    >
      {/* Segmented Tab Switcher */}
      <div className="px-4 sm:px-6 pt-4 pb-1 bg-[#0B0F19]">
        <div
          role="tablist"
          aria-label="Group modal mode"
          className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-800/80"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'create'}
            onClick={() => {
              setActiveTab('create');
              setJoinError('');
              setJoinSuccessMsg('');
            }}
            className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-gradient-to-r from-purple-600/90 to-indigo-600/90 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Create Group</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'join'}
            onClick={() => {
              setActiveTab('join');
              setError('');
            }}
            className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'join'
                ? 'bg-gradient-to-r from-indigo-600/90 to-purple-600/90 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Join Group</span>
          </button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <form onSubmit={handleCreateGroup} className="flex flex-col">
          <div className="p-4 sm:p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Group Identity Card */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3.5">
            <div className="flex items-center space-x-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-600 to-fuchsia-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-purple-950/50 shrink-0 select-none">
                {groupInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Group Name *
                  </label>
                  <span className="text-[10px] font-mono text-slate-500">{name.length}/60</span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={60}
                  placeholder="e.g. Design Systems & Launch"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/50 rounded-xl transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Description (Optional)
                </label>
                <span className="text-[10px] font-mono text-slate-500">{description.length}/300</span>
              </div>
              <textarea
                rows={2}
                maxLength={300}
                placeholder="Topic, rules, or purpose for members..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/50 rounded-xl transition-all resize-none"
              />
            </div>
          </div>

          {/* Selected Members Strip */}
          {selectedUsers.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Selected Members</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600/25 text-purple-300 border border-purple-500/30 font-mono">
                  {selectedUsers.length} added
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-900/40 rounded-2xl border border-slate-800/80 max-h-28 overflow-y-auto">
                {selectedUsers.map((u) => (
                  <span
                    key={u._id}
                    className="inline-flex items-center space-x-1.5 pl-1.5 pr-1 py-1 bg-purple-950/60 border border-purple-500/30 text-purple-100 text-xs rounded-xl shadow-xs"
                  >
                    <Avatar src={u.avatar} name={u.nickname || u.username} size="xs" />
                    <span className="font-medium text-[11px] truncate max-w-[110px]">
                      {u.nickname || u.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleUserSelection(u)}
                      className="p-0.5 hover:bg-purple-800/60 rounded-full transition text-purple-300 cursor-pointer"
                      title="Remove member"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Member Picker */}
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Add Contacts *
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search contacts by name or @username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 text-xs bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/50 rounded-2xl transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="max-h-44 overflow-y-auto border border-slate-800/80 rounded-2xl p-1.5 space-y-1 bg-slate-900/30">
              {searching && candidates.length === 0 ? (
                <div className="py-6 flex items-center justify-center space-x-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  <span>Searching contacts...</span>
                </div>
              ) : candidates.length === 0 ? (
                <div className="text-center py-5 text-xs text-slate-500">
                  {searchQuery ? 'No matching contacts found' : 'Type a name or username to find contacts'}
                </div>
              ) : (
                candidates.map((cand) => {
                  const isSelected = selectedUserIds.includes(cand._id);
                  return (
                    <div
                      key={cand._id}
                      onClick={() => toggleUserSelection(cand)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition text-xs select-none ${
                        isSelected
                          ? 'bg-purple-900/35 border border-purple-500/45 text-purple-100'
                          : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Avatar src={cand.avatar} name={cand.nickname || cand.username} size="sm" />
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate">
                            {cand.nickname || cand.username}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">@{cand.username}</div>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border transition flex-shrink-0 ${
                          isSelected
                            ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 border-purple-400 text-white shadow-sm'
                            : 'border-slate-700 bg-slate-800/80'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Group Permissions */}
          <div className="p-3.5 bg-slate-900/40 rounded-2xl border border-slate-800/80 space-y-3">
            <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>Group Permissions</span>
            </span>

            <button
              type="button"
              onClick={() => setOnlyAdminsCanMessage((p) => !p)}
              className="w-full flex items-center justify-between text-left gap-3 cursor-pointer group"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <Megaphone className="w-4 h-4 text-slate-400 group-hover:text-purple-400 shrink-0" />
                <div>
                  <div className="text-xs font-medium text-slate-200">Announcement Mode</div>
                  <div className="text-[11px] text-slate-400">Only admins can send messages</div>
                </div>
              </div>
              <span
                className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
                  onlyAdminsCanMessage ? 'bg-purple-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    onlyAdminsCanMessage ? 'left-[18px]' : 'left-0.5'
                  }`}
                />
              </span>
            </button>

            <button
              type="button"
              onClick={() => setOnlyAdminsCanAddMembers((p) => !p)}
              className="w-full flex items-center justify-between text-left gap-3 cursor-pointer group"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <UserPlus className="w-4 h-4 text-slate-400 group-hover:text-purple-400 shrink-0" />
                <div>
                  <div className="text-xs font-medium text-slate-200">Admin-Only Invites</div>
                  <div className="text-[11px] text-slate-400">Only admins can add new members</div>
                </div>
              </div>
              <span
                className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
                  onlyAdminsCanAddMembers ? 'bg-purple-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    onlyAdminsCanAddMembers ? 'left-[18px]' : 'left-0.5'
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-800/80 flex items-center justify-end space-x-3 bg-[#0B0F19] sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-xl transition border border-slate-800/80 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim() || selectedUserIds.length === 0}
            className="flex-1 sm:flex-initial px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 rounded-xl shadow-lg shadow-purple-600/25 transition flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <span>
              {loading
                ? 'Creating Group...'
                : `Create Group${selectedUserIds.length > 0 ? ` (${selectedUserIds.length})` : ''}`}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
      ) : (
        <form onSubmit={handleJoinGroup} className="flex flex-col">
          <div className="p-4 sm:p-6 space-y-4">
            {joinError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{joinError}</span>
              </div>
            )}

            {joinSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-2.5 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{joinSuccessMsg}</span>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Link2 className="w-5 h-5 text-indigo-300" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-white">Invite Link or Code</h3>
                  <p className="text-[11px] text-slate-400">
                    Paste a group invite URL or 6–32 character code
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={inviteInput}
                  onChange={(e) => {
                    setInviteInput(e.target.value);
                    if (joinError) setJoinError('');
                  }}
                  placeholder="e.g. a3f8c2d9104b or https://.../join/a3f8c2d9104b"
                  className="flex-1 min-w-0 px-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 rounded-xl font-mono transition-all"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handlePasteInvite}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border border-slate-700/80 transition cursor-pointer shrink-0"
                  title="Paste from clipboard"
                >
                  <Clipboard className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Paste</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Ask a group admin to share their invite link or code from Group Info.
              </p>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="px-4 sm:px-6 py-3.5 border-t border-slate-800/80 flex items-center justify-end space-x-3 bg-[#0B0F19] sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-xl transition border border-slate-800/80 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={joinLoading || !inviteInput.trim()}
              className="flex-1 sm:flex-initial px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 rounded-xl shadow-lg shadow-indigo-600/25 transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              {joinLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Joining Group...</span>
                </>
              ) : (
                <>
                  <span>Join Group</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
};
