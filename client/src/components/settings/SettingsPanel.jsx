
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Shield,
  Palette,
  Laptop,
  KeyRound,
  Download,
  Trash2,
  X,
  Check,
  AlertCircle,
  LogOut,
  Moon,
  Sun,
  Smartphone,
  Share2,
  PlusSquare,
  Lock,
  Type,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Users,
  Search,
  Sliders
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useChat } from '../../context/ChatContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Avatar } from '../common/Avatar';

export const SettingsPanel = ({
  isModal = false,
  onClose = () => { },
  showNavigation = true,
  activeTab: controlledActiveTab,
  setActiveTab: controlledSetActiveTab
}) => {
  const navigate = useNavigate();
  const { user, token, updateUser, logout, logoutAll } = useAuth();
  const { theme, setTheme, accentColor, setAccentColor, fontSize, setFontSize } = useTheme();
  const { conversations } = useChat();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  const [internalActiveTab, setInternalActiveTab] = useState('appearance');
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;
  const setActiveTab = controlledSetActiveTab !== undefined ? controlledSetActiveTab : setInternalActiveTab;

  const [nickname, setNickname] = useState(user?.nickname || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');

  const [profileVisibility, setProfileVisibility] = useState(user?.privacySettings?.profileVisibility || 'everyone');
  const [lastSeenVisibility, setLastSeenVisibility] = useState(user?.privacySettings?.lastSeenVisibility || 'everyone');
  const [statusAudience, setStatusAudience] = useState(user?.privacySettings?.statusAudience || 'everyone');
  const [statusAllowedUsers, setStatusAllowedUsers] = useState(user?.privacySettings?.statusAllowedUsers || []);
  const [statusExcludedUsers, setStatusExcludedUsers] = useState(user?.privacySettings?.statusExcludedUsers || []);
  const [statusViewReceipts, setStatusViewReceipts] = useState(user?.privacySettings?.statusViewReceipts ?? true);
  const [contactPickerMode, setContactPickerMode] = useState(null); // 'allowed' | 'excluded' | null
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [searchingContacts, setSearchingContacts] = useState(false);

  const [readReceipts, setReadReceipts] = useState(user?.privacySettings?.readReceipts ?? true);
  const [typingIndicators, setTypingIndicators] = useState(user?.privacySettings?.typingIndicators ?? true);
  const [blockedUsers, setBlockedUsers] = useState([]);

  const [sessions, setSessions] = useState([]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteEmailCooldown, setDeleteEmailCooldown] = useState(0);

  const knownContacts = useMemo(() => {
    const map = new Map();
    (conversations || []).forEach((c) => {
      if (c.type === 'direct' && c.otherUser?._id) {
        map.set(c.otherUser._id.toString(), c.otherUser);
      } else if (c.type === 'group' && Array.isArray(c.participants)) {
        c.participants.forEach((p) => {
          if (p?._id && p._id.toString() !== user?._id?.toString()) {
            map.set(p._id.toString(), p);
          }
        });
      }
    });
    return Array.from(map.values());
  }, [conversations, user?._id]);

  useEffect(() => {
    const query = contactSearchQuery.trim();
    if (!contactPickerMode || query.length < 2) {
      setSearchedUsers([]);
      setSearchingContacts(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearchingContacts(true);
      try {
        const res = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
          signal: controller.signal
        });
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
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [contactSearchQuery, contactPickerMode, token]);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  });

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || '');
      setBio(user.bio || '');
      setAvatar(user.avatar || '');
      setProfileVisibility(user.privacySettings?.profileVisibility || 'everyone');
      setLastSeenVisibility(user.privacySettings?.lastSeenVisibility || 'everyone');
      setStatusAudience(user.privacySettings?.statusAudience || 'everyone');
      setStatusAllowedUsers(user.privacySettings?.statusAllowedUsers || []);
      setStatusExcludedUsers(user.privacySettings?.statusExcludedUsers || []);
      setStatusViewReceipts(user.privacySettings?.statusViewReceipts ?? true);
      setReadReceipts(user.privacySettings?.readReceipts ?? true);
      setTypingIndicators(user.privacySettings?.typingIndicators ?? true);
    }
  }, [user]);

  useEffect(() => {
    if (deleteEmailCooldown <= 0) return;

    const timer = setTimeout(() => {
      setDeleteEmailCooldown((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [deleteEmailCooldown]);

  useEffect(() => {
    if (activeTab === 'privacy') {
      fetch('/api/users/blocked', { headers: authHeaders(), credentials: 'include' })
        .then((r) => r.json())
        .then((d) => d.success && setBlockedUsers(d.blockedUsers || []))
        .catch(console.error);
    }

    if (activeTab === 'sessions') {
      fetch('/api/users/sessions', { headers: authHeaders(), credentials: 'include' })
        .then((r) => r.json())
        .then((d) => d.success && setSessions(d.sessions || []))
        .catch(console.error);
    }
  }, [activeTab]);

  const showFeedback = (text, type = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: '', type: '' }), 3500);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ nickname, bio, avatar })
      });
      const data = await res.json();
      if (data.success) {
        updateUser(data.user);
        showFeedback('Profile saved successfully!');
      } else {
        showFeedback(data.message || 'Error updating profile', 'error');
      }
    } catch (err) {
      showFeedback('Network error updating profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrivacy = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users/settings/privacy', {
        method: 'PUT',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          profileVisibility,
          lastSeenVisibility,
          statusAudience,
          statusAllowedUsers: statusAllowedUsers.map((u) => u._id || u),
          statusExcludedUsers: statusExcludedUsers.map((u) => u._id || u),
          statusViewReceipts,
          readReceipts,
          typingIndicators
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.user) {
          updateUser(data.user);
        } else {
          updateUser({
            ...user,
            privacySettings: {
              ...(user?.privacySettings || {}),
              ...(data.privacySettings || {}),
              profileVisibility,
              lastSeenVisibility,
              statusAudience,
              statusAllowedUsers,
              statusExcludedUsers,
              statusViewReceipts,
              readReceipts,
              typingIndicators
            }
          });
        }
        showFeedback('Privacy and status viewer preferences saved!');
      } else {
        showFeedback(data.message || 'Error saving settings', 'error');
      }
    } catch (err) {
      showFeedback('Network error saving settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockedId) => {
    try {
      const res = await fetch(`/api/users/unblock/${blockedId}`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setBlockedUsers((prev) => prev.filter((b) => b._id !== blockedId));
        showFeedback('User unblocked');
      }
    } catch (err) {
      showFeedback('Error unblocking user', 'error');
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      const res = await fetch(`/api/users/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setSessions((prev) => prev.filter((s) => s._id !== sessionId));
        showFeedback('Session revoked');
      }
    } catch (err) {
      showFeedback('Error revoking session', 'error');
    }
  };

  const handleRevokeAllOtherDevices = async () => {
    if (!window.confirm('Are you sure you want to revoke all other devices?')) return;
    try {
      await logoutAll();
      showFeedback('All other sessions revoked.');
    } catch (err) {
      showFeedback('Error revoking sessions', 'error');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showFeedback('New passwords do not match', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('Password changed! Other sessions have been revoked.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showFeedback(data.message || 'Error changing password', 'error');
      }
    } catch (err) {
      showFeedback('Network error changing password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await fetch('/api/export/personal-data', {
        headers: authHeaders(),
        credentials: 'include'
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PulseChat_MyData_${user?.username || 'user'}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showFeedback('Personal data archive downloaded!');
    } catch (err) {
      showFeedback('Error exporting data', 'error');
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();

    if (deleteEmailCooldown > 0 || deleteLoading) return;

    if (!deletePassword) {
      setDeleteError('Please enter your password to confirm.');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');

    try {
      const res = await fetch('/api/auth/request-deletion', {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ password: deletePassword, email: user?.email })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setShowDeletePrompt(false);
        setDeletePassword('');
        setDeleteEmailCooldown(60);
        const targetEmail = data.email || user?.email || '';
        if (targetEmail) {
          try {
            localStorage.setItem('pulsechat_target_deletion_email', targetEmail);
          } catch {}
        }
        showFeedback(data.message || 'Deletion confirmation code generated! Redirecting to confirmation screen...');
        navigate(`/confirm-deletion?email=${encodeURIComponent(targetEmail)}`);
      } else {
        setDeleteError(data.message || 'Error initiating deletion');
      }
    } catch (err) {
      setDeleteError('Network error initiating deletion');
    } finally {
      setDeleteLoading(false);
    }
  };

  const navItems = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'privacy', label: 'Privacy & Safety', icon: Shield },
    { id: 'appearance', label: 'Appearance & Sound', icon: Palette },
    { id: 'install', label: 'Install on Phone', icon: Smartphone },
    { id: 'sessions', label: 'Devices & Sessions', icon: Laptop },
    { id: 'account', label: 'Account & Security', icon: KeyRound }
  ];

  return (
    <div className={`flex flex-col ${showNavigation ? 'md:flex-row' : ''} w-full h-full bg-[#0B0F19] text-slate-100 overflow-hidden ${isModal ? 'max-h-[85vh]' : ''
      }`}>
      {showNavigation && (
        <div className="w-full md:w-60 bg-[#080C14] p-4 border-b md:border-b-0 md:border-r border-slate-800/80 flex flex-col justify-between flex-shrink-0">
          <div>
            <div className="flex items-center space-x-3 pb-3 mb-2 border-b border-slate-800/70">
              <Avatar src={user?.avatar} name={user?.nickname || user?.username} size="md" />
              <div className="overflow-hidden min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs sm:text-sm font-bold text-white truncate">
                    {user?.nickname || user?.username || 'FATTY'}
                  </span>
                  {user?.role === 'admin' && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#311119] text-[#F43F5E] border border-[#881337] rounded-md flex-shrink-0">
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-mono truncate">
                  @{user?.username || 'partha_op'}
                </div>
              </div>
            </div>

            <nav className="flex md:flex-col overflow-x-auto no-scrollbar space-x-1 md:space-x-0 md:space-y-1.5 py-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition flex-shrink-0 cursor-pointer ${isActive
                      ? 'bg-[#8B5CF6] text-white shadow-lg shadow-purple-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/70 space-y-2">
            {user?.role === 'admin' && (
              <button
                onClick={() => {
                  if (isModal) onClose();
                  navigate('/admin');
                }}
                className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 text-xs font-semibold text-[#F43F5E] bg-[#1F101A] hover:bg-[#2C1424] border border-[#641A2D] rounded-2xl transition cursor-pointer shadow-xs"
              >
                <Shield className="w-4 h-4 flex-shrink-0 text-[#F43F5E]" />
                <span>Admin Dashboard</span>
              </button>
            )}

            <button
              onClick={logout}
              className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-[#F43F5E] hover:text-[#FB7185] hover:bg-rose-950/20 rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0B0F19]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 flex-shrink-0">
          <h2 className="text-sm sm:text-base font-bold text-white">
            {navItems.find((n) => n.id === activeTab)?.label}
          </h2>
          {isModal && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 cursor-pointer transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {statusMsg.text && (
          <div
            className={`mx-6 mt-3 p-2.5 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in ${statusMsg.type === 'error'
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}
          >
            {statusMsg.type === 'error'
              ? <AlertCircle className="w-4 h-4 flex-shrink-0" />
              : <Check className="w-4 h-4 flex-shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto px-6 py-5 space-y-6 no-scrollbar ${!showNavigation ? 'max-w-3xl mx-auto w-full' : ''}`}>
          {activeTab === 'appearance' && (
            <div className="space-y-5">
              <div className="rounded-3xl border border-slate-800/80 bg-gradient-to-br from-[#151329] via-[#101827] to-[#0E1422] p-5 sm:p-6 shadow-xl shadow-black/20">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-violet-300">Personalize PulseChat</p>
                    <h3 className="text-lg font-bold text-white mt-1">Appearance & Sound</h3>
                    <p className="text-xs text-slate-400 mt-1">Tune the look and reading comfort of your chat experience.</p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-violet-500/15 border border-violet-400/20 flex items-center justify-center">
                    <Palette className="w-5 h-5 text-violet-300" />
                  </div>
                </div>

                <section className="rounded-2xl border border-slate-800 bg-[#090F1C]/70 p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white">Color theme</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Choose how PulseChat looks on this device.</p>
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Theme</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'light', label: 'Light', icon: Sun },
                      { id: 'dark', label: 'Dark', icon: Moon },
                      { id: 'system', label: 'System', icon: Laptop }
                    ].map((item) => {
                      const Icon = item.icon;
                      const selected = theme === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setTheme(item.id);
                            showFeedback(`Theme set to ${item.label}.`);
                          }}
                          aria-pressed={selected}
                          className={`min-w-0 rounded-xl border px-2 py-3 flex flex-col items-center gap-2 text-xs font-semibold transition ${selected
                            ? 'border-violet-400 bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/30'
                            : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-600 hover:text-white'
                            }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                          {selected && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-800 bg-[#090F1C]/70 p-4 sm:p-5 mt-3">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-white">Accent color</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Choose the highlight color used across controls.</p>
                    </div>
                    <span className="text-[10px] text-slate-500">{accentColor || 'violet'}</span>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {[
                      { id: 'indigo', class: 'bg-[#4F46E5]', name: 'Indigo' },
                      { id: 'emerald', class: 'bg-[#059669]', name: 'Emerald' },
                      { id: 'violet', class: 'bg-[#8B5CF6]', name: 'Violet' },
                      { id: 'rose', class: 'bg-[#E11D48]', name: 'Rose' },
                      { id: 'cyan', class: 'bg-[#0891B2]', name: 'Cyan' },
                      { id: 'amber', class: 'bg-[#D97706]', name: 'Amber' }
                    ].map((color) => {
                      const selected = accentColor === color.id || (accentColor === 'purple' && color.id === 'violet');
                      return (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => {
                            setAccentColor(color.id);
                            showFeedback(`${color.name} accent selected.`);
                          }}
                          aria-label={`${color.name} accent color`}
                          aria-pressed={selected}
                          className={`w-9 h-9 rounded-full ${color.class} flex items-center justify-center transition ${selected
                            ? 'ring-2 ring-white ring-offset-4 ring-offset-[#090F1C] scale-110'
                            : 'opacity-80 hover:opacity-100 hover:scale-110'
                            }`}
                        >
                          {selected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-800 bg-[#090F1C]/70 p-4 sm:p-5 mt-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Type className="w-4 h-4 text-violet-300" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Message font size</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Adjust chat text for comfortable reading.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'small', label: 'Small', sample: 'text-sm' },
                      { id: 'medium', label: 'Medium', sample: 'text-base' },
                      { id: 'large', label: 'Large', sample: 'text-lg' }
                    ].map((item) => {
                      const selected = (fontSize || 'medium') === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setFontSize(item.id);
                            showFeedback(`Message font size set to ${item.label}.`);
                          }}
                          aria-pressed={selected}
                          className={`rounded-xl border px-2 py-3 transition ${selected
                            ? 'border-violet-400 bg-violet-500/15 text-violet-200'
                            : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-600 hover:text-white'
                            }`}
                        >
                          <span className={`block font-semibold ${item.sample}`}>Aa</span>
                          <span className="block text-[10px] mt-1">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Live preview</p>
                    <p className={`${fontSize === 'small' ? 'text-xs' : fontSize === 'large' ? 'text-lg' : 'text-sm'} text-slate-200`}>
                      The quick brown fox jumps over the lazy dog.
                    </p>
                  </div>
                </section>

                <div className="mt-4 flex items-start gap-2 text-[11px] text-slate-500">
                  <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <p>
                    Appearance preferences are applied through your app settings. Sound controls are not shown here because this version does not expose a sound-preference API.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar src={avatar} name={nickname || user?.username} size="lg" />
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Avatar URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-[#0E1422] border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={user?.username ? `@${user.username}` : ''}
                    disabled
                    readOnly
                    className="w-full px-3.5 py-2 text-xs bg-[#0E1422]/70 border border-slate-800 rounded-xl text-slate-400 font-mono cursor-not-allowed select-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      readOnly
                      className="w-full px-3.5 py-2 text-xs bg-[#0E1422]/70 border border-slate-800 rounded-xl text-white font-mono cursor-not-allowed select-all truncate"
                    />
                    <span className="px-2 py-1 text-[10px] font-bold rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                      Verified
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Display Nickname
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-[#0E1422] border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Bio / Status
                </label>
                <textarea
                  rows={2}
                  maxLength={200}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-[#0E1422] border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 rounded-2xl shadow-md transition cursor-pointer"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Who can see my profile details
                  </label>
                  <select
                    value={profileVisibility}
                    onChange={(e) => setProfileVisibility(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-[#0E1422] border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">Contacts only</option>
                    <option value="nobody">Nobody (Private)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Who can see my last seen & online presence
                  </label>
                  <select
                    value={lastSeenVisibility}
                    onChange={(e) => setLastSeenVisibility(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-[#0E1422] border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">Contacts only</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>

                <div className="pt-2 space-y-2.5 border-t border-slate-800">
                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                    <span>Send read receipts (Blue checkmarks)</span>
                    <input
                      type="checkbox"
                      checked={readReceipts}
                      onChange={(e) => setReadReceipts(e.target.checked)}
                      className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                    <span>Show typing indicators when composing messages</span>
                    <input
                      type="checkbox"
                      checked={typingIndicators}
                      onChange={(e) => setTypingIndicators(e.target.checked)}
                      className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                    />
                  </label>
                </div>

                {/* STATUS VIEWER & PRIVACY SETTINGS SUITE */}
                <div className="mt-4 rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-950/40 via-slate-900/80 to-[#0B0F19] p-4 sm:p-5 space-y-4 shadow-xl shadow-black/20">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-violet-300" />
                        <h4 className="text-sm font-bold text-white">Status Viewer & Privacy Settings</h4>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Control who can view your 24h status updates and manage your status read receipts.
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      Stories
                    </span>
                  </div>

                  {/* Status Audience Options */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Who can see my status updates
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        {
                          id: 'everyone',
                          title: 'Everyone',
                          desc: 'Anyone on PulseChat can see your stories'
                        },
                        {
                          id: 'contacts',
                          title: 'My Contacts',
                          desc: 'Only your direct chat contacts and groups'
                        },
                        {
                          id: 'custom',
                          title: 'My Contacts Except...',
                          desc: statusExcludedUsers.length > 0
                            ? `Excluding ${statusExcludedUsers.length} contact(s)`
                            : 'Hide your status from selected contacts'
                        },
                        {
                          id: 'only_share_with',
                          title: 'Only Share With...',
                          desc: statusAllowedUsers.length > 0
                            ? `Sharing with ${statusAllowedUsers.length} contact(s)`
                            : 'Only visible to specific chosen contacts'
                        }
                      ].map((opt) => {
                        const isSelected = statusAudience === opt.id;
                        return (
                          <div
                            key={opt.id}
                            onClick={() => {
                              setStatusAudience(opt.id);
                              if (opt.id === 'custom') setContactPickerMode('excluded');
                              if (opt.id === 'only_share_with') setContactPickerMode('allowed');
                            }}
                            className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-violet-600/20 border-violet-400/80 text-white shadow-sm'
                                : 'bg-[#0E1422] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-xs text-white">{opt.title}</span>
                              <div
                                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                  isSelected
                                    ? 'border-violet-400 bg-violet-500 text-white'
                                    : 'border-slate-700'
                                }`}
                              >
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 leading-tight">{opt.desc}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Manage Excluded/Allowed Contacts Action Buttons */}
                    {statusAudience === 'custom' && (
                      <div className="pt-1 flex items-center justify-between text-xs">
                        <span className="text-slate-400 text-[11px]">
                          {statusExcludedUsers.length} contact(s) currently excluded
                        </span>
                        <button
                          type="button"
                          onClick={() => setContactPickerMode('excluded')}
                          className="px-3 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold cursor-pointer transition"
                        >
                          Configure Excluded Contacts
                        </button>
                      </div>
                    )}

                    {statusAudience === 'only_share_with' && (
                      <div className="pt-1 flex items-center justify-between text-xs">
                        <span className="text-slate-400 text-[11px]">
                          {statusAllowedUsers.length} contact(s) currently allowed
                        </span>
                        <button
                          type="button"
                          onClick={() => setContactPickerMode('allowed')}
                          className="px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold cursor-pointer transition"
                        >
                          Configure Allowed Contacts
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Status Read Receipts Toggle */}
                  <div className="pt-3 border-t border-slate-800/80">
                    <label className="flex items-start justify-between gap-3 text-xs text-slate-300 cursor-pointer">
                      <div>
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          {statusViewReceipts ? (
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                          )}
                          <span>Status View Receipts</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          If turned off, you will not see who viewed your status updates, and others will not see when you view theirs.
                        </p>
                      </div>

                      <input
                        type="checkbox"
                        checked={statusViewReceipts}
                        onChange={(e) => setStatusViewReceipts(e.target.checked)}
                        className="mt-1 rounded border-slate-700 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSavePrivacy}
                    disabled={loading}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 rounded-2xl shadow-md transition cursor-pointer flex items-center space-x-2"
                  >
                    <span>Save Privacy & Status Preferences</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Blocked Users ({blockedUsers.length})
                </h4>
                {blockedUsers.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No blocked users.</p>
                ) : (
                  <div className="space-y-2">
                    {blockedUsers.map((b) => (
                      <div key={b._id} className="flex items-center justify-between p-2 rounded-xl bg-[#0E1422] border border-slate-800 text-xs">
                        <div className="flex items-center space-x-2">
                          <Avatar src={b.avatar} name={b.nickname || b.username} size="sm" />
                          <span className="font-semibold text-white">{b.nickname || b.username}</span>
                        </div>
                        <button
                          onClick={() => handleUnblock(b._id)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'install' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-[#0E1422] border border-slate-800 flex items-start space-x-3.5">
                <Smartphone className="w-6 h-6 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-white">
                    {isInstalled ? 'App Installed' : 'Install PulseChat on Your Phone'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {isInstalled
                      ? 'PulseChat is already installed on your device.'
                      : 'Get push notifications, full screen calls, and instant messaging right on your home screen.'}
                  </p>
                </div>
              </div>

              {!isInstalled && isInstallable && (
                <button
                  type="button"
                  onClick={async () => {
                    await promptInstall();
                  }}
                  className="px-5 py-2.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-2xl text-xs font-bold shadow-md cursor-pointer transition"
                >
                  Install Now
                </button>
              )}

              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span>For iPhone / iPad (Safari)</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs text-slate-300">
                  <div className="p-3 rounded-2xl bg-[#0E1422] border border-slate-800">
                    <div className="font-bold text-purple-400 mb-1">Step 1</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Open PulseChat in Safari, then tap the <Share2 className="w-3.5 h-3.5 inline text-purple-400 mx-0.5" /> <span className="font-semibold text-white">Share</span> button at the bottom.
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#0E1422] border border-slate-800">
                    <div className="font-bold text-purple-400 mb-1">Step 2</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Scroll down and tap <PlusSquare className="w-3.5 h-3.5 inline text-purple-400 mx-0.5" /> <span className="font-semibold text-white">'Add to Home Screen'</span>.
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#0E1422] border border-slate-800">
                    <div className="font-bold text-purple-400 mb-1">Step 3</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Tap <span className="font-semibold text-white">'Add'</span> in top-right. Launch directly from your home screen.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>For Android (Chrome / Brave / Samsung Internet)</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-300">
                  <div className="p-3 rounded-2xl bg-[#0E1422] border border-slate-800">
                    <div className="font-bold text-emerald-400 mb-1">Method A</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Look for the <span className="font-semibold text-white">"Install App"</span> banner at the bottom or URL bar.
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#0E1422] border border-slate-800">
                    <div className="font-bold text-emerald-400 mb-1">Method B</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Tap the <span className="font-semibold text-white">three dots menu (⋮)</span> and select <span className="font-semibold text-white">'Install App'</span>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Active log-ins across your devices</span>
                <button
                  onClick={handleRevokeAllOtherDevices}
                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 cursor-pointer"
                >
                  Revoke all other devices
                </button>
              </div>

              <div className="space-y-2.5">
                {sessions.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No active sessions found.</p>
                ) : (
                  sessions.map((s) => (
                    <div
                      key={s._id}
                      className="p-3 rounded-2xl bg-[#0E1422] border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        <Laptop className="w-5 h-5 text-purple-400 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-white flex items-center space-x-1.5">
                            <span>{s.deviceInfo?.os || s.os || 'Device'} · {s.deviceInfo?.browser || s.browser || 'Browser'}</span>
                            {s.isCurrent && (
                              <span className="px-1.5 py-0.5 text-[9px] bg-emerald-500/20 text-emerald-400 rounded-md font-bold">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            IP: {s.ipAddress || s.ip || 'Unknown'} · Last active {new Date(s.lastActive || s.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      {!s.isCurrent && (
                        <button
                          onClick={() => handleRevokeSession(s._id)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-6">
              <form onSubmit={handleChangePassword} className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Change Password
                </h4>
                <div>
                  <input
                    type="password"
                    placeholder="Current Password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-[#0E1422] border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="New Password (min 6 chars)"
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-[#0E1422] border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-[#0E1422] border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !currentPassword || !newPassword}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 rounded-2xl shadow-md transition cursor-pointer"
                >
                  Update Password
                </button>
              </form>

              <div className="pt-4 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  GDPR Data Portability
                </h4>
                <p className="text-xs text-slate-400 mb-2.5 leading-relaxed">
                  Download a copy of your personal data, settings, and profile info in machine-readable JSON format.
                </p>
                <button
                  type="button"
                  onClick={handleExportData}
                  className="flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold bg-[#0E1422] hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-2xl transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>Download Personal Data</span>
                </button>
              </div>

              <section className="relative overflow-hidden rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-950/35 via-[#11121D] to-[#0E1422] shadow-lg shadow-black/10">
                <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

                <div className="relative flex items-start gap-3.5 border-b border-rose-500/15 px-4 py-4 sm:px-5">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-rose-500/25 bg-rose-500/10">
                    <Trash2 className="h-5 w-5 text-rose-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold tracking-wide text-rose-300">Danger Zone</h4>
                      <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-300">
                        Irreversible action
                      </span>
                    </div>
                    <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-slate-400">
                      Permanently remove your PulseChat account. You will receive a confirmation email before the deletion process can continue.
                    </p>
                  </div>
                </div>

                <div className="relative space-y-3 p-4 sm:p-5">
                  {!showDeletePrompt ? (
                    <>
                      <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/15 bg-amber-500/[0.06] p-3">
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                        <p className="text-[11px] leading-relaxed text-slate-400">
                          Account deletion may remove your profile and associated data. Make sure you have exported anything you want to keep.
                        </p>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-200">Delete this account</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">A password check is required to continue.</p>
                        </div>
                        <button
                          type="button"
                          disabled={deleteEmailCooldown > 0}
                          onClick={() => {
                            setDeleteError('');
                            setShowDeletePrompt(true);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-300 transition hover:border-rose-400/50 hover:bg-rose-500/20 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {deleteEmailCooldown > 0
                            ? `Try again in ${deleteEmailCooldown}s`
                            : 'Delete Account'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <form onSubmit={handleDeleteAccount} className="space-y-3">
                      <div>
                        <p className="text-xs font-bold text-rose-200">Confirm account deletion request</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                          Enter your current password. We will send a confirmation link to your registered email address.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="delete-account-password" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Current password
                        </label>
                        <input
                          id="delete-account-password"
                          type="password"
                          autoComplete="current-password"
                          placeholder="Enter your password"
                          value={deletePassword}
                          onChange={(e) => {
                            setDeletePassword(e.target.value);
                            if (deleteError) setDeleteError('');
                          }}
                          className="w-full rounded-xl border border-slate-700/80 bg-[#080C14]/90 px-3.5 py-3 text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-rose-500/70 focus:ring-2 focus:ring-rose-500/15"
                        />
                      </div>

                      {deleteError && (
                        <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                          <span>{deleteError}</span>
                        </div>
                      )}

                      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          disabled={deleteLoading}
                          onClick={() => {
                            setShowDeletePrompt(false);
                            setDeletePassword('');
                            setDeleteError('');
                          }}
                          className="rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={deleteLoading || deleteEmailCooldown > 0 || !deletePassword}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-950/30 transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deleteLoading ? (
                            <>
                              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              Sending request...
                            </>
                          ) : (
                            <>
                              <Lock className="h-3.5 w-3.5" />
                              Send confirmation email
                            </>
                          )}
                        </button>
                      </div>

                      {deleteEmailCooldown > 0 && (
                        <p className="text-center text-[10px] text-slate-500">
                          You can request another confirmation email in {deleteEmailCooldown} seconds.
                        </p>
                      )}
                    </form>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {/* STATUS CONTACT PICKER MODAL (ALLOWED / EXCLUDED) */}
      {contactPickerMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#0F1524] rounded-3xl border border-slate-800 shadow-2xl p-5 flex flex-col max-h-[85vh] text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  {contactPickerMode === 'excluded' ? (
                    <>
                      <UserX className="w-4 h-4 text-rose-400" />
                      <span>Hide Status From (Exclude)</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                      <span>Share Status Only With</span>
                    </>
                  )}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {contactPickerMode === 'excluded'
                    ? 'Selected contacts will NOT see your status updates.'
                    : 'ONLY selected contacts will see your status updates.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setContactPickerMode(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="mt-3 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={contactSearchQuery}
                onChange={(e) => setContactSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#090D16] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            {/* Contact List */}
            <div className="flex-1 overflow-y-auto my-3 space-y-1 no-scrollbar pr-1">
              {searchingContacts && (
                <div className="py-4 text-center text-xs text-slate-400 animate-pulse">
                  Searching contacts...
                </div>
              )}

              {(() => {
                const list =
                  contactSearchQuery.trim().length >= 2 && searchedUsers.length > 0
                    ? searchedUsers
                    : knownContacts;

                if (!searchingContacts && list.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No contacts found. Start chats to add contacts here.
                    </div>
                  );
                }

                return list.map((person) => {
                  const pId = person._id?.toString();
                  const targetList =
                    contactPickerMode === 'excluded'
                      ? statusExcludedUsers
                      : statusAllowedUsers;
                  const isChecked = targetList.some(
                    (u) => (u._id?.toString() || u.toString()) === pId
                  );

                  const toggleSelection = () => {
                    if (contactPickerMode === 'excluded') {
                      setStatusExcludedUsers((prev) =>
                        isChecked
                          ? prev.filter(
                              (u) => (u._id?.toString() || u.toString()) !== pId
                            )
                          : [...prev, person]
                      );
                    } else {
                      setStatusAllowedUsers((prev) =>
                        isChecked
                          ? prev.filter(
                              (u) => (u._id?.toString() || u.toString()) !== pId
                            )
                          : [...prev, person]
                      );
                    }
                  };

                  return (
                    <div
                      key={pId}
                      onClick={toggleSelection}
                      className={`flex items-center justify-between p-2 rounded-xl transition cursor-pointer ${
                        isChecked
                          ? contactPickerMode === 'excluded'
                            ? 'bg-rose-950/20 border border-rose-500/30'
                            : 'bg-emerald-950/20 border border-emerald-500/30'
                          : 'hover:bg-slate-800/40 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Avatar
                          src={person.avatar}
                          name={person.nickname || person.username}
                          size="sm"
                        />
                        <div className="truncate min-w-0">
                          <div className="text-xs font-semibold text-white truncate">
                            {person.nickname || person.username}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            @{person.username}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                          isChecked
                            ? contactPickerMode === 'excluded'
                              ? 'bg-rose-500 border-rose-500 text-white'
                              : 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {contactPickerMode === 'excluded'
                  ? `${statusExcludedUsers.length} excluded`
                  : `${statusAllowedUsers.length} allowed`}
              </span>

              <button
                type="button"
                onClick={() => setContactPickerMode(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
