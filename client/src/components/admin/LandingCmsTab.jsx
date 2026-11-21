import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Monitor,
  History,
  Copy,
  CheckCheck,
  Share2,
  ChevronUp,
  ChevronDown,
  HelpCircle,
  Columns
} from 'lucide-react';
import { ImageCropModal } from '../common/ImageCropModal';
import { LiveLandingPreview } from './LiveLandingPreview';
import {
  SocialBrandIcon,
  detectSocialPlatform,
  getAutoFaviconUrl,
  SOCIAL_PLATFORMS
} from '../common/SocialBrandIcon';

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

export const FEATURE_CMS_CARD_THEMES = {
  violet: {
    container: 'border-2 border-violet-500/70 shadow-lg shadow-violet-950/40 bg-[#160E2E]/90 hover:border-violet-400',
    topBar: 'bg-gradient-to-r from-violet-600/30 via-violet-500/15 to-transparent border-b border-violet-500/30',
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/50',
    laser: 'from-violet-500 via-fuchsia-400 to-transparent',
    accentText: 'text-violet-400'
  },
  cyan: {
    container: 'border-2 border-cyan-500/70 shadow-lg shadow-cyan-950/40 bg-[#0A1A2A]/90 hover:border-cyan-400',
    topBar: 'bg-gradient-to-r from-cyan-600/30 via-cyan-500/15 to-transparent border-b border-cyan-500/30',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50',
    laser: 'from-cyan-500 via-sky-400 to-transparent',
    accentText: 'text-cyan-400'
  },
  emerald: {
    container: 'border-2 border-emerald-500/70 shadow-lg shadow-emerald-950/40 bg-[#091F18]/90 hover:border-emerald-400',
    topBar: 'bg-gradient-to-r from-emerald-600/30 via-emerald-500/15 to-transparent border-b border-emerald-500/30',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
    laser: 'from-emerald-500 via-teal-400 to-transparent',
    accentText: 'text-emerald-400'
  },
  amber: {
    container: 'border-2 border-amber-500/70 shadow-lg shadow-amber-950/40 bg-[#211608]/90 hover:border-amber-400',
    topBar: 'bg-gradient-to-r from-amber-600/30 via-amber-500/15 to-transparent border-b border-amber-500/30',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
    laser: 'from-amber-500 via-yellow-400 to-transparent',
    accentText: 'text-amber-400'
  },
  rose: {
    container: 'border-2 border-rose-500/70 shadow-lg shadow-rose-950/40 bg-[#240A1A]/90 hover:border-rose-400',
    topBar: 'bg-gradient-to-r from-rose-600/30 via-rose-500/15 to-transparent border-b border-rose-500/30',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
    laser: 'from-rose-500 via-pink-400 to-transparent',
    accentText: 'text-rose-400'
  }
};

export const STAT_THEMES = {
  violet: {
    id: 'violet',
    name: 'Violet',
    dot: 'bg-violet-500',
    border: 'border-violet-500/50 hover:border-violet-400',
    cardBg: 'bg-gradient-to-b from-[#1E1138]/90 to-[#140A26]/90',
    glowBox: 'shadow-[0_0_25px_rgba(168,85,247,0.25)] hover:shadow-[0_0_35px_rgba(168,85,247,0.5)]',
    topLaser: 'from-transparent via-violet-400 to-transparent',
    gradientText: 'from-violet-300 via-fuchsia-300 to-indigo-200',
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40'
  },
  cyan: {
    id: 'cyan',
    name: 'Cyan',
    dot: 'bg-cyan-500',
    border: 'border-cyan-500/50 hover:border-cyan-400',
    cardBg: 'bg-gradient-to-b from-[#0D1F33]/90 to-[#0A1524]/90',
    glowBox: 'shadow-[0_0_25px_rgba(6,182,212,0.25)] hover:shadow-[0_0_35px_rgba(6,182,212,0.5)]',
    topLaser: 'from-transparent via-cyan-400 to-transparent',
    gradientText: 'from-cyan-300 via-teal-300 to-blue-200',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
  },
  emerald: {
    id: 'emerald',
    name: 'Matrix',
    dot: 'bg-emerald-500',
    border: 'border-emerald-500/50 hover:border-emerald-400',
    cardBg: 'bg-gradient-to-b from-[#0D261D]/90 to-[#0A1A14]/90',
    glowBox: 'shadow-[0_0_25px_rgba(16,185,129,0.25)] hover:shadow-[0_0_35px_rgba(16,185,129,0.5)]',
    topLaser: 'from-transparent via-emerald-400 to-transparent',
    gradientText: 'from-emerald-300 via-teal-300 to-lime-200',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  amber: {
    id: 'amber',
    name: 'Amber',
    dot: 'bg-amber-500',
    border: 'border-amber-500/50 hover:border-amber-400',
    cardBg: 'bg-gradient-to-b from-[#2B1B0A]/90 to-[#1C1206]/90',
    glowBox: 'shadow-[0_0_25px_rgba(245,158,11,0.25)] hover:shadow-[0_0_35px_rgba(245,158,11,0.5)]',
    topLaser: 'from-transparent via-amber-400 to-transparent',
    gradientText: 'from-amber-300 via-orange-300 to-yellow-200',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  rose: {
    id: 'rose',
    name: 'Rose',
    dot: 'bg-rose-500',
    border: 'border-rose-500/50 hover:border-rose-400',
    cardBg: 'bg-gradient-to-b from-[#2E0F21]/90 to-[#1F0916]/90',
    glowBox: 'shadow-[0_0_25px_rgba(244,63,94,0.25)] hover:shadow-[0_0_35px_rgba(244,63,94,0.5)]',
    topLaser: 'from-transparent via-rose-400 to-transparent',
    gradientText: 'from-rose-300 via-pink-300 to-fuchsia-200',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  },
  indigo: {
    id: 'indigo',
    name: 'Indigo',
    dot: 'bg-indigo-500',
    border: 'border-indigo-500/50 hover:border-indigo-400',
    cardBg: 'bg-gradient-to-b from-[#14153B]/90 to-[#0D0E29]/90',
    glowBox: 'shadow-[0_0_25px_rgba(99,102,241,0.25)] hover:shadow-[0_0_35px_rgba(99,102,241,0.5)]',
    topLaser: 'from-transparent via-indigo-400 to-transparent',
    gradientText: 'from-indigo-300 via-purple-300 to-sky-200',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
  }
};

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
    blendMode: 'normal',
    buttonStyle: 'gradient',
    windowChrome: 'traffic',
    badgeStyle: 'pulse'
  },
  featuresBadge: 'Platform Architecture',
  featuresTitle: 'Built for security, engineered for scale.',
  featuresSubtitle: 'A modern bento architecture combining client-side Web Crypto, real-time Socket.IO, and peer-to-peer WebRTC calling.',
  features: [
    {
      title: 'End-to-End Encryption',
      description:
        'Messages are encrypted directly on client devices using Web Crypto AES-256-GCM. The database and backend never possess your plaintext.',
      icon: 'Lock',
      badge: 'E2EE',
      image: '',
      imageSize: 'banner',
      imageFit: 'cover',
      colSpan: 'auto',
      layout: 'banner-top',
      accentColor: 'violet'
    },
    {
      title: 'Zero-Latency Socket.IO',
      description:
        'Instant delivery receipts, live typing indicators, presence tracking, emoji reactions, and message editing without reloading.',
      icon: 'Zap',
      badge: 'Instant',
      image: '',
      imageSize: 'banner',
      imageFit: 'cover',
      colSpan: 'auto',
      layout: 'banner-top',
      accentColor: 'cyan'
    },
    {
      title: 'Group Governance & Safety',
      description:
        'Granular group roles (Owners, Admins, Members), invite links, announcement channels, server-side user blocking, and moderation reports.',
      icon: 'Users',
      badge: 'Admin Control',
      image: '',
      imageSize: 'banner',
      imageFit: 'cover',
      colSpan: 'auto',
      layout: 'banner-top',
      accentColor: 'emerald'
    },
    {
      title: 'HD Voice & Video Calls',
      description:
        'P2P WebRTC crystal clear audio & video calling with mid-call video conversion, mobile screen sharing, and active speaker detection.',
      icon: 'Video',
      badge: 'WebRTC P2P',
      image: '',
      imageSize: 'banner',
      imageFit: 'cover',
      colSpan: 'auto',
      layout: 'banner-top',
      accentColor: 'rose'
    }
  ],
  highlightPoints: [
    'Chat Transcript Export (HTML, JSON, TXT)',
    'GDPR Data Portability',
    'Multi-Session Device Management',
    'Peer-to-Peer Encrypted Voice & Video'
  ],
  stats: [
    { label: 'Uptime', value: '99.99%', description: 'High availability', accentColor: 'violet' },
    { label: 'Security', value: 'AES-256', description: 'Zero knowledge', accentColor: 'emerald' },
    { label: 'Latency', value: '< 50ms', description: 'Socket streaming', accentColor: 'cyan' }
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
  },
  socialLinks: [
    { platform: 'github', label: 'GitHub', url: 'https://github.com', iconUrl: '', autoFetch: true, enabled: true },
    { platform: 'x', label: 'X (Twitter)', url: 'https://x.com', iconUrl: '', autoFetch: true, enabled: true },
    { platform: 'discord', label: 'Discord', url: 'https://discord.gg', iconUrl: '', autoFetch: true, enabled: true },
    { platform: 'telegram', label: 'Telegram', url: 'https://t.me', iconUrl: '', autoFetch: true, enabled: true }
  ],
  faqBadge: 'Architecture & Security',
  faqTitle: 'Frequently Asked Questions',
  faqSubtitle: 'Everything you need to know about our cryptographic model, data sovereignty, and WebRTC protocols.',
  faqs: [
    {
      question: 'How does client-side End-to-End Encryption (E2EE) work?',
      answer: 'Your messages and call sessions are encrypted directly on your local device using standard Web Crypto API with AES-256-GCM. The encryption keys never leave your browser, meaning the backend servers, database, and internet service providers only ever transmit opaque, mathematically unbreakable ciphertext.',
      enabled: true
    },
    {
      question: 'Can the database administrator or server read my conversations?',
      answer: 'No. The backend operates on a strict zero-knowledge architecture. Without your device private keys, stored payloads in MongoDB are meaningless cryptographic blobs. Even in the event of an infrastructure compromise, your plaintext remains mathematically protected.',
      enabled: true
    },
    {
      question: 'Are peer-to-peer (P2P) voice and video calls encrypted?',
      answer: 'Yes. Voice and video streams establish direct WebRTC peer-to-peer connections secured by DTLS-SRTP encryption. Audio and video packets stream directly between call participants without relaying through centralized media servers whenever possible.',
      enabled: true
    },
    {
      question: 'Can I export my chat history and account data?',
      answer: 'Absolutely. PulseChat includes built-in GDPR compliant data portability. You can export complete, unredacted transcripts in HTML, JSON, or plain text formats, or perform instant cryptographic shredding to purge your data permanently.',
      enabled: true
    },
    {
      question: 'Is there a limit on group size or file attachment transfers?',
      answer: 'No artificial caps. You can create public or private channels, assign granular administrative privileges (Owners, Admins, Members), and securely upload images, voice notes, audio files, and documents with client-side thumbnail generation.',
      enabled: true
    }
  ],
  ctaBanner: {
    enabled: true,
    imageUrl: '',
    badgeText: 'Get Started in Under 30 Seconds',
    title: 'Ready to Experience Truly Sovereign Communication?',
    subtitle: 'Create your account with instant client-side key generation. No phone number required, zero tracking cookies, pure cryptographic privacy.',
    primaryButtonText: 'Create Free Account',
    primaryButtonLink: '/register',
    secondaryButtonText: 'Launch Messenger',
    secondaryButtonLink: '/login',
    tintStyle: 'deep',
    alignment: 'center'
  }
};

