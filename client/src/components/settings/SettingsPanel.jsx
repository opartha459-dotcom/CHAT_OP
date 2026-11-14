
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Sliders,
  Camera,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  RotateCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme, THEME_PALETTES, TYPOGRAPHY_FONTS } from '../../context/ThemeContext';
import { useChat } from '../../context/ChatContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Avatar } from '../common/Avatar';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';

const PRESET_AVATARS = [
  { id: 'neon-1', name: 'Cyber Neon', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80' },
  { id: 'tech-2', name: 'Tech Minimalist', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80' },
  { id: 'glow-3', name: 'Futuristic Glow', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80' },
  { id: 'gamer-4', name: 'Emerald Gamer', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80' },
  { id: 'cyber-5', name: 'Purple Cyberpunk', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80' },
  { id: 'matrix-6', name: 'Data Matrix', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80' },
  { id: 'nomad-7', name: 'Digital Nomad', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=250&q=80' },
  { id: 'pulse-8', name: 'Cosmic Pulse', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=250&q=80' }
];

export const SettingsPanel = ({
  isModal = false,
  onClose = () => { },
  showNavigation = true,
  activeTab: controlledActiveTab,
  setActiveTab: controlledSetActiveTab
}) => {
  const navigate = useNavigate();
  const { user, token, updateUser, logout, logoutAll } = useAuth();
  const {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    isCustomTheme,
    resetToAdminDefault,
    activeTheme,
    adminTheme
  } = useTheme();
  const { conversations } = useChat();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const { featureFlags, isFeatureEnabled } = useFeatureFlags();
  const canUploadCustomAvatar = isFeatureEnabled
    ? isFeatureEnabled('customAvatarUpload')
    : featureFlags?.customAvatarUpload !== false;

  // Avatar upload / crop state
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarObjectUrl, setAvatarObjectUrl] = useState(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropScale, setCropScale] = useState(1);
  const [cropRotation, setCropRotation] = useState(0);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropDragging, setCropDragging] = useState(false);
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 300, height: 300 });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const cropImgRef = useRef(null);
  const cropBoxRef = useRef(null);
  const dragStartRef = useRef(null);
  const pinchStartDistRef = useRef(null);
  const pinchStartScaleRef = useRef(1);
  const fileInputRef = useRef(null);

  const [internalActiveTab, setInternalActiveTab] = useState('appearance');
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;
  const setActiveTab = controlledSetActiveTab !== undefined ? controlledSetActiveTab : setInternalActiveTab;

  const [nickname, setNickname] = useState(user?.nickname || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');

  // User's custom uploaded avatars history (persisted in DB + local cache)
  const [uploadedAvatars, setUploadedAvatars] = useState(() => {
    try {
      const local = JSON.parse(localStorage.getItem(`pulse_uploads_${user?._id}`) || '[]');
      const combined = [...(user?.uploadedAvatars || []), ...local];
      return Array.from(new Set(combined.filter(Boolean)));
    } catch {
      return user?.uploadedAvatars || [];
    }
  });

  useEffect(() => {
    if (user?.uploadedAvatars?.length) {
      setUploadedAvatars((prev) => Array.from(new Set([...user.uploadedAvatars, ...prev])));
    }
  }, [user?.uploadedAvatars]);

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

  // Cleanup object URLs on unmount or when avatarObjectUrl changes
  useEffect(() => {
    return () => {
      if (avatarObjectUrl) URL.revokeObjectURL(avatarObjectUrl);
    };
  }, [avatarObjectUrl]);

  // Base cover dimensions: scale natural dimensions so image completely covers the 260px circular box
  const { baseWidth, baseHeight } = useMemo(() => {
    const w = imageNaturalSize.width || 300;
    const h = imageNaturalSize.height || 300;
    const coverScale = Math.max(260 / w, 260 / h);
    return {
      baseWidth: Math.round(w * coverScale),
      baseHeight: Math.round(h * coverScale)
    };
  }, [imageNaturalSize]);

  const openCropModal = (file) => {
    if (avatarObjectUrl) URL.revokeObjectURL(avatarObjectUrl);
    const url = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarObjectUrl(url);
    setCropScale(1);
    setCropRotation(0);
    setCropOffset({ x: 0, y: 0 });
    setCropDragging(false);

    // Pre-measure the image natural dimensions for pixel-perfect aspect ratio & cover sizing
    const probe = new Image();
    probe.onload = () => {
      setImageNaturalSize({
        width: probe.naturalWidth || 300,
        height: probe.naturalHeight || 300
      });
      setCropModalOpen(true);
    };
    probe.onerror = () => {
      setImageNaturalSize({ width: 300, height: 300 });
      setCropModalOpen(true);
    };
    probe.src = url;
  };

  const openCropModalFromUrl = async (url) => {
    if (!url) return;
    try {
      setAvatarUploading(true);
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' });
      openCropModal(file);
    } catch (e) {
      if (avatarObjectUrl && avatarObjectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(avatarObjectUrl);
      }
      setAvatarFile(null);
      setAvatarObjectUrl(url);
      setCropScale(1);
      setCropRotation(0);
      setCropOffset({ x: 0, y: 0 });
      setCropDragging(false);

      const probe = new Image();
      probe.crossOrigin = 'anonymous';
      probe.onload = () => {
        setImageNaturalSize({
          width: probe.naturalWidth || 300,
          height: probe.naturalHeight || 300
        });
        setCropModalOpen(true);
      };
      probe.onerror = () => {
        setImageNaturalSize({ width: 300, height: 300 });
        setCropModalOpen(true);
      };
      probe.src = url;
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    openCropModal(file);
    // reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleCropMouseDown = (e) => {
    e.preventDefault();
    setCropDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      offsetX: cropOffset.x,
      offsetY: cropOffset.y
    };
  };

  const handleCropTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Two fingers: Pinch-to-zoom
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      pinchStartScaleRef.current = cropScale;
      setCropDragging(true);
    } else if (e.touches.length === 1) {
      // Single finger: Pan
      const touch = e.touches[0];
      setCropDragging(true);
      dragStartRef.current = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        offsetX: cropOffset.x,
        offsetY: cropOffset.y
      };
    }
  };

  const handleCropWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setCropScale((s) => Math.min(3.5, Math.max(1, +(s + delta).toFixed(2))));
  };

  // Window pointer move and up listeners for silky-smooth dragging across the viewport
  useEffect(() => {
    if (!cropDragging) return;

    const handlePointerMove = (e) => {
      if (e.touches && e.touches.length === 2 && pinchStartDistRef.current) {
        // Pinch zoom
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = currentDist / pinchStartDistRef.current;
        const newScale = Math.min(3.5, Math.max(1, +(pinchStartScaleRef.current * factor).toFixed(2)));
        setCropScale(newScale);
        return;
      }

      if (!dragStartRef.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - dragStartRef.current.clientX;
      const dy = clientY - dragStartRef.current.clientY;
      setCropOffset({
        x: dragStartRef.current.offsetX + dx,
        y: dragStartRef.current.offsetY + dy
      });
    };

    const handlePointerUp = () => {
      setCropDragging(false);
      dragStartRef.current = null;
      pinchStartDistRef.current = null;
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [cropDragging]);

  const handleApplyCrop = () => {
    const imgEl = cropImgRef.current;
    if (!imgEl) return;

    const OUTPUT_SIZE = 400; // 400x400 high-res circle avatar
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');

    // 1. Clip canvas to smooth circular mask
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // 2. High quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 3. Exact scale factor from 260px display circle to 400px output canvas
    const displayToCanvasRatio = OUTPUT_SIZE / 260; // 400 / 260 ≈ 1.53846

    // Image center on the output canvas
    const imgCenterX = (OUTPUT_SIZE / 2) + (cropOffset.x * displayToCanvasRatio);
    const imgCenterY = (OUTPUT_SIZE / 2) + (cropOffset.y * displayToCanvasRatio);

    // Image dimensions on the output canvas
    const drawW = baseWidth * cropScale * displayToCanvasRatio;
    const drawH = baseHeight * cropScale * displayToCanvasRatio;

    // 4. Translate, rotate around image center, and draw
    ctx.save();
    ctx.translate(imgCenterX, imgCenterY);
    if (cropRotation) {
      ctx.rotate((cropRotation * Math.PI) / 180);
    }
    ctx.drawImage(imgEl, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setAvatarUploading(true);
      setCropModalOpen(false);
      try {
        const formData = new FormData();
        formData.append('file', blob, 'avatar.jpg');
        const res = await fetch('/api/users/upload', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
          body: formData
        });
        const data = await res.json();
        const newUrl = data.fileUrl || data.url;
        if (data.success && newUrl) {
          setAvatar(newUrl);

          const nextUploads = Array.from(new Set([newUrl, ...uploadedAvatars]));
          setUploadedAvatars(nextUploads);
          try {
            localStorage.setItem(`pulse_uploads_${user?._id}`, JSON.stringify(nextUploads));
          } catch {}

          // IMMEDIATELY update user profile in DB & AuthContext!
          try {
            const profileRes = await fetch('/api/users/profile', {
              method: 'PUT',
              headers: authHeaders(),
              credentials: 'include',
              body: JSON.stringify({
                nickname: nickname || user?.nickname || '',
                bio: bio || user?.bio || '',
                avatar: newUrl,
                uploadedAvatars: nextUploads
              })
            });
            const profileData = await profileRes.json();
            if (profileData.success && profileData.user) {
              updateUser(profileData.user);
            }
          } catch (profileErr) {
            console.warn('[Auto-save profile error]:', profileErr);
          }

          showFeedback('Profile photo cropped & updated successfully!');
        } else {
          showFeedback(data.message || 'Upload failed', 'error');
        }
      } catch (err) {
        showFeedback('Network error uploading avatar', 'error');
      } finally {
        setAvatarUploading(false);
      }
    }, 'image/jpeg', 0.92);
  };

  const handleDeleteUploadedAvatar = async (url) => {
    const nextList = uploadedAvatars.filter((u) => u !== url);
    setUploadedAvatars(nextList);
    try {
      localStorage.setItem(`pulse_uploads_${user?._id}`, JSON.stringify(nextList));
    } catch {}

    // If currently selected avatar is deleted, fall back
    if (avatar === url) {
      const fallback = nextList[0] || '';
      setAvatar(fallback);
    }

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          nickname,
          bio,
          avatar: avatar === url ? (nextList[0] || '') : avatar,
          uploadedAvatars: nextList
        })
      });
      const data = await res.json();
      if (data.success && data.user) {
        updateUser(data.user);
        showFeedback('Removed photo from your uploads.');
      }
    } catch (err) {
      showFeedback('Removed photo locally.');
    }
  };

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
    if (avatarUploading) {
      showFeedback('Please wait for photo upload to complete...', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ nickname, bio, avatar, uploadedAvatars })
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
                    <h3 className="text-lg font-bold text-white mt-1">Appearance & Typography</h3>
                    <p className="text-xs text-slate-400 mt-1">Customize your colors and typography or keep synced with admin defaults.</p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-violet-500/15 border border-violet-400/20 flex items-center justify-center">
                    <Palette className="w-5 h-5 text-violet-300" />
                  </div>
                </div>

                {/* Theme Status & Sync Banner */}
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 ${
                  isCustomTheme
                    ? 'border-indigo-500/40 bg-indigo-950/20'
                    : 'border-emerald-500/30 bg-emerald-950/15'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isCustomTheme ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {isCustomTheme ? <Sparkles className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white">
                          {isCustomTheme ? 'Personal Custom Theme Active' : 'Synced with Admin Default Theme'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          isCustomTheme ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {isCustomTheme ? 'Customized' : 'Auto-Sync'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isCustomTheme
                          ? 'Your custom theme overrides the system default. Reset anytime to follow admin updates.'
                          : 'You are automatically using the latest admin-configured theme and typography.'}
                      </p>
                    </div>
                  </div>

                  {isCustomTheme && (
                    <button
                      type="button"
                      onClick={async () => {
                        await resetToAdminDefault();
                        showFeedback('Restored admin default theme.');
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-900 text-slate-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset to Admin Default</span>
                    </button>
                  )}
                </div>

                {/* Color theme mode */}
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
                          className={`min-w-0 rounded-xl border px-2 py-3 flex flex-col items-center gap-2 text-xs font-semibold transition cursor-pointer ${selected
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

                {/* Accent Color Section with Presets and Custom Color Picker */}
                <section className="rounded-2xl border border-slate-800 bg-[#090F1C]/70 p-4 sm:p-5 mt-3">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-white">Accent color</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Choose the highlight color used across buttons and active controls.</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{accentColor || 'indigo'}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {Object.values(THEME_PALETTES).map((color) => {
                      const selected = accentColor === color.id;
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
                          style={{ backgroundColor: color.primary }}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${selected
                            ? 'ring-2 ring-white ring-offset-4 ring-offset-[#090F1C] scale-110'
                            : 'opacity-80 hover:opacity-100 hover:scale-110'
                            }`}
                        >
                          {selected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                        </button>
                      );
                    })}

                    {/* Custom Color Picker Button */}
                    <div className="flex items-center space-x-2 pl-3 border-l border-slate-800">
                      <label className="text-[11px] text-slate-400 font-semibold cursor-pointer">Custom:</label>
                      <input
                        type="color"
                        value={activeTheme?.primaryColor || '#6366f1'}
                        onChange={(e) => {
                          setAccentColor(e.target.value);
                          showFeedback('Custom color applied.');
                        }}
                        className="w-8 h-8 rounded-xl cursor-pointer bg-transparent border border-slate-700 p-0.5"
                        title="Pick custom color"
                      />
                    </div>
                  </div>
                </section>

                {/* Typography: Font Family Selection */}
                <section className="rounded-2xl border border-slate-800 bg-[#090F1C]/70 p-4 sm:p-5 mt-3">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white">Font Family</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Choose your preferred reading typeface.</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{fontFamily || 'Inter'}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {TYPOGRAPHY_FONTS.map((font) => {
                      const isSel = (fontFamily || 'Inter') === font.id;
                      return (
                        <button
                          key={font.id}
                          type="button"
                          onClick={() => {
                            setFontFamily(font.id);
                            showFeedback(`Font set to ${font.name.split(' ')[0]}.`);
                          }}
                          style={{ fontFamily: font.family }}
                          className={`p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer text-center truncate ${
                            isSel
                              ? 'border-violet-400 bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/30'
                              : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-600 hover:text-white'
                          }`}
                        >
                          {font.id}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Message font size */}
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
                          className={`rounded-xl border px-2 py-3 transition cursor-pointer ${selected
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
                    <p className={`${fontSize === 'small' ? 'text-xs' : fontSize === 'large' ? 'text-lg' : 'text-sm'} text-slate-200`} style={{ fontFamily: activeTheme?.fontFamily ? `'${activeTheme.fontFamily}', sans-serif` : 'inherit' }}>
                      The quick brown fox jumps over the lazy dog. 🚀
                    </p>
                  </div>
                </section>

                <div className="mt-4 flex items-start gap-2 text-[11px] text-slate-500">
                  <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <p>
                    Personal theme choices persist across all devices. If you reset, you automatically receive admin updates.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Avatar section */}
              <div className="flex items-start space-x-4">
                <div className="relative flex-shrink-0">
                  <Avatar src={avatar} name={nickname || user?.username} size="lg" />
                  {avatarUploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                      <svg className="animate-spin w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  {featureFlags?.customAvatarUpload === false ? (
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                      <span>Custom photo uploads are currently disabled by the administrator. Choose from the curated avatar logos below.</span>
                    </div>
                  ) : (
                    <>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Profile Photo
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={avatarUploading}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl transition cursor-pointer shadow-sm active:scale-98"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Upload &amp; Crop Photo</span>
                        </button>
                        {avatar && (
                          <button
                            type="button"
                            onClick={() => openCropModalFromUrl(avatar)}
                            disabled={avatarUploading}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer shadow-sm"
                            title="Re-adjust crop, zoom, and orientation of current photo"
                          >
                            <Sliders className="w-3.5 h-3.5 text-purple-400" />
                            <span>Adjust / Crop Photo</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {/* User Uploaded Photos Gallery (Show uploaded custom photos as options) */}
                  {uploadedAvatars.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                          <span>Your Uploaded Photos ({uploadedAvatars.length})</span>
                        </label>
                        <span className="text-[10px] text-purple-400 font-medium">Click to select</span>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                        {uploadedAvatars.map((url, idx) => {
                          const isSelected = avatar === url;
                          return (
                            <div key={`${url}-${idx}`} className="relative group aspect-square">
                              <button
                                type="button"
                                onClick={() => {
                                  setAvatar(url);
                                  showFeedback('Selected your uploaded photo.');
                                }}
                                className={`w-full h-full rounded-xl overflow-hidden border-2 transition cursor-pointer relative ${
                                  isSelected
                                    ? 'border-purple-500 ring-2 ring-purple-500/40 scale-105 shadow-md shadow-purple-500/30'
                                    : 'border-slate-800 hover:border-slate-600 opacity-85 hover:opacity-100 hover:scale-105'
                                }`}
                                title="Use this photo"
                              >
                                <img src={url} alt="Uploaded avatar" className="w-full h-full object-cover" />
                                {isSelected && (
                                  <div className="absolute inset-0 bg-purple-600/40 flex items-center justify-center">
                                    <Check className="w-4 h-4 text-white stroke-[3]" />
                                  </div>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteUploadedAvatar(url);
                                }}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-sm z-10 cursor-pointer"
                                title="Remove photo"
                              >
                                <X className="w-3 h-3 stroke-[3]" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Free Preset Avatars Gallery */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Choose an Avatar Logo
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {PRESET_AVATARS.map((preset) => {
                        const isSelected = avatar === preset.url;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setAvatar(preset.url);
                              showFeedback(`Selected ${preset.name} avatar.`);
                            }}
                            className={`relative rounded-xl overflow-hidden aspect-square border-2 transition cursor-pointer group ${
                              isSelected
                                ? 'border-purple-500 ring-2 ring-purple-500/40 scale-105'
                                : 'border-slate-800 hover:border-slate-600 opacity-80 hover:opacity-100 hover:scale-105'
                            }`}
                            title={preset.name}
                          >
                            <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                            {isSelected && (
                              <div className="absolute inset-0 bg-purple-600/40 flex items-center justify-center">
                                <Check className="w-4 h-4 text-white stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Secondary Direct URL input (only if custom uploads enabled) */}
                  {featureFlags?.customAvatarUpload !== false && (
                    <div className="pt-2">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Or custom Image URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://example.com/avatar.png"
                        value={avatar}
                        onChange={(e) => setAvatar(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-[#0E1422] border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Crop & Adjust Modal Dialog */}
              {cropModalOpen && avatarObjectUrl && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
                  onClick={() => setCropModalOpen(false)}
                >
                  <div
                    className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl border border-purple-500/40 bg-[#0B0F19] p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 scrollbar-thin scrollbar-thumb-purple-900/50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Camera className="w-5 h-5 text-purple-400" />
                        <span className="text-sm font-bold text-white uppercase tracking-wider">Crop &amp; Adjust Photo</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCropModalOpen(false)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                        title="Close"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Circular Crop Box Viewport */}
                    <div className="flex flex-col items-center justify-center py-2">
                      <div
                        ref={cropBoxRef}
                        className="relative overflow-hidden rounded-full border-2 border-purple-500/60 bg-slate-950 cursor-grab active:cursor-grabbing select-none shadow-xl touch-none"
                        style={{ width: 260, height: 260 }}
                        onMouseDown={handleCropMouseDown}
                        onTouchStart={handleCropTouchStart}
                        onWheel={handleCropWheel}
                      >
                        <img
                          ref={cropImgRef}
                          src={avatarObjectUrl}
                          alt="Crop preview"
                          draggable={false}
                          style={{
                            position: 'absolute',
                            width: `${Math.round(baseWidth * cropScale)}px`,
                            height: `${Math.round(baseHeight * cropScale)}px`,
                            maxWidth: 'none',
                            maxHeight: 'none',
                            left: '50%',
                            top: '50%',
                            transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px)) rotate(${cropRotation}deg)`,
                            userSelect: 'none',
                            pointerEvents: 'none',
                            transition: cropDragging ? 'none' : 'transform 0.05s ease-out'
                          }}
                        />

                        {/* Rule-of-thirds grid */}
                        <div className="absolute inset-0 pointer-events-none opacity-20">
                          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white" />
                          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white" />
                          <div className="absolute top-1/3 left-0 right-0 h-px bg-white" />
                          <div className="absolute top-2/3 left-0 right-0 h-px bg-white" />
                        </div>

                        {/* Center crosshair */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
                          <div className="w-4 h-px bg-white" />
                          <div className="h-4 w-px bg-white absolute" />
                        </div>

                        {/* Border ring */}
                        <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
                      </div>

                      <p className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Sliders className="w-3 h-3 text-purple-400" />
                        <span>Drag photo to pan &bull; use controls below to scale &amp; rotate</span>
                      </p>
                    </div>

                    {/* Zoom Controls */}
                    <div className="space-y-1.5 bg-[#0E1422] p-3 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span className="font-medium flex items-center gap-1.5">
                          <ZoomIn className="w-3.5 h-3.5 text-purple-400" /> Zoom Scale
                        </span>
                        <span className="font-mono text-purple-400 font-semibold">{cropScale.toFixed(2)}&times;</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setCropScale((s) => Math.max(1, +(s - 0.2).toFixed(2)))}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          title="Zoom out"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <input
                          type="range"
                          min="1"
                          max="3.5"
                          step="0.05"
                          value={cropScale}
                          onChange={(e) => setCropScale(parseFloat(e.target.value))}
                          className="flex-1 accent-purple-500 cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => setCropScale((s) => Math.min(3.5, +(s + 0.2).toFixed(2)))}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          title="Zoom in"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCropRotation((r) => (r + 90) % 360)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
                        >
                          <RotateCw className="w-3.5 h-3.5 text-purple-400" />
                          <span>Rotate 90&deg;</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCropOffset({ x: 0, y: 0 });
                            setCropScale(1);
                            setCropRotation(0);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 rounded-xl transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset</span>
                        </button>
                      </div>
                      {cropRotation !== 0 && (
                        <span className="text-[11px] text-purple-400 font-mono">{cropRotation}&deg;</span>
                      )}
                    </div>

                    {/* Modal Action Buttons */}
                    <div className="flex gap-2.5 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setCropModalOpen(false)}
                        className="flex-1 px-4 py-2.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyCrop}
                        disabled={avatarUploading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl transition shadow-lg shadow-purple-600/30 cursor-pointer"
                      >
                        {avatarUploading ? (
                          <>
                            <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Apply &amp; Save Photo</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

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
                  disabled={loading || avatarUploading}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 rounded-2xl shadow-md transition cursor-pointer flex items-center gap-2"
                >
                  {avatarUploading ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      <span>Uploading photo...</span>
                    </>
                  ) : loading ? (
                    <span>Saving...</span>
                  ) : (
                    <span>Save Profile Changes</span>
                  )}
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
