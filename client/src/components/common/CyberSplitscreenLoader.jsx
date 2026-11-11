import React, { useState, useEffect, useRef } from 'react';
import { playCyberUnlockSound } from '../../utils/sound';

/**
 * CyberSplitscreenLoader
 * - 01 green binary digital cloud stream canvas
 * - Holographic HUD with quantum encryption telemetry
 * - Shutter door split-screen dividing animation opening the app
 */
export const CyberSplitscreenLoader = ({ minDuration = 1800, onComplete }) => {
  const [phase, setPhase] = useState('loading'); // 'loading' | 'splitting' | 'done'
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('INITIALIZING SECURE PROTOCOL [01]...');
  const [binaryTicker, setBinaryTicker] = useState('01001011 01100101 01111001');
  const canvasRef = useRef(null);

  // 1. Matrix 01 Green Digital Cloud Stream Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const fontSize = 14;
    const columns = Math.floor(width / (fontSize * 1.4));
    const drops = Array.from({ length: columns }, () => Math.random() * -50);
    const speeds = Array.from({ length: columns }, () => 0.75 + Math.random() * 1.5);
    const opacities = Array.from({ length: columns }, () => 0.2 + Math.random() * 0.8);

    const chars = ['0', '1'];

    const render = () => {
      // Semi-transparent fade to create glowing trails
      ctx.fillStyle = 'rgba(5, 8, 17, 0.25)';
      ctx.fillRect(0, 0, width, height);

      ctx.font = `${fontSize}px "Courier New", monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * (fontSize * 1.4);
        const y = drops[i] * fontSize;

        // Leading character is bright cyan/white, trailing is neon emerald green
        if (Math.random() > 0.88) {
          ctx.fillStyle = '#a7f3d0'; // Mint white head
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#10b981';
        } else {
          ctx.fillStyle = `rgba(16, 185, 129, ${opacities[i]})`; // Emerald stream
          ctx.shadowBlur = 6;
          ctx.shadowColor = '#059669';
        }

        ctx.fillText(char, x, y);

        // Reset or move drop down
        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += speeds[i];
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // 2. Telemetry and Progress Sequence
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / minDuration) * 100), 100);
      setProgress(pct);

      // Randomize binary string ticker
      const randBin = Array.from({ length: 3 }, () =>
        Array.from({ length: 8 }, () => (Math.random() > 0.5 ? '1' : '0')).join('')
      ).join(' ');
      setBinaryTicker(randBin);

      if (pct < 30) {
        setStatusText('STREAMING 01 DATA CLOUD MATRIX...');
      } else if (pct < 65) {
        setStatusText('VERIFYING QUANTUM E2EE SESSION...');
      } else if (pct < 90) {
        setStatusText('DECRYPTING WORKSPACE ENVIRONMENT...');
      } else {
        setStatusText('SYSTEM SYNCHRONIZED // DIVIDING GATE...');
      }

      if (elapsed >= minDuration) {
        clearInterval(interval);
        triggerSplit();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [minDuration]);

  // 3. Screen Divide (Split Shutter) Trigger
  const triggerSplit = () => {
    setPhase('splitting');
    playCyberUnlockSound();

    // After animation finishes (750ms), unmount
    setTimeout(() => {
      setPhase('done');
      if (onComplete) onComplete();
    }, 850);
  };

  if (phase === 'done') {
    return null;
  }

  const isSplitting = phase === 'splitting';

  return (
    <div className="fixed inset-0 z-[99999] overflow-hidden select-none pointer-events-none">
      {/* ── LEFT SHUTTER DOOR ──────────────────────────────────────────────── */}
      <div
        className={`absolute top-0 bottom-0 left-0 w-1/2 bg-[#050811] z-20 overflow-hidden transition-transform duration-[800ms] ${
          isSplitting
            ? '-translate-x-full ease-[cubic-bezier(0.85,0,0.15,1)]'
            : 'translate-x-0'
        }`}
        style={{
          boxShadow: isSplitting ? 'none' : 'inset -1px 0 0 rgba(16, 185, 129, 0.8), 10px 0 30px rgba(16, 185, 129, 0.4)'
        }}
      >
        {/* Background Cyber Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/20 via-transparent to-emerald-900/10" />

        {/* Shutter Seam Edge Glow */}
        <div className="absolute top-0 bottom-0 right-0 w-[2px] bg-gradient-to-b from-emerald-400 via-teal-300 to-emerald-500 shadow-[0_0_15px_#10b981]" />
      </div>

      {/* ── RIGHT SHUTTER DOOR ─────────────────────────────────────────────── */}
      <div
        className={`absolute top-0 bottom-0 right-0 w-1/2 bg-[#050811] z-20 overflow-hidden transition-transform duration-[800ms] ${
          isSplitting
            ? 'translate-x-full ease-[cubic-bezier(0.85,0,0.15,1)]'
            : 'translate-x-0'
        }`}
        style={{
          boxShadow: isSplitting ? 'none' : 'inset 1px 0 0 rgba(16, 185, 129, 0.8), -10px 0 30px rgba(16, 185, 129, 0.4)'
        }}
      >
        {/* Background Cyber Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-l from-emerald-950/20 via-transparent to-emerald-900/10" />

        {/* Shutter Seam Edge Glow */}
        <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-gradient-to-b from-emerald-400 via-teal-300 to-emerald-500 shadow-[0_0_15px_#10b981]" />
      </div>

      {/* ── 01 GREEN DIGITAL DATA CLOUD MATRIX CANVAS ──────────────────────── */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 z-25 transition-opacity duration-500 ${
          isSplitting ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* ── CENTRAL ENERGY DIVIDER SEAM (Flash on opening) ──────────────────── */}
      <div
        className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-700 ${
          isSplitting
            ? 'w-16 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-0 scale-y-110'
            : 'w-[3px] bg-emerald-400 shadow-[0_0_20px_#10b981,0_0_40px_#059669] opacity-80 animate-pulse'
        }`}
      />

      {/* ── CENTRAL HOLOGRAPHIC HUD & TELEMETRY ─────────────────────────────── */}
      <div
        className={`absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center transition-all duration-500 ${
          isSplitting ? 'scale-125 opacity-0 blur-sm' : 'scale-100 opacity-100'
        }`}
      >
        {/* Rotating Circular Cyber Targeting Reticles */}
        <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center mb-6">
          {/* Outer dashed spinning ring */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-500/30 animate-[spin_12s_linear_infinite]" />

          {/* Reverse counter-spinning segmented ring */}
          <div className="absolute inset-3 rounded-full border border-emerald-400/20 border-t-emerald-400/80 animate-[spin_6s_linear_infinite_reverse]" />

          {/* Glowing pulse ring */}
          <div className="absolute inset-7 rounded-full bg-emerald-500/10 blur-md animate-pulse" />

          {/* Central Cyber Logo Box */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-950/90 border-2 border-emerald-400/60 flex items-center justify-center shadow-[0_0_35px_rgba(16,185,129,0.5)]">
            <svg
              className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-[0_0_12px_#10b981]"
              viewBox="0 0 512 512"
              fill="none"
            >
              <path
                d="M72 236C72 142.11 154.38 66 256 66C357.62 66 440 142.11 440 236C440 329.89 357.62 406 256 406C227.12 406 199.78 399.85 175.46 388.75L102 414L126.88 344.82C92.83 315.68 72 278.08 72 236Z"
                fill="#10b981"
                fillOpacity="0.25"
                stroke="#34d399"
                strokeWidth="16"
              />
              <path
                d="M124 236H180L208 172L244 298L274 212L294 254L316 236H388"
                stroke="#00ff88"
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Title & Cyber Branding */}
        <div className="space-y-1 mb-4">
          <div className="text-2xl sm:text-3xl font-black tracking-widest text-white drop-shadow-[0_0_20px_rgba(16,185,129,0.8)] font-mono">
            PULSE<span className="text-emerald-400">CHAT</span>
          </div>
          <div className="text-[11px] font-mono tracking-widest uppercase text-emerald-300/80 font-bold">
            01 GREEN DATA MATRIX // QUANTUM ENCRYPTED
          </div>
        </div>

        {/* Binary Cloud Ticker */}
        <div className="font-mono text-[10px] sm:text-xs text-emerald-400/70 tracking-widest bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30 mb-5 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
          {binaryTicker}
        </div>

        {/* High-Tech Progress Bar */}
        <div className="w-64 sm:w-80 space-y-2">
          <div className="flex justify-between text-[11px] font-mono font-bold text-emerald-300">
            <span className="truncate pr-2">{statusText}</span>
            <span>{progress}%</span>
          </div>

          <div className="h-2 w-full bg-slate-900/90 rounded-full overflow-hidden p-0.5 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <div
              className="h-full bg-gradient-to-r from-teal-400 via-emerald-400 to-green-300 rounded-full transition-all duration-75 shadow-[0_0_12px_#10b981]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Security badge at bottom */}
        <div className="mt-8 flex items-center space-x-2 text-[10px] font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>CYBER TUNNEL ACTIVE // SECURE HANDSHAKE OK</span>
        </div>
      </div>
    </div>
  );
};

