import React, { useState } from 'react';
import { X, Plus, Trash2, Loader2, AlertCircle, BarChart2 } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

export const CreatePollModal = ({ isOpen, onClose, conversationId }) => {
  const { authHeaders } = useChat();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowsMultiple, setAllowsMultiple] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const addOption = () => {
    if (options.length < 8) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanQuestion = question.trim();
    if (!cleanQuestion) {
      setError('Please enter a poll question.');
      return;
    }

    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      setError('Please provide at least 2 valid options.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/messages/${conversationId}/poll`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          question: cleanQuestion,
          options: cleanOptions,
          allowsMultiple,
          isAnonymous
        })
      });

      const data = await res.json();
      if (data.success) {
        onClose();
        setQuestion('');
        setOptions(['', '']);
        setAllowsMultiple(false);
        setIsAnonymous(false);
      } else {
        setError(data.message || 'Failed to create poll.');
      }
    } catch (err) {
      setError('Network error creating poll.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-[#0B0F19] text-slate-100 border border-slate-800/90 rounded-[28px] shadow-2xl shadow-purple-950/30 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.15)] font-bold">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Create a Poll
              </h3>
              <p className="text-xs text-slate-400">
                Ask participants a question with customizable options
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-2xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Question input */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Question
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Where should we host the meetup?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/50 rounded-2xl transition-all"
            />
          </div>

          {/* Options */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Options (2 to 8)
            </label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <input
                    type="text"
                    required={idx < 2}
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    className="flex-1 px-4 py-2 text-xs sm:text-sm bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/50 rounded-xl transition-all"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition cursor-pointer"
                      title="Remove option"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 8 && (
              <button
                type="button"
                onClick={addOption}
                className="mt-2.5 inline-flex items-center space-x-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Option</span>
              </button>
            )}
          </div>

          {/* Settings checkboxes */}
          <div className="p-3.5 bg-slate-900/40 rounded-2xl border border-slate-800/80 space-y-2.5">
            <label className="flex items-center space-x-2.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={allowsMultiple}
                onChange={(e) => setAllowsMultiple(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 border-slate-700 bg-slate-900 focus:ring-purple-500"
              />
              <span>Allow multiple selections</span>
            </label>

            <label className="flex items-center space-x-2.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 border-slate-700 bg-slate-900 focus:ring-purple-500"
              />
              <span>Anonymous voting (hide voter identities)</span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-xl transition border border-slate-800/80 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 rounded-xl shadow-lg shadow-purple-600/25 transition active:scale-95 flex items-center space-x-1.5 cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? 'Creating...' : 'Create Poll'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
