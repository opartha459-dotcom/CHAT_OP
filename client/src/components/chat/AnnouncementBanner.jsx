import React, { useState, useEffect, useRef } from 'react';
import {
  Info,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Wrench,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Lock,
  Vote,
  BarChart3,
  Flame,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';

export const AnnouncementBanner = () => {
  const { user, token, authHeaders } = useAuth();
  const { socket } = useSocket();
  const { featureFlags } = useFeatureFlags();
  const [announcements, setAnnouncements] = useState([]);
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  const [votingId, setVotingId] = useState(null);

  // Poll race-condition guard: generation counter per announcementId.
  const voteGenerationsRef = useRef({}); // announcementId → current generation
  const pendingAnnVoteIds = useRef(new Set()); // announcementIds with an in-flight vote

  // Fetch active announcements
  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements', {
        headers: authHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.announcements)) {
          // Show unacknowledged announcements
          setAnnouncements(data.announcements.filter((a) => !a.isAcknowledged));
        }
      }
    } catch (err) {
      console.warn('[Announcements] Fetch error:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAnnouncements();
    }
  }, [token]);

  // Real-time socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('announcement:new', (newAnnouncement) => {
      setAnnouncements((prev) => [newAnnouncement, ...prev.filter((a) => a._id !== newAnnouncement._id)]);
    });

    socket.on('announcement:updated', (updated) => {
      setAnnouncements((prev) => prev.map((a) => (a._id === updated._id ? { ...a, ...updated } : a)));
    });

    socket.on('announcement:deleted', ({ announcementId }) => {
      setAnnouncements((prev) => prev.filter((a) => a._id !== announcementId));
    });

    socket.on('announcement:poll:voted', (payload) => {
      if (!payload) return;
      const announcementId = payload.announcementId || payload._id;

      // Skip socket update while we have an in-flight vote for this announcement
      // — our optimistic state is fresher than the broadcast.
      if (pendingAnnVoteIds.current.has(announcementId)) return;

      const incomingPoll = payload.poll || payload.formatted?.poll;
      const pollStats = payload.pollStats || payload.formatted?.pollStats;
      const formatted = payload.formatted || {};

      setAnnouncements((prev) =>
        prev.map((a) => {
          if (a._id === announcementId) {
            const nextPoll = incomingPoll || a.poll;
            const currentUserId = user?._id?.toString();
            let userVotedIndices = formatted.userVotedIndices || a.userVotedIndices || [];
            if (currentUserId && nextPoll && Array.isArray(nextPoll.options)) {
              userVotedIndices = [];
              nextPoll.options.forEach((opt, idx) => {
                if (!opt) return;
                const votes = Array.isArray(opt.votes) ? opt.votes : [];
                if (votes.some((v) => (v?._id || v)?.toString() === currentUserId)) {
                  userVotedIndices.push(idx);
                }
              });
            }

            return {
              ...a,
              ...formatted,
              poll: nextPoll,
              userVotedIndices,
              totalPollVotes: pollStats?.totalPollVotes ?? formatted.totalPollVotes ?? a.totalPollVotes ?? 0
            };
          }
          return a;
        })
      );
    });

    socket.on('announcement:poll:closed', (payload) => {
      if (!payload) return;
      const announcementId = payload.announcementId || payload._id;
      const isClosed = payload.isClosed ?? payload.poll?.isClosed ?? true;
      const incomingPoll = payload.poll || payload.formatted?.poll;

      setAnnouncements((prev) =>
        prev.map((a) => {
          if (a._id === announcementId) {
            return {
              ...a,
              ...(payload.formatted || {}),
              poll: {
                ...(incomingPoll || a.poll),
                isClosed
              }
            };
          }
          return a;
        })
      );
    });

    return () => {
      socket.off('announcement:new');
      socket.off('announcement:updated');
      socket.off('announcement:deleted');
      socket.off('announcement:poll:voted');
      socket.off('announcement:poll:closed');
    };
  }, [socket]);

  // Dismiss / acknowledge announcement for this user
  const handleDismiss = async (id) => {
    setAnnouncements((prev) => prev.filter((a) => a._id !== id));
    try {
      await fetch(`/api/announcements/${id}/acknowledge`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include'
      });
    } catch (err) {
      console.error('[Announcements] Failed to acknowledge:', err);
    }
  };

  // Vote on an announcement poll (persists open state, instant optimistic UI on tap).
  // Uses a generation counter to discard stale network responses when the user
  // rapidly switches options before the first request completes.
  const handleVote = async (announcementId, optionIndex) => {
    const curUserId = user?._id?.toString();
    const targetAnnouncement = announcements.find((a) => a._id === announcementId);
    if (!targetAnnouncement || !targetAnnouncement.poll) return;
    if (targetAnnouncement.poll.isClosed) return;

    // --- generation guard ---
    const myGen = (voteGenerationsRef.current[announcementId] || 0) + 1;
    voteGenerationsRef.current[announcementId] = myGen;
    pendingAnnVoteIds.current.add(announcementId);

    // Snapshot for rollback on error
    const previousState = targetAnnouncement;

    // 1. INSTANT OPTIMISTIC UPDATE (0ms)
    const poll = targetAnnouncement.poll;
    const allowsMultiple = Boolean(poll.allowMultiple);
    const prevVotedIndices = Array.isArray(targetAnnouncement.userVotedIndices)
      ? targetAnnouncement.userVotedIndices
      : [];
    const alreadyVotedThis = prevVotedIndices.includes(optionIndex);

    let nextVotedIndices = [];
    if (allowsMultiple) {
      nextVotedIndices = alreadyVotedThis
        ? prevVotedIndices.filter((i) => i !== optionIndex)
        : [...prevVotedIndices, optionIndex];
    } else {
      nextVotedIndices = alreadyVotedThis ? [] : [optionIndex];
    }

    const nextOptions = (poll.options || []).map((opt, idx) => {
      const curVotes = Array.isArray(opt.votes) ? [...opt.votes] : [];
      let newVotes = curVotes.filter((v) => (v?._id || v)?.toString() !== curUserId);
      if (nextVotedIndices.includes(idx)) {
        newVotes.push(curUserId);
      }
      return {
        ...opt,
        votes: newVotes,
        voteCount: newVotes.length
      };
    });

    const nextTotalVotes = nextOptions.reduce((sum, o) => sum + (o.votes?.length || 0), 0);

    setAnnouncements((prev) =>
      prev.map((a) =>
        a._id === announcementId
          ? {
              ...a,
              poll: { ...poll, options: nextOptions },
              userVotedIndices: nextVotedIndices,
              totalPollVotes: nextTotalVotes
            }
          : a
      )
    );

    // 2. Server sync in background
    try {
      const res = await fetch(`/api/announcements/${announcementId}/poll/vote`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ optionIndex })
      });
      const data = await res.json();

      // Discard if a newer vote was already issued for this announcement
      if (voteGenerationsRef.current[announcementId] !== myGen) return;

      if (data.success && data.announcement) {
        setAnnouncements((prev) =>
          prev.map((a) => (a._id === announcementId ? { ...a, ...data.announcement } : a))
        );
      } else if (!data.success) {
        // Rollback
        setAnnouncements((prev) =>
          prev.map((a) => (a._id === announcementId ? previousState : a))
        );
      }
    } catch (err) {
      console.error('[Poll Vote Error]', err);
      if (voteGenerationsRef.current[announcementId] === myGen) {
        // Rollback
        setAnnouncements((prev) =>
          prev.map((a) => (a._id === announcementId ? previousState : a))
        );
      }
    } finally {
      // Release the lock only if no newer vote has taken over
      if (voteGenerationsRef.current[announcementId] === myGen) {
        pendingAnnVoteIds.current.delete(announcementId);
        delete voteGenerationsRef.current[announcementId];
      }
    }
  };

  // Clean toggle: adds/removes from collapsedIds
  const toggleExpand = (id) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id); // Re-open
      } else {
        next.add(id); // Collapse
      }
      return next;
    });
  };

  if (announcements.length === 0) return null;

  // Design Theme Presets
  const themeStyles = {
    default: {
      bg: 'bg-slate-900/95 dark:bg-slate-950/95 border-slate-700/80',
      text: 'text-slate-100',
      subtext: 'text-slate-300',
      accent: 'bg-indigo-600',
      barBg: 'bg-indigo-500/20',
      barFill: 'bg-indigo-500'
    },
    'cyber-glow': {
      bg: 'bg-gradient-to-r from-purple-950/90 via-slate-900/90 to-cyan-950/90 border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.15)]',
      text: 'text-cyan-50',
      subtext: 'text-cyan-200/80',
      accent: 'bg-cyan-500 text-slate-950',
      barBg: 'bg-cyan-950/50',
      barFill: 'bg-gradient-to-r from-purple-500 to-cyan-400'
    },
    'sunset-fire': {
      bg: 'bg-gradient-to-r from-rose-950/90 via-slate-900/90 to-amber-950/90 border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]',
      text: 'text-amber-50',
      subtext: 'text-amber-200/80',
      accent: 'bg-amber-500 text-slate-950',
      barBg: 'bg-amber-950/50',
      barFill: 'bg-gradient-to-r from-rose-500 to-amber-400'
    },
    'emerald-matrix': {
      bg: 'bg-gradient-to-r from-emerald-950/90 via-slate-900/90 to-teal-950/90 border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.15)]',
      text: 'text-emerald-50',
      subtext: 'text-emerald-200/80',
      accent: 'bg-emerald-500 text-slate-950',
      barBg: 'bg-emerald-950/50',
      barFill: 'bg-gradient-to-r from-teal-500 to-emerald-400'
    },
    'royal-amethyst': {
      bg: 'bg-gradient-to-r from-indigo-950/90 via-purple-950/90 to-violet-950/90 border-violet-500/40 shadow-[0_0_25px_rgba(139,92,246,0.15)]',
      text: 'text-violet-50',
      subtext: 'text-violet-200/80',
      accent: 'bg-violet-600',
      barBg: 'bg-violet-950/50',
      barFill: 'bg-gradient-to-r from-indigo-500 to-violet-400'
    },
    'ocean-wave': {
      bg: 'bg-gradient-to-r from-blue-950/90 via-slate-900/90 to-sky-950/90 border-sky-500/40 shadow-[0_0_25px_rgba(14,165,233,0.15)]',
      text: 'text-sky-50',
      subtext: 'text-sky-200/80',
      accent: 'bg-sky-500 text-slate-950',
      barBg: 'bg-sky-950/50',
      barFill: 'bg-gradient-to-r from-blue-500 to-sky-400'
    },
    'crimson-ruby': {
      bg: 'bg-gradient-to-r from-red-950/90 via-slate-900/90 to-rose-950/90 border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.15)]',
      text: 'text-rose-50',
      subtext: 'text-rose-200/80',
      accent: 'bg-rose-600',
      barBg: 'bg-rose-950/50',
      barFill: 'bg-gradient-to-r from-red-500 to-rose-400'
    },
    'minimal-glass': {
      bg: 'bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800 shadow-md',
      text: 'text-slate-900 dark:text-slate-100',
      subtext: 'text-slate-600 dark:text-slate-400',
      accent: 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950',
      barBg: 'bg-slate-200/70 dark:bg-slate-800/70',
      barFill: 'bg-slate-800 dark:bg-slate-200'
    }
  };

  // Aliases for user-friendly color/theme selection
  themeStyles.cyberpunk = themeStyles['cyber-glow'];
  themeStyles.sunset = themeStyles['sunset-fire'];
  themeStyles.emerald = themeStyles['emerald-matrix'];
  themeStyles.matrix = themeStyles['emerald-matrix'];
  themeStyles.amethyst = themeStyles['royal-amethyst'];
  themeStyles.purple = themeStyles['royal-amethyst'];
  themeStyles.ocean = themeStyles['ocean-wave'];
  themeStyles.blue = themeStyles['ocean-wave'];
  themeStyles.ruby = themeStyles['crimson-ruby'];
  themeStyles.crimson = themeStyles['crimson-ruby'];
  themeStyles.red = themeStyles['crimson-ruby'];
  themeStyles.glass = themeStyles['minimal-glass'];
  themeStyles.minimal = themeStyles['minimal-glass'];

  const fontClasses = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono text-xs tracking-tight',
    display: 'font-sans tracking-wide font-semibold'
  };

  const animationClasses = {
    none: '',
    pulse: 'animate-pulse',
    shimmer: 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
    glow: 'animate-[pulse_3s_ease-in-out_infinite]'
  };

  const getVotesCount = (opt) => {
    if (!opt) return 0;
    if (Array.isArray(opt.votes)) return opt.votes.length;
    if (typeof opt.voteCount === 'number') return opt.voteCount;
    if (typeof opt.votes === 'number') return opt.votes;
    return 0;
  };

  if (featureFlags.announcementsEnabled === false || !Array.isArray(announcements) || announcements.length === 0) {
    return null;
  }

  return (
    <div className="w-full flex flex-col space-y-1 z-30 select-none">
      {announcements.filter(Boolean).map((announcement) => {
        const design = announcement.design || {};
        const theme = themeStyles[design.theme] || themeStyles.default;
        const fontClass = fontClasses[design.font] || fontClasses.sans;
        const animClass = animationClasses[design.animation] || '';
        const badge = design.badge || (announcement.hasPoll ? '🗳️' : '📢');

        const isExpanded = !collapsedIds.has(announcement._id);
        const poll = announcement.poll;
        const userVotedIndices = Array.isArray(announcement.userVotedIndices) ? announcement.userVotedIndices : [];
        const totalVotes = announcement.totalPollVotes || 0;
        const content = announcement.content || '';
        const hasLongContent = content.length > 80;

        // Calculate leading / winning option for results (draw-aware)
        let maxVotes = 0;
        let topOptions = [];
        if (announcement.hasPoll && poll && Array.isArray(poll.options)) {
          const validOptions = poll.options.filter(Boolean);
          maxVotes = validOptions.reduce((max, opt) => Math.max(max, getVotesCount(opt)), 0);
          if (maxVotes > 0) {
            topOptions = validOptions.filter((opt) => getVotesCount(opt) === maxVotes);
          }
        }
        const isDraw = topOptions.length > 1;
        const leadingOption = !isDraw && topOptions.length === 1 ? topOptions[0] : null;
        const winningPct = totalVotes > 0 && maxVotes > 0 ? Math.round((maxVotes / totalVotes) * 100) : 0;

        return (
          <div
            key={announcement._id}
            className={`w-full border-b backdrop-blur-xl transition-all duration-300 px-4 py-2.5 ${theme.bg} ${theme.text} ${fontClass} ${animClass}`}
          >
            {/* Top Bar: Badge, Title, Content Preview / Poll Result, Controls */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                <span className="text-base select-none shrink-0" role="img" aria-label="badge">
                  {badge}
                </span>

                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <span className="font-bold text-xs shrink-0 tracking-wide">
                    {announcement.title || 'Announcement'}
                  </span>
                  {announcement.hasPoll && (
                    <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 dark:bg-white/10 uppercase tracking-wider shrink-0">
                      <BarChart3 className="w-3 h-3" />
                      <span>Poll</span>
                    </span>
                  )}
                  {!isExpanded && (
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <span className={`text-xs truncate opacity-85 ${theme.subtext}`}>
                        {content}
                      </span>
                      {announcement.hasPoll && poll && (
                        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-lg bg-black/25 dark:bg-white/10 shrink-0 text-[11px] font-mono border border-white/10">
                          {poll.isClosed ? (
                            <span className="text-amber-300 font-bold flex items-center space-x-1">
                              <Lock className="w-3 h-3" />
                              <span>Closed</span>
                            </span>
                          ) : (
                            <span className="text-emerald-300 font-bold flex items-center space-x-1">
                              <BarChart3 className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          )}
                          {isDraw && maxVotes > 0 ? (
                            <span className="text-amber-300 font-bold flex items-center space-x-1">
                              <span>🤝</span>
                              <span>Draw ({maxVotes}v each)</span>
                            </span>
                          ) : leadingOption ? (
                            <span className="text-white/90">
                              Top: <strong className="text-white">{leadingOption.text}</strong> ({winningPct}% · {getVotesCount(leadingOption)}v)
                            </span>
                          ) : (
                            <span className="text-white/70">No votes yet</span>
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-1.5 shrink-0">
                {(announcement.hasPoll || hasLongContent) && (
                  <button
                    onClick={() => toggleExpand(announcement._id)}
                    className="p-1 hover:bg-white/15 dark:hover:bg-white/10 rounded-lg transition text-xs flex items-center space-x-1 cursor-pointer"
                    title={isExpanded ? 'Collapse' : 'Expand full announcement'}
                  >
                    <span className="text-[11px] font-medium hidden sm:inline">
                      {isExpanded ? 'Collapse' : 'View'}
                    </span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}

                <button
                  onClick={() => handleDismiss(announcement._id)}
                  className="p-1 hover:bg-white/15 dark:hover:bg-white/10 rounded-lg transition opacity-75 hover:opacity-100 cursor-pointer"
                  title="Dismiss announcement"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Expanded Content View */}
            {isExpanded && (
              <div className="mt-2.5 pt-2 border-t border-white/10 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                {content && (
                  <p className={`text-xs leading-relaxed whitespace-pre-wrap ${theme.subtext}`}>
                    {content}
                  </p>
                )}

                {/* Embedded Interactive Poll */}
                {announcement.hasPoll && poll && Array.isArray(poll.options) && (
                  <div className="mt-2 p-3.5 rounded-2xl bg-black/25 dark:bg-black/40 border border-white/15 space-y-3 shadow-inner">
                    {/* Poll Header & Status */}
                    <div className="flex items-center justify-between text-xs pb-1 border-b border-white/10">
                      <div className="font-semibold flex items-center space-x-2">
                        <Vote className="w-4 h-4 text-indigo-400" />
                        <span className="text-sm">{poll.question || 'Community Poll'}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] opacity-85 font-mono">
                        {poll.isClosed ? (
                          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                            <Lock className="w-3 h-3" />
                            <span>Voting Closed · Final Results</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                            ● Live Poll
                          </span>
                        )}
                        <span>· {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
                      </div>
                    </div>

                    {/* Leading / Winner / Draw Banner */}
                    {maxVotes > 0 && (
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-[11px]">
                        {isDraw ? (
                          <span className="flex items-center space-x-1.5 font-medium text-amber-300">
                            <span>🤝</span>
                            <span>{poll.isClosed ? 'Draw! Multiple winners:' : 'Currently tied:'}</span>
                            <strong className="text-white">{topOptions.map(o => o.text).join(' & ')}</strong>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1.5 font-medium text-amber-300">
                            <span>🏆</span>
                            <span>{poll.isClosed ? 'Winning Choice' : 'Currently Leading'}:</span>
                            <strong className="text-white">{leadingOption?.text}</strong>
                          </span>
                        )}
                        <span className="font-mono font-bold text-amber-200">
                          {winningPct}% · {maxVotes} {maxVotes === 1 ? 'vote' : 'votes'}
                        </span>
                      </div>
                    )}

                    {/* Poll Options with Live Progress Bars */}
                    <div className="space-y-2">
                      {(poll.options || []).filter(Boolean).map((opt, optIdx) => {
                        const optVotes = getVotesCount(opt);
                        const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
                        const hasVoted = userVotedIndices.includes(optIdx);
                        const isWinner = maxVotes > 0 && optVotes === maxVotes;
                        const isVotingThis = votingId === `${announcement._id}_${optIdx}`;

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={poll.isClosed || isVotingThis}
                            onClick={() => handleVote(announcement._id, optIdx)}
                            className={`w-full relative overflow-hidden text-left p-3 rounded-xl border transition group cursor-pointer ${
                              hasVoted
                                ? 'border-indigo-400 bg-indigo-500/20 ring-1 ring-indigo-400/50'
                                : isWinner && poll.isClosed && !isDraw
                                ? 'border-amber-400/80 bg-amber-500/10'
                                : isDraw && isWinner && poll.isClosed
                                ? 'border-amber-400/50 bg-amber-500/5'
                                : 'border-white/10 hover:border-white/30 bg-white/5'
                            } ${poll.isClosed ? 'cursor-default' : 'active:scale-[0.99]'}`}
                          >
                            {/* Animated Background Progress Bar */}
                            <div
                              className={`absolute inset-y-0 left-0 transition-[width] duration-500 ease-in-out ${
                                isWinner && poll.isClosed && !isDraw
                                  ? 'bg-amber-500/30'
                                  : isDraw && isWinner && poll.isClosed
                                  ? 'bg-amber-500/15'
                                  : hasVoted
                                  ? 'bg-indigo-500/35'
                                  : theme.barFill + ' opacity-25'
                              }`}
                              style={{ width: `${pct}%` }}
                            />

                            {/* Option Label, Checkmark & Percentage */}
                            <div className="relative flex items-center justify-between text-xs z-10 font-medium">
                              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition ${
                                    hasVoted
                                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-xs'
                                      : 'border-white/30 group-hover:border-white/60'
                                  }`}
                                >
                                  {hasVoted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </div>
                                <span className="truncate font-semibold">{opt.text}</span>
                                {isWinner && maxVotes > 0 && (
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border shrink-0 ${
                                    isDraw
                                      ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
                                      : 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                                  }`}>
                                    {isDraw ? 'Draw' : poll.isClosed ? 'Winner 🏆' : 'Top'}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center space-x-2 shrink-0 font-mono text-xs">
                                <span className="font-bold">{pct}%</span>
                                <span className="opacity-70 text-[10px]">({optVotes} {optVotes === 1 ? 'vote' : 'votes'})</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
