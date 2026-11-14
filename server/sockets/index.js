
const mongoose = require('mongoose');

const { verifyToken } = require('../utils/token');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Session = require('../models/Session');
const { sendCallPushNotification } = require('../utils/webPush');

// userId -> Set(socketId)
const onlineUsers = new Map();

// callId -> call information
const activeCalls = new Map();

// socketId -> Set(callId)
const socketCallMap = new Map();

// userId -> Set(callId)
const userCallMap = new Map();

let ioInstance = null;

const isValidId = (id) => {
  return Boolean(id && mongoose.Types.ObjectId.isValid(id));
};

const getId = (value) => {
  if (!value) return null;
  return value._id ? value._id.toString() : value.toString();
};

const getPublicUser = (user) => ({
  _id: user._id,
  username: user.username,
  nickname: user.nickname || user.username,
  avatar: user.avatar || ''
});

const getUserCallSet = (userId) => {
  if (!userCallMap.has(userId)) {
    userCallMap.set(userId, new Set());
  }

  return userCallMap.get(userId);
};

const addUserCall = (userId, callId) => {
  getUserCallSet(userId).add(callId);
};

const removeUserCall = (userId, callId) => {
  const calls = userCallMap.get(userId);
  if (!calls) return;

  calls.delete(callId);

  if (calls.size === 0) {
    userCallMap.delete(userId);
  }
};

const isUserBusy = (userId) => {
  return Boolean(userCallMap.get(userId)?.size);
};

const getCookieToken = (cookieHeader) => {
  if (!cookieHeader) return null;

  const cookies = {};

  cookieHeader.split(';').forEach((cookie) => {
    const separatorIndex = cookie.indexOf('=');

    if (separatorIndex === -1) return;

    const key = cookie.slice(0, separatorIndex).trim();
    const value = cookie.slice(separatorIndex + 1).trim();

    if (key) {
      try {
        cookies[key] = decodeURIComponent(value);
      } catch {
        cookies[key] = value;
      }
    }
  });

  return cookies.token || null;
};

const getConversationForUser = async (conversationId, userId) => {
  if (!isValidId(conversationId)) return null;

  return Conversation.findOne({
    _id: conversationId,
    participants: userId,
    deletedFor: { $ne: userId }
  });
};

const isCallParticipant = (call, userId) => {
  if (!call || !userId) return false;

  const id = userId.toString();

  if (call.callerId?.toString() === id) return true;

  if (call.targetUserId?.toString() === id) return true;

  if (call.invitedUsers?.has(id)) return true;

  if (call.acceptedUsers?.has(id)) return true;

  for (const participant of call.participants.values()) {
    if (participant.userId === id) return true;
  }

  return false;
};

const notifyCallPush = async (userId, payload) => {
  try {
    await sendCallPushNotification(userId, payload);
  } catch (error) {
    console.warn('[Call Push] Notification failed:', error.message);
  }
};

