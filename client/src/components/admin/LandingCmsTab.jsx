import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Lock,
  Zap,
  Users,
  Video,
  ShieldCheck,
  Smartphone,
  MessageSquare,
  BarChart3,
  CheckCircle2,
  Trash2,
  Plus,
  RefreshCw,
  ExternalLink,
  Eye,
  X,
  Sliders,
  Type,
  Link as LinkIcon,
  Check,
  AlertCircle,
  Crop,
  Palette,
  Wand2,
  Monitor
} from 'lucide-react';
import { ImageCropModal } from '../common/ImageCropModal';

export const GRADIENT_PRESETS = [
  {
    id: 'indigo-purple',
    label: 'Electric Indigo',
    from: '#6366f1',
    via: '#a855f7',
    to: '#020617',
    cssGradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #020617 100%)'
  },
  {
    id: 'midnight-cyan',
    label: 'Midnight Cyan',
    from: '#06b6d4',
    via: '#3b82f6',
    to: '#020617',
    cssGradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #020617 100%)'
  },
  {
    id: 'emerald-teal',
    label: 'Neon Emerald',
    from: '#10b981',
    via: '#14b8a6',
    to: '#020617',
    cssGradient: 'linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #020617 100%)'
  },
  {
    id: 'sunset-rose',
    label: 'Sunset Flame',
    from: '#f43f5e',
    via: '#f59e0b',
    to: '#020617',
    cssGradient: 'linear-gradient(135deg, #f43f5e 0%, #f59e0b 50%, #020617 100%)'
  },
  {
    id: 'fuchsia-pink',
    label: 'Cyberpunk Violet',
    from: '#d946ef',
    via: '#ec4899',
    to: '#020617',
    cssGradient: 'linear-gradient(135deg, #d946ef 0%, #ec4899 50%, #020617 100%)'
  },
  {
    id: 'dark-slate',
    label: 'Dark Minimalist',
    from: '#334155',
    via: '#1e293b',
    to: '#020617',
    cssGradient: 'linear-gradient(135deg, #334155 0%, #1e293b 50%, #020617 100%)'
  },
  {
    id: 'aurora-glow',
    label: 'Nordic Aurora',
    from: '#34d399',
    via: '#818cf8',
    to: '#c084fc',
    cssGradient: 'linear-gradient(135deg, #34d399 0%, #818cf8 50%, #c084fc 100%)'
  },
  {
    id: 'custom',
    label: 'Custom Colors',
    from: '#6366f1',
    via: '#a855f7',
    to: '#020617',
    cssGradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #020617 100%)'
  }
];

export const BLEND_DIRECTIONS = [
  {
    id: 'bottom-fade',
    label: 'Bottom Melt (Linear)',
    description: 'Smoothly dissolves screenshot bottom into dark page background'
  },
  {
    id: 'radial-glow',
    label: 'Ambient Backlight Aura',
    description: 'Surrounds image with dynamic multi-colored ambient aura and depth'
  },
  {
    id: 'vignette',
    label: 'Soft Border Vignette',
    description: 'Gently blends all 4 borders into the dark background'
  },
  {
    id: 'duotone-overlay',
    label: 'Color Blend Overlay',
    description: 'Tints screenshot using the chosen gradient and blend mode'
  },
  {
    id: 'framed-glow',
    label: 'App Window & Halo',
    description: 'Browser window frame with frosted glass header and gradient edge glow'
  },
  {
    id: 'none',
    label: 'Crisp Original',
    description: 'No gradient blend overlay, crisp original borders'
  }
];

export const BLEND_MODES = [
  { id: 'normal', label: 'Normal (Standard)' },
  { id: 'overlay', label: 'Overlay (Vibrant)' },
  { id: 'soft-light', label: 'Soft Light (Subtle)' },
  { id: 'screen', label: 'Screen (Luminous)' },
  { id: 'multiply', label: 'Multiply (Moody)' },
  { id: 'color-dodge', label: 'Color Dodge (High Glow)' }
];

