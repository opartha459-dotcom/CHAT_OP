import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorOff,
  PhoneOff,
  Smile,
  UserPlus,
  Maximize2,
  Minimize2,
  Users,
  ShieldCheck,
  LayoutGrid,
  Pin,
  Sparkles,
  Tv,
  Hand
} from 'lucide-react';
import { useCall } from '../../context/CallContext';
import { useAuth } from '../../context/AuthContext';
import { useAudioActivity } from '../../hooks/useAudioActivity';
import { Avatar } from '../common/Avatar';
import { AddPeopleModal } from './AddPeopleModal';

/**
 * Individual Video Tile Component with MediaStream auto-binding,
 * Web Audio real-time active speaker detection (Google Meet style glowing border),
 * and Raise Hand indicator badge.
 */
const VideoTile = ({
  stream,
  isLocal = false,
  user,
  isVideoOff,
  isMuted,
  isScreenSharing,
  isHandRaised = false,
  isSpotlight = false,
  onSelectSpotlight
}) => {
  const videoRef = useRef(null);

  // Real-time audio activity detection using Web Audio API Analyser
  const isSpeaking = useAudioActivity(stream, isMuted);

  // Synchronize stream directly whenever stream or state changes
  useEffect(() => {
    const el = videoRef.current;
    if (el && stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.play().catch(() => {});
    }
  }, [stream, isVideoOff, isScreenSharing]);

  const hasVideoTrack = stream && stream.getVideoTracks().length > 0 && (!isVideoOff || isScreenSharing);
  const displayName = isLocal ? 'You' : user?.nickname || user?.username || 'Participant';

  // Dynamic Google Meet style border logic:
  // 1. Active Speaker (Green glowing border)
  // 2. Hand Raised (Amber border)
  // 3. Spotlight (Indigo border)
  // 4. Default slate border
  let borderClasses = 'border-slate-800/80 hover:border-slate-700 shadow-xl';
  if (isSpeaking) {
    borderClasses = 'border-emerald-400 ring-4 ring-emerald-500/80 shadow-[0_0_30px_rgba(16,185,129,0.55)]';
  } else if (isHandRaised) {
    borderClasses = 'border-amber-400 ring-2 ring-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.4)]';
  } else if (isSpotlight) {
    borderClasses = 'border-indigo-500/80 ring-2 ring-indigo-500/30';
  }

  return (
    <div
      onClick={onSelectSpotlight}
      className={`relative w-full h-full min-h-[140px] bg-slate-900/95 rounded-2xl md:rounded-3xl overflow-hidden border transition-all duration-300 cursor-pointer flex items-center justify-center group ${borderClasses}`}
    >
      {/* Remote audio playback element */}
      {!isLocal && stream && (
        <audio
          ref={(el) => {
            if (el && el.srcObject !== stream) {
              el.srcObject = stream;
              el.play().catch(() => {});
            }
          }}
          autoPlay
          playsInline
        />
      )}

      {/* Video element */}
      <video
        ref={(el) => {
          videoRef.current = el;
          if (el && stream) {
            if (el.srcObject !== stream) {
              el.srcObject = stream;
            }
            el.play().catch(() => {});
          }
        }}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full ${hasVideoTrack ? 'block' : 'hidden'} ${
          isScreenSharing || isSpotlight ? 'object-contain bg-black' : 'object-cover'
        } ${isLocal && !isScreenSharing ? 'scale-x-[-1]' : ''}`}
      />

      {/* Camera Off Avatar Fallback */}
      {!hasVideoTrack && (
        <div className="flex flex-col items-center justify-center space-y-3 select-none">
          <div className="relative">
            {isSpeaking && (
              <div className="absolute -inset-3 bg-emerald-500/30 rounded-full blur-xl animate-pulse" />
            )}
            <Avatar
              src={user?.avatar}
              name={displayName}
              size="lg"
              className={`w-16 h-16 md:w-20 md:h-20 shadow-2xl relative z-10 border-2 transition-all duration-300 ${
                isSpeaking ? 'border-emerald-400 ring-4 ring-emerald-500/50 scale-105' : 'border-slate-700'
              }`}
            />
          </div>
          <span className="text-xs font-semibold text-slate-300">{displayName}</span>
        </div>
      )}

      {/* Raised Hand Badge (Google Meet style) */}
      {isHandRaised && (
        <div className="absolute top-3 right-3 px-2.5 py-1 bg-amber-400 text-slate-950 text-[11px] font-bold rounded-xl flex items-center space-x-1.5 shadow-xl border border-amber-300 z-10 animate-bounce">
          <span className="text-sm">✋</span>
          <span className="hidden sm:inline">Hand Raised</span>
        </div>
      )}

      {/* Screen Sharing / Slide Share Badge */}
      {isScreenSharing && (
        <div className="absolute top-3 left-3 px-2.5 py-1 bg-indigo-600/90 backdrop-blur-md text-white text-[11px] font-bold rounded-xl flex items-center space-x-1.5 shadow-lg border border-indigo-400/40 z-10">
          <Tv className="w-3.5 h-3.5 text-white" />
          <span>{isLocal ? 'You are presenting' : `${displayName} is presenting`}</span>
        </div>
      )}

      {/* Focus / Click to view prompt on hover */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-lg flex items-center space-x-1 border border-white/10 shadow-md z-10 pointer-events-none">
        <Pin className="w-3 h-3 text-indigo-400" />
        <span>{isSpotlight ? 'Exit Focus' : 'Focus'}</span>
      </div>

      {/* Participant Name & Mic Status Pill with Equalizer Wave */}
      <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-slate-950/85 backdrop-blur-md rounded-xl flex items-center space-x-2 text-white text-xs border border-white/10 select-none shadow-md z-10 max-w-[85%]">
        {/* Animated Audio Equalizer when speaking */}
        {isSpeaking && (
          <div className="flex items-center space-x-0.5 h-3 px-0.5 flex-shrink-0">
            <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-0.5 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
          </div>
        )}
        <span className="truncate max-w-[130px] font-medium">{displayName}</span>
        {isMuted ? (
          <MicOff className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
        ) : (
          <Mic className={`w-3.5 h-3.5 flex-shrink-0 ${isSpeaking ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
        )}
      </div>
    </div>
  );
};

