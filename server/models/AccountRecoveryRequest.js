const mongoose = require('mongoose');

const accountRecoveryRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    originalUsername: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    userNote: {
      type: String,
      default: ''
    },
    adminDecisionReason: {
      type: String,
      default: ''
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    decidedAt: {
      type: Date
    },
    ipAddress: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

accountRecoveryRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('AccountRecoveryRequest', accountRecoveryRequestSchema);
