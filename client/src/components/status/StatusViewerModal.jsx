
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Clock,
  Users,
  Vote,
  Heart,
  Smile,
  Flame,
  Check,
  CheckCircle2,
  Circle,
  Lock,
  Sparkles,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Avatar } from '../common/Avatar';

const QUICK_EMOJIS = ['❤️', '😂', '🔥', '👏', '😮', '😢'];

export const StatusViewerModal = ({
  isOpen,
  onClose,
  statusGroup,
  onNextUser,
  onPrevUser,
  onStatusDeleted,
  onStatusViewed
}) => {
  const { user: currentUser, token } = useAuth();
  const { socket } = useSocket();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeStatus, setActiveStatus] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [sheetTab, setSheetTab] = useState(null);
  const [voting, setVoting] = useState(false);
  const [pollError, setPollError] = useState('');
  const [floatingParticles, setFloatingParticles] = useState([]);
  const [progress, setProgress] = useState(0);

  const activeStatusRef = useRef(activeStatus);

  useEffect(() => {
    activeStatusRef.current = activeStatus;
  }, [activeStatus]);

  const timerRef = useRef(null);
  const elapsedRef = useRef(0);
  const DURATION_MS = 6500;

  const statuses = statusGroup?.statuses || [];
  const authorUserId = (
    statusGroup?.user?._id ||
    statusGroup?.user ||
    activeStatus?.user?._id ||
    activeStatus?.user
  )?.toString();
  const currentUserId = currentUser?._id?.toString();
  const isMine = Boolean(authorUserId && currentUserId && authorUserId === currentUserId);

  // Floating reaction particle spawner.
  const spawnFloatingReaction = (emoji) => {
    const burst = Array.from({ length: 9 }).map((_, i) => ({
      id: `${Date.now()}_${Math.random()}_${i}`,
      emoji,
      left: 18 + Math.random() * 64,
      size: 26 + Math.floor(Math.random() * 22),
      duration: 2.0 + Math.random() * 0.4,
      delay: i * 0.06
    }));

    setFloatingParticles((prev) => [...prev, ...burst]);

    setTimeout(() => {
      setFloatingParticles((prev) =>
        prev.filter((p) => !burst.some((b) => b.id === p.id))
      );
    }, 2800);
  };

  // Reset index when user changes.
  useEffect(() => {
    setCurrentIndex(0);
    elapsedRef.current = 0;
    setProgress(0);
    setSheetTab(null);
  }, [statusGroup?.user?._id]);

  // Sync activeStatus whenever slide index or statusGroup updates.
  useEffect(() => {
    if (statuses && statuses[currentIndex]) {
      const incoming = statuses[currentIndex];
      if (!incoming) return; // guard against sparse arrays

      setActiveStatus((prev) => {
        if (!prev || prev._id?.toString() !== incoming._id?.toString()) {
          return incoming;
        }

        // Merge incoming feed data with local live data (viewers/reactions/poll).
        // Always ensure poll options have a valid votes[] array.
        const mergePoll = () => {
          const src = incoming.poll || prev.poll;
          if (!src) return undefined;
          return {
            ...src,
            options: (src.options || []).filter(Boolean).map((opt) => ({
              ...opt,
              votes: Array.isArray(opt.votes) ? opt.votes : []
            }))
          };
        };

        return {
          ...incoming,
          viewers: incoming.viewers || prev.viewers || [],
          reactions: incoming.reactions || prev.reactions || [],
          poll: mergePoll()
        };
      });
    } else {
      setActiveStatus(null);
    }
  }, [currentIndex, statusGroup]);

  // Keyboard navigation.
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }

      if (event.key === 'ArrowRight') {
        elapsedRef.current = 0;
        setProgress(0);
        setSheetTab(null);

        setCurrentIndex((previous) =>
          previous < statuses.length - 1 ? previous + 1 : previous
        );

        if (currentIndex >= statuses.length - 1) {
          if (onNextUser) onNextUser();
          else onClose();
        }
      }

      if (event.key === 'ArrowLeft') {
        elapsedRef.current = 0;
        setProgress(0);
        setSheetTab(null);

        if (currentIndex > 0) {
          setCurrentIndex((previous) => previous - 1);
        } else {
          onPrevUser?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    currentIndex,
    statuses.length,
    onClose,
    onNextUser,
    onPrevUser
  ]);

  // Mark status as viewed.
  useEffect(() => {
    if (!activeStatus || !isOpen) return;

    if (!isMine) {
      // Optimistically mark as viewed locally right away
      if (!activeStatus.hasViewed) {
        setActiveStatus((prev) => (prev ? { ...prev, hasViewed: true } : prev));
      }
      onStatusViewed?.(activeStatus._id, authorUserId);

      if (token) {
        fetch(`/api/status/${activeStatus._id}/view`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          credentials: 'include'
        })
          .then((res) => res.json())
          .then((data) => {
            if (data?.success) {
              onStatusViewed?.(activeStatus._id, authorUserId);
            }
          })
          .catch(console.error);
      }
    }
  }, [activeStatus?._id, isMine, isOpen, token, onStatusViewed, authorUserId]);

  // Fetch fresh status details (only creator needs full live viewers/reactions list)
  const fetchLiveStatusData = async () => {
    if (!activeStatus?._id || !token || !isMine) return;

    try {
      const res = await fetch('/api/status/mine', {
        headers: {
          Authorization: `Bearer ${token}`
        },
        credentials: 'include'
      });

      const data = await res.json();

      if (data.success && Array.isArray(data.statuses)) {
        const found = data.statuses.find(
          (s) => s._id?.toString() === activeStatus._id?.toString()
        );

        if (found) {
          setActiveStatus((prev) => ({
            ...prev,
            viewers: found.viewers || prev?.viewers || [],
            reactions: found.reactions || prev?.reactions || [],
            poll: found.poll || prev?.poll
          }));
        }
      }
    } catch (err) {
      console.warn('Fetch live status error:', err);
    }
  };

  // Real-time socket updates.
  useEffect(() => {
    if (!socket || !isOpen) return undefined;

    const handleStatusViewed = (payload) => {
      // Privacy: Only the status creator is allowed to view live viewer additions
      if (!isMine) return;

      const curId = activeStatusRef.current?._id?.toString();

      if (payload.statusId?.toString() === curId && payload.viewer) {
        setActiveStatus((prev) => {
          if (!prev || prev._id?.toString() !== payload.statusId?.toString()) {
            return prev;
          }

          const viewers = prev.viewers || [];

          const exists = viewers.some(
            (v) =>
              (v.user?._id || v.user)?.toString() ===
              payload.viewer?._id?.toString()
          );

          if (exists) return prev;

          return {
            ...prev,
            viewers: [
              ...viewers,
              {
                user: payload.viewer,
                viewedAt: payload.viewer.viewedAt
              }
            ]
          };
        });
      }
    };

    const handleStatusReaction = (payload) => {
      const curId = activeStatusRef.current?._id?.toString();

      if (payload.statusId?.toString() === curId) {
        if (payload.emoji && payload.action !== 'removed') {
          spawnFloatingReaction(payload.emoji);
        }

        // Only the creator maintains the live list of who reacted
        if (isMine) {
          setActiveStatus((prev) => {
            if (!prev || prev._id?.toString() !== payload.statusId?.toString()) {
              return prev;
            }

            return {
              ...prev,
              reactions: payload.reactions || []
            };
          });
        }
      }
    };

    const handleReactionAnim = (payload) => {
      const curId = activeStatusRef.current?._id?.toString();
      if (payload.statusId?.toString() === curId && payload.emoji && payload.action !== 'removed') {
        spawnFloatingReaction(payload.emoji);
      }
    };

    const handleStatusPollVoted = (payload) => {
      const curId = activeStatusRef.current?._id?.toString();

      if (payload.statusId?.toString() === curId) {
        setActiveStatus((prev) => {
          if (!prev || prev._id?.toString() !== payload.statusId?.toString()) {
            return prev;
          }

          const incomingPoll = payload.poll;
          if (!incomingPoll) return prev;

          // Normalise options: guard against undefined entries and ensure
          // opt.votes is always an array so .some()/.length never throws.
          const rawOptions = Array.isArray(incomingPoll.options)
            ? incomingPoll.options
            : [];

          const normalizedOptions = rawOptions
            .filter(Boolean) // drop any undefined / null entries
            .map((opt, idx) => {
              const prevOpt = prev.poll?.options?.[idx];
              const votes = Array.isArray(opt.votes)
                ? opt.votes
                : Array.isArray(prevOpt?.votes)
                  ? prevOpt.votes   // keep the previous voter list when server stripped it
                  : [];
              return { ...opt, votes };
            });

          return {
            ...prev,
            poll: { ...incomingPoll, options: normalizedOptions }
          };
        });
      }
    };

    socket.on('status:viewed', handleStatusViewed);
    socket.on('status:reaction', handleStatusReaction);
    socket.on('status:reaction_anim', handleReactionAnim);
    socket.on('status:poll_voted', handleStatusPollVoted);

    return () => {
      socket.off('status:viewed', handleStatusViewed);
      socket.off('status:reaction', handleStatusReaction);
      socket.off('status:reaction_anim', handleReactionAnim);
      socket.off('status:poll_voted', handleStatusPollVoted);
    };
  }, [socket, isOpen]);

  // Story timer and animated progress bar.
  useEffect(() => {
    if (!isOpen || isPaused || sheetTab !== null || !activeStatus) {
      return undefined;
    }

    const interval = 50;

    timerRef.current = setInterval(() => {
      elapsedRef.current = Math.min(
        DURATION_MS,
        elapsedRef.current + interval
      );

      setProgress((elapsedRef.current / DURATION_MS) * 100);

      if (elapsedRef.current >= DURATION_MS) {
        elapsedRef.current = 0;
        setProgress(0);

        if (currentIndex < statuses.length - 1) {
          setCurrentIndex((previous) => previous + 1);
        } else if (onNextUser) {
          onNextUser();
        } else {
          onClose();
        }
      }
    }, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    isOpen,
    isPaused,
    sheetTab,
    currentIndex,
    statuses.length,
    onNextUser,
    onClose,
    activeStatus?._id
  ]);

  // Reset elapsed time whenever the displayed status changes.
  useEffect(() => {
    elapsedRef.current = 0;
    setProgress(0);
  }, [activeStatus?._id]);

  if (!isOpen || !activeStatus) return null;

  const handleNext = () => {
    elapsedRef.current = 0;
    setProgress(0);
    setSheetTab(null);

    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else if (onNextUser) {
      onNextUser();
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    elapsedRef.current = 0;
    setProgress(0);
    setSheetTab(null);

    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else if (onPrevUser) {
      onPrevUser();
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this status update?')) return;

    try {
      const res = await fetch(`/api/status/${activeStatus._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        credentials: 'include'
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        console.error(data.message || 'Failed to delete status');
        return;
      }

      if (onStatusDeleted) {
        onStatusDeleted(activeStatus._id);
      }

      if (statuses.length <= 1) {
        onClose();
      } else {
        handleNext();
      }
    } catch (err) {
      console.error('Delete status error:', err);
    }
  };

  const handleSendReaction = async (emoji) => {
    if (!token || !activeStatus?._id) return;

    spawnFloatingReaction(emoji);

    try {
      const res = await fetch(`/api/status/${activeStatus._id}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ emoji })
      });

      const data = await res.json();

      if (data.success && data.reactions) {
        setActiveStatus((prev) =>
          prev
            ? {
              ...prev,
              reactions: data.reactions,
              viewers: data.viewers || prev.viewers
            }
            : prev
        );
      }
    } catch (err) {
      console.error('React error:', err);
    }
  };

  const handleVotePoll = async (optionIndex) => {
    if (!token || voting || activeStatus?.poll?.isClosed) return;

    setVoting(true);
    setPollError('');

    const curUserId = currentUserId?.toString();
    const prevStatusState = activeStatus;
    const prevPollState = activeStatus.poll;
    if (!prevPollState) {
      setVoting(false);
      return;
    }

    // 1. INSTANT OPTIMISTIC UPDATE (0ms on tap)
    const options = Array.isArray(prevPollState.options) ? prevPollState.options : [];
    const targetOpt = options[optionIndex];
    if (!targetOpt) {
      setVoting(false);
      return;
    }

    const alreadyVotedTarget = (targetOpt.votes || []).some(
      (v) => (v?._id || v)?.toString() === curUserId
    );

    const optimisticOptions = options.map((opt, idx) => {
      const votes = Array.isArray(opt.votes) ? [...opt.votes] : [];
      // Status polls enforce one vote per user; clicking again removes vote
      let nextVotes = votes.filter((v) => (v?._id || v)?.toString() !== curUserId);

      if (idx === optionIndex && !alreadyVotedTarget) {
        nextVotes.push({
          _id: curUserId,
          username: currentUser?.username,
          nickname: currentUser?.nickname,
          avatar: currentUser?.avatar
        });
      }

      return {
        ...opt,
        votes: nextVotes,
        voteCount: nextVotes.length
      };
    });

    const optimisticPoll = {
      ...prevPollState,
      options: optimisticOptions
    };

    setActiveStatus((prev) => (prev ? { ...prev, poll: optimisticPoll } : prev));

    // 2. Background server synchronization
    try {
      const res = await fetch(`/api/status/${activeStatus._id}/poll/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ optionIndex })
      });

      const data = await res.json();

      if (data.success && data.poll) {
        setActiveStatus((prev) => {
          if (!prev) return prev;
          const sPoll = data.poll;
          const normOpts = (sPoll.options || []).map((opt) => ({
            ...opt,
            votes: Array.isArray(opt.votes) ? opt.votes : []
          }));
          return {
            ...prev,
            poll: { ...sPoll, options: normOpts },
            viewers: data.viewers || prev.viewers
          };
        });
      } else {
        // Rollback on server error
        setActiveStatus(prevStatusState);
        setPollError(data.message || 'Failed to submit vote');
      }
    } catch (err) {
      console.error('Vote poll error:', err);
      // Rollback on network failure
      setActiveStatus(prevStatusState);
      setPollError('Network error voting on poll');
    } finally {
      setVoting(false);
    }
  };

  const handleClosePoll = async () => {
    if (
      !window.confirm(
        'Are you sure you want to end this status poll? No further votes will be counted.'
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/status/${activeStatus._id}/poll/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        credentials: 'include'
      });

      const data = await res.json();

      if (data.success && data.poll) {
        setActiveStatus((prev) =>
          prev ? { ...prev, poll: data.poll } : prev
        );
      }
    } catch (err) {
      console.error('Close poll error:', err);
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Math.floor(
      (Date.now() - new Date(dateStr).getTime()) / 1000
    );

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;

    return `${Math.floor(diff / 3600)}h ago`;
  };

  const bgStyle =
    activeStatus.style?.background ||
    'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';

  const fontClass =
    activeStatus.style?.font === 'serif'
      ? 'font-serif'
      : activeStatus.style?.font === 'mono'
        ? 'font-mono'
        : 'font-sans';

  // Check current user reaction.
  const reactionsList = activeStatus.reactions || [];

  const myReaction = reactionsList.find(
    (r) => (r.user?._id || r.user)?.toString() === currentUserId
  );

  // Group reactions by emoji.
  const reactionCounts = reactionsList.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  // Poll calculations.
  const poll = activeStatus.poll;
  const pollOptions = poll?.options || [];

  // For non-owners the server sends voteCount (number) instead of a full votes[]
  // to protect voter privacy. Use voteCount if present, else fall back to array length.
  const totalPollVotes = pollOptions.reduce(
    (sum, opt) => sum + (
      typeof opt.voteCount === 'number'
        ? opt.voteCount
        : (Array.isArray(opt.votes) ? opt.votes.length : 0)
    ),
    0
  );

  const isPollClosed = Boolean(poll?.isClosed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-200 select-none">
      <div
        className="relative w-full sm:max-w-md h-full sm:h-[690px] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between p-5"
        style={{ background: bgStyle }}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Top Segmented Progress Bars */}
        <div className="flex items-center space-x-1.5 relative z-20">
          {statuses.map((s, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;

            return (
              <div
                key={idx}
                className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{
                    width: isCompleted
                      ? '100%'
                      : isCurrent
                        ? `${progress}%`
                        : '0%'
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Header: User Info & Controls */}
        <div className="flex items-center justify-between text-white mt-3 relative z-20">
          <div className="flex items-center space-x-2.5">
            <Avatar
              src={statusGroup.user?.avatar}
              name={
                statusGroup.user?.nickname ||
                statusGroup.user?.username
              }
              size="sm"
            />

            <div>
              <div className="font-bold text-xs">
                {statusGroup.user?.nickname ||
                  statusGroup.user?.username}
              </div>

              <div className="text-[10px] text-white/70 flex items-center space-x-1">
                <Clock className="w-2.5 h-2.5" />
                <span>{timeAgo(activeStatus.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {isMine && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-1.5 hover:bg-black/20 rounded-full transition cursor-pointer"
                title="Delete this status"
              >
                <Trash2 className="w-4 h-4 text-rose-300" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-black/20 rounded-full transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Interactive Tap Zones */}
        <div
          onClick={handlePrev}
          className="absolute left-0 top-16 bottom-24 w-1/3 z-10 cursor-pointer"
        />

        <div
          onClick={handleNext}
          className="absolute right-0 top-16 bottom-24 w-2/3 z-10 cursor-pointer"
        />

        {/* Center Display */}
        <div className="flex-1 flex flex-col items-center justify-center p-3 text-center text-white relative z-20 overflow-y-auto no-scrollbar space-y-4">
          {activeStatus.text && (
            <p
              className={`text-xl sm:text-2xl leading-relaxed max-w-sm break-words ${fontClass} ${activeStatus.style?.bold ? 'font-bold' : 'font-normal'
                } ${activeStatus.style?.italic ? 'italic' : 'not-italic'
                }`}
            >
              {activeStatus.text}
            </p>
          )}

          {/* Status Poll Widget */}
          {activeStatus.hasPoll && poll && (
            <div
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsPaused(true);
              }}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onTouchStart={(e) => {
                e.stopPropagation();
                setIsPaused(true);
              }}
              className="w-full max-w-sm p-4 bg-black/60 backdrop-blur-xl border border-white/25 rounded-2xl text-left space-y-3 z-30 shadow-2xl relative select-none"
            >
              {/* Poll Header */}
              <div className="flex items-center justify-between text-[11px] font-semibold text-white/80 border-b border-white/15 pb-2">
                <span className="flex items-center space-x-1.5 uppercase tracking-wider text-purple-200">
                  <BarChart3 className="w-3.5 h-3.5 text-purple-300" />
                  <span>Poll · Single Vote</span>
                </span>

                {isPollClosed ? (
                  <span className="flex items-center space-x-1 text-rose-300 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded-full text-[10px]">
                    <Lock className="w-3 h-3" />
                    <span>Closed</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Active</span>
                  </span>
                )}
              </div>

              {/* Poll Question */}
              <h4 className="text-sm font-bold text-white leading-snug break-words">
                {poll.question || 'Status Poll'}
              </h4>

              {pollError && (
                <div className="p-2 bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs rounded-xl flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{pollError}</span>
                </div>
              )}

              {/* Poll Options */}
              <div className="space-y-2">
                {pollOptions.map((opt, optIdx) => {
                  // Guard: opt.votes must always be an array – the socket
                  // broadcast for non-owners may omit it or send voteCount only.
                  const votes = Array.isArray(opt.votes) ? opt.votes : [];
                  const voteCount = typeof opt.voteCount === 'number'
                    ? opt.voteCount  // use server-provided count when votes[] was stripped
                    : votes.length;

                  const hasVoted = votes.some(
                    (v) => (v?._id || v)?.toString() === currentUserId
                  );

                  const percentage =
                    totalPollVotes > 0
                      ? Math.round((voteCount / totalPollVotes) * 100)
                      : 0;

                  return (
                    <div
                      key={optIdx}
                      className={`relative overflow-hidden rounded-xl border transition-all ${hasVoted
                        ? 'border-indigo-400 bg-indigo-900/40 text-white font-medium ring-1 ring-indigo-400/60'
                        : 'border-white/20 bg-white/10 hover:border-white/40 hover:bg-white/15 text-white/90'
                        }`}
                    >
                      <button
                        type="button"
                        disabled={voting || isPollClosed}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVotePoll(optIdx);
                        }}
                        className={`w-full text-left p-2.5 relative z-10 ${isPollClosed
                          ? 'cursor-default'
                          : 'cursor-pointer active:scale-[0.99]'
                          }`}
                      >
                        <div
                          className={`absolute inset-y-0 left-0 rounded-xl transition-all duration-500 pointer-events-none ${hasVoted
                            ? 'bg-indigo-500/35'
                            : 'bg-white/15'
                            }`}
                          style={{ width: `${percentage}%` }}
                        />

                        <div className="relative z-10 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2 min-w-0 pr-2">
                            <div className="flex-shrink-0">
                              {hasVoted ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Circle className="w-4 h-4 text-white/50" />
                              )}
                            </div>

                            <span className="truncate text-white font-medium">
                              {opt.text}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5 flex-shrink-0 font-mono text-[11px] text-white/80">
                            <span>{percentage}%</span>
                            <span className="text-[10px] text-white/50">
                              ({voteCount})
                            </span>
                          </div>
                        </div>
                      </button>

                      {/* Individual Voters - only creator can see voter identities */}
                      {isMine && votes.length > 0 && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setSheetTab('poll');
                            fetchLiveStatusData();
                          }}
                          className="relative z-10 flex items-center justify-between px-3 pb-2 pt-0 cursor-pointer group/voters"
                          title="Click to view all voters for this option"
                        >
                          <div className="flex items-center space-x-1">
                            {votes.slice(0, 5).map((voter, vIdx) => {
                              const voterObj =
                                typeof voter === 'object' ? voter : null;

                              return (
                                <div
                                  key={vIdx}
                                  className="w-5 h-5 rounded-full overflow-hidden border border-white/60 bg-slate-800 text-[9px] flex items-center justify-center font-bold text-white shadow-xs"
                                  title={
                                    voterObj?.nickname ||
                                    voterObj?.username ||
                                    'Voter'
                                  }
                                >
                                  {voterObj?.avatar ? (
                                    <img
                                      src={voterObj.avatar}
                                      alt="Voter"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    (
                                      voterObj?.nickname ||
                                      voterObj?.username ||
                                      'U'
                                    )[0]?.toUpperCase()
                                  )}
                                </div>
                              );
                            })}

                            {votes.length > 5 && (
                              <span className="text-[10px] text-white/70 font-mono pl-1">
                                +{votes.length - 5}
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] text-purple-300 hover:text-purple-200 underline underline-offset-2 transition opacity-80 group-hover/voters:opacity-100">
                            See voters
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Poll Footer */}
              <div className="flex items-center justify-between text-[11px] text-white/70 pt-1 border-t border-white/10 font-mono">
                <span>{totalPollVotes} total votes</span>

                {isMine && !isPollClosed && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClosePoll();
                    }}
                    className="text-rose-300 hover:text-rose-200 font-sans font-medium text-xs underline cursor-pointer"
                  >
                    End Poll
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Reactions Summary - ONLY CREATOR CAN VIEW REACTION BREAKDOWN */}
          {isMine && reactionsList.length > 0 && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setSheetTab('reactions');
                fetchLiveStatusData();
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-black/45 hover:bg-black/60 backdrop-blur-md rounded-full border border-white/20 text-white text-xs cursor-pointer shadow-lg transition hover:scale-105 active:scale-95"
              title="View reactions breakdown"
            >
              {Object.entries(reactionCounts).map(([em, cnt]) => (
                <span key={em} className="flex items-center space-x-0.5">
                  <span>{em}</span>
                  <span className="text-[10px] font-mono text-white/80">
                    {cnt}
                  </span>
                </span>
              ))}

              <span className="text-[10px] text-white/60 pl-1">
                · View
              </span>
            </div>
          )}
        </div>

        {/* Floating Reaction Emojis */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
          {floatingParticles.map((p) => (
            <div
              key={p.id}
              className="absolute bottom-16 animate-status-float select-none filter drop-shadow-md pointer-events-none"
              style={{
                left: `${p.left}%`,
                fontSize: `${p.size}px`,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`
              }}
            >
              {p.emoji}
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        {isMine ? (
          <div className="relative z-30 flex items-center justify-center space-x-2">
            <button
              type="button"
              onClick={() => {
                setSheetTab(sheetTab === 'viewers' ? null : 'viewers');
                fetchLiveStatusData();
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white text-xs font-semibold border border-white/20 transition cursor-pointer active:scale-95 shadow-md"
            >
              <Eye className="w-4 h-4 text-emerald-300" />
              <span>{activeStatus.viewers?.length || 0} Viewers</span>
            </button>

            {reactionsList.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSheetTab(sheetTab === 'reactions' ? null : 'reactions');
                  fetchLiveStatusData();
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white text-xs font-semibold border border-white/20 transition cursor-pointer active:scale-95 shadow-md"
              >
                <span>❤️</span>
                <span>{reactionsList.length}</span>
              </button>
            )}

            {activeStatus.hasPoll && (
              <button
                type="button"
                onClick={() => {
                  setSheetTab(sheetTab === 'poll' ? null : 'poll');
                  fetchLiveStatusData();
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white text-xs font-semibold border border-white/20 transition cursor-pointer active:scale-95 shadow-md"
              >
                <BarChart3 className="w-4 h-4 text-purple-300" />
                <span>{totalPollVotes}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="relative z-30 flex items-center justify-center space-x-2 bg-black/50 backdrop-blur-xl border border-white/25 py-2 px-3 rounded-full mx-auto max-w-xs shadow-xl">
            {QUICK_EMOJIS.map((emoji) => {
              const isActive = myReaction?.emoji === emoji;

              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSendReaction(emoji)}
                  className={`text-xl p-1.5 rounded-full transition-all hover:scale-125 active:scale-90 cursor-pointer ${isActive
                    ? 'bg-white/30 scale-120 ring-2 ring-indigo-400 shadow-md'
                    : 'hover:bg-white/15'
                    }`}
                  title={
                    isActive
                      ? `Remove reaction ${emoji}`
                      : `React ${emoji}`
                  }
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        )}

        {/* Slide-up Sheet - STRICTLY FOR STATUS CREATOR ONLY */}
        {isMine && sheetTab !== null && (
          <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-96 bg-slate-900/95 backdrop-blur-2xl border-t border-slate-700/80 rounded-t-3xl p-5 z-40 animate-in slide-in-from-bottom duration-200 flex flex-col shadow-2xl"
          >
            {/* Sheet Tabs Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-white">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSheetTab('viewers')}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition ${sheetTab === 'viewers'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>
                    Viewers ({activeStatus.viewers?.length || 0})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSheetTab('reactions')}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition ${sheetTab === 'reactions'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span>Reactions ({reactionsList.length})</span>
                </button>

                {activeStatus.hasPoll && (
                  <button
                    type="button"
                    onClick={() => setSheetTab('poll')}
                    className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition ${sheetTab === 'poll'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Poll Votes ({totalPollVotes})</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSheetTab(null)}
                className="p-1 hover:bg-slate-800 rounded-full cursor-pointer text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sheet Content Body */}
            <div className="overflow-y-auto space-y-2 mt-3 flex-1 pr-1 no-scrollbar">
              {/* TAB 1: Live Viewers */}
              {sheetTab === 'viewers' && (
                <>
                  {(activeStatus.viewers || []).length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No views recorded yet.
                    </div>
                  ) : (
                    activeStatus.viewers.map((v, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1.5 text-xs text-white"
                      >
                        <div className="flex items-center space-x-2.5">
                          <Avatar
                            src={v.user?.avatar}
                            name={
                              v.user?.nickname ||
                              v.user?.username
                            }
                            size="sm"
                          />

                          <span className="font-medium">
                            {v.user?.nickname || v.user?.username}
                          </span>
                        </div>

                        <span className="text-[11px] text-slate-400 font-mono">
                          {timeAgo(v.viewedAt)}
                        </span>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* TAB 2: Reactions */}
              {sheetTab === 'reactions' && (
                <>
                  {reactionsList.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No reactions yet.
                    </div>
                  ) : (
                    reactionsList.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1.5 text-xs text-white"
                      >
                        <div className="flex items-center space-x-2.5">
                          <Avatar
                            src={r.user?.avatar}
                            name={
                              r.user?.nickname ||
                              r.user?.username
                            }
                            size="sm"
                          />

                          <span className="font-medium">
                            {r.user?.nickname || r.user?.username}
                          </span>
                        </div>

                        <span className="text-xl">{r.emoji}</span>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* TAB 3: Poll Breakdown & Voters */}
              {sheetTab === 'poll' && (
                <div className="space-y-4 pt-1">
                  {pollOptions.map((opt, optIdx) => {
                    const votes = opt.votes || [];

                    const percentage =
                      totalPollVotes > 0
                        ? Math.round(
                          (votes.length / totalPollVotes) * 100
                        )
                        : 0;

                    return (
                      <div
                        key={optIdx}
                        className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs text-white">
                          <span className="font-bold flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-purple-400" />
                            <span>{opt.text}</span>
                          </span>

                          <span className="font-mono text-slate-400 text-[11px]">
                            {percentage}% ({votes.length} votes)
                          </span>
                        </div>

                        {votes.length === 0 ? (
                          <div className="text-[11px] text-slate-400 pl-4 py-1 italic">
                            No votes for this option yet.
                          </div>
                        ) : (
                          <div className="space-y-1.5 pt-1">
                            {votes.map((voter, vIdx) => {
                              const voterObj =
                                typeof voter === 'object'
                                  ? voter
                                  : null;

                              return (
                                <div
                                  key={vIdx}
                                  className="flex items-center space-x-2 text-xs text-white pl-2"
                                >
                                  <Avatar
                                    src={voterObj?.avatar}
                                    name={
                                      voterObj?.nickname ||
                                      voterObj?.username
                                    }
                                    size="xs"
                                  />

                                  <span className="font-medium text-slate-200">
                                    {voterObj?.nickname ||
                                      voterObj?.username ||
                                      'User'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
