import React, { useState, useEffect } from 'react';
import {
  Palette,
  Type,
  Image as ImageIcon,
  CircleDashed,
  RotateCcw,
  CheckCircle2,
  RefreshCw,
  Upload,
  Trash2,
  Sun,
  Moon,
  Monitor,
  Sparkles
} from 'lucide-react';
import {
  useTheme,
  THEME_PALETTES,
  TYPOGRAPHY_FONTS,
  FONT_SIZES,
  HEADING_WEIGHTS,
  HEADING_TRANSFORMS,
  DEFAULT_THEME_CONFIG,
  adjustBrightness,
  hexToRgba
} from '../../context/ThemeContext';
import { PulseLogo } from '../common/PulseLogo';
import { StoryRingsCustomizationTab } from './StoryRingsCustomizationTab';

export const AppCustomizationTab = ({ authHeaders, token, showMsg }) => {
  const { adminTheme, updateAdminDefaultTheme, setTheme } = useTheme();

  const [subTab, setSubTab] = useState('brand'); // 'brand' | 'colors' | 'fonts' | 'rings'
  const [draft, setDraft] = useState(() => ({ ...DEFAULT_THEME_CONFIG, ...(adminTheme || {}) }));
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (adminTheme) {
      setDraft({ ...DEFAULT_THEME_CONFIG, ...adminTheme });
    }
  }, [adminTheme]);

  const updateField = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (successMsg) setSuccessMsg('');
  };

  const selectPalette = (paletteId) => {
    const p = THEME_PALETTES[paletteId];
    if (!p) return;
    setDraft((prev) => ({
      ...prev,
      accentColor: paletteId,
      primaryColor: p.primary,
      primaryHover: p.hover,
      primaryLight: hexToRgba(p.primary, 0.15),
      primaryBorder: hexToRgba(p.primary, 0.35),
      secondaryColor: p.secondary || prev.secondaryColor
    }));
  };

  const handleUploadAsset = async (file, targetField, setUploading) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success && (data.fileUrl || data.url)) {
        updateField(targetField, data.fileUrl || data.url);
        showMsg?.('Image uploaded. Click Save & Broadcast to apply.');
      } else {
        showMsg?.(data.message || 'Failed to upload image.');
      }
    } catch {
      showMsg?.('Error uploading image.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    try {
      const result = await updateAdminDefaultTheme(draft);
      if (result?.success) {
        if (draft.mode) setTheme?.(draft.mode);
        setSuccessMsg('App customization saved & broadcasted to all users in real time!');
        showMsg?.('App customization updated.');
      } else {
        showMsg?.(result?.message || 'Failed to save customization.');
      }
    } catch {
      showMsg?.('Error saving customization.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft({ ...DEFAULT_THEME_CONFIG });
    setSuccessMsg('');
  };

  const subTabs = [
    { id: 'brand', label: 'Brand & Logo', icon: ImageIcon },
    { id: 'colors', label: 'Colors & Mode', icon: Palette },
    { id: 'fonts', label: 'Fonts & Typography', icon: Type },
    { id: 'rings', label: 'Story Rings', icon: CircleDashed }
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-violet-900/30">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span>App Customization Studio</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Customize your app&apos;s logo, brand name, colors, theme mode, fonts, and story rings in one place.
          </p>
        </div>

        {subTab !== 'rings' && (
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 flex items-center space-x-1.5 transition cursor-pointer"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{saving ? 'Broadcasting...' : 'Save & Broadcast'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {subTabs.map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 whitespace-nowrap transition cursor-pointer ${
                active
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'bg-[#1E1833] text-slate-300 hover:text-white border border-violet-900/30'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {subTab === 'rings' ? (
        <StoryRingsCustomizationTab authHeaders={authHeaders} showMsg={showMsg} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {subTab === 'brand' && (
              <div className="p-5 rounded-2xl bg-[#1E1833] border border-violet-900/35 space-y-4">
                <h3 className="text-sm font-bold text-white">Brand Identity &amp; App Logo</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Application Name
                    </label>
                    <input
                      type="text"
                      value={draft.appName || ''}
                      onChange={(e) => updateField('appName', e.target.value)}
                      placeholder="PulseChat"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Brand Tagline
                    </label>
                    <input
                      type="text"
                      value={draft.appTagline || ''}
                      onChange={(e) => updateField('appTagline', e.target.value)}
                      placeholder="Encrypted Messenger"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* App Logo Upload / URL */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Custom App Logo (Image URL or Upload)
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={draft.appLogoUrl || ''}
                      onChange={(e) => updateField('appLogoUrl', e.target.value)}
                      placeholder="https://... or upload an image"
                      className="flex-1 min-w-[200px] px-3.5 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <label className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingLogo}
                        onChange={(e) => handleUploadAsset(e.target.files?.[0], 'appLogoUrl', setUploadingLogo)}
                      />
                    </label>
                    {draft.appLogoUrl && (
                      <button
                        type="button"
                        onClick={() => updateField('appLogoUrl', '')}
                        className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Default</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Favicon Upload / URL */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Browser Favicon URL
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={draft.faviconUrl || ''}
                      onChange={(e) => updateField('faviconUrl', e.target.value)}
                      placeholder="https://... or upload favicon"
                      className="flex-1 min-w-[200px] px-3.5 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingFavicon ? 'Uploading...' : 'Upload Icon'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingFavicon}
                        onChange={(e) => handleUploadAsset(e.target.files?.[0], 'faviconUrl', setUploadingFavicon)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {subTab === 'colors' && (
              <div className="p-5 rounded-2xl bg-[#1E1833] border border-violet-900/35 space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-white mb-2">Accent Color Presets</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {Object.entries(THEME_PALETTES).map(([id, pal]) => {
                      const active = draft.accentColor === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => selectPalette(id)}
                          className={`p-2.5 rounded-xl border flex flex-col items-center space-y-1.5 cursor-pointer transition ${
                            active ? 'border-white bg-slate-800/80' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                          }`}
                        >
                          <span className="w-6 h-6 rounded-full shadow-md" style={{ backgroundColor: pal.primary }} />
                          <span className="text-[10px] font-semibold text-slate-200 capitalize">{pal.label || id}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Custom Primary Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={draft.primaryColor || '#6366f1'}
                        onChange={(e) => {
                          const c = e.target.value;
                          setDraft((prev) => ({
                            ...prev,
                            primaryColor: c,
                            primaryHover: adjustBrightness(c, -12),
                            primaryLight: hexToRgba(c, 0.15),
                            primaryBorder: hexToRgba(c, 0.35)
                          }));
                        }}
                        className="w-10 h-9 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={draft.primaryColor || '#6366f1'}
                        onChange={(e) => updateField('primaryColor', e.target.value)}
                        className="flex-1 px-3 py-2 text-xs font-mono rounded-xl bg-slate-950/70 border border-slate-800 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Secondary Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={draft.secondaryColor || '#10b981'}
                        onChange={(e) => updateField('secondaryColor', e.target.value)}
                        className="w-10 h-9 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={draft.secondaryColor || '#10b981'}
                        onChange={(e) => updateField('secondaryColor', e.target.value)}
                        className="flex-1 px-3 py-2 text-xs font-mono rounded-xl bg-slate-950/70 border border-slate-800 text-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Default Theme Mode
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'dark', label: 'Dark', icon: Moon },
                      { id: 'light', label: 'Light', icon: Sun },
                      { id: 'system', label: 'System', icon: Monitor }
                    ].map((m) => {
                      const Icon = m.icon;
                      const active = draft.mode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => updateField('mode', m.id)}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer transition ${
                            active
                              ? 'border-indigo-500 bg-indigo-950/60 text-white'
                              : 'border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {subTab === 'fonts' && (
              <div className="p-5 rounded-2xl bg-[#1E1833] border border-violet-900/35 space-y-4">
                <h3 className="text-sm font-bold text-white">Typography &amp; Fonts</h3>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Font Family
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TYPOGRAPHY_FONTS.map((f) => {
                      const active = draft.fontFamily === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => updateField('fontFamily', f.id)}
                          style={{ fontFamily: f.family }}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                            active
                              ? 'border-indigo-500 bg-indigo-950/60 text-white'
                              : 'border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-xs font-bold truncate">{f.label || f.id}</div>
                          <div className="text-[10px] text-slate-400">Aa Bb Cc 123</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Base Font Size
                    </label>
                    <select
                      value={draft.fontSize || 'medium'}
                      onChange={(e) => updateField('fontSize', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-white"
                    >
                      {FONT_SIZES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label} ({s.px})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Heading Weight
                    </label>
                    <select
                      value={draft.fontWeightHeading || '700'}
                      onChange={(e) => updateField('fontWeightHeading', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-white"
                    >
                      {HEADING_WEIGHTS.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.label} ({w.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Heading Transform
                    </label>
                    <select
                      value={draft.headingTransform || 'none'}
                      onChange={(e) => updateField('headingTransform', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-white"
                    >
                      {HEADING_TRANSFORMS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Live Brand & Theme Preview (5 cols) */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-[#1E1833] border border-violet-900/35 space-y-4 sticky top-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Brand Preview</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {draft.mode?.toUpperCase()} · {draft.fontFamily}
              </span>
            </div>

            <div
              className={`p-4 rounded-2xl border space-y-4 transition-colors ${
                draft.mode === 'light'
                  ? 'bg-white border-slate-200 text-slate-900'
                  : 'bg-slate-950 border-slate-800 text-white'
              }`}
              style={{ fontFamily: TYPOGRAPHY_FONTS.find((f) => f.id === draft.fontFamily)?.family || 'Inter, sans-serif' }}
            >
              {/* Brand Header Preview */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-500/20">
                <div className="flex items-center space-x-2.5">
                  {draft.appLogoUrl ? (
                    <img
                      src={draft.appLogoUrl}
                      alt={draft.appName || 'Logo'}
                      className="w-9 h-9 rounded-xl object-cover shadow"
                    />
                  ) : (
                    <PulseLogo size="sm" showText={false} animated={false} />
                  )}
                  <div>
                    <div
                      className="text-sm font-bold leading-tight"
                      style={{
                        fontWeight: draft.fontWeightHeading || '700',
                        textTransform: draft.headingTransform || 'none'
                      }}
                    >
                      {draft.appName || 'PulseChat'}
                    </div>
                    <div className="text-[10px] opacity-60">{draft.appTagline || 'Encrypted Messenger'}</div>
                  </div>
                </div>

                <button
                  type="button"
                  style={{ backgroundColor: draft.primaryColor || '#6366f1' }}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-white shadow"
                >
                  New Chat
                </button>
              </div>

              {/* Sample Chat Preview */}
              <div className="space-y-2 text-xs">
                <div
                  className={`p-2.5 rounded-2xl rounded-bl-xs max-w-[80%] ${
                    draft.mode === 'light' ? 'bg-slate-100 text-slate-800' : 'bg-slate-800 text-slate-100'
                  }`}
                >
                  Hey! Loving the new look and custom font.
                </div>
                <div
                  style={{ backgroundColor: draft.primaryColor || '#6366f1' }}
                  className="p-2.5 rounded-2xl rounded-br-xs max-w-[80%] ml-auto text-white"
                >
                  Updated live from the App Customization Studio!
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
