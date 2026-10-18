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
  Tv
} from 'lucide-react';
import { useCall } from '../../context/CallContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { AddPeopleModal } from './AddPeopleModal';

/**
 * Individual Video Tile Component with MediaStream auto-binding & playback assurance
 */
const VideoTile = ({
  stream,
  isLocal = false,
  user,
  isVideoOff,
  isMuted,
  isScreenSharing,
  isSpotlight = false,
  onSelectSpotlight
}) => {
  const videoRef = useRef(null);

  // Synchronize stream directly whenever stream or state changes
  useEffect(() => {
    const el = videoRef.current;
    if (el && stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.play().catch((e) => {
        // Handled silently if autoplay requires interaction
      });
    }
  }, [stream, isVideoOff, isScreenSharing]);

  const hasVideoTrack = stream && stream.getVideoTracks().length > 0 && (!isVideoOff || isScreenSharing);
  const displayName = isLocal ? 'You' : user?.nickname || user?.username || 'Participant';

  return (
    <div
      onClick={onSelectSpotlight}
      className={`relative w-full h-full min-h-[160px] bg-slate-900/95 rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer flex items-center justify-center shadow-xl group ${
        isSpotlight
          ? 'border-indigo-500/80 ring-2 ring-indigo-500/30'
          : 'border-slate-800 hover:border-slate-600'
      }`}
    >
      {/* Dedicated audio element for remote stream so voice is ALWAYS loud and clear whether camera is on, off, or sharing slides */}
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

      {/* Video element - kept mounted with hidden toggle so streams never drop during camera/slide switches */}
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
        muted={isLocal} // Local must be muted to avoid local speaker feedback
        className={`w-full h-full ${hasVideoTrack ? 'block' : 'hidden'} ${
          isScreenSharing || isSpotlight ? 'object-contain bg-black' : 'object-cover'
        } ${isLocal && !isScreenSharing ? 'scale-x-[-1]' : ''}`}
      />

      {/* Camera Off Avatar Fallback */}
      {!hasVideoTrack && (
        <div className="flex flex-col items-center justify-center space-y-3 select-none">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
            <Avatar
              src={user?.avatar}
              name={displayName}
              size="lg"
              className="w-16 h-16 shadow-2xl relative z-10 border-2 border-slate-700"
            />
          </div>
          <span className="text-xs font-semibold text-slate-300">{displayName}</span>
        </div>
      )}

      {/* Screen Sharing / Slide Share Badge */}
      {isScreenSharing && (
        <div className="absolute top-3 left-3 px-2.5 py-1 bg-indigo-600/90 backdrop-blur-md text-white text-[11px] font-bold rounded-lg flex items-center space-x-1.5 shadow-lg animate-pulse border border-indigo-400/30">
          <Tv className="w-3.5 h-3.5 text-white" />
          <span>Live Presentation / Slides</span>
        </div>
      )}

      {/* Focus / Click to view prompt on hover */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-md flex items-center space-x-1 border border-white/10 shadow-md">
        <Pin className="w-3 h-3 text-indigo-400" />
        <span>{isSpotlight ? 'Exit Focus' : 'Click to View'}</span>
      </div>

      {/* Participant Name & Mic Status Pill */}
      <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-slate-950/80 backdrop-blur-md rounded-lg flex items-center space-x-2 text-white text-xs border border-white/10 select-none shadow-md">
        <span className="truncate max-w-[120px] font-medium">{displayName}</span>
        {isMuted ? (
          <MicOff className="w-3.5 h-3.5 text-rose-400" />
        ) : (
          <Mic className="w-3.5 h-3.5 text-emerald-400" />
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
    sendReaction
  } = useCall();
  const { user } = useAuth();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reactionBarOpen, setReactionBarOpen] = useState(false);
  const [spotlightId, setSpotlightId] = useState(null); // 'local' or peerSocketId
  const containerRef = useRef(null);

  const remotePeers = Object.entries(remoteStreams);
  const isOutgoing = callState === 'outgoing';
  const totalParticipants = 1 + remotePeers.length;

  // Auto-spotlight screen share when someone starts presenting
  useEffect(() => {
    if (isScreenSharing) {
      setSpotlightId('local');
      return;
    }

    // Check if any remote peer is sharing their screen
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
    : currentCall?.targetUser?.nickname || currentCall?.targetUser?.username || 'User';

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

  // Preset emojis for reactions
  const REACTION_EMOJIS = ['❤️', '👍', '😂', '🔥', '🎉', '👏', '🚀', '😮', '💯'];

  // Determine grid template based on count (when not in spotlight)
  const getGridClass = () => {
    if (totalParticipants === 1) return 'grid-cols-1';
    if (totalParticipants === 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalParticipants <= 4) return 'grid-cols-2';
    return 'grid-cols-2 lg:grid-cols-3';
  };

  // Resolve spotlighted peer object
  const isLocalSpotlight = spotlightId === 'local';
  const spotlightPeer = spotlightId && spotlightId !== 'local' ? remoteStreams[spotlightId] : null;

  return (
    <>
      <div
        ref={containerRef}
        className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden select-none animate-in fade-in duration-200"
      >
        {/* Floating animated reactions layer */}
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          {reactions.map((r) => (
            <div
              key={r.id}
              className="absolute bottom-24 flex items-center space-x-1.5 animate-float-fade"
              style={{
                left: `${40 + (Math.sin(parseFloat(r.id) || 1) * 20)}%`
              }}
            >
              <span className="text-4xl drop-shadow-xl">{r.emoji}</span>
              <span className="text-[10px] font-semibold bg-slate-900/90 text-white px-2 py-0.5 rounded-full shadow-lg border border-white/10">
                {r.senderName}
              </span>
            </div>
          ))}
        </div>

        {/* Top Header Bar */}
        <div className="h-16 px-6 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between backdrop-blur-md z-20">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white tracking-tight">{targetName}</span>
              <span className="px-2 py-0.5 bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 text-[10px] font-bold rounded-md flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3" />
                <span>P2P Encrypted</span>
              </span>
            </div>

            {/* View Mode Toggle: Grid vs Spotlight */}
            {spotlightId && (
              <button
                onClick={() => setSpotlightId(null)}
                className="px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 shadow-md"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Exit Focus (Grid View)</span>
              </button>
            )}

            {currentCall?.isGroup && (
              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[11px] font-medium rounded-md flex items-center space-x-1">
                <Users className="w-3 h-3" />
                <span>{totalParticipants} in call</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {/* Status or duration timer */}
            {isOutgoing ? (
              <div className="flex items-center space-x-2 text-indigo-400 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                <span>Calling...</span>
              </div>
            ) : (
              <div className="px-3 py-1 bg-slate-800/90 rounded-full text-xs font-mono text-slate-300 border border-slate-700/60">
                {formatDuration(callDuration)}
              </div>
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Video Area Grid or Spotlight Stage */}
        <div className="flex-1 p-3 md:p-4 overflow-hidden flex flex-col justify-center items-center relative">
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
                <p className="text-xs text-indigo-400 font-medium mt-1">Ringing...</p>
              </div>
            </div>
          ) : spotlightId ? (
            /* Spotlight / Live Presentation Stage View */
            <div className="w-full h-full flex flex-col max-w-7xl overflow-hidden">
              {/* Main Stage Spotlight */}
              <div className="flex-1 min-h-0 relative mb-3">
                {isLocalSpotlight ? (
                  <VideoTile
                    stream={screenStream || localStream}
                    isLocal={true}
                    user={user}
                    isVideoOff={isVideoOff && !isScreenSharing}
                    isMuted={isAudioMuted}
                    isScreenSharing={isScreenSharing}
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
                    isSpotlight={true}
                    onSelectSpotlight={() => setSpotlightId(null)}
                  />
                ) : null}
              </div>

              {/* Bottom Thumbnail Strip of other participants */}
              <div className="h-28 flex items-center space-x-3 overflow-x-auto pb-1 px-1">
                {/* Local preview if not spotlighted */}
                {!isLocalSpotlight && (
                  <div className="w-40 h-full flex-shrink-0">
                    <VideoTile
                      stream={screenStream || localStream}
                      isLocal={true}
                      user={user}
                      isVideoOff={isVideoOff && !isScreenSharing}
                      isMuted={isAudioMuted}
                      isScreenSharing={isScreenSharing}
                      isSpotlight={false}
                      onSelectSpotlight={() => setSpotlightId('local')}
                    />
                  </div>
                )}

                {/* Remote previews */}
                {remotePeers
                  .filter(([sId]) => sId !== spotlightId)
                  .map(([peerSocketId, peerData]) => (
                    <div key={peerSocketId} className="w-40 h-full flex-shrink-0">
                      <VideoTile
                        stream={peerData.stream}
                        isLocal={false}
                        user={peerData.user}
                        isVideoOff={peerData.isVideoOff}
                        isMuted={peerData.isMuted}
                        isScreenSharing={peerData.isScreenSharing}
                        isSpotlight={false}
                        onSelectSpotlight={() => setSpotlightId(peerSocketId)}
                      />
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            /* Multi-Peer Responsive Grid (Click any tile to focus / spotlight) */
            <div className={`w-full h-full max-w-6xl grid gap-3 md:gap-4 ${getGridClass()} auto-rows-fr`}>
              {/* Local Participant Tile */}
              <VideoTile
                stream={screenStream || localStream}
                isLocal={true}
                user={user}
                isVideoOff={isVideoOff && !isScreenSharing}
                isMuted={isAudioMuted}
                isScreenSharing={isScreenSharing}
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
                  isSpotlight={false}
                  onSelectSpotlight={() => setSpotlightId(peerSocketId)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Floating Reactions Bar */}
        {reactionBarOpen && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-slate-700/80 rounded-2xl p-2 shadow-2xl backdrop-blur-xl flex items-center space-x-2 animate-in fade-in zoom-in-95">
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

        {/* Bottom Call Controls Toolbar */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-center space-x-3 sm:space-x-4 backdrop-blur-md z-20">
          {/* Mute/Unmute Mic */}
          <button
            onClick={toggleAudio}
            className={`p-3.5 rounded-2xl text-white transition-transform active:scale-90 cursor-pointer shadow-lg ${
              isAudioMuted
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-slate-800 hover:bg-slate-700'
            }`}
            title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Camera On/Off */}
          <button
            onClick={toggleVideo}
            className={`p-3.5 rounded-2xl text-white transition-transform active:scale-90 cursor-pointer shadow-lg ${
              isVideoOff && !isScreenSharing
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-slate-800 hover:bg-slate-700'
            }`}
            title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isVideoOff && !isScreenSharing ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`p-3.5 rounded-2xl text-white transition-transform active:scale-90 cursor-pointer shadow-lg ${
              isScreenSharing
                ? 'bg-indigo-600 hover:bg-indigo-700 ring-2 ring-indigo-400'
                : 'bg-slate-800 hover:bg-slate-700'
            }`}
            title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
          </button>

          {/* In-Call Reactions Button */}
          <button
            onClick={() => setReactionBarOpen(!reactionBarOpen)}
            className={`p-3.5 rounded-2xl text-white transition-transform active:scale-90 cursor-pointer shadow-lg ${
              reactionBarOpen ? 'bg-indigo-600' : 'bg-slate-800 hover:bg-slate-700'
            }`}
            title="Send Reaction"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Add People Button */}
          <button
            onClick={() => setIsAddPeopleOpen(true)}
            className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white transition-transform active:scale-90 cursor-pointer shadow-lg"
            title="Add People to Call"
          >
            <UserPlus className="w-5 h-5" />
          </button>

          {/* End Call Button */}
          <button
            onClick={endCall}
            className="p-3.5 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-transform active:scale-90 cursor-pointer shadow-xl shadow-rose-600/30 flex items-center space-x-2"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-xs hidden sm:inline">End Call</span>
          </button>
        </div>
      </div>

      {/* Add People Modal */}
      <AddPeopleModal />
    </>
  );
};
