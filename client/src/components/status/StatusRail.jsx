import React from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';
import { useStatus } from '../../context/StatusContext';

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
      ? 'My Status'
      : person?.nickname || person?.username || 'User';

    const hasUnviewed =
      !isOwn && group?.allViewed !== true;

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
              ? 'View my status'
              : 'Add a status'
            : `View ${displayName}'s status`
        }
      >
        <span
          className={`relative block w-14 h-14 rounded-full p-[2px] transition-transform group-hover:scale-105 group-active:scale-95 ${
            isOwn
              ? myStatusGroup
                ? 'bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-md'
                : 'border-2 border-dashed border-slate-300 dark:border-slate-700'
              : hasUnviewed
                ? 'bg-gradient-to-tr from-emerald-400 via-teal-500 to-indigo-500 shadow-md'
                : 'border-2 border-slate-300 dark:border-slate-700'
          }`}
        >
          <span className="flex w-full h-full rounded-full overflow-hidden bg-white dark:bg-slate-900 border-2 border-white dark:border-slate-900 items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs">
            {renderAvatar(person || user, isOwn ? 'Y' : 'U')}
          </span>

          {/* Add status indicator */}
          {isOwn && (
            <span className="absolute -right-0.5 -bottom-0.5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center border-2 border-white dark:border-slate-950 shadow">
              <Plus className="w-3 h-3 stroke-[3]" />
            </span>
          )}

          {/* Unviewed status indicator */}
          {hasUnviewed && (
            <span className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-950" />
          )}
        </span>

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
          {
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
