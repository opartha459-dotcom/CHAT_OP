import React from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';
import { useStatus } from '../../context/StatusContext';
import { StoryRing } from '../common/StoryRing';

export const StatusRail = () => {
  const { user } = useAuth();
  const { featureFlags } = useFeatureFlags();
  const {
    myStatusGroup,
    otherStatusGroups,
    setActiveUserId,
    setCreateModalOpen
  } = useStatus();

  const currentUserId = user?._id?.toString();

  if (featureFlags?.statusesEnabled === false) {
    return null;
  }

  // Open own status or create a new one.
  const openMyStatus = () => {
    if (myStatusGroup) {
      setActiveUserId(currentUserId);
    } else {
      setCreateModalOpen(true);
    }
  };

  // Render user avatar.
  const renderAvatar = (person, fallback = 'U') => {
    const isOfficial = Boolean(
      person?.isOfficial ||
      (person?.nickname || '').toLowerCase().includes('pulsechat') ||
      (person?.username || '').toLowerCase().includes('pulsechat')
    );

    if (isOfficial) {
      const officialAvatar = (person?.avatar && !person.avatar.includes('1618005182384'))
        ? person.avatar
        : '/icons/icon-192.png';
      return (
        <img
          src={officialAvatar}
          alt="PulseChat"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = '/icons/icon.svg';
          }}
        />
      );
    }

    const displayName =
      person?.nickname || person?.username || fallback;

    return person?.avatar ? (
      <img
        src={person.avatar}
        alt={displayName}
        className="w-full h-full object-cover"
      />
    ) : (
      displayName[0]?.toUpperCase() || fallback
    );
  };

  // Render an individual status item.
  const renderStatusItem = (group, isOwn = false) => {
    const person = group?.user;

    const displayName = isOwn
      ? 'My Story'
      : person?.isOfficial
      ? (person?.nickname || 'PulseChat')
      : person?.nickname || person?.username || 'User';

    const hasUnviewed = isOwn
      ? Boolean(myStatusGroup && !myStatusGroup.allViewed)
      : group?.allViewed !== true;

    const isPartiallyViewed = Boolean(
      group?.statuses?.length > 1 &&
      group.statuses.some((s) => s.hasViewed) &&
      group.statuses.some((s) => !s.hasViewed)
    );

    return (
      <button
        key={person?._id?.toString() || 'my-status'}
        type="button"
        onClick={() =>
          isOwn
            ? openMyStatus()
            : setActiveUserId(person?._id?.toString())
        }
        className="flex flex-col items-center flex-shrink-0 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl px-0.5"
        aria-label={
          isOwn
            ? myStatusGroup
              ? 'View my story'
              : 'Add a Pulse Story'
            : `View ${displayName}'s story`
        }
      >
        <StoryRing
          size="lg"
          hasStatus={isOwn ? Boolean(myStatusGroup) : true}
          hasUnviewed={hasUnviewed}
          isPartiallyViewed={isPartiallyViewed}
          isOfficial={Boolean(person?.isOfficial)}
          isOwn={isOwn}
          showAddBadge={isOwn}
          onAddClick={openMyStatus}
          title={isOwn ? (myStatusGroup ? 'View my story' : 'Add a Pulse Story') : `View ${displayName}'s story`}
        >
          <div className="w-full h-full flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs overflow-hidden">
            {renderAvatar(person || user, isOwn ? 'Y' : 'U')}
          </div>
        </StoryRing>

        <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 mt-1 max-w-[62px] truncate text-center">
          {displayName}
        </span>
      </button>
    );
  };

  return (
    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 select-none">
        {renderStatusItem(
          myStatusGroup || {
            user: user,
            allViewed: true
          },
          true
        )}

        {otherStatusGroups.map((group) =>
          renderStatusItem(group, false)
        )}
      </div>
    </div>
  );
};
