import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';

const DEFAULT_FLAGS = {
  chatEnabled: true,
  statusesEnabled: true,
  callsEnabled: true,
  fileSharingEnabled: true,
  userRegistrationEnabled: true,
  notificationsEnabled: true,
  voiceMessagesEnabled: true,
  pollsEnabled: true,
  announcementsEnabled: true,
  e2eeEnabled: true,
  customAvatarUpload: true,
  allowOldDataRequests: true
};

const FeatureFlagsContext = createContext({
  featureFlags: DEFAULT_FLAGS,
  isFeatureEnabled: () => true,
  refreshFeatureFlags: () => {}
});

export const FeatureFlagsProvider = ({ children }) => {
  const { socket } = useSocket();
  const [featureFlags, setFeatureFlags] = useState(DEFAULT_FLAGS);

  const fetchFlags = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

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

  const isFeatureEnabled = useCallback(
    (featureKey) => {
      if (!featureKey) return true;
      if (featureFlags[featureKey] !== undefined) {
        return featureFlags[featureKey] !== false;
      }
      // Check alias mappings
      const aliasMap = {
        chat: 'chatEnabled',
        status: 'statusesEnabled',
        statuses: 'statusesEnabled',
        calls: 'callsEnabled',
        fileSharing: 'fileSharingEnabled',
        files: 'fileSharingEnabled',
        registration: 'userRegistrationEnabled',
        notifications: 'notificationsEnabled',
        voice: 'voiceMessagesEnabled',
        polls: 'pollsEnabled',
        announcements: 'announcementsEnabled',
        e2ee: 'e2eeEnabled',
        customAvatarUpload: 'customAvatarUpload',
        allowOldDataRequests: 'allowOldDataRequests',
        oldDataRequests: 'allowOldDataRequests'
      };
      const key = aliasMap[featureKey] || featureKey;
      return featureFlags[key] !== false;
    },
    [featureFlags]
  );

  return (
    <FeatureFlagsContext.Provider
      value={{
        featureFlags,
        isFeatureEnabled,
        refreshFeatureFlags: fetchFlags
      }}
    >
      {children}
    </FeatureFlagsContext.Provider>
  );
};

export const useFeatureFlags = () => useContext(FeatureFlagsContext);
