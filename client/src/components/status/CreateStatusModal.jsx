import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Type,
  Palette,
  Bold,
  Italic,
  Send,
  Loader2,
  AlertCircle,
  Globe,
  Users,
  Vote,
  Plus,
  Trash2,
  Check,
  Search,
  Lock,
  UserX,
  ChevronRight,
  Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { Avatar } from '../common/Avatar';

const PRESET_BACKGROUNDS = [
  { id: 'royal', label: 'Royal', style: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' },
  { id: 'sunset', label: 'Sunset', style: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)' },
  { id: 'emerald', label: 'Emerald', style: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' },
  { id: 'midnight', label: 'Midnight', style: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' },
  { id: 'cyan', label: 'Neon Cyan', style: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' },
  { id: 'berry', label: 'Berry', style: 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)' }
];

const FONTS = [
  { id: 'sans', label: 'Modern Sans', class: 'font-sans' },
  { id: 'serif', label: 'Classic Serif', class: 'font-serif' },
  { id: 'mono', label: 'Code Mono', class: 'font-mono' }
];

export const CreateStatusModal = ({ isOpen, onClose, onStatusCreated }) => {
  const { user: currentUser, token } = useAuth();
  const { conversations, authHeaders } = useChat();

  const [text, setText] = useState('');
  const [bgIndex, setBgIndex] = useState(0);
  const [fontIndex, setFontIndex] = useState(0);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Status Poll State
  const [hasPoll, setHasPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  // Privacy / Custom Contact List State
  // audience: 'everyone' | 'contacts' | 'custom'
  const [audience, setAudience] = useState('everyone');
  const [allowedUsers, setAllowedUsers] = useState([]); // Array of user objects for "Only Share With..."
  const [excludedUsers, setExcludedUsers] = useState([]); // Array of user objects for "My Contacts Except..."
  const [privacySheetOpen, setPrivacySheetOpen] = useState(false);
  const [contactPickerMode, setContactPickerMode] = useState(null); // 'allowed' | 'excluded' | null
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [searchingContacts, setSearchingContacts] = useState(false);

  // Extract known contacts from existing conversations
  const knownContacts = useMemo(() => {
    const map = new Map();
    (conversations || []).forEach((c) => {
      if (c.type === 'direct' && c.otherUser) {
        map.set(c.otherUser._id?.toString(), c.otherUser);
      } else if (c.type === 'group' && Array.isArray(c.participants)) {
        c.participants.forEach((p) => {
          if (p && p._id && p._id.toString() !== currentUser?._id?.toString()) {
            map.set(p._id.toString(), p);
          }
        });
      }
    });
    return Array.from(map.values());
  }, [conversations, currentUser?._id]);

  // Search users remotely if user types in contact search
  useEffect(() => {
    if (!contactPickerMode || !contactSearchQuery.trim() || contactSearchQuery.trim().length < 2) {
      setSearchedUsers([]);
      setSearchingContacts(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingContacts(true);
      try {
        const res = await fetch(`/api/users/search?query=${encodeURIComponent(contactSearchQuery.trim())}`, {
          headers: authHeaders(),
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          setSearchedUsers(data.users);
        }
      } catch (err) {
        console.error('Contact search error:', err);
      } finally {
        setSearchingContacts(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [contactPickerMode, contactSearchQuery, authHeaders]);

  // Contacts list combined with search results
  const displayedContacts = useMemo(() => {
    const list = [...knownContacts];
    searchedUsers.forEach((su) => {
      if (!list.some((k) => (k._id || k).toString() === (su._id || su).toString())) {
        list.push(su);
      }
    });
    if (!contactSearchQuery.trim()) return list;
    const q = contactSearchQuery.toLowerCase();
    return list.filter(
      (c) =>
        c.nickname?.toLowerCase().includes(q) ||
        c.username?.toLowerCase().includes(q)
    );
  }, [knownContacts, searchedUsers, contactSearchQuery]);

  // Privacy summary label
  const privacyLabel = useMemo(() => {
    if (audience === 'everyone') return 'Status (24h) · Everyone';
    if (audience === 'contacts') {
      if (excludedUsers.length > 0) {
        return `Contacts (${excludedUsers.length} excluded)`;
      }
      return 'Status (24h) · My Contacts';
    }
    if (audience === 'custom') {
      return `Only with (${allowedUsers.length} selected)`;
    }
    return 'Status (24h)';
  }, [audience, allowedUsers.length, excludedUsers.length]);

  if (!isOpen) return null;

  const currentBg = PRESET_BACKGROUNDS[bgIndex];
  const currentFont = FONTS[fontIndex];

  const cycleBackground = () => {
    setBgIndex((prev) => (prev + 1) % PRESET_BACKGROUNDS.length);
  };

  const cycleFont = () => {
    setFontIndex((prev) => (prev + 1) % FONTS.length);
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions((prev) => [...prev, '']);
    }
  };

  const handleRemovePollOption = (idx) => {
    if (pollOptions.length > 2) {
      setPollOptions((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const handlePollOptionChange = (idx, value) => {
    setPollOptions((prev) => {
      const copy = [...prev];
      copy[idx] = value;
      return copy;
    });
  };

  // Toggle user selection in allowed or excluded list
  const toggleContactSelection = (userObj) => {
    const userId = (userObj._id || userObj).toString();
    if (contactPickerMode === 'allowed') {
      setAllowedUsers((prev) => {
        const exists = prev.some((u) => (u._id || u).toString() === userId);
        if (exists) {
          return prev.filter((u) => (u._id || u).toString() !== userId);
        } else {
          return [...prev, userObj];
        }
      });
    } else if (contactPickerMode === 'excluded') {
      setExcludedUsers((prev) => {
        const exists = prev.some((u) => (u._id || u).toString() === userId);
        if (exists) {
          return prev.filter((u) => (u._id || u).toString() !== userId);
        } else {
          return [...prev, userObj];
        }
      });
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();

    if (!hasPoll && !text.trim()) {
      setError('Please type your status message.');
      return;
    }

    if (hasPoll) {
      if (!pollQuestion.trim()) {
        setError('Please enter your poll question.');
        return;
      }
      const validOpts = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (validOpts.length < 2) {
        setError('Please provide at least 2 poll options.');
        return;
      }
    }

    if (audience === 'custom' && allowedUsers.length === 0) {
      setError('Please select at least 1 contact for "Only Share With".');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        type: 'text',
        text: text.trim(),
        style: {
          background: currentBg.style,
          font: currentFont.id,
          textColor: '#ffffff'
        },
        privacy: {
          audience,
          allowedUsers: audience === 'custom' ? allowedUsers.map((u) => u._id || u) : [],
          excludedUsers: audience === 'contacts' ? excludedUsers.map((u) => u._id || u) : []
        },
        hasPoll,
        poll: hasPoll
          ? {
              question: pollQuestion.trim(),
              options: pollOptions.map((o) => o.trim()).filter(Boolean)
            }
          : undefined
      };

      const res = await fetch('/api/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setText('');
        setHasPoll(false);
        setPollQuestion('');
        setPollOptions(['', '']);
        if (onStatusCreated) onStatusCreated(data.status);
        onClose();
      } else {
        setError(data.message || 'Failed to publish status');
      }
    } catch (err) {
      setError('Network error publishing status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-md h-full sm:h-[640px] sm:rounded-3xl overflow-hidden shadow-2xl relative flex flex-col justify-between p-5 transition-all duration-300"
        style={{ background: currentBg.style }}
      >
        {/* Top Controls Bar */}
        <div className="flex items-center justify-between text-white relative z-20">
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-black/20 rounded-full transition active:scale-95 cursor-pointer"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-1.5 bg-black/35 backdrop-blur-md px-2 py-1 rounded-2xl border border-white/20 shadow-md">
            {/* Background switcher */}
            <button
              type="button"
              onClick={cycleBackground}
              className="p-1.5 hover:bg-white/20 rounded-xl transition active:scale-95 text-white cursor-pointer"
              title="Change Background Gradient"
            >
              <Palette className="w-4 h-4" />
            </button>

            {/* Font switcher */}
            <button
              type="button"
              onClick={cycleFont}
              className="p-1.5 hover:bg-white/20 rounded-xl transition active:scale-95 text-white cursor-pointer"
              title="Change Font Family"
            >
              <Type className="w-4 h-4" />
            </button>

            {/* Bold Toggle */}
            <button
              type="button"
              onClick={() => setIsBold(!isBold)}
              className={`p-1.5 rounded-xl transition active:scale-95 cursor-pointer ${
                isBold ? 'bg-white text-indigo-900 font-bold' : 'hover:bg-white/20 text-white'
              }`}
              title="Toggle Bold"
            >
              <Bold className="w-4 h-4" />
            </button>

            {/* Italic Toggle */}
            <button
              type="button"
              onClick={() => setIsItalic(!isItalic)}
              className={`p-1.5 rounded-xl transition active:scale-95 cursor-pointer ${
                isItalic ? 'bg-white text-indigo-900 font-bold' : 'hover:bg-white/20 text-white'
              }`}
              title="Toggle Italic"
            >
              <Italic className="w-4 h-4" />
            </button>

            {/* Poll Toggle */}
            <button
              type="button"
              onClick={() => setHasPoll(!hasPoll)}
              className={`p-1.5 rounded-xl transition active:scale-95 cursor-pointer flex items-center space-x-1 ${
                hasPoll ? 'bg-purple-500 text-white font-bold' : 'hover:bg-white/20 text-white'
              }`}
              title={hasPoll ? 'Remove Poll' : 'Add Poll to Status'}
            >
              <Vote className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Live Editor */}
        <div className="flex-1 flex flex-col items-center justify-center my-3 relative z-10 overflow-y-auto no-scrollbar">
          {error && (
            <div className="mb-2 px-3 py-1.5 bg-rose-900/80 text-rose-200 text-xs rounded-xl flex items-center space-x-1.5 border border-rose-700 shadow-sm animate-in shake">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Status Message Text */}
          <textarea
            autoFocus={!hasPoll}
            maxLength={700}
            rows={hasPoll ? 2 : 4}
            placeholder={hasPoll ? 'Add a caption for your poll...' : 'Type a status update...'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={`w-full bg-transparent text-white placeholder-white/60 text-center ${
              hasPoll ? 'text-lg' : 'text-xl sm:text-2xl'
            } outline-none resize-none leading-relaxed transition-all duration-200 ${
              currentFont.class
            } ${isBold ? 'font-bold' : 'font-normal'} ${isItalic ? 'italic' : 'not-italic'}`}
          />

          {/* Embedded Poll Builder Widget */}
          {hasPoll && (
            <div className="w-full mt-3 p-3.5 bg-black/45 backdrop-blur-md rounded-2xl border border-white/20 space-y-2.5 animate-in fade-in zoom-in-95 shadow-xl">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-white/90">
                <Vote className="w-4 h-4 text-purple-300" />
                <span>Status Poll</span>
              </div>

              <input
                type="text"
                placeholder="Ask a question..."
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 text-white placeholder-white/50 text-xs rounded-xl border border-white/20 outline-none focus:border-white/50"
              />

              <div className="space-y-1.5">
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center space-x-1.5">
                    <input
                      type="text"
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white/10 text-white placeholder-white/50 text-xs rounded-xl border border-white/20 outline-none focus:border-white/50"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePollOption(idx)}
                        className="p-1.5 text-rose-300 hover:text-rose-100 hover:bg-white/10 rounded-lg cursor-pointer"
                        title="Remove option"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {pollOptions.length < 4 && (
                <button
                  type="button"
                  onClick={handleAddPollOption}
                  className="text-[11px] text-white/80 hover:text-white flex items-center space-x-1 font-semibold cursor-pointer pt-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Option ({pollOptions.length}/4)</span>
                </button>
              )}
            </div>
          )}

          <span className="text-[10px] text-white/50 font-mono mt-1.5 select-none">
            {text.length}/700
          </span>
        </div>

        {/* Bottom Bar: Privacy Selector & Share Button */}
        <div className="flex items-center justify-between pt-3 border-t border-white/15 relative z-20 select-none">
          {/* Custom Audience Selection Button */}
          <button
            type="button"
            onClick={() => setPrivacySheetOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-black/35 hover:bg-black/50 rounded-xl text-white text-xs font-medium border border-white/20 transition cursor-pointer active:scale-95 shadow-sm"
          >
            {audience === 'everyone' ? (
              <Globe className="w-3.5 h-3.5 text-indigo-300" />
            ) : audience === 'custom' ? (
              <Lock className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <Users className="w-3.5 h-3.5 text-emerald-300" />
            )}
            <span className="truncate max-w-[170px]">{privacyLabel}</span>
          </button>

          {/* Send / Publish button */}
          <button
            type="button"
            onClick={handlePublish}
            disabled={loading || (!text.trim() && !hasPoll)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-white text-indigo-950 hover:bg-white/95 disabled:opacity-40 font-bold text-xs rounded-2xl shadow-xl transition active:scale-95 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{loading ? 'Posting...' : 'Share Status'}</span>
          </button>
        </div>

        {/* Status Privacy Modal Sheet */}
        {privacySheetOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-2xl rounded-3xl p-5 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-150 text-white"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-white">Status Privacy</h3>
                  <p className="text-[11px] text-slate-400">Who can see my status updates</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPrivacySheetOpen(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Privacy Choices List (WhatsApp Style) */}
              <div className="space-y-2.5 mt-4">
                {/* 1. Everyone */}
                <div
                  onClick={() => setAudience('everyone')}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    audience === 'everyone'
                      ? 'border-indigo-500 bg-indigo-950/40'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Globe className="w-5 h-5 text-indigo-400" />
                    <div>
                      <div className="font-semibold text-xs text-white">Everyone</div>
                      <div className="text-[11px] text-slate-400">All registered users can view</div>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    audience === 'everyone' ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600'
                  }`}>
                    {audience === 'everyone' && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                  </div>
                </div>

                {/* 2. My Contacts */}
                <div
                  onClick={() => {
                    setAudience('contacts');
                    setExcludedUsers([]);
                  }}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    audience === 'contacts' && excludedUsers.length === 0
                      ? 'border-emerald-500 bg-emerald-950/40'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <div>
                      <div className="font-semibold text-xs text-white">My Contacts</div>
                      <div className="text-[11px] text-slate-400">All your chat contacts can view</div>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    audience === 'contacts' && excludedUsers.length === 0 ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'
                  }`}>
                    {audience === 'contacts' && excludedUsers.length === 0 && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                  </div>
                </div>

                {/* 3. My Contacts Except... (Custom Excluded Contacts) */}
                <div
                  onClick={() => {
                    setAudience('contacts');
                    setContactPickerMode('excluded');
                  }}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    audience === 'contacts' && excludedUsers.length > 0
                      ? 'border-rose-500 bg-rose-950/40'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <UserX className="w-5 h-5 text-rose-400" />
                    <div>
                      <div className="font-semibold text-xs text-white">My Contacts Except...</div>
                      <div className="text-[11px] text-slate-400">
                        {excludedUsers.length > 0
                          ? `${excludedUsers.length} contact${excludedUsers.length > 1 ? 's' : ''} excluded`
                          : 'Hide status from specific people'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs text-rose-400 font-medium">
                    <span>{excludedUsers.length > 0 ? `${excludedUsers.length} excluded` : 'Select'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>

                {/* 4. Only Share With... (Custom Allowed Contacts) */}
                <div
                  onClick={() => {
                    setAudience('custom');
                    setContactPickerMode('allowed');
                  }}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    audience === 'custom'
                      ? 'border-amber-500 bg-amber-950/40'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Lock className="w-5 h-5 text-amber-400" />
                    <div>
                      <div className="font-semibold text-xs text-white">Only Share With...</div>
                      <div className="text-[11px] text-slate-400">
                        {allowedUsers.length > 0
                          ? `${allowedUsers.length} contact${allowedUsers.length > 1 ? 's' : ''} selected`
                          : 'Custom list: only selected contacts'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs text-amber-400 font-medium">
                    <span>{allowedUsers.length > 0 ? `${allowedUsers.length} selected` : 'Select'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPrivacySheetOpen(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-xs transition cursor-pointer shadow-lg mt-4"
            >
              Done
            </button>
          </div>
        )}

        {/* Custom Contact Multi-Picker Modal Sheet */}
        {contactPickerMode && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 z-50 bg-slate-950/98 backdrop-blur-2xl rounded-3xl p-5 flex flex-col justify-between animate-in slide-in-from-right duration-200 text-white"
          >
            <div className="flex flex-col flex-1 min-h-0">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {contactPickerMode === 'allowed' ? 'Only Share With...' : 'Hide Status From...'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {contactPickerMode === 'allowed'
                      ? `${allowedUsers.length} contacts selected`
                      : `${excludedUsers.length} contacts excluded`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setContactPickerMode(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative mt-3">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={contactSearchQuery}
                  onChange={(e) => setContactSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>

              {/* Contacts List */}
              <div className="overflow-y-auto space-y-1 mt-3 flex-1 pr-1 no-scrollbar">
                {searchingContacts && (
                  <div className="py-2 text-center text-xs text-slate-500 flex items-center justify-center space-x-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Searching directory...</span>
                  </div>
                )}

                {displayedContacts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No contacts found.
                  </div>
                ) : (
                  displayedContacts.map((c) => {
                    const cId = (c._id || c).toString();
                    const isSelected =
                      contactPickerMode === 'allowed'
                        ? allowedUsers.some((u) => (u._id || u).toString() === cId)
                        : excludedUsers.some((u) => (u._id || u).toString() === cId);

                    return (
                      <div
                        key={cId}
                        onClick={() => toggleContactSelection(c)}
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                          isSelected ? 'bg-indigo-950/40 border border-indigo-500/40' : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <Avatar src={c.avatar} name={c.nickname || c.username} size="sm" />
                          <div className="truncate">
                            <div className="text-xs font-semibold text-white truncate">
                              {c.nickname || c.username}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              @{c.username}
                            </div>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                          isSelected
                            ? contactPickerMode === 'allowed'
                              ? 'border-indigo-400 bg-indigo-500 text-white'
                              : 'border-rose-400 bg-rose-500 text-white'
                            : 'border-slate-600 bg-slate-800'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setContactPickerMode(null)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-xs transition cursor-pointer shadow-lg mt-3"
            >
              Done (
              {contactPickerMode === 'allowed'
                ? `${allowedUsers.length} Included`
                : `${excludedUsers.length} Excluded`}
              )
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
