import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, FastForward } from 'lucide-react';

export const VoiceMessagePlayer = ({ src, isMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1); // 1, 1.5, 2
  const [loadError, setLoadError] = useState(false);
  const audioRef = useRef(null);

  const formatTime = (secs) => {
    if (isNaN(secs) || !isFinite(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Some browsers (especially on Cloudinary CDN) don't fire loadedmetadata for
  // audio served under a video resource_type. Force a load() after mount.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    setLoadError(false);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    // Trigger the browser to actually fetch metadata
    audio.load();
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  };

  const cycleSpeed = () => {
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const target = Math.max(0, Math.min(pos * duration, duration));
    audioRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const handleLoadedMetadata = (e) => {
    const d = e.target.duration;
    // Infinity can happen on some streams — treat as unknown
    if (isFinite(d) && d > 0) setDuration(d);
  };

  // Fallback: if metadata fires but duration is still 0, try durationchange
  const handleDurationChange = (e) => {
    const d = e.target.duration;
    if (isFinite(d) && d > 0) setDuration(d);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`p-2.5 rounded-2xl flex flex-col space-y-1 w-64 sm:w-72 select-none ${
      isMe ? 'bg-indigo-700/60 text-white' : 'bg-slate-100 dark:bg-slate-700/70 text-slate-900 dark:text-white'
    }`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        crossOrigin="anonymous"
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleDurationChange}
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => setLoadError(true)}
      />

      <div className="flex items-center space-x-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          disabled={loadError}
          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition active:scale-90 ${
            loadError ? 'opacity-40 cursor-not-allowed' : ''
          } ${
            isMe
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
          }`}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
        </button>

        {/* Center Waveform & Progress */}
        <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
          {/* Scrubber Bar */}
          <div
            onClick={handleSeek}
            className="h-2 w-full bg-black/15 dark:bg-white/15 rounded-full cursor-pointer relative overflow-hidden"
          >
            <div
              className={`h-full transition-all duration-75 rounded-full ${
                isMe ? 'bg-white' : 'bg-indigo-600 dark:bg-indigo-400'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Timers */}
          <div className="flex items-center justify-between text-[10px] font-mono opacity-80">
            <span>{formatTime(currentTime)}</span>
            <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
          </div>
        </div>

        {/* Speed multiplier button */}
        <button
          type="button"
          onClick={cycleSpeed}
          className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-lg transition active:scale-90 ${
            isMe
              ? 'bg-white/20 hover:bg-white/30 text-white'
              : 'bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 text-slate-700 dark:text-slate-200'
          }`}
          title="Playback Speed"
        >
          {playbackRate}x
        </button>
      </div>

      {loadError && (
        <p className="text-[10px] opacity-60 text-center pt-0.5">⚠ Audio unavailable</p>
      )}
    </div>
  );
};
