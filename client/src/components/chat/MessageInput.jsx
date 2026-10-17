import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  X,
  File,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';

const EMOJI_LIST = [
  '😀', '😂', '😍', '🥳', '😎', '👍', '🔥', '🎉',
  '❤️', '🙏', '💯', '✨', '🚀', '👏', '🤔', '🤝',
  '💡', '⚡', '🌟', '💪', '🙌', '🤩', '🎯', '🌈'
];

export const MessageInput = () => {
  const { user, token } = useAuth();
  const { activeConversation, replyMessage, setReplyMessage, sendMessage } = useChat();
  const { sendTypingStart, sendTypingStop } = useSocket();

  const [text, setText] = useState('');
  const [fileAttachment, setFileAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Group permission check: if onlyAdminsCanMessage is true, verify user is owner or admin
  const isGroup = activeConversation?.type === 'group';
  const onlyAdminsCanMessage = isGroup && activeConversation?.groupDetails?.onlyAdminsCanMessage;
  const isOwner = isGroup && activeConversation?.groupDetails?.owner?.toString() === user?._id?.toString();
  const isAdmin = isGroup && activeConversation?.groupDetails?.admins?.some((a) => a.toString() === user?._id?.toString());
  const canSend = !onlyAdminsCanMessage || isOwner || isAdmin;

  // Handle typing indicator
  const handleInputChange = (e) => {
    setText(e.target.value);

    if (activeConversation && !isTyping) {
      setIsTyping(true);
      sendTypingStart(activeConversation._id);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (activeConversation) {
        sendTypingStop(activeConversation._id);
      }
    }, 2000);
  };

  // Handle file select
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/users/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        setFileAttachment({
          url: data.fileUrl,
          name: data.fileName,
          size: data.fileSize,
          mimeType: data.fileMimeType,
          messageType: data.fileMimeType?.startsWith('image/')
            ? 'image'
            : data.fileMimeType?.startsWith('video/')
            ? 'video'
            : data.fileMimeType?.startsWith('audio/')
            ? 'audio'
            : 'file'
        });
      }
    } catch (err) {
      console.error('File upload error', err);
    } finally {
      setUploading(false);
    }
  };

  // Reset state when switching conversations
  useEffect(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);
    setText('');
    setFileAttachment(null);
  }, [activeConversation?._id]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!canSend) return;

    const trimmedText = text.trim();
    if (!trimmedText && !fileAttachment) return;

    try {
      await sendMessage({
        content: trimmedText,
        fileUrl: fileAttachment?.url,
        fileName: fileAttachment?.name,
        fileSize: fileAttachment?.size,
        fileMimeType: fileAttachment?.mimeType,
        messageType: fileAttachment?.messageType || 'text'
      });

      setText('');
      setFileAttachment(null);
      setShowEmojis(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setIsTyping(false);
      if (activeConversation) {
        sendTypingStop(activeConversation._id);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!canSend) {
    return (
      <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
        <AlertCircle className="w-4 h-4 text-amber-500" />
        <span>Only administrators can send messages in this group.</span>
      </div>
    );
  }

  return (
    <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 select-none">
      {/* Replying Banner */}
      {replyMessage && (
        <div className="flex items-center justify-between p-2 mb-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs animate-in slide-in-from-bottom-2">
          <div className="truncate">
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              Replying to {replyMessage.sender?.nickname || replyMessage.sender?.username}:{' '}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {replyMessage.content || 'Attachment'}
            </span>
          </div>
          <button
            onClick={() => setReplyMessage(null)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attachment Preview Chip */}
      {fileAttachment && (
        <div className="flex items-center space-x-2 p-2 mb-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900 text-xs w-max max-w-sm">
          {fileAttachment.messageType === 'image' ? (
            <img src={fileAttachment.url} alt="upload preview" className="w-8 h-8 rounded object-cover" />
          ) : (
            <File className="w-5 h-5 text-indigo-500" />
          )}
          <span className="truncate max-w-[180px] font-medium text-slate-800 dark:text-slate-200">
            {fileAttachment.name}
          </span>
          <button
            onClick={() => setFileAttachment(null)}
            className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-full"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Input Row */}
      <div className="flex items-end space-x-2">
        {/* Attachment button */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          title="Attach file or photo"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Emoji picker toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojis(!showEmojis)}
            className="p-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            title="Emoji picker"
          >
            <Smile className="w-5 h-5" />
          </button>

          {showEmojis && (
            <div className="absolute bottom-full mb-2 left-0 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-30 grid grid-cols-6 gap-2 w-64 animate-in fade-in zoom-in-95">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setText((prev) => prev + emoji)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-lg text-center hover:scale-125 transition"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Type an encrypted message..."
          value={text}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="flex-1 max-h-32 min-h-[42px] px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none leading-relaxed"
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={uploading || (!text.trim() && !fileAttachment)}
          className="p-2.5 bg-accent bg-accent-hover disabled:opacity-40 text-white rounded-2xl shadow-md transition hover:scale-105 active:scale-95"
          title="Send"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
