const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const mongoose = require('mongoose');

// We can test against running server or by spinning up the app
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pulsechat_test';
process.env.PORT = '5001';

const { app, server } = require('../server');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Block = require('../models/Block');
const Report = require('../models/Report');

const makeRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
};

test('Full-Stack Chat API Suite', async (t) => {
  let user1Token = '';
  let user1Id = '';
  let user2Token = '';
  let user2Id = '';
  let adminToken = '';
  let conversationId = '';
  let groupId = '';
  let messageId = '';

  const timestamp = Date.now();
  const user1Data = {
    username: `alice_${timestamp}`,
    email: `alice_${timestamp}@test.com`,
    password: 'password123',
    nickname: 'Alice Wonderland'
  };

  const user2Data = {
    username: `bob_${timestamp}`,
    email: `bob_${timestamp}@test.com`,
    password: 'password123',
    nickname: 'Bob Builder'
  };

  const adminData = {
    username: `admin_${timestamp}`,
    email: `admin_${timestamp}@pulsechat.io`,
    password: 'adminpassword123',
    nickname: 'Super Admin'
  };

  await t.test('1. User Registration & Authentication', async () => {
    // Register User 1
    const res1 = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      user1Data
    );

    assert.strictEqual(res1.status, 201);
    assert.strictEqual(res1.body.success, true);
    assert.ok(res1.body.token);
    user1Token = res1.body.token;
    user1Id = res1.body.user._id;

    // Register User 2
    const res2 = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      user2Data
    );

    assert.strictEqual(res2.status, 201);
    user2Token = res2.body.token;
    user2Id = res2.body.user._id;

    // Register Admin
    const resAdmin = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      adminData
    );

    assert.strictEqual(resAdmin.status, 201);
    adminToken = resAdmin.body.token;
    assert.strictEqual(resAdmin.body.user.role, 'admin');
  });

  await t.test('2. User Login & Profile verification', async () => {
    const loginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { identifier: user1Data.email, password: user1Data.password }
    );

    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginRes.body.success, true);

    // Profile check
    const meRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${user1Token}` }
    });

    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.user.username, user1Data.username);
  });

  await t.test('3. Private 1-on-1 Chat Creation & Messaging', async () => {
    const chatRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/chats/private',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`
        }
      },
      { recipientId: user2Id }
    );

    assert.strictEqual(chatRes.status, 200);
    assert.ok(chatRes.body.conversation._id);
    conversationId = chatRes.body.conversation._id;

    // Send Message
    const msgRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: `/api/messages/${conversationId}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`
        }
      },
      { content: 'Hello Bob! This is an encrypted real-time message.' }
    );

    assert.strictEqual(msgRes.status, 201);
    assert.strictEqual(msgRes.body.message.content, 'Hello Bob! This is an encrypted real-time message.');
    messageId = msgRes.body.message._id;

    // Fetch Messages
    const getMsgRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: `/api/messages/${conversationId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${user2Token}` }
    });

    assert.strictEqual(getMsgRes.status, 200);
    assert.ok(getMsgRes.body.messages.length > 0);
  });

  await t.test('4. Group Creation, Settings, & Membership', async () => {
    const groupRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/groups',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`
        }
      },
      {
        name: 'Project Alpha Team',
        description: 'Coordination channel for Alpha launch',
        participantIds: [user2Id]
      }
    );

    assert.strictEqual(groupRes.status, 201);
    assert.strictEqual(groupRes.body.group.groupDetails.name, 'Project Alpha Team');
    groupId = groupRes.body.group._id;

    // Send Group Message
    const grpMsgRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: `/api/messages/${groupId}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user2Token}`
        }
      },
      { content: 'Glad to join the group!' }
    );

    assert.strictEqual(grpMsgRes.status, 201);
  });

  await t.test('5. Message Reactions, Editing, and Deletion', async () => {
    // React with emoji
    const reactRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: `/api/messages/${messageId}/react`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user2Token}`
        }
      },
      { emoji: '🚀' }
    );

    assert.strictEqual(reactRes.status, 200);
    assert.strictEqual(reactRes.body.reactions[0].emoji, '🚀');

    // Edit message
    const editRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: `/api/messages/${messageId}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`
        }
      },
      { content: 'Edited message with improved clarity.' }
    );

    assert.strictEqual(editRes.status, 200);
    assert.strictEqual(editRes.body.message.isEdited, true);
  });

  await t.test('6. Blocking & Privacy Enforcement', async () => {
    // User 1 blocks User 2
    const blockRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: `/api/users/block/${user2Id}`,
        method: 'POST',
        headers: { Authorization: `Bearer ${user1Token}` }
      }
    );

    assert.strictEqual(blockRes.status, 200);

    // User 2 tries to send message in private chat -> Must be forbidden (403)
    const blockedMsgRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: `/api/messages/${conversationId}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user2Token}`
        }
      },
      { content: 'Can you hear me?' }
    );

    assert.strictEqual(blockedMsgRes.status, 403);

    // Privacy Discovery: Empty search or query < 2 chars must return empty list (never expose users)
    const emptySearchRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/users/search?query=',
      method: 'GET',
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert.strictEqual(emptySearchRes.status, 200);
    assert.strictEqual(emptySearchRes.body.users.length, 0);

    const singleCharSearchRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/users/search?query=b',
      method: 'GET',
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert.strictEqual(singleCharSearchRes.status, 200);
    assert.strictEqual(singleCharSearchRes.body.users.length, 0);

    // Unblock for subsequent tests
    const unblockRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: `/api/users/unblock/${user2Id}`,
        method: 'POST',
        headers: { Authorization: `Bearer ${user1Token}` }
      }
    );

    assert.strictEqual(unblockRes.status, 200);

    // Valid search query (>= 2 chars) should discover unblocked user
    const validSearchRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: `/api/users/search?query=bob_${timestamp}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert.strictEqual(validSearchRes.status, 200);
    assert.ok(validSearchRes.body.users.some((u) => u.username === user2Data.username));
  });

  await t.test('7. Reporting & Moderation Admin Dashboard', async () => {
    // User 1 reports User 2
    const reportRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/reports',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`
        }
      },
      {
        reportedUserId: user2Id,
        category: 'spam',
        reason: 'Sending repetitive testing messages.'
      }
    );

    assert.strictEqual(reportRes.status, 201);

    // Admin checks stats
    const statsRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/admin/stats',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(statsRes.status, 200);
    assert.ok(statsRes.body.stats.totalUsers >= 3);
    assert.ok(statsRes.body.stats.pendingReports >= 1);

    // Admin resolves report
    const reportsListRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/admin/reports',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(reportsListRes.status, 200);
    const reportItem = reportsListRes.body.reports[0];

    const resolveRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: `/api/admin/reports/${reportItem._id}/resolve`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        }
      },
      { status: 'resolved', actionTaken: 'Warned user via moderation guidelines.' }
    );

    assert.strictEqual(resolveRes.status, 200);

    // Admin lists all system chats
    const adminChatsRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/admin/chats',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminChatsRes.status, 200);
    assert.ok(Array.isArray(adminChatsRes.body.conversations));

    // Admin views messages in conversation
    if (adminChatsRes.body.conversations.length > 0) {
      const convIdToInspect = adminChatsRes.body.conversations[0]._id;
      const adminMessagesRes = await makeRequest({
        hostname: 'localhost',
        port: 5001,
        path: `/api/admin/chats/${convIdToInspect}/messages`,
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(adminMessagesRes.status, 200);
      assert.ok(Array.isArray(adminMessagesRes.body.messages));

      // Admin can also view messages directly through /api/messages/:id (platform moderation oversight)
      const directMessagesRes = await makeRequest({
        hostname: 'localhost',
        port: 5001,
        path: `/api/messages/${convIdToInspect}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(directMessagesRes.status, 200);
      assert.ok(Array.isArray(directMessagesRes.body.messages));
    }

    // Admin deletes a disposable test user
    const tempDelUser = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        username: `del_${Date.now()}`,
        email: `del_${Date.now()}@pulsechat.io`,
        password: 'password123',
        nickname: 'Delete Me'
      }
    );
    assert.strictEqual(tempDelUser.status, 201);
    const delUserId = tempDelUser.body.user._id;

    const delUserRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: `/api/admin/users/${delUserId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(delUserRes.status, 200);
    assert.strictEqual(delUserRes.body.success, true);
  });

  await t.test('8. Chat History Export & GDPR Data Export', async () => {
    // JSON export
    const exportRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: `/api/export/chat/${conversationId}?format=json`,
      method: 'GET',
      headers: { Authorization: `Bearer ${user1Token}` }
    });

    assert.strictEqual(exportRes.status, 200);
    assert.ok(exportRes.body.messages.length > 0);

    // GDPR personal data export
    const gdprRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/export/personal-data',
      method: 'GET',
      headers: { Authorization: `Bearer ${user1Token}` }
    });

    assert.strictEqual(gdprRes.status, 200);
    assert.strictEqual(gdprRes.body.profile.username, user1Data.username);
  });

  await t.test('9. New Features: Pinning, Polls, Statuses & Retention', async () => {
    // 9.1 Pin message
    const pinRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: `/api/messages/${messageId}/pin`,
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert.strictEqual(pinRes.status, 200);
    assert.ok(pinRes.body.pinnedMessages.length >= 1);

    // 9.2 Get pinned messages
    const getPinsRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: `/api/messages/pins/${conversationId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert.strictEqual(getPinsRes.status, 200);
    assert.ok(getPinsRes.body.pinnedMessages.length >= 1);

    // 9.3 Create Poll
    const pollRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: `/api/messages/${conversationId}/poll`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`
        }
      },
      {
        question: 'What is your favorite framework?',
        options: ['React', 'Vue', 'Svelte'],
        allowsMultiple: false
      }
    );
    assert.strictEqual(pollRes.status, 201);
    assert.strictEqual(pollRes.body.message.messageType, 'poll');
    const pollMessageId = pollRes.body.message._id;

    // 9.4 Vote on Poll
    const voteRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: `/api/messages/${pollMessageId}/poll/vote`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user2Token}`
        }
      },
      { optionIndex: 0 }
    );
    assert.strictEqual(voteRes.status, 200);
    assert.strictEqual(voteRes.body.message.poll.options[0].votes.length, 1);

    // 9.5 Publish 24-hour Status
    const statusRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/status',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`
        }
      },
      {
        type: 'text',
        text: 'Hello from PulseChat 24h status update!',
        style: { background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', font: 'sans' }
      }
    );
    assert.strictEqual(statusRes.status, 201);
    const createdStatusId = statusRes.body.status._id;

    // 9.6 Get Status Feed
    const feedRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/status/feed',
      method: 'GET',
      headers: { Authorization: `Bearer ${user2Token}` }
    });
    assert.strictEqual(feedRes.status, 200);
    assert.ok(feedRes.body.feed.length > 0);

    // 9.7 Mark Status Viewed
    const viewRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: `/api/status/${createdStatusId}/view`,
      method: 'POST',
      headers: { Authorization: `Bearer ${user2Token}` }
    });
    assert.strictEqual(viewRes.status, 200);

    // 9.8 Multi-DB Category Health
    const dbStatusRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/admin/database/status',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(dbStatusRes.status, 200);
    assert.ok(dbStatusRes.body.database.categories);

    // 9.9 Trigger Manual Retention Purge
    const retentionRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/admin/retention/run',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(retentionRes.status, 200);
    assert.ok(retentionRes.body.report);

    // 9.10 Unpin message
    const unpinRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: `/api/messages/${messageId}/pin`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert.strictEqual(unpinRes.status, 200);

    // 9.11 Create Rich Announcement with Poll and Design Styling
    const createAnnounceRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/announcements/admin',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        }
      },
      {
        title: 'New Feature Feedback',
        content: 'Please vote on which feature we should build next for PulseChat.',
        type: 'feature',
        targetAudience: 'all',
        hasPoll: true,
        poll: {
          question: 'What is your top requested feature?',
          options: ['Voice Rooms', 'Message Bookmarks', 'Custom Themes'],
          allowMultiple: false
        },
        design: {
          theme: 'cyber-glow',
          font: 'mono',
          badge: '🗳️',
          animation: 'shimmer'
        }
      }
    );
    assert.strictEqual(createAnnounceRes.status, 201);
    assert.strictEqual(createAnnounceRes.body.announcement.hasPoll, true);
    assert.strictEqual(createAnnounceRes.body.announcement.design.theme, 'cyber-glow');
    const annId = createAnnounceRes.body.announcement._id;

    // 9.12 Vote on Announcement Poll
    const voteAnnPollRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: `/api/announcements/${annId}/poll/vote`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`
        }
      },
      { optionIndex: 0 }
    );
    assert.strictEqual(voteAnnPollRes.status, 200);
    assert.strictEqual(voteAnnPollRes.body.announcement.totalPollVotes, 1);

    // 9.13 Close Announcement Poll (Admin)
    const closePollRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: `/api/announcements/admin/${annId}/poll/close`,
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(closePollRes.status, 200);
    assert.strictEqual(closePollRes.body.announcement.poll.isClosed, true);
  });

  await t.test('10. Root and Health Check Endpoints (/ and /health)', async () => {
    // Test GET /
    const rootRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/',
      method: 'GET'
    });

    assert.strictEqual(rootRes.status, 200);
    assert.strictEqual(rootRes.body.status, 'online');
    assert.strictEqual(rootRes.body.database, 'connected');
    assert.ok(rootRes.body.uptime);

    // Test GET /health
    const healthRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/health',
      method: 'GET'
    });

    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthRes.body.status, 'healthy');
    assert.strictEqual(healthRes.body.database, 'connected');

    // Test GET /api/health
    const apiHealthRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/health',
      method: 'GET'
    });

    assert.strictEqual(apiHealthRes.status, 200);
    assert.strictEqual(apiHealthRes.body.status, 'healthy');
  });

  // Cleanup server
  server.close();
  await mongoose.connection.close();
});
