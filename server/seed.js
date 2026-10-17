require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

const seedData = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pulsechat';
    await mongoose.connect(mongoURI);
    console.log('[Seed] Connected to database');

    // Remove existing seed users if any
    await User.deleteMany({
      email: { $in: ['alice@pulsechat.io', 'bob@pulsechat.io', 'admin@pulsechat.io'] }
    });

    // Create Alice
    const alice = await User.create({
      username: 'alice',
      email: 'alice@pulsechat.io',
      nickname: 'Alice Walker',
      password: 'password123',
      role: 'user',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      bio: 'Lead Architect @ PulseChat · Coffee & Cryptography'
    });

    // Create Bob
    const bob = await User.create({
      username: 'bob',
      email: 'bob@pulsechat.io',
      nickname: 'Bob Chen',
      password: 'password123',
      role: 'user',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      bio: 'Security Researcher & UI Engineer'
    });

    // Create Admin
    const admin = await User.create({
      username: 'admin',
      email: 'admin@pulsechat.io',
      nickname: 'Super Admin',
      password: 'adminpassword123',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      bio: 'Platform Safety, Moderation & Security Team'
    });

    console.log('[Seed] Users created: alice, bob, admin');

    // Create 1-on-1 private conversation between Alice and Bob
    const privateChat = await Conversation.create({
      type: 'private',
      participants: [alice._id, bob._id],
      isEncrypted: true,
      unreadCounts: {
        [alice._id.toString()]: 0,
        [bob._id.toString()]: 0
      }
    });

    const m1 = await Message.create({
      conversation: privateChat._id,
      sender: alice._id,
      content: 'Hey Bob! Welcome to PulseChat. All messages are encrypted with AES-256.',
      isEncrypted: false,
      readBy: [{ user: bob._id, readAt: new Date() }],
      deliveredTo: [{ user: bob._id, deliveredAt: new Date() }]
    });

    const m2 = await Message.create({
      conversation: privateChat._id,
      sender: bob._id,
      content: 'Hey Alice! The real-time Socket.IO synchronization feels incredibly fast 🚀',
      isEncrypted: false,
      replyTo: m1._id,
      reactions: [{ user: alice._id, emoji: '🔥', createdAt: new Date() }],
      readBy: [{ user: alice._id, readAt: new Date() }],
      deliveredTo: [{ user: alice._id, deliveredAt: new Date() }]
    });

    privateChat.lastMessage = m2._id;
    await privateChat.save();

    // Create Group conversation
    const groupChat = await Conversation.create({
      type: 'group',
      participants: [alice._id, bob._id, admin._id],
      groupDetails: {
        name: '🚀 Engineering & Launch Team',
        description: 'Official channel for PulseChat v1.0 architecture, releases, and updates.',
        avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=150&q=80',
        owner: alice._id,
        admins: [alice._id, admin._id],
        onlyAdminsCanMessage: false,
        onlyAdminsCanAddMembers: false,
        inviteCode: 'launch2026'
      },
      isEncrypted: true,
      unreadCounts: {
        [alice._id.toString()]: 0,
        [bob._id.toString()]: 0,
        [admin._id.toString()]: 0
      }
    });

    const gm1 = await Message.create({
      conversation: groupChat._id,
      sender: alice._id,
      content: 'Alice created group "🚀 Engineering & Launch Team"',
      messageType: 'system'
    });

    const gm2 = await Message.create({
      conversation: groupChat._id,
      sender: admin._id,
      content: 'Welcome everyone! System moderation and security telemetry are running smoothly.',
      reactions: [
        { user: alice._id, emoji: '👍', createdAt: new Date() },
        { user: bob._id, emoji: '❤️', createdAt: new Date() }
      ]
    });

    groupChat.lastMessage = gm2._id;
    await groupChat.save();

    console.log('[Seed] Conversations created successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]', err);
    process.exit(1);
  }
};

seedData();
