import React, { useState } from 'react';
import { Download, X, FileText, Code, Globe, CheckCircle2 } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

export const ExportModal = ({ isOpen, onClose, conversation }) => {
  const { authHeaders } = useChat();
  const [format, setFormat] = useState('json');
  const [downloading, setDownloading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !conversation) return null;

  const handleExport = async () => {
    try {
      setDownloading(true);
      const res = await fetch(`/api/export/chat/${conversation._id}?format=${format}`, {
        headers: authHeaders(),
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PulseChat_${conversation.type}_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm bg-[#0B0F19] text-slate-100 border border-slate-800/90 rounded-[28px] shadow-2xl shadow-purple-950/30 overflow-hidden flex flex-col p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.15)] font-bold">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Export Chat History</h2>
              <p className="text-xs text-slate-400">Download message transcript</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-2.5">
          <label
            onClick={() => setFormat('json')}
            className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
              format === 'json'
                ? 'border-purple-500/60 bg-purple-950/30 text-white shadow-sm'
                : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/60 text-slate-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Code className="w-4 h-4 text-purple-400" />
              <div>
                <div className="text-xs font-semibold">JSON Data (.json)</div>
                <div className="text-[11px] text-slate-400">Machine-readable with metadata</div>
              </div>
            </div>
            <input type="radio" name="format" checked={format === 'json'} readOnly className="accent-purple-500" />
          </label>

          <label
            onClick={() => setFormat('txt')}
            className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
              format === 'txt'
                ? 'border-purple-500/60 bg-purple-950/30 text-white shadow-sm'
                : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/60 text-slate-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <FileText className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs font-semibold">Plain Text (.txt)</div>
                <div className="text-[11px] text-slate-400">Clean readable text transcript</div>
              </div>
            </div>
            <input type="radio" name="format" checked={format === 'txt'} readOnly className="accent-purple-500" />
          </label>

          <label
            onClick={() => setFormat('html')}
            className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
              format === 'html'
                ? 'border-purple-500/60 bg-purple-950/30 text-white shadow-sm'
                : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/60 text-slate-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Globe className="w-4 h-4 text-sky-400" />
              <div>
                <div className="text-xs font-semibold">HTML Document (.html)</div>
                <div className="text-[11px] text-slate-400">Visual transcript formatted for browser</div>
              </div>
            </div>
            <input type="radio" name="format" checked={format === 'html'} readOnly className="accent-purple-500" />
          </label>
        </div>

        {success && (
          <div className="mb-3 p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Export downloaded successfully!</span>
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800/80">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-xl transition border border-slate-800/80 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={downloading}
            className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 rounded-xl shadow-lg shadow-purple-600/25 transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? 'Exporting...' : 'Export Chat'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
