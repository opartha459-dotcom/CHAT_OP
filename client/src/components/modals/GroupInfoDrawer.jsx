import React, { useState, useEffect } from 'react';
import {
  Users,
  X,
  Crown,
  Shield,
  UserMinus,
  UserPlus,
  Share2,
  Copy,
  Check,
  LogOut,
  AlertCircle,
  Phone,
  Video,
  Search,
  Edit3,
  Save,
  Settings,
  Link2,
  RefreshCw,
  ArrowLeft,
  Lock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useCall } from '../../context/CallContext';
import { Avatar } from '../common/Avatar';

export const GroupInfoDrawer = ({ isOpen, onClose, group }) => {
  const { user } = useAuth();
  const { authHeaders, selectConversation, fetchConversations } = useChat();
  const { startCall } = useCall();

  const [copied, setCopied] = useState(false);
  const [inviteCode, setInviteCode] = useState(group?.groupDetails?.inviteCode || '');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Editing group metadata
  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState(group?.groupDetails?.name || '');
  const [groupDesc, setGroupDesc] = useState(group?.groupDetails?.description || '');
  const [onlyAdminsMessage, setOnlyAdminsMessage] = useState(!!group?.groupDetails?.onlyAdminsCanMessage);
  const [onlyAdminsAdd, setOnlyAdminsAdd] = useState(!!group?.groupDetails?.onlyAdminsCanAddMembers);

  // Add members inline modal/sheet
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [candidateQuery, setCandidateQuery] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [addingMembers, setAddingMembers] = useState(false);

  // Member search filter
  const [memberFilter, setMemberFilter] = useState('');

  useEffect(() => {
    if (group?.groupDetails) {
      setInviteCode(group.groupDetails.inviteCode || '');
      setGroupName(group.groupDetails.name || '');
      setGroupDesc(group.groupDetails.description || '');
      setOnlyAdminsMessage(!!group.groupDetails.onlyAdminsCanMessage);
      setOnlyAdminsAdd(!!group.groupDetails.onlyAdminsCanAddMembers);
    }
  }, [group]);

  // Search candidate members to add
  useEffect(() => {
    if (!showAddMembers) return;
    const searchTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?query=${encodeURIComponent(candidateQuery)}`, {
          headers: authHeaders(),
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          // Filter out users already in group
          const existingIds = new Set((group?.participants || []).map((p) => (p._id || p).toString()));
          setCandidates((data.users || []).filter((u) => !existingIds.has(u._id.toString())));
        }
      } catch (err) {
        console.error('Failed to search candidate members', err);
      }
    }, 200);

    return () => clearTimeout(searchTimer);
  }, [showAddMembers, candidateQuery, group, authHeaders]);

  if (!isOpen || !group) return null;

  const currentUserId = user?._id?.toString();
  const isOwner = (group.groupDetails?.owner?._id || group.groupDetails?.owner)?.toString() === currentUserId;
  const isAdmin = group.groupDetails?.admins?.some((a) => (a._id || a)?.toString() === currentUserId);
  const canAddMembers = !group.groupDetails?.onlyAdminsCanAddMembers || isOwner || isAdmin;

  const showMsg = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3000);
  };

  // Generate / reset invite link
  const handleGenerateInvite = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/groups/${group._id}/invite`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setInviteCode(data.inviteCode);
        showMsg('New invite code generated!');
      }
    } catch (err) {
      showMsg('Failed to generate invite link');
    } finally {
      setLoading(false);
    }
  };

  const inviteUrl = `${window.location.origin}/join/${inviteCode}`;

  // Native phone share or copy
  const handleShareGroup = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join "${group.groupDetails?.name || 'PulseChat Group'}"`,
          text: `Join our group chat "${group.groupDetails?.name}" on PulseChat:`,
          url: inviteUrl
        });
        return;
      } catch (e) {
        // user cancelled or share failed, fallback to copy
      }
    }
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    showMsg('Invite link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCodeOnly = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    showMsg('Invite code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Save updated group details
  const handleSaveDetails = async (e) => {
    e?.preventDefault();
    if (!groupName.trim()) {
      showMsg('Group name cannot be empty');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/groups/${group._id}`, {
        method: 'PUT',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDesc.trim(),
          onlyAdminsCanMessage: onlyAdminsMessage,
          onlyAdminsCanAddMembers: onlyAdminsAdd
        })
      });
      const data = await res.json();
      if (data.success) {
        showMsg('Group settings updated!');
        setIsEditing(false);
        fetchConversations();
      } else {
        showMsg(data.message || 'Failed to update group');
      }
    } catch (err) {
      showMsg('Error updating group settings');
    } finally {
      setLoading(false);
    }
  };

  // Add selected candidates
  const handleAddSelectedMembers = async () => {
    if (selectedCandidateIds.length === 0) return;
    try {
      setAddingMembers(true);
      const res = await fetch(`/api/groups/${group._id}/members`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ memberIds: selectedCandidateIds })
      });
      const data = await res.json();
      if (data.success) {
        showMsg('Members added successfully!');
        setShowAddMembers(false);
        setSelectedCandidateIds([]);
        setCandidateQuery('');
        fetchConversations();
      } else {
        showMsg(data.message || 'Error adding members');
      }
    } catch (err) {
      showMsg('Network error adding members');
    } finally {
      setAddingMembers(false);
    }
  };

  // Promote admin
  const handlePromoteAdmin = async (memberId) => {
    try {
      const res = await fetch(`/api/groups/${group._id}/promote/${memberId}`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        showMsg('Member promoted to admin');
        fetchConversations();
      } else {
        showMsg(data.message || 'Error promoting member');
      }
    } catch (err) {
      showMsg('Error promoting member');
    }
  };

  // Demote admin
  const handleDemoteAdmin = async (memberId) => {
    try {
      const res = await fetch(`/api/groups/${group._id}/demote/${memberId}`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        showMsg('Admin demoted to regular member');
        fetchConversations();
      } else {
        showMsg(data.message || 'Error demoting admin');
      }
    } catch (err) {
      showMsg('Error demoting admin');
    }
  };

  // Remove member
  const handleRemoveMember = async (member) => {
    const memberName = member.nickname || member.username;
    if (!window.confirm(`Remove ${memberName} from this group?`)) return;
    try {
      const res = await fetch(`/api/groups/${group._id}/members/${member._id}`, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        showMsg(`${memberName} removed`);
        fetchConversations();
      } else {
        showMsg(data.message || 'Error removing member');
      }
    } catch (err) {
      showMsg('Error removing member');
    }
  };

  // Leave group
  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      const res = await fetch(`/api/groups/${group._id}/leave`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        await fetchConversations();
        selectConversation(null);
        onClose();
      } else {
        showMsg(data.message || 'Failed to leave group');
      }
    } catch (err) {
      showMsg('Error leaving group');
    }
  };

  // Filter members list
  const filteredMembers = (group.participants || []).filter((m) => {
    if (!memberFilter.trim()) return true;
    const q = memberFilter.toLowerCase();
    return (
      m.nickname?.toLowerCase().includes(q) ||
      m.username?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="hidden md:block flex-1" onClick={onClose} />

      {/* Drawer Container */}
      <div className="w-full sm:w-[420px] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden">
        {/* Top Sticky Header */}
        <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <button
              onClick={onClose}
              className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Close drawer"
            >
              <ArrowLeft className="w-5 h-5 sm:hidden" />
              <X className="w-5 h-5 hidden sm:block" />
            </button>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Group Information</h2>
          </div>

          {(isOwner || isAdmin) && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg flex items-center space-x-1 transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}
        </div>

        {/* Feedback Alert Toast */}
        {feedback && (
          <div className="mx-4 mt-2 p-2.5 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs rounded-xl flex items-center space-x-2 animate-in fade-in flex-shrink-0">
            <Sparkles className="w-4 h-4 flex-shrink-0 text-indigo-500" />
            <span className="font-medium">{feedback}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Group Profile Hero Card */}
          <div className="p-4 bg-gradient-to-b from-indigo-50/60 to-slate-50/30 dark:from-indigo-950/20 dark:to-slate-800/20 rounded-2xl border border-indigo-100/80 dark:border-indigo-950/50 flex flex-col items-center text-center">
            <div className="relative">
              <Avatar
                src={group.groupDetails?.avatar}
                name={group.groupDetails?.name || 'Group'}
                size="xl"
              />
              <span className="absolute -bottom-1 -right-1 p-1 bg-indigo-600 text-white rounded-full shadow-md" title="Group Chat">
                <Users className="w-3.5 h-3.5" />
              </span>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveDetails} className="w-full mt-3 space-y-3 text-left">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    maxLength={60}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    maxLength={300}
                    placeholder="Group guidelines or topic..."
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                  />
                </div>

                {/* Permission Toggles */}
                <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
                  <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                    <Settings className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Permissions</span>
                  </div>

                  <label className="flex items-center space-x-2 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onlyAdminsMessage}
                      onChange={(e) => setOnlyAdminsMessage(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Announcement Channel (Only admins can message)</span>
                  </label>

                  <label className="flex items-center space-x-2 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onlyAdminsAdd}
                      onChange={(e) => setOnlyAdminsAdd(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Only admins can add members</span>
                  </label>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center space-x-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white break-words">
                  {group.groupDetails?.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[280px] break-words">
                  {group.groupDetails?.description || 'No description provided.'}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5 items-center justify-center text-[10px] font-semibold">
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300">
                    {group.participants?.length || 0} Members
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center space-x-1">
                    <Lock className="w-2.5 h-2.5" />
                    <span>E2EE Encrypted</span>
                  </span>
                  {group.groupDetails?.onlyAdminsCanMessage && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300">
                      Announcements Only
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Quick Actions Row */}
          {!isEditing && (
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  startCall({
                    conversationId: group._id,
                    isGroup: true,
                    callType: 'audio',
                    participants: group.participants || []
                  })
                }
                className="p-2.5 bg-slate-50 dark:bg-slate-800/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200/80 dark:border-slate-800 rounded-xl text-center transition group cursor-pointer"
              >
                <Phone className="w-4 h-4 mx-auto text-emerald-500 group-hover:scale-110 transition" />
                <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 mt-1">Audio Call</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  startCall({
                    conversationId: group._id,
                    isGroup: true,
                    callType: 'video',
                    participants: group.participants || []
                  })
                }
                className="p-2.5 bg-slate-50 dark:bg-slate-800/70 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-800 rounded-xl text-center transition group cursor-pointer"
              >
                <Video className="w-4 h-4 mx-auto text-indigo-500 group-hover:scale-110 transition" />
                <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 mt-1">Video Call</span>
              </button>

              <button
                type="button"
                onClick={handleShareGroup}
                className="p-2.5 bg-slate-50 dark:bg-slate-800/70 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-slate-200/80 dark:border-slate-800 rounded-xl text-center transition group cursor-pointer"
                title="Share group link on phone"
              >
                <Share2 className="w-4 h-4 mx-auto text-sky-500 group-hover:scale-110 transition" />
                <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 mt-1">
                  {copied ? 'Copied!' : 'Share Link'}
                </span>
              </button>
            </div>
          )}

          {/* Add Members Section if toggled */}
          {showAddMembers && (
            <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center space-x-1.5">
                  <UserPlus className="w-4 h-4 text-indigo-500" />
                  <span>Add New Members</span>
                </span>
                <button
                  onClick={() => setShowAddMembers(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user by name or username..."
                  value={candidateQuery}
                  onChange={(e) => setCandidateQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  autoFocus
                />
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-1 bg-white dark:bg-slate-900">
                {candidates.length === 0 ? (
                  <div className="py-3 text-center text-xs text-slate-400">
                    {candidateQuery ? 'No matching users found' : 'Type to search candidates...'}
                  </div>
                ) : (
                  candidates.map((cand) => {
                    const isSelected = selectedCandidateIds.includes(cand._id);
                    return (
                      <div
                        key={cand._id}
                        onClick={() => {
                          setSelectedCandidateIds((prev) =>
                            isSelected ? prev.filter((id) => id !== cand._id) : [...prev, cand._id]
                          );
                        }}
                        className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition ${
                          isSelected
                            ? 'bg-indigo-100/70 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-medium'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <Avatar src={cand.avatar} name={cand.nickname || cand.username} size="xs" />
                          <div className="truncate">
                            <span className="font-semibold">{cand.nickname || cand.username}</span>
                            <span className="text-[10px] text-slate-400 ml-1">@{cand.username}</span>
                          </div>
                        </div>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] transition ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {selectedCandidateIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddSelectedMembers}
                  disabled={addingMembers}
                  className="w-full py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center justify-center space-x-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>
                    {addingMembers ? 'Adding...' : `Add ${selectedCandidateIds.length} Selected Member(s)`}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Group Invite Link Box */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
              <span className="flex items-center space-x-1.5">
                <Link2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Invite Link & Code</span>
              </span>
              {(isOwner || isAdmin) && (
                <button
                  onClick={handleGenerateInvite}
                  disabled={loading}
                  className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                  title="Generate a new fresh code"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset Code</span>
                </button>
              )}
            </div>

            {inviteCode && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-bold truncate mr-2 text-[11px]">
                    {inviteCode}
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={handleCopyCodeOnly}
                      className="px-2 py-0.5 text-[10px] font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 rounded-lg transition"
                      title="Copy code only"
                    >
                      Code
                    </button>
                    <button
                      onClick={handleShareGroup}
                      className="px-2 py-0.5 text-[10px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition flex items-center space-x-1"
                      title="Copy or share full link"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Share'}</span>
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Anyone with this link or code can join this group directly.
                </p>
              </div>
            )}
          </div>

          {/* Members List Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Members ({group.participants?.length || 0})
              </span>

              {canAddMembers && !showAddMembers && (
                <button
                  onClick={() => setShowAddMembers(true)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 px-2 py-0.5 rounded-lg flex items-center space-x-1 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Member</span>
                </button>
              )}
            </div>

            {/* Member Filter Search */}
            {(group.participants?.length || 0) > 4 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter members..."
                  value={memberFilter}
                  onChange={(e) => setMemberFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
            )}

            {/* Members Rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
              {filteredMembers.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">No members match search.</div>
              ) : (
                filteredMembers.map((member) => {
                  const memberId = (member._id || member).toString();
                  const isMemberOwner = (group.groupDetails?.owner?._id || group.groupDetails?.owner)?.toString() === memberId;
                  const isMemberAdmin = group.groupDetails?.admins?.some((a) => (a._id || a)?.toString() === memberId);
                  const isMe = memberId === currentUserId;

                  // Admin / Owner rights to act on this member
                  const canAct =
                    !isMe &&
                    ((isOwner && !isMemberOwner) ||
                     (isAdmin && !isMemberOwner && !isMemberAdmin));

                  return (
                    <div
                      key={member._id || memberId}
                      className="p-3 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition text-xs"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Avatar
                          src={member.avatar}
                          name={member.nickname || member.username}
                          size="sm"
                          showOnlineStatus={true}
                          isOnline={member.status === 'online'}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {member.nickname || member.username}
                            </span>
                            {isMe && (
                              <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded font-bold text-[9px]">
                                YOU
                              </span>
                            )}
                            {isMemberOwner && (
                              <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 rounded font-bold text-[9px]">
                                <Crown className="w-2.5 h-2.5" />
                                <span>OWNER</span>
                              </span>
                            )}
                            {!isMemberOwner && isMemberAdmin && (
                              <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 rounded font-bold text-[9px]">
                                <Shield className="w-2.5 h-2.5" />
                                <span>ADMIN</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">@{member.username}</p>
                        </div>
                      </div>

                      {/* Action buttons on this member */}
                      {canAct && (
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          {isOwner && (
                            <>
                              {isMemberAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => handleDemoteAdmin(memberId)}
                                  className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                  title="Demote to Regular Member"
                                >
                                  <Shield className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handlePromoteAdmin(memberId)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                  title="Promote to Group Admin"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            title="Remove Member"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Leave Group Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleLeaveGroup}
              className="w-full py-2.5 px-4 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave Group</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
