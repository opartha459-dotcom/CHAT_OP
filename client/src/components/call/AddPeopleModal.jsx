import React, { useState } from 'react';
import { X, Search, UserPlus, Check, Users } from 'lucide-react';
import { useCall } from '../../context/CallContext';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';

export const AddPeopleModal = () => {
  const { isAddPeopleOpen, setIsAddPeopleOpen, inviteUserToCall, remoteStreams } = useCall();
  const { conversations, activeConversation } = useChat();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [invitedMap, setInvitedMap] = useState({});

  if (!isAddPeopleOpen) return null;

  // Active connected user IDs in call
  const activeUserIds = new Set([
    user?._id,
    ...Object.values(remoteStreams).map((p) => p.user?._id)
  ]);

  // Candidate users to invite: group members if group, or recent DM contacts
  let candidateUsers = [];

  if (activeConversation?.type === 'group' && activeConversation.participants) {
    candidateUsers = activeConversation.participants
      .filter((p) => p._id !== user?._id && !activeUserIds.has(p._id));
  } else {
    // Collect unique DM contacts
    const seen = new Set([user?._id]);
    conversations.forEach((c) => {
      if (c.type !== 'group' && c.otherUser && !seen.has(c.otherUser._id)) {
        seen.add(c.otherUser._id);
        if (!activeUserIds.has(c.otherUser._id)) {
          candidateUsers.push(c.otherUser);
        }
      }
    });
  }

  // Filter by search
  const filteredCandidates = candidateUsers.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.nickname?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q)
    );
  });

  const handleInvite = (targetUserId) => {
    inviteUserToCall(targetUserId);
    setInvitedMap((prev) => ({ ...prev, [targetUserId]: true }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Add People to Call</h3>
          </div>
          <button
            onClick={() => setIsAddPeopleOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contacts by name or username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-800/80 border border-slate-700/60 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-800/50">
          {filteredCandidates.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No additional contacts available to invite.
            </div>
          ) : (
            filteredCandidates.map((candidate) => {
              const isInvited = invitedMap[candidate._id];
              return (
                <div
                  key={candidate._id}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/50 transition"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar
                      src={candidate.avatar}
                      name={candidate.nickname || candidate.username}
                      size="sm"
                    />
                    <div>
                      <div className="text-xs font-semibold text-white">
                        {candidate.nickname || candidate.username}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        @{candidate.username}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleInvite(candidate._id)}
                    disabled={isInvited}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${
                      isInvited
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800 cursor-default'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md active:scale-95'
                    }`}
                  >
                    {isInvited ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Invited</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Invite</span>
                      </>
                    )}
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
