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
  ExternalLink
} from 'lucide-react';
import { PulseLogo } from '../components/common/PulseLogo';
import { useSocket } from '../context/SocketContext';
import { DEFAULT_LANDING_CONFIG } from '../components/admin/LandingCmsTab';

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

export const LandingPage = () => {
  const [config, setConfig] = useState(DEFAULT_LANDING_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const { socket } = useSocket();

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
              hero: { ...DEFAULT_LANDING_CONFIG.hero, ...(data.landingPageConfig.hero || {}) },
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

  // Listen for real-time landing page updates from admin
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
          footer: { ...prev.footer, ...(updatedConfig.footer || {}) }
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
    features = [],
    highlightPoints = [],
    stats = [],
    previewSection,
    footer
  } = config;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="px-6 lg:px-12 py-4 border-b border-slate-800/80 flex items-center justify-between backdrop-blur-md sticky top-0 z-50 bg-slate-950/80">
        <div className="flex items-center space-x-3">
          <Link to="/" className="group hover:opacity-90 transition flex items-center space-x-2.5">
            {brandLogo ? (
              <img
                src={brandLogo}
                alt={brandName}
                className="h-8 max-w-[140px] object-contain rounded-lg"
              />
            ) : (
              <PulseLogo size="md" animated={true} />
            )}
            <span className="text-base font-extrabold text-white tracking-tight hidden xs:inline">
              {brandName}
            </span>
          </Link>

          {brandTagline && (
            <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 rounded-full font-mono">
              {brandTagline}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3 text-xs font-semibold">
          <Link
            to={hero?.secondaryCtaLink || '/login'}
            className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 transition"
          >
            Sign In
          </Link>
          <Link
            to={hero?.primaryCtaLink || '/register'}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition hover:scale-105 active:scale-95"
          >
            {hero?.primaryCtaText || 'Get Started'}
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 md:py-16 text-center max-w-6xl mx-auto relative overflow-hidden w-full">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

        {/* Announcement Badge Chip */}
        {announcementBadge?.enabled && announcementBadge?.text && (
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-indigo-400 font-medium mb-6 shadow-md backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            {announcementBadge.link ? (
              <a
                href={announcementBadge.link}
                className="hover:underline flex items-center space-x-1"
              >
                <span>{announcementBadge.text}</span>
                <ArrowRight className="w-3 h-3 opacity-60" />
              </a>
            ) : (
              <span>{announcementBadge.text}</span>
            )}
          </div>
        )}

        {/* Hero Headline & Subheadline */}
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
          {hero?.headline || 'Next-Generation Encrypted Real-Time Messaging.'}
        </h1>

        <p className="mt-5 text-sm md:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          {hero?.subheadline ||
            'Experience frictionless instant private chats, rich group collaboration, media sharing, and verifiable End-to-End Encryption with full data sovereignty.'}
        </p>

        {/* Hero Call to Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
          <Link
            to={hero?.primaryCtaLink || '/register'}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/25 flex items-center justify-center space-x-2 transition hover:scale-105 active:scale-95"
          >
            <span>{hero?.primaryCtaText || 'Create Free Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to={hero?.secondaryCtaLink || '/login'}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-slate-200 font-semibold text-sm flex items-center justify-center space-x-2 transition"
          >
            <span>{hero?.secondaryCtaText || 'Launch Messenger'}</span>
          </Link>
        </div>

        {/* Optional Hero Banner / Interactive Mockup Image */}
        {hero?.showHeroImage && hero?.heroImage && (
          <div className="mt-12 w-full max-w-4xl relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition duration-500" />
            <div className="relative rounded-2xl md:rounded-3xl overflow-hidden border border-slate-800/90 bg-slate-900 shadow-2xl">
              <img
                src={hero.heroImage}
                alt="Product preview"
                className="w-full h-auto max-h-[500px] object-cover"
              />
            </div>
          </div>
        )}

        {/* Dynamic Stats Banner */}
        {stats && stats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-14 w-full max-w-4xl">
            {stats.map((st, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col items-center justify-center text-center shadow-lg"
              >
                <span className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                  {st.value}
                </span>
                <span className="text-xs font-bold text-slate-200 mt-1">{st.label}</span>
                {st.description && (
                  <span className="text-[11px] text-slate-500 mt-0.5">{st.description}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Dynamic Features Grid */}
        {features && features.length > 0 && (
          <div className="w-full mt-16 text-left">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Built for security, engineered for scale.
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Discover the enterprise-grade foundation powering real-time conversations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition flex flex-col justify-between shadow-lg hover:shadow-indigo-500/5 group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      {feat.image ? (
                        <img
                          src={feat.image}
                          alt={feat.title}
                          className="w-10 h-10 object-contain rounded-xl border border-slate-800"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-indigo-400 flex items-center justify-center">
                          {renderIcon(feat.icon)}
                        </div>
                      )}
                      {feat.badge && (
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-800 text-indigo-400 border border-slate-700/60 rounded-md">
                          {feat.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">{feat.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{feat.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic App Showcase / Preview Section */}
        {previewSection?.enabled && (
          <div className="w-full mt-20 p-8 md:p-12 rounded-3xl bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-slate-800/80 text-center relative overflow-hidden">
            <div className="max-w-2xl mx-auto space-y-3">
              <span className="px-3 py-1 bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 text-[10px] font-bold rounded-full uppercase tracking-wider">
                Full-Featured Experience
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                {previewSection.title}
              </h2>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                {previewSection.description}
              </p>
            </div>

            {previewSection.imageUrl && (
              <div className="mt-8 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl max-w-4xl mx-auto">
                <img
                  src={previewSection.imageUrl}
                  alt="App Showcase"
                  className="w-full h-auto max-h-[460px] object-cover"
                />
              </div>
            )}
          </div>
        )}

        {/* Trust Highlights Checkmarks */}
        {highlightPoints && highlightPoints.length > 0 && (
          <div className="mt-14 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            {highlightPoints.map((pt, idx) => (
              <div key={idx} className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{pt}</span>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Dynamic Footer */}
      <footer className="py-8 px-6 border-t border-slate-800/60 bg-slate-950 text-center text-xs text-slate-500 space-y-3">
        {footer?.links && footer.links.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-5 text-slate-400">
            {footer.links.map((lnk, idx) => (
              <a
                key={idx}
                href={lnk.url || '#'}
                className="hover:text-indigo-400 transition"
              >
                {lnk.label}
              </a>
            ))}
          </div>
        )}
        <p>{footer?.copyrightText || 'PulseChat © 2026. All rights reserved.'}</p>
      </footer>
    </div>
  );
};