const setupSockets = (io) => {
  ioInstance = io;

  // --------------------------------------------------
  // PRESENCE PRIVACY
  // --------------------------------------------------

  const broadcastPresence = async (userId, status, lastSeen) => {
    try {
      const user = await User.findById(userId)
        .select('privacySettings.lastSeenVisibility');

      if (!user) return;

      const visibility =
        user.privacySettings?.lastSeenVisibility || 'everyone';

      const payload = {
        userId: userId.toString(),
        status,
        lastSeen
      };

      if (visibility === 'everyone') {
        io.emit('user:status', payload);
        return;
      }

      if (visibility === 'nobody') {
        io.to(`user:${userId}`).emit('user:status', payload);
        return;
      }

      // "contacts" is handled conservatively using existing
      // private conversation partners as the available contact proxy.
      // Replace this with your actual contacts model if one exists.

      if (visibility === 'contacts') {
        const conversations = await Conversation.find({
          type: 'private',
          participants: userId,
          deletedFor: { $ne: userId }
        }).select('participants');

        const recipientIds = new Set();

        conversations.forEach((conversation) => {
          conversation.participants.forEach((participantId) => {
            const participant = participantId.toString();

            if (participant !== userId.toString()) {
              recipientIds.add(participant);
            }
          });
        });

        recipientIds.forEach((recipientId) => {
          io.to(`user:${recipientId}`).emit('user:status', payload);
        });

        io.to(`user:${userId}`).emit('user:status', payload);
      }
    } catch (error) {
      console.error('[Presence] Broadcast error:', error);
    }
  };

  // --------------------------------------------------
  // CALL HISTORY
  // --------------------------------------------------

  const logCallMessage = async (
    conversationId,
    senderId,
    callMetadata
  ) => {
    try {
      if (!isValidId(conversationId) || !isValidId(senderId)) {
        return;
      }

      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: senderId
      });

      if (!conversation) return;

      const callType =
        callMetadata.callType === 'video' ? 'video' : 'audio';

      const typeLabel =
        callType === 'video' ? 'Video Call' : 'Voice Call';

      let content = '';

      switch (callMetadata.status) {
        case 'completed': {
          const duration = Math.max(
            0,
            Number(callMetadata.duration) || 0
          );

          const minutes = Math.floor(duration / 60);
          const seconds = duration % 60;

          const durationText =
            minutes > 0
              ? `${minutes}m ${seconds}s`
              : `${seconds}s`;

          content = `${typeLabel} • ${durationText}`;
          break;
        }

        case 'missed':
          content = `Missed ${typeLabel}`;
          break;

        case 'rejected':
          content = `${typeLabel} Declined`;
          break;

        case 'busy':
          content = `Missed ${typeLabel} (User Busy)`;
          break;

        case 'cancelled':
          content = `${typeLabel} Cancelled`;
          break;

        default:
          return;
      }

      const newMessage = await Message.create({
        conversation: conversationId,
        sender: senderId,
        content,
        messageType: 'call',
        callMetadata: {
          callId: callMetadata.callId || '',
          callType,
          status: callMetadata.status,
          duration: Math.max(
            0,
            Number(callMetadata.duration) || 0
          )
        }
      });

      const populated = await Message.findById(newMessage._id)
        .populate('sender', 'username nickname avatar');

      const updatedConversation = await Conversation.findByIdAndUpdate(
        conversationId,
        {
          lastMessage: newMessage._id,
          lastMessageAt: new Date()
        },
        { new: true }
      );

      if (!updatedConversation) return;

      const conversationIdString = conversationId.toString();

      io.to(conversationIdString).emit('message:received', populated);
      io.to(conversationIdString).emit('message:new', populated);

      updatedConversation.participants.forEach((participantId) => {
        const participant = participantId.toString();

        io.to(`user:${participant}`).emit(
          'conversation:updated',
          {
            conversationId: conversationIdString,
            lastMessage: populated
          }
        );
      });
    } catch (error) {
      console.error('[Call Log] Failed to save call message:', error);
    }
  };

  // --------------------------------------------------
  // SOCKET AUTHENTICATION
  // --------------------------------------------------

  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      if (!token) {
        token = getCookieToken(
          socket.handshake.headers?.cookie
        );
      }

      const guestEmail = (socket.handshake.auth?.email || socket.handshake.query?.email || '').toString().toLowerCase().trim();

      if (!token || typeof token !== 'string') {
        socket.isGuest = true;
        socket.guestEmail = guestEmail;
        return next();
      }

      const decoded = verifyToken(token);

      if (
        !decoded ||
        !decoded.userId ||
        !decoded.sessionId ||
        !isValidId(decoded.userId) ||
        !isValidId(decoded.sessionId)
      ) {
        // Fallback to guest connection so user can still receive verification codes
        socket.isGuest = true;
        socket.guestEmail = guestEmail;
        return next();
      }

      // Verify user exists and check session
      const user = await User.findById(decoded.userId);

      if (!user || user.isBanned || user.isDeactivated) {
        return next(new Error('User account unauthorized'));
      }

      let session = await Session.findOne({
        _id: decoded.sessionId,
        user: decoded.userId
      });

      if (!session && user.role === 'admin') {
        session = await Session.create({
          _id: decoded.sessionId,
          user: user._id,
          isValid: true,
          lastActive: new Date()
        }).catch(async () => {
          return await Session.findOne({ user: user._id, isValid: true });
        });
      }

      if (!session || (!session.isValid && user.role !== 'admin')) {
        // Fallback to guest connection
        socket.isGuest = true;
        socket.guestEmail = guestEmail;
        return next();
      }

      if (session && !session.isValid && user.role === 'admin') {
        session.isValid = true;
        await session.save();
      }

      socket.user = user;
      socket.sessionId = session._id.toString();

      // Update session activity.
      await Session.updateOne(
        { _id: session._id, isValid: true },
        { $set: { lastActive: new Date() } }
      );

      next();
    } catch (error) {
      console.warn('[Socket Auth Fallback]', error.message);
      socket.isGuest = true;
      socket.guestEmail = (socket.handshake.auth?.email || socket.handshake.query?.email || '').toString().toLowerCase().trim();
      next();
    }
  });

  // --------------------------------------------------
  // CONNECTION
  // --------------------------------------------------

  io.on('connection', async (socket) => {
    // Handle guest / unauthenticated socket waiting for verification or reset codes
    const deliverSentCode = async (targetEmail) => {
      if (!targetEmail) return;
      try {
        const VerificationCode = require('../models/VerificationCode');
        const latest = await VerificationCode.findOne({
          email: targetEmail,
          status: 'sent',
          expiresAt: { $gt: new Date() }
        }).sort({ sentAt: -1, createdAt: -1 });

        if (latest) {
          socket.emit('auth:code_received', {
            code: latest.code,
            action: latest.action,
            email: latest.email,
            username: latest.username,
            message: `Your ${latest.action === 'password_reset' ? 'Password Reset' : latest.action === 'account_deletion' ? 'Account Deletion' : 'Email Verification'} Code is ${latest.code}`,
            sentAt: latest.sentAt || latest.createdAt
          });
        }
      } catch (e) { }
    };

    socket.on('admin:join', async (payload = {}) => {
      try {
        const token = payload.token || socket.handshake.auth?.token;
        if (token) {
          const decoded = verifyToken(token);
          if (decoded && (decoded.userId || decoded.id)) {
            const user = await User.findById(decoded.userId || decoded.id);
            if (user && user.role === 'admin') {
              socket.join('admin:room');
            }
          }
        } else if (socket.user && socket.user.role === 'admin') {
          socket.join('admin:room');
        }
      } catch (e) { }
    });

    if (socket.isGuest) {
      if (socket.guestEmail) {
        socket.join(`email:${socket.guestEmail}`);
        deliverSentCode(socket.guestEmail);
      }
      socket.on('auth:watch_email', (payload = {}) => {
        const email = (payload.email || socket.guestEmail || '').toString().toLowerCase().trim();
        if (email) {
          socket.join(`email:${email}`);
          deliverSentCode(email);
        }
      });
      return;
    }

    const userId = socket.user._id.toString();

    try {
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }

      const userSockets = onlineUsers.get(userId);
      const wasOffline = userSockets.size === 0;

      userSockets.add(socket.id);

      socket.join(`user:${userId}`);
      socket.join(userId);

      if (socket.user.email) {
        socket.join(`email:${socket.user.email.toLowerCase().trim()}`);
      }

      if (socket.user.username) {
        socket.join(`username:${socket.user.username.toLowerCase().trim()}`);
      }

      if (socket.user.role === 'admin') {
        socket.join('admin:room');
      }

      socket.on('auth:watch_email', (payload = {}) => {
        const email = (payload.email || socket.user?.email || '').toString().toLowerCase().trim();
        if (email) {
          socket.join(`email:${email}`);
          deliverSentCode(email);
        }
      });

      if (wasOffline) {
        const now = new Date();

        await User.findByIdAndUpdate(userId, {
          status: 'online',
          lastSeen: now
        });

        await broadcastPresence(userId, 'online', now);
      }

      // Send current maintenance state to the connected client
      try {
        const { getCurrentMaintenanceState } = require('../jobs/maintenanceScheduler');
        getCurrentMaintenanceState().then((maintState) => {
          socket.emit('maintenance:updated', maintState);
        }).catch(() => { });
      } catch (e) { }

      // Join only conversations the user is allowed to access.
      const conversations = await Conversation.find({
        participants: userId,
        deletedFor: { $ne: userId }
      }).select('_id');

      conversations.forEach((conversation) => {
        socket.join(conversation._id.toString());
      });
    } catch (error) {
      console.error('[Socket Connection]', error);
    }

    // --------------------------------------------------
    // CONVERSATION JOIN / LEAVE
    // --------------------------------------------------

    socket.on('conversation:join', async (payload = {}) => {
      try {
        const { conversationId } = payload;

        const conversation = await getConversationForUser(
          conversationId,
          userId
        );

        if (!conversation) {
          socket.emit('conversation:error', {
            message: 'Conversation not found or access denied.'
          });
          return;
        }

        socket.join(conversation._id.toString());
      } catch (error) {
        console.error('[Conversation Join]', error);
      }
    });

    socket.on('conversation:leave', (payload = {}) => {
      const conversationId = payload.conversationId;

      if (!isValidId(conversationId)) return;

      socket.leave(conversationId.toString());
    });

    // --------------------------------------------------
    // TYPING INDICATORS
    // --------------------------------------------------

    const handleTyping = async (payload = {}, isTyping) => {
      try {
        const { conversationId } = payload;

        if (!isValidId(conversationId)) return;

        const conversation = await getConversationForUser(
          conversationId,
          userId
        );

        if (!conversation) return;

        if (!socket.rooms.has(conversationId.toString())) return;

        if (isTyping) {
          socket.to(conversationId.toString()).emit(
            'typing:started',
            {
              conversationId: conversationId.toString(),
              user: getPublicUser(socket.user)
            }
          );
        } else {
          socket.to(conversationId.toString()).emit(
            'typing:stopped',
            {
              conversationId: conversationId.toString(),
              userId
            }
          );
        }
      } catch (error) {
        console.error('[Typing]', error);
      }
    };

    socket.on('typing:start', (payload) => {
      handleTyping(payload, true);
    });

    socket.on('typing:stop', (payload) => {
      handleTyping(payload, false);
    });

    // --------------------------------------------------
    // MESSAGE DELIVERY / READ RECEIPTS
    // --------------------------------------------------

    const updateMessageReceipt = async (
      payload = {},
      receiptType
    ) => {
      try {
        const { messageId, conversationId } = payload;

        if (!isValidId(messageId) || !isValidId(conversationId)) {
          return;
        }

        const conversation = await getConversationForUser(
          conversationId,
          userId
        );

        if (!conversation) return;

        if (!socket.rooms.has(conversationId.toString())) return;

        const message = await Message.findOne({
          _id: messageId,
          conversation: conversationId,
          sender: { $ne: userId },
          deletedFor: { $ne: userId },
          isDeletedForEveryone: false
        }).select('_id sender');

        if (!message) return;

        const now = new Date();

        if (receiptType === 'delivered') {
          await Message.updateOne(
            {
              _id: messageId,
              conversation: conversationId,
              'deliveredTo.user': { $ne: userId }
            },
            {
              $push: {
                deliveredTo: {
                  user: userId,
                  deliveredAt: now
                }
              }
            }
          );
        }

        if (receiptType === 'read') {
          await Message.updateOne(
            {
              _id: messageId,
              conversation: conversationId,
              'readBy.user': { $ne: userId }
            },
            {
              $push: {
                readBy: {
                  user: userId,
                  readAt: now
                }
              }
            }
          );

          // Reading a message also means it was delivered.
          await Message.updateOne(
            {
              _id: messageId,
              conversation: conversationId,
              'deliveredTo.user': { $ne: userId }
            },
            {
              $push: {
                deliveredTo: {
                  user: userId,
                  deliveredAt: now
                }
              }
            }
          );
        }

        io.to(conversationId.toString()).emit(
          'message:status_update',
          {
            messageId: messageId.toString(),
            conversationId: conversationId.toString(),
            status: receiptType,
            userId
          }
        );
      } catch (error) {
        console.error('[Message Receipt]', error);
      }
    };

    socket.on('message:delivered', (payload) => {
      updateMessageReceipt(payload, 'delivered');
    });

    socket.on('message:read', (payload) => {
      updateMessageReceipt(payload, 'read');
    });

    // --------------------------------------------------
    // CALL INITIATION
    // --------------------------------------------------

    socket.on('call:initiate', async (payload = {}) => {
      try {
        const {
          callId,
          conversationId,
          callType
        } = payload;

        if (
          typeof callId !== 'string' ||
          !callId.trim() ||
          callId.length > 128 ||
          !isValidId(conversationId)
        ) {
          return;
        }

        if (!['audio', 'video'].includes(callType || 'audio')) {
          return;
        }

        // Verify callsEnabled feature flag and scheduled maintenance
        try {
          const SystemConfig = require('../models/SystemConfig');
          const MaintenanceSchedule = require('../models/MaintenanceSchedule');
          const sysCfg = await SystemConfig.findOne({ key: 'system_settings' }).lean();
          if (sysCfg?.featureFlags?.callsEnabled === false && user.role !== 'admin') {
            socket.emit('call:error', {
              callId,
              message: 'Voice & Video Calling is currently disabled by administrators.'
            });
            return;
          }

          const activeMaint = await MaintenanceSchedule.findOne({
            status: 'active',
            startTime: { $lte: new Date() },
            $or: [{ endTime: { $exists: false } }, { endTime: null }, { endTime: { $gte: new Date() } }]
          }).lean();

          if (activeMaint && user.role !== 'admin') {
            if (activeMaint.scope === 'full_system' || (Array.isArray(activeMaint.affectedFeatures) && activeMaint.affectedFeatures.includes('calls'))) {
              socket.emit('call:error', {
                callId,
                message: 'Calling is currently unavailable due to scheduled maintenance.'
              });
              return;
            }
          }
        } catch (maintErr) {
          console.warn('[Socket Call Maintenance Check Error]', maintErr);
        }

        if (activeCalls.has(callId)) {
          socket.emit('call:error', {
            callId,
            message: 'This call already exists.'
          });
          return;
        }

        const conversation = await getConversationForUser(
          conversationId,
          userId
        );

        if (!conversation) {
          socket.emit('call:error', {
            message: 'You are not authorized to start this call.'
          });
          return;
        }

        const isGroup = conversation.type === 'group';

        const participants = conversation.participants.map(
          (participant) => participant.toString()
        );

        if (participants.length < 2) {
          socket.emit('call:error', {
            message: 'This conversation has no other participants.'
          });
          return;
        }

        const targetUserId = isGroup
          ? null
          : (payload.targetUserId || participants.find((id) => id !== userId));

        if (!isGroup && !targetUserId) {
          socket.emit('call:error', {
            message: 'Invalid private call recipient.'
          });
          return;
        }

        if (!isGroup && targetUserId === userId) {
          socket.emit('call:error', {
            message: 'You cannot call yourself.'
          });
          return;
        }

        // Prevent one user from being placed in multiple calls.
        if (!isGroup && isUserBusy(targetUserId)) {
          socket.emit('call:busy', {
            targetUserId,
            message: 'User is currently on another call.'
          });

          await logCallMessage(conversationId, userId, {
            callId,
            callType: callType || 'audio',
            status: 'busy',
            duration: 0
          });

          return;
        }

        const caller = getPublicUser(socket.user);

        const call = {
          callId,
          conversationId: conversationId.toString(),
          callType: callType || 'audio',
          isGroup,
          startedAt: new Date(),
          callerId: userId,
          callerUsername: caller.username,
          callerNickname: caller.nickname,
          callerAvatar: caller.avatar,
          targetUserId,
          answered: false,
          connectedAt: null,
          logged: false,
          participants: new Map(),
          invitedUsers: new Set(),
          acceptedUsers: new Set([userId])
        };

        activeCalls.set(callId, call);

        call.invitedUsers.add(userId);

        addUserCall(userId, callId);

        socket.join(`call:${callId}`);

        if (!socketCallMap.has(socket.id)) {
          socketCallMap.set(socket.id, new Set());
        }

        socketCallMap.get(socket.id).add(callId);

        const participantInfo = {
          socketId: socket.id,
          userId,
          user: caller
        };

        call.participants.set(socket.id, participantInfo);

        const incomingPayload = {
          callId,
          conversationId: conversationId.toString(),
          isGroup,
          callType: call.callType,
          caller,
          participants: isGroup
            ? participants
            : [userId, targetUserId]
        };

        const recipients = isGroup
          ? participants.filter((id) => id !== userId)
          : (targetUserId && targetUserId !== userId ? [targetUserId] : []);

        recipients.forEach((recipientId) => {
          call.invitedUsers.add(recipientId);

          const isRecipientOnline = onlineUsers.has(recipientId) && onlineUsers.get(recipientId).size > 0;

          if (isRecipientOnline) {
            io.to(`user:${recipientId}`).emit(
              'call:incoming',
              incomingPayload
            );
          }

          notifyCallPush(recipientId, {
            callId,
            conversationId: conversationId.toString(),
            callType: call.callType,
            callerName: isGroup
              ? `${caller.nickname || caller.username} (Group Call)`
              : caller.nickname || caller.username,
            callerAvatar: caller.avatar,
            callerId: userId,
            isGroup
          });
        });
      } catch (error) {
        console.error('[Call Initiate]', error);
        socket.emit('call:error', {
          message: 'Could not start the call.'
        });
      }
    });

    // --------------------------------------------------
    // QUERY ACTIVE CALL
    // --------------------------------------------------

    socket.on('call:query', (payload = {}, callback) => {
      if (typeof callback !== 'function') return;

      const call = activeCalls.get(payload.callId);

      if (
        !call ||
        call.logged ||
        !isCallParticipant(call, userId)
      ) {
        callback(null);
        return;
      }

      callback({
        callId: call.callId,
        conversationId: call.conversationId,
        isGroup: call.isGroup,
        callType: call.callType,
        caller: {
          _id: call.callerId,
          username: call.callerUsername || 'User',
          nickname: call.callerNickname || 'User',
          avatar: call.callerAvatar || ''
        }
      });
    });

    // --------------------------------------------------
    // ACCEPT CALL
    // --------------------------------------------------

    socket.on('call:accept', (payload = {}) => {
      const { callId } = payload;
      const call = activeCalls.get(callId);

      if (
        !call ||
        call.logged ||
        !call.invitedUsers.has(userId)
      ) {
        socket.emit('call:error', {
          message: 'You are not invited to this call.'
        });
        return;
      }

      call.acceptedUsers.add(userId);
      call.answered = true;

      if (!call.connectedAt) {
        call.connectedAt = new Date();
      }

      io.to(`user:${call.callerId}`).emit('call:accepted', {
        callId,
        acceptor: getPublicUser(socket.user)
      });
    });

    // --------------------------------------------------
    // JOIN CALL
    // --------------------------------------------------

    socket.on('call:join', (payload = {}) => {
      const { callId } = payload;
      const call = activeCalls.get(callId);

      if (
        !call ||
        call.logged ||
        !call.invitedUsers.has(userId) ||
        !call.acceptedUsers.has(userId)
      ) {
        socket.emit('call:error', {
          message: 'You are not authorized to join this call.'
        });
        return;
      }

      if (!call.isGroup && isUserBusy(userId) && !userCallMap.get(userId)?.has(callId)) {
        socket.emit('call:busy', {
          message: 'You are already in another call.'
        });
        return;
      }

      socket.join(`call:${callId}`);

      if (!socketCallMap.has(socket.id)) {
        socketCallMap.set(socket.id, new Set());
      }

      socketCallMap.get(socket.id).add(callId);

      addUserCall(userId, callId);

      call.answered = true;

      if (!call.connectedAt) {
        call.connectedAt = new Date();
      }

      const existingPeers = [];

      call.participants.forEach((participant, participantSocketId) => {
        if (participantSocketId !== socket.id) {
          existingPeers.push(participant);
        }
      });

      const participantInfo = {
        socketId: socket.id,
        userId,
        user: getPublicUser(socket.user)
      };

      call.participants.set(socket.id, participantInfo);

      socket.emit('call:existing-participants', {
        participants: existingPeers,
        callType: call.callType
      });

      socket.to(`call:${callId}`).emit('call:user-joined', {
        participant: participantInfo
      });
    });

    // --------------------------------------------------
    // WEBRTC SIGNALING
    // --------------------------------------------------

    socket.on('call:signal', (payload = {}) => {
      const { callId, toSocketId, signal } = payload;

      const call = activeCalls.get(callId);

      if (
        !call ||
        !call.participants.has(socket.id) ||
        !call.participants.has(toSocketId) ||
        !signal ||
        typeof signal !== 'object'
      ) {
        return;
      }

      io.to(toSocketId).emit('call:signal', {
        fromSocketId: socket.id,
        fromUser: getPublicUser(socket.user),
        signal,
        callId
      });
    });

    // --------------------------------------------------
    // CALL MEDIA STATE
    // --------------------------------------------------

    socket.on('call:toggle-media', (payload = {}) => {
      const {
        callId,
        isVideoOff,
        isMuted,
        isScreenSharing,
        callType
      } = payload;

      const call = activeCalls.get(callId);

      if (!call || !call.participants.has(socket.id)) return;

      if (callType && (callType === 'video' || callType === 'audio')) {
        call.callType = callType;
      }

      socket.to(`call:${callId}`).emit(
        'call:peer-media-toggled',
        {
          socketId: socket.id,
          userId,
          isVideoOff: Boolean(isVideoOff),
          isMuted: Boolean(isMuted),
          isScreenSharing: Boolean(isScreenSharing),
          callType: call.callType
        }
      );
    });

    socket.on('call:reaction', (payload = {}) => {
      const { callId, emoji } = payload;

      const call = activeCalls.get(callId);

      if (
        !call ||
        !call.participants.has(socket.id) ||
        typeof emoji !== 'string' ||
        emoji.length > 16
      ) {
        return;
      }

      io.to(`call:${callId}`).emit('call:reaction-received', {
        socketId: socket.id,
        emoji,
        senderName: socket.user.nickname || socket.user.username,
        id: `${Date.now()}-${Math.random()}`
      });
    });

    socket.on('call:hand-toggle', (payload = {}) => {
      const { callId, isHandRaised } = payload;

      const call = activeCalls.get(callId);

      if (
        !call ||
        !call.participants.has(socket.id)
      ) {
        return;
      }

      io.to(`call:${callId}`).emit('call:hand-toggled', {
        socketId: socket.id,
        userId,
        userName: socket.user.nickname || socket.user.username,
        isHandRaised: Boolean(isHandRaised),
        raisedAt: Date.now()
      });
    });

    // --------------------------------------------------
    // INVITE USER TO GROUP CALL
    // --------------------------------------------------

    socket.on('call:invite-user', async (payload = {}) => {
      try {
        const {
          callId,
          conversationId,
          targetUserId
        } = payload;

        const call = activeCalls.get(callId);

        if (
          !call ||
          !call.isGroup ||
          !call.participants.has(socket.id) ||
          call.conversationId !== conversationId?.toString() ||
          !isValidId(targetUserId)
        ) {
          return;
        }

        const conversation = await getConversationForUser(
          conversationId,
          userId
        );

        if (
          !conversation ||
          conversation.type !== 'group' ||
          !conversation.participants.some(
            (participant) => participant.toString() === targetUserId.toString()
          )
        ) {
          socket.emit('call:error', {
            message: 'The invited user is not a member of this group.'
          });
          return;
        }

        if (call.invitedUsers.has(targetUserId.toString())) {
          return;
        }

        const target = await User.findOne({
          _id: targetUserId,
          isBanned: false,
          isDeactivated: false,
          isEmailVerified: true,
          deletionStatus: 'active'
        }).select('_id');

        if (!target) return;

        call.invitedUsers.add(targetUserId.toString());

        const caller = getPublicUser(socket.user);

        io.to(`user:${targetUserId}`).emit('call:incoming', {
          callId,
          conversationId: conversationId.toString(),
          isGroup: true,
          callType: call.callType,
          caller,
          isInvitation: true
        });

        await notifyCallPush(targetUserId.toString(), {
          callId,
          conversationId: conversationId.toString(),
          callType: call.callType,
          callerName: caller.nickname || caller.username,
          callerAvatar: caller.avatar,
          callerId: userId,
          isGroup: true
        });
      } catch (error) {
        console.error('[Call Invite]', error);
      }
    });

    // --------------------------------------------------
    // REJECT CALL
    // --------------------------------------------------

    socket.on('call:reject', async (payload = {}) => {
      try {
        const { callId, reason } = payload;
        const call = activeCalls.get(callId);

        if (
          !call ||
          !call.invitedUsers.has(userId)
        ) {
          return;
        }

        const rejectReason = reason === 'busy' ? 'busy' : 'rejected';

        call.invitedUsers.delete(userId);
        call.acceptedUsers.delete(userId);

        io.to(`user:${call.callerId}`).emit(
          rejectReason === 'busy' ? 'call:busy' : 'call:rejected',
          rejectReason === 'busy'
            ? {
              callId,
              targetUserId: userId,
              message: `${socket.user.nickname || socket.user.username} is currently busy.`
            }
            : {
              callId,
              byUser: getPublicUser(socket.user)
            }
        );

        io.to(call.conversationId).emit('call:participant-rejected', {
          callId,
          userId,
          reason: rejectReason
        });

        if (!call.isGroup && userId === call.targetUserId) {
          call.logged = true;

          await logCallMessage(
            call.conversationId,
            call.callerId,
            {
              callId,
              callType: call.callType,
              status: rejectReason,
              duration: 0
            }
          );

          activeCalls.delete(callId);
          removeUserCall(call.callerId, callId);
          removeUserCall(userId, callId);

          // Notify the caller and target to close their call UI.
          io.to(`user:${call.callerId}`).emit('call:ended', { callId });
          io.to(`user:${userId}`).emit('call:ended', { callId });
        }
      } catch (error) {
        console.error('[Call Reject]', error);
      }
    });

    // --------------------------------------------------
    // CALL CLEANUP
    // --------------------------------------------------

    const handleLeaveCall = async (callId, socketId) => {
      const call = activeCalls.get(callId);

      if (!call) {
        socket.leave(`call:${callId}`);

        socketCallMap.get(socketId)?.delete(callId);

        return;
      }

      const participant = call.participants.get(socketId);

      if (!participant) {
        socket.leave(`call:${callId}`);
        socketCallMap.get(socketId)?.delete(callId);
        return;
      }

      call.participants.delete(socketId);

      const participantUserId = participant.userId;

      const sameUserStillConnected = Array.from(
        call.participants.values()
      ).some((item) => item.userId === participantUserId);

      if (!sameUserStillConnected) {
        removeUserCall(participantUserId, callId);
      }

      socket.to(`call:${callId}`).emit('call:user-left', {
        socketId,
        userId: participantUserId
      });

      socket.leave(`call:${callId}`);

      socketCallMap.get(socketId)?.delete(callId);

      if (socketCallMap.get(socketId)?.size === 0) {
        socketCallMap.delete(socketId);
      }

      if (!call.isGroup) {
        // 1-on-1 Call: when any participant leaves, the entire call ends immediately for both!
        io.to(`call:${callId}`).emit('call:ended', { callId, reason: 'participant_left' });
        if (call.callerId) io.to(`user:${call.callerId}`).emit('call:ended', { callId, reason: 'participant_left' });
        if (call.targetUserId) io.to(`user:${call.targetUserId}`).emit('call:ended', { callId, reason: 'participant_left' });
      } else {
        // Group Call:
        // Check remaining unique participants in call
        const remainingUserIds = new Set(Array.from(call.participants.values()).map((p) => p.userId));
        // If 1 or 0 participants remain in the group call, end the call completely!
        if (remainingUserIds.size <= 1) {
          io.to(`call:${callId}`).emit('call:ended', { callId, reason: 'insufficient_participants' });
          call.participants.forEach((p) => {
            io.to(`user:${p.userId}`).emit('call:ended', { callId, reason: 'insufficient_participants' });
          });
        } else {
          // 2 or more participants are still active in the group call - keep it alive!
          return;
        }
      }

      activeCalls.delete(callId);

      // Notify invitees when a caller cancels before the call is answered.
      if (!call.answered) {
        if (call.isGroup) {
          io.to(call.conversationId).emit('call:cancelled', {
            callId
          });
        } else if (call.targetUserId) {
          io.to(`user:${call.targetUserId}`).emit(
            'call:cancelled',
            { callId }
          );
        }
      }

      if (!call.logged && call.conversationId) {
        call.logged = true;

        if (call.answered && call.connectedAt) {
          const duration = Math.max(
            1,
            Math.round(
              (Date.now() - call.connectedAt.getTime()) / 1000
            )
          );

          await logCallMessage(
            call.conversationId,
            call.callerId,
            {
              callId,
              callType: call.callType,
              status: 'completed',
              duration
            }
          );
        } else {
          await logCallMessage(
            call.conversationId,
            call.callerId,
            {
              callId,
              callType: call.callType,
              status: 'missed',
              duration: 0
            }
          );
        }
      }

      // Remove stale user-call references.
      removeUserCall(call.callerId, callId);

      if (call.targetUserId) {
        removeUserCall(call.targetUserId, callId);
      }

      call.invitedUsers.forEach((id) => {
        removeUserCall(id, callId);
      });
    };

    socket.on('call:leave', async (payload = {}) => {
      const { callId } = payload;

      if (typeof callId !== 'string') return;

      try {
        await handleLeaveCall(callId, socket.id);
      } catch (error) {
        console.error('[Call Leave]', error);
      }
    });

    // --------------------------------------------------
    // DISCONNECT
    // --------------------------------------------------

    socket.on('disconnect', async () => {
      try {
        const callIds = Array.from(
          socketCallMap.get(socket.id) || []
        );

        for (const callId of callIds) {
          await handleLeaveCall(callId, socket.id);
        }

        socketCallMap.delete(socket.id);

        const userSockets = onlineUsers.get(userId);

        if (userSockets) {
          userSockets.delete(socket.id);

          // Do not mark offline while another device/tab is connected.
          if (userSockets.size === 0) {
            onlineUsers.delete(userId);

            const now = new Date();

            await User.findByIdAndUpdate(userId, {
              status: 'offline',
              lastSeen: now
            });

            await broadcastPresence(userId, 'offline', now);
          }
        }
      } catch (error) {
        console.error('[Socket Disconnect]', error);
      }
    });
  });
};

