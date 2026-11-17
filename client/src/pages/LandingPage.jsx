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
import { DEFAULT_LANDING_CONFIG, HeroBlendedImage } from '../components/admin/LandingCmsTab';

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

  const hasHeroImage = Boolean(hero?.showHeroImage && hero?.heroImage);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* Architectural Background Grid & Ambient Glow */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[500px] bg-gradient-to-b from-indigo-600/20 via-purple-600/10 to-transparent rounded-full blur-[160px] pointer-events-none" />

      {/* ================= FLOATING GLASS NAVBAR ================= */}
      <div className="sticky top-0 z-50 px-4 sm:px-6 pt-4">
        <header className="max-w-6xl mx-auto h-16 px-5 sm:px-8 rounded-2xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-xl shadow-2xl shadow-black/50 flex items-center justify-between">
          {/* Brand Identity */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="group hover:opacity-90 transition flex items-center space-x-2.5">
              {brandLogo ? (
                <>
                  <img
                    src={brandLogo}
                    alt={brandName}
                    className="h-8 max-w-[130px] object-contain rounded-lg"
                  />
                  <span className="text-base font-extrabold text-white tracking-tight">
                    {brandName}
                  </span>
                </>
              ) : (
                <PulseLogo size="md" animated={true} />
              )}
            </Link>

            {brandTagline && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 rounded-md font-mono tracking-wider">
                {brandTagline}
              </span>
            )}
          </div>

          {/* Section Navigation */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-slate-400">
            {features.length > 0 && (
              <a href="#features" className="hover:text-white transition">
                Capabilities
              </a>
            )}
            {previewSection?.enabled && (
              <a href="#showcase" className="hover:text-white transition">
                Interface
              </a>
            )}
            {stats.length > 0 && (
              <a href="#metrics" className="hover:text-white transition">
                Performance
              </a>
            )}
          </nav>

          {/* Auth Actions */}
          <div className="flex items-center space-x-2.5 text-xs font-semibold">
            <Link
              to={hero?.secondaryCtaLink || '/login'}
              className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 transition whitespace-nowrap"
            >
              Sign In
            </Link>
            <Link
              to={hero?.primaryCtaLink || '/register'}
              className="px-4.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            >
              {hero?.primaryCtaText || 'Get Started'}
            </Link>
          </div>
        </header>
      </div>

      {/* Main Content */}
      <main className="flex-1 relative z-10">
        {/* ================= HERO SECTION ================= */}
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28 flex flex-col items-center text-center">
          {/* Announcement Pill */}
          {announcementBadge?.enabled && announcementBadge?.text && (
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-indigo-400 font-medium mb-8 shadow-xl backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse shrink-0" />
              {announcementBadge.link ? (
                <a
                  href={announcementBadge.link}
                  className="hover:underline flex items-center space-x-1.5"
                >
                  <span>{announcementBadge.text}</span>
                  <ArrowRight className="w-3 h-3 opacity-70" />
                </a>
              ) : (
                <span>{announcementBadge.text}</span>
              )}
            </div>
          )}

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-extrabold tracking-tight text-white max-w-4xl leading-[1.08]">
            {hero?.headline || 'Next-Generation Encrypted Real-Time Messaging.'}
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed font-normal">
            {hero?.subheadline ||
              'Experience frictionless instant private chats, rich group collaboration, media sharing, and verifiable End-to-End Encryption with full data sovereignty.'}
          </p>

          {/* Primary & Secondary CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-lg">
            <Link
              to={hero?.primaryCtaLink || '/register'}
              className="w-full sm:w-auto px-7.5 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 transition hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            >
              <span>{hero?.primaryCtaText || 'Create Free Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to={hero?.secondaryCtaLink || '/login'}
              className="w-full sm:w-auto px-7.5 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-sm flex items-center justify-center space-x-2 transition whitespace-nowrap"
            >
              <span>{hero?.secondaryCtaText || 'Launch Messenger'}</span>
            </Link>
          </div>

          {/* Trust Highlights Directly Under CTAs */}
          {highlightPoints && highlightPoints.length > 0 && (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-slate-400 font-medium">
              {highlightPoints.map((pt, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{pt}</span>
                </div>
              ))}
            </div>
          )}

          {/* Hero Visual Stage Directly Below Text Block */}
          {hasHeroImage && (
            <div className="mt-14 w-full max-w-5xl relative">
              <div className="absolute -inset-4 bg-indigo-500/10 rounded-3xl blur-3xl pointer-events-none" />
              <div className="relative">
                <HeroBlendedImage hero={hero} />
              </div>
            </div>
          )}
        </section>

        {/* ================= METRICS / STATS BAND ================= */}
        {stats && stats.length > 0 && (
          <section id="metrics" className="max-w-6xl mx-auto px-6 pb-20 md:pb-28">
            <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-8 md:p-10 shadow-2xl backdrop-blur-md">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80">
                {stats.map((st, idx) => (
                  <div
                    key={idx}
                    className="pt-6 sm:pt-0 sm:px-8 first:pt-0 sm:first:pl-2 sm:last:pr-2 flex flex-col items-center sm:items-start text-center sm:text-left"
                  >
                    <span className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 tracking-tight">
                      {st.value}
                    </span>
                    <span className="text-xs font-bold text-white mt-2 uppercase tracking-wider">
                      {st.label}
                    </span>
                    {st.description && (
                      <span className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {st.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ================= FEATURES ARCHITECTURE GRID ================= */}
        {features && features.length > 0 && (
          <section id="features" className="max-w-6xl mx-auto px-6 py-16 md:py-24">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="px-3.5 py-1 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400">
                Core Capabilities
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-4">
                Built for security, engineered for scale.
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-3 leading-relaxed">
                Discover the enterprise-grade foundation powering real-time conversations with zero compromise.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
              {features.map((feat, idx) => (
                <div
                  key={idx}
                  className="relative p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all duration-300 flex flex-col justify-between group overflow-hidden shadow-lg hover:shadow-indigo-500/5"
                >
                  {/* Top Highlight Accent on Hover */}
                  <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-indigo-500/0 group-hover:via-indigo-400/80 to-transparent transition-all duration-300" />

                  <div>
                    <div className="flex items-center justify-between mb-6">
                      {feat.image ? (
                        <img
                          src={feat.image}
                          alt={feat.title}
                          className="w-12 h-12 object-contain rounded-2xl border border-slate-800 bg-slate-950 p-1.5 shadow-md"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-indigo-950/90 border border-indigo-800/60 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform shadow-inner">
                          {renderIcon(feat.icon)}
                        </div>
                      )}

                      {feat.badge && (
                        <span className="px-3 py-1 text-[10px] font-mono font-bold bg-slate-950 text-indigo-400 border border-slate-800 rounded-lg">
                          {feat.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white mb-2.5 tracking-tight">
                      {feat.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ================= APP INTERFACE SHOWCASE ================= */}
        {previewSection?.enabled && (
          <section id="showcase" className="max-w-6xl mx-auto px-6 py-16 md:py-24">
            <div className="rounded-[2.5rem] bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800/90 p-8 sm:p-14 lg:p-16 relative overflow-hidden shadow-2xl text-center">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

              <div className="max-w-2xl mx-auto space-y-4">
                <span className="inline-flex items-center px-3.5 py-1 bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 text-[10px] font-bold rounded-full uppercase tracking-widest">
                  Full-Featured Experience
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  {previewSection.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {previewSection.description}
                </p>
              </div>

              {previewSection.imageUrl && (
                <div className="mt-12 max-w-5xl mx-auto rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
                  {/* Browser / Encrypted Session Top Bar */}
                  <div className="px-4 py-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                    </div>
                    <div className="flex items-center space-x-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-0.5 rounded-full">
                      <Lock className="w-2.5 h-2.5" />
                      <span>{brandTagline || 'END-TO-END ENCRYPTED'}</span>
                    </div>
                    <div className="w-10" />
                  </div>

                  <img
                    src={previewSection.imageUrl}
                    alt="App Showcase"
                    className="w-full h-auto max-h-[520px] object-cover"
                  />
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-slate-800/80 bg-slate-950 relative z-10 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-slate-200">{brandName}</span>
            <span className="text-slate-700">•</span>
            <span>{footer?.copyrightText || 'PulseChat © 2026. All rights reserved.'}</span>
          </div>

          {footer?.links && footer.links.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-6 text-slate-400">
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
        </div>
      </footer>
    </div>
  );
};