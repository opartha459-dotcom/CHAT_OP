const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['text', 'media'],
      default: 'text'
    },
    text: {
      type: String,
      maxlength: [700, 'Status text cannot exceed 700 characters'],
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
      }
    },
    privacy: {
      audience: {
        type: String,
        enum: ['everyone', 'contacts', 'custom'],
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
        }
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
