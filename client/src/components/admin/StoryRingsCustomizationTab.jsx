import React, { useState, useMemo } from 'react';
import {
  Palette,
  RotateCcw,
  Check,
  Loader2,
  Plus,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { StoryRing } from '../common/StoryRing';
import { Avatar } from '../common/Avatar';
import { DEFAULT_STORY_RING_CONFIG, useStoryRing } from '../../context/StoryRingContext';

export const StoryRingsCustomizationTab = ({ authHeaders, showMsg }) => {
  const { storyRingConfig, updateRingConfigLocally } = useStoryRing();

  const [ringConfigForm, setRingConfigForm] = useState(() => ({
    ...DEFAULT_STORY_RING_CONFIG,
    ...storyRingConfig
  }));
  const [savedRingConfigForm, setSavedRingConfigForm] = useState(() => ({
    ...DEFAULT_STORY_RING_CONFIG,
    ...storyRingConfig
  }));
  const [ringConfigSaving, setRingConfigSaving] = useState(false);

  const ringConfigHasChanges = useMemo(
    () => JSON.stringify(ringConfigForm) !== JSON.stringify(savedRingConfigForm),
    [ringConfigForm, savedRingConfigForm]
  );

  const handleSave = async () => {
    setRingConfigSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ storyRingConfig: ringConfigForm })
      });
      const d = await res.json();
      if (d.success) {
        showMsg('Story ring customization saved & broadcast in real-time!');
        updateRingConfigLocally(ringConfigForm);
        setSavedRingConfigForm(ringConfigForm);
      } else {
        showMsg(d.message || 'Failed to save story ring settings', 'error');
      }
    } catch {
      showMsg('Network error saving story ring settings', 'error');
    } finally {
      setRingConfigSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    setRingConfigForm(DEFAULT_STORY_RING_CONFIG);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Unsaved Changes Banner */}
      {ringConfigHasChanges && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-amber-200 text-xs">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>You have unsaved Story Ring changes. Click Save to broadcast dynamically to all users.</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setRingConfigForm(savedRingConfigForm)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium cursor-pointer"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={ringConfigSaving}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold shadow-md cursor-pointer flex items-center space-x-1.5"
            >
              {ringConfigSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save & Broadcast</span>
            </button>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="p-5 rounded-3xl bg-[#1C1530] border border-violet-900/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Palette className="w-5 h-5 text-fuchsia-400" />
            <span>Centralized Story Ring Customization</span>
          </h3>
          <p className="text-xs text-violet-300/70">
            Configure circular rings for Official Stories and normal user Stories independently. Rings render as guaranteed 1:1 perfect circles across chat lists, stories rail, user profiles, and notifications.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5"
            title="Restore system default colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={ringConfigSaving}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-lg shadow-violet-950/60 active:scale-95 disabled:opacity-50"
          >
            {ringConfigSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            )}
            <span>Save Ring Settings</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Official Story Rings & User Story Rings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ══ SECTION 1: OFFICIAL STORY RING SETTINGS ══ */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#1C1530] border border-violet-900/40 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-violet-900/30 pb-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-400 animate-pulse" />
              <h4 className="font-bold text-white text-sm">Official Story Ring Settings</h4>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-bold uppercase">
              PulseChat Official
            </span>
          </div>

          {/* Type Switcher: Solid vs Gradient */}
          <div className="flex items-center space-x-2 bg-black/40 p-1 rounded-2xl border border-violet-900/40">
            <button
              type="button"
              onClick={() =>
                setRingConfigForm((prev) => ({
                  ...prev,
                  official: { ...prev.official, type: 'gradient' }
                }))
              }
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                ringConfigForm.official?.type === 'gradient'
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md'
                  : 'text-violet-300/70 hover:text-white'
              }`}
            >
              Gradient Color
            </button>
            <button
              type="button"
              onClick={() =>
                setRingConfigForm((prev) => ({
                  ...prev,
                  official: { ...prev.official, type: 'solid' }
                }))
              }
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                ringConfigForm.official?.type === 'solid'
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md'
                  : 'text-violet-300/70 hover:text-white'
              }`}
            >
              Solid Color
            </button>
          </div>

          {/* Solid Controls */}
          {ringConfigForm.official?.type === 'solid' ? (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-violet-300">Ring Color (HEX)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={ringConfigForm.official?.solidColor || '#8b5cf6'}
                  onChange={(e) =>
                    setRingConfigForm((prev) => ({
                      ...prev,
                      official: { ...prev.official, solidColor: e.target.value }
                    }))
                  }
                  className="w-10 h-10 rounded-xl cursor-pointer border border-violet-800 bg-transparent shrink-0"
                />
                <input
                  type="text"
                  value={ringConfigForm.official?.solidColor || '#8b5cf6'}
                  onChange={(e) =>
                    setRingConfigForm((prev) => ({
                      ...prev,
                      official: { ...prev.official, solidColor: e.target.value }
                    }))
                  }
                  className="flex-1 px-3 py-2 bg-black/40 border border-violet-900/50 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="pt-2">
                <span className="text-[11px] text-violet-400 font-semibold block mb-1.5">Official Presets</span>
                <div className="flex items-center space-x-2">
                  {['#8b5cf6', '#a855f7', '#ec4899', '#6366f1', '#3b82f6', '#10b981'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setRingConfigForm((prev) => ({
                          ...prev,
                          official: { ...prev.official, solidColor: c }
                        }))
                      }
                      className="w-7 h-7 rounded-full border border-white/20 transition transform hover:scale-110 active:scale-95 cursor-pointer shadow-md"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Gradient Controls */
            <div className="space-y-4">
              {/* Angle Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-violet-300">Gradient Direction</span>
                  <span className="font-mono text-white font-bold">{ringConfigForm.official?.gradientAngle || 45}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={ringConfigForm.official?.gradientAngle || 45}
                  onChange={(e) =>
                    setRingConfigForm((prev) => ({
                      ...prev,
                      official: { ...prev.official, gradientAngle: parseInt(e.target.value, 10) }
                    }))
                  }
                  className="w-full accent-fuchsia-500 cursor-pointer"
                />
              </div>

              {/* Gradient Stops */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-violet-300">Gradient Color Stops</span>
                  {(ringConfigForm.official?.gradientColors || []).length < 4 && (
                    <button
                      type="button"
                      onClick={() =>
                        setRingConfigForm((prev) => ({
                          ...prev,
                          official: {
                            ...prev.official,
                            gradientColors: [...(prev.official?.gradientColors || []), '#ec4899']
                          }
                        }))
                      }
                      className="text-[11px] text-fuchsia-400 hover:text-fuchsia-300 font-semibold cursor-pointer flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Stop</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {(ringConfigForm.official?.gradientColors || ['#8b5cf6', '#d946ef', '#6366f1']).map((color, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <span className="text-[10px] text-violet-400 font-mono w-4">#{idx + 1}</span>
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => {
                          const next = [...(ringConfigForm.official?.gradientColors || [])];
                          next[idx] = e.target.value;
                          setRingConfigForm((prev) => ({
                            ...prev,
                            official: { ...prev.official, gradientColors: next }
                          }));
                        }}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-violet-800 bg-transparent shrink-0"
                      />
                      <input
                        type="text"
                        value={color}
                        onChange={(e) => {
                          const next = [...(ringConfigForm.official?.gradientColors || [])];
                          next[idx] = e.target.value;
                          setRingConfigForm((prev) => ({
                            ...prev,
                            official: { ...prev.official, gradientColors: next }
                          }));
                        }}
                        className="flex-1 px-3 py-1.5 bg-black/40 border border-violet-900/50 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-violet-500"
                      />
                      {(ringConfigForm.official?.gradientColors || []).length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = (ringConfigForm.official?.gradientColors || []).filter((_, i) => i !== idx);
                            setRingConfigForm((prev) => ({
                              ...prev,
                              official: { ...prev.official, gradientColors: next }
                            }));
                          }}
                          className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 rounded-lg cursor-pointer"
                          title="Remove stop"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Gradient Presets */}
              <div className="pt-2">
                <span className="text-[11px] text-violet-400 font-semibold block mb-1.5">Preset Gradient Themes</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { name: 'Royal Violet', colors: ['#8b5cf6', '#d946ef', '#6366f1'], angle: 45 },
                    { name: 'Neon Sunset', colors: ['#f43f5e', '#ec4899', '#8b5cf6'], angle: 135 },
                    { name: 'Cyberpunk', colors: ['#06b6d4', '#3b82f6', '#8b5cf6'], angle: 90 },
                    { name: 'Golden Pulse', colors: ['#f59e0b', '#ec4899', '#8b5cf6'], angle: 45 }
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() =>
                        setRingConfigForm((prev) => ({
                          ...prev,
                          official: {
                            ...prev.official,
                            gradientColors: preset.colors,
                            gradientAngle: preset.angle
                          }
                        }))
                      }
                      className="h-8 rounded-xl border border-white/20 transition hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center text-[10px] text-white font-bold shadow-md"
                      style={{
                        background: `linear-gradient(${preset.angle}deg, ${preset.colors.join(', ')})`
                      }}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Official Live Preview Card */}
          <div className="pt-3 border-t border-violet-900/30 space-y-2">
            <span className="text-xs font-bold text-violet-300 uppercase tracking-wider block">Live Ring Preview</span>
            <div className="p-4 rounded-2xl bg-black/60 border border-violet-900/40 flex items-center justify-around">
              {/* Active / Unseen State */}
              <div className="flex flex-col items-center space-y-1.5">
                <StoryRing
                  size="md"
                  hasStatus={true}
                  hasUnviewed={true}
                  isOfficial={true}
                  customConfig={ringConfigForm.official}
                >
                  <img
                    src="/icons/icon-192.png"
                    alt="PulseChat"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/icons/icon.svg';
                    }}
                  />
                </StoryRing>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Unseen (Active)</span>
              </div>

              {/* Viewed State */}
              <div className="flex flex-col items-center space-y-1.5">
                <StoryRing
                  size="md"
                  hasStatus={true}
                  hasUnviewed={false}
                  isOfficial={true}
                  customConfig={ringConfigForm.official}
                >
                  <img
                    src="/icons/icon-192.png"
                    alt="PulseChat"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/icons/icon.svg';
                    }}
                  />
                </StoryRing>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fully Viewed</span>
              </div>
            </div>
          </div>
        </div>

        {/* ══ SECTION 2: NORMAL USER STORY RING SETTINGS ══ */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#1C1530] border border-violet-900/40 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-violet-900/30 pb-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
              <h4 className="font-bold text-white text-sm">Normal User Story Ring Settings</h4>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase">
              User Stories
            </span>
          </div>

          {/* Type Switcher: Solid vs Gradient */}
          <div className="flex items-center space-x-2 bg-black/40 p-1 rounded-2xl border border-violet-900/40">
            <button
              type="button"
              onClick={() =>
                setRingConfigForm((prev) => ({
                  ...prev,
                  user: { ...prev.user, type: 'gradient' }
                }))
              }
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                ringConfigForm.user?.type === 'gradient'
                  ? 'bg-gradient-to-r from-indigo-600 to-pink-600 text-white shadow-md'
                  : 'text-violet-300/70 hover:text-white'
              }`}
            >
              Gradient Color
            </button>
            <button
              type="button"
              onClick={() =>
                setRingConfigForm((prev) => ({
                  ...prev,
                  user: { ...prev.user, type: 'solid' }
                }))
              }
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                ringConfigForm.user?.type === 'solid'
                  ? 'bg-gradient-to-r from-indigo-600 to-pink-600 text-white shadow-md'
                  : 'text-violet-300/70 hover:text-white'
              }`}
            >
              Solid Color
            </button>
          </div>

          {/* Solid Controls */}
          {ringConfigForm.user?.type === 'solid' ? (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-violet-300">Ring Color (HEX)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={ringConfigForm.user?.solidColor || '#6366f1'}
                  onChange={(e) =>
                    setRingConfigForm((prev) => ({
                      ...prev,
                      user: { ...prev.user, solidColor: e.target.value }
                    }))
                  }
                  className="w-10 h-10 rounded-xl cursor-pointer border border-violet-800 bg-transparent shrink-0"
                />
                <input
                  type="text"
                  value={ringConfigForm.user?.solidColor || '#6366f1'}
                  onChange={(e) =>
                    setRingConfigForm((prev) => ({
                      ...prev,
                      user: { ...prev.user, solidColor: e.target.value }
                    }))
                  }
                  className="flex-1 px-3 py-2 bg-black/40 border border-violet-900/50 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="pt-2">
                <span className="text-[11px] text-violet-400 font-semibold block mb-1.5">User Presets</span>
                <div className="flex items-center space-x-2">
                  {['#6366f1', '#a855f7', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setRingConfigForm((prev) => ({
                          ...prev,
                          user: { ...prev.user, solidColor: c }
                        }))
                      }
                      className="w-7 h-7 rounded-full border border-white/20 transition transform hover:scale-110 active:scale-95 cursor-pointer shadow-md"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Gradient Controls */
            <div className="space-y-4">
              {/* Angle Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-violet-300">Gradient Direction</span>
                  <span className="font-mono text-white font-bold">{ringConfigForm.user?.gradientAngle || 45}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={ringConfigForm.user?.gradientAngle || 45}
                  onChange={(e) =>
                    setRingConfigForm((prev) => ({
                      ...prev,
                      user: { ...prev.user, gradientAngle: parseInt(e.target.value, 10) }
                    }))
                  }
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Gradient Stops */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-violet-300">Gradient Color Stops</span>
                  {(ringConfigForm.user?.gradientColors || []).length < 4 && (
                    <button
                      type="button"
                      onClick={() =>
                        setRingConfigForm((prev) => ({
                          ...prev,
                          user: {
                            ...prev.user,
                            gradientColors: [...(prev.user?.gradientColors || []), '#ec4899']
                          }
                        }))
                      }
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Stop</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {(ringConfigForm.user?.gradientColors || ['#6366f1', '#a855f7', '#ec4899']).map((color, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <span className="text-[10px] text-violet-400 font-mono w-4">#{idx + 1}</span>
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => {
                          const next = [...(ringConfigForm.user?.gradientColors || [])];
                          next[idx] = e.target.value;
                          setRingConfigForm((prev) => ({
                            ...prev,
                            user: { ...prev.user, gradientColors: next }
                          }));
                        }}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-violet-800 bg-transparent shrink-0"
                      />
                      <input
                        type="text"
                        value={color}
                        onChange={(e) => {
                          const next = [...(ringConfigForm.user?.gradientColors || [])];
                          next[idx] = e.target.value;
                          setRingConfigForm((prev) => ({
                            ...prev,
                            user: { ...prev.user, gradientColors: next }
                          }));
                        }}
                        className="flex-1 px-3 py-1.5 bg-black/40 border border-violet-900/50 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-violet-500"
                      />
                      {(ringConfigForm.user?.gradientColors || []).length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = (ringConfigForm.user?.gradientColors || []).filter((_, i) => i !== idx);
                            setRingConfigForm((prev) => ({
                              ...prev,
                              user: { ...prev.user, gradientColors: next }
                            }));
                          }}
                          className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 rounded-lg cursor-pointer"
                          title="Remove stop"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Gradient Presets */}
              <div className="pt-2">
                <span className="text-[11px] text-violet-400 font-semibold block mb-1.5">Preset Gradient Themes</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { name: 'Instagram Sunset', colors: ['#6366f1', '#a855f7', '#ec4899'], angle: 45 },
                    { name: 'Aurora', colors: ['#10b981', '#06b6d4', '#6366f1'], angle: 135 },
                    { name: 'Bubblegum', colors: ['#ec4899', '#f43f5e', '#fb923c'], angle: 90 },
                    { name: 'Deep Space', colors: ['#3b82f6', '#8b5cf6', '#ec4899'], angle: 45 }
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() =>
                        setRingConfigForm((prev) => ({
                          ...prev,
                          user: {
                            ...prev.user,
                            gradientColors: preset.colors,
                            gradientAngle: preset.angle
                          }
                        }))
                      }
                      className="h-8 rounded-xl border border-white/20 transition hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center text-[10px] text-white font-bold shadow-md"
                      style={{
                        background: `linear-gradient(${preset.angle}deg, ${preset.colors.join(', ')})`
                      }}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* User Live Preview Card */}
          <div className="pt-3 border-t border-violet-900/30 space-y-2">
            <span className="text-xs font-bold text-violet-300 uppercase tracking-wider block">Live Ring Preview</span>
            <div className="p-4 rounded-2xl bg-black/60 border border-violet-900/40 flex items-center justify-around">
              {/* Active / Unseen State */}
              <div className="flex flex-col items-center space-y-1.5">
                <StoryRing
                  size="md"
                  hasStatus={true}
                  hasUnviewed={true}
                  isOfficial={false}
                  customConfig={ringConfigForm.user}
                >
                  <Avatar name="Sarah Connor" size="md" noRing={true} />
                </StoryRing>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Unseen (Active)</span>
              </div>

              {/* Viewed State */}
              <div className="flex flex-col items-center space-y-1.5">
                <StoryRing
                  size="md"
                  hasStatus={true}
                  hasUnviewed={false}
                  isOfficial={false}
                  customConfig={ringConfigForm.user}
                >
                  <Avatar name="Sarah Connor" size="md" noRing={true} />
                </StoryRing>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fully Viewed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ SECTION 3: VIEWED STORY RING COLOR ══ */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#1C1530] border border-violet-900/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="font-bold text-white text-sm">Viewed Stories Muted Ring Color</h4>
          <p className="text-xs text-violet-300/70">
            Color used for status rings once all stories in a sequence have been viewed by the current user.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <input
            type="color"
            value={ringConfigForm.viewedColor || '#94a3b8'}
            onChange={(e) =>
              setRingConfigForm((prev) => ({
                ...prev,
                viewedColor: e.target.value
              }))
            }
            className="w-10 h-10 rounded-xl cursor-pointer border border-violet-800 bg-transparent shrink-0"
          />
          <input
            type="text"
            value={ringConfigForm.viewedColor || '#94a3b8'}
            onChange={(e) =>
              setRingConfigForm((prev) => ({
                ...prev,
                viewedColor: e.target.value
              }))
            }
            className="w-28 px-3 py-2 bg-black/40 border border-violet-900/50 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>
    </div>
  );
};
