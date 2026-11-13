import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  X,
  File,
  AlertCircle,
  BarChart2,
  Mic,
  Loader2,
  ImageIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { CreatePollModal } from './CreatePollModal';
import { VoiceRecorder } from './VoiceRecorder';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';
import { useMaintenance } from '../../context/MaintenanceContext';

const EMOJI_LIST = [
  '😀', '😂', '😍', '🥳', '😎', '👍', '🔥', '🎉',
  '❤️', '🙏', '💯', '✨', '🚀', '👏', '🤔', '🤝',
  '💡', '⚡', '🌟', '💪', '🙌', '🤩', '🎯', '🌈'
];

// ─── Image compression via Canvas ───────────────────────────────────────────
// Resizes to max 1600px on the longest side and re-encodes as JPEG at 82%
// quality. Falls back to the original File if anything goes wrong.
const MAX_IMG_PX = 1600;
const IMG_QUALITY = 0.82;

async function compressImage(file) {
  return new Promise((resolve) => {
    const blobUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(blobUrl);

      let { naturalWidth: w, naturalHeight: h } = img;
      const max = MAX_IMG_PX;

      if (w <= max && h <= max) {
        // Already small enough — skip re-encoding to avoid quality loss
        return resolve(file);
      }

      const scale = Math.min(max / w, max / h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file); // fallback
          const compressed = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, '.jpg'),
            { type: 'image/jpeg', lastModified: Date.now() }
          );
          // Only use compressed version if it's actually smaller
          resolve(compressed.size < file.size ? compressed : file);
        },
        'image/jpeg',
        IMG_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      resolve(file); // fallback: original
    };

    img.src = blobUrl;
  });
}

// ─── Upload a File to the server ─────────────────────────────────────────────
async function uploadFile(file, token) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/users/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
    body: formData
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Upload failed');
  return data; // { fileUrl, fileName, fileSize, fileMimeType }
}

// ─── Derive messageType from MIME ────────────────────────────────────────────
function mimeToType(mime = '') {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
}

