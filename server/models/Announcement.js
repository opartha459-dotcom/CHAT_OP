const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters']
    },
    content: {
      type: String,
      required: [true, 'Announcement content is required'],
      trim: true,
      maxlength: [2000, 'Content cannot exceed 2000 characters']
    },
    type: {
      type: String,
      enum: ['info', 'feature', 'warning', 'critical', 'maintenance'],
      default: 'info'
    },
    targetAudience: {
      type: String,
      enum: ['all', 'users', 'admins'],
      default: 'all'
    },
    // Interactive Poll embedded in Announcement
    hasPoll: {
      type: Boolean,
      default: false
    },
    poll: {
      question: { type: String, trim: true },
      options: [
        {
          text: { type: String, trim: true },
          votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
        }
      ],
      allowMultiple: { type: Boolean, default: false },
      isClosed: { type: Boolean, default: false },
      closedAt: { type: Date }
    },
    // Design and Styling Options
    design: {
      theme: {
        type: String,
        default: 'default'
      },
      font: {
        type: String,
        default: 'sans'
      },
      badge: {
        type: String,
        default: '📢'
      },
      style: {
        type: String,
        default: 'banner'
      },
      animation: {
        type: String,
        default: 'none'
      }
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    acknowledgedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        acknowledgedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    expiresAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

announcementSchema.index({ isPublished: 1, isArchived: 1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
