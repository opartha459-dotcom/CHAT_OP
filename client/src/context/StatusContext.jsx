import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { useFeatureFlags } from './FeatureFlagsContext';
import { StatusViewerModal } from '../components/status/StatusViewerModal';
import { CreateStatusModal } from '../components/status/CreateStatusModal';

const StatusContext = createContext();

export const StatusProvider = ({ children }) => {
  const { user, token } = useAuth();
  const { socket } = useSocket();
  const { featureFlags } = useFeatureFlags();

  const [feed, setFeed] = useState([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeUserId, setActiveUserId] = useState(null);

  const fetchFeed = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/status/feed', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.feed)) {
        setFeed(data.feed);
      }
    } catch (err) {
      console.error('Error fetching status feed:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Mark status as viewed locally to instantly update ring indicators and notification badges
  const markStatusViewed = useCallback((statusId, authorUserId) => {
    if (!statusId) return;
    const sIdStr = statusId.toString();
    const aIdStr = authorUserId?.toString();

    setFeed((prevFeed) =>
      prevFeed.map((group) => {
        const groupId = group.user?._id?.toString();
        if (aIdStr && groupId && groupId !== aIdStr) {
          return group;
        }

        const statuses = group.statuses || [];
        const hasMatchingStatus = statuses.some(
          (s) => s._id?.toString() === sIdStr
        );
        if (!hasMatchingStatus) return group;

        const updatedStatuses = statuses.map((s) =>
          s._id?.toString() === sIdStr ? { ...s, hasViewed: true } : s
        );

        const allViewed = updatedStatuses.every((s) => Boolean(s.hasViewed));

        return {
          ...group,
          statuses: updatedStatuses,
          allViewed
        };
      })
    );
  }, []);

  // Real-time socket updates for statuses
  useEffect(() => {
    if (!socket) return;

    const handleFeedUpdate = () => {
      fetchFeed();
    };

    const handleSelfViewed = (payload) => {
      if (payload?.statusId) {
        markStatusViewed(payload.statusId, payload.authorId);
      }
    };

    socket.on('status:new', handleFeedUpdate);
    socket.on('status:deleted', handleFeedUpdate);
    socket.on('status:viewed', handleFeedUpdate);
    socket.on('status:viewed_by_me', handleSelfViewed);
    socket.on('status:reaction', handleFeedUpdate);
    socket.on('status:poll_voted', handleFeedUpdate);

    return () => {
      socket.off('status:new', handleFeedUpdate);
      socket.off('status:deleted', handleFeedUpdate);
      socket.off('status:viewed', handleFeedUpdate);
      socket.off('status:viewed_by_me', handleSelfViewed);
      socket.off('status:reaction', handleFeedUpdate);
      socket.off('status:poll_voted', handleFeedUpdate);
    };
  }, [socket, fetchFeed, markStatusViewed]);

  const currentUserId = user?._id?.toString();

  const myStatusGroup = useMemo(
    () => feed.find((g) => g.user?._id?.toString() === currentUserId),
    [feed, currentUserId]
  );

  const otherStatusGroups = useMemo(
    () => feed.filter((g) => g.user?._id?.toString() !== currentUserId),
    [feed, currentUserId]
  );

  const activeGroup = useMemo(
    () => (activeUserId ? feed.find((g) => g.user?._id?.toString() === activeUserId) : null),
    [activeUserId, feed]
  );

  const activeGroupIndex = useMemo(
    () => (activeUserId ? feed.findIndex((g) => g.user?._id?.toString() === activeUserId) : -1),
    [activeUserId, feed]
  );

  const hasActiveStatus = useCallback(
    (targetUserId) => {
      if (!targetUserId) return false;
      const idStr = targetUserId.toString();
      return feed.some((g) => g.user?._id?.toString() === idStr && (g.statuses || []).length > 0);
    },
    [feed]
  );

  const hasUnviewedStatus = useCallback(
    (targetUserId) => {
      if (!targetUserId) return false;
      const idStr = targetUserId.toString();
      const group = feed.find((g) => g.user?._id?.toString() === idStr);
      return group ? !group.allViewed : false;
    },
    [feed]
  );

  const hasAnyUnviewed = useMemo(
    () => otherStatusGroups.some((g) => !g.allViewed),
    [otherStatusGroups]
  );

  const handleNextUser = useCallback(() => {
    if (activeGroupIndex >= 0 && activeGroupIndex < feed.length - 1) {
      setActiveUserId(feed[activeGroupIndex + 1].user?._id?.toString());
    } else {
      setActiveUserId(null);
    }
  }, [activeGroupIndex, feed]);

  const handlePrevUser = useCallback(() => {
    if (activeGroupIndex > 0) {
      setActiveUserId(feed[activeGroupIndex - 1].user?._id?.toString());
    }
  }, [activeGroupIndex, feed]);

  const value = {
    feed,
    fetchFeed,
    activeUserId,
    setActiveUserId,
    activeGroup,
    myStatusGroup,
    otherStatusGroups,
    hasActiveStatus,
    hasUnviewedStatus,
    hasAnyUnviewed,
    markStatusViewed,
    createModalOpen,
    setCreateModalOpen
  };

  return (
    <StatusContext.Provider value={value}>
      {children}

      {/* Global Status Viewer Modal */}
      {featureFlags.statusesEnabled !== false && activeUserId !== null && activeGroup && (
        <StatusViewerModal
          isOpen={true}
          statusGroup={activeGroup}
          onClose={() => {
            setActiveUserId(null);
            fetchFeed();
          }}
          onNextUser={handleNextUser}
          onPrevUser={handlePrevUser}
          onStatusDeleted={() => fetchFeed()}
          onStatusViewed={markStatusViewed}
        />
      )}

      {/* Global Create Status Modal */}
      {featureFlags.statusesEnabled !== false && (
        <CreateStatusModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onStatusCreated={() => fetchFeed()}
        />
      )}
    </StatusContext.Provider>
  );
};

export const useStatus = () => {
  const context = useContext(StatusContext);
  if (!context) {
    throw new Error('useStatus must be used within a StatusProvider');
  }
  return context;
};
