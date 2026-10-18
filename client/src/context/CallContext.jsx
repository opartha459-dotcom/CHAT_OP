import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import {
  startIncomingRingtone,
  startOutgoingRingback,
  stopRingtone,
  playCallConnectedSound,
  playCallEndedSound,
  playBusyTone
} from '../utils/callSounds';

const CallContext = createContext();

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ]
};

export const CallProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();

  // Call status: 'idle' | 'outgoing' | 'incoming' | 'connected'
  const [callState, setCallState] = useState('idle');
  const [currentCall, setCurrentCall] = useState(null);

  // Local media state
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Remote streams: socketId -> { stream, user, isVideoOff, isMuted, isScreenSharing }
  const [remoteStreams, setRemoteStreams] = useState({});

  // Floating reactions: array of { id, emoji, senderName }
  const [reactions, setReactions] = useState([]);

  // Raise hand state: isHandRaised for local user, raisedHands map (socketId -> data)
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState({});

  // Call duration
  const [callDuration, setCallDuration] = useState(0);

  // Modal open states
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isAddPeopleOpen, setIsAddPeopleOpen] = useState(false);

  // Refs to avoid stale closures in WebRTC callbacks
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnectionsRef = useRef({}); // socketId -> RTCPeerConnection
  const iceCandidateQueueRef = useRef({}); // socketId -> Array of queued ICE candidates
  const currentCallRef = useRef(null);
  const callStateRef = useRef(callState);
  const callTimerRef = useRef(null);
  const pendingJoinCallIdRef = useRef(null);

  // Sync ref
  useEffect(() => {
    currentCallRef.current = currentCall;
  }, [currentCall]);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // If a join is queued while socket was establishing during cold launch
  useEffect(() => {
    if (socket && pendingJoinCallIdRef.current) {
      const pid = pendingJoinCallIdRef.current;
      pendingJoinCallIdRef.current = null;
      if (socket.connected) {
        socket.emit('call:join', { callId: pid });
      } else {
        socket.once('connect', () => {
          socket.emit('call:join', { callId: pid });
        });
      }
    }
  }, [socket]);

  // Clean up single peer connection
  const removePeer = useCallback((socketId) => {
    if (peerConnectionsRef.current[socketId]) {
      try {
        peerConnectionsRef.current[socketId].close();
      } catch (e) {}
      delete peerConnectionsRef.current[socketId];
    }
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
  }, []);

  // Clean up all call resources
  const cleanupCall = useCallback(() => {
    stopRingtone();
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    // Stop local media
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    // Close all peer connections
    Object.keys(peerConnectionsRef.current).forEach((socketId) => {
      try {
        peerConnectionsRef.current[socketId].close();
      } catch (e) {}
    });
    peerConnectionsRef.current = {};
    iceCandidateQueueRef.current = {};

    setLocalStream(null);
    setScreenStream(null);
    setRemoteStreams({});
    setCallState('idle');
    setCurrentCall(null);
    setIsAudioMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    setIsHandRaised(false);
    setRaisedHands({});
    setCallDuration(0);
    setIsCallModalOpen(false);
    setIsAddPeopleOpen(false);
  }, []);

  // Create an RTCPeerConnection for a peer
  const createPeerConnection = useCallback((targetSocketId, targetUser, isInitiator = false) => {
    if (peerConnectionsRef.current[targetSocketId]) {
      return peerConnectionsRef.current[targetSocketId];
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current[targetSocketId] = pc;

    // Attach active stream (screen share or local webcam/mic)
    const activeStream = screenStreamRef.current || localStreamRef.current;
    if (activeStream) {
      activeStream.getTracks().forEach((track) => {
        pc.addTrack(track, activeStream);
      });
    }

    // Ensure video & audio transceivers exist so mid-call screen share or camera activation works without renegotiation errors
    try {
      const senders = pc.getSenders();
      if (!senders.some((s) => s.track?.kind === 'audio' || s.kind === 'audio')) {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
      }
      if (!senders.some((s) => s.track?.kind === 'video' || s.kind === 'video')) {
        pc.addTransceiver('video', { direction: 'sendrecv' });
      }
    } catch (e) {
      console.warn('[WebRTC] Transceiver non-fatal warning', e);
    }

    // Receive remote tracks and preserve multi-track stream
    pc.ontrack = (event) => {
      const incomingTrack = event.track;
      setRemoteStreams((prev) => {
        const existing = prev[targetSocketId];
        let streamToUse = event.streams[0];
        if (!streamToUse) {
          if (existing?.stream) {
            if (!existing.stream.getTracks().some((t) => t.id === incomingTrack.id)) {
              existing.stream.addTrack(incomingTrack);
            }
            streamToUse = existing.stream;
          } else {
            streamToUse = new MediaStream([incomingTrack]);
          }
        }

        return {
          ...prev,
          [targetSocketId]: {
            stream: streamToUse,
            user: targetUser || existing?.user,
            isVideoOff: existing?.isVideoOff ?? false,
            isMuted: existing?.isMuted ?? false,
            isScreenSharing: existing?.isScreenSharing ?? false
          }
        };
      });
    };

    // Candidate exchange
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('call:signal', {
          toSocketId: targetSocketId,
          callId: currentCallRef.current?.callId,
          signal: { type: 'candidate', candidate: event.candidate }
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        removePeer(targetSocketId);
      }
    };

    // If initiator, generate offer
    if (isInitiator) {
      pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          socket?.emit('call:signal', {
            toSocketId: targetSocketId,
            callId: currentCallRef.current?.callId,
            signal: { type: 'offer', sdp: pc.localDescription }
          });
        })
        .catch((err) => console.error('[WebRTC] Failed to create offer:', err));
    }

    return pc;
  }, [socket, removePeer]);

  // Request user camera & mic
  const acquireMedia = useCallback(async (callType) => {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      throw new Error(
        'Camera and microphone access is restricted by your browser. WebRTC audio/video calls require a secure connection (HTTPS or localhost). If testing across devices on local Wi-Fi, please access via HTTPS or localhost.'
      );
    }

    try {
      const constraints = {
        audio: true,
        video: callType === 'video'
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
          : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsVideoOff(callType === 'audio');
      return stream;
    } catch (err) {
      console.warn('[WebRTC] Camera access denied or failed, falling back to audio only', err);
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = audioStream;
        setLocalStream(audioStream);
        setIsVideoOff(true);
        return audioStream;
      } catch (audioErr) {
        console.error('[WebRTC] Microphone access denied', audioErr);
        throw new Error('Please grant microphone or camera permission in your browser to make calls.');
      }
    }
  }, []);

  // Initiate an outgoing call (1-on-1 or Group)
  const startCall = useCallback(async ({ conversationId, isGroup = false, callType = 'video', targetUser = null, participants = [] }) => {
    if (!socket || !user) {
      alert('Real-time connection is not active. Please check your internet connection.');
      return;
    }

    try {
      const stream = await acquireMedia(callType);
      const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const targetId = (targetUser?._id || targetUser)?.toString();

      const callInfo = {
        callId,
        conversationId,
        isGroup,
        callType,
        targetUser,
        participants,
        caller: {
          _id: user._id,
          username: user.username,
          nickname: user.nickname || user.username,
          avatar: user.avatar
        }
      };

      setCurrentCall(callInfo);
      setCallState('outgoing');
      setIsCallModalOpen(true);
      startOutgoingRingback();

      // Emit initiate event
      socket.emit('call:initiate', {
        callId,
        conversationId,
        isGroup,
        callType,
        targetUserId: targetId,
        participants
      });
    } catch (err) {
      alert(err.message || 'Could not start call.');
      cleanupCall();
    }
  }, [socket, user, acquireMedia, cleanupCall]);

  // Accept incoming call (supports direct parameter override for cold launch / notification tap)
  const acceptCall = useCallback(async (incomingCallOverride) => {
    // If incomingCallOverride is a DOM / React SyntheticEvent (has preventDefault or target), ignore it!
    const isEvent = incomingCallOverride && (typeof incomingCallOverride.preventDefault === 'function' || incomingCallOverride._reactName || incomingCallOverride.nativeEvent);
    const callToAccept = (!isEvent && incomingCallOverride && incomingCallOverride.callId) ? incomingCallOverride : currentCall;
    if (!callToAccept || !callToAccept.callId) return;

    try {
      stopRingtone();
      playCallConnectedSound();

      await acquireMedia(callToAccept.callType || 'video');
      setCurrentCall(callToAccept);
      setCallState('connected');
      setIsCallModalOpen(true);

      // Start duration counter
      if (!callTimerRef.current) {
        callTimerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }

      // Join the call room (queue join if socket is still establishing connection)
      const joinCall = () => {
        if (socket && socket.connected) {
          socket.emit('call:join', { callId: callToAccept.callId });
        } else if (socket) {
          socket.once('connect', () => {
            socket.emit('call:join', { callId: callToAccept.callId });
          });
        } else {
          pendingJoinCallIdRef.current = callToAccept.callId;
        }
      };

      joinCall();
    } catch (err) {
      alert(err.message || 'Could not access camera/microphone.');
      rejectCall();
    }
  }, [socket, currentCall, acquireMedia, rejectCall]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    if (!socket || !currentCall) return;
    stopRingtone();

    socket.emit('call:reject', {
      callId: currentCall.callId,
      callerId: currentCall.caller?._id,
      conversationId: currentCall.conversationId
    });

    cleanupCall();
  }, [socket, currentCall, cleanupCall]);

  // End an ongoing call
  const endCall = useCallback(() => {
    playCallEndedSound();
    if (socket && currentCall) {
      socket.emit('call:leave', { callId: currentCall.callId });
    }
    cleanupCall();
  }, [socket, currentCall, cleanupCall]);

  // Toggle Mute Audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMuted = !audioTrack.enabled;
        setIsAudioMuted(newMuted);

        if (socket && currentCall) {
          socket.emit('call:toggle-media', {
            callId: currentCall.callId,
            isMuted: newMuted
          });
        }
      }
    }
  }, [socket, currentCall]);

  // Toggle Camera On/Off
  const toggleVideo = useCallback(async () => {
    if (!localStreamRef.current) return;

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      const newOff = !videoTrack.enabled;
      setIsVideoOff(newOff);

      if (socket && currentCall) {
        socket.emit('call:toggle-media', {
          callId: currentCall.callId,
          isVideoOff: newOff
        });
      }
    } else {
      // If call started as audio-only and user wants to enable camera
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        });
        const newTrack = camStream.getVideoTracks()[0];
        localStreamRef.current.addTrack(newTrack);

        // Add track to all active peer connections
        Object.values(peerConnectionsRef.current).forEach((pc) => {
          pc.addTrack(newTrack, localStreamRef.current);
        });

        setIsVideoOff(false);
        if (socket && currentCall) {
          socket.emit('call:toggle-media', {
            callId: currentCall.callId,
            isVideoOff: false
          });
        }
      } catch (err) {
        console.error('Cannot access camera', err);
      }
    }
  }, [socket, currentCall]);

  // Screen Sharing Toggle
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop sharing
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setScreenStream(null);

      // Revert to camera video track
      const webcamTrack = localStreamRef.current?.getVideoTracks()[0];
      Object.values(peerConnectionsRef.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => (s.track && s.track.kind === 'video') || s.kind === 'video');
        if (sender && webcamTrack) {
          sender.replaceTrack(webcamTrack).catch(() => {});
        } else if (sender && !webcamTrack) {
          sender.replaceTrack(null).catch(() => {});
        }
      });

      setIsScreenSharing(false);
      if (socket && currentCall) {
        socket.emit('call:toggle-media', {
          callId: currentCall.callId,
          isScreenSharing: false,
          isVideoOff: isVideoOff
        });
      }
    } else {
      // Start screen sharing
      try {
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
          alert('Screen sharing is not supported by your current browser. Please open PulseChat in Chrome or Safari.');
          return;
        }

        const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');
        let screen = null;

        if (isMobile) {
          // Mobile phones require simple video-only constraints without unsupported cursor/displaySurface/audio
          try {
            screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
          } catch (mErr) {
            screen = await navigator.mediaDevices.getDisplayMedia();
          }
        } else {
          try {
            screen = await navigator.mediaDevices.getDisplayMedia({
              video: { cursor: 'always' },
              audio: false
            });
          } catch (dErr) {
            screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
          }
        }

        const screenTrack = screen.getVideoTracks()[0];
        if (!screenTrack) {
          throw new Error('No video track available from screen capture.');
        }

        screenTrack.onended = () => {
          // Trigger when user clicks browser native "Stop sharing" button
          if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((t) => t.stop());
            screenStreamRef.current = null;
          }
          setScreenStream(null);
          setIsScreenSharing(false);

          const webcamTrack = localStreamRef.current?.getVideoTracks()[0];
          Object.values(peerConnectionsRef.current).forEach((pc) => {
            const sender = pc.getSenders().find((s) => (s.track && s.track.kind === 'video') || s.kind === 'video');
            if (sender && webcamTrack) {
              sender.replaceTrack(webcamTrack).catch(() => {});
            } else if (sender && !webcamTrack) {
              sender.replaceTrack(null).catch(() => {});
            }
          });

          if (socket && currentCall) {
            socket.emit('call:toggle-media', {
              callId: currentCall.callId,
              isScreenSharing: false,
              isVideoOff: isVideoOff
            });
          }
        };

        // Replace video track in all peer connections
        Object.values(peerConnectionsRef.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => (s.track && s.track.kind === 'video') || s.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack).catch((err) => console.error('replaceTrack error', err));
          } else {
            pc.addTrack(screenTrack, screen);
          }
        });

        screenStreamRef.current = screen;
        setScreenStream(screen);
        setIsScreenSharing(true);

        if (socket && currentCall) {
          socket.emit('call:toggle-media', {
            callId: currentCall.callId,
            isScreenSharing: true,
            isVideoOff: false
          });
        }
      } catch (err) {
        if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
          console.log('[ScreenShare] Cancelled by user');
        } else {
          console.warn('[ScreenShare] Screen sharing error:', err);
          alert(
            err.message?.includes('not supported')
              ? 'Screen sharing is not supported on this mobile browser. Please use Chrome on Android or Safari on iOS.'
              : 'Could not start screen sharing: ' + (err.message || 'Permission denied')
          );
        }
      }
    }
  }, [isScreenSharing, isVideoOff, socket, currentCall]);

  // Send emoji reaction in call
  const sendReaction = useCallback((emoji) => {
    if (!socket || !currentCall) return;

    // Show locally immediately
    const reactionId = `${Date.now()}-${Math.random()}`;
    setReactions((prev) => [
      ...prev,
      { id: reactionId, emoji, senderName: 'You' }
    ]);

    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== reactionId));
    }, 3500);

    socket.emit('call:reaction', {
      callId: currentCall.callId,
      emoji
    });
  }, [socket, currentCall]);

  // Toggle Raise Hand in Call
  const toggleRaiseHand = useCallback(() => {
    if (!socket || !currentCall) return;
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);

    // Update local dictionary immediately
    setRaisedHands((prev) => {
      const next = { ...prev };
      if (nextState) {
        next[socket.id || 'local'] = {
          isRaised: true,
          userName: 'You',
          userId: user?._id?.toString(),
          raisedAt: Date.now()
        };
      } else {
        delete next[socket.id || 'local'];
      }
      return next;
    });

    socket.emit('call:hand-toggle', {
      callId: currentCall.callId,
      isHandRaised: nextState
    });
  }, [socket, currentCall, isHandRaised, user]);

  // Invite another user to ongoing call
  const inviteUserToCall = useCallback((targetUserId) => {
    if (!socket || !currentCall) return;

    socket.emit('call:invite-user', {
      callId: currentCall.callId,
      conversationId: currentCall.conversationId,
      targetUserId,
      callType: currentCall.callType
    });
  }, [socket, currentCall]);

  // Listen for Service Worker postMessage (when phone wakes up in background or notification is tapped)
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleSwMessage = (event) => {
      const msg = event.data;
      if (!msg) return;

      if ((msg.type === 'INCOMING_CALL_POPUP' || msg.type === 'INCOMING_CALL_ACTION') && (msg.callData || msg.callId)) {
        const d = msg.callData || {};
        const callInfo = {
          callId: msg.callId || d.callId,
          conversationId: d.conversationId,
          isGroup: d.isGroup,
          callType: d.callType || 'video',
          caller: {
            _id: d.callerId,
            username: d.callerName || 'Caller',
            nickname: d.callerName || 'Caller',
            avatar: d.callerAvatar || ''
          }
        };

        setCurrentCall(callInfo);

        if (msg.action === 'answer') {
          acceptCall(callInfo);
        } else {
          setCallState('incoming');
          setIsCallModalOpen(true);
          startIncomingRingtone();
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    };
  }, [acceptCall]);

  // Handle incoming call triggered via Push Notification when app was closed (?callId=...&action=...)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pushCallId = urlParams.get('callId');
    const pushAction = urlParams.get('action');

    if (pushCallId) {
      const callerName = urlParams.get('callerName') || 'Someone';
      const callerAvatar = urlParams.get('callerAvatar') || '';
      const callerId = urlParams.get('callerId') || '';
      const callType = urlParams.get('callType') || 'video';
      const conversationId = urlParams.get('conversationId') || '';
      const isGroup = urlParams.get('isGroup') === '1' || urlParams.get('isGroup') === 'true';

      const initialCallInfo = {
        callId: pushCallId,
        conversationId,
        isGroup,
        callType,
        caller: {
          _id: callerId,
          username: callerName,
          nickname: callerName,
          avatar: callerAvatar
        }
      };

      // Immediately display incoming call interface or accept if tapped answer
      setCurrentCall(initialCallInfo);

      if (pushAction === 'answer') {
        acceptCall(initialCallInfo);
      } else {
        setCallState('incoming');
        setIsCallModalOpen(true);
        startIncomingRingtone();
      }

      window.history.replaceState({}, document.title, window.location.pathname);

      // In background, fetch full call details from REST endpoint to enrich if needed
      const loadCallFromRest = async () => {
        try {
          const res = await fetch(`/api/users/call/${encodeURIComponent(pushCallId)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.call) {
              setCurrentCall((prev) => ({
                ...(prev || {}),
                ...data.call
              }));
            }
          }
        } catch (err) {
          console.warn('[CallContext] REST call loader notice:', err);
        }
      };

      loadCallFromRest();
    }
  }, [acceptCall]);

  // Socket WebRTC Event Listeners
  useEffect(() => {
    if (!socket) return;

    // Incoming Call listener
    socket.on('call:incoming', (data) => {
      // If already in a call, reject with busy status to prevent call clash
      if (callStateRef.current !== 'idle') {
        socket.emit('call:reject', {
          callId: data.callId,
          callerId: data.caller?._id,
          conversationId: data.conversationId,
          reason: 'busy'
        });
        return;
      }

      setCurrentCall(data);
      setCallState('incoming');
      setIsCallModalOpen(true);
      startIncomingRingtone();
    });

    // Busy listener (recipient is already on another call)
    socket.on('call:busy', ({ message }) => {
      stopRingtone();
      playBusyTone();
      alert(message || 'User is currently on another call.');
      cleanupCall();
    });

    // Call Rejected listener
    socket.on('call:rejected', ({ byUser }) => {
      stopRingtone();
      playCallEndedSound();
      alert(`${byUser?.nickname || byUser?.username || 'User'} declined the call.`);
      cleanupCall();
    });

    // Call Cancelled listener (caller hung up before call was answered)
    socket.on('call:cancelled', ({ callId }) => {
      if (currentCallRef.current?.callId === callId || callStateRef.current === 'incoming') {
        stopRingtone();
        cleanupCall();
      }
    });

    // Existing participants when joined
    socket.on('call:existing-participants', ({ participants }) => {
      playCallConnectedSound();
      setCallState('connected');

      // Start duration counter if not already running
      if (!callTimerRef.current) {
        callTimerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }

      // The joining user initiates connections to all existing participants
      participants.forEach((p) => {
        createPeerConnection(p.socketId, p.user, true);
      });
    });

    // A new user joined the call
    socket.on('call:user-joined', ({ participant }) => {
      if (callState === 'outgoing') {
        stopRingtone();
        playCallConnectedSound();
        setCallState('connected');

        if (!callTimerRef.current) {
          callTimerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        }
      }
      // Existing participants wait for the new user's offer (isInitiator = false to prevent glare!)
      createPeerConnection(participant.socketId, participant.user, false);
    });

    // WebRTC Signaling receiver with glare protection & candidate queuing
    socket.on('call:signal', async ({ fromSocketId, fromUser, signal }) => {
      try {
        let pc = peerConnectionsRef.current[fromSocketId];
        if (!pc) {
          pc = createPeerConnection(fromSocketId, fromUser, false);
        }

        if (signal.type === 'offer') {
          // Handle offer collision (glare) using polite peer pattern
          if (pc.signalingState !== 'stable') {
            const isPolite = (socket.id || '') > (fromSocketId || '');
            if (!isPolite) {
              console.log('[WebRTC] Ignoring colliding offer as impolite peer');
              return;
            }
            try {
              await pc.setRemoteDescription({ type: 'rollback' });
            } catch (rbErr) {
              console.warn('[WebRTC] Rollback warning', rbErr);
            }
          }

          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

          // Drain queued ICE candidates for this peer
          if (iceCandidateQueueRef.current[fromSocketId]) {
            for (const cand of iceCandidateQueueRef.current[fromSocketId]) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {}
            }
            delete iceCandidateQueueRef.current[fromSocketId];
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit('call:signal', {
            toSocketId: fromSocketId,
            callId: currentCallRef.current?.callId,
            signal: { type: 'answer', sdp: pc.localDescription }
          });
        } else if (signal.type === 'answer') {
          if (pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

            // Drain queued ICE candidates
            if (iceCandidateQueueRef.current[fromSocketId]) {
              for (const cand of iceCandidateQueueRef.current[fromSocketId]) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(cand));
                } catch (e) {}
              }
              delete iceCandidateQueueRef.current[fromSocketId];
            }
          }
        } else if (signal.type === 'candidate' && signal.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch (e) {
              console.warn('[WebRTC] Candidate error', e);
            }
          } else {
            // Queue ICE candidate until remote description is applied
            if (!iceCandidateQueueRef.current[fromSocketId]) {
              iceCandidateQueueRef.current[fromSocketId] = [];
            }
            iceCandidateQueueRef.current[fromSocketId].push(signal.candidate);
          }
        }
      } catch (err) {
        console.error('[WebRTC] Signal handling error', err);
      }
    });

    // Remote Peer Media Toggle listener
    socket.on('call:peer-media-toggled', ({ socketId, isVideoOff, isMuted, isScreenSharing }) => {
      setRemoteStreams((prev) => {
        if (!prev[socketId]) return prev;
        const newIsScreenSharing = isScreenSharing !== undefined ? isScreenSharing : prev[socketId].isScreenSharing;
        const existingStream = prev[socketId].stream;
        // Refresh stream instance so React & DOM video element detect track changes
        const refreshedStream = existingStream ? new MediaStream(existingStream.getTracks()) : existingStream;

        return {
          ...prev,
          [socketId]: {
            ...prev[socketId],
            stream: refreshedStream,
            isVideoOff: newIsScreenSharing ? false : (isVideoOff !== undefined ? isVideoOff : prev[socketId].isVideoOff),
            ...(isMuted !== undefined ? { isMuted } : {}),
            isScreenSharing: newIsScreenSharing
          }
        };
      });
    });

    // Peer left call
    socket.on('call:user-left', ({ socketId }) => {
      removePeer(socketId);
      // If 1-on-1 and peer leaves, end call
      setRemoteStreams((prev) => {
        const remaining = Object.keys(prev).filter((id) => id !== socketId);
        if (remaining.length === 0 && !currentCallRef.current?.isGroup && callState === 'connected') {
          setTimeout(() => {
            endCall();
          }, 300);
        }
        return prev;
      });
    });

    // Reaction received listener
    socket.on('call:reaction-received', ({ emoji, senderName, id }) => {
      setReactions((prev) => [...prev, { id, emoji, senderName }]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== id));
      }, 3500);
    });

    // Raised hand toggled listener
    socket.on('call:hand-toggled', ({ socketId, userId, userName, isHandRaised: raised, raisedAt }) => {
      setRaisedHands((prev) => {
        const next = { ...prev };
        if (raised) {
          next[socketId] = { isRaised: true, userName, userId, raisedAt };
        } else {
          delete next[socketId];
        }
        return next;
      });
    });

    return () => {
      socket.off('call:incoming');
      socket.off('call:cancelled');
      socket.off('call:busy');
      socket.off('call:rejected');
      socket.off('call:existing-participants');
      socket.off('call:user-joined');
      socket.off('call:signal');
      socket.off('call:peer-media-toggled');
      socket.off('call:user-left');
      socket.off('call:reaction-received');
      socket.off('call:hand-toggled');
    };
  }, [socket, callState, createPeerConnection, removePeer, endCall, cleanupCall]);

  return (
    <CallContext.Provider
      value={{
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
        setIsCallModalOpen,
        isAddPeopleOpen,
        setIsAddPeopleOpen,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleAudio,
        toggleVideo,
        toggleScreenShare,
        sendReaction,
        inviteUserToCall,
        isHandRaised,
        raisedHands,
        toggleRaiseHand
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);
