import React, { useState } from 'react';
import {
  Check,
  CheckCheck,
  Clock,
  Reply,
  Smile,
  Edit2,
  Trash2,
  Flag,
  Download,
  File,
  Lock,
  ExternalLink,
  Users,
  ArrowRight,
  Info,
  Sparkles,
  UserPlus,
  UserMinus,
  Settings,
  Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { Avatar } from '../common/Avatar';
import { ReportModal } from '../modals/ReportModal';
import { JoinGroupModal } from '../modals/JoinGroupModal';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|\/join\/[a-zA-Z0-9_-]+)/gi;

const RenderMessageContent = ({ content, isMe, onOpenJoinModal }) => {
  if (!content) return null;

  // Find any group join code in message (e.g. /join/:code or full url with join/:code)
  const groupJoinMatch = content.match(/(?:join\/)([a-fA-F0-9_-]{6,32})/i);
  const groupInviteCode = groupJoinMatch ? groupJoinMatch[1] : null;

  const parts = content.split(URL_REGEX);

  return (
    <div className="space-y-2">
      <div className="whitespace-pre-wrap leading-relaxed break-words">
        {parts.map((part, i) => {
          if (!part) return null;

          if (part.match(URL_REGEX)) {
            let href = part;
            if (part.startsWith('www.')) href = `https://${part}`;
            else if (part.startsWith('/join/')) href = `${window.location.origin}${part}`;

            const isJoinLink = part.toLowerCase().includes('/join/');

            return (
              <a
                key={i}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (isJoinLink && groupInviteCode) {
                    e.preventDefault();
                    onOpenJoinModal(groupInviteCode);
                  }
                }}
                className={`inline-flex items-center gap-0.5 underline underline-offset-2 break-all font-semibold transition ${
                  isMe
                    ? 'text-sky-200 hover:text-white'
                    : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-500'
                }`}
              >
                <span>{part}</span>
                <ExternalLink className="w-3 h-3 inline flex-shrink-0 opacity-80 ml-0.5" />
              </a>
            );
          }

          return <span key={i}>{part}</span>;
        })}
      </div>

      {/* If this message contains a group invite link, render interactive card */}
      {groupInviteCode && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 shadow-xs select-none ${
            isMe
              ? 'bg-indigo-700/70 border-indigo-400/40 text-white'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white'
          }`}
        >
          <div className="flex items-center space-x-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isMe
                  ? 'bg-indigo-800/80 text-white'
                  : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
              }`}
            >
              <Users className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="font-semibold text-xs truncate">Group Invite Link</div>
              <div className={`text-[10px] font-mono truncate ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                Code: {groupInviteCode}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenJoinModal(groupInviteCode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition flex-shrink-0 cursor-pointer ${
              isMe
                ? 'bg-white text-indigo-700 hover:bg-indigo-50 shadow-sm'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
            }`}
          >
            <span>Join Group</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

