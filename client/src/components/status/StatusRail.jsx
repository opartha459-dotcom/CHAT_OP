import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';
import { CreateStatusModal } from './CreateStatusModal';
import { StatusViewerModal } from './StatusViewerModal';

export const StatusRail = () => {
  const { user, token } = useAuth();
  const { socket } = useSocket();
  const { featureFlags } = useFeatureFlags();

  const [feed, setFeed] = useState([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeUserId, setActiveUserId] = useState(null);

  const fetchFeed = async () => {
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
  };

  useEffect(() => {
    fetchFeed();
  }, [token]);

  // Socket listener for real-time status updates (viewed, created, reacted, deleted)
  useEffect(() => {
    if (!socket) return;

    const handleFeedUpdate = () => {
      fetchFeed();
    };

    socket.on('status:new', handleFeedUpdate);
    socket.on('status:deleted', handleFeedUpdate);
    socket.on('status:viewed', handleFeedUpdate);
    socket.on('status:reaction', handleFeedUpdate);
    socket.on('status:poll_voted', handleFeedUpdate);

    return () => {
      socket.off('status:new', handleFeedUpdate);
      socket.off('status:deleted', handleFeedUpdate);
      socket.off('status:viewed', handleFeedUpdate);
      socket.off('status:reaction', handleFeedUpdate);
      socket.off('status:poll_voted', handleFeedUpdate);
    };
  }, [socket]);

  if (featureFlags.statusesEnabled === false) {
    return null;
  }

  const currentUserId = user?._id?.toString();
  const myStatusGroup = feed.find((g) => g.user?._id?.toString() === currentUserId);
  const otherStatusGroups = feed.filter((g) => g.user?._id?.toString() !== currentUserId);

  const activeGroup = activeUserId ? feed.find((g) => g.user?._id?.toString() === activeUserId) : null;
  const activeGroupIndex = activeUserId ? feed.findIndex((g) => g.user?._id?.toString() === activeUserId) : -1;

  return (
    <>
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30">
        <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar py-1 select-none">
          {/* User's Own Status Item */}
          <div className="flex flex-col items-center flex-shrink-0 cursor-pointer group">
            <div className="relative">
              <div
                onClick={() => {
                  if (myStatusGroup) {
                    setActiveUserId(currentUserId);
                  } else {
                    setCreateModalOpen(true);
                  }
                }}
                className={`w-13 h-13 rounded-full p-0.5 transition-transform group-hover:scale-105 active:scale-95 ${
                  myStatusGroup
                    ? 'bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-md'
                    : 'border-2 border-dashed border-slate-300 dark:border-slate-700'
                }`}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-slate-900 border-2 border-white dark:border-slate-900 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="You" className="w-full h-full object-cover" />
                  ) : (
                    (user?.nickname || user?.username || 'Y')[0]?.toUpperCase()
                  )}
                </div>
              </div>

              {/* Add (+) Badge */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCreateModalOpen(true);
                }}
                className="absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs transition hover:scale-110 active:scale-90"
                title="Create New Status"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
              </button>
            </div>
            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 mt-1 max-w-[56px] truncate text-center">
              {myStatusGroup ? 'My Status' : 'Add Status'}
            </span>
          </div>

          {/* Other Contacts' Statuses */}
          {otherStatusGroups.map((group) => {
            const hasUnviewed = !group.allViewed;
            const displayName = group.user?.nickname || group.user?.username || 'User';

            return (
              <div
                key={group.user?._id}
                onClick={() => {
                  setActiveUserId(group.user?._id?.toString());
                }}
                className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
              >
                <div
                  className={`w-13 h-13 rounded-full p-0.5 transition-transform group-hover:scale-105 active:scale-95 ${
                    hasUnviewed
                      ? 'bg-gradient-to-tr from-emerald-400 via-teal-500 to-indigo-500 shadow-md animate-pulse'
                      : 'border-2 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-slate-900 border-2 border-white dark:border-slate-900 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs">
                    {group.user?.avatar ? (
                      <img src={group.user.avatar} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      displayName[0]?.toUpperCase()
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 mt-1 max-w-[56px] truncate text-center">
                  {displayName}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Status Modal */}
      <CreateStatusModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onStatusCreated={() => fetchFeed()}
      />

      {/* Story Viewer Modal */}
      {activeUserId !== null && activeGroup && (
        <StatusViewerModal
          isOpen={true}
          statusGroup={activeGroup}
          onClose={() => setActiveUserId(null)}
          onNextUser={() => {
            if (activeGroupIndex >= 0 && activeGroupIndex < feed.length - 1) {
              setActiveUserId(feed[activeGroupIndex + 1].user?._id?.toString());
            } else {
              setActiveUserId(null);
            }
          }}
          onPrevUser={() => {
            if (activeGroupIndex > 0) {
              setActiveUserId(feed[activeGroupIndex - 1].user?._id?.toString());
            }
          }}
          onStatusDeleted={() => fetchFeed()}
        />
      )}
    </>
  );
};
