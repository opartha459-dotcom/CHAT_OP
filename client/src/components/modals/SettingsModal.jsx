import React, { useState, useEffect } from 'react';
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
  Volume2,
  VolumeX,
  Smartphone,
  Share2,
  PlusSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Avatar } from '../common/Avatar';

export const SettingsModal = ({ isOpen, onClose }) => {
  const { user, token, updateUser, logout, logoutAll } = useAuth();
  const { theme, setTheme, accentColor, setAccentColor, fontSize, setFontSize } = useTheme();
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();

  const [activeTab, setActiveTab] = useState('profile');
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');

  // Privacy states
  const [profileVisibility, setProfileVisibility] = useState(user?.privacySettings?.profileVisibility || 'everyone');
  const [lastSeenVisibility, setLastSeenVisibility] = useState(user?.privacySettings?.lastSeenVisibility || 'everyone');
  const [readReceipts, setReadReceipts] = useState(user?.privacySettings?.readReceipts ?? true);
  const [typingIndicators, setTypingIndicators] = useState(user?.privacySettings?.typingIndicators ?? true);
  const [blockedUsers, setBlockedUsers] = useState([]);

  // Sessions
  const [sessions, setSessions] = useState([]);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status/Feedback
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

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
      setReadReceipts(user.privacySettings?.readReceipts ?? true);
      setTypingIndicators(user.privacySettings?.typingIndicators ?? true);
    }
  }, [user]);

  // Load blocked users and sessions when those tabs open
  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === 'privacy') {
      fetch('/api/users/blocked', { headers: authHeaders(), credentials: 'include' })
        .then((r) => r.json())
        .then((d) => d.success && setBlockedUsers(d.blockedUsers))
        .catch(console.error);
    }

    if (activeTab === 'sessions') {
      fetch('/api/users/sessions', { headers: authHeaders(), credentials: 'include' })
        .then((r) => r.json())
        .then((d) => d.success && setSessions(d.sessions))
        .catch(console.error);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const showFeedback = (text, type = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: '', type: '' }), 3500);
  };

  // Save profile updates
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

  // Save privacy settings
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
          readReceipts,
          typingIndicators
        })
      });
      const data = await res.json();
      if (data.success) {
        updateUser({ ...user, privacySettings: data.privacySettings });
        showFeedback('Privacy preferences saved!');
      } else {
        showFeedback(data.message || 'Error saving settings', 'error');
      }
    } catch (err) {
      showFeedback('Network error saving settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Unblock user
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

  // Revoke session
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

  // Change password
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

  // Export GDPR data
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
      a.download = `PulseChat_MyData_${user.username}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showFeedback('Personal data archive downloaded!');
    } catch (err) {
      showFeedback('Error exporting data', 'error');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[85vh]">
        {/* Left Navigation */}
        <div className="w-full md:w-56 bg-slate-50 dark:bg-slate-950/60 p-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 pb-4 mb-3 border-b border-slate-200 dark:border-slate-800">
              <Avatar src={user?.avatar} name={user?.nickname || user?.username} size="sm" />
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                  {user?.nickname || user?.username}
                </div>
                <div className="text-[11px] text-slate-400">@{user?.username}</div>
              </div>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <button
            onClick={logout}
            className="flex items-center space-x-2 px-3 py-2 mt-4 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white">
              {navItems.find((n) => n.id === activeTab)?.label}
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feedback message banner */}
          {statusMsg.text && (
            <div
              className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-center space-x-2 ${
                statusMsg.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 border border-rose-200 dark:border-rose-900'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border border-emerald-200 dark:border-emerald-900'
              }`}
            >
              {statusMsg.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Tab Panes */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar src={avatar} name={nickname || user?.username} size="lg" />
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Avatar URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Display Nickname
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Bio / Status
                  </label>
                  <textarea
                    rows={2}
                    maxLength={200}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-md shadow-indigo-600/20 transition"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {/* PRIVACY TAB */}
            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Who can see my profile details
                    </label>
                    <select
                      value={profileVisibility}
                      onChange={(e) => setProfileVisibility(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="contacts">Contacts only</option>
                      <option value="nobody">Nobody (Private)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Who can see my last seen & online presence
                    </label>
                    <select
                      value={lastSeenVisibility}
                      onChange={(e) => setLastSeenVisibility(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="contacts">Contacts only</option>
                      <option value="nobody">Nobody</option>
                    </select>
                  </div>

                  <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <span>Send read receipts (Blue checkmarks)</span>
                      <input
                        type="checkbox"
                        checked={readReceipts}
                        onChange={(e) => setReadReceipts(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <span>Show typing indicators when composing messages</span>
                      <input
                        type="checkbox"
                        checked={typingIndicators}
                        onChange={(e) => setTypingIndicators(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </label>
                  </div>

                  <button
                    onClick={handleSavePrivacy}
                    className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm"
                  >
                    Update Privacy
                  </button>
                </div>

                {/* Blocked Users Section */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Blocked Users ({blockedUsers.length})
                  </h3>
                  {blockedUsers.length === 0 ? (
                    <p className="text-xs text-slate-400">You haven't blocked any users.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {blockedUsers.map((b) => (
                        <div
                          key={b._id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs"
                        >
                          <div className="flex items-center space-x-2">
                            <Avatar src={b.avatar} name={b.nickname || b.username} size="sm" />
                            <span>{b.nickname || b.username}</span>
                          </div>
                          <button
                            onClick={() => handleUnblock(b._id)}
                            className="px-2.5 py-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition"
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

            {/* APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Color Theme
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'light', label: 'Light', icon: Sun },
                      { id: 'dark', label: 'Dark', icon: Moon },
                      { id: 'system', label: 'System', icon: Laptop }
                    ].map((t) => {
                      const Icon = t.icon;
                      const isSelected = theme === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setTheme(t.id);
                            showFeedback(`Theme changed to ${t.label}!`);
                          }}
                          className={`p-3 rounded-xl border text-xs font-medium capitalize flex items-center justify-center space-x-2 transition ${
                            isSelected
                              ? 'border-accent bg-accent-light text-accent font-semibold shadow-xs'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Accent Color
                  </label>
                  <div className="flex items-center space-x-3">
                    {[
                      { id: 'indigo', class: 'bg-indigo-600', name: 'Indigo' },
                      { id: 'emerald', class: 'bg-emerald-600', name: 'Emerald' },
                      { id: 'violet', class: 'bg-violet-600', name: 'Violet' },
                      { id: 'rose', class: 'bg-rose-600', name: 'Rose' },
                      { id: 'cyan', class: 'bg-cyan-600', name: 'Cyan' },
                      { id: 'amber', class: 'bg-amber-600', name: 'Amber' }
                    ].map((col) => {
                      const isSelected = accentColor === col.id;
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => {
                            setAccentColor(col.id);
                            showFeedback(`Accent color set to ${col.name}!`);
                          }}
                          className={`w-8 h-8 rounded-full ${col.class} transition-all flex items-center justify-center ${
                            isSelected
                              ? 'ring-4 ring-offset-2 ring-slate-400 dark:ring-slate-500 scale-110 shadow-md'
                              : 'hover:scale-105 opacity-80 hover:opacity-100'
                          }`}
                          title={col.name}
                        >
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Message Font Size
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['small', 'medium', 'large'].map((fs) => (
                      <button
                        key={fs}
                        type="button"
                        onClick={() => {
                          setFontSize(fs);
                          showFeedback(`Font size set to ${fs}!`);
                        }}
                        className={`p-2 rounded-xl border text-xs capitalize transition ${
                          fontSize === fs
                            ? 'border-accent bg-accent-light text-accent font-semibold shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {fs}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* INSTALL ON PHONE TAB */}
            {activeTab === 'install' && (
              <div className="space-y-5">
                <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-indigo-500/5 rounded-2xl border border-indigo-200/50 dark:border-indigo-900/50">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-600/30">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Install on Phone & Desktop</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      PulseChat is fully installable as a standalone app with home screen access and offline capabilities.
                    </p>
                  </div>
                </div>

                {/* Instant prompt button if available */}
                {isInstalled ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>App is already installed and running in standalone mode!</span>
                  </div>
                ) : isInstallable ? (
                  <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/60 dark:border-indigo-900/50 space-y-2">
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      Your browser supports 1-click installation.
                    </p>
                    <button
                      onClick={async () => {
                        const success = await promptInstall();
                        if (success) showFeedback('App installed successfully!');
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/25 flex items-center space-x-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Install App Now</span>
                    </button>
                  </div>
                ) : null}

                {/* iPhone / iOS Guide */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <span>For iPhone & iPad (Safari)</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                      <div className="font-bold text-indigo-600 dark:text-indigo-400 mb-1">Step 1</div>
                      <p className="text-[11px] leading-relaxed">
                        Tap the <Share2 className="w-3 h-3 inline text-indigo-500 mx-0.5" /> <span className="font-semibold text-slate-900 dark:text-white">Share</span> button in Safari.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                      <div className="font-bold text-indigo-600 dark:text-indigo-400 mb-1">Step 2</div>
                      <p className="text-[11px] leading-relaxed">
                        Scroll down and tap <PlusSquare className="w-3 h-3 inline text-indigo-500 mx-0.5" /> <span className="font-semibold text-slate-900 dark:text-white">'Add to Home Screen'</span>.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                      <div className="font-bold text-indigo-600 dark:text-indigo-400 mb-1">Step 3</div>
                      <p className="text-[11px] leading-relaxed">
                        Tap <span className="font-semibold text-slate-900 dark:text-white">'Add'</span> in top-right. Launch directly from your home screen.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Android / Chrome Guide */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>For Android (Chrome / Brave / Samsung Internet)</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-1">Method A</div>
                      <p className="text-[11px] leading-relaxed">
                        Look for the <span className="font-semibold text-slate-900 dark:text-white">"Install App"</span> banner at the bottom or URL bar.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-1">Method B</div>
                      <p className="text-[11px] leading-relaxed">
                        Tap the <span className="font-semibold text-slate-900 dark:text-white">three dots menu (⋮)</span> and select <span className="font-semibold text-slate-900 dark:text-white">'Install App'</span>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SESSIONS TAB */}
            {activeTab === 'sessions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Active log-ins across your devices</span>
                  <button
                    onClick={logoutAll}
                    className="text-xs font-medium text-rose-600 hover:underline"
                  >
                    Revoke all other devices
                  </button>
                </div>

                <div className="space-y-2">
                  {sessions.map((s) => (
                    <div
                      key={s._id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        <Laptop className="w-5 h-5 text-indigo-500" />
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-white flex items-center space-x-1.5">
                            <span>{s.os} · {s.browser}</span>
                            {s.isCurrent && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 rounded-full font-medium">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            IP: {s.ip} · Last Active: {new Date(s.lastActive).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      {!s.isCurrent && (
                        <button
                          onClick={() => handleRevokeSession(s._id)}
                          className="px-2.5 py-1 text-[11px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ACCOUNT & SECURITY TAB */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                {/* Change password */}
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Change Password
                  </h3>
                  <input
                    type="password"
                    required
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                  />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="New password (min 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                  />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm"
                  >
                    Update Password
                  </button>
                </form>

                {/* GDPR Export */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    GDPR Data Portability
                  </h3>
                  <p className="text-xs text-slate-400 mb-2">
                    Download a copy of your personal data, settings, and profile info in machine-readable JSON format.
                  </p>
                  <button
                    onClick={handleExportData}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Personal Data</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
