const { verifyToken } = require('../utils/token');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const onlineUsers = new Map(); // userId -> Set of socketIds

const setupSockets = (io) => {
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

    // Disconnect handler
    socket.on('disconnect', async () => {
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
