import React, { useState, useEffect } from 'react';
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
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Avatar } from '../common/Avatar';

export const SettingsPanel = ({
  isModal = false,
  onClose = () => {},
  showNavigation = true,
  activeTab: controlledActiveTab,
  setActiveTab: controlledSetActiveTab
}) => {
  const navigate = useNavigate();
  const { user, token, updateUser, logout, logoutAll } = useAuth();
  const { theme, setTheme, accentColor, setAccentColor, fontSize, setFontSize } = useTheme();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  // Active tab defaults to 'appearance' to match screenshot
  const [internalActiveTab, setInternalActiveTab] = useState('appearance');
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;
  const setActiveTab = controlledSetActiveTab !== undefined ? controlledSetActiveTab : setInternalActiveTab;

  // Profile states
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

  // Account deletion states
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  // Revoke single session
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

  // Revoke all other devices
  const handleRevokeAllOtherDevices = async () => {
    if (!window.confirm('Are you sure you want to revoke all other devices?')) return;
    try {
      await logoutAll();
      showFeedback('All other sessions revoked.');
    } catch (err) {
      showFeedback('Error revoking sessions', 'error');
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

  // Delete account request
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
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
        body: JSON.stringify({ password: deletePassword })
      });
      const data = await res.json();
      if (data.success) {
        setShowDeletePrompt(false);
        setDeletePassword('');
        showFeedback('Deletion confirmation link sent to your email.');
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
    <div className={`flex flex-col ${showNavigation ? 'md:flex-row' : ''} w-full h-full bg-[#0B0F19] text-slate-100 overflow-hidden ${
      isModal ? 'max-h-[85vh]' : ''
    }`}>
      {/* ======================================================== */}
      {/* LEFT NAVIGATION COLUMN (Exact Match to Screenshot)       */}
      {/* ======================================================== */}
      {showNavigation && (
        <div className="w-full md:w-60 bg-[#080C14] p-4 border-b md:border-b-0 md:border-r border-slate-800/80 flex flex-col justify-between flex-shrink-0">
        <div>
          {/* User Profile Card */}
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

          {/* Navigation Items */}
          <nav className="flex md:flex-col overflow-x-auto no-scrollbar space-x-1 md:space-x-0 md:space-y-1.5 py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition flex-shrink-0 cursor-pointer ${
                    isActive
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

        {/* Bottom Actions: Admin Dashboard & Sign Out */}
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

      {/* ======================================================== */}
      {/* RIGHT CONTENT COLUMN                                     */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0B0F19]">
        {/* Top Header */}
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

        {/* Feedback message banner */}
        {statusMsg.text && (
          <div
            className={`mx-6 mt-3 p-2.5 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in ${
              statusMsg.type === 'error'
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {statusMsg.type === 'error' ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <Check className="w-4 h-4 flex-shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Tab Content Panes */}
        <div className={`flex-1 overflow-y-auto px-6 py-5 space-y-6 no-scrollbar ${!showNavigation ? 'max-w-3xl mx-auto w-full' : ''}`}>
          {/* ======================================================== */}
          {/* TAB 1: APPEARANCE & SOUND (MATCHING USER SCREENSHOT)     */}
          {/* ======================================================== */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* COLOR THEME */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  COLOR THEME
                </label>
                <div className="grid grid-cols-3 gap-3 max-w-md">
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
                          showFeedback(`Theme set to ${t.label}!`);
                        }}
                        className={`py-3 px-3 sm:px-4 min-w-0 rounded-2xl border text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer ${
                          isSelected
                            ? 'border-2 border-[#7C3AED] bg-[#14132B] text-purple-200 ring-1 ring-[#7C3AED]/50 shadow-lg shadow-purple-950/50'
                            : 'border-slate-800/90 bg-[#0E1422] text-slate-400 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ACCENT COLOR */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  ACCENT COLOR
                </label>
                <div className="flex items-center space-x-4 flex-wrap gap-y-2">
                  {[
                    { id: 'indigo', class: 'bg-[#4F46E5]', name: 'Indigo' },
                    { id: 'emerald', class: 'bg-[#059669]', name: 'Emerald' },
                    { id: 'violet', class: 'bg-[#8B5CF6]', name: 'Purple' },
                    { id: 'rose', class: 'bg-[#E11D48]', name: 'Crimson' },
                    { id: 'cyan', class: 'bg-[#0891B2]', name: 'Cyan' },
                    { id: 'amber', class: 'bg-[#D97706]', name: 'Orange' }
                  ].map((col) => {
                    const isSelected = accentColor === col.id || (accentColor === 'purple' && col.id === 'violet');
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => {
                          setAccentColor(col.id);
                          showFeedback(`Accent color set to ${col.name}!`);
                        }}
                        className={`w-9 h-9 flex-shrink-0 rounded-full ${col.class} transition-all flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-slate-300 ring-offset-4 ring-offset-[#0B0F19] scale-110 shadow-lg'
                            : 'hover:scale-105 opacity-80 hover:opacity-100'
                        }`}
                        title={col.name}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MESSAGE FONT SIZE */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  MESSAGE FONT SIZE
                </label>
                <div className="grid grid-cols-3 gap-3 max-w-md">
                  {[
                    { id: 'small', label: 'Small' },
                    { id: 'medium', label: 'Medium' },
                    { id: 'large', label: 'Large' }
                  ].map((fs) => {
                    const isSelected = (fontSize || 'medium') === fs.id;
                    return (
                      <button
                        key={fs.id}
                        type="button"
                        onClick={() => {
                          setFontSize(fs.id);
                          showFeedback(`Font size set to ${fs.label}!`);
                        }}
                        className={`py-3 px-3 sm:px-4 min-w-0 rounded-2xl border text-xs font-semibold capitalize transition cursor-pointer ${
                          isSelected
                            ? 'border-2 border-[#7C3AED] bg-[#14132B] text-purple-200 ring-1 ring-[#7C3AED]/50 shadow-lg shadow-purple-950/50'
                            : 'border-slate-800/90 bg-[#0E1422] text-slate-400 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        <span className="truncate">{fs.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: PROFILE                                           */}
          {/* ======================================================== */}
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

          {/* ======================================================== */}
          {/* TAB 3: PRIVACY & SAFETY                                  */}
          {/* ======================================================== */}
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

                <button
                  onClick={handleSavePrivacy}
                  disabled={loading}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 rounded-2xl shadow-md transition cursor-pointer"
                >
                  Save Privacy Preferences
                </button>
              </div>

              {/* Blocked Users */}
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

          {/* ======================================================== */}
          {/* TAB 4: INSTALL ON PHONE                                  */}
          {/* ======================================================== */}
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

              {/* iOS / Safari Guide */}
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

              {/* Android / Chrome Guide */}
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

          {/* ======================================================== */}
          {/* TAB 5: DEVICES & SESSIONS                                */}
          {/* ======================================================== */}
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

          {/* ======================================================== */}
          {/* TAB 6: ACCOUNT & SECURITY                                */}
          {/* ======================================================== */}
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

              {/* GDPR Export */}
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

              {/* Danger Zone: Delete Account */}
              <div className="pt-4 border-t border-slate-800">
                <h4 className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-2">
                  Danger Zone
                </h4>
                {!showDeletePrompt ? (
                  <button
                    type="button"
                    onClick={() => setShowDeletePrompt(true)}
                    className="px-4 py-2 text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-2xl transition cursor-pointer"
                  >
                    Delete Account
                  </button>
                ) : (
                  <form onSubmit={handleDeleteAccount} className="space-y-2.5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl">
                    <p className="text-xs text-rose-300">
                      Enter your password to request account deletion.
                    </p>
                    <input
                      type="password"
                      placeholder="Password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#080C14] border border-rose-500/40 rounded-xl text-white outline-none focus:ring-1 focus:ring-rose-500"
                    />
                    {deleteError && <p className="text-xs text-rose-400">{deleteError}</p>}
                    <div className="flex space-x-2 pt-1">
                      <button
                        type="submit"
                        disabled={deleteLoading}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer transition"
                      >
                        Confirm Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeletePrompt(false)}
                        className="px-4 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs cursor-pointer transition hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
