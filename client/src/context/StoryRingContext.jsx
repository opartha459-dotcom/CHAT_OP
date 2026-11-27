import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useSocket } from './SocketContext';

export const DEFAULT_STORY_RING_CONFIG = {
  official: {
    type: 'gradient',
    solidColor: '#8b5cf6',
    gradientColors: ['#8b5cf6', '#d946ef', '#6366f1'],
    gradientAngle: 45
  },
  user: {
    type: 'gradient',
    solidColor: '#6366f1',
    gradientColors: ['#6366f1', '#a855f7', '#ec4899'],
    gradientAngle: 45
  },
  viewedColor: '#94a3b8'
};

const StoryRingContext = createContext({
  storyRingConfig: DEFAULT_STORY_RING_CONFIG,
  getRingBackground: () => '',
  updateRingConfigLocally: () => {}
});

export const StoryRingProvider = ({ children }) => {
  const { socket } = useSocket();
  const [storyRingConfig, setStoryRingConfig] = useState(() => {
    try {
      const cached = localStorage.getItem('pulsechat_story_ring_config');
      if (cached) {
        return { ...DEFAULT_STORY_RING_CONFIG, ...JSON.parse(cached) };
      }
    } catch (e) {
      // Ignore localStorage parse errors
    }
    return DEFAULT_STORY_RING_CONFIG;
  });

  // Fetch initial ring config from public settings
  useEffect(() => {
    let isMounted = true;
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/system/features');
        const data = await res.json();
        if (data.success && data.storyRingConfig && isMounted) {
          const merged = { ...DEFAULT_STORY_RING_CONFIG, ...data.storyRingConfig };
          setStoryRingConfig(merged);
          try {
            localStorage.setItem('pulsechat_story_ring_config', JSON.stringify(merged));
          } catch (e) {}
        }
      } catch (err) {
        // Fallback to local state
      }
    };

    fetchConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  // Listen to real-time updates from Admin Dashboard
  useEffect(() => {
    if (!socket) return;

    const handleRingConfigUpdated = (newConfig) => {
      if (newConfig && typeof newConfig === 'object') {
        const merged = { ...DEFAULT_STORY_RING_CONFIG, ...newConfig };
        setStoryRingConfig(merged);
        try {
          localStorage.setItem('pulsechat_story_ring_config', JSON.stringify(merged));
        } catch (e) {}
      }
    };

    socket.on('system:story_rings_updated', handleRingConfigUpdated);
    return () => {
      socket.off('system:story_rings_updated', handleRingConfigUpdated);
    };
  }, [socket]);

  // Generate CSS background string for a given state
  const getRingBackground = useCallback(
    (isOfficial = false, hasUnviewed = true) => {
      if (!hasUnviewed) {
        return storyRingConfig.viewedColor || '#94a3b8';
      }

      const conf = isOfficial ? storyRingConfig.official : storyRingConfig.user;
      if (!conf) return '#6366f1';

      if (conf.type === 'solid' || !Array.isArray(conf.gradientColors) || conf.gradientColors.length < 2) {
        return conf.solidColor || (isOfficial ? '#8b5cf6' : '#6366f1');
      }

      const angle = typeof conf.gradientAngle === 'number' ? conf.gradientAngle : 45;
      const colors = conf.gradientColors.filter(Boolean);
      if (colors.length < 2) {
        return colors[0] || conf.solidColor || '#6366f1';
      }
      return `linear-gradient(${angle}deg, ${colors.join(', ')})`;
    },
    [storyRingConfig]
  );

  const updateRingConfigLocally = useCallback((newConfig) => {
    setStoryRingConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      try {
        localStorage.setItem('pulsechat_story_ring_config', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  const value = useMemo(
    () => ({
      storyRingConfig,
      getRingBackground,
      updateRingConfigLocally
    }),
    [storyRingConfig, getRingBackground, updateRingConfigLocally]
  );

  return (
    <StoryRingContext.Provider value={value}>
      {children}
    </StoryRingContext.Provider>
  );
};

export const useStoryRing = () => {
  return useContext(StoryRingContext);
};