export const ActiveCallModal = () => {
  const {
    callState,
    currentCall,
    localStream,
    screenStream,
    remoteStreams,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    reactions,
    callDuration,
    isCallModalOpen,
    setIsAddPeopleOpen,
    endCall,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    sendReaction,
    isHandRaised,
    raisedHands,
    toggleRaiseHand
  } = useCall();
  const { user } = useAuth();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reactionBarOpen, setReactionBarOpen] = useState(false);
  const [spotlightId, setSpotlightId] = useState(null); // 'local' or peerSocketId
  const containerRef = useRef(null);

  const remotePeers = Object.entries(remoteStreams);
  const isOutgoing = callState === 'outgoing';
  const totalParticipants = 1 + remotePeers.length;

  // Auto-spotlight screen share when presentation begins (Google Meet behavior)
  useEffect(() => {
    if (isScreenSharing) {
      setSpotlightId('local');
      return;
    }

    const sharingPeer = remotePeers.find(([_, data]) => data.isScreenSharing);
    if (sharingPeer) {
      setSpotlightId(sharingPeer[0]);
    } else if (spotlightId === 'local' && !isScreenSharing) {
      setSpotlightId(null);
    }
  }, [isScreenSharing, remoteStreams]);

  if (!isCallModalOpen || (callState !== 'outgoing' && callState !== 'connected')) {
    return null;
  }

  const targetName = currentCall?.isGroup
    ? 'Group Call'
    : currentCall?.targetUser?.nickname ||
      currentCall?.targetUser?.username ||
      currentCall?.caller?.nickname ||
      currentCall?.caller?.username ||
      'User';

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Google Meet Reactions
  const REACTION_EMOJIS = ['💖', '👍', '👏', '🎉', '😂', '🔥', '🚀', '😮', '💯'];

  // Determine grid template based on participant count
  const getGridClass = () => {
    if (totalParticipants === 1) return 'grid-cols-1';
    if (totalParticipants === 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalParticipants <= 4) return 'grid-cols-2';
    return 'grid-cols-2 lg:grid-cols-3';
  };

  const isLocalSpotlight = spotlightId === 'local';
  const spotlightPeer = spotlightId && spotlightId !== 'local' ? remoteStreams[spotlightId] : null;

  // Raised hands summary
  const raisedHandsList = Object.values(raisedHands || {});

  return (
    <>
      <div
        ref={containerRef}
        className="fixed inset-0 z-50 bg-[#121417] text-slate-100 flex flex-col overflow-hidden select-none animate-in fade-in duration-200"
      >
        {/* Floating animated reactions layer */}
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          {reactions.map((r) => (
            <div
              key={r.id}
              className="absolute bottom-28 flex items-center space-x-2 animate-float-fade"
              style={{
                left: `${45 + (Math.sin(parseFloat(r.id) || 1) * 20)}%`
              }}
            >
              <span className="text-4xl drop-shadow-2xl">{r.emoji}</span>
              <span className="text-[11px] font-semibold bg-slate-900/90 text-white px-2.5 py-0.5 rounded-full shadow-lg border border-white/10">
                {r.senderName}
              </span>
            </div>
          ))}
        </div>

        {/* Top Header Bar (Google Meet Minimalist Style) */}
        <div className="h-16 px-4 md:px-6 bg-[#181a1d]/90 border-b border-slate-800/80 flex items-center justify-between backdrop-blur-md z-20">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white tracking-tight">{targetName}</span>
              <span className="px-2 py-0.5 bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 text-[10px] font-bold rounded-md flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3" />
                <span>P2P Encrypted</span>
              </span>
            </div>

            {spotlightId && (
              <button
                onClick={() => setSpotlightId(null)}
                className="px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 shadow-md cursor-pointer"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit Stage (Grid View)</span>
              </button>
            )}

            {currentCall?.isGroup && (
              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[11px] font-medium rounded-md flex items-center space-x-1">
                <Users className="w-3 h-3" />
                <span>{totalParticipants}</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {isOutgoing ? (
              <div className="flex items-center space-x-2 text-indigo-400 text-xs font-mono font-medium">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                <span>Calling...</span>
              </div>
            ) : (
              <div className="px-3 py-1 bg-slate-800/90 rounded-full text-xs font-mono text-slate-300 border border-slate-700/60 font-medium">
                {formatDuration(callDuration)}
              </div>
            )}

            <button
              onClick={toggleFullscreen}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Real-time Hand Raised Toast Banner (Google Meet style) */}
        {raisedHandsList.length > 0 && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-md flex items-center space-x-2 text-xs border border-amber-300 animate-in fade-in slide-in-from-top-4">
            <span className="text-base animate-bounce">✋</span>
            <span>
              {raisedHandsList.map((h) => h.userName).join(', ')}{' '}
              {raisedHandsList.length > 1 ? 'have raised their hands' : 'raised hand'}
            </span>
          </div>
        )}

        {/* Video Area Grid or Spotlight Stage */}
        <div className="flex-1 p-3 md:p-5 overflow-hidden flex flex-col justify-center items-center relative">
          {isOutgoing ? (
            /* Outgoing Ringing Screen */
            <div className="flex flex-col items-center justify-center space-y-6 text-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-2 border-indigo-500/30 animate-ping" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Avatar
                    src={currentCall?.targetUser?.avatar}
                    name={targetName}
                    size="xl"
                    className="w-24 h-24 border-4 border-indigo-600 shadow-2xl"
                  />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">{targetName}</h2>
                <p className="text-xs text-indigo-400 font-medium mt-1">Calling & Ringing...</p>
              </div>
            </div>
          ) : spotlightId ? (
            /* Google Meet Presentation / Theater Stage Layout */
            <div className="w-full h-full flex flex-col md:flex-row gap-3 md:gap-4 max-w-7xl overflow-hidden">
              {/* Primary Stage (Screen Share / Pinned Speaker) */}
              <div className="flex-1 min-h-0 relative h-full">
                {isLocalSpotlight ? (
                  <VideoTile
                    stream={screenStream || localStream}
                    isLocal={true}
                    user={user}
                    isVideoOff={isVideoOff && !isScreenSharing}
                    isMuted={isAudioMuted}
                    isScreenSharing={isScreenSharing}
                    isHandRaised={isHandRaised}
                    isSpotlight={true}
                    onSelectSpotlight={() => setSpotlightId(null)}
                  />
                ) : spotlightPeer ? (
                  <VideoTile
                    stream={spotlightPeer.stream}
                    isLocal={false}
                    user={spotlightPeer.user}
                    isVideoOff={spotlightPeer.isVideoOff}
                    isMuted={spotlightPeer.isMuted}
                    isScreenSharing={spotlightPeer.isScreenSharing}
                    isHandRaised={raisedHands[spotlightId]?.isRaised}
                    isSpotlight={true}
                    onSelectSpotlight={() => setSpotlightId(null)}
                  />
                ) : null}
              </div>

              {/* Docked Filmstrip of Other Participants (Right on desktop, Bottom on mobile) */}
              <div className="w-full md:w-64 h-32 md:h-full flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto flex-shrink-0 p-0.5">
                {/* Local preview if not on main stage */}
                {!isLocalSpotlight && (
                  <div className="w-44 md:w-full h-full md:h-44 flex-shrink-0">
                    <VideoTile
                      stream={screenStream || localStream}
                      isLocal={true}
                      user={user}
                      isVideoOff={isVideoOff && !isScreenSharing}
                      isMuted={isAudioMuted}
                      isScreenSharing={isScreenSharing}
                      isHandRaised={isHandRaised}
                      isSpotlight={false}
                      onSelectSpotlight={() => setSpotlightId('local')}
                    />
                  </div>
                )}

                {/* Remote peer filmstrip */}
                {remotePeers
                  .filter(([sId]) => sId !== spotlightId)
                  .map(([peerSocketId, peerData]) => (
                    <div key={peerSocketId} className="w-44 md:w-full h-full md:h-44 flex-shrink-0">
                      <VideoTile
                        stream={peerData.stream}
                        isLocal={false}
                        user={peerData.user}
                        isVideoOff={peerData.isVideoOff}
                        isMuted={peerData.isMuted}
                        isScreenSharing={peerData.isScreenSharing}
                        isHandRaised={raisedHands[peerSocketId]?.isRaised}
                        isSpotlight={false}
                        onSelectSpotlight={() => setSpotlightId(peerSocketId)}
                      />
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            /* Multi-Peer Responsive Grid View */
            <div className={`w-full h-full max-w-6xl grid gap-3 md:gap-4 ${getGridClass()} auto-rows-fr`}>
              {/* Local Participant Tile */}
              <VideoTile
                stream={screenStream || localStream}
                isLocal={true}
                user={user}
                isVideoOff={isVideoOff && !isScreenSharing}
                isMuted={isAudioMuted}
                isScreenSharing={isScreenSharing}
                isHandRaised={isHandRaised}
                isSpotlight={false}
                onSelectSpotlight={() => setSpotlightId('local')}
              />

              {/* Remote Participants */}
              {remotePeers.map(([peerSocketId, peerData]) => (
                <VideoTile
                  key={peerSocketId}
                  stream={peerData.stream}
                  isLocal={false}
                  user={peerData.user}
                  isVideoOff={peerData.isVideoOff}
                  isMuted={peerData.isMuted}
                  isScreenSharing={peerData.isScreenSharing}
                  isHandRaised={raisedHands[peerSocketId]?.isRaised}
                  isSpotlight={false}
                  onSelectSpotlight={() => setSpotlightId(peerSocketId)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Floating Reactions Bar */}
        {reactionBarOpen && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 bg-[#1e2024]/95 border border-slate-700/80 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl flex items-center space-x-2 animate-in fade-in zoom-in-95">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  sendReaction(emoji);
                  setReactionBarOpen(false);
                }}
                className="w-10 h-10 hover:bg-slate-800 rounded-xl text-xl flex items-center justify-center transition-transform hover:scale-125 active:scale-95 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Bottom Call Controls Toolbar (Google Meet Aesthetic) */}
        <div className="p-3.5 md:p-4 bg-[#181a1d]/90 border-t border-slate-800/80 flex items-center justify-center space-x-2.5 sm:space-x-4 backdrop-blur-md z-20">
          {/* Mute/Unmute Mic */}
          <button
            onClick={toggleAudio}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all active:scale-90 cursor-pointer shadow-lg ${
              isAudioMuted
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-slate-800 hover:bg-slate-700'
            }`}
            title={isAudioMuted ? 'Turn on microphone' : 'Turn off microphone'}
          >
            {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Camera On/Off */}
          <button
            onClick={toggleVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all active:scale-90 cursor-pointer shadow-lg ${
              isVideoOff && !isScreenSharing
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-slate-800 hover:bg-slate-700'
            }`}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoOff && !isScreenSharing ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Screen Share / Present Now (Google Meet style) */}
          <button
            onClick={toggleScreenShare}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all active:scale-90 cursor-pointer shadow-lg ${
              isScreenSharing
                ? 'bg-indigo-600 hover:bg-indigo-700 ring-4 ring-indigo-400/50'
                : 'bg-slate-800 hover:bg-slate-700'
            }`}
            title={isScreenSharing ? 'Stop presenting' : 'Present now / Share screen'}
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
          </button>

          {/* Raise Hand Button (Google Meet ✋) */}
          <button
            onClick={toggleRaiseHand}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-lg ${
              isHandRaised
                ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold ring-4 ring-amber-400/50 shadow-amber-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
            title={isHandRaised ? 'Lower hand' : 'Raise hand'}
          >
            <Hand className="w-5 h-5" />
          </button>

          {/* Reactions Button */}
          <button
            onClick={() => setReactionBarOpen(!reactionBarOpen)}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all active:scale-90 cursor-pointer shadow-lg ${
              reactionBarOpen ? 'bg-indigo-600' : 'bg-slate-800 hover:bg-slate-700'
            }`}
            title="Send reaction"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Add People Button */}
          <button
            onClick={() => setIsAddPeopleOpen(true)}
            className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-lg"
            title="Add people"
          >
            <UserPlus className="w-5 h-5" />
          </button>

          {/* Leave / End Call Button */}
          <button
            onClick={endCall}
            className="h-12 px-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-all active:scale-90 cursor-pointer shadow-xl shadow-rose-600/30 flex items-center space-x-2"
            title="Leave call"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-xs hidden sm:inline">Leave call</span>
          </button>
        </div>
      </div>

      {/* Add People Modal */}
      <AddPeopleModal />
    </>
  );
};