// ─── Component ───────────────────────────────────────────────────────────────
export const MessageInput = () => {
  const { user, token } = useAuth();
  const { activeConversation, replyMessage, setReplyMessage, sendMessage } = useChat();
  const { sendTypingStart, sendTypingStop } = useSocket();
  const { featureFlags } = useFeatureFlags();
  const { isFeatureInMaintenance } = useMaintenance();

  const [text, setText] = useState('');

  // pendingFile: local File object + object-URL preview — NOT yet uploaded
  const [pendingFile, setPendingFile] = useState(null);
  // { file: File, previewUrl: string, name: string, type: string (image|video|audio|file) }

  const [sending, setSending] = useState(false);  // upload + send in progress
  const [sendError, setSendError] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Clean up object-URLs to avoid memory leaks
  const revokePending = useCallback(() => {
    if (pendingFile?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(pendingFile.previewUrl);
    }
  }, [pendingFile]);

  // Reset everything when conversation changes
  useEffect(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);
    setText('');
    revokePending();
    setPendingFile(null);
    setSendError('');
    setIsRecordingVoice(false);
  }, [activeConversation?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Group permission check
  const isGroup = activeConversation?.type === 'group';
  const onlyAdminsCanMessage = isGroup && activeConversation?.groupDetails?.onlyAdminsCanMessage;
  const isOwner = isGroup && activeConversation?.groupDetails?.owner?.toString() === user?._id?.toString();
  const isAdmin = isGroup && activeConversation?.groupDetails?.admins?.some((a) => a.toString() === user?._id?.toString());
  const canSend = !onlyAdminsCanMessage || isOwner || isAdmin;

  const isChatInMaintenance = isFeatureInMaintenance('chat') && user?.role !== 'admin';
  const isChatDisabled = (featureFlags.chatEnabled === false || isChatInMaintenance) && user?.role !== 'admin';

  // ── Typing indicator ───────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    setText(e.target.value);
    if (activeConversation && !isTyping) {
      setIsTyping(true);
      sendTypingStart(activeConversation._id);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (activeConversation) sendTypingStop(activeConversation._id);
    }, 2000);
  };

  // ── File selected → local preview only (no upload yet) ────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // allow re-selecting same file
    if (!file) return;

    revokePending(); // discard previous blob URL
    setSendError('');

    const previewUrl = URL.createObjectURL(file);
    const type = mimeToType(file.type);

    setPendingFile({ file, previewUrl, name: file.name, type });
  };

  // ── Voice sent callback (VoiceRecorder already uploaded) ──────────────────
  const handleVoiceSent = async ({ url, name, size, mimeType }) => {
    setIsRecordingVoice(false);
    await sendMessage({
      content: '🎙️ Voice note',
      fileUrl: url,
      fileName: name,
      fileSize: size,
      fileMimeType: mimeType,
      messageType: 'audio'
    });
  };

  // ── Send: compress → upload → sendMessage ─────────────────────────────────
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!canSend || sending) return;

    const trimmedText = text.trim();
    if (!trimmedText && !pendingFile) return;

    // Capture and immediately clear the input so the UI feels instant
    const capturedText = trimmedText;
    const capturedFile = pendingFile;

    setText('');
    revokePending();
    setPendingFile(null);
    setShowEmojis(false);
    setSendError('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);
    if (activeConversation) sendTypingStop(activeConversation._id);

    if (!capturedFile) {
      // Text-only: instant path (no upload needed)
      try {
        await sendMessage({ content: capturedText, messageType: 'text' });
      } catch (err) {
        console.error('Send error:', err);
        setSendError('Failed to send message.');
      }
      return;
    }

    // File path: compress → upload → send
    setSending(true);
    try {
      let fileToUpload = capturedFile.file;

      // Compress images client-side before upload
      if (capturedFile.type === 'image') {
        fileToUpload = await compressImage(capturedFile.file);
        console.log(
          `[Compress] ${capturedFile.file.name}: ${Math.round(capturedFile.file.size / 1024)}KB → ${Math.round(fileToUpload.size / 1024)}KB`
        );
      }

      const uploadResult = await uploadFile(fileToUpload, token);

      await sendMessage({
        content: capturedText,
        fileUrl: uploadResult.fileUrl,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        fileMimeType: uploadResult.fileMimeType,
        messageType: mimeToType(uploadResult.fileMimeType)
      });
    } catch (err) {
      console.error('Upload/send error:', err);
      setSendError(err.message || 'Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (isChatDisabled) {
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 select-none">
        <span className="inline-flex items-center space-x-1.5 font-medium text-amber-500 dark:text-amber-400">
          <AlertCircle className="w-4 h-4" />
          <span>
            {isChatInMaintenance
              ? 'Chat & Messaging is temporarily unavailable due to scheduled maintenance.'
              : 'Chat messaging is temporarily disabled by administrators.'}
          </span>
        </span>
      </div>
    );
  }

  if (!canSend) {
    return (
      <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
        <AlertCircle className="w-4 h-4 text-amber-500" />
        <span>Only administrators can send messages in this group.</span>
      </div>
    );
  }

  const hasPendingContent = text.trim() || pendingFile;

  return (
    <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 select-none">

      {/* Reply banner */}
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
          <button onClick={() => setReplyMessage(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Send error banner */}
      {sendError && (
        <div className="flex items-center justify-between p-2 mb-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 text-xs animate-in slide-in-from-bottom-2">
          <div className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{sendError}</span>
          </div>
          <button type="button" onClick={() => setSendError('')} className="p-0.5 text-rose-400 hover:text-rose-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Uploading / compressing indicator */}
      {sending && (
        <div className="flex items-center space-x-2 p-2 mb-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900/60 text-xs text-indigo-600 dark:text-indigo-400 animate-in slide-in-from-bottom-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          <span>Compressing &amp; uploading…</span>
        </div>
      )}

      {/* File preview chip (local blob — not yet uploaded) */}
      {pendingFile && (
        <div className="flex items-center space-x-2 p-2 mb-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900 text-xs w-max max-w-sm animate-in slide-in-from-bottom-2">
          {pendingFile.type === 'image' ? (
            <img
              src={pendingFile.previewUrl}
              alt="preview"
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
            />
          ) : pendingFile.type === 'video' ? (
            <video
              src={pendingFile.previewUrl}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
              muted
            />
          ) : (
            <File className="w-5 h-5 text-indigo-500 flex-shrink-0" />
          )}
          <div className="flex flex-col min-w-0">
            <span className="truncate max-w-[160px] font-medium text-slate-800 dark:text-slate-200">
              {pendingFile.name}
            </span>
            <span className="text-[10px] text-slate-400">
              {Math.round(pendingFile.file.size / 1024)} KB
              {pendingFile.type === 'image' && ' · will be compressed'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => { revokePending(); setPendingFile(null); }}
            className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-full flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main input row or voice recorder */}
      {isRecordingVoice ? (
        <VoiceRecorder
          onSendVoice={handleVoiceSent}
          onCancel={() => setIsRecordingVoice(false)}
        />
      ) : (
        <div className="flex items-end space-x-2">

          {/* Attach button */}
          {featureFlags.fileSharingEnabled !== false && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                className="p-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer disabled:opacity-50"
                title="Attach file or photo"
              >
                <Paperclip className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Emoji picker */}
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

          {/* Poll button */}
          {featureFlags.pollsEnabled !== false && (
            <button
              type="button"
              onClick={() => setPollModalOpen(true)}
              className="p-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Create a Poll"
            >
              <BarChart2 className="w-5 h-5" />
            </button>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Type an encrypted message..."
            value={text}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="flex-1 max-h-32 min-h-[42px] px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none leading-relaxed"
          />

          {/* Send / Voice button */}
          {!hasPendingContent && featureFlags.voiceMessagesEnabled !== false ? (
            <button
              type="button"
              onClick={() => setIsRecordingVoice(true)}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-md transition hover:scale-105 active:scale-95 cursor-pointer"
              title="Record voice note"
            >
              <Mic className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !hasPendingContent}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl shadow-md transition hover:scale-105 active:scale-95"
              title="Send"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      )}

      <CreatePollModal
        isOpen={pollModalOpen}
        onClose={() => setPollModalOpen(false)}
        conversationId={activeConversation?._id}
      />
    </div>
  );
};
