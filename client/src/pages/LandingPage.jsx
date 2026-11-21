import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Zap,
  Lock,
  Users,
  Smartphone,
  Download,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Video,
  Globe,
  MessageSquare,
  BarChart3,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Shield,
  Activity,
  Share2,
  Mic,
  Smile,
  Paperclip,
  CheckCheck,
  Cpu,
  Fingerprint,
  Radio,
  Layers,
  Terminal,
  HelpCircle,
  Key,
  PhoneCall,
  Volume2,
  Check
} from 'lucide-react';
import { PulseLogo } from '../components/common/PulseLogo';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_LANDING_CONFIG, HeroBlendedImage } from '../components/admin/LandingCmsTab';
import { SocialBrandIcon } from '../components/common/SocialBrandIcon';

const ICON_MAP = {
  Lock: Lock,
  Zap: Zap,
  Users: Users,
  Video: Video,
  ShieldCheck: ShieldCheck,
  Smartphone: Smartphone,
  Globe: Globe,
  Sparkles: Sparkles,
  MessageSquare: MessageSquare,
  BarChart3: BarChart3
};

const renderIcon = (iconName, className = 'w-5 h-5') => {
  const IconComp = ICON_MAP[iconName] || Zap;
  return <IconComp className={className} />;
};

const QUANTIX_FAQS = [
  {
    q: 'How does client-side End-to-End Encryption (E2EE) work?',
    a: 'Your messages and call sessions are encrypted directly on your local device using standard Web Crypto API with AES-256-GCM. The encryption keys never leave your browser, meaning the backend servers, database, and internet service providers only ever transmit opaque, mathematically unbreakable ciphertext.'
  },
  {
    q: 'Can the database administrator or server read my conversations?',
    a: 'No. The backend operates on a strict zero-knowledge architecture. Without your device private keys, stored payloads in MongoDB are meaningless cryptographic blobs. Even in the event of an infrastructure compromise, your plaintext remains mathematically protected.'
  },
  {
    q: 'Are peer-to-peer (P2P) voice and video calls encrypted?',
    a: 'Yes. Voice and video streams establish direct WebRTC peer-to-peer connections secured by DTLS-SRTP encryption. Audio and video packets stream directly between call participants without relaying through centralized media servers whenever possible.'
  },
  {
    q: 'Can I export my chat history and account data?',
    a: 'Absolutely. PulseChat includes built-in GDPR compliant data portability. You can export complete, unredacted transcripts in HTML, JSON, or plain text formats, or perform instant cryptographic shredding to purge your data permanently.'
  },
  {
    q: 'Is there a limit on group size or file attachment transfers?',
    a: 'No artificial caps. You can create public or private channels, assign granular administrative privileges (Owners, Admins, Members), and securely upload images, voice notes, audio files, and documents with client-side thumbnail generation.'
  }
];

