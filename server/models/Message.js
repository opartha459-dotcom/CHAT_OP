const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    content: {
      type: String,
      default: ''
    },
    isEncrypted: {
      type: Boolean,
      default: false
    },
    encryptionMetadata: {
      iv: { type: String, default: '' },
      senderKeyId: { type: String, default: '' },
      algorithm: { type: String, default: 'AES-GCM' }
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'file', 'audio', 'system', 'call'],
      default: 'text'
    },
    callMetadata: {
      callId: { type: String, default: '' },
      callType: { type: String, enum: ['audio', 'video'], default: 'audio' },
      status: {
        type: String,
        enum: ['completed', 'missed', 'rejected', 'busy', 'cancelled'],
        default: 'completed'
      },
      duration: { type: Number, default: 0 } // in seconds
    },
    fileUrl: {
      type: String,
      default: ''
    },
    fileName: {
      type: String,
      default: ''
    },
    fileSize: {
      type: Number,
      default: 0
    },
    fileMimeType: {
      type: String,
      default: ''
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    forwardFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        emoji: {
          type: String,
          required: true
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        readAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    deliveredTo: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        deliveredAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: {
      type: Date
    },
    isDeletedForEveryone: {
      type: Boolean,
      default: false
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    timestamps: true
  }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
