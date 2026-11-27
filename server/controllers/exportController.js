const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// @desc Export conversation messages in TXT, JSON, or HTML
// @route GET /api/export/chat/:id
const exportChat = async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'json' } = req.query; // 'json' | 'txt' | 'html'
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: id,
      participants: currentUserId
    }).populate('participants', 'username nickname email');

    if (!conversation) {
      return res.status(403).json({ success: false, message: 'Unauthorized or conversation not found.' });
    }

    const messages = await Message.find({
      conversation: id,
      deletedFor: { $ne: currentUserId }
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'username nickname')
      .lean();

    const title =
      conversation.type === 'group'
        ? conversation.groupDetails.name
        : conversation.participants
            .filter((p) => p._id.toString() !== currentUserId.toString())
            .map((p) => p.nickname || p.username)
            .join(', ') || 'Private Chat';

    const safeFilename = `PulseChat_${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}`;

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.json"`);

      const exportData = {
        title,
        type: conversation.type,
        exportedAt: new Date().toISOString(),
        exportedBy: req.user.username,
        participants: conversation.participants.map((p) => ({
          id: p._id,
          username: p.username,
          nickname: p.nickname
        })),
        messages: messages.map((m) => ({
          id: m._id,
          sender: m.sender ? (m.sender.nickname || m.sender.username) : 'System',
          timestamp: m.createdAt,
          content: m.isDeletedForEveryone ? '[This message was deleted]' : m.content,
          messageType: m.messageType,
          attachment: m.fileUrl ? { name: m.fileName, url: m.fileUrl, size: m.fileSize } : null,
          isEncrypted: m.isEncrypted
        }))
      };

      return res.send(JSON.stringify(exportData, null, 2));
    }

    if (format === 'txt') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.txt"`);

      let textOutput = `=== PulseChat Transcript: ${title} ===\n`;
      textOutput += `Exported: ${new Date().toLocaleString()}\n`;
      textOutput += `Participants: ${conversation.participants.map((p) => p.nickname || p.username).join(', ')}\n\n`;

      messages.forEach((m) => {
        const timeStr = new Date(m.createdAt).toLocaleString();
        const senderStr = m.sender ? (m.sender.nickname || m.sender.username) : 'System';
        const contentStr = m.isDeletedForEveryone ? '[This message was deleted]' : m.content;
        const attachmentStr = m.fileUrl ? ` [Attachment: ${m.fileName || m.fileUrl}]` : '';
        textOutput += `[${timeStr}] ${senderStr}: ${contentStr}${attachmentStr}\n`;
      });

      return res.send(textOutput);
    }

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.html"`);

      const escapeHtml = (str = '') =>
        String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');

      let htmlRows = messages
        .map((m) => {
          const timeStr = escapeHtml(new Date(m.createdAt).toLocaleString());
          const senderStr = escapeHtml(m.sender ? (m.sender.nickname || m.sender.username) : 'System');
          const isMe = m.sender && m.sender._id.toString() === currentUserId.toString();
          const contentStr = m.isDeletedForEveryone
            ? '<em>[This message was deleted]</em>'
            : escapeHtml(m.content || '').replace(/\n/g, '<br/>');
          const attachmentStr = m.fileUrl
            ? `<div class="attachment">Attachment: <a href="${escapeHtml(m.fileUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(m.fileName || 'Download Media')}</a></div>`
            : '';

          return `
            <div class="msg ${isMe ? 'msg-me' : 'msg-other'}">
              <div class="msg-meta">
                <span class="sender">${senderStr}</span>
                <span class="time">${timeStr}</span>
              </div>
              <div class="bubble">${contentStr}${attachmentStr}</div>
            </div>
          `;
        })
        .join('');

      const safeTitle = escapeHtml(title);
      const safeUser = escapeHtml(req.user.username);

      const fullHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>${safeTitle} - PulseChat Transcript</title>
          <style>
            @page { size: A4; margin: 18mm 14mm; }
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
            .container { max-width: 780px; margin: 0 auto; background: #1e293b; border-radius: 14px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
            header { border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 20px; }
            h1 { margin: 0 0 6px; font-size: 20px; color: #818cf8; overflow-wrap: anywhere; }
            .meta { font-size: 12px; color: #94a3b8; }
            .msg { margin-bottom: 14px; display: flex; flex-direction: column; break-inside: avoid; page-break-inside: avoid; }
            .msg-me { align-items: flex-end; }
            .msg-other { align-items: flex-start; }
            .msg-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
            .sender { font-size: 12px; font-weight: 600; color: #a5b4fc; }
            .time { font-size: 11px; color: #64748b; }
            .bubble { max-width: 78%; padding: 10px 14px; border-radius: 16px; font-size: 13.5px; line-height: 1.5; overflow-wrap: anywhere; word-break: break-word; }
            .msg-me .bubble { background: #4f46e5; color: #fff; border-bottom-right-radius: 4px; }
            .msg-other .bubble { background: #334155; color: #f8fafc; border-bottom-left-radius: 4px; }
            .attachment { margin-top: 6px; font-size: 12px; }
            .attachment a { color: #38bdf8; text-decoration: underline; overflow-wrap: anywhere; }
            @media print {
              body { background: #ffffff; color: #0f172a; padding: 0; }
              .container { max-width: 100%; background: #ffffff; box-shadow: none; padding: 0; border-radius: 0; }
              header { border-bottom-color: #e2e8f0; }
              h1 { color: #4338ca; }
              .meta, .time { color: #475569; }
              .sender { color: #334155; }
              .msg-me .bubble { background: #eef2ff; color: #1e1b4b; border: 1px solid #c7d2fe; }
              .msg-other .bubble { background: #f8fafc; color: #0f172a; border: 1px solid #e2e8f0; }
              .attachment a { color: #2563eb; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <header>
              <h1>${safeTitle}</h1>
              <div class="meta">Exported on ${escapeHtml(new Date().toLocaleString())} by @${safeUser} • ${messages.length} messages</div>
            </header>
            <div class="chat-thread">
              ${htmlRows}
            </div>
          </div>
        </body>
        </html>
      `;

      return res.send(fullHtml);
    }

    return res.status(400).json({ success: false, message: 'Invalid format. Choose json, txt, or html.' });
  } catch (error) {
    console.error('[Export Chat Error]', error);
    return res.status(500).json({ success: false, message: 'Error exporting chat.' });
  }
};

// @desc Export personal user data (GDPR / Data Portability)
// @route GET /api/export/personal-data
const exportPersonalData = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const conversations = await Conversation.find({
      participants: req.user._id,
      deletedFor: { $ne: req.user._id }
    }).select('type groupDetails createdAt updatedAt');

    const personalData = {
      profile: user.toJSON(),
      privacySettings: user.privacySettings,
      chatSettings: user.chatSettings,
      joinedConversationsCount: conversations.length,
      joinedConversations: conversations.map((c) => ({
        id: c._id,
        type: c.type,
        groupName: c.groupDetails?.name || null,
        joinedAt: c.createdAt
      })),
      exportedAt: new Date().toISOString()
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="PulseChat_UserData_${user.username}_${Date.now()}.json"`);
    return res.send(JSON.stringify(personalData, null, 2));
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error exporting personal data.' });
  }
};

module.exports = {
  exportChat,
  exportPersonalData
};
