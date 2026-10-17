import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { Avatar } from '../common/Avatar';

export const GroupInfoDrawer = ({ isOpen, onClose, group }) => {
  const { user } = useAuth();
  const { authHeaders, selectConversation, fetchConversations } = useChat();
  const [copied, setCopied] = useState(false);
  const [inviteCode, setInviteCode] = useState(group?.groupDetails?.inviteCode || '');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  if (!isOpen || !group) return null;

  const currentUserId = user?._id?.toString();
  const isOwner = group.groupDetails?.owner?.toString() === currentUserId;
  const isAdmin = group.groupDetails?.admins?.some((a) => a.toString() === currentUserId);

  const showMsg = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3000);
  };

  // Generate invite link
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
      showMsg('Failed to generate invite');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInvite = () => {
    const inviteUrl = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        showMsg('Admin demoted');
        fetchConversations();
      }
    } catch (err) {
      showMsg('Error demoting admin');
    }
  };

  // Remove member
  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member from the group?')) return;
    try {
      const res = await fetch(`/api/groups/${group._id}/members/${memberId}`, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        showMsg('Member removed');
        fetchConversations();
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
      }
    } catch (err) {
      showMsg('Error leaving group');
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full md:w-80 lg:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Group Information</h2>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <X className="w-5 h-5" />
        </button>
      </div>

      {feedback && (
        <div className="mx-4 mt-3 p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs rounded-xl">
          {feedback}
        </div>
      )}

      {/* Group Info Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="flex flex-col items-center text-center">
          <Avatar src={group.groupDetails?.avatar} name={group.groupDetails?.name} size="xl" />
          <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
            {group.groupDetails?.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
            {group.groupDetails?.description || 'No description provided.'}
          </p>
        </div>

        {/* Invite link section */}
        {(isAdmin || isOwner) && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Group Invite Link</span>
              <button
                onClick={handleGenerateInvite}
                disabled={loading}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Reset Link
              </button>
            </div>

            {inviteCode && (
              <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                <span className="font-mono text-slate-600 dark:text-slate-300 truncate mr-2">
                  Code: {inviteCode}
                </span>
                <button
                  onClick={handleCopyInvite}
                  className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                  title="Copy link"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Member List */}
        <div>
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Members ({group.participants?.length || 0})
          </div>

          <div className="space-y-1.5">
            {group.participants?.map((member) => {
              const memberId = member._id?.toString();
              const isMemberOwner = group.groupDetails?.owner?.toString() === memberId;
              const isMemberAdmin = group.groupDetails?.admins?.some((a) => a.toString() === memberId);

              return (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 text-xs transition"
                >
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    <Avatar src={member.avatar} name={member.nickname || member.username} size="sm" />
                    <div className="overflow-hidden">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-slate-800 dark:text-white truncate">
                          {member.nickname || member.username}
                        </span>
                        {isMemberOwner && (
                          <span title="Group Owner">
                            <Crown className="w-3.5 h-3.5 text-amber-500" />
                          </span>
                        )}
                        {!isMemberOwner && isMemberAdmin && (
                          <span title="Group Admin">
                            <Shield className="w-3.5 h-3.5 text-indigo-500" />
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">@{member.username}</div>
                    </div>
                  </div>

                  {/* Actions for owner/admin */}
                  {isOwner && memberId !== currentUserId && (
                    <div className="flex items-center space-x-1">
                      {isMemberAdmin ? (
                        <button
                          onClick={() => handleDemoteAdmin(memberId)}
                          className="p-1 text-slate-400 hover:text-amber-500 rounded"
                          title="Demote to Member"
                        >
                          <Shield className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePromoteAdmin(memberId)}
                          className="p-1 text-slate-400 hover:text-indigo-500 rounded"
                          title="Promote to Admin"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveMember(memberId)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded"
                        title="Remove Member"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Leave group button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleLeaveGroup}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave Group</span>
          </button>
        </div>
      </div>
    </div>
  );
};
