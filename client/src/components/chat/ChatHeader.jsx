import React, { useState } from 'react';
import {
  ShieldCheck,
  Download,
  Search,
  MoreVertical,
  Pin,
  Archive,
  VolumeX,
  Volume2,
  Trash2,
  Flag,
  UserX,
  Users,
  ChevronLeft,
  Phone,
  Video
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { useCall } from '../../context/CallContext';
import { Avatar } from '../common/Avatar';
import { ExportModal } from '../modals/ExportModal';
import { ReportModal } from '../modals/ReportModal';
import { E2EEVerifyModal } from '../modals/E2EEVerifyModal';

export const ChatHeader = ({ onToggleSearch, onOpenInfo, onBack }) => {
  const { activeConversation, togglePin, toggleArchive, toggleMute, deleteConversation, selectConversation } = useChat();
  const { onlineUsers, typingMap } = useSocket();
  const { startCall } = useCall();

  const [menuOpen, setMenuOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [e2eeModalOpen, setE2EEModalOpen] = useState(false);

  if (!activeConversation) return null;

  const isGroup = activeConversation.type === 'group';
  const title = isGroup
    ? activeConversation.groupDetails?.name || 'Group'
    : activeConversation.otherUser?.nickname || activeConversation.otherUser?.username || 'User';

  const avatarUrl = isGroup
    ? activeConversation.groupDetails?.avatar
    : activeConversation.otherUser?.avatar;

  const isOnline = !isGroup && (
    onlineUsers.has(activeConversation.otherUser?._id) || activeConversation.otherUser?.status === 'online'
  );

  const rawTypers = typingMap[activeConversation._id] || [];
  const typers = rawTypers
    .map((t) => (typeof t === 'string' ? t : t.name))
    .filter(Boolean);

  return (
    <>
      <div className="h-16 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between select-none">
        <div className="flex items-center space-x-3 overflow-hidden">
          {/* Back button on mobile */}
          <button
            onClick={onBack}
            className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="cursor-pointer" onClick={onOpenInfo}>
            <Avatar
              src={avatarUrl}
              name={title}
              size="md"
              showOnlineStatus={!isGroup}
              isOnline={isOnline}
            />
          </div>

          <div className="overflow-hidden cursor-pointer" onClick={onOpenInfo}>
            <div className="flex items-center space-x-1.5">
              <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {title}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setE2EEModalOpen(true);
                }}
                title="End-to-End Encrypted. Click to verify safety fingerprint."
                className="text-emerald-600 dark:text-emerald-400 hover:opacity-80 transition"
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs truncate">
              {typers.length > 0 ? (
                <span className="text-indigo-600 dark:text-indigo-400 font-medium animate-pulse">
                  {typers.join(', ')} {typers.length === 1 ? 'is' : 'are'} typing...
                </span>
              ) : isGroup ? (
                <span className="text-slate-400">
                  {activeConversation.participants?.length || 0} members
                </span>
              ) : isOnline ? (
                <span className="text-emerald-500 font-medium">Online</span>
              ) : activeConversation.otherUser?.lastSeen ? (
                <span className="text-slate-400">
                  Last seen {new Date(activeConversation.otherUser.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              ) : (
                <span className="text-slate-400">Offline</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1">
          {(() => {
            const resolvedTargetUser = !isGroup
              ? (activeConversation.otherUser ||
                 activeConversation.participants?.find((p) => (p._id || p)?.toString() !== user?._id?.toString()))
              : null;

            return (
              <>
                <button
                  onClick={() =>
                    startCall({
                      conversationId: activeConversation._id,
                      isGroup,
                      callType: 'audio',
                      targetUser: resolvedTargetUser,
                      participants: isGroup ? activeConversation.participants : []
                    })
                  }
                  title={`Start ${isGroup ? 'Group ' : ''}Voice Call`}
                  className="p-2 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                </button>

                <button
                  onClick={() =>
                    startCall({
                      conversationId: activeConversation._id,
                      isGroup,
                      callType: 'video',
                      targetUser: resolvedTargetUser,
                      participants: isGroup ? activeConversation.participants : []
                    })
                  }
                  title={`Start ${isGroup ? 'Group ' : ''}Video Call`}
                  className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                </button>
              </>
            );
          })()}

          <button
            onClick={onToggleSearch}
            title="Search Messages"
            className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={() => setExportModalOpen(true)}
            title="Export Conversation Transcript"
            className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* More menu dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-1.5 z-40 text-xs font-medium text-slate-700 dark:text-slate-300 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setMenuOpen(false)}
              >
                <button
                  onClick={() => togglePin(activeConversation._id)}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2"
                >
                  <Pin className="w-4 h-4 text-slate-400" />
                  <span>{activeConversation.isPinned ? 'Unpin Chat' : 'Pin Chat'}</span>
                </button>

                <button
                  onClick={() => toggleMute(activeConversation._id, activeConversation.isMuted ? 0 : 24)}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2"
                >
                  {activeConversation.isMuted ? <Volume2 className="w-4 h-4 text-slate-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                  <span>{activeConversation.isMuted ? 'Unmute Notifications' : 'Mute for 24 hours'}</span>
                </button>

                <button
                  onClick={() => toggleArchive(activeConversation._id)}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2"
                >
                  <Archive className="w-4 h-4 text-slate-400" />
                  <span>{activeConversation.isArchived ? 'Unarchive' : 'Archive Chat'}</span>
                </button>

                <button
                  onClick={() => setReportModalOpen(true)}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-rose-600 flex items-center space-x-2"
                >
                  <Flag className="w-4 h-4" />
                  <span>Report Abuse</span>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                <button
                  onClick={() => {
                    if (window.confirm('Delete this conversation history for yourself?')) {
                      deleteConversation(activeConversation._id);
                    }
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Conversation</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        conversation={activeConversation}
      />
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        targetUser={!isGroup ? activeConversation.otherUser : null}
        targetGroup={isGroup ? activeConversation : null}
      />
      <E2EEVerifyModal
        isOpen={e2eeModalOpen}
        onClose={() => setE2EEModalOpen(false)}
        conversation={activeConversation}
      />
    </>
  );
};