const CMS_IMAGE_HISTORY_KEY = 'pulsechat_cms_image_history';

export const getStoredImageHistory = () => {
  try {
    const raw = localStorage.getItem(CMS_IMAGE_HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.filter(Boolean);
    }
  } catch (e) {
    console.warn('Failed to parse CMS image history', e);
  }
  return [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80'
  ];
};

export const saveImageToHistory = (url) => {
  if (!url || typeof url !== 'string' || !url.trim()) return;
  const cleanUrl = url.trim();
  try {
    const list = getStoredImageHistory();
    const cleanBase = cleanUrl.split('?')[0];
    const filtered = list.filter((item) => item.split('?')[0] !== cleanBase);
    const updated = [cleanUrl, ...filtered].slice(0, 40);
    localStorage.setItem(CMS_IMAGE_HISTORY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('cms_image_history_updated', { detail: updated }));
  } catch (e) {
    console.warn('Failed to save to CMS image history', e);
  }
};

export const removeImageFromHistory = (url) => {
  if (!url) return;
  try {
    const list = getStoredImageHistory();
    const cleanBase = url.split('?')[0];
    const updated = list.filter((item) => item.split('?')[0] !== cleanBase);
    localStorage.setItem(CMS_IMAGE_HISTORY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('cms_image_history_updated', { detail: updated }));
  } catch (e) {}
};

export const clearAllImageHistory = () => {
  try {
    localStorage.removeItem(CMS_IMAGE_HISTORY_KEY);
    window.dispatchEvent(new CustomEvent('cms_image_history_updated', { detail: [] }));
  } catch (e) {}
};

