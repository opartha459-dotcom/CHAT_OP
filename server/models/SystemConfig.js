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
      customAvatarUpload: { type: Boolean, default: true }
    },
    defaultTheme: {
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
        secondaryCtaLink: { type: String, default: '/login' }
      },
      features: {
        type: [
          {
            title: { type: String, default: '' },
            description: { type: String, default: '' },
            icon: { type: String, default: 'Zap' },
            badge: { type: String, default: '' },
            image: { type: String, default: '' }
          }
        ],
        default: [
          {
            title: 'End-to-End Encryption',
            description: 'Messages are encrypted directly on client devices using Web Crypto AES-256-GCM. The database and backend never possess your plaintext.',
            icon: 'Lock',
            badge: 'E2EE',
            image: ''
          },
          {
            title: 'Zero-Latency Socket.IO',
            description: 'Instant delivery receipts, live typing indicators, presence tracking, emoji reactions, and message editing without reloading.',
            icon: 'Zap',
            badge: 'Instant',
            image: ''
          },
          {
            title: 'Group Governance & Safety',
            description: 'Granular group roles (Owners, Admins, Members), invite links, announcement channels, server-side user blocking, and moderation reports.',
            icon: 'Users',
            badge: 'Admin Control',
            image: ''
          },
          {
            title: 'HD Voice & Video Calls',
            description: 'P2P WebRTC crystal clear audio & video calling with mid-call video conversion, mobile screen sharing, and active speaker detection.',
            icon: 'Video',
            badge: 'WebRTC P2P',
            image: ''
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
            description: { type: String, default: '' }
          }
        ],
        default: [
          { label: 'Uptime', value: '99.99%', description: 'High availability' },
          { label: 'Security', value: 'AES-256', description: 'Zero knowledge' },
          { label: 'Latency', value: '< 50ms', description: 'Socket streaming' }
        ]
      },
      previewSection: {
        enabled: { type: Boolean, default: true },
        title: { type: String, default: 'Engineered for speed, privacy, and modern teams.' },
        description: { type: String, default: 'Crystal clear WebRTC voice & video calls, military-grade end-to-end encryption, and persistent multi-device synchronization.' },
        imageUrl: { type: String, default: '' }
      },
      footer: {
        copyrightText: { type: String, default: 'PulseChat © 2026. Built with React, Tailwind CSS, Express, Socket.IO & MongoDB.' },
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
