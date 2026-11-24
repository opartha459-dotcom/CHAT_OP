
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Sparkles,
  Sliders,
  Pipette,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { Avatar } from '../common/Avatar';
import {
  PRESET_BACKGROUNDS,
  PRESET_TEXT_COLORS,
  PRESET_TEXT_GRADIENTS,
  getStoryTextStyle
} from '../../utils/storyStyles';
import { StoryRichTextEditor } from './StoryRichTextEditor';
import { isHtmlEmpty, getPlainTextFromHtml } from '../../utils/storyRichText';

const FONTS = [
  { id: 'sans', label: 'Modern Sans', class: 'font-sans' },
  { id: 'serif', label: 'Classic Serif', class: 'font-serif' },
  { id: 'mono', label: 'Code Mono', class: 'font-mono' }
];

export const CreateStatusModal = ({ isOpen, onClose, onStatusCreated }) => {
  const { user: currentUser, token } = useAuth();
  const { conversations } = useChat();

  const [text, setText] = useState('');
  const [bgIndex, setBgIndex] = useState(0);
  const [fontIndex, setFontIndex] = useState(0);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Rich Text Color & Gradient State
  const [bgStyle, setBgStyle] = useState(PRESET_BACKGROUNDS[0].style);
  const [textColor, setTextColor] = useState('#ffffff');
  const [textGradient, setTextGradient] = useState('');
  const [activeToolbar, setActiveToolbar] = useState('none'); // 'none' | 'bg' | 'text'

  // Custom Background State
  const [customBgTab, setCustomBgTab] = useState('presets'); // 'presets' | 'gradient' | 'solid'
  const [customBg1, setCustomBg1] = useState('#ec4899');
  const [customBg2, setCustomBg2] = useState('#8b5cf6');
  const [customBgAngle, setCustomBgAngle] = useState(135);
  const [customBgSolid, setCustomBgSolid] = useState('#1e1b4b');

  // Custom Text Color State
  const [customTextTab, setCustomTextTab] = useState('presets'); // 'presets' | 'gradients' | 'custom_color' | 'custom_gradient'
  const [customTextColor, setCustomTextColor] = useState('#ffffff');
  const [customText1, setCustomText1] = useState('#facc15');
  const [customText2, setCustomText2] = useState('#f43f5e');
  const [customTextAngle, setCustomTextAngle] = useState(135);

  const [hasPoll, setHasPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const [audience, setAudience] = useState(currentUser?.privacySettings?.statusAudience || 'everyone');
  const [allowedUsers, setAllowedUsers] = useState([]);
  const [excludedUsers, setExcludedUsers] = useState([]);
  const [privacySheetOpen, setPrivacySheetOpen] = useState(false);
  const [contactPickerMode, setContactPickerMode] = useState(null);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [searchingContacts, setSearchingContacts] = useState(false);
  const [showFormattingToolbars, setShowFormattingToolbars] = useState(true);

  const publishInFlightRef = useRef(false);

  const knownContacts = useMemo(() => {
    const map = new Map();

    (conversations || []).forEach((conversation) => {
      if (conversation.type === 'direct' && conversation.otherUser?._id) {
        map.set(conversation.otherUser._id.toString(), conversation.otherUser);
      } else if (conversation.type === 'group' && Array.isArray(conversation.participants)) {
        conversation.participants.forEach((participant) => {
          if (
            participant?._id &&
            participant._id.toString() !== currentUser?._id?.toString()
          ) {
            map.set(participant._id.toString(), participant);
          }
        });
      }
    });

    return Array.from(map.values());
  }, [conversations, currentUser?._id]);

  // Debounced contact search with cancellation of outdated requests.
  useEffect(() => {
    const query = contactSearchQuery.trim();

    if (!isOpen || !contactPickerMode || query.length < 2) {
      setSearchedUsers([]);
      setSearchingContacts(false);
      return undefined;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setSearchingContacts(true);

      try {
        const res = await fetch(
          `/api/users/search?query=${encodeURIComponent(query)}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            credentials: 'include',
            signal: controller.signal
          }
        );

        const data = await res.json();

        if (res.ok && data.success && Array.isArray(data.users)) {
          setSearchedUsers(data.users);
        } else if (!controller.signal.aborted) {
          setSearchedUsers([]);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Contact search error:', err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchingContacts(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, contactPickerMode, contactSearchQuery, token]);

  // Reset the composer and load the saved default audience when opened.
  useEffect(() => {
    if (!isOpen) return;

    setAudience(currentUser?.privacySettings?.statusAudience || 'everyone');
    setText('');
    setHasPoll(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setError('');
    setBgIndex(0);
    setFontIndex(0);
    setIsBold(false);
    setIsItalic(false);
    const initialAllowed = currentUser?.privacySettings?.statusAllowedUsers || [];
    const initialExcluded = currentUser?.privacySettings?.statusExcludedUsers || [];
    setAllowedUsers(Array.isArray(initialAllowed) ? initialAllowed : []);
    setExcludedUsers(Array.isArray(initialExcluded) ? initialExcluded : []);
    setPrivacySheetOpen(false);
    setContactPickerMode(null);
    setContactSearchQuery('');
    setSearchedUsers([]);
    publishInFlightRef.current = false;
  }, [isOpen, currentUser?.privacySettings]);

  const displayedContacts = useMemo(() => {
    const list = [...knownContacts];

    searchedUsers.forEach((searchedUser) => {
      const searchedId = (searchedUser._id || searchedUser).toString();

      if (!list.some((contact) => (contact._id || contact).toString() === searchedId)) {
        list.push(searchedUser);
      }
    });

    if (!contactSearchQuery.trim()) return list;

    const query = contactSearchQuery.trim().toLowerCase();

    return list.filter(
      (contact) =>
        contact.nickname?.toLowerCase().includes(query) ||
        contact.username?.toLowerCase().includes(query)
    );
  }, [knownContacts, searchedUsers, contactSearchQuery]);

  const privacyLabel = useMemo(() => {
    if (audience === 'everyone') return 'Pulse Story · Everyone';

    if (audience === 'contacts') {
      return excludedUsers.length > 0
        ? `Pulse Story · Contacts (${excludedUsers.length} excluded)`
        : 'Pulse Story · My Contacts';
    }

    if (audience === 'custom' || audience === 'only_share_with') {
      return `Pulse Story · Only (${allowedUsers.length} selected)`;
    }

    return 'Pulse Story (24h)';
  }, [audience, allowedUsers.length, excludedUsers.length]);

  if (!isOpen) return null;

  const currentBg = PRESET_BACKGROUNDS[bgIndex];
  const currentFont = FONTS[fontIndex];

  const cycleBackground = () => {
    setBgIndex((prev) => {
      const next = (prev + 1) % PRESET_BACKGROUNDS.length;
      setBgStyle(PRESET_BACKGROUNDS[next].style);
      return next;
    });
  };

  const cycleFont = () => {
    setFontIndex((prev) => (prev + 1) % FONTS.length);
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions((prev) => [...prev, '']);
    }
  };

  const handleRemovePollOption = (index) => {
    if (pollOptions.length > 2) {
      setPollOptions((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handlePollOptionChange = (index, value) => {
    setPollOptions((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const toggleContactSelection = (userObj) => {
    const userId = (userObj._id || userObj).toString();

    if (contactPickerMode === 'allowed') {
      setAllowedUsers((prev) => {
        const exists = prev.some((user) => (user._id || user).toString() === userId);

        return exists
          ? prev.filter((user) => (user._id || user).toString() !== userId)
          : [...prev, userObj];
      });
    } else if (contactPickerMode === 'excluded') {
      setExcludedUsers((prev) => {
        const exists = prev.some((user) => (user._id || user).toString() === userId);

        return exists
          ? prev.filter((user) => (user._id || user).toString() !== userId)
          : [...prev, userObj];
      });
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();

    if (publishInFlightRef.current || loading) return;

    const cleanText = text.trim();
    const cleanQuestion = pollQuestion.trim();
    const cleanOptions = pollOptions
      .map((option) => option.trim())
      .filter(Boolean);

    if (!hasPoll && isHtmlEmpty(cleanText)) {
      setError('Please type your Pulse Story message.');
      return;
    }

    if (hasPoll && !cleanQuestion) {
      setError('Please enter your poll question.');
      return;
    }

    if (hasPoll && (cleanOptions.length < 2 || cleanOptions.length > 4)) {
      setError('A poll must contain between 2 and 4 non-empty options.');
      return;
    }

    if (
      hasPoll &&
      new Set(cleanOptions.map((option) => option.toLowerCase())).size !== cleanOptions.length
    ) {
      setError('Poll options must be unique.');
      return;
    }

    if ((audience === 'custom' || audience === 'only_share_with') && allowedUsers.length === 0) {
      setError('Select at least one contact for Only Share With.');
      return;
    }

    publishInFlightRef.current = true;
    setLoading(true);
    setError('');

    try {
      const targetAudience = audience === 'only_share_with' ? 'custom' : audience;
      const targetAllowedUsers = (audience === 'custom' || audience === 'only_share_with')
        ? allowedUsers.map((user) => (user._id || user).toString())
        : [];
      const targetExcludedUsers = (audience === 'contacts' || audience === 'custom')
        ? excludedUsers.map((user) => (user._id || user).toString())
        : [];

      const payload = {
        type: 'text',
        text: cleanText,
        style: {
          background: bgStyle,
          font: currentFont.id,
          textColor,
          textGradient,
          bold: isBold,
          italic: isItalic
        },
        privacy: {
          audience: targetAudience,
          allowedUsers: targetAllowedUsers,
          excludedUsers: targetExcludedUsers
        },
        hasPoll,
        ...(hasPoll
          ? {
            poll: {
              question: cleanQuestion,
              options: cleanOptions
            }
          }
          : {})
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

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(data.message || `Failed to publish Pulse Story (${res.status}).`);
        return;
      }

      // Persist chosen privacy settings to user profile defaults (like WhatsApp)
      fetch('/api/auth/privacy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          statusAudience: targetAudience,
          statusAllowedUsers: targetAllowedUsers,
          statusExcludedUsers: targetExcludedUsers
        })
      }).catch(() => {});

      if (onStatusCreated) {
        await onStatusCreated(data.status);
      }

      setText('');
      setHasPoll(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setAllowedUsers([]);
      setExcludedUsers([]);
      setPrivacySheetOpen(false);
      setContactPickerMode(null);
      setContactSearchQuery('');
      setSearchedUsers([]);

      onClose();
    } catch (err) {
      console.error('Publish Pulse Story error:', err);
      setError('Network error publishing Pulse Story. Please try again.');
    } finally {
      publishInFlightRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-md h-full sm:h-[640px] sm:rounded-3xl overflow-hidden shadow-2xl relative flex flex-col justify-between p-5 transition-all duration-300"
        style={{ background: bgStyle }}
      >
        <div className="flex items-center justify-between text-white relative z-20">
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-black/20 rounded-full transition active:scale-95 cursor-pointer"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2">
            {showFormattingToolbars && (
              <div className="flex items-center space-x-1.5 bg-black/35 backdrop-blur-md px-2 py-1 rounded-2xl border border-white/20 shadow-md animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => setActiveToolbar((prev) => (prev === 'bg' ? 'none' : 'bg'))}
                  className={`p-1.5 rounded-xl transition active:scale-95 cursor-pointer ${
                    activeToolbar === 'bg' ? 'bg-white text-indigo-900 font-bold' : 'hover:bg-white/20 text-white'
                  }`}
                  title="Story Background (Presets, Custom Gradient, Solid)"
                >
                  <Palette className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveToolbar((prev) => (prev === 'text' ? 'none' : 'text'))}
                  className={`p-1.5 rounded-xl transition active:scale-95 cursor-pointer flex items-center space-x-1 ${
                    activeToolbar === 'text' ? 'bg-white text-indigo-900 font-bold' : 'hover:bg-white/20 text-white'
                  }`}
                  title="Text Color & Gradient Options"
                >
                  <Sparkles className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={cycleFont}
                  className="p-1.5 hover:bg-white/20 rounded-xl transition active:scale-95 text-white cursor-pointer"
                  title="Change Font Family"
                >
                  <Type className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsBold((prev) => !prev)}
                  className={`p-1.5 rounded-xl transition active:scale-95 cursor-pointer ${isBold ? 'bg-white text-indigo-900 font-bold' : 'hover:bg-white/20 text-white'
                    }`}
                  title="Toggle Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsItalic((prev) => !prev)}
                  className={`p-1.5 rounded-xl transition active:scale-95 cursor-pointer ${isItalic ? 'bg-white text-indigo-900 font-bold' : 'hover:bg-white/20 text-white'
                    }`}
                  title="Toggle Italic"
                >
                  <Italic className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setHasPoll((prev) => !prev)}
                  className={`p-1.5 rounded-xl transition active:scale-95 cursor-pointer flex items-center space-x-1 ${hasPoll ? 'bg-purple-500 text-white font-bold' : 'hover:bg-white/20 text-white'
                    }`}
                  title={hasPoll ? 'Remove Poll' : 'Add Poll to Status'}
                >
                  <Vote className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Circular Toggle Button for BOTH formatting toolbars */}
            <button
              type="button"
              onClick={() => {
                setShowFormattingToolbars((prev) => {
                  if (prev) setActiveToolbar('none');
                  return !prev;
                });
              }}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer backdrop-blur-md border shadow-md ${
                showFormattingToolbars
                  ? 'bg-black/35 hover:bg-black/55 border-white/20 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400 text-white shadow-indigo-500/40 ring-2 ring-indigo-400/40 animate-pulse'
              }`}
              title={showFormattingToolbars ? 'Hide formatting tools' : 'Show formatting tools'}
            >
              {showFormattingToolbars ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Slide-down Toolbar: Background Gradients & Colors */}
        {activeToolbar === 'bg' && (
          <div className="absolute top-16 inset-x-4 z-30 p-3 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/20 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-2 text-white">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setCustomBgTab('presets')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    customBgTab === 'presets' ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Presets ({PRESET_BACKGROUNDS.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCustomBgTab('gradient')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    customBgTab === 'gradient' ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Custom Gradient
                </button>
                <button
                  type="button"
                  onClick={() => setCustomBgTab('solid')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    customBgTab === 'solid' ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Custom Solid
                </button>
              </div>
              <button
                type="button"
                onClick={() => setActiveToolbar('none')}
                className="p-1 text-white/60 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Presets Grid */}
            {customBgTab === 'presets' && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto pr-1">
                {PRESET_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setBgStyle(bg.style)}
                    className={`h-9 rounded-xl flex items-center justify-center text-[9px] font-bold text-white shadow-xs transition transform hover:scale-105 active:scale-95 border ${
                      bgStyle === bg.style ? 'ring-2 ring-white border-white scale-105' : 'border-transparent opacity-85 hover:opacity-100'
                    }`}
                    style={{ background: bg.style }}
                  >
                    {bg.label}
                  </button>
                ))}
              </div>
            )}

            {/* Custom Gradient Builder */}
            {customBgTab === 'gradient' && (
              <div className="space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-white/80 mb-1">Color 1 (Start)</label>
                    <div className="flex items-center space-x-1.5 p-1 bg-white/10 rounded-xl border border-white/20">
                      <input
                        type="color"
                        value={customBg1}
                        onChange={(e) => {
                          setCustomBg1(e.target.value);
                          setBgStyle(`linear-gradient(${customBgAngle}deg, ${e.target.value} 0%, ${customBg2} 100%)`);
                        }}
                        className="w-6 h-6 rounded-lg border-0 cursor-pointer bg-transparent"
                      />
                      <span className="font-mono text-[10px] text-white uppercase">{customBg1}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/80 mb-1">Color 2 (End)</label>
                    <div className="flex items-center space-x-1.5 p-1 bg-white/10 rounded-xl border border-white/20">
                      <input
                        type="color"
                        value={customBg2}
                        onChange={(e) => {
                          setCustomBg2(e.target.value);
                          setBgStyle(`linear-gradient(${customBgAngle}deg, ${customBg1} 0%, ${e.target.value} 100%)`);
                        }}
                        className="w-6 h-6 rounded-lg border-0 cursor-pointer bg-transparent"
                      />
                      <span className="font-mono text-[10px] text-white uppercase">{customBg2}</span>
                    </div>
                  </div>
                </div>

                {/* Angle Presets */}
                <div>
                  <label className="block text-[10px] font-bold text-white/80 mb-1">Direction Angle</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[45, 90, 135, 180].map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => {
                          setCustomBgAngle(deg);
                          setBgStyle(`linear-gradient(${deg}deg, ${customBg1} 0%, ${customBg2} 100%)`);
                        }}
                        className={`py-1 rounded-lg text-[10px] font-bold transition border ${
                          customBgAngle === deg ? 'bg-white text-slate-900 border-white' : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
                        }`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Custom Solid Background */}
            {customBgTab === 'solid' && (
              <div className="space-y-2 text-xs">
                <label className="block text-[10px] font-bold text-white/80">Choose Solid Background Color</label>
                <div className="flex items-center space-x-2 p-1.5 bg-white/10 rounded-xl border border-white/20">
                  <input
                    type="color"
                    value={customBgSolid}
                    onChange={(e) => {
                      setCustomBgSolid(e.target.value);
                      setBgStyle(e.target.value);
                    }}
                    className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={customBgSolid}
                    onChange={(e) => {
                      setCustomBgSolid(e.target.value);
                      setBgStyle(e.target.value);
                    }}
                    className="flex-1 bg-transparent text-white font-mono text-xs uppercase outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Slide-down Toolbar: Text Color & Gradients */}
        {activeToolbar === 'text' && (
          <div className="absolute top-16 inset-x-4 z-30 p-3 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/20 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-2 text-white">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setCustomTextTab('presets')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                    customTextTab === 'presets' ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Solid Colors
                </button>
                <button
                  type="button"
                  onClick={() => setCustomTextTab('gradients')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                    customTextTab === 'gradients' ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Gradients
                </button>
                <button
                  type="button"
                  onClick={() => setCustomTextTab('custom_color')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                    customTextTab === 'custom_color' ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Custom Color
                </button>
                <button
                  type="button"
                  onClick={() => setCustomTextTab('custom_gradient')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                    customTextTab === 'custom_gradient' ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Custom Gradient
                </button>
              </div>
              <button
                type="button"
                onClick={() => setActiveToolbar('none')}
                className="p-1 text-white/60 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Preset Solid Colors */}
            {customTextTab === 'presets' && (
              <div className="flex items-center justify-start flex-wrap gap-2 py-1">
                {PRESET_TEXT_COLORS.map((col) => (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => {
                      setTextColor(col.value);
                      setTextGradient('');
                    }}
                    className={`w-7 h-7 rounded-full shadow-xs transition transform hover:scale-110 active:scale-95 border flex items-center justify-center ${
                      textColor === col.value && !textGradient ? 'ring-2 ring-white border-white scale-110' : 'border-white/20'
                    }`}
                    style={{ background: col.value }}
                    title={col.label}
                  >
                    {textColor === col.value && !textGradient && (
                      <Check className={`w-3 h-3 stroke-[3] ${col.value === '#ffffff' || col.value === '#facc15' ? 'text-black' : 'text-white'}`} />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Preset Text Gradients */}
            {customTextTab === 'gradients' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1">
                {PRESET_TEXT_GRADIENTS.map((grad) => (
                  <button
                    key={grad.id}
                    type="button"
                    onClick={() => {
                      setTextGradient(grad.value);
                      setTextColor(grad.value);
                    }}
                    className={`h-8 rounded-xl px-2 flex items-center justify-center font-black text-xs transition border shadow-xs ${
                      textGradient === grad.value ? 'ring-2 ring-white border-white' : 'border-white/20 hover:border-white/60'
                    }`}
                    style={{ background: grad.value, color: '#000000' }}
                  >
                    <span className="drop-shadow-sm font-extrabold text-[10px]">{grad.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Custom Solid Text Color */}
            {customTextTab === 'custom_color' && (
              <div className="space-y-2 text-xs">
                <label className="block text-[10px] font-bold text-white/80">Pick Any Custom Text Color</label>
                <div className="flex items-center space-x-2 p-1.5 bg-white/10 rounded-xl border border-white/20">
                  <input
                    type="color"
                    value={customTextColor}
                    onChange={(e) => {
                      setCustomTextColor(e.target.value);
                      setTextColor(e.target.value);
                      setTextGradient('');
                    }}
                    className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={customTextColor}
                    onChange={(e) => {
                      setCustomTextColor(e.target.value);
                      setTextColor(e.target.value);
                      setTextGradient('');
                    }}
                    className="flex-1 bg-transparent text-white font-mono text-xs uppercase outline-none"
                  />
                </div>
              </div>
            )}

            {/* Custom Text Gradient */}
            {customTextTab === 'custom_gradient' && (
              <div className="space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-white/80 mb-1">Gradient Start Color</label>
                    <div className="flex items-center space-x-1.5 p-1 bg-white/10 rounded-xl border border-white/20">
                      <input
                        type="color"
                        value={customText1}
                        onChange={(e) => {
                          setCustomText1(e.target.value);
                          const g = `linear-gradient(${customTextAngle}deg, ${e.target.value} 0%, ${customText2} 100%)`;
                          setTextGradient(g);
                          setTextColor(g);
                        }}
                        className="w-6 h-6 rounded-lg border-0 cursor-pointer bg-transparent"
                      />
                      <span className="font-mono text-[10px] text-white uppercase">{customText1}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/80 mb-1">Gradient End Color</label>
                    <div className="flex items-center space-x-1.5 p-1 bg-white/10 rounded-xl border border-white/20">
                      <input
                        type="color"
                        value={customText2}
                        onChange={(e) => {
                          setCustomText2(e.target.value);
                          const g = `linear-gradient(${customTextAngle}deg, ${customText1} 0%, ${e.target.value} 100%)`;
                          setTextGradient(g);
                          setTextColor(g);
                        }}
                        className="w-6 h-6 rounded-lg border-0 cursor-pointer bg-transparent"
                      />
                      <span className="font-mono text-[10px] text-white uppercase">{customText2}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/80 mb-1">Gradient Angle</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[45, 90, 135, 180].map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => {
                          setCustomTextAngle(deg);
                          const g = `linear-gradient(${deg}deg, ${customText1} 0%, ${customText2} 100%)`;
                          setTextGradient(g);
                          setTextColor(g);
                        }}
                        className={`py-1 rounded-lg text-[10px] font-bold transition border ${
                          customTextAngle === deg ? 'bg-white text-slate-900 border-white' : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
                        }`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 flex flex-col justify-between my-2 relative z-10 w-full min-h-0 overflow-hidden">
          {error && (
            <div className="mb-2 px-3 py-1.5 bg-rose-900/80 text-rose-200 text-xs rounded-xl flex items-center space-x-1.5 border border-rose-700 shadow-sm animate-in shake shrink-0">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="w-full flex-1 flex flex-col min-h-0">
            <StoryRichTextEditor
              value={text}
              onChange={setText}
              maxLength={700}
              showToolbar={showFormattingToolbars}
              placeholder={hasPoll ? 'Add a caption for your poll...' : 'Type a Pulse Story...'}
              fontClass={currentFont.class}
              isCompact={hasPoll}
              minHeight={hasPoll ? '80px' : '160px'}
              containerStyle={{
                color: textColor || '#ffffff',
                ...getStoryTextStyle({ textColor, textGradient, bold: isBold, italic: isItalic })
              }}
              className="h-full flex-1 flex flex-col justify-between"
            />
          </div>

          {hasPoll && (
            <div className="w-full mt-2.5 p-3.5 bg-black/55 backdrop-blur-md rounded-2xl border border-white/20 space-y-2.5 animate-in fade-in zoom-in-95 shadow-xl max-h-[260px] overflow-y-auto no-scrollbar shrink-0">
              <div className="flex items-center justify-between text-xs font-bold text-white/90">
                <div className="flex items-center space-x-1.5">
                  <Vote className="w-4 h-4 text-purple-300" />
                  <span>Status Poll</span>
                </div>
                <button
                  type="button"
                  onClick={() => setHasPoll(false)}
                  className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
                  title="Remove Poll"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <input
                type="text"
                placeholder="Ask a question..."
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 text-white placeholder-white/50 text-xs rounded-xl border border-white/20 outline-none focus:border-white/50"
              />

              <div className="space-y-1.5">
                {pollOptions.map((option, index) => (
                  <div key={index} className="flex items-center space-x-1.5">
                    <input
                      type="text"
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => handlePollOptionChange(index, e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white/10 text-white placeholder-white/50 text-xs rounded-xl border border-white/20 outline-none focus:border-white/50"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePollOption(index)}
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

          {(() => {
            const plain = getPlainTextFromHtml(text);
            const charCount = plain.length;
            const words = plain.trim() ? plain.trim().split(/\s+/).filter(Boolean).length : 0;
            const isLimit = charCount >= 700;

            return (
              <div className="flex items-center justify-center space-x-2 text-[11px] font-mono mt-1 select-none shrink-0">
                <span
                  className={
                    isLimit
                      ? 'text-rose-400 font-bold animate-pulse'
                      : charCount >= 650
                      ? 'text-amber-300 font-semibold'
                      : 'text-white/60'
                  }
                >
                  {charCount}/700 chars
                </span>
                <span className="text-white/30">•</span>
                <span className="text-white/60">
                  {words} {words === 1 ? 'word' : 'words'}
                </span>
                {isLimit && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-600 text-white font-bold uppercase tracking-wider">
                    Limit Reached
                  </span>
                )}
              </div>
            );
          })()}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/15 relative z-20 select-none">
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

          <button
            type="button"
            onClick={handlePublish}
            disabled={loading || publishInFlightRef.current || (!text.trim() && !hasPoll)}
            className={`flex items-center space-x-1.5 px-4 py-2 bg-white text-indigo-950 font-bold text-xs rounded-2xl shadow-xl transition ${
              loading || publishInFlightRef.current
                ? 'opacity-40 cursor-not-allowed pointer-events-none'
                : 'hover:bg-white/95 active:scale-95 cursor-pointer'
            }`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{loading ? 'Sharing...' : 'Share Pulse Story'}</span>
          </button>
        </div>

        {privacySheetOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-2xl rounded-3xl p-5 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-150 text-white"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-white">Story Privacy</h3>
                  <p className="text-[11px] text-slate-400">Who can see my Pulse Stories (like WhatsApp)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPrivacySheetOpen(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 mt-4">
                <button
                  type="button"
                  onClick={() => setAudience('everyone')}
                  className={`w-full text-left p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${audience === 'everyone'
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
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${audience === 'everyone' ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600'
                    }`}>
                    {audience === 'everyone' && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAudience('contacts');
                    setExcludedUsers([]);
                  }}
                  className={`w-full text-left p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${audience === 'contacts' && excludedUsers.length === 0
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
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${audience === 'contacts' && excludedUsers.length === 0 ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'
                    }`}>
                    {audience === 'contacts' && excludedUsers.length === 0 && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAudience('contacts');
                    setContactPickerMode('excluded');
                  }}
                  className={`w-full text-left p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${audience === 'contacts' && excludedUsers.length > 0
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
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAudience('custom');
                    setContactPickerMode('allowed');
                  }}
                  className={`w-full text-left p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${audience === 'custom'
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
                </button>
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

        {contactPickerMode && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 z-50 bg-slate-950/98 backdrop-blur-2xl rounded-3xl p-5 flex flex-col justify-between animate-in slide-in-from-right duration-200 text-white"
          >
            <div className="flex flex-col flex-1 min-h-0">
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
                  displayedContacts.map((contact) => {
                    const contactId = (contact._id || contact).toString();

                    const isSelected =
                      contactPickerMode === 'allowed'
                        ? allowedUsers.some((user) => (user._id || user).toString() === contactId)
                        : excludedUsers.some((user) => (user._id || user).toString() === contactId);

                    return (
                      <button
                        key={contactId}
                        type="button"
                        onClick={() => toggleContactSelection(contact)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition ${isSelected
                          ? 'bg-indigo-950/40 border border-indigo-500/40'
                          : 'hover:bg-slate-900/60'
                          }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <Avatar src={contact.avatar} name={contact.nickname || contact.username} size="sm" />
                          <div className="truncate">
                            <div className="text-xs font-semibold text-white truncate">
                              {contact.nickname || contact.username}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              @{contact.username}
                            </div>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${isSelected
                          ? contactPickerMode === 'allowed'
                            ? 'border-indigo-400 bg-indigo-500 text-white'
                            : 'border-rose-400 bg-rose-500 text-white'
                          : 'border-slate-600 bg-slate-800'
                          }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
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