export const getHeroGradientStyles = (hero = {}) => {
  const presetId = hero?.gradientPreset || 'indigo-purple';
  const customColors = hero?.gradientCustomColors || {
    from: '#6366f1',
    via: '#a855f7',
    to: '#020617'
  };

  let colors;
  let cssGradient;

  if (presetId === 'custom') {
    colors = [customColors.from || '#6366f1', customColors.via || '#a855f7', customColors.to || '#020617'];
    cssGradient = `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[2]} 100%)`;
  } else {
    const found = GRADIENT_PRESETS.find((p) => p.id === presetId) || GRADIENT_PRESETS[0];
    colors = [found.from, found.via, found.to];
    cssGradient = found.cssGradient;
  }

  const direction = hero?.gradientDirection || 'bottom-fade';
  const intensity = typeof hero?.blendIntensity === 'number' ? hero.blendIntensity : 75;
  const blendMode = hero?.blendMode || 'normal';

  return {
    presetId,
    colors,
    cssGradient,
    direction,
    intensity,
    blendMode
  };
};

export const HeroBlendedImage = ({ hero, isPreview = false }) => {
  if (!hero?.heroImage && !isPreview) return null;

  const { colors, cssGradient, direction, intensity, blendMode } = getHeroGradientStyles(hero);
  const imageSrc = hero?.heroImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
  const opacityRatio = intensity / 100;

  return (
    <div className="w-full relative group mx-auto">
      {/* Dynamic Ambient Glow Behind Container */}
      {direction !== 'none' && (
        <div
          className="absolute -inset-1.5 md:-inset-3 rounded-3xl blur-2xl md:blur-3xl transition duration-700 pointer-events-none"
          style={{
            background: cssGradient,
            opacity: Math.max(0.15, opacityRatio * 0.45)
          }}
        />
      )}

      {/* Main Frame Container */}
      <div className="relative rounded-2xl md:rounded-3xl overflow-hidden border border-slate-800/90 bg-slate-950 shadow-2xl">
        {/* Optional App Window Header */}
        {direction === 'framed-glow' && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <div className="text-[10px] font-mono text-slate-400 truncate px-2 py-0.5 rounded-md bg-slate-950/60 border border-slate-800">
              pulsechat.internal / dashboard
            </div>
            <div className="w-8" />
          </div>
        )}

        {/* Screenshot Image with Mask */}
        <div className="relative overflow-hidden">
          <img
            src={imageSrc}
            alt="PulseChat Platform Screenshot"
            style={{
              WebkitMaskImage:
                direction === 'bottom-fade'
                  ? `linear-gradient(to bottom, rgba(0,0,0,1) ${Math.max(15, 100 - (intensity * 0.75))}%, rgba(0,0,0,0) 100%)`
                  : undefined,
              maskImage:
                direction === 'bottom-fade'
                  ? `linear-gradient(to bottom, rgba(0,0,0,1) ${Math.max(15, 100 - (intensity * 0.75))}%, rgba(0,0,0,0) 100%)`
                  : undefined
            }}
            className="w-full h-auto max-h-[500px] object-cover block"
          />

          {/* Bottom Fade Gradient Overlay */}
          {direction === 'bottom-fade' && (
            <div
              className="absolute inset-x-0 bottom-0 pointer-events-none"
              style={{
                height: `${Math.max(35, intensity)}%`,
                background: `linear-gradient(to top, #020617 15%, ${colors[2]}40 60%, transparent 100%)`,
                opacity: Math.min(1, opacityRatio * 1.1)
              }}
            />
          )}

          {/* Vignette Overlay */}
          {direction === 'vignette' && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at center, transparent 35%, #020617 100%)`,
                opacity: opacityRatio
              }}
            />
          )}

          {/* Duotone Color Blend Overlay */}
          {direction === 'duotone-overlay' && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: cssGradient,
                mixBlendMode: blendMode,
                opacity: opacityRatio * 0.65
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const AVAILABLE_ICONS = [
  { id: 'Lock', label: 'Lock (Security)', icon: Lock },
  { id: 'Zap', label: 'Lightning (Speed)', icon: Zap },
  { id: 'Users', label: 'Users (Groups)', icon: Users },
  { id: 'Video', label: 'Video (Calling)', icon: Video },
  { id: 'ShieldCheck', label: 'Shield (Privacy)', icon: ShieldCheck },
  { id: 'Smartphone', label: 'Mobile (PWA)', icon: Smartphone },
  { id: 'Globe', label: 'Globe (Network)', icon: Globe },
  { id: 'Sparkles', label: 'Sparkles (AI/Special)', icon: Sparkles },
  { id: 'MessageSquare', label: 'Chat (Messaging)', icon: MessageSquare },
  { id: 'BarChart3', label: 'Chart (Analytics)', icon: BarChart3 }
];

export const DEFAULT_LANDING_CONFIG = {
  brandName: 'PulseChat',
  brandTagline: 'AES-256 E2EE',
  brandLogo: '',
  announcementBadge: {
    enabled: true,
    text: 'Real-time Socket.IO messaging with client-side Web Crypto',
    link: ''
  },
  hero: {
    headline: 'Next-Generation Encrypted Real-Time Messaging.',
    subheadline:
      'Experience frictionless instant private chats, rich group collaboration, media sharing, and verifiable End-to-End Encryption with full data sovereignty.',
    heroImage: '',
    showHeroImage: true,
    primaryCtaText: 'Create Free Account',
    primaryCtaLink: '/register',
    secondaryCtaText: 'Launch Messenger',
    secondaryCtaLink: '/login',
    gradientPreset: 'indigo-purple',
    gradientDirection: 'bottom-fade',
    gradientCustomColors: {
      from: '#6366f1',
      via: '#a855f7',
      to: '#020617'
    },
    blendIntensity: 75,
    blendMode: 'normal'
  },
  features: [
    {
      title: 'End-to-End Encryption',
      description:
        'Messages are encrypted directly on client devices using Web Crypto AES-256-GCM. The database and backend never possess your plaintext.',
      icon: 'Lock',
      badge: 'E2EE',
      image: ''
    },
    {
      title: 'Zero-Latency Socket.IO',
      description:
        'Instant delivery receipts, live typing indicators, presence tracking, emoji reactions, and message editing without reloading.',
      icon: 'Zap',
      badge: 'Instant',
      image: ''
    },
    {
      title: 'Group Governance & Safety',
      description:
        'Granular group roles (Owners, Admins, Members), invite links, announcement channels, server-side user blocking, and moderation reports.',
      icon: 'Users',
      badge: 'Admin Control',
      image: ''
    },
    {
      title: 'HD Voice & Video Calls',
      description:
        'P2P WebRTC crystal clear audio & video calling with mid-call video conversion, mobile screen sharing, and active speaker detection.',
      icon: 'Video',
      badge: 'WebRTC P2P',
      image: ''
    }
  ],
  highlightPoints: [
    'Chat Transcript Export (HTML, JSON, TXT)',
    'GDPR Data Portability',
    'Multi-Session Device Management',
    'Peer-to-Peer Encrypted Voice & Video'
  ],
  stats: [
    { label: 'Uptime', value: '99.99%', description: 'High availability' },
    { label: 'Security', value: 'AES-256', description: 'Zero knowledge' },
    { label: 'Latency', value: '< 50ms', description: 'Socket streaming' }
  ],
  previewSection: {
    enabled: true,
    title: 'Engineered for speed, privacy, and modern teams.',
    description:
      'Crystal clear WebRTC voice & video calls, military-grade end-to-end encryption, and persistent multi-device synchronization.',
    imageUrl: ''
  },
  footer: {
    copyrightText: 'PulseChat © 2026. Built with React, Tailwind CSS, Express, Socket.IO & MongoDB.',
    links: [
      { label: 'Privacy Policy', url: '#' },
      { label: 'Terms of Service', url: '#' },
      { label: 'Security Whitepaper', url: '#' }
    ]
  }
};

/**
 * Reusable image uploader component with integrated Crop & Adjust modal,
 * direct URL input, and live preview.
 */
const ImageUploader = ({
  label,
  value,
  onChange,
  placeholder = 'https://...',
  token,
  aspectRatio = '16:9'
}) => {
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // When admin selects a file from disk, immediately open Crop & Adjust modal
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('File is too large. Maximum image size is 25 MB.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCropImageSrc(objectUrl);
    setCropModalOpen(true);
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition cursor-pointer"
              title="Clear Image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-600/20"
            title="Upload and crop image"
          >
            <Crop className="w-3.5 h-3.5" />
            <span>Upload &amp; Crop</span>
          </button>
        </div>
      </div>

      {value && (
        <div className="mt-2 flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800 w-full">
          <div className="flex items-center space-x-3 overflow-hidden mr-2">
            <img
              src={value}
              alt="Preview"
              className="w-16 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700 bg-black/20 shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
              <span className="font-semibold text-slate-700 dark:text-slate-200 block">Preview Loaded</span>
              {value}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setCropImageSrc(value);
              setCropModalOpen(true);
            }}
            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 cursor-pointer shrink-0"
            title="Adjust crop, zoom and orientation of this image"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Crop &amp; Adjust</span>
          </button>
        </div>
      )}

      {/* Image Crop & Adjust Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        imageSrc={cropImageSrc}
        initialAspectRatio={aspectRatio}
        token={token}
        title={label ? `Crop & Adjust: ${label}` : 'Crop & Adjust Image'}
        onCropComplete={(finalUrl) => {
          onChange(finalUrl);
          setCropModalOpen(false);
        }}
      />
    </div>
  );
};

export const LandingCmsTab = ({ authHeaders, showFeedback, token }) => {
  const [config, setConfig] = useState(DEFAULT_LANDING_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('hero'); // 'hero' | 'brand' | 'features' | 'preview' | 'stats' | 'highlights' | 'footer'
  const [newHighlight, setNewHighlight] = useState('');

  // Fetch current landing config
  const fetchLandingConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/landing', {
        headers: authHeaders(true),
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.landingPageConfig) {
          setConfig({
            ...DEFAULT_LANDING_CONFIG,
            ...data.landingPageConfig,
            hero: {
              ...DEFAULT_LANDING_CONFIG.hero,
              ...(data.landingPageConfig.hero || {}),
              gradientCustomColors: {
                ...DEFAULT_LANDING_CONFIG.hero.gradientCustomColors,
                ...(data.landingPageConfig.hero?.gradientCustomColors || {})
              }
            },
            announcementBadge: {
              ...DEFAULT_LANDING_CONFIG.announcementBadge,
              ...(data.landingPageConfig.announcementBadge || {})
            },
            previewSection: {
              ...DEFAULT_LANDING_CONFIG.previewSection,
              ...(data.landingPageConfig.previewSection || {})
            },
            footer: {
              ...DEFAULT_LANDING_CONFIG.footer,
              ...(data.landingPageConfig.footer || {})
            }
          });
        }
      }
    } catch (err) {
      console.error('Error fetching landing page config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLandingConfig();
  }, []);

  // Save changes to database
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/landing', {
        method: 'PUT',
        headers: authHeaders(true),
        credentials: 'include',
        body: JSON.stringify({ landingPageConfig: config })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (showFeedback) {
          showFeedback('Landing page updated successfully!');
        } else {
          alert('Landing page CMS saved successfully!');
        }
      } else {
        alert(data.message || 'Failed to save landing page changes.');
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Error saving landing page configuration.');
    } finally {
      setSaving(false);
    }
  };

  // Reset to default settings
  const handleReset = () => {
    if (window.confirm('Reset all landing page content to default settings?')) {
      setConfig(DEFAULT_LANDING_CONFIG);
    }
  };

  // Feature item helpers
  const handleAddFeature = () => {
    const newFeature = {
      title: 'New Feature',
      description: 'Enter a clear description of this key capability.',
      icon: 'Zap',
      badge: 'Feature',
      image: ''
    };
    setConfig((prev) => ({
      ...prev,
      features: [...(prev.features || []), newFeature]
    }));
  };

  const handleUpdateFeature = (index, field, val) => {
    setConfig((prev) => {
      const updated = [...(prev.features || [])];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, features: updated };
    });
  };

  const handleDeleteFeature = (index) => {
    setConfig((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  // Highlight points helpers
  const handleAddHighlight = () => {
    if (!newHighlight.trim()) return;
    setConfig((prev) => ({
      ...prev,
      highlightPoints: [...(prev.highlightPoints || []), newHighlight.trim()]
    }));
    setNewHighlight('');
  };

  const handleDeleteHighlight = (index) => {
    setConfig((prev) => ({
      ...prev,
      highlightPoints: prev.highlightPoints.filter((_, i) => i !== index)
    }));
  };

  // Stats helpers
  const handleAddStat = () => {
    const newStat = { label: 'Metric', value: '100%', description: 'Highlight text' };
    setConfig((prev) => ({
      ...prev,
      stats: [...(prev.stats || []), newStat]
    }));
  };

  const handleUpdateStat = (index, field, val) => {
    setConfig((prev) => {
      const updated = [...(prev.stats || [])];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, stats: updated };
    });
  };

  const handleDeleteStat = (index) => {
    setConfig((prev) => ({
      ...prev,
      stats: prev.stats.filter((_, i) => i !== index)
    }));
  };

  // Footer links helpers
  const handleAddFooterLink = () => {
    setConfig((prev) => ({
      ...prev,
      footer: {
        ...prev.footer,
        links: [...(prev.footer?.links || []), { label: 'New Link', url: '#' }]
      }
    }));
  };

  const handleUpdateFooterLink = (index, field, val) => {
    setConfig((prev) => {
      const updatedLinks = [...(prev.footer?.links || [])];
      updatedLinks[index] = { ...updatedLinks[index], [field]: val };
      return {
        ...prev,
        footer: {
          ...prev.footer,
          links: updatedLinks
        }
      };
    });
  };

  const handleDeleteFooterLink = (index) => {
    setConfig((prev) => ({
      ...prev,
      footer: {
        ...prev.footer,
        links: (prev.footer?.links || []).filter((_, i) => i !== index)
      }
    }));
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="text-xs font-semibold text-slate-400">Loading Landing Page CMS...</span>
      </div>
    );
  }

  const SECTIONS = [
    { id: 'hero', label: 'Hero Section', icon: Sparkles },
    { id: 'brand', label: 'Branding & Badge', icon: Globe },
    { id: 'features', label: 'Features Grid', icon: Layers },
    { id: 'preview', label: 'App Showcase', icon: ImageIcon },
    { id: 'stats', label: 'Stats & Metrics', icon: BarChart3 },
    { id: 'highlights', label: 'Trust Highlights', icon: CheckCircle2 },
    { id: 'footer', label: 'Footer & Legal', icon: LinkIcon }
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Landing Page CMS
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              Live Dynamic
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Customize headlines, imagery, interactive features, announcements, and trust badges on your public homepage.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
            title="Preview Live Landing Page"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">View Site</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl text-xs font-semibold transition cursor-pointer"
            title="Reset to Defaults"
          >
            Reset
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>{saving ? 'Publishing...' : 'Save & Publish'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200/80 dark:border-slate-800/80">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center space-x-2 transition cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: HERO SECTION */}
      {activeSection === 'hero' && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Hero Banner & Call to Action</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                The first headline, subheadline, and primary call-to-actions visitors see.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Main Headline
              </label>
              <input
                type="text"
                value={config.hero?.headline || ''}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, headline: e.target.value }
                  }))
                }
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Subheadline / Description
              </label>
              <textarea
                rows={3}
                value={config.hero?.subheadline || ''}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, subheadline: e.target.value }
                  }))
                }
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Button Text
                </label>
                <input
                  type="text"
                  value={config.hero?.primaryCtaText || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, primaryCtaText: e.target.value }
                    }))
                  }
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Button Link
                </label>
                <input
                  type="text"
                  value={config.hero?.primaryCtaLink || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, primaryCtaLink: e.target.value }
                    }))
                  }
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Secondary Button Text
                </label>
                <input
                  type="text"
                  value={config.hero?.secondaryCtaText || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, secondaryCtaText: e.target.value }
                    }))
                  }
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Secondary Button Link
                </label>
                <input
                  type="text"
                  value={config.hero?.secondaryCtaLink || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, secondaryCtaLink: e.target.value }
                    }))
                  }
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Hero Image */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Hero Banner / Screenshot Image</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Display an interactive mock or banner image in the hero section.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(config.hero?.showHeroImage)}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, showHeroImage: e.target.checked }
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600" />
                </label>
              </div>

              {config.hero?.showHeroImage && (
                <>
                  <ImageUploader
                    label="Upload Hero Image or enter Image URL"
                    value={config.hero?.heroImage}
                    token={token}
                    aspectRatio="16:9"
                    onChange={(url) =>
                      setConfig((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, heroImage: url }
                      }))
                    }
                  />

                  {/* ── Background Gradient & Image Blending Studio ── */}
                  <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                          <Palette className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                            <span>Background Gradient &amp; Image Blend Studio</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                              Hero Blend
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Choose ambient gradient colors and edge-blend modes to seamlessly merge your screenshot with the landing page.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            hero: {
                              ...prev.hero,
                              gradientPreset: 'indigo-purple',
                              gradientDirection: 'bottom-fade',
                              blendIntensity: 75,
                              blendMode: 'normal'
                            }
                          }))
                        }
                        className="text-[11px] font-medium text-slate-500 hover:text-indigo-500 transition cursor-pointer self-start sm:self-auto"
                      >
                        Reset Blend Defaults
                      </button>
                    </div>

                    {/* 1. Gradient Preset Swatches */}
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        1. Background Gradient Preset
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {GRADIENT_PRESETS.map((p) => {
                          const isSelected = (config.hero?.gradientPreset || 'indigo-purple') === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  hero: { ...prev.hero, gradientPreset: p.id }
                                }))
                              }
                              className={`p-2.5 rounded-xl border text-left transition flex items-center space-x-2.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                                  : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              <span
                                className="w-5 h-5 rounded-full shrink-0 shadow-inner border border-white/20"
                                style={{
                                  background:
                                    p.id === 'custom'
                                      ? `linear-gradient(135deg, ${config.hero?.gradientCustomColors?.from || '#6366f1'}, ${config.hero?.gradientCustomColors?.via || '#a855f7'}, ${config.hero?.gradientCustomColors?.to || '#020617'})`
                                      : p.cssGradient
                                }}
                              />
                              <div className="min-w-0 flex-1">
                                <span className={`text-[11px] font-bold block truncate ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                  {p.label}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom Color Pickers (if preset is 'custom') */}
                      {(config.hero?.gradientPreset === 'custom') && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 mt-2">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                            Custom Gradient Colors
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {['from', 'via', 'to'].map((key) => {
                              const currentColor = config.hero?.gradientCustomColors?.[key] || (key === 'from' ? '#6366f1' : key === 'via' ? '#a855f7' : '#020617');
                              return (
                                <div key={key} className="flex items-center space-x-2">
                                  <label className="text-[10px] font-mono uppercase text-slate-400 w-8">{key}:</label>
                                  <input
                                    type="color"
                                    value={currentColor}
                                    onChange={(e) =>
                                      setConfig((prev) => ({
                                        ...prev,
                                        hero: {
                                          ...prev.hero,
                                          gradientCustomColors: {
                                            ...(prev.hero?.gradientCustomColors || {}),
                                            [key]: e.target.value
                                          }
                                        }
                                      }))
                                    }
                                    className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent cursor-pointer p-0.5"
                                  />
                                  <input
                                    type="text"
                                    value={currentColor}
                                    onChange={(e) =>
                                      setConfig((prev) => ({
                                        ...prev,
                                        hero: {
                                          ...prev.hero,
                                          gradientCustomColors: {
                                            ...(prev.hero?.gradientCustomColors || {}),
                                            [key]: e.target.value
                                          }
                                        }
                                      }))
                                    }
                                    className="flex-1 px-2 py-1 text-[11px] font-mono rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 uppercase"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 2. Blend Direction / Style */}
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        2. Blend Style &amp; Edge Mask
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {BLEND_DIRECTIONS.map((b) => {
                          const isSelected = (config.hero?.gradientDirection || 'bottom-fade') === b.id;
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  hero: { ...prev.hero, gradientDirection: b.id }
                                }))
                              }
                              className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                                  : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-xs font-bold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                  {b.label}
                                </span>
                                {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />}
                              </div>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                                {b.description}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Sliders & Advanced Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                      {/* Intensity Slider */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <span className="flex items-center space-x-1">
                            <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Blend / Glow Intensity</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                            {config.hero?.blendIntensity ?? 75}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={config.hero?.blendIntensity ?? 75}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              hero: { ...prev.hero, blendIntensity: parseInt(e.target.value, 10) }
                            }))
                          }
                          className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>0% Subtle</span>
                          <span>50% Balanced</span>
                          <span>100% Deep Melt</span>
                        </div>
                      </div>

                      {/* Blend Mode Dropdown */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          CSS Mix Blend Mode (Overlay tint)
                        </label>
                        <select
                          value={config.hero?.blendMode || 'normal'}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              hero: { ...prev.hero, blendMode: e.target.value }
                            }))
                          }
                          className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium"
                        >
                          {BLEND_MODES.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-400">
                          Used when 'Color Blend Overlay' mode is active.
                        </p>
                      </div>
                    </div>

                    {/* 4. Live Interactive Mockup Preview */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                          <Monitor className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Real-Time Hero Screenshot Blend Preview</span>
                        </span>
                        <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          Live Render Simulation
                        </span>
                      </div>

                      <div className="p-4 sm:p-6 rounded-2xl bg-slate-950 border border-slate-800 relative overflow-hidden">
                        <HeroBlendedImage hero={config.hero} isPreview={true} />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: BRAND & IDENTITY */}
      {activeSection === 'brand' && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Brand Name, Logo & Announcement</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customize your platform's public identity and sticky announcement chip.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={config.brandName || ''}
                  onChange={(e) => setConfig((prev) => ({ ...prev, brandName: e.target.value }))}
                  placeholder="PulseChat"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Brand Tagline / Navbar Pill
                </label>
                <input
                  type="text"
                  value={config.brandTagline || ''}
                  onChange={(e) => setConfig((prev) => ({ ...prev, brandTagline: e.target.value }))}
                  placeholder="AES-256 E2EE"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-[11px]"
                />
              </div>
            </div>

            <ImageUploader
              label="Custom Logo Image (Optional - replaces default logo)"
              value={config.brandLogo}
              token={token}
              aspectRatio="1:1"
              onChange={(url) => setConfig((prev) => ({ ...prev, brandLogo: url }))}
              placeholder="Leave blank to use dynamic PulseLogo"
            />

            {/* Announcement Banner Chip */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Announcement Badge Chip</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    The pill above the hero headline highlighting top updates or cryptography.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(config.announcementBadge?.enabled)}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        announcementBadge: { ...prev.announcementBadge, enabled: e.target.checked }
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600" />
                </label>
              </div>

              {config.announcementBadge?.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Badge Text
                    </label>
                    <input
                      type="text"
                      value={config.announcementBadge?.text || ''}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          announcementBadge: { ...prev.announcementBadge, text: e.target.value }
                        }))
                      }
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Link URL (Optional)
                    </label>
                    <input
                      type="text"
                      value={config.announcementBadge?.link || ''}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          announcementBadge: { ...prev.announcementBadge, link: e.target.value }
                        }))
                      }
                      placeholder="/register or external"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: FEATURES GRID */}
      {activeSection === 'features' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Feature Showcase Cards</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage the interactive feature cards displayed on the homepage.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddFeature}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 cursor-pointer shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Feature</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(config.features || []).map((feat, idx) => (
              <div
                key={idx}
                className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3 relative group"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider font-mono">
                    Feature #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteFeature(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                    title="Delete feature card"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={feat.title || ''}
                      onChange={(e) => handleUpdateFeature(idx, 'title', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Badge / Tag
                    </label>
                    <input
                      type="text"
                      value={feat.badge || ''}
                      onChange={(e) => handleUpdateFeature(idx, 'badge', e.target.value)}
                      placeholder="e.g. E2EE"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={feat.description || ''}
                    onChange={(e) => handleUpdateFeature(idx, 'description', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Icon
                  </label>
                  <select
                    value={feat.icon || 'Zap'}
                    onChange={(e) => handleUpdateFeature(idx, 'icon', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {AVAILABLE_ICONS.map((ic) => (
                      <option key={ic.id} value={ic.id}>
                        {ic.label}
                      </option>
                    ))}
                  </select>
                </div>

                <ImageUploader
                  label="Custom Feature Image (Optional)"
                  value={feat.image}
                  token={token}
                  aspectRatio="1:1"
                  onChange={(url) => handleUpdateFeature(idx, 'image', url)}
                  placeholder="Optional custom graphic URL"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: APP SHOWCASE & PREVIEW */}
      {activeSection === 'preview' && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Product Mockup / Showcase Section</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Display a full-width screenshot or product demonstration card on the homepage.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(config.previewSection?.enabled)}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    previewSection: { ...prev.previewSection, enabled: e.target.checked }
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600" />
            </label>
          </div>

          {config.previewSection?.enabled && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Section Title
                </label>
                <input
                  type="text"
                  value={config.previewSection?.title || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      previewSection: { ...prev.previewSection, title: e.target.value }
                    }))
                  }
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Section Description
                </label>
                <textarea
                  rows={2}
                  value={config.previewSection?.description || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      previewSection: { ...prev.previewSection, description: e.target.value }
                    }))
                  }
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              <ImageUploader
                label="Showcase Screenshot / Preview Image"
                value={config.previewSection?.imageUrl}
                token={token}
                aspectRatio="16:9"
                onChange={(url) =>
                  setConfig((prev) => ({
                    ...prev,
                    previewSection: { ...prev.previewSection, imageUrl: url }
                  }))
                }
                placeholder="Upload or enter screenshot URL"
              />
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: STATS & METRICS */}
      {activeSection === 'stats' && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Platform Metrics & Numbers</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Highlight statistics like uptime, encryption standard, or streaming performance.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddStat}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 cursor-pointer shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Stat</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(config.stats || []).map((st, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 relative"
              >
                <button
                  type="button"
                  onClick={() => handleDeleteStat(idx)}
                  className="absolute top-2.5 right-2.5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                  title="Remove Stat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    Metric Value
                  </label>
                  <input
                    type="text"
                    value={st.value || ''}
                    onChange={(e) => handleUpdateStat(idx, 'value', e.target.value)}
                    placeholder="99.99%"
                    className="w-full px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    Label
                  </label>
                  <input
                    type="text"
                    value={st.label || ''}
                    onChange={(e) => handleUpdateStat(idx, 'label', e.target.value)}
                    placeholder="Uptime"
                    className="w-full px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    Description
                  </label>
                  <input
                    type="text"
                    value={st.description || ''}
                    onChange={(e) => handleUpdateStat(idx, 'description', e.target.value)}
                    placeholder="High availability"
                    className="w-full px-2.5 py-1 text-[11px] rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 6: TRUST HIGHLIGHTS */}
      {activeSection === 'highlights' && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Trust & Compliance Checkmarks</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Bullet points with checkmark icons displayed below the features grid.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newHighlight}
              onChange={(e) => setNewHighlight(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddHighlight()}
              placeholder="e.g. ISO 27001 Readiness or Zero-Trace Logging"
              className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleAddHighlight}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="space-y-2">
            {(config.highlightPoints || []).map((pt, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-3.5 py-2 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs"
              >
                <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{pt}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteHighlight(idx)}
                  className="text-slate-400 hover:text-rose-500 transition cursor-pointer p-1"
                  title="Remove point"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 7: FOOTER & LEGAL */}
      {activeSection === 'footer' && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Footer & Legal Links</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customize copyright text and navigation links in the website footer.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Copyright Prose
            </label>
            <input
              type="text"
              value={config.footer?.copyrightText || ''}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  footer: { ...prev.footer, copyrightText: e.target.value }
                }))
              }
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 dark:text-white">Footer Links</label>
              <button
                type="button"
                onClick={handleAddFooterLink}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Link</span>
              </button>
            </div>

            <div className="space-y-2">
              {(config.footer?.links || []).map((lnk, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={lnk.label || ''}
                    onChange={(e) => handleUpdateFooterLink(idx, 'label', e.target.value)}
                    placeholder="Link Label (e.g. Terms)"
                    className="w-1/3 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={lnk.url || ''}
                    onChange={(e) => handleUpdateFooterLink(idx, 'url', e.target.value)}
                    placeholder="URL (e.g. /terms or https://...)"
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteFooterLink(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                    title="Remove link"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
