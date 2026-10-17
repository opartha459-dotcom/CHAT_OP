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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Export Chat History</h2>
              <p className="text-xs text-slate-400">Download your message transcript</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-2.5">
          <label
            onClick={() => setFormat('json')}
            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
              format === 'json'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Code className="w-4 h-4 text-indigo-500" />
              <div>
                <div className="text-xs font-semibold">JSON Data (.json)</div>
                <div className="text-[11px] text-slate-400">Machine-readable with metadata</div>
              </div>
            </div>
            <input type="radio" name="format" checked={format === 'json'} readOnly className="text-indigo-600" />
          </label>

          <label
            onClick={() => setFormat('txt')}
            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
              format === 'txt'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <FileText className="w-4 h-4 text-emerald-500" />
              <div>
                <div className="text-xs font-semibold">Plain Text (.txt)</div>
                <div className="text-[11px] text-slate-400">Clean readable text transcript</div>
              </div>
            </div>
            <input type="radio" name="format" checked={format === 'txt'} readOnly className="text-indigo-600" />
          </label>

          <label
            onClick={() => setFormat('html')}
            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
              format === 'html'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Globe className="w-4 h-4 text-sky-500" />
              <div>
                <div className="text-xs font-semibold">Web Page (.html)</div>
                <div className="text-[11px] text-slate-400">Styled document with chat bubbles</div>
              </div>
            </div>
            <input type="radio" name="format" checked={format === 'html'} readOnly className="text-indigo-600" />
          </label>
        </div>

        <button
          onClick={handleExport}
          disabled={downloading}
          className="w-full py-2.5 px-4 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center justify-center space-x-2"
        >
          {success ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Downloaded!</span>
            </>
          ) : downloading ? (
            <span>Preparing Export...</span>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Export Transcript</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
