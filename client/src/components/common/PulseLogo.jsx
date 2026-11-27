import React from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * PulseLogo - Dynamic brand logo for the application.
 * Renders custom uploaded logo & app name when configured in Admin App Customization,
 * falling back to the default PulseChat vector logo.
 */
export const PulseLogo = ({
  size = 'md',
  showText = true,
  subtitle = null,
  animated = true,
  className = '',
  textClassName = '',
  iconOnly = false,
  showBeacon = false
}) => {
  const { activeTheme } = useTheme();
  const customLogoUrl = activeTheme?.appLogoUrl || '';
  const customAppName = activeTheme?.appName?.trim() || 'PulseChat';
  // Size presets
  const sizeMap = {
    xs: { icon: 24, font: 'text-sm', badge: 'text-[9px]' },
    sm: { icon: 32, font: 'text-base', badge: 'text-[10px]' },
    md: { icon: 42, font: 'text-2xl', badge: 'text-[10px]' },
    lg: { icon: 52, font: 'text-3xl', badge: 'text-xs' },
    xl: { icon: 68, font: 'text-4xl', badge: 'text-sm' }
  };

  const currentSize = typeof size === 'number' ? { icon: size, font: 'text-xl' } : sizeMap[size] || sizeMap.md;
  const iconPx = currentSize.icon;

  return (
    <div className={`inline-flex items-center space-x-3 select-none ${className}`}>
      {/* Icon Container with glowing layered backdrop */}
      <div
        className={`relative flex items-center justify-center flex-shrink-0 group ${animated ? 'transition-transform duration-300 hover:scale-105' : ''
          }`}
        style={{ width: iconPx, height: iconPx }}
      >
        {/* Ambient clean backdrop glow */}
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 opacity-25 blur-md pointer-events-none ${animated ? 'group-hover:opacity-50 group-hover:blur-lg transition-all duration-300' : ''
            }`}
        />

        {/* Crisp custom image or vector logo */}
        {customLogoUrl ? (
          <img
            src={customLogoUrl}
            alt={customAppName}
            className="w-full h-full object-cover rounded-2xl relative z-10 drop-shadow-md"
          />
        ) : (
        <svg
          viewBox="0 0 100 100"
          width={iconPx}
          height={iconPx}
          className="relative z-10 drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Deep Clean Squircle Gradient */}
            <linearGradient id="plSquircleBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f111a" />
              <stop offset="50%" stopColor="#151226" />
              <stop offset="100%" stopColor="#0b0a14" />
            </linearGradient>

            {/* Glowing Border Gradient - Unified Indigo/Violet */}
            <linearGradient id="plBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>

            {/* Electric Pulse Wave Gradient - Clean Cyan to Violet */}
            <linearGradient id="plWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="45%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>

            {/* Bubble Shimmer Gradient */}
            <linearGradient id="plBubbleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.08" />
            </linearGradient>

            {/* Drop shadow / glow filters */}
            <filter id="plGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="plSparkle" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="sparkle" />
              <feComposite in="SourceGraphic" in2="sparkle" operator="over" />
            </filter>
          </defs>

          {/* Squircle Housing with dual stroke glow */}
          <rect
            x="6"
            y="6"
            width="88"
            height="88"
            rx="24"
            fill="url(#plSquircleBg)"
            stroke="url(#plBorderGrad)"
            strokeWidth="2"
          />

          {/* Inner glass accent contour */}
          <rect
            x="10"
            y="10"
            width="80"
            height="80"
            rx="20"
            fill="none"
            stroke="white"
            strokeOpacity="0.08"
            strokeWidth="1.2"
          />

          {/* Stylized Modern Chat Silhouette */}
          <path
            d="M 27 46 C 27 34, 37 25, 50 25 C 63 25, 73 34, 73 46 C 73 58, 63 67, 50 67 C 45 67, 40 65.5, 36 63 L 26 68 L 28.5 59 C 27.5 55, 27 51, 27 46 Z"
            fill="url(#plBubbleGrad)"
            stroke="white"
            strokeOpacity="0.22"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />

          {/* Radiating Broadcast Ripples */}
          <path
            d="M 77 37 C 82 42, 82 50, 77 55"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.75"
          />
          <path
            d="M 83 31 C 90 39, 90 53, 83 61"
            stroke="#c084fc"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.4"
          />

          {/* Dynamic Heartbeat / Pulse Wave through the center */}
          <path
            d="M 21 48 L 33 48 L 39 36 L 47 61 L 54 33 L 61 54 L 67 48 L 79 48"
            fill="none"
            stroke="url(#plWaveGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#plGlow)"
          />

          {/* Glowing Pulse Apex Nodes (Energy Sparks) */}
          <circle cx="39" cy="36" r="2.5" fill="#38bdf8" filter="url(#plSparkle)" />
          <circle cx="54" cy="33" r="2.8" fill="#ffffff" filter="url(#plSparkle)" />
          <circle cx="47" cy="61" r="2.5" fill="#a855f7" filter="url(#plSparkle)" />

          {/* Central security spark (diamond twinkle) */}
          <path
            d="M 50 20 L 51.5 24 L 55.5 25.5 L 51.5 27 L 50 31 L 48.5 27 L 44.5 25.5 L 48.5 24 Z"
            fill="#38bdf8"
            opacity="0.9"
            filter="url(#plGlow)"
          />
        </svg>
        )}
      </div>

      {/* Typography */}
      {showText && !iconOnly && (
        <div className="flex flex-col justify-center">
          <div className="flex items-center space-x-1.5">
            <span
              className={`font-extrabold tracking-tight leading-none ${currentSize.font} ${
                textClassName || 'text-slate-900 dark:text-white'
              }`}
            >
              {customAppName === 'PulseChat' ? (
                <>
                  <span className="text-indigo-600 dark:text-indigo-400">Pulse</span>
                  <span className="text-slate-900 dark:text-white">Chat</span>
                </>
              ) : (
                <span className="text-slate-900 dark:text-white">{customAppName}</span>
              )}
            </span>

            {/* Optional glowing live indicator beacon */}
            {showBeacon && (
              <span className="relative flex h-2 w-2 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]"></span>
              </span>
            )}
          </div>

          {subtitle && (
            <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default PulseLogo;
