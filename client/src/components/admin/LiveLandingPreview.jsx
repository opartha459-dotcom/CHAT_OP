import React, { useState } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  RefreshCw,
  Lock,
  Zap,
  Users,
  Video,
  ShieldCheck,
  Globe,
  Sparkles,
  MessageSquare,
  BarChart3,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  Shield,
  Check,
  Layers,
  Sparkle,
  GripVertical,
  ArrowLeftRight,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Palette,
  MousePointerClick
} from 'lucide-react';
import { PulseLogo } from '../common/PulseLogo';
import { SocialBrandIcon } from '../common/SocialBrandIcon';

const ICON_MAP = {
  Lock,
  Zap,
  Users,
  Video,
  ShieldCheck,
  Smartphone,
  Globe,
  Sparkles,
  MessageSquare,
  BarChart3
};

const renderIcon = (iconName, className = 'w-5 h-5') => {
  const IconComp = ICON_MAP[iconName] || Zap;
  return <IconComp className={className} />;
};

export const LiveLandingPreview = ({
  config,
  activeSection = 'hero',
  onSelectSection,
  onUpdateFeature,
  onReorderFeatures
}) => {
  const [device, setDevice] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [viewScope, setViewScope] = useState('active'); // 'active' | 'full'
  const [zoom, setZoom] = useState(100); // 75 | 85 | 100
  const [gridBg, setGridBg] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [cursorBuilder, setCursorBuilder] = useState(true); // Interactive cursor grid builder toggle
  const [draggedIdx, setDraggedIdx] = useState(null);

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
  } = config || {};

  const activeSocialLinks = (socialLinks || []).filter((s) => s.enabled && s.url);
  const hasHeroImage = Boolean(hero?.showHeroImage && hero?.heroImage);

  // Width container based on selected device mockup
  const getDeviceContainerClass = () => {
    switch (device) {
      case 'mobile':
        return 'w-[375px] max-w-full rounded-[44px] border-[10px] border-[#1C162E] shadow-2xl overflow-hidden relative';
      case 'tablet':
        return 'w-[720px] max-w-full rounded-[32px] border-[10px] border-[#1C162E] shadow-2xl overflow-hidden relative';
      case 'desktop':
      default:
        return 'w-full rounded-2xl border border-violet-900/40 shadow-2xl overflow-hidden relative';
    }
  };

  // Zoom transform style
  const getZoomStyle = () => {
    if (zoom === 100) return {};
    return {
      transform: `scale(${zoom / 100})`,
      transformOrigin: 'top center',
      marginBottom: zoom < 100 ? `-${(100 - zoom) * 3}px` : '0px'
    };
  };

  // Cursor-based helpers to dynamically shape Bento Cards with mouse
  const cycleSpan = (idx, currentSpan) => {
    if (!onUpdateFeature) return;
    const nextMap = {
      auto: 'wide',
      wide: 'full',
      full: 'normal',
      normal: 'auto'
    };
    const nextVal = nextMap[currentSpan || 'auto'] || 'wide';
    onUpdateFeature(idx, 'colSpan', nextVal);
  };

  const cycleLayout = (idx, currentLayout) => {
    if (!onUpdateFeature) return;
    const layouts = ['banner-top', 'banner-bottom', 'card-overlay', 'split', 'icon'];
    const currentIdx = layouts.indexOf(currentLayout || 'banner-top');
    const nextLayout = layouts[(currentIdx + 1) % layouts.length];
    onUpdateFeature(idx, 'layout', nextLayout);
  };

  const cycleImageSize = (idx, currentSize) => {
    if (!onUpdateFeature) return;
    const sizes = ['banner', 'medium', 'compact'];
    const currentIdx = sizes.indexOf(currentSize || 'banner');
    const nextSize = sizes[(currentIdx + 1) % sizes.length];
    onUpdateFeature(idx, 'imageSize', nextSize);
  };

  const moveCard = (idx, direction) => {
    if (!onReorderFeatures) return;
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx >= 0 && targetIdx < (features || []).length) {
      onReorderFeatures(idx, targetIdx);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e, idx) => {
    setDraggedIdx(idx);
    e.dataTransfer.setData('text/plain', String(idx));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    if (onReorderFeatures) {
      onReorderFeatures(draggedIdx, targetIdx);
    }
    setDraggedIdx(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Accent themes for Bento Grid cards
  const ACCENT_THEMES = {
    violet: {
      border: 'border-violet-800/40 hover:border-violet-500/70',
      glow: 'hover:shadow-violet-900/30',
      topGlow: 'group-hover:via-violet-400/80',
      iconBg: 'from-violet-600/30 to-fuchsia-600/20 border-violet-500/40 text-violet-300',
      badge: 'bg-[#120921] text-violet-300 border-violet-800/40',
      check: 'text-violet-400',
      cardBg: 'bg-[#160E2C]/85',
      highlightBg: 'bg-gradient-to-br from-[#1C1236]/90 via-[#160E2C]/90 to-[#120B24]/90'
    },
    cyan: {
      border: 'border-cyan-800/40 hover:border-cyan-500/70',
      glow: 'hover:shadow-cyan-900/30',
      topGlow: 'group-hover:via-cyan-400/80',
      iconBg: 'from-cyan-600/30 to-blue-600/20 border-cyan-500/40 text-cyan-300',
      badge: 'bg-[#06121E] text-cyan-300 border-cyan-800/40',
      check: 'text-cyan-400',
      cardBg: 'bg-[#0A1624]/85',
      highlightBg: 'bg-gradient-to-br from-[#0F1E33]/90 via-[#0B1728]/90 to-[#070F1B]/90'
    },
    emerald: {
      border: 'border-emerald-800/40 hover:border-emerald-500/70',
      glow: 'hover:shadow-emerald-900/30',
      topGlow: 'group-hover:via-emerald-400/80',
      iconBg: 'from-emerald-600/30 to-teal-600/20 border-emerald-500/40 text-emerald-300',
      badge: 'bg-[#05140D] text-emerald-300 border-emerald-800/40',
      check: 'text-emerald-400',
      cardBg: 'bg-[#071810]/85',
      highlightBg: 'bg-gradient-to-br from-[#0C2418]/90 via-[#091C13]/90 to-[#06140D]/90'
    },
    amber: {
      border: 'border-amber-800/40 hover:border-amber-500/70',
      glow: 'hover:shadow-amber-900/30',
      topGlow: 'group-hover:via-amber-400/80',
      iconBg: 'from-amber-600/30 to-orange-600/20 border-amber-500/40 text-amber-300',
      badge: 'bg-[#180E03] text-amber-300 border-amber-800/40',
      check: 'text-amber-400',
      cardBg: 'bg-[#181006]/85',
      highlightBg: 'bg-gradient-to-br from-[#261808]/90 via-[#1D1206]/90 to-[#140C04]/90'
    },
    rose: {
      border: 'border-rose-800/40 hover:border-rose-500/70',
      glow: 'hover:shadow-rose-900/30',
      topGlow: 'group-hover:via-rose-400/80',
      iconBg: 'from-rose-600/30 to-pink-600/20 border-rose-500/40 text-rose-300',
      badge: 'bg-[#1A0812] text-rose-300 border-rose-800/40',
      check: 'text-rose-400',
      cardBg: 'bg-[#180812]/85',
      highlightBg: 'bg-gradient-to-br from-[#270E1B]/90 via-[#1E0B15]/90 to-[#14070E]/90'
    }
  };

  // Helper renderers
  const renderNavbar = () => (
    <nav className="w-full border-b border-violet-900/30 bg-[#07050E]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between text-xs">
      <div className="flex items-center space-x-2">
        <PulseLogo size={24} className="text-violet-500 shrink-0" />
        <span className="font-extrabold tracking-tight text-white font-mono">{brandName}</span>
        {brandTagline && (
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-mono bg-violet-900/40 text-violet-300 border border-violet-700/40">
            {brandTagline}
          </span>
        )}
      </div>

      <div className="flex items-center space-x-3">
        <span className="text-violet-200/70 hover:text-white transition">Sign In</span>
        <span className="px-3 py-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg font-semibold shadow-xs">
          Get Started
        </span>
      </div>
    </nav>
  );

  const renderHeroSection = () => (
    <section className="relative px-5 py-10 sm:py-14 flex flex-col items-center text-center">
      {/* Announcement Badge */}
      {announcementBadge?.enabled && announcementBadge?.text && (
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#18112C] border border-violet-700/40 text-violet-300 text-[10px] font-medium mb-5 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>{announcementBadge.text}</span>
          <ArrowRight className="w-2.5 h-2.5 opacity-60" />
        </div>
      )}

      {/* Main Headline */}
      <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight max-w-3xl leading-tight">
        {hero?.headline || 'Next-Generation Encrypted Real-Time Messaging.'}
      </h1>

      {/* Subheadline */}
      <p className="mt-3.5 text-xs sm:text-sm text-violet-200/75 max-w-2xl leading-relaxed">
        {hero?.subheadline || 'Experience frictionless instant private chats, rich group collaboration, and verifiable End-to-End Encryption.'}
      </p>

      {/* Call to Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={(e) => e.preventDefault()}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-violet-900/40 flex items-center space-x-2 hover:brightness-110 cursor-pointer"
        >
          <span>{hero?.primaryCtaText || 'Create Free Account'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={(e) => e.preventDefault()}
          className="px-4 py-2.5 rounded-xl bg-[#1C1434] hover:bg-[#251B44] text-violet-200 border border-violet-800/40 text-xs font-semibold cursor-pointer"
        >
          {hero?.secondaryCtaText || 'Launch Messenger'}
        </button>
      </div>

      {/* macOS Window Artwork Frame with Traffic Lights */}
      {hasHeroImage && (
        <div className="mt-10 w-full max-w-3xl mx-auto rounded-2xl overflow-hidden border border-violet-800/40 shadow-2xl bg-[#0F0B1E]">
          {/* macOS Title Bar */}
          <div className="px-3.5 py-2.5 bg-[#140D26] border-b border-violet-900/40 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FF5F56' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FFBD2E' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#27C93F' }} />
            </div>

            <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-[#1A1233] border border-violet-700/40 text-[9px] font-mono text-violet-300">
              <Lock className="w-2.5 h-2.5 text-emerald-400" />
              <span>AES-256 E2EE VERIFIED</span>
            </div>

            <div className="w-10" />
          </div>

          {/* Hero Visual Image */}
          <div className="relative w-full aspect-[16/9] max-h-[360px] bg-[#07050E] overflow-hidden">
            <img
              src={hero.heroImage}
              alt="Hero Preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F0B1E] via-transparent to-transparent opacity-40 pointer-events-none" />

            {/* Dock for Social Channels inside Hero Frame */}
            {activeSocialLinks.length > 0 && (
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-center">
                <div className="px-3 py-1.5 rounded-xl bg-[#090515]/90 backdrop-blur-md border border-violet-700/40 flex items-center space-x-2 shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-mono font-bold text-violet-200 uppercase tracking-wider">
                    Community:
                  </span>
                  <div className="flex items-center space-x-2">
                    {activeSocialLinks.map((s, i) => (
                      <span key={i} className="text-violet-300 hover:text-white transition">
                        <SocialBrandIcon platform={s.platform} className="w-3 h-3" />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );

  const renderFeaturesBentoGrid = () => (
    <section className="px-5 py-10 w-full flex flex-col items-center">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto mb-6">
        <span className="px-3 py-0.5 rounded-full bg-violet-600/20 border border-violet-500/30 text-[9px] font-mono font-bold uppercase tracking-widest text-violet-300">
          {featuresBadge}
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-2.5">
          {featuresTitle}
        </h2>
        <p className="text-[11px] sm:text-xs text-violet-300/70 mt-1.5 leading-relaxed">
          {featuresSubtitle}
        </p>

        {/* Cursor Builder Indicator Banner */}
        {cursorBuilder && (
          <div className="mt-4 px-3 py-1.5 rounded-xl bg-violet-950/60 border border-violet-500/40 text-violet-200 text-[11px] inline-flex items-center space-x-2 shadow-md animate-fadeIn">
            <MousePointerClick className="w-3.5 h-3.5 text-violet-400 animate-bounce" />
            <span className="font-semibold">Interactive Cursor Mode:</span>
            <span className="text-violet-300/80">Click card handles below to resize width, swap positions, or change themes in real time!</span>
          </div>
        )}
      </div>

      {/* Bento Grid — columns driven by device state, NOT Tailwind breakpoints */}
      {(() => {
        // Determine actual column count for the simulated device viewport
        const deviceCols =
          device === 'mobile'
            ? 1
            : device === 'tablet'
            ? 2
            : (features.length <= 2 ? Math.max(1, features.length) : 3);
        const gridStyle = { display: 'grid', gridTemplateColumns: `repeat(${deviceCols}, minmax(0, 1fr))`, gap: '1rem' };

        return (
          <div style={gridStyle} className="w-full text-left">
            {features.map((feat, idx) => {
              let colSpanVal = 1;
              let isHighlight = false;
              const currentSpan = feat.colSpan || 'auto';

              if (feat.colSpan === 'full') {
                colSpanVal = deviceCols; // full always = all columns
                isHighlight = true;
              } else if (feat.colSpan === 'wide') {
                colSpanVal = Math.min(2, deviceCols);
                isHighlight = colSpanVal > 1;
              } else if (feat.colSpan === 'normal') {
                colSpanVal = 1;
              } else {
                // Auto-balance
                if (feat.layout === 'split') {
                  colSpanVal = Math.min(2, deviceCols);
                  isHighlight = colSpanVal > 1;
                } else if (deviceCols > 1) {
                  if (features.length === 1) {
                    colSpanVal = deviceCols;
                    isHighlight = true;
                  } else if (features.length === 2) {
                    colSpanVal = 1;
                    isHighlight = true;
                  } else if (features.length === 4 && (idx === 0 || idx === 3)) {
                    colSpanVal = Math.min(2, deviceCols);
                    isHighlight = colSpanVal > 1;
                  } else if (features.length === 5 && idx === 0) {
                    colSpanVal = Math.min(2, deviceCols);
                    isHighlight = colSpanVal > 1;
                  } else if (features.length >= 6 && (idx === 0 || idx === 5)) {
                    colSpanVal = Math.min(2, deviceCols);
                    isHighlight = colSpanVal > 1;
                  }
                }
              }

              const cardStyle = { gridColumn: `span ${colSpanVal} / span ${colSpanVal}` };

              const layout = feat.layout || 'banner-top';
              const imageSize = feat.imageSize || 'banner';
              const imageFit = feat.imageFit || 'cover';
              const hasImage = Boolean(feat.image);
              const th = ACCENT_THEMES[feat.accentColor] || ACCENT_THEMES.violet;
              const fitClass = imageFit === 'contain' ? 'object-contain p-2' : 'object-cover';

              let imgH = 'h-32';
              if (imageSize === 'medium') imgH = 'h-24';
              if (imageSize === 'compact') imgH = 'h-16';
              if (isHighlight && imageSize === 'banner') imgH = 'h-36';

              const isSplitLayout = layout === 'split' && hasImage;
              const isOverlayLayout = layout === 'card-overlay' && hasImage;
              const isBottomLayout = layout === 'banner-bottom' && hasImage;

              // Span label for badge
              const spanLabelMap = {
                auto: 'Auto',
                normal: '1 Col',
                wide: '2 Cols',
                full: '3 Cols (Full)'
              };

              return (
                <div
                  key={idx}
                  style={cardStyle}
                  draggable={cursorBuilder}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, idx)}
                  className={`relative p-5 rounded-2xl ${th.cardBg} border ${th.border} transition-all duration-200 flex flex-col justify-between group overflow-hidden shadow-lg min-w-0 ${
                    isHighlight ? th.highlightBg : ''
                  } ${draggedIdx === idx ? 'opacity-40 border-dashed border-indigo-400' : ''}`}
                >
              {/* Glowing Top Bevel */}
              <div className={`absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-violet-500/0 ${th.topGlow} to-transparent z-20`} />

              {/* CURSOR GRID BUILDER TOOLBAR (DIRECT MOUSE CONTROLS) */}
              {cursorBuilder && (
                <div className="mb-3.5 pb-2.5 border-b border-violet-900/30 flex flex-wrap items-center justify-between gap-y-1.5 gap-x-1 relative z-30 min-w-0">
                  {/* Left: Move Left / Drag / Move Right */}
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveCard(idx, 'left')}
                      className="p-1 rounded-md bg-[#1C1434] hover:bg-violet-900/40 text-violet-300 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                      title="Move card left / up in grid"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>

                    <div
                      className="px-1.5 py-0.5 rounded-md bg-[#18112C] text-violet-400 text-[10px] font-mono flex items-center cursor-grab active:cursor-grabbing"
                      title="Drag with mouse to reorder card position"
                    >
                      <GripVertical className="w-3 h-3" />
                      <span>#{idx + 1}</span>
                    </div>

                    <button
                      type="button"
                      disabled={idx === features.length - 1}
                      onClick={() => moveCard(idx, 'right')}
                      className="p-1 rounded-md bg-[#1C1434] hover:bg-violet-900/40 text-violet-300 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                      title="Move card right / down in grid"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Right: Interactive Span Resizer & Color Dots */}
                  <div className="flex flex-wrap items-center gap-1">
                    {/* Width Span Resizer with Mouse */}
                    <button
                      type="button"
                      onClick={() => cycleSpan(idx, feat.colSpan)}
                      className="px-2 py-0.5 rounded-md bg-violet-950/80 hover:bg-violet-900/90 border border-violet-700/50 text-[9px] font-mono font-bold text-violet-200 flex items-center space-x-1 transition cursor-pointer shadow-xs"
                      title="Click to resize width: 1 Col -> 2 Cols -> 3 Cols"
                    >
                      <ArrowLeftRight className="w-2.5 h-2.5 text-violet-400" />
                      <span>{spanLabelMap[currentSpan] || 'Auto'}</span>
                    </button>

                    {/* Quick Layout Style Toggle with Mouse */}
                    <button
                      type="button"
                      onClick={() => cycleLayout(idx, feat.layout)}
                      className="px-1.5 py-0.5 rounded-md bg-[#1C1434] hover:bg-violet-900/40 border border-violet-800/40 text-[9px] font-mono text-violet-300 transition cursor-pointer"
                      title="Click to cycle layout: Top -> Bottom -> Overlay -> Split -> Icon"
                    >
                      {layout.replace('banner-', '')}
                    </button>

                    {/* Quick Color Swatches with Mouse */}
                    <div className="flex items-center space-x-1 pl-1">
                      {['violet', 'cyan', 'emerald', 'amber', 'rose'].map((cId) => (
                        <button
                          key={cId}
                          type="button"
                          onClick={() => onUpdateFeature && onUpdateFeature(idx, 'accentColor', cId)}
                          className={`w-2.5 h-2.5 rounded-full transition cursor-pointer ${
                            (feat.accentColor || 'violet') === cId
                              ? 'ring-1 ring-white scale-125'
                              : 'opacity-50 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor:
                              cId === 'violet'
                                ? '#A855F7'
                                : cId === 'cyan'
                                ? '#06B6D4'
                                : cId === 'emerald'
                                ? '#10B981'
                                : cId === 'amber'
                                ? '#F59E0B'
                                : '#F43F5E'
                          }}
                          title={`Switch accent to ${cId}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* OVERLAY LAYOUT */}
              {isOverlayLayout ? (
                <>
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <img
                      src={feat.image}
                      alt={feat.title}
                      className={`w-full h-full ${fitClass} filter brightness-[0.35] group-hover:scale-105 transition duration-500`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#07050E] via-[#07050E]/60 to-transparent" />
                  </div>
                  <div className="relative z-10 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between mb-4">
                      {hasImage && (layout === 'icon' || imageSize === 'icon') ? (
                        <img
                          src={feat.image}
                          alt={feat.title}
                          className="w-9 h-9 object-contain rounded-xl border border-violet-700/60 bg-[#120A22] p-1 shadow-xs"
                        />
                      ) : (
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${th.iconBg} border flex items-center justify-center shadow-xs`}>
                          {renderIcon(feat.icon, 'w-4 h-4')}
                        </div>
                      )}
                      {feat.badge && (
                        <span className={`px-2 py-0.5 text-[9px] font-mono font-bold ${th.badge} border rounded-md uppercase`}>
                          {feat.badge}
                        </span>
                      )}
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#0B0716]/85 border border-violet-700/30 backdrop-blur-md mt-6 shadow-xl">
                      <h3 className="font-bold text-white text-xs sm:text-sm mb-1">{feat.title}</h3>
                      <p className="text-[10px] text-violet-200/80 leading-relaxed">{feat.description}</p>
                    </div>
                  </div>
                </>
              ) : isSplitLayout ? (
                /* SPLIT LAYOUT — inline style so it respects device width, not viewport */
                <div
                  style={{ display: 'grid', gridTemplateColumns: colSpanVal >= 2 ? '1fr 1fr' : '1fr', gap: '1rem' }}
                  className="items-center h-full relative z-10"
                >
                  <div className="flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        {hasImage && (layout === 'icon' || imageSize === 'icon') ? (
                          <img
                            src={feat.image}
                            alt={feat.title}
                            className="w-9 h-9 object-contain rounded-xl border border-violet-700/60 bg-[#120A22] p-1 shadow-xs"
                          />
                        ) : (
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${th.iconBg} border flex items-center justify-center shadow-xs`}>
                            {renderIcon(feat.icon, 'w-4 h-4')}
                          </div>
                        )}
                        {feat.badge && (
                          <span className={`px-2 py-0.5 text-[9px] font-mono font-bold ${th.badge} border rounded-md uppercase`}>
                            {feat.badge}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-white text-xs sm:text-sm mb-1">{feat.title}</h3>
                      <p className="text-[10px] text-violet-300/70 leading-relaxed">{feat.description}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-violet-900/30 flex items-center space-x-2 text-[9px] font-mono text-violet-300/80">
                      <Check className={`w-3 h-3 ${th.check}`} />
                      <span>E2EE Cryptographic Verification</span>
                    </div>
                  </div>
                  <div className="w-full h-full min-h-[120px] rounded-xl overflow-hidden border border-violet-800/40 bg-[#120A22] relative">
                    <img src={feat.image} alt={feat.title} className={`w-full h-full ${fitClass}`} />
                  </div>
                </div>
              ) : isBottomLayout ? (
                /* BOTTOM VISUAL */
                <div className="flex flex-col justify-between h-full relative z-10">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      {hasImage && (layout === 'icon' || imageSize === 'icon') ? (
                        <img
                          src={feat.image}
                          alt={feat.title}
                          className="w-9 h-9 object-contain rounded-xl border border-violet-700/60 bg-[#120A22] p-1 shadow-xs"
                        />
                      ) : (
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${th.iconBg} border flex items-center justify-center shadow-xs`}>
                          {renderIcon(feat.icon, 'w-4 h-4')}
                        </div>
                      )}
                      {feat.badge && (
                        <span className={`px-2 py-0.5 text-[9px] font-mono font-bold ${th.badge} border rounded-md uppercase`}>
                          {feat.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-white text-xs sm:text-sm mb-1 break-words">{feat.title}</h3>
                    <p className="text-[10px] text-violet-300/70 leading-relaxed break-words">{feat.description}</p>
                  </div>
                  <div className={`w-full rounded-xl overflow-hidden mt-4 border border-violet-800/40 bg-[#120A22] ${imgH}`}>
                    <img src={feat.image} alt={feat.title} className={`w-full h-full ${fitClass}`} />
                  </div>
                </div>
              ) : (
                /* TOP BANNER / ICON LAYOUT */
                <div className="flex flex-col justify-between h-full relative z-10">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      {hasImage && (layout === 'icon' || imageSize === 'icon') ? (
                        <img
                          src={feat.image}
                          alt={feat.title}
                          className="w-10 h-10 object-contain rounded-xl border border-violet-700/60 bg-[#120A22] p-1 shadow-md"
                        />
                      ) : (
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${th.iconBg} border flex items-center justify-center shadow-xs`}>
                          {renderIcon(feat.icon, 'w-4 h-4')}
                        </div>
                      )}
                      {feat.badge && (
                        <span className={`px-2 py-0.5 text-[9px] font-mono font-bold ${th.badge} border rounded-md uppercase`}>
                          {feat.badge}
                        </span>
                      )}
                    </div>

                    {hasImage && layout !== 'icon' && imageSize !== 'icon' && (
                      <div className={`w-full rounded-xl overflow-hidden mb-3 border border-violet-800/40 bg-[#120A22] ${imgH}`}>
                        <img src={feat.image} alt={feat.title} className={`w-full h-full ${fitClass}`} />
                      </div>
                    )}

                    <h3 className="font-bold text-white text-xs sm:text-sm mb-1 break-words">{feat.title}</h3>
                    <p className="text-[10px] text-violet-300/70 leading-relaxed break-words">{feat.description}</p>
                  </div>

                  {isHighlight && (
                    <div className="mt-4 pt-3 border-t border-violet-900/30 flex items-center space-x-3 text-[9px] font-mono text-violet-300/80">
                      <div className="flex items-center space-x-1">
                        <Check className={`w-3 h-3 ${th.check}`} />
                        <span>AES-256</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Check className={`w-3 h-3 ${th.check}`} />
                        <span>Zero Plaintext</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CORNER RESIZE HANDLE (CLICK TO EXPAND / CYCLE WIDTH) */}
              {cursorBuilder && (
                <div
                  onClick={() => cycleSpan(idx, feat.colSpan)}
                  className="absolute bottom-2 right-2 p-1 rounded-md bg-[#1B1232]/80 hover:bg-violet-600/90 border border-violet-700/40 text-violet-300 hover:text-white transition cursor-pointer z-30 opacity-70 group-hover:opacity-100"
                  title="Click to cycle card width with mouse: 1 Col -> 2 Cols -> 3 Cols"
                >
                  <ArrowLeftRight className="w-2.5 h-2.5" />
                </div>
              )}
            </div>
          );
        })}
        </div>
        );
      })()}
    </section>
  );

  const renderAppShowcase = () => {
    if (!previewSection?.enabled) return null;
    return (
      <section className="px-5 py-8 w-full max-w-3xl mx-auto text-center">
        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
          {previewSection.title || 'Engineered for speed, privacy, and modern teams.'}
        </h3>
        {previewSection.description && (
          <p className="text-xs text-violet-300/70 mt-2 max-w-xl mx-auto">
            {previewSection.description}
          </p>
        )}
        {previewSection.imageUrl && (
          <div className="mt-5 rounded-2xl overflow-hidden border border-violet-800/40 bg-[#110A22] shadow-xl">
            <img src={previewSection.imageUrl} alt="Showcase" className="w-full object-cover max-h-[300px]" />
          </div>
        )}
      </section>
    );
  };

  const renderMetrics = () => {
    if (!stats || stats.length === 0) return null;
    return (
      <section className="px-5 py-6 w-full max-w-3xl mx-auto">
        <div className="rounded-2xl bg-[#140D27]/90 border border-violet-800/40 p-5 grid grid-cols-3 gap-4 text-center divide-x divide-violet-900/40">
          {stats.map((st, i) => (
            <div key={i} className="first:pl-0 pl-2">
              <div className="text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-indigo-300 font-mono">
                {st.value}
              </div>
              <div className="text-[10px] font-bold text-white uppercase font-mono mt-1">{st.label}</div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderTrustHighlights = () => {
    if (!highlightPoints || highlightPoints.length === 0) return null;
    return (
      <section className="px-5 py-6 w-full max-w-3xl mx-auto">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {highlightPoints.map((pt, i) => (
            <div key={i} className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#150E28] border border-violet-800/40 text-[10px] text-violet-300 font-mono">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>{pt}</span>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderCommunitySection = () => {
    if (activeSocialLinks.length === 0) return null;
    return (
      <section className="px-5 py-8 w-full max-w-3xl mx-auto">
        <div className="rounded-2xl bg-[#130C26]/90 border border-violet-800/40 p-6 text-center">
          <span className="text-[9px] font-mono uppercase text-violet-400 font-bold tracking-widest">
            Community Hub
          </span>
          <h3 className="text-base font-bold text-white mt-1">Connect Across the Web</h3>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {activeSocialLinks.map((s, i) => (
              <div key={i} className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-[#1C1434] border border-violet-800/40 text-xs text-violet-200">
                <SocialBrandIcon platform={s.platform} className="w-4 h-4" />
                <span className="font-semibold">{s.name || s.platform}</span>
                <ExternalLink className="w-3 h-3 text-violet-400/60" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const renderFaqs = () => {
    if (!faqs || faqs.length === 0) return null;
    return (
      <section className="px-5 py-8 w-full max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <span className="px-2.5 py-0.5 rounded-full bg-violet-600/20 text-violet-300 text-[9px] font-mono font-bold uppercase">
            {faqBadge}
          </span>
          <h3 className="text-base font-bold text-white mt-1.5">{faqTitle}</h3>
        </div>
        <div className="space-y-2">
          {faqs.map((faq, i) => {
            const isOpen = openFaqIndex === i;
            return (
              <div key={i} className="rounded-xl bg-[#150E28] border border-violet-800/40 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                  className="w-full p-3 text-left flex items-center justify-between text-xs font-semibold text-white cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-violet-400" /> : <ChevronDown className="w-3.5 h-3.5 text-violet-400" />}
                </button>
                {isOpen && (
                  <div className="p-3 pt-0 text-[11px] text-violet-300/80 leading-relaxed border-t border-violet-900/30">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderCtaBanner = () => {
    if (ctaBanner?.enabled === false) return null;
    const bgImg = ctaBanner?.imageUrl || hero?.heroImage;
    return (
      <section className="px-5 py-8 w-full max-w-3xl mx-auto">
        <div className="relative rounded-2xl overflow-hidden border border-violet-700/50 p-6 sm:p-10 text-center shadow-2xl bg-[#150E28]">
          {bgImg && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <img src={bgImg} alt="CTA Background" className="w-full h-full object-cover filter brightness-[0.25]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0617] via-[#0B0617]/75 to-transparent" />
            </div>
          )}
          <div className="relative z-10">
            {ctaBanner?.badgeText && (
              <span className="inline-block px-3 py-0.5 rounded-full bg-violet-600/30 border border-violet-500/40 text-[9px] font-mono font-bold text-violet-300 uppercase tracking-widest mb-3">
                {ctaBanner.badgeText}
              </span>
            )}
            <h3 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight">
              {ctaBanner?.title || 'Ready to Experience Sovereign Communication?'}
            </h3>
            <p className="text-[11px] sm:text-xs text-violet-200/75 mt-2 max-w-xl mx-auto leading-relaxed">
              {ctaBanner?.subtitle || 'Zero tracking cookies, pure cryptographic privacy.'}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={(e) => e.preventDefault()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-violet-900/40 cursor-pointer"
              >
                {ctaBanner?.primaryButtonText || 'Create Free Account'}
              </button>
              <button
                type="button"
                onClick={(e) => e.preventDefault()}
                className="px-4 py-2 rounded-xl bg-[#1F1538] text-violet-200 border border-violet-800/40 text-xs font-semibold cursor-pointer"
              >
                {ctaBanner?.secondaryButtonText || 'Launch Messenger'}
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderFooter = () => (
    <footer className="w-full border-t border-violet-900/40 bg-[#07050E] px-5 py-6 text-center text-xs text-violet-300/60">
      <div className="flex flex-wrap items-center justify-center gap-4 mb-3">
        {(footer?.links || []).map((l, i) => (
          <span key={i} className="hover:text-white transition cursor-pointer">
            {l.label}
          </span>
        ))}
      </div>
      <p className="text-[10px] font-mono">
        {footer?.copyrightText || `© ${new Date().getFullYear()} PulseChat. Zero Server Plaintext.`}
      </p>
    </footer>
  );

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-violet-900/40 bg-slate-50 dark:bg-[#0C081A] shadow-xl overflow-hidden">
      {/* PREVIEW TOOLBAR HEADER */}
      <div className="px-4 py-3 bg-white dark:bg-[#130D26] border-b border-slate-200 dark:border-violet-900/40 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Title & Live Ping Indicator */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>LIVE SYNC</span>
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-white hidden sm:inline">
            Interactive Landing Preview
          </span>
        </div>

        {/* Middle: Device Viewport Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-[#1C1434] p-1 rounded-xl border border-slate-200 dark:border-violet-800/40">
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer ${
              device === 'desktop'
                ? 'bg-violet-600 text-white font-bold shadow-xs'
                : 'text-slate-500 dark:text-violet-300/70 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Desktop View"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setDevice('tablet')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer ${
              device === 'tablet'
                ? 'bg-violet-600 text-white font-bold shadow-xs'
                : 'text-slate-500 dark:text-violet-300/70 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Tablet View"
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Tablet</span>
          </button>
          <button
            type="button"
            onClick={() => setDevice('mobile')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer ${
              device === 'mobile'
                ? 'bg-violet-600 text-white font-bold shadow-xs'
                : 'text-slate-500 dark:text-violet-300/70 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Mobile View"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Mobile</span>
          </button>
        </div>

        {/* Right: Scope Switcher, Cursor Tool Toggle & Zoom */}
        <div className="flex items-center space-x-2">
          {/* Interactive Cursor Grid Builder Toggle */}
          <button
            type="button"
            onClick={() => setCursorBuilder(!cursorBuilder)}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border transition cursor-pointer ${
              cursorBuilder
                ? 'bg-violet-600 text-white border-violet-500 shadow-xs'
                : 'bg-slate-100 dark:bg-[#1C1434] text-slate-500 dark:text-violet-300/70 border-slate-200 dark:border-violet-800/40 hover:text-white'
            }`}
            title="Toggle Mouse Cursor Grid Builder Handles"
          >
            <MousePointerClick className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Cursor Builder</span>
          </button>

          {/* Scope Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-[#1C1434] p-1 rounded-xl border border-slate-200 dark:border-violet-800/40 text-xs">
            <button
              type="button"
              onClick={() => setViewScope('active')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                viewScope === 'active'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-500 dark:text-violet-300/70 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Focus: Section
            </button>
            <button
              type="button"
              onClick={() => setViewScope('full')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                viewScope === 'full'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-500 dark:text-violet-300/70 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Full Page
            </button>
          </div>

          {/* Zoom scale selector */}
          <select
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="px-2 py-1 rounded-lg text-[11px] font-mono bg-slate-100 dark:bg-[#1C1434] border border-slate-200 dark:border-violet-800/40 text-slate-700 dark:text-violet-200 focus:outline-none cursor-pointer"
          >
            <option value={100}>100%</option>
            <option value={85}>85%</option>
            <option value={75}>75%</option>
          </select>
        </div>
      </div>

      {/* PREVIEW CANVAS CONTAINER */}
      <div className="p-4 sm:p-6 bg-[#06040C] overflow-x-auto min-h-[540px] max-h-[780px] overflow-y-auto flex justify-center items-start relative scrollbar-thin">
        {/* Device Bezel Frame */}
        <div className={getDeviceContainerClass()} style={getZoomStyle()}>
          {/* Chrome / Browser Header for Desktop */}
          {device === 'desktop' && (
            <div className="px-3.5 py-2 bg-[#120B22] border-b border-violet-900/50 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FF5F56' }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FFBD2E' }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#27C93F' }} />
              </div>
              <div className="px-4 py-1 rounded-lg bg-[#07050E] border border-violet-900/40 text-[10px] font-mono text-violet-300 flex items-center space-x-1.5 max-w-[200px] w-full justify-center">
                <Lock className="w-2.5 h-2.5 text-emerald-400" />
                <span className="truncate">pulsechat.io</span>
              </div>
              <div className="w-10" />
            </div>
          )}

          {/* Mobile Dynamic Island Notch */}
          {device === 'mobile' && (
            <div className="h-6 bg-[#1C162E] w-full flex items-center justify-center relative">
              <div className="w-20 h-3.5 bg-black rounded-full" />
            </div>
          )}

          {/* Canvas Render Area */}
          <div
            className={`min-h-full bg-[#07050E] text-slate-100 flex flex-col relative w-full antialiased ${
              gridBg ? 'quantix-animated-grid' : ''
            }`}
          >
            {renderNavbar()}

            {viewScope === 'active' ? (
              // FOCUS VIEW: Renders the active section being configured in CMS
              <div className="py-4">
                {activeSection === 'hero' && renderHeroSection()}
                {activeSection === 'brand' && (
                  <div className="p-8 text-center">
                    <span className="text-[10px] font-mono text-violet-400 uppercase tracking-widest">
                      Branding & Announcement Focus
                    </span>
                    <div className="mt-4 p-4 rounded-xl bg-[#140D26] border border-violet-800/40">
                      <h3 className="text-xl font-bold font-mono text-white">{brandName}</h3>
                      <p className="text-xs text-violet-300 font-mono mt-1">{brandTagline}</p>
                    </div>
                  </div>
                )}
                {activeSection === 'features' && renderFeaturesBentoGrid()}
                {activeSection === 'preview' && renderAppShowcase()}
                {activeSection === 'stats' && renderMetrics()}
                {activeSection === 'highlights' && renderTrustHighlights()}
                {activeSection === 'social' && renderCommunitySection()}
                {activeSection === 'faqs' && renderFaqs()}
                {activeSection === 'cta' && renderCtaBanner()}
                {activeSection === 'footer' && renderFooter()}
              </div>
            ) : (
              // FULL PAGE VIEW: Complete landing page flow
              <>
                {renderHeroSection()}
                {renderFeaturesBentoGrid()}
                {renderAppShowcase()}
                {renderMetrics()}
                {renderTrustHighlights()}
                {renderCommunitySection()}
                {renderFaqs()}
                {renderCtaBanner()}
                {renderFooter()}
              </>
            )}

            {/* Mobile Home Swipe Indicator */}
            {device === 'mobile' && (
              <div className="py-2 bg-[#07050E] flex justify-center">
                <div className="w-28 h-1 rounded-full bg-slate-600" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
