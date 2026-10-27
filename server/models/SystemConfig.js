const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'system_settings'
    },
    featureFlags: {
      callsEnabled: { type: Boolean, default: true },
      pollsEnabled: { type: Boolean, default: true },
      statusesEnabled: { type: Boolean, default: true },
      voiceMessagesEnabled: { type: Boolean, default: true },
      announcementsEnabled: { type: Boolean, default: true },
      fileSharingEnabled: { type: Boolean, default: true }
    },
    databaseAssignments: {
      authDb: { type: String, default: 'primary' },
      messagesDb: { type: String, default: 'primary' },
      groupsDb: { type: String, default: 'primary' },
      auditDb: { type: String, default: 'primary' },
      retentionDb: { type: String, default: 'primary' }
    },
    retentionSettings: {
      retentionDays: { type: Number, default: 14 },
      requireAdminApprovalForPermanentDelete: { type: Boolean, default: true }
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