export const LandingPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [config, setConfig] = useState(DEFAULT_LANDING_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const { socket } = useSocket();

  // Quantix interactive tabs state in Hero Showcase
  const [activeShowcaseTab, setActiveShowcaseTab] = useState('chat'); // 'chat' | 'call' | 'security'
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  useEffect(() => {
    let active = true;

    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/system/landing');
        if (res.ok) {
          const data = await res.json();
          if (active && data.success && data.landingPageConfig) {
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
              },
              socialLinks: Array.isArray(data.landingPageConfig.socialLinks)
                ? data.landingPageConfig.socialLinks
                : DEFAULT_LANDING_CONFIG.socialLinks,
              faqs: Array.isArray(data.landingPageConfig.faqs) && data.landingPageConfig.faqs.length > 0
                ? data.landingPageConfig.faqs
                : DEFAULT_LANDING_CONFIG.faqs,
              ctaBanner: {
                ...DEFAULT_LANDING_CONFIG.ctaBanner,
                ...(data.landingPageConfig.ctaBanner || {})
              }
            });
          }
        }
      } catch (err) {
        console.warn('Failed to load landing config, using defaults:', err);
      } finally {
        if (active) setLoaded(true);
      }
    };

    fetchConfig();

    return () => {
      active = false;
    };
  }, []);

  // Listen for real-time landing page updates from admin CMS
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (updatedConfig) => {
      if (updatedConfig) {
        setConfig((prev) => ({
          ...prev,
          ...updatedConfig,
          hero: { ...prev.hero, ...(updatedConfig.hero || {}) },
          announcementBadge: { ...prev.announcementBadge, ...(updatedConfig.announcementBadge || {}) },
          previewSection: { ...prev.previewSection, ...(updatedConfig.previewSection || {}) },
          footer: { ...prev.footer, ...(updatedConfig.footer || {}) },
          socialLinks: Array.isArray(updatedConfig.socialLinks)
            ? updatedConfig.socialLinks
            : prev.socialLinks,
          faqs: Array.isArray(updatedConfig.faqs)
            ? updatedConfig.faqs
            : prev.faqs,
          ctaBanner: { ...prev.ctaBanner, ...(updatedConfig.ctaBanner || {}) }
        }));
      }
    };

    socket.on('system:landing_updated', handleUpdate);
    return () => {
      socket.off('system:landing_updated', handleUpdate);
    };
  }, [socket]);

  const {
    brandName = 'PulseChat',
    brandTagline = 'AES-256 E2EE',
    brandLogo,
    announcementBadge,
    hero,
    featuresBadge = 'Platform Architecture',
    featuresTitle = 'Built for security, engineered for scale.',
    featuresSubtitle = 'A modern bento architecture combining client-side Web Crypto, real-time Socket.IO, and peer-to-peer WebRTC calling.',
    features = [],
    highlightPoints = [],
    stats = [],
    previewSection,
    socialLinks = [],
    faqBadge = 'Architecture & Security',
    faqTitle = 'Frequently Asked Questions',
    faqSubtitle = 'Everything you need to know about our cryptographic model, data sovereignty, and WebRTC protocols.',
    faqs = [],
    ctaBanner,
    footer
  } = config;

  const hasHeroImage = Boolean(hero?.showHeroImage && hero?.heroImage);
  const activeSocialLinks = (socialLinks || []).filter((s) => s.enabled && s.url);

  return (
    <div className="min-h-screen bg-[#07050E] text-slate-100 flex flex-col items-center selection:bg-violet-600 selection:text-white relative overflow-x-hidden w-full font-sans antialiased">
      {/* ================= QUANTIX FUTURISTIC AMBIENT CANVAS ================= */}
      {/* 1. Quantix Animated Cyber Grid */}
      <div className="fixed inset-0 pointer-events-none quantix-animated-grid opacity-[0.22] z-0" />

      {/* 2. Quantix Cyber Dot Matrix */}
      <div className="fixed inset-0 pointer-events-none quantix-animated-dots opacity-[0.28] z-0" />

      {/* 3. Quantix Sweeping Laser Scanline */}
      <div className="quantix-laser-scanline fixed inset-x-0 h-48 bg-gradient-to-b from-transparent via-violet-500/15 to-transparent pointer-events-none z-0" />

      {/* 4. Top Centered Quantum Purple Spotlight with Breathing Glow Pulse */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1300px] h-[650px] bg-gradient-to-b from-violet-600/30 via-purple-600/15 to-transparent rounded-full blur-[160px] pointer-events-none quantix-glow-pulse z-0" />

      {/* 5. Secondary Lateral Glow Beams */}
      <div className="absolute top-[850px] right-[-100px] w-[550px] h-[550px] bg-fuchsia-600/10 rounded-full blur-[200px] pointer-events-none z-0" />
      <div className="absolute top-[1700px] left-[-100px] w-[650px] h-[650px] bg-indigo-600/10 rounded-full blur-[220px] pointer-events-none z-0" />

      {/* ================= QUANTIX FLOATING PILL NAVBAR ================= */}
      <div className="sticky top-0 z-50 w-full px-4 sm:px-6 pt-4 flex justify-center">
        <header className="w-full max-w-6xl mx-auto h-16 px-5 sm:px-7 rounded-2xl border border-violet-800/40 bg-[#0E0820]/85 backdrop-blur-2xl shadow-2xl shadow-black/80 flex items-center justify-between transition-all">
          {/* Brand Identity */}
          <Link to="/" className="group flex items-center space-x-3 transition hover:opacity-95">
            {brandLogo ? (
              <img
                src={brandLogo}
                alt={brandName}
                className="h-8 max-w-[130px] object-contain rounded-lg shadow-sm"
              />
            ) : (
              <PulseLogo size="md" animated={true} />
            )}
            <span className="text-base font-extrabold text-white tracking-tight">
              {brandName}
            </span>
          </Link>

          {/* Quantix Centered Nav Links */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-medium text-violet-200/75">
            {features.length > 0 && (
              <a href="#capabilities" className="hover:text-white transition duration-150 py-1">
                Capabilities
              </a>
            )}
            {previewSection?.enabled && (
              <a href="#showcase" className="hover:text-white transition duration-150 py-1">
                Showcase
              </a>
            )}
            {activeSocialLinks.length > 0 && (
              <a href="#community" className="hover:text-white transition duration-150 py-1">
                Community
              </a>
            )}
            <a href="#faq" className="hover:text-white transition duration-150 py-1">
              Architecture FAQ
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center space-x-3 text-xs font-semibold">
            {isAuthenticated ? (
              <>
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="px-3 py-1.5 rounded-xl text-violet-300 hover:text-white bg-[#1A1233] hover:bg-violet-900/40 border border-violet-800/40 transition hidden sm:inline-flex items-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                    <span>Admin</span>
                  </Link>
                )}
                <Link
                  to="/chat"
                  className="px-4.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:brightness-110 text-white font-bold shadow-lg shadow-violet-900/50 transition hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap flex items-center space-x-2 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Open Chat</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  to={hero?.secondaryCtaLink || '/login'}
                  className="px-3.5 py-2 rounded-xl text-violet-200/80 hover:text-white hover:bg-white/5 transition whitespace-nowrap cursor-pointer font-medium"
                >
                  Sign In
                </Link>
                <Link
                  to={hero?.primaryCtaLink || '/register'}
                  className="px-4.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:brightness-110 text-white font-bold shadow-lg shadow-violet-900/40 transition hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap cursor-pointer"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </header>
      </div>

      {/* ================= MAIN QUANTIX PAGE BODY ================= */}
      <main className="flex-1 relative z-10 w-full flex flex-col items-center">
        {/* ================= 1. QUANTIX HERO SECTION ================= */}
        <section className="w-full max-w-6xl mx-auto px-6 pt-16 pb-16 md:pt-24 md:pb-24 flex flex-col items-center text-center">
          {/* Shimmer Announcement Pill */}
          {announcementBadge?.enabled && announcementBadge?.text && (
            <div className="inline-flex items-center justify-center space-x-2.5 px-4.5 py-1.5 rounded-full bg-[#18112C]/90 border border-violet-700/40 text-xs text-violet-200 font-medium mb-8 shadow-xl backdrop-blur-md mx-auto group hover:border-violet-500/70 transition-all cursor-pointer">
              <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-ping shadow-[0_0_8px_#E879F9]" />
              {announcementBadge.link ? (
                <a
                  href={announcementBadge.link}
                  className="hover:text-white flex items-center space-x-1.5"
                >
                  <span>{announcementBadge.text}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-violet-400 group-hover:translate-x-1 transition-transform" />
                </a>
              ) : (
                <span>{announcementBadge.text}</span>
              )}
            </div>
          )}

          {/* High-Impact Hero Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-[76px] font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.06] text-center">
            <span className="bg-gradient-to-b from-white via-slate-100 to-violet-300 bg-clip-text text-transparent">
              {hero?.headline || 'Next-Generation Encrypted Real-Time Messaging.'}
            </span>
          </h1>

          {/* Subheadline with Quantix typography */}
          <p className="mt-7 text-base sm:text-lg md:text-xl text-violet-200/70 max-w-2xl mx-auto leading-relaxed font-normal text-center">
            {hero?.subheadline ||
              'Experience frictionless instant private chats, rich group collaboration, media sharing, and verifiable End-to-End Encryption with full data sovereignty.'}
          </p>

          {/* Dual Action Cluster */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-lg mx-auto">
            {isAuthenticated ? (
              <>
                <Link
                  to="/chat"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:brightness-110 text-white font-bold text-sm shadow-xl shadow-violet-900/60 flex items-center justify-center space-x-2.5 transition hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap cursor-pointer"
                >
                  <span>Open PulseChat Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                {user?.role === 'admin' ? (
                  <Link
                    to="/admin"
                    className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-[#1A1331] hover:bg-[#251B42] border border-violet-800/40 text-violet-200 font-semibold text-sm flex items-center justify-center space-x-2 transition whitespace-nowrap cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-violet-400" />
                    <span>Admin Control</span>
                  </Link>
                ) : (
                  <a
                    href="#capabilities"
                    className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-[#1A1331] hover:bg-[#251B42] border border-violet-800/40 text-violet-200 font-semibold text-sm flex items-center justify-center space-x-2 transition whitespace-nowrap cursor-pointer"
                  >
                    <span>Explore Architecture</span>
                  </a>
                )}
              </>
            ) : (
              <>
                <Link
                  to={hero?.primaryCtaLink || '/register'}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:brightness-110 text-white font-bold text-sm shadow-xl shadow-violet-900/60 flex items-center justify-center space-x-2.5 transition hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap cursor-pointer"
                >
                  <span>{hero?.primaryCtaText || 'Create Free Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to={hero?.secondaryCtaLink || '/login'}
                  className="w-full sm:w-auto px-7.5 py-4 rounded-2xl bg-[#1A1331] hover:bg-[#251B42] border border-violet-800/40 text-violet-200 font-semibold text-sm flex items-center justify-center space-x-2 transition whitespace-nowrap cursor-pointer"
                >
                  <span>{hero?.secondaryCtaText || 'Launch Messenger'}</span>
                </Link>
              </>
            )}
          </div>

          {/* Trust Highlights Strip */}
          {highlightPoints && highlightPoints.length > 0 && (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-xs text-violet-300/80 font-medium mx-auto">
              {highlightPoints.map((pt, idx) => (
                <div
                  key={idx}
                  className="flex items-center space-x-2 bg-[#17102C]/90 px-3.5 py-1.5 rounded-full border border-violet-800/30 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{pt}</span>
                </div>
              ))}
            </div>
          )}

          {/* ================= QUANTIX INTERACTIVE HERO SHOWCASE STAGE ================= */}
          <div className="mt-14 w-full max-w-5xl mx-auto relative flex flex-col items-center">
            <div className="absolute -inset-4 bg-gradient-to-r from-violet-600/25 via-fuchsia-600/20 to-indigo-600/25 rounded-3xl blur-3xl pointer-events-none" />

            {hasHeroImage ? (
              <div id="community" className="relative w-full rounded-3xl overflow-hidden border border-violet-800/40 shadow-2xl bg-[#140D27] group">
                {/* Traffic Lights & Security Header of the Showcase Frame */}
                <div className="px-5 py-3 bg-[#130B24] border-b border-violet-900/40 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full shrink-0 shadow-sm transition-transform hover:scale-110" style={{ backgroundColor: '#FF5F56', boxShadow: '0 0 8px rgba(255, 95, 86, 0.8)' }} />
                    <span className="w-3 h-3 rounded-full shrink-0 shadow-sm transition-transform hover:scale-110" style={{ backgroundColor: '#FFBD2E', boxShadow: '0 0 8px rgba(255, 189, 46, 0.8)' }} />
                    <span className="w-3 h-3 rounded-full shrink-0 shadow-sm transition-transform hover:scale-110" style={{ backgroundColor: '#27C93F', boxShadow: '0 0 8px rgba(39, 201, 63, 0.8)' }} />
                  </div>
                  <div className="flex items-center space-x-1.5 text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-3 py-0.5 rounded-full">
                    <Lock className="w-2.5 h-2.5" />
                    <span>{brandTagline || 'AES-256 E2EE VERIFIED'}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-[10px] font-mono text-violet-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34D399]" />
                    <span className="hidden sm:inline">Encrypted Session</span>
                  </div>
                </div>

                {/* The Unobstructed Hero Artwork */}
                <HeroBlendedImage hero={hero} />

                {/* Sleek Integrated Community Dock across bottom of the frame */}
                {activeSocialLinks.length > 0 && (
                  <div className="px-5 sm:px-6 py-3.5 bg-[#0E0820]/95 border-t border-violet-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center space-x-2 text-violet-300 font-mono text-[11px] font-semibold">
                      <Share2 className="w-3.5 h-3.5 text-violet-400" />
                      <span>Official Community & Network</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {activeSocialLinks.map((soc, idx) => (
                        <a
                          key={idx}
                          href={soc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-violet-600/30 border border-white/10 hover:border-violet-500/40 text-violet-200 hover:text-white text-xs font-medium flex items-center space-x-1.5 transition hover:scale-105"
                        >
                          <SocialBrandIcon
                            platform={soc.platform}
                            url={soc.url}
                            iconUrl={soc.iconUrl}
                            autoFetch={soc.autoFetch}
                            className="w-3.5 h-3.5"
                          />
                          <span>{soc.label || soc.platform}</span>
                          <ExternalLink className="w-3 h-3 text-violet-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Quantix High-Fidelity Interactive Dashboard Mockup */
              <div className="relative w-full rounded-3xl overflow-hidden border border-violet-800/40 shadow-2xl bg-[#120B24]/95 backdrop-blur-2xl text-left">
                {/* Showcase Top Window Bar with Switchable Mode Tabs */}
                <div className="px-5 py-3.5 bg-[#1A1233] border-b border-violet-800/40 flex flex-wrap items-center justify-between gap-3">
                  {/* Traffic Lights */}
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: '#FF5F56', boxShadow: '0 0 8px rgba(255, 95, 86, 0.8)' }} />
                    <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: '#FFBD2E', boxShadow: '0 0 8px rgba(255, 189, 46, 0.8)' }} />
                    <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: '#27C93F', boxShadow: '0 0 8px rgba(39, 201, 63, 0.8)' }} />
                  </div>

                  {/* Interactive View Switchers (Quantix pattern) */}
                  <div className="flex items-center space-x-1 bg-[#100921] p-1 rounded-xl border border-violet-900/50 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setActiveShowcaseTab('chat')}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center space-x-1.5 ${activeShowcaseTab === 'chat'
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'text-violet-300/70 hover:text-white'
                        }`}
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Encrypted Chat</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveShowcaseTab('call')}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center space-x-1.5 ${activeShowcaseTab === 'call'
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'text-violet-300/70 hover:text-white'
                        }`}
                    >
                      <Video className="w-3 h-3" />
                      <span>WebRTC Call</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveShowcaseTab('security')}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center space-x-1.5 ${activeShowcaseTab === 'security'
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'text-violet-300/70 hover:text-white'
                        }`}
                    >
                      <Lock className="w-3 h-3" />
                      <span>Security Handshake</span>
                    </button>
                  </div>

                  {/* Live Status indicator */}
                  <div className="flex items-center space-x-2 text-[10px] font-mono text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34D399]" />
                    <span>SOCKET STREAM 12ms</span>
                  </div>
                </div>

                {/* TAB 1: ENCRYPTED CHAT VIEW */}
                {activeShowcaseTab === 'chat' && (
                  <div className="grid grid-cols-1 md:grid-cols-12 min-h-[390px] animate-fadeIn">
                    {/* Left Sidebar Channels */}
                    <div className="hidden md:block md:col-span-4 border-r border-violet-900/30 bg-[#160E2E]/80 p-4 space-y-3">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-violet-400/60 px-2 font-bold">
                        Encrypted Channels
                      </div>

                      <div className="space-y-1.5">
                        <div className="p-2.5 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center space-x-3 cursor-pointer">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0">
                            SG
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-white">Security Guild</span>
                              <span className="text-[9px] text-violet-400 font-mono">13:28</span>
                            </div>
                            <p className="text-[11px] text-violet-300/70 truncate">Key rotation verified ✓✓</p>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl hover:bg-violet-900/20 transition flex items-center space-x-3 cursor-pointer">
                          <div className="w-9 h-9 rounded-full bg-[#1F1735] border border-violet-900/40 flex items-center justify-center font-bold text-xs text-violet-300 shrink-0">
                            AL
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-violet-200">Alex Walker</span>
                              <span className="text-[9px] text-violet-400/60 font-mono">12:15</span>
                            </div>
                            <p className="text-[11px] text-violet-400/60 truncate">Sent AES encrypted voice note</p>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl hover:bg-violet-900/20 transition flex items-center space-x-3 cursor-pointer">
                          <div className="w-9 h-9 rounded-full bg-[#1F1735] border border-violet-900/40 flex items-center justify-center font-bold text-xs text-violet-300 shrink-0">
                            SO
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-violet-200">Sophia Chen</span>
                              <span className="text-[9px] text-violet-400/60 font-mono">10:40</span>
                            </div>
                            <p className="text-[11px] text-violet-400/60 truncate">DTLS P2P session active</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Active Message Thread */}
                    <div className="md:col-span-8 p-5 sm:p-6 flex flex-col justify-between space-y-4 bg-[#120B24]/95">
                      <div className="flex items-center justify-between pb-3 border-b border-violet-900/30">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                            SG
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-xs text-white">Security Guild</span>
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                AES-256 E2EE
                              </span>
                            </div>
                            <p className="text-[10px] text-violet-400 font-mono">5 peers verified • Zero plaintext logs</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-violet-400">
                          <Video className="w-4 h-4 hover:text-white transition cursor-pointer" />
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        </div>
                      </div>

                      <div className="space-y-3.5 flex-1 py-1">
                        <div className="flex items-start space-x-2.5 max-w-md">
                          <div className="w-7 h-7 rounded-full bg-[#1F1735] border border-violet-900/40 text-[10px] font-bold text-violet-300 flex items-center justify-center shrink-0 mt-0.5">
                            AW
                          </div>
                          <div className="p-3.5 rounded-2xl rounded-tl-sm bg-[#1A1233] border border-violet-900/40 shadow-xs space-y-1">
                            <div className="flex items-center justify-between space-x-3">
                              <span className="text-[11px] font-bold text-violet-300">Alex Walker</span>
                              <span className="text-[9px] text-violet-400/60 font-mono">13:27</span>
                            </div>
                            <p className="text-xs text-slate-200 leading-relaxed">
                              Zero-knowledge Web Crypto key rotation completed. All incoming packets are encrypted directly on client browser threads. 🛡️
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start space-x-2.5 max-w-md ml-auto justify-end">
                          <div className="p-3.5 rounded-2xl rounded-tr-sm bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-md shadow-violet-900/40 space-y-1 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <span className="text-[9px] text-violet-200/80 font-mono">13:28</span>
                              <span className="text-[11px] font-bold text-white">You</span>
                            </div>
                            <p className="text-xs leading-relaxed text-left">
                              Confirmed! Database only ever sees encrypted ciphertext. Full data sovereignty preserved. 🔒
                            </p>
                            <div className="flex items-center justify-end space-x-1 text-[10px] text-emerald-300 font-mono">
                              <span>Delivered</span>
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-300 inline" />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 text-[11px] text-violet-400/70 font-mono pt-1">
                          <div className="flex space-x-1">
                            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" />
                          </div>
                          <span>Sophia is typing encrypted message...</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-[#18112C] rounded-2xl border border-violet-800/40 flex items-center space-x-2.5">
                        <Paperclip className="w-4 h-4 text-violet-400 hover:text-white transition cursor-pointer shrink-0 ml-1" />
                        <input
                          type="text"
                          readOnly
                          value="Type encrypted message (AES-256-GCM)..."
                          className="bg-transparent border-none text-xs text-violet-300/60 focus:outline-none flex-1 font-mono cursor-default"
                        />
                        <Mic className="w-4 h-4 text-violet-400 hover:text-white transition cursor-pointer shrink-0" />
                        <div className="w-7 h-7 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-xs shrink-0 cursor-pointer">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: WEBRTC CALL SHOWCASE */}
                {activeShowcaseTab === 'call' && (
                  <div className="p-6 sm:p-8 min-h-[390px] flex flex-col justify-between bg-gradient-to-b from-[#160E2E] to-[#110A22] animate-fadeIn">
                    <div className="flex items-center justify-between pb-4 border-b border-violet-900/30">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-violet-600/30 border border-violet-500/40 text-violet-300 flex items-center justify-center font-bold">
                          <Video className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-white">Quantum Call Session #842</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              DTLS-SRTP P2P
                            </span>
                          </div>
                          <p className="text-xs text-violet-300/70">Ultra HD 1080p60 • Active Speaker Detection</p>
                        </div>
                      </div>
                      <div className="text-xs font-mono text-emerald-400 bg-[#1A1233] px-3 py-1.5 rounded-xl border border-violet-900/40">
                        00:14:32 • 48 kHz Opus
                      </div>
                    </div>

                    {/* Participant Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                      <div className="p-5 rounded-2xl bg-[#1D1438] border border-violet-700/50 flex flex-col items-center text-center space-y-3 relative overflow-hidden">
                        <span className="absolute top-2 right-2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          SPEAKING
                        </span>
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center text-white font-bold text-lg shadow-lg ring-4 ring-violet-500/40 animate-pulse">
                          AW
                        </div>
                        <div>
                          <div className="font-bold text-xs text-white">Alex Walker</div>
                          <div className="text-[10px] text-violet-400 font-mono">Bitrate: 2.4 Mbps</div>
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-[#1A1133] border border-violet-900/30 flex flex-col items-center text-center space-y-3">
                        <div className="w-16 h-16 rounded-full bg-[#241A42] flex items-center justify-center text-violet-300 font-bold text-lg">
                          SC
                        </div>
                        <div>
                          <div className="font-bold text-xs text-white">Sophia Chen</div>
                          <div className="text-[10px] text-violet-400 font-mono">Screen Sharing</div>
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-[#1A1133] border border-violet-900/30 flex flex-col items-center text-center space-y-3">
                        <div className="w-16 h-16 rounded-full bg-[#241A42] flex items-center justify-center text-violet-300 font-bold text-lg">
                          YOU
                        </div>
                        <div>
                          <div className="font-bold text-xs text-white">You (Host)</div>
                          <div className="text-[10px] text-emerald-400 font-mono">Microphone Active</div>
                        </div>
                      </div>
                    </div>

                    {/* Call Control Strip */}
                    <div className="flex items-center justify-center space-x-3 pt-3">
                      <button className="p-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40 transition cursor-pointer">
                        <PhoneCall className="w-4 h-4 rotate-135" />
                      </button>
                      <button className="p-3 rounded-xl bg-[#231A3E] hover:bg-violet-900/40 text-violet-200 border border-violet-900/40 transition cursor-pointer">
                        <Mic className="w-4 h-4" />
                      </button>
                      <button className="p-3 rounded-xl bg-[#231A3E] hover:bg-violet-900/40 text-violet-200 border border-violet-900/40 transition cursor-pointer">
                        <Video className="w-4 h-4" />
                      </button>
                      <button className="p-3 rounded-xl bg-[#231A3E] hover:bg-violet-900/40 text-violet-200 border border-violet-900/40 transition cursor-pointer">
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 3: SECURITY & PROTOCOL VIEW */}
                {activeShowcaseTab === 'security' && (
                  <div className="p-6 sm:p-8 min-h-[390px] flex flex-col justify-between bg-[#130B25] font-mono text-xs animate-fadeIn">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 text-emerald-400 pb-2 border-b border-violet-900/30">
                        <Terminal className="w-4 h-4" />
                        <span className="font-bold tracking-wider">VERIFIED CRYPTOGRAPHIC PROTOCOL AUDIT</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-violet-300/80">
                        <div className="p-4 rounded-xl bg-[#18102E] border border-violet-800/40 space-y-1.5">
                          <div className="text-[10px] text-violet-400 uppercase font-bold">Cipher Standard</div>
                          <div className="text-white font-bold text-sm">AES-256-GCM (NIST Approved)</div>
                          <p className="text-[11px] text-violet-300/60 font-sans">
                            Authenticated encryption ensuring integrity, confidentiality, and anti-replay protection.
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-[#18102E] border border-violet-800/40 space-y-1.5">
                          <div className="text-[10px] text-violet-400 uppercase font-bold">Key Derivation</div>
                          <div className="text-white font-bold text-sm">PBKDF2 / Web Crypto API</div>
                          <p className="text-[11px] text-violet-300/60 font-sans">
                            High iteration client-side salt and key derivation with hardware acceleration.
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-[#18102E] border border-violet-800/40 space-y-1.5">
                          <div className="text-[10px] text-violet-400 uppercase font-bold">Transport Layer</div>
                          <div className="text-white font-bold text-sm">TLS 1.3 + WSS Socket.IO</div>
                          <p className="text-[11px] text-violet-300/60 font-sans">
                            Double encapsulation prevents packet sniffing or ISP traffic interception.
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-[#18102E] border border-violet-800/40 space-y-1.5">
                          <div className="text-[10px] text-violet-400 uppercase font-bold">Zero-Knowledge State</div>
                          <div className="text-emerald-400 font-bold text-sm">100% Cryptographic Sovereignty</div>
                          <p className="text-[11px] text-violet-300/60 font-sans">
                            Database stores strictly ciphertext; private keys never leave user browsers.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-[#1B1233] rounded-xl border border-violet-800/40 flex items-center justify-between text-[11px] text-violet-300">
                      <div className="flex items-center space-x-2">
                        <Lock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Ready for Enterprise & Private Sovereign Deployments</span>
                      </div>
                      <span className="text-emerald-400 font-bold">STATUS: COMPLIANT</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ================= 2. QUANTIX SIGNATURE BENTO GRID (CORE CAPABILITIES) ================= */}
        {features && features.length > 0 && (
          <section id="capabilities" className="w-full max-w-6xl mx-auto px-6 py-16 md:py-24 flex flex-col items-center">
            <div className="text-center max-w-2xl mx-auto mb-16 flex flex-col items-center">
              <span className="px-3.5 py-1 rounded-full bg-violet-600/20 border border-violet-500/30 text-[10px] font-mono font-bold uppercase tracking-widest text-violet-300 mx-auto">
                {featuresBadge}
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mt-4 text-center">
                {featuresTitle}
              </h2>
              <p className="text-xs sm:text-sm text-violet-300/70 mt-3 leading-relaxed text-center">
                {featuresSubtitle}
              </p>
            </div>

            {/* Asymmetrical Perfectly Balanced Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mx-auto text-left">
              {features.map((feat, idx) => {
                // Determine responsive column span:
                // - Respect explicit CMS override feat.colSpan if set ('wide' | 'normal' | 'full')
                // - Otherwise auto-balance so NO row ever has empty holes:
                //   * 4 items: Row 1 is 2+1, Row 2 is 1+2 (staggered diagonal bento) -> 100% full!
                //   * 5 items: Row 1 is 2+1, Row 2 is 1+1+1 -> 100% full!
                //   * 6 items: Row 1 is 2+1, Row 2 is 1+1+1 (or 1+2) -> 100% full!
                let spanClass = 'md:col-span-1 lg:col-span-1';
                let isHighlight = false;

                if (feat.colSpan === 'full') {
                  spanClass = 'md:col-span-2 lg:col-span-3';
                  isHighlight = true;
                } else if (feat.colSpan === 'wide') {
                  spanClass = 'md:col-span-2 lg:col-span-2';
                  isHighlight = true;
                } else if (feat.colSpan === 'normal') {
                  spanClass = 'md:col-span-1 lg:col-span-1';
                  isHighlight = false;
                } else {
                  const total = features.length;
                  if (total === 4) {
                    // Staggered balanced diagonal bento: Card 0 and Card 3 are wide
                    if (idx === 0 || idx === 3) {
                      spanClass = 'md:col-span-2 lg:col-span-2';
                      isHighlight = true;
                    }
                  } else if (total === 5) {
                    if (idx === 0) {
                      spanClass = 'md:col-span-2 lg:col-span-2';
                      isHighlight = true;
                    }
                  } else if (total >= 6) {
                    if (idx === 0 || idx === 5) {
                      spanClass = 'md:col-span-2 lg:col-span-2';
                      isHighlight = true;
                    }
                  } else if (total === 1) {
                    spanClass = 'md:col-span-2 lg:col-span-3';
                    isHighlight = true;
                  }
                }

                const imageSize = feat.imageSize || 'banner'; // 'banner' | 'medium' | 'icon'
                const hasImage = Boolean(feat.image);

                return (
                  <div
                    key={idx}
                    className={`relative p-7 sm:p-8 rounded-3xl bg-[#160E2C]/85 border border-violet-800/40 hover:border-violet-500/70 transition-all duration-300 flex flex-col justify-between group overflow-hidden shadow-xl hover:shadow-violet-900/30 hover:-translate-y-1 backdrop-blur-xl ${spanClass} ${
                      isHighlight
                        ? 'bg-gradient-to-br from-[#1C1236]/90 via-[#160E2C]/90 to-[#120B24]/90'
                        : ''
                    }`}
                  >
                    {/* Glowing Top Bevel Edge */}
                    <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-violet-500/0 group-hover:via-violet-400/80 to-transparent transition-all duration-300" />

                    <div>
                      {/* Card Header: Icon & Badge */}
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center space-x-3">
                          {hasImage && imageSize === 'icon' ? (
                            <img
                              src={feat.image}
                              alt={feat.title}
                              className="w-14 h-14 object-contain rounded-2xl border border-violet-800/40 bg-[#120A22] p-1.5 shadow-md"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600/30 to-fuchsia-600/20 border border-violet-500/40 text-violet-300 flex items-center justify-center group-hover:scale-105 transition-transform shadow-inner">
                              {renderIcon(feat.icon, 'w-6 h-6')}
                            </div>
                          )}
                        </div>

                        {feat.badge && (
                          <span className="px-3 py-1 text-[10px] font-mono font-bold bg-[#120921] text-violet-300 border border-violet-800/40 rounded-lg tracking-wide uppercase">
                            {feat.badge}
                          </span>
                        )}
                      </div>

                      {/* Prominent High-Impact Feature Graphic / Banner */}
                      {hasImage && imageSize !== 'icon' && (
                        <div
                          className={`w-full rounded-2xl overflow-hidden mb-5 border border-violet-800/40 bg-[#120A22] relative group-hover:border-violet-500/60 transition-all shadow-xl group-hover:shadow-violet-900/40 ${imageSize === 'medium'
                            ? 'h-36 sm:h-44'
                            : isHighlight
                              ? 'h-52 sm:h-64'
                              : 'h-44 sm:h-52'
                            }`}
                        >
                          <img
                            src={feat.image}
                            alt={feat.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#160E2C]/70 via-transparent to-transparent pointer-events-none" />
                        </div>
                      )}

                      <h3
                        className={`font-bold text-white mb-2.5 tracking-tight ${isHighlight ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
                          }`}
                      >
                        {feat.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-violet-300/70 leading-relaxed max-w-2xl">
                        {feat.description}
                      </p>
                    </div>

                    {isHighlight && (
                      <div className="mt-6 pt-5 border-t border-violet-900/30 flex flex-wrap items-center gap-4 text-xs font-mono text-violet-300/80">
                        <div className="flex items-center space-x-1.5">
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>AES-256-GCM</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>PBKDF2 Salted Keys</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Zero Server Plaintext</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ================= 4. QUANTIX PERFORMANCE METRICS ================= */}
        {stats && stats.length > 0 && (
          <section id="metrics" className="w-full max-w-6xl mx-auto px-6 py-12 flex justify-center">
            <div className="w-full rounded-3xl bg-gradient-to-b from-[#18102E]/80 to-[#120A24]/80 border border-violet-800/40 p-8 md:p-12 shadow-2xl backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-violet-900/40">
                {stats.map((st, idx) => (
                  <div
                    key={idx}
                    className="pt-6 sm:pt-0 sm:px-8 first:pt-0 sm:first:pl-2 sm:last:pr-2 flex flex-col items-center sm:items-start text-center sm:text-left mx-auto sm:mx-0 w-full"
                  >
                    <span className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 tracking-tight font-mono">
                      {st.value}
                    </span>
                    <span className="text-xs font-bold text-white mt-2.5 uppercase tracking-wider font-mono">
                      {st.label}
                    </span>
                    {st.description && (
                      <span className="text-xs text-violet-300/70 mt-1 leading-relaxed">
                        {st.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ================= 5. QUANTIX APP INTERFACE SHOWCASE ================= */}
        {previewSection?.enabled && (
          <section id="showcase" className="w-full max-w-6xl mx-auto px-6 py-16 md:py-24 flex justify-center">
            <div className="w-full rounded-[2.5rem] bg-gradient-to-b from-[#1C1236] to-[#120B24] border border-violet-800/40 p-8 sm:p-14 lg:p-16 relative overflow-hidden shadow-2xl text-center mx-auto">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

              <div className="max-w-2xl mx-auto space-y-4 flex flex-col items-center">
                <span className="inline-flex items-center justify-center px-4 py-1 bg-violet-600/20 text-violet-300 border border-violet-500/30 text-[10px] font-bold rounded-full uppercase tracking-widest mx-auto font-mono">
                  Full-Featured Interface
                </span>
                <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight text-center">
                  {previewSection.title}
                </h2>
                <p className="text-xs sm:text-sm text-violet-300/70 leading-relaxed text-center">
                  {previewSection.description}
                </p>
              </div>

              {previewSection.imageUrl && (
                <div className="mt-12 max-w-5xl mx-auto rounded-2xl overflow-hidden border border-violet-800/40 bg-[#16102C] shadow-2xl">
                  {/* Encrypted Session Top Bar */}
                  <div className="px-4 py-3 bg-[#1A1233] border-b border-violet-900/40 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: '#FF5F56', boxShadow: '0 0 8px rgba(255, 95, 86, 0.8)' }} />
                      <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: '#FFBD2E', boxShadow: '0 0 8px rgba(255, 189, 46, 0.8)' }} />
                      <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: '#27C93F', boxShadow: '0 0 8px rgba(39, 201, 63, 0.8)' }} />
                    </div>
                    <div className="flex items-center space-x-1.5 text-[10px] font-mono text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3 py-0.5 rounded-full">
                      <Lock className="w-2.5 h-2.5" />
                      <span>{brandTagline || 'END-TO-END ENCRYPTED'}</span>
                    </div>
                    <div className="w-10" />
                  </div>

                  <img
                    src={previewSection.imageUrl}
                    alt="App Showcase"
                    className="w-full h-auto max-h-[520px] object-cover mx-auto"
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* ================= 6. QUANTIX ARCHITECTURAL FAQ ACCORDION ================= */}
        {(() => {
          const activeFaqs = Array.isArray(faqs) && faqs.length > 0
            ? faqs.filter((f) => f.enabled !== false)
            : QUANTIX_FAQS.map((f) => ({ question: f.q, answer: f.a }));

          if (!activeFaqs || activeFaqs.length === 0) return null;

          return (
            <section id="faq" className="w-full max-w-5xl mx-auto px-6 py-16 md:py-24 flex flex-col items-center">
              <div className="text-center max-w-2xl mx-auto mb-12 flex flex-col items-center">
                <span className="px-3.5 py-1 rounded-full bg-violet-600/20 border border-violet-500/30 text-[10px] font-mono font-bold uppercase tracking-widest text-violet-300 mx-auto">
                  {faqBadge}
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-4 text-center">
                  {faqTitle}
                </h2>
                <p className="text-xs sm:text-sm text-violet-300/70 mt-2.5 text-center">
                  {faqSubtitle}
                </p>
              </div>

              <div className="w-full space-y-3">
                {activeFaqs.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl bg-[#160E2C]/80 border border-violet-800/40 overflow-hidden transition-all duration-200"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full px-6 py-4.5 flex items-center justify-between text-left cursor-pointer hover:bg-violet-900/20 transition"
                      >
                        <span className="font-bold text-sm text-white pr-4">{faq.question}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-violet-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-fuchsia-400' : ''
                            }`}
                        />
                      </button>

                      {isOpen && (
                        <div className="px-6 pb-5 pt-1 text-xs text-violet-200/70 leading-relaxed border-t border-violet-900/30 animate-fadeIn">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* ================= 7. QUANTIX FINAL CONVERSION IMAGE BANNER ================= */}
        {ctaBanner?.enabled !== false && (
          <section className="w-full max-w-6xl mx-auto px-6 py-14 md:py-20 flex justify-center">
            <div className="w-full rounded-[2.5rem] overflow-hidden border border-violet-800/40 relative shadow-2xl bg-[#120B24] group min-h-[360px] sm:min-h-[420px] flex items-center justify-center">
              {/* Background Image (replacing plain gradient) */}
              <img
                src={ctaBanner?.imageUrl || hero?.heroImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80'}
                alt="Call to action background"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter brightness-[0.55]"
              />

              {/* Ambient Scrim for crystal clear readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/65 pointer-events-none" />
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />

              {/* Content with Text Borders and Action Buttons on the Image */}
              <div className="relative z-10 flex flex-col items-center justify-center p-8 sm:p-14 text-center max-w-3xl mx-auto">
                <span className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-mono font-bold text-violet-200 uppercase tracking-widest mb-4 shadow-lg">
                  <Sparkles className="w-3 h-3 text-fuchsia-400" />
                  <span>{ctaBanner?.badgeText || 'Get Started in Under 30 Seconds'}</span>
                </span>

                <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
                  {ctaBanner?.title || 'Ready to Experience Truly Sovereign Communication?'}
                </h2>

                <p className="mt-4 text-xs sm:text-base text-violet-100 max-w-xl leading-relaxed drop-shadow-md">
                  {ctaBanner?.subtitle || 'Create your account with instant client-side key generation. No phone number required, zero tracking cookies, pure cryptographic privacy.'}
                </p>

                {/* Buttons with clean borders on the image */}
                <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
                  <Link
                    to={ctaBanner?.primaryButtonLink || hero?.primaryCtaLink || '/register'}
                    className="px-8 py-3.5 rounded-2xl bg-violet-600/90 hover:bg-violet-600 border border-violet-400/50 hover:border-violet-300 text-white font-bold text-sm shadow-xl shadow-black/60 flex items-center space-x-2 transition hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
                  >
                    <span>{ctaBanner?.primaryButtonText || hero?.primaryCtaText || 'Create Free Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to={ctaBanner?.secondaryButtonLink || hero?.secondaryCtaLink || '/login'}
                    className="px-8 py-3.5 rounded-2xl bg-black/50 hover:bg-black/70 border border-white/25 hover:border-white/50 text-white font-semibold text-sm transition cursor-pointer backdrop-blur-md"
                  >
                    <span>{ctaBanner?.secondaryButtonText || hero?.secondaryCtaText || 'Launch Messenger'}</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ================= QUANTIX RICH FOOTER ================= */}
      <footer className="border-t border-violet-900/40 bg-[#0C071A] relative z-10 w-full flex justify-center">
        <div className="max-w-6xl w-full mx-auto px-6 py-14 flex flex-col space-y-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-8 border-b border-violet-900/30">
            {/* Brand identity column */}
            <div className="space-y-3 max-w-sm">
              <div className="flex items-center space-x-3">
                {brandLogo ? (
                  <img src={brandLogo} alt={brandName} className="h-7 object-contain rounded-md" />
                ) : (
                  <PulseLogo size="sm" />
                )}
                <span className="font-extrabold text-lg text-white tracking-tight">{brandName}</span>
              </div>
              <p className="text-xs text-violet-300/60 leading-relaxed">
                Next-generation encrypted messenger with zero-knowledge AES-256-GCM cryptography, DTLS-SRTP WebRTC peer calling, and verified data sovereignty.
              </p>
            </div>

            {/* Social channels row */}
            {activeSocialLinks.length > 0 && (
              <div className="flex flex-col sm:items-end space-y-2.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-violet-400/80 font-bold">
                  Official Channels & Community
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {activeSocialLinks.map((soc, idx) => (
                    <a
                      key={idx}
                      href={soc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-xl bg-[#1C1337] hover:bg-violet-900/50 border border-violet-800/40 text-violet-200 hover:text-white flex items-center justify-center p-2 transition hover:scale-105 shadow-xs cursor-pointer"
                      title={soc.label || soc.platform}
                    >
                      <SocialBrandIcon
                        platform={soc.platform}
                        url={soc.url}
                        iconUrl={soc.iconUrl}
                        autoFetch={soc.autoFetch}
                        className="w-4 h-4"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar: Copyright & Operational Status */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-violet-400/60">
            <div className="flex items-center space-x-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399]" />
              <span className="text-emerald-400/90 font-mono text-[11px] font-bold">All Systems Operational</span>
              <span>•</span>
              <span>{footer?.copyrightText || 'PulseChat © 2026. All rights reserved.'}</span>
            </div>

            {footer?.links && footer.links.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-6 text-violet-300/80">
                {footer.links.map((lnk, idx) => (
                  <a
                    key={idx}
                    href={lnk.url || '#'}
                    className="hover:text-white transition duration-150"
                  >
                    {lnk.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

