import React, { useState } from 'react';
import { Download, FileText, Code, Globe, CheckCircle2, FileDown } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { ModalShell } from '../common/ModalShell';
import { generateChatTranscriptPdf } from '../../utils/pdfExport';

export const ExportModal = ({ isOpen, onClose, conversation }) => {
  const { authHeaders, activeConversation, messages } = useChat();
  const { user } = useAuth();
  const [format, setFormat] = useState('pdf');
  const [downloading, setDownloading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!conversation) return null;

  const triggerDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleExport = async () => {
    try {
      setDownloading(true);

      if (format === 'pdf') {
        const isLoadedConv = activeConversation?._id === conversation._id && Array.isArray(messages);
        let exportMessages = [];
        let title =
          conversation.type === 'group'
            ? conversation.groupDetails?.name || 'Group Chat'
            : conversation.otherUser?.nickname || conversation.otherUser?.username || 'Private Chat';
        let participants = (conversation.participants || []).map((p) => p?.nickname || p?.username).filter(Boolean);

        if (isLoadedConv) {
          exportMessages = messages.map((m) => {
            const senderId = (m.sender?._id || m.sender)?.toString();
            const isMe = senderId === user?._id?.toString();
            return {
              sender: m.sender?.nickname || m.sender?.username || (isMe ? user?.nickname || user?.username : 'System'),
              isMe,
              timestamp: m.createdAt,
              content: m.isDeletedForEveryone ? '[This message was deleted]' : m.content,
              isDeleted: Boolean(m.isDeletedForEveryone),
              attachment: m.fileUrl ? { name: m.fileName, url: m.fileUrl, size: m.fileSize } : null
            };
          });
        } else {
          const res = await fetch(`/api/export/chat/${conversation._id}?format=json`, {
            headers: authHeaders(),
            credentials: 'include'
          });
          if (!res.ok) throw new Error('Export failed');
          const data = await res.json();
          title = data.title || title;
          participants = (data.participants || []).map((p) => p.nickname || p.username).filter(Boolean);
          exportMessages = (data.messages || []).map((m) => ({
            sender: m.sender,
            isMe: m.sender === (user?.nickname || user?.username),
            timestamp: m.timestamp,
            content: m.content,
            isDeleted: m.content === '[This message was deleted]',
            attachment: m.attachment
          }));
        }

        const pdfBlob = generateChatTranscriptPdf({
          title,
          type: conversation.type,
          participants,
          exportedBy: user?.username || 'User',
          exportedAt: new Date(),
          messages: exportMessages
        });
        const safeName = title.replace(/[^a-zA-Z0-9_-]/g, '_');
        triggerDownload(pdfBlob, `PulseChat_${safeName}_${Date.now()}.pdf`);
      } else {
        const res = await fetch(`/api/export/chat/${conversation._id}?format=${format}`, {
          headers: authHeaders(),
          credentials: 'include'
        });

        if (!res.ok) throw new Error('Export failed');

        const blob = await res.blob();
        triggerDownload(blob, `PulseChat_${conversation.type}_${Date.now()}.${format}`);
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Export download error', err);
    } finally {
      setDownloading(false);
    }
  };

  const formatOptions = [
    {
      id: 'pdf',
      label: 'PDF Document (.pdf)',
      desc: 'Formatted transcript with pages & headers',
      icon: FileDown,
      iconClass: 'text-rose-400'
    },
    {
      id: 'json',
      label: 'JSON Data (.json)',
      desc: 'Machine-readable with metadata',
      icon: Code,
      iconClass: 'text-purple-400'
    },
    {
      id: 'txt',
      label: 'Plain Text (.txt)',
      desc: 'Clean readable text transcript',
      icon: FileText,
      iconClass: 'text-emerald-400'
    },
    {
      id: 'html',
      label: 'HTML Document (.html)',
      desc: 'Print-ready visual browser transcript',
      icon: Globe,
      iconClass: 'text-sky-400'
    }
  ];

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Export Chat History"
      subtitle="Download message transcript"
      icon={Download}
      iconTone="indigo"
      maxWidth="max-w-sm"
    >
      <div className="space-y-2.5">
        {formatOptions.map((opt) => {
          const OptIcon = opt.icon;
          const active = format === opt.id;
          return (
            <label
              key={opt.id}
              onClick={() => setFormat(opt.id)}
              className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                active
                  ? 'border-purple-500/60 bg-purple-950/30 text-white shadow-sm'
                  : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/60 text-slate-300'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <OptIcon className={`w-4 h-4 shrink-0 ${opt.iconClass}`} />
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{opt.label}</div>
                  <div className="text-[11px] text-slate-400 truncate">{opt.desc}</div>
                </div>
              </div>
              <input type="radio" name="format" checked={active} readOnly className="accent-purple-500 shrink-0 ml-2" />
            </label>
          );
        })}
      </div>

      {success && (
        <div className="mt-3 p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Export downloaded successfully!</span>
        </div>
      )}

      <div className="flex items-center justify-end space-x-3 pt-4 mt-4 border-t border-slate-800/80">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-xl transition border border-slate-800/80 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={downloading}
          className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 rounded-xl shadow-lg shadow-purple-600/25 transition flex items-center space-x-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{downloading ? 'Exporting...' : 'Export Chat'}</span>
        </button>
      </div>
    </ModalShell>
  );
};
