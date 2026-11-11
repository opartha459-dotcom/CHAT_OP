import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';

const MaintenanceContext = createContext({
  activeMaintenance: null,
  upcomingMaintenance: null,
  isFeatureInMaintenance: () => false,
  refreshMaintenance: () => {}
});

export const MaintenanceProvider = ({ children }) => {
  const { socket } = useSocket();
  const [activeMaintenance, setActiveMaintenance] = useState(null);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState(null);

  const fetchMaintenance = useCallback(async () => {
    try {
      const res = await fetch('/api/system/maintenance');
      const data = await res.json();
      if (data.success) {
        setActiveMaintenance(data.active || null);
        setUpcomingMaintenance(data.upcoming || null);
      }
    } catch (err) {
      // Gracefully retain current state on network failure
    }
  }, []);

  useEffect(() => {
    fetchMaintenance();
  }, [fetchMaintenance]);

  // Real-time socket updates for maintenance
  useEffect(() => {
    if (!socket) return;

    const handleMaintenanceUpdated = (state) => {
      if (state && typeof state === 'object') {
        setActiveMaintenance(state.active || null);
        setUpcomingMaintenance(state.upcoming || null);
      } else {
        fetchMaintenance();
      }
    };

    socket.on('maintenance:updated', handleMaintenanceUpdated);

    return () => {
      socket.off('maintenance:updated', handleMaintenanceUpdated);
    };
  }, [socket, fetchMaintenance]);

  // Periodic fallback check every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      fetchMaintenance();
    }, 30000);

    return () => clearInterval(timer);
  }, [fetchMaintenance]);

  const isFeatureInMaintenance = useCallback(
    (featureKey) => {
      if (!activeMaintenance) return false;
      if (activeMaintenance.scope === 'full_system') return true;

      const affected = Array.isArray(activeMaintenance.affectedFeatures)
        ? activeMaintenance.affectedFeatures
        : [];

      // Check key and common aliases
      const aliasMap = {
        chat: ['chat', 'messaging'],
        status: ['status', 'statuses'],
        calls: ['calls', 'calling'],
        fileSharing: ['fileSharing', 'files', 'media'],
        registration: ['registration', 'signup'],
        voice: ['voice', 'voiceMessages'],
        polls: ['polls']
      };

      const keysToCheck = aliasMap[featureKey] || [featureKey];
      return keysToCheck.some((k) => affected.includes(k));
    },
    [activeMaintenance]
  );

  return (
    <MaintenanceContext.Provider
      value={{
        activeMaintenance,
        upcomingMaintenance,
        isFeatureInMaintenance,
        refreshMaintenance: fetchMaintenance
      }}
    >
      {children}
    </MaintenanceContext.Provider>
  );
};

export const useMaintenance = () => useContext(MaintenanceContext);

