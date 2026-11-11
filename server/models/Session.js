
const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    // ----------------------------------------------
    // SESSION OWNER
    // ----------------------------------------------

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // ----------------------------------------------
    // JWT TOKEN
    // ----------------------------------------------

    token: {
      type: String,
      required: true,
      select: false
    },

    // ----------------------------------------------
    // DEVICE INFORMATION
    // ----------------------------------------------

    ip: {
      type: String,
      default: 'Unknown',
      trim: true
    },

    userAgent: {
      type: String,
      default: 'Unknown',
      trim: true
    },

    deviceType: {
      type: String,
      default: 'Desktop',
      trim: true
    },

    os: {
      type: String,
      default: 'Unknown',
      trim: true
    },

    browser: {
      type: String,
      default: 'Unknown',
      trim: true
    },

    // ----------------------------------------------
    // SESSION ACTIVITY
    // ----------------------------------------------

    lastActive: {
      type: Date,
      default: Date.now,
      index: true
    },

    // ----------------------------------------------
    // SESSION VALIDITY
    // ----------------------------------------------

    isValid: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// ----------------------------------------------
// DATABASE INDEXES
// ----------------------------------------------

// Retrieve a user's active sessions efficiently.
sessionSchema.index({
  user: 1,
  isValid: 1
});

// Retrieve recent sessions efficiently.
sessionSchema.index({
  user: 1,
  isValid: 1,
  lastActive: -1
});

// ----------------------------------------------
// JSON PROTECTION
// ----------------------------------------------

sessionSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.token;
    return ret;
  }
});

// ----------------------------------------------
// MODEL EXPORT
// ----------------------------------------------

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