export const MessageBubble = ({ message, isGroup = false }) => {
  const { user } = useAuth();
  const { setReplyMessage, editMessage, deleteMessage, reactToMessage } = useChat();

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [joinModalCode, setJoinModalCode] = useState(null);

  const isMe = message.sender?._id === user?._id;
  const isDeleted = message.isDeletedForEveryone;

  const timeString = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Calculate read / delivered indicators
  const isRead = message.readBy && message.readBy.some((r) => r.user !== user?._id);
  const isDelivered = message.deliveredTo && message.deliveredTo.some((d) => d.user !== user?._id);

  // Group reactions by emoji
  const reactionGroups = (message.reactions || []).reduce((acc, curr) => {
    acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
    return acc;
  }, {});

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (editContent.trim() && editContent !== message.content) {
      await editMessage(message._id, editContent);
    }
    setIsEditing(false);
  };

  const handleDelete = (type) => {
    if (window.confirm(`Delete message ${type === 'forEveryone' ? 'for everyone' : 'for yourself'}?`)) {
      deleteMessage(message._id, type);
    }
  };

  // Check if message is a system notification (group creation, settings update, join, leave, etc.)
  const isSystemMessage =
    message.messageType === 'system' ||
    (message.content &&
      (/created group|updated the group settings|joined via invite link|left the group|added .* to the group|removed .* from the group|promoted to .*admin|demoted to regular member|transferred group ownership/i.test(
        message.content
      ) &&
        !message.fileUrl));

  if (isSystemMessage) {
    const content = message.content || '';
    let Icon = Info;
    let iconColor = 'text-indigo-500 dark:text-indigo-400';

    if (/created group/i.test(content)) {
      Icon = Sparkles;
      iconColor = 'text-amber-500';
    } else if (/joined|added/i.test(content)) {
      Icon = UserPlus;
      iconColor = 'text-emerald-500';
    } else if (/left|removed/i.test(content)) {
      Icon = UserMinus;
      iconColor = 'text-rose-500';
    } else if (/promoted|demoted|ownership/i.test(content)) {
      Icon = Shield;
      iconColor = 'text-purple-500';
    } else if (/updated/i.test(content)) {
      Icon = Settings;
      iconColor = 'text-sky-500';
    }

    return (
      <div className="flex items-center justify-center my-3.5 w-full select-none animate-in fade-in duration-200">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70 rounded-full shadow-xs backdrop-blur-xs text-center max-w-[92%] sm:max-w-md">
          <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${iconColor}`} />
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 break-words leading-tight">
            {content}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0">
            {timeString}
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`group relative flex items-end space-x-2 my-2 select-text ${
          isMe ? 'justify-end' : 'justify-start'
        }`}
      >
        {/* Other user avatar in groups */}
        {!isMe && isGroup && (
          <Avatar
            src={message.sender?.avatar}
            name={message.sender?.nickname || message.sender?.username}
            size="sm"
          />
        )}

        {/* Message wrapper */}
        <div className={`relative max-w-[85%] md:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
          {/* Sender nickname in group */}
          {!isMe && isGroup && (
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mb-1 ml-1">
              {message.sender?.nickname || message.sender?.username}
            </span>
          )}

          {/* Replied preview header */}
          {message.replyTo && (
            <div className={`text-xs px-3 py-1.5 mb-1 rounded-t-xl border-l-2 bg-slate-100 dark:bg-slate-800/80 max-w-full truncate ${
              isMe ? 'border-indigo-500' : 'border-indigo-400'
            }`}>
              <div className="font-semibold text-slate-600 dark:text-slate-300 text-[10px]">
                {message.replyTo.sender?.nickname || message.replyTo.sender?.username || 'Replied message'}
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-xs truncate">
                {message.replyTo.content || 'Attachment'}
              </div>
            </div>
          )}

          {/* Bubble content */}
          <div
            className={`relative px-4 py-2.5 rounded-2xl shadow-sm text-sm break-words ${
              isMe
                ? 'bg-accent text-white rounded-br-xs'
                : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-100 dark:border-slate-700/60 rounded-bl-xs'
            }`}
          >
            {isDeleted ? (
              <span className="italic text-xs opacity-75">This message was deleted</span>
            ) : isEditing ? (
              <form onSubmit={handleSaveEdit} className="space-y-2 min-w-[200px]">
                <input
                  type="text"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-black/10 rounded border border-white/20 text-white focus:outline-none"
                  autoFocus
                />
                <div className="flex items-center justify-end space-x-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-2 py-0.5 rounded hover:bg-black/20"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2 py-0.5 rounded bg-white text-indigo-600 font-semibold"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* Media attachments */}
                {message.fileUrl && (
                  <div className="mb-2">
                    {message.fileMimeType?.startsWith('image/') || message.messageType === 'image' ? (
                      <>
                        <img
                          src={message.fileUrl}
                          alt="Shared media"
                          onClick={() => setLightboxOpen(true)}
                          className="max-h-60 rounded-xl object-cover cursor-pointer hover:opacity-95 transition"
                        />
                        {lightboxOpen && (
                          <div
                            onClick={() => setLightboxOpen(false)}
                            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out"
                          >
                            <img src={message.fileUrl} alt="Zoomed" className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl" />
                          </div>
                        )}
                      </>
                    ) : message.fileMimeType?.startsWith('video/') || message.messageType === 'video' ? (
                      <video src={message.fileUrl} controls className="max-h-60 rounded-xl" />
                    ) : message.fileMimeType?.startsWith('audio/') || message.messageType === 'audio' ? (
                      <audio src={message.fileUrl} controls className="w-full my-1" />
                    ) : (
                      <a
                        href={message.fileUrl}
                        download={message.fileName || 'file'}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex items-center space-x-2 p-2.5 rounded-xl transition ${
                          isMe
                            ? 'bg-indigo-700/80 hover:bg-indigo-700 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-white'
                        }`}
                      >
                        <File className="w-5 h-5 flex-shrink-0" />
                        <div className="text-left overflow-hidden min-w-0">
                          <div className="font-semibold text-xs truncate">{message.fileName || 'Document'}</div>
                          <div className="text-[10px] opacity-75">
                            {message.fileSize ? `${Math.round(message.fileSize / 1024)} KB` : 'Download'}
                          </div>
                        </div>
                        <Download className="w-4 h-4 ml-auto flex-shrink-0" />
                      </a>
                    )}
                  </div>
                )}

                {/* Plaintext / E2EE Content with Clickable Links */}
                {message.content && (
                  <RenderMessageContent
                    content={message.content}
                    isMe={isMe}
                    onOpenJoinModal={(code) => setJoinModalCode(code)}
                  />
                )}
              </>
            )}

            {/* Bubble Footer: Timestamp, Edit tag, and Read Status */}
            <div
              className={`flex items-center space-x-1.5 mt-1 text-[10px] ${
                isMe ? 'text-indigo-200 justify-end' : 'text-slate-400 justify-end'
              }`}
            >
              {message.isEdited && <span className="italic">edited</span>}
              <span>{timeString}</span>

              {isMe && (
                <span>
                  {isRead ? (
                    <CheckCheck className="w-3.5 h-3.5 text-sky-300" title="Read" />
                  ) : isDelivered ? (
                    <CheckCheck className="w-3.5 h-3.5 opacity-80" title="Delivered" />
                  ) : (
                    <Check className="w-3.5 h-3.5 opacity-80" title="Sent" />
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Reactions Pill Display */}
          {Object.keys(reactionGroups).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(reactionGroups).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => reactToMessage(message._id, emoji)}
                  className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs shadow-xs hover:scale-105 transition"
                >
                  <span>{emoji}</span>
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hover Micro-Actions Toolbar */}
        {!isDeleted && (
          <div
            className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-0.5 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-md ${
              isMe ? 'order-first' : 'order-last'
            }`}
          >
            {/* Quick Emoji Reaction popup */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                title="React"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>

              {showEmojiPicker && (
                <div className="absolute bottom-full mb-1 left-0 flex items-center space-x-1 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        reactToMessage(message._id, emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="p-1 hover:scale-125 transition text-sm"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reply */}
            <button
              onClick={() => setReplyMessage(message)}
              className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>

            {/* Edit (if me) */}
            {isMe && (
              <button
                onClick={() => {
                  setEditContent(message.content);
                  setIsEditing(true);
                }}
                className="p-1 text-slate-400 hover:text-amber-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                title="Edit message"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Delete options */}
            <button
              onClick={() => handleDelete(isMe ? 'forEveryone' : 'forMe')}
              className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              title="Delete message"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Report (if not me) */}
            {!isMe && (
              <button
                onClick={() => setReportModalOpen(true)}
                className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                title="Report message"
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        targetUser={message.sender}
        targetMessage={message}
      />

      {joinModalCode && (
        <JoinGroupModal
          isOpen={!!joinModalCode}
          onClose={() => setJoinModalCode(null)}
          initialCode={joinModalCode}
        />
      )}
    </>
  );
};
