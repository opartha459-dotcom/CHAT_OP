const { verifyToken } = require('../utils/token');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const onlineUsers = new Map(); // userId -> Set of socketIds
const activeCalls = new Map(); // callId -> { conversationId, callType, isGroup, participants }
const socketCallMap = new Map(); // socketId -> Set of callIds
const userCallMap = new Map(); // userId -> callId (tracks active call per user to prevent clashes)

const setupSockets = (io) => {
  // Helper to log call history messages and broadcast to conversation
  const logCallMessage = async (conversationId, senderId, callMetadata) => {
    try {
      if (!conversationId || !senderId) return;
      let content = '';
      const isVideo = callMetadata.callType === 'video';
      const typeLabel = isVideo ? 'Video Call' : 'Voice Call';

      if (callMetadata.status === 'completed') {
        const mins = Math.floor(callMetadata.duration / 60);
        const secs = callMetadata.duration % 60;
        const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        content = `${typeLabel} • ${durationStr}`;
      } else if (callMetadata.status === 'missed') {
        content = `Missed ${typeLabel}`;
      } else if (callMetadata.status === 'rejected') {
        content = `${typeLabel} Declined`;
      } else if (callMetadata.status === 'busy') {
        content = `Missed ${typeLabel} (User Busy)`;
      }

      const newMsg = await Message.create({
        conversation: conversationId,
        sender: senderId,
        content,
        messageType: 'call',
        callMetadata: {
          callId: callMetadata.callId || '',
          callType: callMetadata.callType || 'audio',
          status: callMetadata.status || 'completed',
          duration: callMetadata.duration || 0
        }
      });

      const populated = await Message.findById(newMsg._id).populate('sender', 'username nickname avatar');
      const convIdStr = conversationId.toString();

      io.to(convIdStr).emit('message:received', populated);
      io.to(convIdStr).emit('message:new', populated);

      const conv = await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: newMsg._id,
        lastMessageAt: new Date()
      });

      if (conv && conv.participants) {
        conv.participants.forEach((pId) => {
          const userRoom = `user:${pId.toString()}`;
          io.to(userRoom).emit('message:received', populated);
          io.to(userRoom).emit('message:new', populated);
          io.to(userRoom).emit('conversation:updated', {
            conversationId: convIdStr,
            lastMessage: populated
          });
        });
      }
    } catch (err) {
      console.error('[Call Log] Failed to save call message:', err);
    }
  };

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      if (!token && socket.handshake.headers?.cookie) {
        const cookies = socket.handshake.headers.cookie.split(';').reduce((acc, cookie) => {
          const [key, val] = cookie.trim().split('=');
          if (key && val) acc[key] = decodeURIComponent(val);
          return acc;
        }, {});
        token = cookies.token;
      }

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = verifyToken(token);
      if (!decoded || !decoded.userId) {
        return next(new Error('Invalid token'));
      }

      const user = await User.findById(decoded.userId);
      if (!user || user.isBanned || user.isDeactivated) {
        return next(new Error('User account unauthorized'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Socket authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();

    // Track online user
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join personal user room for direct user notifications
    socket.join(`user:${userId}`);

    // Update DB status to online
    await User.findByIdAndUpdate(userId, { status: 'online', lastSeen: new Date() });
    io.emit('user:status', { userId, status: 'online', lastSeen: new Date() });

    // Join conversation rooms the user is part of
    const userConversations = await Conversation.find({
      participants: userId,
      deletedFor: { $ne: userId }
    }).select('_id');

    userConversations.forEach((conv) => {
      socket.join(conv._id.toString());
    });

    // Handle joining a new conversation room
    socket.on('conversation:join', async ({ conversationId }) => {
      try {
        const conv = await Conversation.findOne({ _id: conversationId, participants: userId });
        if (conv) {
          socket.join(conversationId);
        }
      } catch (err) {
        console.error('Error joining conversation room', err);
      }
    });

    // Handle leaving a conversation room
    socket.on('conversation:leave', ({ conversationId }) => {
      socket.leave(conversationId);
    });

    // Typing indicators
    socket.on('typing:start', ({ conversationId }) => {
      socket.to(conversationId).emit('typing:started', {
        conversationId,
        user: {
          _id: socket.user._id,
          username: socket.user.username,
          nickname: socket.user.nickname || socket.user.username
        }
      });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(conversationId).emit('typing:stopped', {
        conversationId,
        userId: socket.user._id
      });
    });

    // Message delivered acknowledgment
    socket.on('message:delivered', async ({ messageId, conversationId }) => {
      try {
        await Message.findByIdAndUpdate(messageId, {
          $addToSet: { deliveredTo: { user: socket.user._id, deliveredAt: new Date() } }
        });
        socket.to(conversationId).emit('message:status_update', {
          messageId,
          conversationId,
          status: 'delivered',
          userId: socket.user._id
        });
      } catch (err) {
        console.error('Delivered status update error', err);
      }
    });

    // Message read acknowledgment
    socket.on('message:read', async ({ messageId, conversationId }) => {
      try {
        await Message.findByIdAndUpdate(messageId, {
          $addToSet: { readBy: { user: socket.user._id, readAt: new Date() } }
        });
        socket.to(conversationId).emit('message:status_update', {
          messageId,
          conversationId,
          status: 'read',
          userId: socket.user._id
        });
      } catch (err) {
        console.error('Read status update error', err);
      }
    });

    // WebRTC Calling Signaling Handlers
    socket.on('call:initiate', async ({ callId, conversationId, isGroup, callType, targetUserId, participants }) => {
      let resolvedTargetUserId = targetUserId ? targetUserId.toString() : null;
      if (!isGroup && !resolvedTargetUserId && conversationId) {
        try {
          const conv = await Conversation.findById(conversationId);
          if (conv && conv.participants) {
            const other = conv.participants.find((p) => p.toString() !== socket.user._id.toString());
            if (other) resolvedTargetUserId = other.toString();
          }
        } catch (e) {
          console.error('[Call] Error resolving target user from conversation:', e);
        }
      }

      // 1. Clash Prevention: If target user in 1-on-1 call is already in a call, reject with busy status
      if (!isGroup && resolvedTargetUserId && userCallMap.has(resolvedTargetUserId)) {
        socket.emit('call:busy', {
          targetUserId: resolvedTargetUserId,
          message: 'User is currently on another call'
        });

        // Automatically log missed call in the chat for both users
        await logCallMessage(conversationId, socket.user._id, {
          callId,
          callType: callType || 'audio',
          status: 'busy',
          duration: 0
        });
        return; // Prevent incoming call clash!
      }

      if (!activeCalls.has(callId)) {
        activeCalls.set(callId, {
          conversationId,
          callType: callType || 'audio',
          isGroup: !!isGroup,
          startedAt: new Date(),
          callerId: socket.user._id,
          targetUserId: resolvedTargetUserId,
          answered: false,
          logged: false,
          participants: new Map()
        });
      }
      const call = activeCalls.get(callId);
      const participantInfo = {
        socketId: socket.id,
        userId: socket.user._id.toString(),
        user: {
          _id: socket.user._id,
          username: socket.user.username,
          nickname: socket.user.nickname || socket.user.username,
          avatar: socket.user.avatar
        }
      };
      call.participants.set(socket.id, participantInfo);

      // Track active call for caller
      userCallMap.set(socket.user._id.toString(), callId);

      socket.join(`call:${callId}`);
      if (!socketCallMap.has(socket.id)) socketCallMap.set(socket.id, new Set());
      socketCallMap.get(socket.id).add(callId);

      const payload = {
        callId,
        conversationId,
        isGroup,
        callType,
        caller: participantInfo.user,
        participants
      };

      if (isGroup) {
        if (conversationId) socket.to(conversationId.toString()).emit('call:incoming', payload);
      } else {
        if (resolvedTargetUserId) {
          io.to(`user:${resolvedTargetUserId}`).emit('call:incoming', payload);
        }
        if (conversationId) {
          socket.to(conversationId.toString()).emit('call:incoming', payload);
        }
      }
    });

    socket.on('call:join', ({ callId }) => {
      socket.join(`call:${callId}`);
      if (!socketCallMap.has(socket.id)) socketCallMap.set(socket.id, new Set());
      socketCallMap.get(socket.id).add(callId);

      let call = activeCalls.get(callId);
      if (!call) {
        call = {
          callType: 'video',
          participants: new Map()
        };
        activeCalls.set(callId, call);
      }

      // Mark call as answered and track connect timestamp
      call.answered = true;
      if (!call.connectedAt) {
        call.connectedAt = new Date();
      }

      // Track active call for joining user
      userCallMap.set(socket.user._id.toString(), callId);

      // Collect existing peers
      const existingPeers = [];
      call.participants.forEach((p, sId) => {
        if (sId !== socket.id) {
          existingPeers.push(p);
        }
      });

      const participantInfo = {
        socketId: socket.id,
        userId: socket.user._id.toString(),
        user: {
          _id: socket.user._id,
          username: socket.user.username,
          nickname: socket.user.nickname || socket.user.username,
          avatar: socket.user.avatar
        }
      };
      call.participants.set(socket.id, participantInfo);

      // Send existing participants to newly joined user
      socket.emit('call:existing-participants', {
        participants: existingPeers,
        callType: call.callType
      });

      // Notify others in call that someone joined
      socket.to(`call:${callId}`).emit('call:user-joined', {
        participant: participantInfo
      });
    });

    socket.on('call:signal', ({ toSocketId, signal, callId }) => {
      io.to(toSocketId).emit('call:signal', {
        fromSocketId: socket.id,
        fromUser: {
          _id: socket.user._id,
          username: socket.user.username,
          nickname: socket.user.nickname || socket.user.username,
          avatar: socket.user.avatar
        },
        signal,
        callId
      });
    });

    socket.on('call:toggle-media', ({ callId, isVideoOff, isMuted, isScreenSharing }) => {
      socket.to(`call:${callId}`).emit('call:peer-media-toggled', {
        socketId: socket.id,
        userId: socket.user._id.toString(),
        isVideoOff,
        isMuted,
        isScreenSharing
      });
    });

    socket.on('call:reaction', ({ callId, emoji }) => {
      io.to(`call:${callId}`).emit('call:reaction-received', {
        socketId: socket.id,
        emoji,
        senderName: socket.user.nickname || socket.user.username,
        id: `${Date.now()}-${Math.random()}`
      });
    });

    socket.on('call:invite-user', ({ callId, conversationId, targetUserId, callType }) => {
      io.to(`user:${targetUserId}`).emit('call:incoming', {
        callId,
        conversationId,
        isGroup: true,
        callType: callType || 'video',
        caller: {
          _id: socket.user._id,
          username: socket.user.username,
          nickname: socket.user.nickname || socket.user.username,
          avatar: socket.user.avatar
        },
        isInvitation: true
      });
    });

    socket.on('call:reject', async ({ callId, callerId, conversationId, reason }) => {
      userCallMap.delete(socket.user._id.toString());
      const call = activeCalls.get(callId);
      if (call) {
        call.logged = true;
      }

      if (callerId) {
        if (reason === 'busy') {
          io.to(`user:${callerId}`).emit('call:busy', {
            callId,
            targetUserId: socket.user._id,
            message: `${socket.user.nickname || socket.user.username} is currently on another call.`
          });
        } else {
          io.to(`user:${callerId}`).emit('call:rejected', {
            callId,
            byUser: {
              _id: socket.user._id,
              username: socket.user.username,
              nickname: socket.user.nickname || socket.user.username
            }
          });
        }
      }
      if (conversationId) {
        socket.to(conversationId).emit('call:participant-rejected', {
          callId,
          userId: socket.user._id,
          reason
        });

        // Log call rejection in chat history
        await logCallMessage(conversationId, callerId || socket.user._id, {
          callId,
          callType: call?.callType || 'audio',
          status: reason === 'busy' ? 'busy' : 'rejected',
          duration: 0
        });
      }
    });

    const handleLeaveCall = async (callId, sId) => {
      userCallMap.delete(socket.user._id.toString());
      if (activeCalls.has(callId)) {
        const call = activeCalls.get(callId);
        call.participants.delete(sId);
        socket.to(`call:${callId}`).emit('call:user-left', {
          socketId: sId,
          userId: socket.user._id.toString()
        });

        if (call.participants.size === 0) {
          activeCalls.delete(callId);

          // If caller cancelled before anyone answered, notify targets to close incoming ringing modal
          if (!call.answered) {
            if (call.isGroup && call.conversationId) {
              socket.to(call.conversationId).emit('call:cancelled', { callId });
            } else if (call.targetUserId) {
              io.to(`user:${call.targetUserId}`).emit('call:cancelled', { callId });
            }
          }

          // Log call completion or missed call in chat
          if (!call.logged && call.conversationId) {
            call.logged = true;
            if (call.answered && call.connectedAt) {
              const duration = Math.max(1, Math.round((new Date() - call.connectedAt) / 1000));
              await logCallMessage(call.conversationId, call.callerId, {
                callId,
                callType: call.callType,
                status: 'completed',
                duration
              });
            } else {
              // Call was never answered (Missed / Cancelled)
              await logCallMessage(call.conversationId, call.callerId, {
                callId,
                callType: call.callType,
                status: 'missed',
                duration: 0
              });
            }
          }
        }
      }
      socket.leave(`call:${callId}`);
      if (socketCallMap.has(sId)) {
        socketCallMap.get(sId).delete(callId);
      }
    };

    socket.on('call:leave', ({ callId }) => {
      handleLeaveCall(callId, socket.id);
    });

    // Disconnect handler
    socket.on('disconnect', async () => {
      userCallMap.delete(socket.user._id.toString());
      if (socketCallMap.has(socket.id)) {
        socketCallMap.get(socket.id).forEach((cId) => {
          handleLeaveCall(cId, socket.id);
        });
        socketCallMap.delete(socket.id);
      }

      if (onlineUsers.has(userId)) {
        const userSockets = onlineUsers.get(userId);
        userSockets.delete(socket.id);

        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          const now = new Date();
          await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: now });
          io.emit('user:status', { userId, status: 'offline', lastSeen: now });
        }
      }
    });
  });
};

module.exports = setupSockets;
