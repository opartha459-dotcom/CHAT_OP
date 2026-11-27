import React from 'react';
import { Plus } from 'lucide-react';
import { useStoryRing } from '../../context/StoryRingContext';

const SIZES = {
  xs: { outer: 30, inner: 26, avatar: 'xs' },
  sm: { outer: 38, inner: 34, avatar: 'sm' },
  md: { outer: 48, inner: 43, avatar: 'md' },
  lg: { outer: 58, inner: 52, avatar: 'lg' },
  xl: { outer: 76, inner: 70, avatar: 'xl' }
};

export const StoryRing = ({
  children,
  size = 'md',
  hasStatus = false,
  hasUnviewed = true,
  isPartiallyViewed = false,
  isOfficial = false,
  isOwn = false,
  showAddBadge = false,
  onAddClick,
  onClick,
  className = '',
  title = '',
  customConfig = null
}) => {
  const { getRingBackground, storyRingConfig } = useStoryRing();

  const sizeSpec = typeof size === 'number'
    ? { outer: size + 8, inner: size + 2 }
    : SIZES[size] || SIZES.md;

  const outerPx = sizeSpec.outer;
  const innerPx = sizeSpec.inner;

  // Compute ring styling
  const getComputedStyle = () => {
    if (!hasStatus) {
      if (isOwn) {
        return {
          border: '2px dashed var(--tw-border-opacity, #94a3b8)',
          backgroundColor: 'transparent'
        };
      }
      return {};
    }

    if (!hasUnviewed) {
      // Fully viewed: muted clean border ring
      return {
        border: '2px solid',
        borderColor: storyRingConfig?.viewedColor || '#94a3b8',
        backgroundColor: 'transparent',
        opacity: 0.65
      };
    }

    // Unseen / active story ring:
    let bg = '';
    if (customConfig) {
      if (customConfig.type === 'solid' || !customConfig.gradientColors || customConfig.gradientColors.length < 2) {
        bg = customConfig.solidColor || '#6366f1';
      } else {
        const angle = customConfig.gradientAngle || 45;
        bg = `linear-gradient(${angle}deg, ${customConfig.gradientColors.join(', ')})`;
      }
    } else {
      bg = getRingBackground(isOfficial, true);
    }

    return {
      background: bg,
      boxShadow: isOfficial ? '0 0 12px rgba(139, 92, 246, 0.35)' : '0 0 8px rgba(99, 102, 241, 0.25)'
    };
  };

  const ringStyle = getComputedStyle();

  // If no status and not own add-state, just render children cleanly
  if (!hasStatus && !isOwn) {
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 flex-shrink-0 ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      title={title}
      className={`relative inline-flex items-center justify-center shrink-0 flex-shrink-0 select-none group transition-transform ${
        onClick ? 'cursor-pointer hover:scale-[1.03] active:scale-[0.97]' : ''
      } ${className}`}
      style={{
        width: `${outerPx}px`,
        height: `${outerPx}px`,
        minWidth: `${outerPx}px`,
        minHeight: `${outerPx}px`,
        maxWidth: `${outerPx}px`,
        maxHeight: `${outerPx}px`,
        boxSizing: 'border-box'
      }}
    >
      {/* Outer Ring Circle: Guaranteed 1:1 Aspect Ratio */}
      <div
        className={`w-full h-full rounded-full flex items-center justify-center shrink-0 flex-shrink-0 aspect-square overflow-hidden transition-all duration-300 ${
          isPartiallyViewed ? 'ring-2 ring-indigo-400/50 ring-offset-1 ring-offset-slate-950' : ''
        }`}
        style={{
          width: `${outerPx}px`,
          height: `${outerPx}px`,
          minWidth: `${outerPx}px`,
          minHeight: `${outerPx}px`,
          ...ringStyle
        }}
      >
        {/* Inner Padding Gap: Matches theme background to create clean floating ring gap */}
        <div
          className="rounded-full bg-white dark:bg-slate-950 flex items-center justify-center shrink-0 flex-shrink-0 aspect-square overflow-hidden shadow-inner"
          style={{
            width: `${innerPx}px`,
            height: `${innerPx}px`,
            minWidth: `${innerPx}px`,
            minHeight: `${innerPx}px`,
            maxWidth: `${innerPx}px`,
            maxHeight: `${innerPx}px`,
            boxSizing: 'border-box'
          }}
        >
          {children}
        </div>
      </div>

      {/* Add Story (+) Badge for My Story */}
      {showAddBadge && (
        <button
          type="button"
          onClick={(e) => {
            if (onAddClick) {
              e.stopPropagation();
              onAddClick(e);
            }
          }}
          className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center border-2 border-white dark:border-slate-950 shadow-md cursor-pointer transition-transform active:scale-90 z-20"
          title="Add a Pulse Story"
        >
          <Plus className="w-3 h-3 stroke-[3]" />
        </button>
      )}
    </div>
  );
};
