const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    isAdminStory: {
      type: Boolean,
      default: false,
      index: true
    },
    officialAuthorName: {
      type: String,
      default: 'PulseChat',
      trim: true
    },
    officialAuthorAvatar: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      enum: ['text', 'media'],
      default: 'text'
    },
    text: {
      type: String,
      maxlength: [10000, 'Status text cannot exceed 10000 characters'],
      default: ''
    },
    mediaUrl: {
      type: String,
      default: ''
    },
    style: {
      background: {
        type: String,
        default: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
      },
      font: {
        type: String,
        default: 'sans'
      },
      textColor: {
        type: String,
        default: '#ffffff'
      },
      textGradient: {
        type: String,
        default: ''
      },
      bold: {
        type: Boolean,
        default: false
      },
      italic: {
        type: Boolean,
        default: false
      }
    },
    privacy: {
      audience: {
        type: String,
        enum: ['everyone', 'contacts', 'custom', 'only_share_with'],
        default: 'everyone'
      },
      allowedUsers: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      ],
      excludedUsers: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      ]
    },
    viewers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        viewedAt: {
          type: Date,
          default: Date.now
        },
        completed: {
          type: Boolean,
          default: false
        }
      }
    ],
    completedViewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
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
    replies: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        message: {
          type: String,
          required: true,
          trim: true,
          maxlength: [1000, 'Reply cannot exceed 1000 characters']
        },
        conversationId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Conversation'
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
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    hasPoll: {
      type: Boolean,
      default: false
    },
    poll: {
      question: {
        type: String,
        default: ''
      },
      options: [
        {
          text: {
            type: String,
            required: true
          },
          votes: [
            {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'User'
            }
          ]
        }
      ],
      isClosed: {
        type: Boolean,
        default: false
      }
    },
    lifeMode: {
      type: String,
      enum: ['24h', 'custom', 'forever'],
      default: '24h'
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: { expireAfterSeconds: 0 }
    }
  },
  {
    timestamps: true
  }
);

statusSchema.index({ createdAt: -1 });

const Status = mongoose.model('Status', statusSchema);
module.exports = Status;
