import React from 'react';

/**
 * PulseLogo - Creative, bespoke vector logo for PulseChat
 * Features an integrated speech bubble with a dynamic heartbeat/pulse wave,
 * glowing cyber-gradient accents, and energetic ripple emissions.
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
        {/* Ambient neon backdrop glow */}
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-fuchsia-500 opacity-60 blur-md pointer-events-none ${animated ? 'group-hover:opacity-100 group-hover:blur-lg transition-all duration-300' : ''
            }`}
        />

        {/* Crisp vector logo */}
        <svg
          viewBox="0 0 100 100"
          width={iconPx}
          height={iconPx}
          className="relative z-10 drop-shadow-xl"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Deep Cyber Squircle Gradient */}
            <linearGradient id="plSquircleBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#0b0f19" />
            </linearGradient>

            {/* Glowing Border Gradient */}
            <linearGradient id="plBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="35%" stopColor="#818cf8" />
              <stop offset="70%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>

            {/* Electric Pulse Wave Gradient */}
            <linearGradient id="plWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00f2fe" />
              <stop offset="30%" stopColor="#38bdf8" />
              <stop offset="65%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>

            {/* Bubble Shimmer Gradient */}
            <linearGradient id="plBubbleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.12" />
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
            strokeWidth="2.5"
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
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M 83 31 C 90 39, 90 53, 83 61"
            stroke="#c084fc"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.45"
          />

          {/* Dynamic Heartbeat / Pulse Wave through the center */}
          <path
            d="M 21 48 L 33 48 L 39 36 L 47 61 L 54 33 L 61 54 L 67 48 L 79 48"
            fill="none"
            stroke="url(#plWaveGrad)"
            strokeWidth="4.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#plGlow)"
          />

          {/* Glowing Pulse Apex Nodes (Energy Sparks) */}
          <circle cx="39" cy="36" r="2.8" fill="#00f2fe" filter="url(#plSparkle)" />
          <circle cx="54" cy="33" r="3.2" fill="#ffffff" filter="url(#plSparkle)" />
          <circle cx="47" cy="61" r="2.8" fill="#ec4899" filter="url(#plSparkle)" />

          {/* Central security spark (diamond twinkle) */}
          <path
            d="M 50 20 L 51.5 24 L 55.5 25.5 L 51.5 27 L 50 31 L 48.5 27 L 44.5 25.5 L 48.5 24 Z"
            fill="#38bdf8"
            opacity="0.9"
            filter="url(#plGlow)"
          />
        </svg>
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
              <span className="text-indigo-600 dark:text-indigo-400">Pulse</span>
              <span className="text-slate-900 dark:text-white">Chat</span>
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
