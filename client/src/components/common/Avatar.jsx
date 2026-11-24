import React from 'react';

const colors = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-blue-500'
];

const getColorForName = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const Avatar = ({
  src,
  name = 'User',
  size = 'md',
  isOnline = false,
  showOnlineStatus = false,
  noRing = false,       // suppress the default ring on the img
  ringClass = '',       // custom ring override, e.g. "ring-2 ring-violet-500/60"
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl'
  };

  const statusSize = {
    xs: 'w-1.5 h-1.5 ring-1',
    sm: 'w-2 h-2 ring-1',
    md: 'w-2.5 h-2.5 ring-2',
    lg: 'w-3 h-3 ring-2',
    xl: 'w-3.5 h-3.5 ring-2'
  };

  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  const defaultRing = noRing ? '' : 'ring-1 ring-slate-700/60';
  const appliedRing = ringClass || defaultRing;

  const isPulseChat = Boolean(
    (name || '').toLowerCase().includes('pulsechat') ||
    (name || '').toLowerCase() === 'official' ||
    (src && typeof src === 'string' && src.includes('1618005182384'))
  );
  const effectiveSrc = (src && !src.includes('1618005182384')) ? src : (isPulseChat ? '/icons/icon-192.png' : null);

  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0">
      {effectiveSrc ? (
        <img
          src={effectiveSrc}
          alt={name}
          onError={(e) => {
            e.currentTarget.onerror = null;
            if (isPulseChat) {
              e.currentTarget.src = '/icons/icon.svg';
            }
          }}
          className={`${sizeClasses[size] || sizeClasses.md} rounded-full object-cover shrink-0 aspect-square ${appliedRing}`}
        />
      ) : (
        <div
          className={`${sizeClasses[size] || sizeClasses.md} ${getColorForName(
            name
          )} text-white font-semibold rounded-full flex items-center justify-center select-none shadow-sm shrink-0 aspect-square ${appliedRing}`}
        >
          {initials}
        </div>
      )}

      {showOnlineStatus && (
        <span
          className={`absolute bottom-0 right-0 ${
            statusSize[size] || statusSize.md
          } rounded-full ring-white dark:ring-slate-900 ${
            isOnline ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-500'
          }`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};