// --------------------------------------------------
// EXTERNAL CALL HELPERS
// --------------------------------------------------

setupSockets.getActiveCall = (callId) => {
  return activeCalls.get(callId) || null;
};

// Use this in REST controllers before exposing call information.
setupSockets.isCallParticipant = (callId, userId) => {
  const call = activeCalls.get(callId);

  return isCallParticipant(call, getId(userId));
};

setupSockets.declineCall = async (
  callId,
  declinerUser = null,
  reason = 'declined'
) => {
  const call = activeCalls.get(callId);

  if (!call) return false;

  const declinerId = getId(declinerUser);

  // Never allow a REST caller to reject someone else's call.
  if (!declinerId || !call.invitedUsers.has(declinerId)) {
    return false;
  }

  const rejectReason = reason === 'busy' ? 'busy' : 'rejected';

  call.invitedUsers.delete(declinerId);
  call.acceptedUsers.delete(declinerId);

  const byUser = {
    _id: declinerId,
    username: declinerUser.username || 'Recipient',
    nickname: declinerUser.nickname || declinerUser.username || 'Recipient'
  };

  if (ioInstance) {
    ioInstance.to(`user:${call.callerId}`).emit(
      rejectReason === 'busy' ? 'call:busy' : 'call:rejected',
      rejectReason === 'busy'
        ? {
          callId,
          targetUserId: declinerId,
          message: `${byUser.nickname} is currently busy.`
        }
        : {
          callId,
          byUser
        }
    );

    ioInstance.to(call.conversationId).emit(
      'call:participant-rejected',
      {
        callId,
        userId: declinerId,
        reason: rejectReason
      }
    );
  }

  if (!call.isGroup && declinerId === call.targetUserId) {
    call.logged = true;

    await logExternalCallMessage(call, rejectReason);

    activeCalls.delete(callId);

    removeUserCall(call.callerId, callId);
    removeUserCall(declinerId, callId);

    if (ioInstance) {
      ioInstance.to(`user:${call.callerId}`).emit('call:ended', {
        callId
      });

      ioInstance.to(`user:${declinerId}`).emit('call:ended', {
        callId
      });
    }
  }

  return true;
};

