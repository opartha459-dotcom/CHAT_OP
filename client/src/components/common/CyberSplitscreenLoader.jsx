import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { playCyberUnlockSound } from '../../utils/sound';

// Character sets for rain
const CHAR_SETS = {
  '01':       ['0', '1'],
  'hex':      ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'],
  'katakana': ['ア','イ','ウ','エ','オ','カ','キ','ク','ケ','コ','サ','シ','ス','セ','ソ','タ','チ','ツ','テ','ト','ナ','ニ','ヌ','ネ','ノ','ハ','ヒ','フ','ヘ','ホ','マ','ミ','ム','メ','モ'],
  'symbols':  ['✦','✧','⟨','⟩','◈','◉','⬡','⬢','∞','Ω','Δ','Σ','Ψ','Φ','λ','π'],
  'ascii':    ['@','#','$','%','&','*','+','-','=','~','^','<','>','|','/','{','}','[',']'],
};

const DEFAULT_CONFIG = {
  style:          'cyber',
  rainChars:      '01',
  customChars:    '',
  rainColor:      '#10b981',
  rainGlowColor:  '#059669',
  bgColor:        '#050811',
  accentColor:    '#10b981',
  panelTitle:     'PULSECHAT',
  panelSubtitle:  '01 GREEN DATA MATRIX // QUANTUM ENCRYPTED',
  securityBadge:  'CYBER TUNNEL ACTIVE // SECURE HANDSHAKE OK',
  statusMessages: [
    'STREAMING 01 DATA CLOUD MATRIX...',
    'VERIFYING QUANTUM E2EE SESSION...',
    'DECRYPTING WORKSPACE ENVIRONMENT...',
    'SYNCHRONIZING CONVERSATIONS & CHATS...',
    'SYSTEM SYNCHRONIZED // DIVIDING GATE...',
  ],
  showBinaryTicker:  true,
  showSecurityBadge: true,
  splitDuration:  800,
  minDuration:    2000,
};

/**
 * CyberSplitscreenLoader
 * - Fully admin-configurable: rain chars, colors, text, style, etc.
 * - 01 green binary digital cloud stream canvas (default)
 * - Holographic HUD with quantum encryption telemetry
 * - Stays for a minimum duration AND until application data is loaded
 * - Laser divide seam ignites ONLY when splitting open
 */
