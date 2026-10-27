import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from './SocketContext';

const FeatureFlagsContext = createContext({
  featureFlags: {
    callsEnabled: true,
    pollsEnabled: true,
    statusesEnabled: true,
    voiceMessagesEnabled: true,
    announcementsEnabled: true,
    fileSharingEnabled: true
  },
  refreshFeatureFlags: () => {}
});

export const FeatureFlagsProvider = ({ children }) => {
  const { socket } = useSocket();
  const [featureFlags, setFeatureFlags] = useState({
    callsEnabled: true,
    pollsEnabled: true,
    statusesEnabled: true,
    voiceMessagesEnabled: true,
    announcementsEnabled: true,
    fileSharingEnabled: true
  });

  const fetchFlags = async () => {
    try {
      const res = await fetch('/api/system/features');
      const data = await res.json();
      if (data.success && data.featureFlags) {
        setFeatureFlags((prev) => ({
          ...prev,
          ...data.featureFlags
        }));
      }
    } catch (err) {
      // Keep optimistic defaults on network error
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleFeaturesUpdated = (updatedFlags) => {
      if (updatedFlags && typeof updatedFlags === 'object') {
        setFeatureFlags((prev) => ({
          ...prev,
          ...updatedFlags
        }));
      }
    };

    socket.on('system:features_updated', handleFeaturesUpdated);

    return () => {
      socket.off('system:features_updated', handleFeaturesUpdated);
    };
  }, [socket]);

  return (
    <FeatureFlagsContext.Provider value={{ featureFlags, refreshFeatureFlags: fetchFlags }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

export const useFeatureFlags = () => useContext(FeatureFlagsContext);
