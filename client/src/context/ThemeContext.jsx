import React, { createContext, useContext, useState, useEffect } from 'react';

export const ACCENT_PALETTES = {
  indigo: {
    id: 'indigo',
    name: 'Indigo',
    primary: '#6366f1',
    hover: '#4f46e5',
    light: 'rgba(99, 102, 241, 0.15)',
    border: 'rgba(99, 102, 241, 0.35)',
    bg: 'bg-indigo-600',
    bgHover: 'hover:bg-indigo-700',
    text: 'text-indigo-600 dark:text-indigo-400',
    ring: 'focus:ring-indigo-500'
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    primary: '#10b981',
    hover: '#059669',
    light: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.35)',
    bg: 'bg-emerald-600',
    bgHover: 'hover:bg-emerald-700',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'focus:ring-emerald-500'
  },
  violet: {
    id: 'violet',
    name: 'Violet',
    primary: '#8b5cf6',
    hover: '#7c3aed',
    light: 'rgba(139, 92, 246, 0.15)',
    border: 'rgba(139, 92, 246, 0.35)',
    bg: 'bg-violet-600',
    bgHover: 'hover:bg-violet-700',
    text: 'text-violet-600 dark:text-violet-400',
    ring: 'focus:ring-violet-500'
  },
  rose: {
    id: 'rose',
    name: 'Rose',
    primary: '#f43f5e',
    hover: '#e11d48',
    light: 'rgba(244, 63, 94, 0.15)',
    border: 'rgba(244, 63, 94, 0.35)',
    bg: 'bg-rose-600',
    bgHover: 'hover:bg-rose-700',
    text: 'text-rose-600 dark:text-rose-400',
    ring: 'focus:ring-rose-500'
  },
  cyan: {
    id: 'cyan',
    name: 'Cyan',
    primary: '#06b6d4',
    hover: '#0891b2',
    light: 'rgba(6, 182, 212, 0.15)',
    border: 'rgba(6, 182, 212, 0.35)',
    bg: 'bg-cyan-600',
    bgHover: 'hover:bg-cyan-700',
    text: 'text-cyan-600 dark:text-cyan-400',
    ring: 'focus:ring-cyan-500'
  },
  amber: {
    id: 'amber',
    name: 'Amber',
    primary: '#f59e0b',
    hover: '#d97706',
    light: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.35)',
    bg: 'bg-amber-600',
    bgHover: 'hover:bg-amber-700',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'focus:ring-amber-500'
  }
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => localStorage.getItem('pulsechat_theme') || 'dark');
  const [accentColor, setAccentColorState] = useState(() => localStorage.getItem('pulsechat_accent') || 'indigo');
  const [fontSize, setFontSizeState] = useState(() => localStorage.getItem('pulsechat_fontsize') || 'medium');

  // Change and persist accent color immediately
  const setAccentColor = (newAccent) => {
    setAccentColorState(newAccent);
    localStorage.setItem('pulsechat_accent', newAccent);

    const root = document.documentElement;
    root.setAttribute('data-accent', newAccent);

    const palette = ACCENT_PALETTES[newAccent] || ACCENT_PALETTES.indigo;
    root.style.setProperty('--primary', palette.primary);
    root.style.setProperty('--primary-hover', palette.hover);
    root.style.setProperty('--primary-light', palette.light);
    root.style.setProperty('--primary-border', palette.border);
  };

  // Change and persist theme immediately
  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('pulsechat_theme', newTheme);
    const root = document.documentElement;

    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    } else {
      // System
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    }
  };

  // Change and persist font size
  const setFontSize = (newSize) => {
    setFontSizeState(newSize);
    localStorage.setItem('pulsechat_fontsize', newSize);
    const root = document.documentElement;
    if (newSize === 'small') {
      root.style.fontSize = '14px';
    } else if (newSize === 'large') {
      root.style.fontSize = '18px';
    } else {
      root.style.fontSize = '16px';
    }
  };

  // Apply on initial mount
  useEffect(() => {
    setTheme(theme);
    setAccentColor(accentColor);
    setFontSize(fontSize);
  }, []);

  const palette = ACCENT_PALETTES[accentColor] || ACCENT_PALETTES.indigo;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        accentColor,
        setAccentColor,
        palette,
        fontSize,
        setFontSize
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