export const CyberSplitscreenLoader = ({ onComplete }) => {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { loadingConversations } = useChat();

  // Fetch loader config from public endpoint (works for visitors & logged-in users alike)
  const [cfg, setCfg] = useState(DEFAULT_CONFIG);
  useEffect(() => {
    fetch('/api/system/loader')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.loaderConfig && Object.keys(d.loaderConfig).length > 0) {
          setCfg(prev => ({ ...prev, ...d.loaderConfig }));
        }
      })
      .catch(() => {});
  }, []);

  const minDuration = cfg.minDuration || 2000;
  const splitDuration = cfg.splitDuration || 800;

  // App is ready when authentication check is done AND (if logged in) conversations are ready
  const isDataReady = !authLoading && (!isAuthenticated || !loadingConversations);

  const [phase, setPhase] = useState('loading'); // 'loading' | 'splitting' | 'done'
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [binaryTicker, setBinaryTicker] = useState('01001011 01100101 01111001');
  const canvasRef = useRef(null);

  // Build the char array for rain
  const getRainChars = () => {
    if (cfg.rainChars === 'custom' && cfg.customChars) {
      return cfg.customChars.split('').filter(Boolean);
    }
    return CHAR_SETS[cfg.rainChars] || CHAR_SETS['01'];
  };

  // Parse title parts e.g. "PULSE|CHAT" → first part white, second accent
  const titleParts = cfg.panelTitle.includes('|')
    ? cfg.panelTitle.split('|')
    : [cfg.panelTitle.slice(0, -4) || cfg.panelTitle, cfg.panelTitle.slice(-4)];

  // 1. Matrix Rain Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width  = (canvas.width  = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width  = canvas.width  = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const fontSize = 14;
    const columns  = Math.floor(width / (fontSize * 1.4));
    const drops    = Array.from({ length: columns }, () => Math.random() * -50);
    const speeds   = Array.from({ length: columns }, () => 0.75 + Math.random() * 1.5);
    const opacities = Array.from({ length: columns }, () => 0.2 + Math.random() * 0.8);
    const chars    = getRainChars();

    // Parse hex to rgba helper
    const hexToRgba = (hex, a) => {
      const r = parseInt(hex.slice(1,3),16);
      const g = parseInt(hex.slice(3,5),16);
      const b = parseInt(hex.slice(5,7),16);
      return `rgba(${r},${g},${b},${a})`;
    };

    const render = () => {
      // bg clear with slight trail
      const bg = cfg.bgColor || '#050811';
      ctx.fillStyle = bg + '40'; // 25% opacity trail
      ctx.fillRect(0, 0, width, height);

      ctx.font = `${fontSize}px "Courier New", monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * (fontSize * 1.4);
        const y = drops[i] * fontSize;

        if (Math.random() > 0.88) {
          // bright head char
          ctx.fillStyle = cfg.accentColor || '#a7f3d0';
          ctx.shadowBlur = 12;
          ctx.shadowColor = cfg.rainColor || '#10b981';
        } else {
          ctx.fillStyle = hexToRgba(cfg.rainColor || '#10b981', opacities[i]);
          ctx.shadowBlur = 6;
          ctx.shadowColor = cfg.rainGlowColor || '#059669';
        }

        ctx.fillText(char, x, y);

        if (y > height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += speeds[i];
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [cfg]);

  // 2. Progress + Status Sequence
  const statusMessages = cfg.statusMessages?.length >= 5
    ? cfg.statusMessages
    : DEFAULT_CONFIG.statusMessages;

  useEffect(() => {
    setStatusText(statusMessages[0] || DEFAULT_CONFIG.statusMessages[0]);
    const startTime = Date.now();
    let splitTriggered = false;

    const interval = setInterval(() => {
      const elapsed   = Date.now() - startTime;
      const maxElapsed = 5500;

      let targetPct;
      if (elapsed < minDuration) {
        targetPct = Math.round((elapsed / minDuration) * 90);
      } else if (!isDataReady && elapsed < maxElapsed) {
        targetPct = Math.min(96, 90 + Math.round(((elapsed - minDuration) / (maxElapsed - minDuration)) * 6));
      } else {
        targetPct = 100;
      }

      setProgress(targetPct);

      if (cfg.showBinaryTicker) {
        const randBin = Array.from({ length: 3 }, () =>
          Array.from({ length: 8 }, () => (Math.random() > 0.5 ? '1' : '0')).join('')
        ).join(' ');
        setBinaryTicker(randBin);
      }

      // Status text from config array (5 bands)
      if      (targetPct < 30)  setStatusText(statusMessages[0]);
      else if (targetPct < 60)  setStatusText(statusMessages[1]);
      else if (targetPct < 85)  setStatusText(statusMessages[2]);
      else if (targetPct < 100) setStatusText(statusMessages[3]);
      else                       setStatusText(statusMessages[4]);

      if (targetPct >= 100 && !splitTriggered) {
        splitTriggered = true;
        clearInterval(interval);
        triggerSplit();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [minDuration, isDataReady, cfg]);

  // 3. Split Shutter Trigger
  const triggerSplit = () => {
    setPhase('splitting');
    playCyberUnlockSound();
    setTimeout(() => {
      setPhase('done');
      if (onComplete) onComplete();
    }, splitDuration);
  };

  if (phase === 'done') return null;
  const isSplitting = phase === 'splitting';

  const accent = cfg.accentColor || '#10b981';
  const bg     = cfg.bgColor     || '#050811';

  return (
    <div className="fixed inset-0 z-[99999] overflow-hidden select-none pointer-events-none">
      {/* ── LEFT SHUTTER DOOR ──────────────────────────────────────────────── */}
      <div
        className={`absolute top-0 bottom-0 left-0 w-1/2 z-20 overflow-hidden transition-transform duration-[800ms] ${
          isSplitting ? '-translate-x-full ease-[cubic-bezier(0.85,0,0.15,1)]' : 'translate-x-0'
        }`}
        style={{
          backgroundColor: bg,
          boxShadow: isSplitting ? `10px 0 45px ${accent}b3` : 'none'
        }}
      >
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `radial-gradient(${accent} 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }} />
        {/* Seam glow — only on split */}
        <div
          className={`absolute top-0 bottom-0 right-0 w-[3px] transition-opacity duration-200 ${isSplitting ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: `linear-gradient(to bottom, ${accent}, white, ${accent})`, boxShadow: `0 0 25px ${accent}, 0 0 50px ${accent}` }}
        />
      </div>

      {/* ── RIGHT SHUTTER DOOR ─────────────────────────────────────────────── */}
      <div
        className={`absolute top-0 bottom-0 right-0 w-1/2 z-20 overflow-hidden transition-transform duration-[800ms] ${
          isSplitting ? 'translate-x-full ease-[cubic-bezier(0.85,0,0.15,1)]' : 'translate-x-0'
        }`}
        style={{
          backgroundColor: bg,
          boxShadow: isSplitting ? `-10px 0 45px ${accent}b3` : 'none'
        }}
      >
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `radial-gradient(${accent} 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }} />
        <div
          className={`absolute top-0 bottom-0 left-0 w-[3px] transition-opacity duration-200 ${isSplitting ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: `linear-gradient(to bottom, ${accent}, white, ${accent})`, boxShadow: `0 0 25px ${accent}, 0 0 50px ${accent}` }}
        />
      </div>

      {/* ── RAIN CANVAS ─────────────────────────────────────────────────────── */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 z-25 transition-opacity duration-500 ${isSplitting ? 'opacity-0' : 'opacity-100'}`}
      />

      {/* ── CENTRAL HUD ─────────────────────────────────────────────────────── */}
      <div
        className={`absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center transition-all duration-500 ${
          isSplitting ? 'scale-125 opacity-0 blur-sm' : 'scale-100 opacity-100'
        }`}
      >
        {/* Rotating Cyber Reticles */}
        <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center mb-6">
          <div className="absolute inset-0 rounded-full border-2 border-dashed animate-[spin_12s_linear_infinite]"
               style={{ borderColor: `${accent}50` }} />
          <div className="absolute inset-3 rounded-full border animate-[spin_6s_linear_infinite_reverse]"
               style={{ borderColor: `${accent}30`, borderTopColor: `${accent}cc` }} />
          <div className="absolute inset-7 rounded-full blur-md animate-pulse"
               style={{ backgroundColor: `${accent}1a` }} />

          {/* Logo box */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-950/90 flex items-center justify-center"
               style={{ border: `2px solid ${accent}99`, boxShadow: `0 0 35px ${accent}80` }}>
            <svg className="w-12 h-12 sm:w-14 sm:h-14" viewBox="0 0 512 512" fill="none"
                 style={{ filter: `drop-shadow(0 0 12px ${accent})` }}>
              <path
                d="M72 236C72 142.11 154.38 66 256 66C357.62 66 440 142.11 440 236C440 329.89 357.62 406 256 406C227.12 406 199.78 399.85 175.46 388.75L102 414L126.88 344.82C92.83 315.68 72 278.08 72 236Z"
                fill={accent} fillOpacity="0.25" stroke={accent} strokeWidth="16"
              />
              <path
                d="M124 236H180L208 172L244 298L274 212L294 254L316 236H388"
                stroke={accent} strokeWidth="24" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1 mb-4">
          <div className="text-2xl sm:text-3xl font-black tracking-widest text-white font-mono"
               style={{ textShadow: `0 0 20px ${accent}cc` }}>
            {cfg.panelTitle.includes('|') ? (
              <>
                {titleParts[0]}
                <span style={{ color: accent }}>{titleParts[1]}</span>
              </>
            ) : (
              <>
                {titleParts[0]}
                <span style={{ color: accent }}>{titleParts[1]}</span>
              </>
            )}
          </div>
          <div className="text-[11px] font-mono tracking-widest uppercase font-bold"
               style={{ color: `${accent}cc` }}>
            {cfg.panelSubtitle}
          </div>
        </div>

        {/* Binary Ticker */}
        {cfg.showBinaryTicker && (
          <div className="font-mono text-[10px] sm:text-xs tracking-widest px-3 py-1 rounded-full border mb-5"
               style={{ color: `${accent}b3`, backgroundColor: `${accent}10`, borderColor: `${accent}50`, boxShadow: `0 0 12px ${accent}33` }}>
            {binaryTicker}
          </div>
        )}

        {/* Progress Bar */}
        <div className="w-64 sm:w-80 space-y-2">
          <div className="flex justify-between text-[11px] font-mono font-bold" style={{ color: `${accent}cc` }}>
            <span className="truncate pr-2">{statusText}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full bg-slate-900/90 rounded-full overflow-hidden p-0.5"
               style={{ border: `1px solid ${accent}66`, boxShadow: `0 0 15px ${accent}4d` }}>
            <div
              className="h-full rounded-full transition-all duration-75"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(to right, ${accent}99, ${accent}, white)`,
                boxShadow: `0 0 12px ${accent}`
              }}
            />
          </div>
        </div>

        {/* Security Badge */}
        {cfg.showSecurityBadge && (
          <div className="mt-8 flex items-center space-x-2 text-[10px] font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: accent }} />
            <span>{cfg.securityBadge}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CyberSplitscreenLoader;