/**
 * Reusable image uploader component with integrated Crop & Adjust modal,
 * direct raw upload option, URL input, live preview, and Image History/Media Library.
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
  const [directUploading, setDirectUploading] = useState(false);
  const [history, setHistory] = useState(() => getStoredImageHistory());
  const [copiedUrl, setCopiedUrl] = useState('');

  const cropFileInputRef = useRef(null);
  const directFileInputRef = useRef(null);

  // Sync history across instances via window event
  useEffect(() => {
    const handleHistoryUpdate = (e) => {
      if (Array.isArray(e.detail)) {
        setHistory(e.detail);
      } else {
        setHistory(getStoredImageHistory());
      }
    };
    window.addEventListener('cms_image_history_updated', handleHistoryUpdate);
    return () => window.removeEventListener('cms_image_history_updated', handleHistoryUpdate);
  }, []);

  // When admin selects a file to Crop & Adjust
  const handleCropFileSelect = (e) => {
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

  // Direct upload without cropping
  const handleDirectFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('File is too large. Maximum image size is 25 MB.');
      return;
    }

    setDirectUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const storedToken =
        token ||
        localStorage.getItem('pulsechat_token') ||
        sessionStorage.getItem('pulsechat_token');
      const headers = {};
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      let res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData
      });

      if (!res.ok && res.status !== 400) {
        res = await fetch('/api/users/upload', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: formData
        });
      }

      const data = await res.json();
      const finalUrl = data.url || data.fileUrl || data.file?.url;

      if (data.success && finalUrl) {
        onChange(finalUrl);
        saveImageToHistory(finalUrl);
      } else {
        alert(data.message || 'Direct upload failed.');
      }
    } catch (err) {
      console.error('Direct upload error:', err);
      alert('Upload failed: ' + (err.message || 'Network error'));
    } finally {
      setDirectUploading(false);
      e.target.value = '';
    }
  };

  // Copy image URL helper
  const handleCopyUrl = (url) => {
    if (!url) return;
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(''), 2000);
    });
  };

  return (
    <div className="space-y-3 p-4 rounded-2xl bg-[#1E1833]/80 border border-violet-900/30 shadow-xs">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-white tracking-wide">
            {label}
          </label>
          <span className="text-[11px] font-mono text-violet-400/80 bg-[#161226] px-2 py-0.5 rounded-md border border-violet-900/40">
            {aspectRatio} Ratio
          </span>
        </div>
      )}

      {/* Input + Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={value || ''}
            onChange={(e) => {
              onChange(e.target.value);
              if (e.target.value.trim()) saveImageToHistory(e.target.value);
            }}
            placeholder={placeholder}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#161226] border border-violet-900/40 text-violet-100 placeholder-violet-400/40 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono pr-8"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-violet-400/60 hover:text-rose-400 transition cursor-pointer"
              title="Clear Image"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Hidden inputs */}
        <input
          ref={cropFileInputRef}
          type="file"
          accept="image/*"
          onChange={handleCropFileSelect}
          className="hidden"
        />
        <input
          ref={directFileInputRef}
          type="file"
          accept="image/*"
          onChange={handleDirectFileSelect}
          className="hidden"
        />

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={directUploading}
            onClick={() => cropFileInputRef.current?.click()}
            className="px-3.5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-md shadow-violet-900/40"
            title="Upload and crop image"
          >
            <Crop className="w-3.5 h-3.5" />
            <span>Upload &amp; Crop</span>
          </button>

          <button
            type="button"
            disabled={directUploading}
            onClick={() => directFileInputRef.current?.click()}
            className="px-3 py-2.5 bg-[#231C38] hover:bg-[#2A2242] border border-violet-900/40 text-violet-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Upload raw file without cropping"
          >
            {directUploading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-400" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-violet-400" />
            )}
            <span>Direct</span>
          </button>
        </div>
      </div>

      {/* Current Preview Card */}
      {value && (
        <div className="flex items-center justify-between p-3 bg-[#161226] rounded-xl border border-violet-900/30 w-full">
          <div className="flex items-center space-x-3 overflow-hidden mr-2 min-w-0">
            <img
              src={value}
              alt="Active Preview"
              className="w-16 h-12 object-cover rounded-lg border border-violet-900/50 bg-black/40 shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="text-[11px] text-violet-300/80 truncate font-mono min-w-0">
              <span className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Currently Selected Asset
              </span>
              <span className="truncate block opacity-70" title={value}>{value}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setCropImageSrc(value);
                setCropModalOpen(true);
              }}
              className="px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
              title="Crop and adjust this active image"
            >
              <Sliders className="w-3.5 h-3.5 text-violet-400" />
              <span>Crop &amp; Adjust</span>
            </button>
          </div>
        </div>
      )}

      {/* Image History / Media Library Shelf */}
      <div className="pt-2 border-t border-violet-900/20 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-violet-300/80 font-bold">
            <History className="w-3.5 h-3.5 text-violet-400" />
            <span>Image History &amp; Reusable Library</span>
            <span className="px-1.5 py-0.2 rounded-md bg-[#161226] text-violet-400 font-mono text-[10px] border border-violet-900/40">
              {history.length}
            </span>
          </div>

          {history.length > 0 && (
            <button
              type="button"
              onClick={clearAllImageHistory}
              className="text-[11px] text-violet-400/60 hover:text-rose-400 transition cursor-pointer flex items-center gap-1"
              title="Clear all saved history items"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-[11px] text-violet-300/40 italic py-2">
            Uploaded images will appear here automatically for one-click reuse across Hero, Features, and Preview sections.
          </div>
        ) : (
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-violet-900/50 pt-1">
            {history.map((imgUrl, hIdx) => {
              const isSelected = value && value.split('?')[0] === imgUrl.split('?')[0];
              return (
                <div
                  key={`${imgUrl}-${hIdx}`}
                  className={`group relative shrink-0 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-violet-500 ring-2 ring-violet-500/40 shadow-md shadow-violet-900/40'
                      : 'border-violet-900/40 hover:border-violet-500/60 bg-[#161226]'
                  }`}
                  style={{ width: '96px', height: '64px' }}
                  onClick={() => onChange(imgUrl)}
                  title="Click to use this image"
                >
                  <img
                    src={imgUrl}
                    alt={`History asset ${hIdx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80';
                    }}
                  />

                  {/* Active selection badge */}
                  {isSelected && (
                    <div className="absolute top-1 left-1 bg-violet-600 text-white rounded-md p-0.5 shadow-sm">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}

                  {/* Hover action overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange(imgUrl);
                      }}
                      className="p-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition"
                      title="Apply this image"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCropImageSrc(imgUrl);
                        setCropModalOpen(true);
                      }}
                      className="p-1 rounded-lg bg-[#231C38] hover:bg-[#2A2242] text-violet-300 transition"
                      title="Crop & adjust this image"
                    >
                      <Crop className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImageFromHistory(imgUrl);
                      }}
                      className="p-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 transition"
                      title="Remove from history"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
          saveImageToHistory(finalUrl);
          setCropModalOpen(false);
        }}
      />
    </div>
  );
};

export const LandingCmsTab = ({ authHeaders, showFeedback, token }) => {
  const [config, setConfig] = useState(DEFAULT_LANDING_CONFIG);
  const [savedConfig, setSavedConfig] = useState(DEFAULT_LANDING_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('hero'); // 'hero' | 'brand' | 'features' | 'preview' | 'stats' | 'highlights' | 'footer'
  const [newHighlight, setNewHighlight] = useState('');
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'editor' | 'preview'

  // Detect whether unsaved changes exist compared to currently saved database configuration
  const hasChanges = useMemo(() => {
    return JSON.stringify(config) !== JSON.stringify(savedConfig);
  }, [config, savedConfig]);

  // Cancel & revert changes back to saved database state
  const handleCancelChanges = () => {
    setConfig(savedConfig);
  };

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
          const merged = {
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
            },
            highlightPoints: Array.isArray(data.landingPageConfig.highlightPoints)
              ? data.landingPageConfig.highlightPoints
              : DEFAULT_LANDING_CONFIG.highlightPoints,
            socialLinks: Array.isArray(data.landingPageConfig.socialLinks)
              ? data.landingPageConfig.socialLinks
              : DEFAULT_LANDING_CONFIG.socialLinks,
            faqs: Array.isArray(data.landingPageConfig.faqs)
              ? data.landingPageConfig.faqs
              : DEFAULT_LANDING_CONFIG.faqs,
            ctaBanner: {
              ...DEFAULT_LANDING_CONFIG.ctaBanner,
              ...(data.landingPageConfig.ctaBanner || {})
            },
            features: Array.isArray(data.landingPageConfig.features)
              ? data.landingPageConfig.features.map((f) => ({
                  title: f.title || '',
                  description: f.description || '',
                  icon: f.icon || 'Zap',
                  badge: f.badge || '',
                  image: f.image || '',
                  imageSize: f.imageSize || 'banner',
                  imageFit: f.imageFit || 'cover',
                  colSpan: f.colSpan || 'auto',
                  layout: f.layout || 'banner-top',
                  accentColor: f.accentColor || 'violet'
                }))
              : DEFAULT_LANDING_CONFIG.features
          };
          setConfig(merged);
          setSavedConfig(merged);

          // Seed media history with existing landing page assets
          const lpc = data.landingPageConfig;
          if (lpc.hero?.heroImage) saveImageToHistory(lpc.hero.heroImage);
          if (lpc.brandLogo) saveImageToHistory(lpc.brandLogo);
          if (lpc.previewSection?.imageUrl) saveImageToHistory(lpc.previewSection.imageUrl);
          if (Array.isArray(lpc.features)) {
            lpc.features.forEach((f) => {
              if (f.image) saveImageToHistory(f.image);
            });
          }
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
        setSavedConfig(config);
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
      image: '',
      imageSize: 'banner',
      imageFit: 'cover',
      colSpan: 'auto',
      layout: 'banner-top',
      accentColor: 'violet'
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

  const handleReorderFeatures = (fromIndex, toIndex) => {
    setConfig((prev) => {
      const list = [...(prev.features || [])];
      if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) {
        return prev;
      }
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return { ...prev, features: list };
    });
  };

  const handleDeleteFeature = (index) => {
    setConfig((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  // Highlight points helpers
  const handleAddHighlight = (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    const text = newHighlight.trim();
    if (!text) {
      // If user clicks add without typing, provide a sensible default item to edit
      setConfig((prev) => ({
        ...prev,
        highlightPoints: [...(prev.highlightPoints || []), 'New Trust & Compliance Point']
      }));
      return;
    }
    setConfig((prev) => ({
      ...prev,
      highlightPoints: [...(prev.highlightPoints || []), text]
    }));
    setNewHighlight('');
  };

  const handleUpdateHighlight = (index, val) => {
    setConfig((prev) => {
      const updated = [...(prev.highlightPoints || [])];
      updated[index] = val;
      return { ...prev, highlightPoints: updated };
    });
  };

  const handleDeleteHighlight = (index) => {
    setConfig((prev) => ({
      ...prev,
      highlightPoints: (prev.highlightPoints || []).filter((_, i) => i !== index)
    }));
  };

  // Stats helpers
  const handleAddStat = () => {
    const newStat = { label: 'Metric', value: '100%', description: 'Highlight text', accentColor: 'violet' };
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

  // Social Links helpers with Logo Auto-Fetch
  const handleAddSocialLink = (preset = null) => {
    const newLink = preset || {
      platform: 'github',
      label: 'GitHub',
      url: 'https://github.com',
      iconUrl: '',
      autoFetch: true,
      enabled: true
    };
    setConfig((prev) => ({
      ...prev,
      socialLinks: [...(prev.socialLinks || []), newLink]
    }));
  };

  const handleUpdateSocialLink = (index, field, val) => {
    setConfig((prev) => {
      const list = [...(prev.socialLinks || [])];
      const item = { ...list[index], [field]: val };

      // If user edits URL and autoFetch is on, automatically detect platform and suggested label
      if (field === 'url' && item.autoFetch && val) {
        const detected = detectSocialPlatform(val);
        if (detected.platform && detected.platform !== 'other') {
          item.platform = detected.platform;
          const currentLabel = (item.label || '').trim().toLowerCase();
          const isGeneric = !currentLabel || ['github', 'x', 'twitter', 'discord', 'telegram', 'youtube', 'instagram', 'linkedin', 'facebook', 'reddit', 'twitch', 'tiktok', 'new link', 'social link'].includes(currentLabel);
          if (isGeneric) {
            item.label = detected.label;
          }
        }
      } else if (field === 'platform' && val) {
        const plat = SOCIAL_PLATFORMS.find((p) => p.id === val);
        if (plat && (!item.label || item.label === 'New Link')) {
          item.label = plat.label;
        }
      }

      list[index] = item;
      return { ...prev, socialLinks: list };
    });
  };

  const handleDeleteSocialLink = (index) => {
    setConfig((prev) => ({
      ...prev,
      socialLinks: (prev.socialLinks || []).filter((_, i) => i !== index)
    }));
  };

  const handleMoveSocialLink = (index, direction) => {
    setConfig((prev) => {
      const list = [...(prev.socialLinks || [])];
      const target = index + direction;
      if (target < 0 || target >= list.length) return prev;
      const temp = list[index];
      list[index] = list[target];
      list[target] = temp;
      return { ...prev, socialLinks: list };
    });
  };

  // FAQ helpers
  const handleAddFaq = () => {
    setConfig((prev) => ({
      ...prev,
      faqBadge: 'Architecture & Security',
  faqTitle: 'Frequently Asked Questions',
  faqSubtitle: 'Everything you need to know about our cryptographic model, data sovereignty, and WebRTC protocols.',
  faqs: [
        ...(prev.faqs || []),
        {
          question: 'New Question',
          answer: 'Enter clear explanation regarding privacy, technology, or encryption.',
          enabled: true
        }
      ]
    }));
  };

  const handleUpdateFaq = (index, field, val) => {
    setConfig((prev) => {
      const list = [...(prev.faqs || [])];
      list[index] = { ...list[index], [field]: val };
      return { ...prev, faqs: list };
    });
  };

  const handleDeleteFaq = (index) => {
    setConfig((prev) => ({
      ...prev,
      faqs: (prev.faqs || []).filter((_, i) => i !== index)
    }));
  };

  const handleMoveFaq = (index, direction) => {
    setConfig((prev) => {
      const list = [...(prev.faqs || [])];
      const target = index + direction;
      if (target < 0 || target >= list.length) return prev;
      const temp = list[index];
      list[index] = list[target];
      list[target] = temp;
      return { ...prev, faqs: list };
    });
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
    { id: 'features', label: 'Features Bento Grid', icon: Layers },
    { id: 'preview', label: 'App Showcase', icon: ImageIcon },
    { id: 'stats', label: 'Stats & Metrics', icon: BarChart3 },
    { id: 'highlights', label: 'Trust Highlights', icon: CheckCircle2 },
    { id: 'social', label: 'Social & Community', icon: Share2 },
    { id: 'faqs', label: 'Architecture FAQ', icon: HelpCircle },
    { id: 'cta', label: 'Call to Action Banner', icon: Zap },
    { id: 'footer', label: 'Footer & Legal', icon: LinkIcon }
  ];

  return (
    <div className="space-y-6 w-full">
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
          {/* Studio View Mode Switcher - High Contrast & Clearly Visible */}
          <div className="flex items-center bg-[#130B24] p-1 rounded-xl border border-violet-700/50 shadow-inner space-x-1">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-900/50 border border-violet-400/40'
                  : 'text-violet-200 hover:text-white hover:bg-violet-900/30'
              }`}
              title="Split Studio: Editor on Left, Live Preview on Right"
            >
              <Columns className="w-3.5 h-3.5 text-violet-300" />
              <span>Split Studio</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewMode === 'editor'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-900/50 border border-violet-400/40'
                  : 'text-violet-200 hover:text-white hover:bg-violet-900/30'
              }`}
              title="Editor Fullscreen (Expanded View)"
            >
              <Sliders className="w-3.5 h-3.5 text-violet-300" />
              <span>Editor Only</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewMode === 'preview'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-900/50 border border-violet-400/40'
                  : 'text-violet-200 hover:text-white hover:bg-violet-900/30'
              }`}
              title="Live Preview Fullscreen (Expanded View)"
            >
              <Eye className="w-3.5 h-3.5 text-violet-300" />
              <span>Preview Only</span>
            </button>
          </div>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-[#231C38] hover:bg-[#2A2242] border border-violet-800/50 text-violet-200 hover:text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
            title="Preview Live Landing Page in New Window"
          >
            <Eye className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden sm:inline">View Site</span>
            <ExternalLink className="w-3 h-3 text-violet-400/60" />
          </a>

          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 bg-[#231C38] hover:bg-rose-950/40 text-violet-300 hover:text-rose-400 border border-violet-800/50 rounded-xl text-xs font-semibold transition cursor-pointer"
            title="Reset to Defaults"
          >
            Reset
          </button>

          {hasChanges && (
            <button
              type="button"
              onClick={handleCancelChanges}
              className="px-3.5 py-2 bg-[#231C38] hover:bg-[#2A2242] text-violet-300 hover:text-white border border-violet-800/50 rounded-xl text-xs font-semibold transition cursor-pointer"
              title="Discard Unsaved Changes"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-violet-900/40 flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
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

      {/* Main Studio Container: Split View vs Full Screen */}
      <div className={`w-full ${viewMode === 'split' ? 'grid grid-cols-1 xl:grid-cols-12 gap-6 items-start' : 'space-y-6'}`}>
        {/* LEFT COLUMN: Editor Panels */}
        {viewMode !== 'preview' && (
          <div className={`${viewMode === 'split' ? 'xl:col-span-6 2xl:col-span-5' : 'w-full max-w-5xl mx-auto'} space-y-5 min-w-0`}>
            {/* Navigation Pills */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#120B24] border border-violet-800/50 rounded-2xl shadow-xs">
              {SECTIONS.map((sec) => {
                const Icon = sec.icon;
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSection(sec.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-900/50 font-bold border border-violet-400/30'
                        : 'text-violet-200 hover:text-white bg-[#1A1230]/60 hover:bg-[#251B44] border border-violet-900/30'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0 text-violet-300" />
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

            {/* Hero Visual Styling Studio */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <label className="block text-xs font-bold text-slate-900 dark:text-white">
                Hero Button & Frame Styling
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Primary Button Style */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Button Glow Style
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {[
                      { id: 'gradient', label: 'Radiant Gradient' },
                      { id: 'neon', label: 'Cyber Neon' },
                      { id: 'glass', label: 'Frost Glass' }
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            hero: { ...prev.hero, buttonStyle: btn.id }
                          }))
                        }
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-medium border text-center transition cursor-pointer ${
                          (config.hero?.buttonStyle || 'gradient') === btn.id
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hero Window Chrome Style */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Window Frame Header
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {[
                      { id: 'traffic', label: 'macOS Dots' },
                      { id: 'minimal', label: 'Cyber Lock' },
                      { id: 'none', label: 'Seamless' }
                    ].map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            hero: { ...prev.hero, windowChrome: ch.id }
                          }))
                        }
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-medium border text-center transition cursor-pointer ${
                          (config.hero?.windowChrome || 'traffic') === ch.id
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {ch.label}
                      </button>
                    ))}
                  </div>
                </div>
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
                Manage the section headlines and interactive feature cards displayed on the homepage.
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

          {/* Section Heading Settings */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
            <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider font-mono">
              Features Section Header
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Section Pill Badge
                </label>
                <input
                  type="text"
                  value={config.featuresBadge ?? 'Platform Architecture'}
                  onChange={(e) => setConfig((prev) => ({ ...prev, featuresBadge: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Section Main Headline
                </label>
                <input
                  type="text"
                  value={config.featuresTitle ?? 'Built for security, engineered for scale.'}
                  onChange={(e) => setConfig((prev) => ({ ...prev, featuresTitle: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Section Subtitle / Description
              </label>
              <input
                type="text"
                value={config.featuresSubtitle ?? 'A modern bento architecture combining client-side Web Crypto, real-time Socket.IO, and peer-to-peer WebRTC calling.'}
                onChange={(e) => setConfig((prev) => ({ ...prev, featuresSubtitle: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className={`grid gap-5 ${viewMode === 'split' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
            {(config.features || []).map((feat, idx) => {
              const cardTh = FEATURE_CMS_CARD_THEMES[feat.accentColor] || FEATURE_CMS_CARD_THEMES.violet;
              const isMinimalIcon = feat.layout === 'icon' || feat.imageSize === 'icon';

              return (
                <div
                  key={idx}
                  className={`rounded-2xl overflow-hidden transition-all duration-300 relative group ${cardTh.container}`}
                >
                  {/* Top Glowing Laser Edge */}
                  <div className={`h-1 w-full bg-gradient-to-r ${cardTh.laser}`} />

                  {/* Highlight Header with Distinct Badges */}
                  <div className={`px-4 py-3 flex items-center justify-between ${cardTh.topBar}`}>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border uppercase tracking-wider ${cardTh.badge}`}>
                        FEATURE #{idx + 1}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/40 text-slate-300 border border-white/10">
                        {feat.colSpan === 'wide' ? '2 Cols' : feat.colSpan === 'full' ? '3 Cols' : feat.colSpan === 'normal' ? '1 Col' : 'Auto Grid'}
                      </span>
                      {feat.layout && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/40 text-slate-300 border border-white/10">
                          {feat.layout}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      {/* Move card up/down directly in editor */}
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleReorderFeatures(idx, idx - 1)}
                          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                          title="Move feature earlier"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {idx < (config.features || []).length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleReorderFeatures(idx, idx + 1)}
                          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                          title="Move feature later"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteFeature(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/50 transition cursor-pointer ml-1"
                        title="Delete feature card"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 space-y-4">
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

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Icon {isMinimalIcon && feat.image && <span className="text-violet-400 font-normal">(Replaced by Custom Icon)</span>}
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

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Card Grid Span
                        </label>
                        <select
                          value={feat.colSpan || 'auto'}
                          onChange={(e) => handleUpdateFeature(idx, 'colSpan', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium"
                        >
                          <option value="auto">Auto Balanced (Smart)</option>
                          <option value="wide">Wide (2 Columns)</option>
                          <option value="normal">Standard (1 Column)</option>
                          <option value="full">Full Width (3 Columns)</option>
                        </select>
                      </div>
                    </div>

                    {/* Card Theme Accent Glow */}
                    <div className="pt-1">
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Card Theme Glow / Accent Color
                      </label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[
                          { id: 'violet', label: 'Violet', bg: 'bg-violet-500' },
                          { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-500' },
                          { id: 'emerald', label: 'Matrix', bg: 'bg-emerald-500' },
                          { id: 'amber', label: 'Amber', bg: 'bg-amber-500' },
                          { id: 'rose', label: 'Rose', bg: 'bg-rose-500' }
                        ].map((th) => (
                          <button
                            key={th.id}
                            type="button"
                            onClick={() => handleUpdateFeature(idx, 'accentColor', th.id)}
                            className={`py-1.5 px-2 rounded-xl text-[10px] font-semibold border flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                              (feat.accentColor || 'violet') === th.id
                                ? 'border-indigo-500 ring-2 ring-indigo-500/40 bg-indigo-50 dark:bg-indigo-950/40 text-slate-900 dark:text-white font-bold'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full ${th.bg} shrink-0`} />
                            <span>{th.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Card Visual Layout Style */}
                    <div className="pt-1">
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Card Visual Layout Style
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs">
                        {[
                          { id: 'banner-top', label: 'Top Banner', desc: 'Visual on top' },
                          { id: 'banner-bottom', label: 'Bottom Visual', desc: 'Visual at bottom' },
                          { id: 'card-overlay', label: 'Card Overlay', desc: 'Full image background' },
                          { id: 'split', label: 'Split View', desc: 'Side-by-side' },
                          { id: 'icon', label: 'Minimal Icon', desc: 'Shows custom icon' }
                        ].map((lay) => (
                          <button
                            key={lay.id}
                            type="button"
                            onClick={() => {
                              handleUpdateFeature(idx, 'layout', lay.id);
                              if (lay.id === 'icon' && feat.image && feat.imageSize !== 'icon') {
                                handleUpdateFeature(idx, 'imageSize', 'icon');
                              }
                            }}
                            className={`p-2 rounded-xl text-left border transition cursor-pointer ${
                              (feat.layout || 'banner-top') === lay.id
                                ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <div className="text-[11px] font-bold leading-tight">{lay.label}</div>
                            <div className={`text-[9px] mt-0.5 leading-tight ${
                              (feat.layout || 'banner-top') === lay.id ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'
                            }`}>
                              {lay.desc}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Image Uploader & Media Controls */}
                    <div className="space-y-2 pt-1">
                      <ImageUploader
                        label={isMinimalIcon ? "Custom Feature Icon / Emblem (Replaces Default Icon)" : "Custom Feature Image / Visual Banner"}
                        value={feat.image}
                        token={token}
                        aspectRatio={isMinimalIcon ? "1:1" : "16:9"}
                        onChange={(url) => {
                          handleUpdateFeature(idx, 'image', url);
                          if (feat.layout === 'icon') {
                            handleUpdateFeature(idx, 'imageSize', 'icon');
                          }
                        }}
                        placeholder={isMinimalIcon ? "Upload or paste custom icon URL (PNG, SVG, WebP)" : "Upload or paste image URL"}
                      />

                      {/* Active Custom Minimal Icon Banner Preview */}
                      {feat.image && isMinimalIcon && (
                        <div className="flex items-center space-x-3 p-3 rounded-xl bg-violet-950/60 border border-violet-500/50 shadow-xs">
                          <div className="w-12 h-12 rounded-xl bg-[#0E081C] border border-violet-400/50 p-1 flex items-center justify-center shrink-0 shadow-inner">
                            <img src={feat.image} alt={feat.title} className="w-full h-full object-contain rounded-lg" />
                          </div>
                          <div className="text-xs">
                            <div className="font-bold text-violet-200 flex items-center space-x-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Active Custom Minimal Icon</span>
                            </div>
                            <div className="text-[10px] text-violet-300/80 mt-0.5">
                              This image will render directly as the feature emblem on the landing page & live preview instead of the default Lucide icon.
                            </div>
                          </div>
                        </div>
                      )}

                      {feat.image && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Image Display Format
                            </label>
                            <div className="grid grid-cols-4 gap-1 text-xs">
                              {[
                                { id: 'banner', label: 'Banner' },
                                { id: 'medium', label: 'Medium' },
                                { id: 'compact', label: 'Compact' },
                                { id: 'icon', label: 'Icon' }
                              ].map((fmt) => (
                                <button
                                  key={fmt.id}
                                  type="button"
                                  onClick={() => handleUpdateFeature(idx, 'imageSize', fmt.id)}
                                  className={`py-1.5 px-1.5 rounded-lg text-[10px] font-medium border text-center transition cursor-pointer ${
                                    (feat.imageSize || 'banner') === fmt.id
                                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  {fmt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Image Object Fit
                            </label>
                            <div className="grid grid-cols-2 gap-1.5 text-xs">
                              {[
                                { id: 'cover', label: 'Cover (Fill)' },
                                { id: 'contain', label: 'Contain (Fit)' }
                              ].map((fit) => (
                                <button
                                  key={fit.id}
                                  type="button"
                                  onClick={() => handleUpdateFeature(idx, 'imageFit', fit.id)}
                                  className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition cursor-pointer ${
                                    (feat.imageFit || 'cover') === fit.id
                                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  {fit.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(config.stats || []).map((st, idx) => {
              const th = STAT_THEMES[st.accentColor] || STAT_THEMES[idx === 0 ? 'violet' : idx === 1 ? 'emerald' : 'cyan'] || STAT_THEMES.violet;
              return (
                <div
                  key={idx}
                  className={`p-4 bg-slate-900/90 dark:bg-slate-950/80 border ${th.border} rounded-2xl space-y-3 relative overflow-hidden shadow-lg transition-all duration-300 group`}
                >
                  {/* Top Glowing Laser Edge */}
                  <div className={`h-1 w-full bg-gradient-to-r ${th.topLaser} absolute top-0 inset-x-0`} />

                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border uppercase tracking-wider ${th.badge}`}>
                      STAT #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteStat(idx)}
                      className="text-slate-400 hover:text-rose-500 transition cursor-pointer p-1"
                      title="Remove Stat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Metric Value
                    </label>
                    <input
                      type="text"
                      value={st.value || ''}
                      onChange={(e) => handleUpdateStat(idx, 'value', e.target.value)}
                      placeholder="99.99%"
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white font-bold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Label
                    </label>
                    <input
                      type="text"
                      value={st.label || ''}
                      onChange={(e) => handleUpdateStat(idx, 'label', e.target.value)}
                      placeholder="Uptime"
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={st.description || ''}
                      onChange={(e) => handleUpdateStat(idx, 'description', e.target.value)}
                      placeholder="High availability"
                      className="w-full px-2.5 py-1.5 text-[11px] rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* GLOWING THEME & ACCENT COLOR CONTROL */}
                  <div className="pt-1 border-t border-slate-800/80">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Card Theme Glow / Accent Color</span>
                      <span className="text-[9px] text-violet-400 font-mono">glow active</span>
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {Object.values(STAT_THEMES).map((themeOption) => (
                        <button
                          key={themeOption.id}
                          type="button"
                          onClick={() => handleUpdateStat(idx, 'accentColor', themeOption.id)}
                          className={`py-1 px-1.5 rounded-lg text-[9px] font-semibold border flex items-center justify-center space-x-1 transition cursor-pointer ${
                            (st.accentColor || 'violet') === themeOption.id
                              ? 'border-indigo-400 ring-1 ring-indigo-400/50 bg-indigo-950/70 text-white font-bold shadow-xs'
                              : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${themeOption.dot} shrink-0`} />
                          <span>{themeOption.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 6: TRUST HIGHLIGHTS */}
      {activeSection === 'highlights' && (
        <div className="p-5 sm:p-6 bg-[#231C38] border border-violet-900/30 rounded-2xl shadow-xl space-y-5 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Trust &amp; Compliance Checkmarks</span>
              </h3>
              <p className="text-xs text-violet-300/70 mt-0.5">
                Bullet points with checkmark icons displayed below the features grid on your public homepage.
              </p>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#19142B] border border-violet-900/40 text-violet-300 self-start sm:self-center">
              {(config.highlightPoints || []).length} Checkmark{(config.highlightPoints || []).length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Add Checkmark Input Bar */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newHighlight}
              onChange={(e) => setNewHighlight(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddHighlight();
                }
              }}
              placeholder="e.g. ISO 27001 Readiness, Zero-Trace Logging, or Encrypted VoIP"
              className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-[#19142B] border border-violet-900/40 text-white placeholder-violet-300/40 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              type="button"
              onClick={handleAddHighlight}
              className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 shadow-md shadow-violet-950/40 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Checkmark</span>
            </button>
          </div>

          {/* List of Checkmarks with Inline Editing */}
          <div className="space-y-2">
            {(config.highlightPoints || []).map((pt, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-3.5 py-2.5 bg-[#19142B] rounded-xl border border-violet-900/30 text-xs transition hover:border-violet-700/50"
              >
                <div className="flex items-center space-x-2.5 flex-1 min-w-0 mr-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <input
                    type="text"
                    value={pt}
                    onChange={(e) => handleUpdateHighlight(idx, e.target.value)}
                    className="flex-1 bg-transparent border-0 border-b border-transparent hover:border-violet-700/50 focus:border-violet-400 focus:outline-none text-xs text-white px-1.5 py-0.5 font-medium transition"
                    placeholder="Enter checkmark description..."
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteHighlight(idx)}
                  className="text-violet-400/60 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/30 transition cursor-pointer shrink-0"
                  title="Remove point"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {(!config.highlightPoints || config.highlightPoints.length === 0) && (
              <div className="py-8 text-center bg-[#19142B]/50 rounded-xl border border-dashed border-violet-900/40 text-violet-300/60 text-xs space-y-2">
                <p>No trust checkmarks added yet.</p>
                <button
                  type="button"
                  onClick={() => handleAddHighlight()}
                  className="px-3 py-1.5 bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-500/30 rounded-lg text-xs font-semibold cursor-pointer transition"
                >
                  + Add First Checkmark
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION: SOCIAL & COMMUNITY LINKS (WITH LOGO AUTO-FETCH) */}
      {activeSection === 'social' && (
        <div className="p-6 bg-[#1E1833] border border-violet-900/40 rounded-2xl shadow-xs space-y-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-violet-900/30">
            <div>
              <div className="flex items-center space-x-2">
                <Share2 className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-bold text-white">Social & Community Links</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-600/30 text-violet-300 border border-violet-500/30">
                  Logo Auto-Fetch
                </span>
              </div>
              <p className="text-xs text-violet-300/60 mt-1">
                Add links to GitHub, X (Twitter), Discord, Telegram, YouTube, and any community channels. Icons and platform names are auto-detected instantly from the URL.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#19142B] border border-violet-900/40 text-violet-300">
                {(config.socialLinks || []).length} Link{(config.socialLinks || []).length !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={() => handleAddSocialLink()}
                className="px-3.5 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-md shadow-violet-900/30 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Link</span>
              </button>
            </div>
          </div>

          {/* Quick Platform Presets Bar */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-violet-300/80">Quick One-Click Add:</span>
            <div className="flex flex-wrap gap-2">
              {[
                { platform: 'github', label: 'GitHub', url: 'https://github.com' },
                { platform: 'x', label: 'X (Twitter)', url: 'https://x.com' },
                { platform: 'discord', label: 'Discord', url: 'https://discord.gg' },
                { platform: 'telegram', label: 'Telegram', url: 'https://t.me' },
                { platform: 'youtube', label: 'YouTube', url: 'https://youtube.com' },
                { platform: 'instagram', label: 'Instagram', url: 'https://instagram.com' },
                { platform: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com' },
                { platform: 'reddit', label: 'Reddit', url: 'https://reddit.com' },
              ].map((preset) => (
                <button
                  key={preset.platform}
                  type="button"
                  onClick={() => handleAddSocialLink({ ...preset, iconUrl: '', autoFetch: true, enabled: true })}
                  className="px-2.5 py-1 rounded-lg bg-[#231C38] hover:bg-violet-900/40 border border-violet-900/30 hover:border-violet-500/50 text-[11px] text-violet-200 flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <SocialBrandIcon platform={preset.platform} url={preset.url} className="w-3.5 h-3.5" />
                  <span>+ {preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* List of Configured Social Links */}
          <div className="space-y-3">
            {(config.socialLinks || []).map((lnk, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition ${
                  lnk.enabled
                    ? 'bg-[#231C38] border-violet-900/40 hover:border-violet-700/60'
                    : 'bg-[#19142B]/60 border-violet-950/40 opacity-70'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-violet-900/20">
                  {/* Left: Reorder, Icon preview, Platform badge */}
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="flex flex-col space-y-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveSocialLink(idx, -1)}
                        className="p-1 text-violet-400 hover:text-white disabled:opacity-30 disabled:hover:text-violet-400 transition cursor-pointer"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === (config.socialLinks || []).length - 1}
                        onClick={() => handleMoveSocialLink(idx, 1)}
                        className="p-1 text-violet-400 hover:text-white disabled:opacity-30 disabled:hover:text-violet-400 transition cursor-pointer"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Live Brand Icon Avatar */}
                    <div className="w-9 h-9 rounded-xl bg-[#19142B] border border-violet-900/50 flex items-center justify-center text-white p-1.5 shadow-inner shrink-0 relative">
                      <SocialBrandIcon
                        platform={lnk.platform}
                        url={lnk.url}
                        iconUrl={lnk.iconUrl}
                        autoFetch={lnk.autoFetch}
                        fallbackName={lnk.label}
                        className="w-5 h-5"
                      />
                      {lnk.autoFetch && (
                        <span
                          className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#231C38]"
                          title="Auto-fetch active"
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-white truncate">
                          {lnk.label || 'Unnamed Link'}
                        </span>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-violet-950/80 text-violet-300 border border-violet-800/40">
                          {lnk.platform || 'Custom'}
                        </span>
                      </div>
                      {lnk.url && (
                        <p className="text-[11px] font-mono text-violet-300/60 truncate max-w-xs sm:max-w-md">
                          {lnk.url}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions (Toggle, Delete, Test Link) */}
                  <div className="flex items-center space-x-2 shrink-0 self-end md:self-auto">
                    {lnk.url && (
                      <a
                        href={lnk.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-violet-300 hover:text-white hover:bg-violet-900/30 rounded-lg transition"
                        title="Test Link"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleUpdateSocialLink(idx, 'enabled', !lnk.enabled)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition cursor-pointer border ${
                        lnk.enabled
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-violet-950/40 text-violet-400/60 border-violet-900/40'
                      }`}
                    >
                      {lnk.enabled ? 'ACTIVE' : 'MUTED'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSocialLink(idx)}
                      className="p-1.5 text-violet-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
                      title="Delete Social Link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-violet-300/80 mb-1">
                      URL / Profile Address
                    </label>
                    <input
                      type="text"
                      value={lnk.url || ''}
                      onChange={(e) => handleUpdateSocialLink(idx, 'url', e.target.value)}
                      placeholder="https://github.com/..."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[#19142B] border border-violet-900/40 text-white placeholder-violet-400/30 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-violet-300/80 mb-1">
                      Display Label
                    </label>
                    <input
                      type="text"
                      value={lnk.label || ''}
                      onChange={(e) => handleUpdateSocialLink(idx, 'label', e.target.value)}
                      placeholder="e.g. Join Our Discord"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[#19142B] border border-violet-900/40 text-white placeholder-violet-400/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-violet-300/80 mb-1">
                      Platform Category
                    </label>
                    <select
                      value={lnk.platform || 'other'}
                      onChange={(e) => handleUpdateSocialLink(idx, 'platform', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[#19142B] border border-violet-900/40 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                    >
                      {SOCIAL_PLATFORMS.map((plat) => (
                        <option key={plat.id} value={plat.id}>
                          {plat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Logo Auto-Fetch Toggle & Custom Icon URL Override */}
                  <div className="sm:col-span-2 lg:col-span-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={lnk.autoFetch !== false}
                        onChange={(e) => handleUpdateSocialLink(idx, 'autoFetch', e.target.checked)}
                        className="w-4 h-4 rounded text-violet-600 bg-[#19142B] border-violet-800 focus:ring-violet-500 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className="text-xs text-violet-200">
                        Auto-fetch brand logo from domain
                      </span>
                    </label>

                    <div className="flex items-center space-x-2 w-full sm:w-auto flex-1 max-w-md">
                      <span className="text-[11px] text-violet-400/70 shrink-0">Custom Icon URL:</span>
                      <input
                        type="text"
                        value={lnk.iconUrl || ''}
                        onChange={(e) => handleUpdateSocialLink(idx, 'iconUrl', e.target.value)}
                        placeholder="Optional override https://.../logo.png"
                        className="w-full px-2.5 py-1 text-[11px] rounded-lg bg-[#19142B] border border-violet-900/40 text-white placeholder-violet-400/30 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {(!config.socialLinks || config.socialLinks.length === 0) && (
              <div className="py-10 text-center bg-[#19142B]/50 rounded-2xl border border-dashed border-violet-900/40 text-violet-300/60 text-xs space-y-3">
                <Share2 className="w-8 h-8 text-violet-500/40 mx-auto" />
                <p className="font-medium text-white">No social links configured yet.</p>
                <p className="text-[11px] text-violet-300/60 max-w-sm mx-auto">
                  Add links to your Discord server, GitHub organization, X handle, or custom community pages.
                </p>
                <button
                  type="button"
                  onClick={() => handleAddSocialLink()}
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-md shadow-violet-900/30 hover:brightness-110 transition"
                >
                  + Add First Social Link
                </button>
              </div>
            )}
          </div>

          {/* Live Preview Dock of Social Links on Landing Page */}
          {(config.socialLinks || []).filter((l) => l.enabled).length > 0 && (
            <div className="mt-6 pt-5 border-t border-violet-900/30 space-y-3">
              <span className="text-xs font-bold text-violet-200 uppercase tracking-wider font-mono">
                Live Homepage Preview:
              </span>
              <div className="p-4 rounded-2xl bg-[#161226] border border-violet-900/40 flex flex-wrap items-center gap-2.5">
                {(config.socialLinks || [])
                  .filter((l) => l.enabled)
                  .map((lnk, idx) => (
                    <a
                      key={idx}
                      href={lnk.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#231C38] hover:bg-violet-900/40 border border-violet-900/40 text-xs font-semibold text-white transition hover:scale-105 shadow-sm"
                    >
                      <SocialBrandIcon
                        platform={lnk.platform}
                        url={lnk.url}
                        iconUrl={lnk.iconUrl}
                        autoFetch={lnk.autoFetch}
                        className="w-4 h-4"
                      />
                      <span>{lnk.label || 'Link'}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-violet-400/60" />
                    </a>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION: ARCHITECTURE & SECURITY FAQ */}
      {activeSection === 'faqs' && (
        <div className="p-6 bg-[#1E1833] border border-violet-900/40 rounded-2xl shadow-xs space-y-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-violet-900/30">
            <div>
              <div className="flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-bold text-white">Architecture & Security FAQs</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-600/30 text-violet-300 border border-violet-500/30">
                  Interactive Accordion
                </span>
              </div>
              <p className="text-xs text-violet-300/60 mt-1">
                Customize common questions and answers displayed in the accordion on your public homepage.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#19142B] border border-violet-900/40 text-violet-300">
                {(config.faqs || []).length} Question{(config.faqs || []).length !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={handleAddFaq}
                className="px-3.5 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-md shadow-violet-900/30 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question</span>
              </button>
            </div>
          </div>

          {/* FAQ Section Header Inputs */}
          <div className="p-4 bg-[#18122B] border border-violet-900/40 rounded-2xl space-y-3">
            <span className="text-[11px] font-bold text-violet-300 uppercase tracking-wider font-mono">
              FAQ Section Header
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-violet-300/80 mb-1">
                  Section Pill Badge
                </label>
                <input
                  type="text"
                  value={config.faqBadge ?? 'Architecture & Security'}
                  onChange={(e) => setConfig((prev) => ({ ...prev, faqBadge: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-[#130D24] border border-violet-900/40 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-violet-300/80 mb-1">
                  Section Main Headline
                </label>
                <input
                  type="text"
                  value={config.faqTitle ?? 'Frequently Asked Questions'}
                  onChange={(e) => setConfig((prev) => ({ ...prev, faqTitle: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-[#130D24] border border-violet-900/40 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-violet-300/80 mb-1">
                Section Subtitle / Description
              </label>
              <input
                type="text"
                value={config.faqSubtitle ?? 'Everything you need to know about our cryptographic model, data sovereignty, and WebRTC protocols.'}
                onChange={(e) => setConfig((prev) => ({ ...prev, faqSubtitle: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-[#130D24] border border-violet-900/40 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            {(config.faqs || []).map((faq, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition ${
                  faq.enabled !== false
                    ? 'bg-[#231C38] border-violet-900/40 hover:border-violet-700/60'
                    : 'bg-[#19142B]/60 border-violet-950/40 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-violet-900/20">
                  <div className="flex items-center space-x-2.5 flex-1 min-w-0 mr-3">
                    <div className="flex flex-col space-y-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveFaq(idx, -1)}
                        className="p-1 text-violet-400 hover:text-white disabled:opacity-30 disabled:hover:text-violet-400 transition cursor-pointer"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === (config.faqs || []).length - 1}
                        onClick={() => handleMoveFaq(idx, 1)}
                        className="p-1 text-violet-400 hover:text-white disabled:opacity-30 disabled:hover:text-violet-400 transition cursor-pointer"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="w-6 h-6 rounded-lg bg-[#19142B] border border-violet-900/40 flex items-center justify-center text-[10px] font-mono text-violet-300 shrink-0">
                      Q{idx + 1}
                    </span>

                    <span className="font-bold text-xs text-white truncate flex-1">
                      {faq.question || 'Empty Question'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateFaq(idx, 'enabled', faq.enabled === false ? true : false)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition cursor-pointer border ${
                        faq.enabled !== false
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-violet-950/40 text-violet-400/60 border-violet-900/40'
                      }`}
                    >
                      {faq.enabled !== false ? 'ACTIVE' : 'MUTED'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteFaq(idx)}
                      className="p-1.5 text-violet-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
                      title="Delete Question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-violet-300/80 mb-1">
                      Question Heading
                    </label>
                    <input
                      type="text"
                      value={faq.question || ''}
                      onChange={(e) => handleUpdateFaq(idx, 'question', e.target.value)}
                      placeholder="e.g. How does client-side E2EE work?"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[#19142B] border border-violet-900/40 text-white placeholder-violet-400/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-violet-300/80 mb-1">
                      Detailed Answer
                    </label>
                    <textarea
                      rows={3}
                      value={faq.answer || ''}
                      onChange={(e) => handleUpdateFaq(idx, 'answer', e.target.value)}
                      placeholder="Enter detailed technical or privacy answer..."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[#19142B] border border-violet-900/40 text-white placeholder-violet-400/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>
              </div>
            ))}

            {(!config.faqs || config.faqs.length === 0) && (
              <div className="py-10 text-center bg-[#19142B]/50 rounded-2xl border border-dashed border-violet-900/40 text-violet-300/60 text-xs space-y-3">
                <HelpCircle className="w-8 h-8 text-violet-500/40 mx-auto" />
                <p className="font-medium text-white">No FAQ items configured yet.</p>
                <button
                  type="button"
                  onClick={handleAddFaq}
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-md shadow-violet-900/30"
                >
                  + Add First Question
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION: FINAL CALL TO ACTION (CTA) BANNER */}
      {activeSection === 'cta' && (
        <div className="p-6 bg-[#1E1833] border border-violet-900/40 rounded-2xl shadow-xs space-y-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-violet-900/30">
            <div>
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-bold text-white">Final Call to Action Banner</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-600/30 text-violet-300 border border-violet-500/30">
                  Bottom Conversion Block
                </span>
              </div>
              <p className="text-xs text-violet-300/60 mt-1">
                Customize the high-converting closing banner placed right before the footer.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setConfig((prev) => ({
                  ...prev,
                  ctaBanner: {
                    ...prev.ctaBanner,
                    enabled: prev.ctaBanner?.enabled === false ? true : false
                  }
                }))
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition cursor-pointer border ${
                config.ctaBanner?.enabled !== false
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-violet-950/40 text-violet-400/60 border-violet-900/40'
              }`}
            >
              {config.ctaBanner?.enabled !== false ? 'BANNER ENABLED' : 'BANNER DISABLED'}
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <ImageUploader
              label="Banner Background Image (Replaces Plain Gradient)"
              value={config.ctaBanner?.imageUrl}
              token={token}
              aspectRatio="16:9"
              onChange={(url) =>
                setConfig((prev) => ({
                  ...prev,
                  ctaBanner: { ...prev.ctaBanner, imageUrl: url }
                }))
              }
              placeholder="Optional image URL for the bottom conversion banner"
            />

            <div>
              <label className="block text-[11px] font-semibold text-violet-300/80 mb-1">
                Pill Badge Text
              </label>
              <input
                type="text"
                value={config.ctaBanner?.badgeText || ''}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    ctaBanner: { ...prev.ctaBanner, badgeText: e.target.value }
                  }))
                }
                placeholder="e.g. Get Started in Under 30 Seconds"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#19142B] border border-violet-900/40 text-white placeholder-violet-400/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-violet-300/80 mb-1">
                Main Headline
              </label>
              <input
                type="text"
                value={config.ctaBanner?.title || ''}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    ctaBanner: { ...prev.ctaBanner, title: e.target.value }
                  }))
                }
                placeholder="e.g. Ready to Experience Truly Sovereign Communication?"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#19142B] border border-violet-900/40 text-white placeholder-violet-400/30 focus:outline-none focus:ring-2 focus:ring-violet-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-violet-300/80 mb-1">
                Subtitle Prose
              </label>
              <textarea
                rows={3}
                value={config.ctaBanner?.subtitle || ''}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    ctaBanner: { ...prev.ctaBanner, subtitle: e.target.value }
                  }))
                }
                placeholder="Description of security, instant onboarding, or key capabilities..."
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#19142B] border border-violet-900/40 text-white placeholder-violet-400/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-violet-200">Primary Button</span>
                <input
                  type="text"
                  value={config.ctaBanner?.primaryButtonText || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      ctaBanner: { ...prev.ctaBanner, primaryButtonText: e.target.value }
                    }))
                  }
                  placeholder="Button Label (e.g. Create Free Account)"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#19142B] border border-violet-900/40 text-white placeholder-violet-400/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <input
                  type="text"
                  value={config.ctaBanner?.primaryButtonLink || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      ctaBanner: { ...prev.ctaBanner, primaryButtonLink: e.target.value }
                    }))
                  }
                  placeholder="Link URL (e.g. /register)"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#19142B] border border-violet-900/40 text-white placeholder-violet-400/30 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-violet-200">Secondary Button</span>
                <input
                  type="text"
                  value={config.ctaBanner?.secondaryButtonText || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      ctaBanner: { ...prev.ctaBanner, secondaryButtonText: e.target.value }
                    }))
                  }
                  placeholder="Button Label (e.g. Launch Messenger)"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#19142B] border border-violet-900/40 text-white placeholder-violet-400/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <input
                  type="text"
                  value={config.ctaBanner?.secondaryButtonLink || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      ctaBanner: { ...prev.ctaBanner, secondaryButtonLink: e.target.value }
                    }))
                  }
                  placeholder="Link URL (e.g. /login)"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#19142B] border border-violet-900/40 text-white placeholder-violet-400/30 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                />
              </div>
            </div>

            {/* CTA Visual Styling */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-violet-900/40">
              <div>
                <label className="block text-[11px] font-semibold text-violet-200 mb-1">
                  Banner Tint & Contrast
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {[
                    { id: 'deep', label: 'Deep Obsidian' },
                    { id: 'violet', label: 'Violet Aura' },
                    { id: 'slate', label: 'High Contrast' }
                  ].map((tnt) => (
                    <button
                      key={tnt.id}
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          ctaBanner: { ...prev.ctaBanner, tintStyle: tnt.id }
                        }))
                      }
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-medium border text-center transition cursor-pointer ${
                        (config.ctaBanner?.tintStyle || 'deep') === tnt.id
                          ? 'bg-violet-600 text-white border-violet-600 font-bold shadow-xs'
                          : 'bg-[#19142B] text-violet-300 border-violet-900/40 hover:bg-[#221B3A]'
                      }`}
                    >
                      {tnt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-violet-200 mb-1">
                  Button Alignment
                </label>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {[
                    { id: 'center', label: 'Centered' },
                    { id: 'left', label: 'Split Left' }
                  ].map((al) => (
                    <button
                      key={al.id}
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          ctaBanner: { ...prev.ctaBanner, alignment: al.id }
                        }))
                      }
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-medium border text-center transition cursor-pointer ${
                        (config.ctaBanner?.alignment || 'center') === al.id
                          ? 'bg-violet-600 text-white border-violet-600 font-bold shadow-xs'
                          : 'bg-[#19142B] text-violet-300 border-violet-900/40 hover:bg-[#221B3A]'
                      }`}
                    >
                      {al.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
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
  )}

  {/* RIGHT COLUMN: Live Interactive Preview */}
  {viewMode !== 'editor' && (
    <div className={`${viewMode === 'split' ? 'xl:col-span-6 2xl:col-span-7 xl:sticky xl:top-4' : 'w-full max-w-6xl mx-auto'} min-w-0`}>
      <LiveLandingPreview
        config={config}
        activeSection={activeSection}
        onSelectSection={(secId) => setActiveSection(secId)}
        onUpdateFeature={handleUpdateFeature}
        onReorderFeatures={handleReorderFeatures}
      />
    </div>
  )}
</div>

      {/* Floating Bottom Action Dock - Positioned at bottom center, never blocks page content */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1E1833]/95 backdrop-blur-xl border border-violet-500/40 shadow-2xl rounded-2xl px-4 py-2.5 flex items-center space-x-3 text-xs text-white animate-fadeIn">
          <div className="flex items-center space-x-2 pr-3 border-r border-violet-900/40">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_#FBBF24]" />
            <span className="font-semibold text-violet-200">Unsaved Changes</span>
          </div>

          <button
            type="button"
            onClick={handleCancelChanges}
            className="px-3.5 py-1.5 bg-[#231C38] hover:bg-[#2A2242] text-violet-300 hover:text-white rounded-xl border border-violet-900/30 transition cursor-pointer"
          >
            Cancel / Discard
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-violet-900/50 flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>{saving ? 'Publishing...' : 'Save & Publish'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
