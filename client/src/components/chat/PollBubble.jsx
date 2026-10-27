import React, { useState } from 'react';
import { Check, CheckCircle2, Circle, Clock, Lock, Users, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';

export const PollBubble = ({ message }) => {
  const { user } = useAuth();
  const { authHeaders } = useChat();
  const [loadingIndex, setLoadingIndex] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const poll = message.poll;
  if (!poll) return null;

  const currentUserId = user?._id;
  const isCreator = (message.sender?._id || message.sender)?.toString() === currentUserId?.toString();
  const isExpired = poll.expiresAt && new Date() > new Date(poll.expiresAt);
  const isClosed = poll.isClosed || isExpired;

  // Calculate total votes across all options
  const totalVotes = (poll.options || []).reduce(
    (acc, opt) => acc + (opt.votes?.length || 0),
    0
  );

  const handleVote = async (optionIndex) => {
    if (isClosed) return;
    setLoadingIndex(optionIndex);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/messages/${message._id}/poll/vote`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ optionIndex })
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.message || 'Failed to submit vote');
      }
    } catch (err) {
      console.error('Vote error:', err);
      setErrorMsg('Network error voting on poll');
    } finally {
      setLoadingIndex(null);
    }
  };

  const handleClosePoll = async () => {
    if (!window.confirm('Are you sure you want to end this poll? No further votes will be counted.')) {
      return;
    }
    try {
      await fetch(`/api/messages/${message._id}/poll/close`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include'
      });
    } catch (err) {
      console.error('Close poll error:', err);
    }
  };

  return (
    <div className="w-full max-w-sm sm:max-w-md py-1 space-y-3 select-none">
      {/* Question Header */}
      <div>
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
          <span className="flex items-center space-x-1 uppercase tracking-wider">
            <Users className="w-3 h-3" />
            <span>Poll {poll.allowsMultiple ? '· Multiple Choice' : '· Single Vote'}</span>
          </span>
          {poll.isAnonymous ? (
            <span className="flex items-center space-x-1 text-slate-400">
              <Lock className="w-3 h-3" />
              <span>Anonymous</span>
            </span>
          ) : null}
        </div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug break-words">
          {poll.question}
        </h4>
      </div>

      {errorMsg && (
        <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-xl flex items-center space-x-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Options List */}
      <div className="space-y-2">
        {poll.options.map((option, idx) => {
          const voteCount = option.votes?.length || 0;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const hasVoted = option.votes?.some(
            (v) => (v._id || v)?.toString() === currentUserId?.toString()
          );

          return (
            <button
              key={idx}
              type="button"
              disabled={isClosed}
              onClick={() => handleVote(idx)}
              className={`w-full relative text-left p-3 rounded-2xl border transition-all overflow-hidden ${
                hasVoted
                  ? 'border-indigo-500/80 bg-indigo-50/70 dark:bg-indigo-950/40 font-medium'
                  : 'border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              } ${isClosed ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'}`}
            >
              {/* Progress Bar Fill */}
              <div
                className={`absolute left-0 top-0 bottom-0 transition-all duration-500 ease-out pointer-events-none ${
                  hasVoted
                    ? 'bg-indigo-500/20 dark:bg-indigo-500/30'
                    : 'bg-slate-200/60 dark:bg-slate-700/40'
                }`}
                style={{ width: `${percentage}%` }}
              />

              {/* Option details */}
              <div className="relative z-10 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2.5 min-w-0 pr-3">
                  <div className="flex-shrink-0">
                    {hasVoted ? (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    )}
                  </div>
                  <span className="truncate text-slate-900 dark:text-slate-100 font-medium">
                    {option.text}
                  </span>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{percentage}%</span>
                  <span className="text-[10px] text-slate-400">({voteCount})</span>
                </div>
              </div>

              {/* Voter Avatars (if not anonymous and votes exist) */}
              {!poll.isAnonymous && option.votes?.length > 0 && (
                <div className="relative z-10 flex items-center space-x-1 mt-2 pl-6">
                  {option.votes.slice(0, 5).map((voter, vIdx) => {
                    const voterObj = typeof voter === 'object' ? voter : null;
                    return (
                      <div
                        key={vIdx}
                        className="w-5 h-5 rounded-full overflow-hidden border border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-700 text-[9px] flex items-center justify-center font-bold text-slate-600 dark:text-slate-300"
                        title={voterObj?.nickname || voterObj?.username || 'Voter'}
                      >
                        {voterObj?.avatar ? (
                          <img src={voterObj.avatar} alt="Voter" className="w-full h-full object-cover" />
                        ) : (
                          (voterObj?.nickname || voterObj?.username || 'U')[0].toUpperCase()
                        )}
                      </div>
                    );
                  })}
                  {option.votes.length > 5 && (
                    <span className="text-[10px] text-slate-400 pl-1">
                      +{option.votes.length - 5}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center space-x-1.5">
          <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
          <span>·</span>
          {isClosed ? (
            <span className="text-amber-600 dark:text-amber-400 font-medium">Final results</span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
          )}
        </div>

        {isCreator && !isClosed && (
          <button
            type="button"
            onClick={handleClosePoll}
            className="text-rose-500 hover:text-rose-600 hover:underline text-[11px] transition"
          >
            End Poll
          </button>
        )}
      </div>
    </div>
  );
};
