import React from 'react';

/**
 * Base animated Skeleton item with shimmering pulse effect
 */
export const Skeleton = ({ className = '', rounded = 'rounded-lg' }) => {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 dark:bg-slate-800/80 ${rounded} ${className}`}
    />
  );
};

/**
 * Skeleton loader for a conversation item in the sidebar
 */
export const ConversationItemSkeleton = () => {
  return (
    <div className="flex items-center space-x-3 px-4 py-3.5 border-b border-slate-100/50 dark:border-slate-800/30">
      {/* Avatar */}
      <Skeleton className="w-11 h-11 flex-shrink-0" rounded="rounded-full" />
      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="w-24 h-3.5" rounded="rounded-md" />
          <Skeleton className="w-10 h-2.5" rounded="rounded-md" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="w-40 h-2.5" rounded="rounded-md" />
          <Skeleton className="w-4 h-4" rounded="rounded-full" />
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton list for Sidebar conversation loading
 */
export const SidebarSkeleton = ({ count = 6 }) => {
  return (
    <div className="flex-1 divide-y divide-slate-100/50 dark:divide-slate-800/30 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <ConversationItemSkeleton key={i} />
      ))}
    </div>
  );
};

/**
 * Chat message bubble skeleton representing a realistic chat thread
 */
export const ChatMessagesSkeleton = () => {
  return (
    <div className="flex-1 px-4 py-6 space-y-5 overflow-hidden">
      {/* Date badge */}
      <div className="flex justify-center mb-6">
        <Skeleton className="w-20 h-5" rounded="rounded-full" />
      </div>

      {/* Message 1: Incoming */}
      <div className="flex items-end space-x-2 max-w-md">
        <Skeleton className="w-7 h-7 flex-shrink-0" rounded="rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="w-64 h-12" rounded="rounded-2xl rounded-bl-xs" />
          <Skeleton className="w-12 h-2" rounded="rounded-md" />
        </div>
      </div>

      {/* Message 2: Outgoing (Me) */}
      <div className="flex items-end justify-end space-x-2 ml-auto max-w-md">
        <div className="space-y-1.5 flex flex-col items-end flex-1">
          <Skeleton className="w-48 h-9" rounded="rounded-2xl rounded-br-xs" />
          <Skeleton className="w-12 h-2" rounded="rounded-md" />
        </div>
      </div>

      {/* Message 3: Incoming multi-line */}
      <div className="flex items-end space-x-2 max-w-lg">
        <Skeleton className="w-7 h-7 flex-shrink-0" rounded="rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="w-80 h-16" rounded="rounded-2xl rounded-bl-xs" />
          <Skeleton className="w-14 h-2" rounded="rounded-md" />
        </div>
      </div>

      {/* Message 4: Outgoing */}
      <div className="flex items-end justify-end space-x-2 ml-auto max-w-sm">
        <div className="space-y-1.5 flex flex-col items-end flex-1">
          <Skeleton className="w-56 h-10" rounded="rounded-2xl rounded-br-xs" />
          <Skeleton className="w-10 h-2" rounded="rounded-md" />
        </div>
      </div>

      {/* Message 5: Incoming short */}
      <div className="flex items-end space-x-2 max-w-xs">
        <Skeleton className="w-7 h-7 flex-shrink-0" rounded="rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="w-36 h-8" rounded="rounded-2xl rounded-bl-xs" />
          <Skeleton className="w-10 h-2" rounded="rounded-md" />
        </div>
      </div>
    </div>
  );
};

/**
 * Full Dashboard Skeleton for direct routing access, session verification, and page loads
 */
export const DashboardSkeleton = () => {
  return (
    <div className="h-screen h-[100dvh] w-full flex overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans select-none">
      {/* Sidebar Skeleton */}
      <aside className="w-full md:w-80 lg:w-96 h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
        {/* Top Navbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Skeleton className="w-8 h-8" rounded="rounded-xl" />
            <Skeleton className="w-24 h-5" rounded="rounded-md" />
            <Skeleton className="w-12 h-4 hidden sm:block" rounded="rounded-md" />
          </div>
          <div className="flex items-center space-x-1.5">
            <Skeleton className="w-8 h-8" rounded="rounded-lg" />
            <Skeleton className="w-8 h-8" rounded="rounded-lg" />
            <Skeleton className="w-8 h-8" rounded="rounded-lg" />
          </div>
        </div>

        {/* Search Input skeleton */}
        <div className="px-4 py-3">
          <Skeleton className="w-full h-9" rounded="rounded-xl" />
        </div>

        {/* Filter Tabs skeleton */}
        <div className="flex items-center space-x-2 px-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Skeleton className="w-16 h-7" rounded="rounded-lg" />
          <Skeleton className="w-16 h-7" rounded="rounded-lg" />
          <Skeleton className="w-16 h-7" rounded="rounded-lg" />
          <Skeleton className="w-16 h-7" rounded="rounded-lg" />
        </div>

        {/* Conversation List Skeleton */}
        <SidebarSkeleton count={6} />

        {/* Bottom User Profile Bar Skeleton */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-2.5">
            <Skeleton className="w-9 h-9" rounded="rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="w-20 h-3" rounded="rounded-md" />
              <Skeleton className="w-14 h-2" rounded="rounded-md" />
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Skeleton className="w-7 h-7" rounded="rounded-lg" />
            <Skeleton className="w-7 h-7" rounded="rounded-lg" />
          </div>
        </div>
      </aside>

      {/* Main Chat Area Skeleton (Desktop & large screens) */}
      <div className="hidden md:flex flex-1 h-full flex-col bg-slate-50/40 dark:bg-slate-950/40 min-w-0">
        {/* Chat Header Skeleton */}
        <div className="h-16 px-4 border-b border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Skeleton className="w-10 h-10" rounded="rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="w-32 h-4" rounded="rounded-md" />
              <Skeleton className="w-20 h-2.5" rounded="rounded-md" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="w-8 h-8" rounded="rounded-lg" />
            <Skeleton className="w-8 h-8" rounded="rounded-lg" />
            <Skeleton className="w-8 h-8" rounded="rounded-lg" />
          </div>
        </div>

        {/* Message Thread Skeleton */}
        <ChatMessagesSkeleton />

        {/* Message Input Bar Skeleton */}
        <div className="p-4 bg-white/60 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-3">
          <Skeleton className="w-9 h-9" rounded="rounded-full" />
          <Skeleton className="flex-1 h-11" rounded="rounded-2xl" />
          <Skeleton className="w-10 h-10" rounded="rounded-full" />
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton card for Auth routes (login/register/landing)
 */
export const AuthCardSkeleton = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Logo Skeleton */}
      <div className="mb-8 flex items-center space-x-2.5">
        <Skeleton className="w-10 h-10" rounded="rounded-2xl" />
        <Skeleton className="w-28 h-6" rounded="rounded-md" />
      </div>

      {/* Card Skeleton */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="space-y-2 text-center flex flex-col items-center">
          <Skeleton className="w-36 h-5" rounded="rounded-md" />
          <Skeleton className="w-56 h-3" rounded="rounded-md" />
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="w-24 h-3" rounded="rounded-md" />
            <Skeleton className="w-full h-11" rounded="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="w-20 h-3" rounded="rounded-md" />
            <Skeleton className="w-full h-11" rounded="rounded-xl" />
          </div>
          <Skeleton className="w-full h-12" rounded="rounded-xl" />
        </div>
      </div>
    </div>
  );
};
