import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

// Color conversion and shade generation utilities
export function hexToRgba(hex, alpha = 1) {
  if (!hex || typeof hex !== 'string') return `rgba(99, 102, 241, ${alpha})`;
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return `rgba(99, 102, 241, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function adjustBrightness(hex, percent) {
  if (!hex || typeof hex !== 'string') return hex;
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return hex;
  let r = (num >> 16) + Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * (percent / 100));
  let b = (num & 0x0000ff) + Math.round(255 * (percent / 100));
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// Built-in curated palettes
export const THEME_PALETTES = {
  indigo: {
    id: 'indigo',
    name: 'Royal Indigo',
    primary: '#6366f1',
    hover: '#4f46e5',
    secondary: '#10b981',
    accent: '#818cf8',
    preview: '#6366f1'
  },
  violet: {
    id: 'violet',
    name: 'Electric Violet',
    primary: '#8b5cf6',
    hover: '#7c3aed',
    secondary: '#ec4899',
    accent: '#a78bfa',
    preview: '#8b5cf6'
  },
  emerald: {
    id: 'emerald',
    name: 'Cyber Emerald',
    primary: '#10b981',
    hover: '#059669',
    secondary: '#06b6d4',
    accent: '#34d399',
    preview: '#10b981'
  },
  rose: {
    id: 'rose',
    name: 'Neon Rose',
    primary: '#f43f5e',
    hover: '#e11d48',
    secondary: '#f59e0b',
    accent: '#fb7185',
    preview: '#f43f5e'
  },
  cyan: {
    id: 'cyan',
    name: 'Deep Cyan',
    primary: '#06b6d4',
    hover: '#0891b2',
    secondary: '#6366f1',
    accent: '#22d3ee',
    preview: '#06b6d4'
  },
  amber: {
    id: 'amber',
    name: 'Solar Amber',
    primary: '#f59e0b',
    hover: '#d97706',
    secondary: '#ef4444',
    accent: '#fbbf24',
    preview: '#f59e0b'
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson Red',
    primary: '#dc2626',
    hover: '#b91c1c',
    secondary: '#ea580c',
    accent: '#f87171',
    preview: '#dc2626'
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Orange',
    primary: '#ea580c',
    hover: '#c2410c',
    secondary: '#db2777',
    accent: '#fb923c',
    preview: '#ea580c'
  },
  teal: {
    id: 'teal',
    name: 'Teal Aurora',
    primary: '#0d9488',
    hover: '#0f766e',
    secondary: '#0284c7',
    accent: '#2dd4bf',
    preview: '#0d9488'
  }
};

// Backward compatibility alias map
export const ACCENT_PALETTES = Object.fromEntries(
  Object.entries(THEME_PALETTES).map(([k, v]) => [
    k,
    {
      ...v,
      light: hexToRgba(v.primary, 0.15),
      border: hexToRgba(v.primary, 0.35),
      bg: 'bg-accent',
      bgHover: 'bg-accent-hover',
      text: 'text-accent',
      ring: 'ring-accent'
    }
  ])
);

// Curated font families
export const TYPOGRAPHY_FONTS = [
  { id: 'Inter', name: 'Inter (Clean & Modern)', family: "'Inter', sans-serif", google: 'family=Inter:wght@400;500;600;700;800' },
  { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans (Crisp UI)', family: "'Plus Jakarta Sans', sans-serif", google: 'family=Plus+Jakarta+Sans:wght@400;500;600;700;800' },
  { id: 'Poppins', name: 'Poppins (Geometric & Friendly)', family: "'Poppins', sans-serif", google: 'family=Poppins:wght@400;500;600;700;800' },
  { id: 'Roboto', name: 'Roboto (Google Standard)', family: "'Roboto', sans-serif", google: 'family=Roboto:wght@400;500;700;900' },
  { id: 'Outfit', name: 'Outfit (High-Tech Minimal)', family: "'Outfit', sans-serif", google: 'family=Outfit:wght@400;500;600;700;800' },
  { id: 'Montserrat', name: 'Montserrat (Bold & Elegant)', family: "'Montserrat', sans-serif", google: 'family=Montserrat:wght@400;500;600;700;800' },
  { id: 'system', name: 'System Native (-apple-system / Segoe UI)', family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
];

export const FONT_SIZES = [
  { id: 'small', label: 'Compact (14px)', px: '14px', sample: 'text-sm' },
  { id: 'medium', label: 'Standard (16px)', px: '16px', sample: 'text-base' },
  { id: 'large', label: 'Comfortable (18px)', px: '18px', sample: 'text-lg' }
];

export const HEADING_WEIGHTS = [
  { id: '500', label: 'Medium (500)' },
  { id: '600', label: 'Semi-Bold (600)' },
  { id: '700', label: 'Bold (700)' },
  { id: '800', label: 'Extra-Bold (800)' }
];

export const HEADING_TRANSFORMS = [
  { id: 'none', label: 'Normal Case' },
  { id: 'capitalize', label: 'Capitalize Words' },
  { id: 'uppercase', label: 'Uppercase' }
];

export const DEFAULT_THEME_CONFIG = {
  accentColor: 'indigo',
  primaryColor: '#6366f1',
  primaryHover: '#4f46e5',
  primaryLight: 'rgba(99, 102, 241, 0.15)',
  primaryBorder: 'rgba(99, 102, 241, 0.35)',
  secondaryColor: '#10b981',
  mode: 'dark',
  fontFamily: 'Inter',
  fontSize: 'medium',
  fontWeightNormal: '400',
  fontWeightHeading: '700',
  headingLetterSpacing: '-0.02em',
  headingTransform: 'none'
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const auth = useAuth?.();
  const user = auth?.user;
  const token = auth?.token;
  const authHeaders = auth?.authHeaders;
  const { socket } = useSocket?.() || {};

  // Admin-configured default theme (from backend /api/system/theme)
  const [adminTheme, setAdminTheme] = useState(() => {
    try {
      const cached = localStorage.getItem('pulsechat_admin_theme');
      return cached ? JSON.parse(cached) : DEFAULT_THEME_CONFIG;
    } catch {
      return DEFAULT_THEME_CONFIG;
    }
  });

  // User's custom theme preference
  const [isCustomTheme, setIsCustomTheme] = useState(() => {
    if (user?.chatSettings?.isCustomTheme !== undefined) {
      return Boolean(user.chatSettings.isCustomTheme);
    }
    return localStorage.getItem('pulsechat_user_has_custom_theme') === 'true';
  });

  const [userCustomTheme, setUserCustomTheme] = useState(() => {
    try {
      const cached = localStorage.getItem('pulsechat_user_custom_theme');
      if (cached) return JSON.parse(cached);
      if (user?.chatSettings?.customTheme) return user.chatSettings.customTheme;
    } catch {}
    return null;
  });

  // Local device overrides for mode and font size (backward-compatibility)
  const [themeMode, setThemeModeState] = useState(() => localStorage.getItem('pulsechat_theme') || 'dark');
  const [fontSize, setFontSizeState] = useState(() => localStorage.getItem('pulsechat_fontsize') || 'medium');

  // Compute the currently active theme (user custom if enabled, otherwise admin default)
  const activeTheme = useMemo(() => {
    const base = isCustomTheme && userCustomTheme ? userCustomTheme : adminTheme;
    return {
      ...DEFAULT_THEME_CONFIG,
      ...base,
      mode: themeMode || base.mode || 'dark',
      fontSize: fontSize || base.fontSize || 'medium'
    };
  }, [isCustomTheme, userCustomTheme, adminTheme, themeMode, fontSize]);

  // Apply theme attributes and CSS variables to document.documentElement
  const applyThemeToDOM = useCallback((themeObj) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const primary = themeObj.primaryColor || '#6366f1';
    const hover = themeObj.primaryHover || adjustBrightness(primary, -12);
    const light = themeObj.primaryLight || hexToRgba(primary, 0.15);
    const border = themeObj.primaryBorder || hexToRgba(primary, 0.35);
    const secondary = themeObj.secondaryColor || '#10b981';

    // 1. Primary Colors
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--primary-hover', hover);
    root.style.setProperty('--primary-light', light);
    root.style.setProperty('--primary-border', border);
    root.style.setProperty('--secondary', secondary);

    // Set data-accent attribute
    const accentId = themeObj.accentColor || 'indigo';
    root.setAttribute('data-accent', accentId);
    root.setAttribute('data-custom-theme', isCustomTheme ? 'true' : 'false');

    // 2. Mode (dark/light)
    const mode = themeObj.mode || 'dark';
    if (mode === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else if (mode === 'light') {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    }

    // 3. Typography
    const fontName = themeObj.fontFamily || 'Inter';
    const foundFont = TYPOGRAPHY_FONTS.find((f) => f.id === fontName);
    const familyCss = foundFont ? foundFont.family : `'${fontName}', sans-serif`;

    root.style.setProperty('--app-font-family', familyCss);

    // Font size
    const sz = themeObj.fontSize || 'medium';
    const szObj = FONT_SIZES.find((s) => s.id === sz) || FONT_SIZES[1];
    root.style.setProperty('--app-font-size', szObj.px);

    // Heading weights & transforms
    root.style.setProperty('--app-font-weight-normal', themeObj.fontWeightNormal || '400');
    root.style.setProperty('--app-font-weight-heading', themeObj.fontWeightHeading || '700');
    root.style.setProperty('--app-heading-spacing', themeObj.headingLetterSpacing || '-0.02em');
    root.style.setProperty('--app-heading-transform', themeObj.headingTransform || 'none');

    // Dynamic Google Fonts injection
    if (foundFont && foundFont.google) {
      let linkEl = document.getElementById('pulsechat-dynamic-font');
      const targetUrl = `https://fonts.googleapis.com/css2?${foundFont.google}&display=swap`;
      if (!linkEl) {
        linkEl = document.createElement('link');
        linkEl.id = 'pulsechat-dynamic-font';
        linkEl.rel = 'stylesheet';
        document.head.appendChild(linkEl);
      }
      if (linkEl.href !== targetUrl) {
        linkEl.href = targetUrl;
      }
    }
  }, [isCustomTheme]);

  // Fetch admin default theme from server
  const fetchAdminTheme = useCallback(async () => {
    try {
      const res = await fetch('/api/system/theme');
      const data = await res.json();
      if (data.success && data.defaultTheme) {
        setAdminTheme(data.defaultTheme);
        localStorage.setItem('pulsechat_admin_theme', JSON.stringify(data.defaultTheme));
      }
    } catch {
      // Keep existing cached theme
    }
  }, []);

  // Sync user's custom preference when user data loads
  useEffect(() => {
    if (user?.chatSettings) {
      const hasCustom = Boolean(user.chatSettings.isCustomTheme);
      setIsCustomTheme(hasCustom);
      localStorage.setItem('pulsechat_user_has_custom_theme', hasCustom ? 'true' : 'false');
      if (hasCustom && user.chatSettings.customTheme) {
        setUserCustomTheme(user.chatSettings.customTheme);
        localStorage.setItem('pulsechat_user_custom_theme', JSON.stringify(user.chatSettings.customTheme));
      }
    }
  }, [user]);

  // Listen to real-time socket events for admin theme updates
  useEffect(() => {
    fetchAdminTheme();
  }, [fetchAdminTheme]);

  useEffect(() => {
    if (!socket) return;

    const handleThemeUpdated = (newAdminTheme) => {
      if (newAdminTheme && typeof newAdminTheme === 'object') {
        setAdminTheme(newAdminTheme);
        localStorage.setItem('pulsechat_admin_theme', JSON.stringify(newAdminTheme));
      }
    };

    socket.on('system:theme_updated', handleThemeUpdated);
    return () => {
      socket.off('system:theme_updated', handleThemeUpdated);
    };
  }, [socket]);

  // Apply active theme whenever it changes
  useEffect(() => {
    applyThemeToDOM(activeTheme);
  }, [activeTheme, applyThemeToDOM]);

  // --------------------------------------------------------------------------
  // USER CUSTOMIZATION ACTIONS
  // --------------------------------------------------------------------------

  // User sets an accent color or custom color
  const setAccentColor = (newAccentOrHex) => {
    let updates = {};
    if (THEME_PALETTES[newAccentOrHex]) {
      const p = THEME_PALETTES[newAccentOrHex];
      updates = {
        accentColor: p.id,
        primaryColor: p.primary,
        primaryHover: p.hover,
        primaryLight: hexToRgba(p.primary, 0.15),
        primaryBorder: hexToRgba(p.primary, 0.35),
        secondaryColor: p.secondary
      };
    } else if (typeof newAccentOrHex === 'string' && newAccentOrHex.startsWith('#')) {
      const hex = newAccentOrHex;
      updates = {
        accentColor: 'custom',
        primaryColor: hex,
        primaryHover: adjustBrightness(hex, -12),
        primaryLight: hexToRgba(hex, 0.15),
        primaryBorder: hexToRgba(hex, 0.35)
      };
    }

    const nextCustom = {
      ...(userCustomTheme || adminTheme),
      ...updates
    };

    setUserCustomTheme(nextCustom);
    setIsCustomTheme(true);
    localStorage.setItem('pulsechat_user_has_custom_theme', 'true');
    localStorage.setItem('pulsechat_user_custom_theme', JSON.stringify(nextCustom));

    // Persist to user account if logged in
    if (token) {
      fetch('/api/users/settings/chat', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          isCustomTheme: true,
          customTheme: nextCustom
        })
      }).catch(() => {});
    }
  };

  // User sets theme mode (light, dark, system)
  const setTheme = (newTheme) => {
    setThemeModeState(newTheme);
    localStorage.setItem('pulsechat_theme', newTheme);

    const nextCustom = {
      ...(userCustomTheme || adminTheme),
      mode: newTheme
    };
    setUserCustomTheme(nextCustom);
    setIsCustomTheme(true);
    localStorage.setItem('pulsechat_user_has_custom_theme', 'true');
    localStorage.setItem('pulsechat_user_custom_theme', JSON.stringify(nextCustom));

    if (token) {
      fetch('/api/users/settings/chat', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          theme: newTheme,
          isCustomTheme: true,
          customTheme: nextCustom
        })
      }).catch(() => {});
    }
  };

  // User sets font size
  const setFontSize = (newSize) => {
    setFontSizeState(newSize);
    localStorage.setItem('pulsechat_fontsize', newSize);

    const nextCustom = {
      ...(userCustomTheme || adminTheme),
      fontSize: newSize
    };
    setUserCustomTheme(nextCustom);
    setIsCustomTheme(true);
    localStorage.setItem('pulsechat_user_has_custom_theme', 'true');
    localStorage.setItem('pulsechat_user_custom_theme', JSON.stringify(nextCustom));

    if (token) {
      fetch('/api/users/settings/chat', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          fontSize: newSize,
          isCustomTheme: true,
          customTheme: nextCustom
        })
      }).catch(() => {});
    }
  };

  // User sets font family
  const setFontFamily = (newFont) => {
    const nextCustom = {
      ...(userCustomTheme || adminTheme),
      fontFamily: newFont
    };
    setUserCustomTheme(nextCustom);
    setIsCustomTheme(true);
    localStorage.setItem('pulsechat_user_has_custom_theme', 'true');
    localStorage.setItem('pulsechat_user_custom_theme', JSON.stringify(nextCustom));

    if (token) {
      fetch('/api/users/settings/chat', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          isCustomTheme: true,
          customTheme: nextCustom
        })
      }).catch(() => {});
    }
  };

  // User sets arbitrary custom theme updates
  const setCustomTheme = (updates) => {
    const nextCustom = {
      ...(userCustomTheme || adminTheme),
      ...updates
    };
    setUserCustomTheme(nextCustom);
    setIsCustomTheme(true);
    localStorage.setItem('pulsechat_user_has_custom_theme', 'true');
    localStorage.setItem('pulsechat_user_custom_theme', JSON.stringify(nextCustom));

    if (token) {
      fetch('/api/users/settings/chat', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          isCustomTheme: true,
          customTheme: nextCustom
        })
      }).catch(() => {});
    }
  };

  // Reset to Admin Default Theme
  const resetToAdminDefault = async () => {
    setIsCustomTheme(false);
    setUserCustomTheme(null);
    localStorage.removeItem('pulsechat_user_has_custom_theme');
    localStorage.removeItem('pulsechat_user_custom_theme');
    localStorage.removeItem('pulsechat_theme');
    localStorage.removeItem('pulsechat_fontsize');

    setThemeModeState(adminTheme.mode || 'dark');
    setFontSizeState(adminTheme.fontSize || 'medium');

    // Instantly apply admin theme
    applyThemeToDOM(adminTheme);

    if (token) {
      try {
        await fetch('/api/users/settings/chat', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          credentials: 'include',
          body: JSON.stringify({
            resetToDefault: true,
            isCustomTheme: false
          })
        });
      } catch {}
    }
  };

  // --------------------------------------------------------------------------
  // ADMIN ACTIONS (Called by Admin Panel)
  // --------------------------------------------------------------------------
  const updateAdminDefaultTheme = async (newThemePayload) => {
    const merged = {
      ...adminTheme,
      ...newThemePayload
    };

    const res = await fetch('/api/admin/theme', {
      method: 'PUT',
      headers: authHeaders ? authHeaders(true) : {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({ defaultTheme: merged })
    });

    const data = await res.json();
    if (data.success && data.defaultTheme) {
      setAdminTheme(data.defaultTheme);
      localStorage.setItem('pulsechat_admin_theme', JSON.stringify(data.defaultTheme));
      // If user hasn't customized their theme, it updates immediately
      if (!isCustomTheme) {
        applyThemeToDOM(data.defaultTheme);
      }
    }
    return data;
  };

  const palette = ACCENT_PALETTES[activeTheme.accentColor] || {
    id: 'custom',
    name: 'Custom',
    primary: activeTheme.primaryColor,
    hover: activeTheme.primaryHover,
    secondary: activeTheme.secondaryColor,
    light: activeTheme.primaryLight,
    border: activeTheme.primaryBorder,
    bg: 'bg-accent',
    bgHover: 'bg-accent-hover',
    text: 'text-accent',
    ring: 'ring-accent'
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: activeTheme.mode,
        setTheme,
        accentColor: activeTheme.accentColor,
        setAccentColor,
        palette,
        fontSize: activeTheme.fontSize,
        setFontSize,
        fontFamily: activeTheme.fontFamily,
        setFontFamily,
        activeTheme,
        adminTheme,
        isCustomTheme,
        setCustomTheme,
        resetToAdminDefault,
        updateAdminDefaultTheme,
        refreshAdminTheme: fetchAdminTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