const logExternalCallMessage = async (call, status) => {
  try {
    if (!ioInstance) return;

    const conversation = await Conversation.findOne({
      _id: call.conversationId,
      participants: call.callerId
    });

    if (!conversation) return;

    const typeLabel =
      call.callType === 'video' ? 'Video Call' : 'Voice Call';

    const content =
      status === 'busy'
        ? `Missed ${typeLabel} (User Busy)`
        : `${typeLabel} Declined`;

    const message = await Message.create({
      conversation: call.conversationId,
      sender: call.callerId,
      content,
      messageType: 'call',
      callMetadata: {
        callId: call.callId,
        callType: call.callType,
        status,
        duration: 0
      }
    });

    const populated = await Message.findById(message._id)
      .populate('sender', 'username nickname avatar');

    const updatedConversation = await Conversation.findByIdAndUpdate(
      call.conversationId,
      {
        lastMessage: message._id,
        lastMessageAt: new Date()
      },
      { new: true }
    );

    if (!updatedConversation) return;

    ioInstance.to(call.conversationId).emit(
      'message:received',
      populated
    );

    ioInstance.to(call.conversationId).emit(
      'message:new',
      populated
    );

    updatedConversation.participants.forEach((participantId) => {
      ioInstance.to(`user:${participantId}`).emit(
        'conversation:updated',
        {
          conversationId: call.conversationId,
          lastMessage: populated
        }
      );
    });
  } catch (error) {
    console.error('[Call Log]', error);
  }
};

setupSockets.answerCall = async (
  callId,
  acceptorUser = null
) => {
  const call = activeCalls.get(callId);

  if (!call || call.logged) return false;

  const acceptorId = getId(acceptorUser);

  // Only a user who was invited may accept.
  if (
    !acceptorId ||
    !call.invitedUsers.has(acceptorId)
  ) {
    return false;
  }

  call.acceptedUsers.add(acceptorId);
  call.answered = true;

  if (!call.connectedAt) {
    call.connectedAt = new Date();
  }

  if (ioInstance) {
    ioInstance.to(`user:${call.callerId}`).emit('call:accepted', {
      callId,
      acceptor: {
        _id: acceptorId,
        username: acceptorUser.username || 'User',
        nickname: acceptorUser.nickname || acceptorUser.username || 'User',
        avatar: acceptorUser.avatar || ''
      }
    });
  }

  return true;
};

setupSockets.getOnlineUsers = () => {
  return onlineUsers;
};

module.exports = setupSockets;
