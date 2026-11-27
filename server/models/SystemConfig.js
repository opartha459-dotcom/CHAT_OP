const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'system_settings'
    },
    featureFlags: {
      chatEnabled: { type: Boolean, default: true },
      statusesEnabled: { type: Boolean, default: true },
      callsEnabled: { type: Boolean, default: true },
      fileSharingEnabled: { type: Boolean, default: true },
      userRegistrationEnabled: { type: Boolean, default: true },
      notificationsEnabled: { type: Boolean, default: true },
      voiceMessagesEnabled: { type: Boolean, default: true },
      pollsEnabled: { type: Boolean, default: true },
      announcementsEnabled: { type: Boolean, default: true },
      e2eeEnabled: { type: Boolean, default: true },
      customAvatarUpload: { type: Boolean, default: true },
      allowOldDataRequests: { type: Boolean, default: true }
    },
    defaultTheme: {
      appName: { type: String, default: 'PulseChat' },
      appTagline: { type: String, default: 'Encrypted Messenger' },
      appLogoUrl: { type: String, default: '' },
      faviconUrl: { type: String, default: '' },
      accentColor: { type: String, default: 'indigo' },
      primaryColor: { type: String, default: '#6366f1' },
      primaryHover: { type: String, default: '#4f46e5' },
      primaryLight: { type: String, default: 'rgba(99, 102, 241, 0.15)' },
      primaryBorder: { type: String, default: 'rgba(99, 102, 241, 0.35)' },
      secondaryColor: { type: String, default: '#10b981' },
      mode: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
      fontFamily: { type: String, default: 'Inter' },
      fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
      fontWeightNormal: { type: String, default: '400' },
      fontWeightHeading: { type: String, default: '700' },
      headingLetterSpacing: { type: String, default: '-0.02em' },
      headingTransform: { type: String, default: 'none' }
    },
    storyRingConfig: {
      official: {
        type: { type: String, enum: ['solid', 'gradient'], default: 'gradient' },
        solidColor: { type: String, default: '#8b5cf6' },
        gradientColors: {
          type: [String],
          default: ['#8b5cf6', '#d946ef', '#6366f1']
        },
        gradientAngle: { type: Number, default: 45 }
      },
      user: {
        type: { type: String, enum: ['solid', 'gradient'], default: 'gradient' },
        solidColor: { type: String, default: '#6366f1' },
        gradientColors: {
          type: [String],
          default: ['#6366f1', '#a855f7', '#ec4899']
        },
        gradientAngle: { type: Number, default: 45 }
      },
      viewedColor: { type: String, default: '#94a3b8' }
    },
    databaseAssignments: {
      authDb: { type: String, default: 'primary' },
      messagesDb: { type: String, default: 'primary' },
      groupsDb: { type: String, default: 'primary' },
      auditDb: { type: String, default: 'primary' },
      retentionDb: { type: String, default: 'primary' }
    },
    retentionSettings: {
      retentionDays: { type: Number, default: 14 },
      requireAdminApprovalForPermanentDelete: { type: Boolean, default: true }
    },
    loaderConfig: {
      style:          { type: String, enum: ['cyber', 'minimal', 'neon', 'retro', 'glitch'], default: 'cyber' },
      rainChars:      { type: String, default: '01' },   // e.g. "01", "hex", "katakana", "custom"
      customChars:    { type: String, default: '' },      // used when rainChars === 'custom'
      rainColor:      { type: String, default: '#10b981' },
      rainGlowColor:  { type: String, default: '#059669' },
      bgColor:        { type: String, default: '#050811' },
      accentColor:    { type: String, default: '#10b981' },
      panelTitle:     { type: String, default: 'PULSECHAT' },
      panelSubtitle:  { type: String, default: '01 GREEN DATA MATRIX // QUANTUM ENCRYPTED' },
      securityBadge:  { type: String, default: 'CYBER TUNNEL ACTIVE // SECURE HANDSHAKE OK' },
      statusMessages: {
        type: [String],
        default: [
          'STREAMING 01 DATA CLOUD MATRIX...',
          'VERIFYING QUANTUM E2EE SESSION...',
          'DECRYPTING WORKSPACE ENVIRONMENT...',
          'SYNCHRONIZING CONVERSATIONS & CHATS...',
          'SYSTEM SYNCHRONIZED // DIVIDING GATE...'
        ]
      },
      showBinaryTicker: { type: Boolean, default: true },
      showSecurityBadge: { type: Boolean, default: true },
      splitDuration:    { type: Number, default: 800 },
      minDuration:      { type: Number, default: 2000 }
    },
    landingPageConfig: {
      brandName: { type: String, default: 'PulseChat' },
      brandTagline: { type: String, default: 'AES-256 E2EE' },
      brandLogo: { type: String, default: '' },
      announcementBadge: {
        enabled: { type: Boolean, default: true },
        text: { type: String, default: 'Real-time Socket.IO messaging with client-side Web Crypto' },
        link: { type: String, default: '' }
      },
      hero: {
        headline: { type: String, default: 'Next-Generation Encrypted Real-Time Messaging.' },
        subheadline: { type: String, default: 'Experience frictionless instant private chats, rich group collaboration, media sharing, and verifiable End-to-End Encryption with full data sovereignty.' },
        heroImage: { type: String, default: '' },
        showHeroImage: { type: Boolean, default: true },
        primaryCtaText: { type: String, default: 'Create Free Account' },
        primaryCtaLink: { type: String, default: '/register' },
        secondaryCtaText: { type: String, default: 'Launch Messenger' },
        secondaryCtaLink: { type: String, default: '/login' },
        gradientPreset: { type: String, default: 'indigo-purple' },
        gradientDirection: { type: String, default: 'bottom-fade' },
        gradientCustomColors: {
          from: { type: String, default: '#6366f1' },
          via: { type: String, default: '#a855f7' },
          to: { type: String, default: '#020617' }
        },
        blendIntensity: { type: Number, default: 75 },
        blendMode: { type: String, default: 'normal' },
        buttonStyle: { type: String, default: 'gradient' },
        windowChrome: { type: String, default: 'traffic' },
        badgeStyle: { type: String, default: 'pulse' }
      },
      featuresBadge: { type: String, default: 'Platform Architecture' },
      featuresTitle: { type: String, default: 'Built for security, engineered for scale.' },
      featuresSubtitle: { type: String, default: 'A modern bento architecture combining client-side Web Crypto, real-time Socket.IO, and peer-to-peer WebRTC calling.' },
      features: {
        type: [
          {
            title: { type: String, default: '' },
            description: { type: String, default: '' },
            icon: { type: String, default: 'Zap' },
            badge: { type: String, default: '' },
            image: { type: String, default: '' },
            imageSize: { type: String, default: 'banner' },
            imageFit: { type: String, default: 'cover' },
            colSpan: { type: String, default: 'auto' },
            layout: { type: String, default: 'banner-top' },
            accentColor: { type: String, default: 'violet' },
            cardStyle: { type: String, default: 'deep' }
          }
        ],
        default: [
          {
            title: 'End-to-End Encryption',
            description: 'Messages are encrypted directly on client devices using Web Crypto AES-256-GCM. The database and backend never possess your plaintext.',
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
            description: 'Instant delivery receipts, live typing indicators, presence tracking, emoji reactions, and message editing without reloading.',
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
            description: 'Granular group roles (Owners, Admins, Members), invite links, announcement channels, server-side user blocking, and moderation reports.',
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
            description: 'P2P WebRTC crystal clear audio & video calling with mid-call video conversion, mobile screen sharing, and active speaker detection.',
            icon: 'Video',
            badge: 'WebRTC P2P',
            image: '',
            imageSize: 'banner',
            imageFit: 'cover',
            colSpan: 'auto',
            layout: 'banner-top',
            accentColor: 'rose'
          }
        ]
      },
      highlightPoints: {
        type: [String],
        default: [
          'Chat Transcript Export (HTML, JSON, TXT)',
          'GDPR Data Portability',
          'Multi-Session Device Management',
          'Peer-to-Peer Encrypted Voice & Video'
        ]
      },
      stats: {
        type: [
          {
            label: { type: String, default: '' },
            value: { type: String, default: '' },
            description: { type: String, default: '' },
            accentColor: { type: String, default: 'violet' }
          }
        ],
        default: [
          { label: 'Uptime', value: '99.99%', description: 'High availability', accentColor: 'violet' },
          { label: 'Security', value: 'AES-256', description: 'Zero knowledge', accentColor: 'emerald' },
          { label: 'Latency', value: '< 50ms', description: 'Socket streaming', accentColor: 'cyan' }
        ]
      },
      statsWrapperColor: { type: String, default: 'aurora' },
      statsWrapperGlow: { type: Boolean, default: true },
      statsAlignment: { type: String, default: 'center' },
      // Master Glow & Cyber Grid Visual Controls
      boxGlow: { type: Boolean, default: true },
      boxGlowIntensity: { type: String, default: 'medium' },
      boxGlowColor: { type: String, default: 'auto' },
      textGlow: { type: Boolean, default: true },
      textGlowIntensity: { type: String, default: 'medium' },
      textGlowColor: { type: String, default: 'auto' },
      gridColor: { type: String, default: 'violet' },
      gridCustomHex: { type: String, default: '#a855f7' },
      gridOpacity: { type: Number, default: 22 },
      gridStyle: { type: String, default: 'grid-dots' },
      gridScanline: { type: Boolean, default: true },
      gridSpotlight: { type: Boolean, default: true },
      previewSection: {
        enabled: { type: Boolean, default: true },
        title: { type: String, default: 'Engineered for speed, privacy, and modern teams.' },
        description: { type: String, default: 'Crystal clear WebRTC voice & video calls, military-grade end-to-end encryption, and persistent multi-device synchronization.' },
        imageUrl: { type: String, default: '' }
      },
      footer: {
        copyrightText: { type: String, default: 'PulseChat © 2026. Built with React, Tailwind CSS, Express, Socket.IO & MongoDB.' },
        bigText: { type: String, default: 'YOUR_BRAIN' },
        links: {
          type: [
            {
              label: { type: String, default: '' },
              url: { type: String, default: '' }
            }
          ],
          default: [
            { label: 'Privacy Policy', url: '#' },
            { label: 'Terms of Service', url: '#' },
            { label: 'Security Whitepaper', url: '#' }
          ]
        }
      },
      socialLinks: {
        type: [
          {
            platform: { type: String, default: 'other' },
            label: { type: String, default: '' },
            url: { type: String, default: '' },
            iconUrl: { type: String, default: '' },
            autoFetch: { type: Boolean, default: true },
            enabled: { type: Boolean, default: true }
          }
        ],
        default: [
          { platform: 'github', label: 'GitHub', url: 'https://github.com', iconUrl: '', autoFetch: true, enabled: true },
          { platform: 'x', label: 'X (Twitter)', url: 'https://x.com', iconUrl: '', autoFetch: true, enabled: true },
          { platform: 'discord', label: 'Discord', url: 'https://discord.gg', iconUrl: '', autoFetch: true, enabled: true },
          { platform: 'telegram', label: 'Telegram', url: 'https://t.me', iconUrl: '', autoFetch: true, enabled: true }
        ]
      },
      faqBadge: { type: String, default: 'Architecture & Security' },
      faqTitle: { type: String, default: 'Frequently Asked Questions' },
      faqSubtitle: { type: String, default: 'Everything you need to know about our cryptographic model, data sovereignty, and WebRTC protocols.' },
      faqs: {
        type: [
          {
            question: { type: String, default: '' },
            answer: { type: String, default: '' },
            enabled: { type: Boolean, default: true }
          }
        ],
        default: [
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
        ]
      },
      ctaBanner: {
        enabled: { type: Boolean, default: true },
        imageUrl: { type: String, default: '' },
        badgeText: { type: String, default: 'Get Started in Under 30 Seconds' },
        title: { type: String, default: 'Ready to Experience Truly Sovereign Communication?' },
        subtitle: { type: String, default: 'Create your account with instant client-side key generation. No phone number required, zero tracking cookies, pure cryptographic privacy.' },
        primaryButtonText: { type: String, default: 'Create Free Account' },
        primaryButtonLink: { type: String, default: '/register' },
        secondaryButtonText: { type: String, default: 'Launch Messenger' },
        secondaryButtonLink: { type: String, default: '/login' },
        tintStyle: { type: String, default: 'deep' },
        alignment: { type: String, default: 'center' }
      }
    },
    officialContact: {
      phone: { type: String, default: '+1 (555) 234-5678' },
      displayPhone: { type: String, default: '+1 (555) 234-5678' },
      email: { type: String, default: 'admin@pulsechat.internal' },
      description: { type: String, default: 'Official Administrator Support & Verification Line' },
      availableHours: { type: String, default: '24/7 Priority Support' },
      instructions: { type: String, default: 'Contact the administrator directly to receive your 6-digit verification code.' },
      enabled: { type: Boolean, default: true }
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
