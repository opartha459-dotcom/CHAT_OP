const mongoose = require('mongoose');

// ── Per-item data request sub-schema ────────────────────────────────────────
// Each item represents one category of old data the user is requesting
const dataItemSchema = new mongoose.Schema(
  {
    // e.g. 'chats', 'contacts', 'call_history', 'profile', 'media'
    key: { type: String, required: true },
    label: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    adminNote: { type: String, default: '' },
    decidedAt: { type: Date }
  },
  { _id: false }
);

// ── Main schema ──────────────────────────────────────────────────────────────
const accountRecoveryRequestSchema = new mongoose.Schema(
  {
    // Old / retained account
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    // For data_migration: the new account the user created (Option B)
    newAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // 'restore'        – Option A: restore old account back to active
    // 'data_migration' – Option B: user created a new account, wants old data sent to it
    requestType: {
      type: String,
      enum: ['restore', 'data_migration'],
      default: 'restore',
      index: true
    },

    // ── Data items (only for data_migration) ────────────────────────────────
    // Admin approves / rejects each item independently
    requestedItems: {
      type: [dataItemSchema],
      default: []
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    // The original email of the old account (preserved even after email is archived)
    originalEmail: {
      type: String,
      default: ''
    },
    originalUsername: {
      type: String,
      required: true
    },
    // Overall request status
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'partial'],
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
