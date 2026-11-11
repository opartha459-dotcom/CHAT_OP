const mongoose = require('mongoose');

const verificationCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    action: {
      type: String,
      enum: ['email_verification', 'password_reset', 'account_deletion', 'account_recovery', 'other'],
      default: 'email_verification',
      index: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    username: {
      type: String,
      default: ''
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'used', 'expired'],
      default: 'pending',
      index: true
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    sentAt: {
      type: Date,
      default: null
    },
    usedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      required: true
    },
    ipAddress: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// TTL index to automatically remove expired entries after 7 days
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('VerificationCode', verificationCodeSchema);

