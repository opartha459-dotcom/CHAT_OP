const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['private', 'group'],
      required: true,
      default: 'private'
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],
    groupDetails: {
      name: {
        type: String,
        trim: true,
        maxlength: [60, 'Group name cannot exceed 60 characters']
      },
      description: {
        type: String,
        trim: true,
        maxlength: [300, 'Description cannot exceed 300 characters'],
        default: ''
      },
      avatar: {
        type: String,
        default: ''
      },
      owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      admins: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      ],
      inviteCode: {
        type: String,
        sparse: true
      },
      inviteExpiresAt: {
        type: Date
      },
      onlyAdminsCanMessage: {
        type: Boolean,
        default: false
      },
      onlyAdminsCanAddMembers: {
        type: Boolean,
        default: false
      }
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    isEncrypted: {
      type: Boolean,
      default: true
    },
    pinnedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    archivedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    mutedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        until: {
          type: Date
        }
      }
    ],
    unreadCounts: {
      type: Map,
      of: Number,
      default: {}
    },
    deletedFor: [
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

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);
module.exports = Conversation;
