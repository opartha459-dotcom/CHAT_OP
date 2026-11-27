import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { useFeatureFlags } from './FeatureFlagsContext';
import { StatusViewerModal } from '../components/status/StatusViewerModal';
import { CreateStatusModal } from '../components/status/CreateStatusModal';

const defaultStatusContext = {
  feed: [],
  fetchFeed: () => {},
  activeUserId: null,
  setActiveUserId: () => {},
  activeGroup: null,
  myStatusGroup: null,
  otherStatusGroups: [],
  hasActiveStatus: () => false,
  hasUnviewedStatus: () => false,
  hasPartiallyViewedStatus: () => false,
  hasAnyUnviewed: false,
  markStatusViewed: () => {},
  createModalOpen: false,
  setCreateModalOpen: () => {}
};

const StatusContext = createContext(defaultStatusContext);

export const StatusProvider = ({ children }) => {
  const { user, token } = useAuth();
  const { socket } = useSocket();
  const { featureFlags } = useFeatureFlags();

  const [feed, setFeed] = useState([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeUserId, setActiveUserIdState] = useState(null);
  const [initialSlideMode, setInitialSlideMode] = useState('auto');
  const statusPushedRef = React.useRef(false);

  // Mobile hardware back button support for Status Viewer & Create Status modals
  useEffect(() => {
    const isModalOpen = Boolean(activeUserId || createModalOpen);
    if (isModalOpen && !statusPushedRef.current) {
      statusPushedRef.current = true;
      window.history.pushState({ pulseGuard: 'status' }, '');
    } else if (!isModalOpen) {
      statusPushedRef.current = false;
    }
  }, [activeUserId, createModalOpen]);

  useEffect(() => {
    const onPopState = () => {
      if (activeUserId) {
        statusPushedRef.current = false;
        setActiveUserIdState(null);
      } else if (createModalOpen) {
        statusPushedRef.current = false;
        setCreateModalOpen(false);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [activeUserId, createModalOpen]);

  const setActiveUserId = useCallback((userId) => {
    setInitialSlideMode('auto');
    setActiveUserIdState(userId);
  }, []);

  const fetchFeed = useCallback(async () => {
    if (!user && !token) return;
    try {
      const res = await fetch('/api/status/feed', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
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
  }, [user, token]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Mark status as viewed/completed locally to accurately reflect completion status
  const markStatusViewed = useCallback((statusId, authorUserId, isCompleted = true) => {
    if (!statusId) return;
    const sIdStr = statusId.toString();

    setFeed((prevFeed) =>
      prevFeed.map((group) => {
        const statuses = group.statuses || [];
        const hasMatchingStatus = statuses.some(
          (s) => s._id?.toString() === sIdStr
        );
        if (!hasMatchingStatus) return group;

        const updatedStatuses = statuses.map((s) => {
          if (s._id?.toString() !== sIdStr) return s;
          return {
            ...s,
            hasViewed: Boolean(isCompleted)
          };
        });

        // Story is only allViewed when every single status in the sequence has been completed!
        const allViewed = updatedStatuses.length > 0 && updatedStatuses.every((s) => Boolean(s.hasViewed));

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
        markStatusViewed(payload.statusId, payload.authorId, Boolean(payload.completed));
      }
    };

    socket.on('status:new', handleFeedUpdate);
    socket.on('status:deleted', handleFeedUpdate);
    socket.on('status:viewed', handleFeedUpdate);
    socket.on('status:viewed_by_me', handleSelfViewed);
    socket.on('status:reaction', handleFeedUpdate);
    socket.on('status:poll_voted', handleFeedUpdate);
    socket.on('status:reply', handleFeedUpdate);
    socket.on('status:admin_story_created', handleFeedUpdate);
    socket.on('status:admin_story_viewed', handleFeedUpdate);
    socket.on('status:admin_story_reply', handleFeedUpdate);

    return () => {
      socket.off('status:new', handleFeedUpdate);
      socket.off('status:deleted', handleFeedUpdate);
      socket.off('status:viewed', handleFeedUpdate);
      socket.off('status:viewed_by_me', handleSelfViewed);
      socket.off('status:reaction', handleFeedUpdate);
      socket.off('status:poll_voted', handleFeedUpdate);
      socket.off('status:reply', handleFeedUpdate);
      socket.off('status:admin_story_created', handleFeedUpdate);
      socket.off('status:admin_story_viewed', handleFeedUpdate);
      socket.off('status:admin_story_reply', handleFeedUpdate);
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

  const hasPartiallyViewedStatus = useCallback(
    (targetUserId) => {
      if (!targetUserId) return false;
      const idStr = targetUserId.toString();
      const group = feed.find((g) => g.user?._id?.toString() === idStr);
      if (!group || !Array.isArray(group.statuses) || group.statuses.length < 2) return false;
      const viewedCount = group.statuses.filter((s) => Boolean(s.hasViewed)).length;
      return viewedCount > 0 && viewedCount < group.statuses.length;
    },
    [feed]
  );

  const hasAnyUnviewed = useMemo(
    () => otherStatusGroups.some((g) => !g.allViewed),
    [otherStatusGroups]
  );

  const handleNextUser = useCallback(() => {
    if (activeGroupIndex >= 0 && activeGroupIndex < feed.length - 1) {
      setInitialSlideMode('first');
      setActiveUserIdState(feed[activeGroupIndex + 1].user?._id?.toString());
    } else {
      setActiveUserIdState(null);
    }
  }, [activeGroupIndex, feed]);

  const handlePrevUser = useCallback(() => {
    if (activeGroupIndex > 0) {
      setInitialSlideMode('last');
      setActiveUserIdState(feed[activeGroupIndex - 1].user?._id?.toString());
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
    hasPartiallyViewedStatus,
    hasAnyUnviewed,
    markStatusViewed,
    createModalOpen,
    setCreateModalOpen
  };

  return (
    <StatusContext.Provider value={value}>
      {children}

      {/* Global Status Viewer Modal */}
      {featureFlags?.statusesEnabled !== false && activeUserId !== null && activeGroup && (
        <StatusViewerModal
          isOpen={true}
          statusGroup={activeGroup}
          initialSlideMode={initialSlideMode}
          onClose={() => {
            setActiveUserIdState(null);
            fetchFeed();
          }}
          onNextUser={handleNextUser}
          onPrevUser={handlePrevUser}
          onStatusDeleted={() => fetchFeed()}
          onStatusViewed={markStatusViewed}
        />
      )}

      {/* Global Create Status Modal */}
      {featureFlags?.statusesEnabled !== false && (
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
  return context || defaultStatusContext;
};
