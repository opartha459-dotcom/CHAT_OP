const SystemConfig = require('../models/SystemConfig');
const MaintenanceSchedule = require('../models/MaintenanceSchedule');

const FEATURE_FLAG_MAP = {
  chat: 'chatEnabled',
  status: 'statusesEnabled',
  calls: 'callsEnabled',
  fileSharing: 'fileSharingEnabled',
  registration: 'userRegistrationEnabled',
  notifications: 'notificationsEnabled',
  voice: 'voiceMessagesEnabled',
  polls: 'pollsEnabled',
  announcements: 'announcementsEnabled',
  e2ee: 'e2eeEnabled'
};

const FEATURE_NAMES = {
  chat: 'Chat system',
  status: 'Status updates',
  calls: 'Voice & video calls',
  fileSharing: 'File & media uploads',
  registration: 'User registration',
  notifications: 'Notifications',
  voice: 'Voice audio messages',
  polls: 'Interactive polls',
  announcements: 'Broadcast announcements',
  e2ee: 'End-to-end encryption'
};

/**
 * Middleware to enforce feature flags and scheduled maintenance
 * @param {string} featureKey - Key matching FEATURE_FLAG_MAP (e.g., 'chat', 'status', 'calls')
 */
const checkFeature = (featureKey) => {
  return async (req, res, next) => {
    try {
      // Administrators bypass restrictions for testing and management
      if (req.user && req.user.role === 'admin') {
        return next();
      }

      const flagName = FEATURE_FLAG_MAP[featureKey] || featureKey;
      const friendlyName = FEATURE_NAMES[featureKey] || featureKey;

      // 1. Check feature flags in SystemConfig
      const config = await SystemConfig.findOne({ key: 'system_settings' }).lean();
      if (config && config.featureFlags && config.featureFlags[flagName] === false) {
        return res.status(403).json({
          success: false,
          featureDisabled: true,
          feature: featureKey,
          message: `${friendlyName} is currently disabled by system administrators.`
        });
      }

      // 2. Check active scheduled maintenance
      const now = new Date();
      const activeMaintenance = await MaintenanceSchedule.findOne({
        $or: [
          {
            status: 'active',
            $or: [
              { endTime: { $exists: false } },
              { endTime: null },
              { endTime: { $gt: now } }
            ]
          },
          {
            status: 'scheduled',
            startTime: { $lte: now },
            $or: [
              { endTime: { $exists: false } },
              { endTime: null },
              { endTime: { $gt: now } }
            ]
          }
        ]
      }).sort({ createdAt: -1 }).lean();

      if (activeMaintenance) {
        if (activeMaintenance.scope === 'full_system') {
          return res.status(503).json({
            success: false,
            inMaintenance: true,
            scope: 'full_system',
            maintenance: {
              title: activeMaintenance.title,
              description: activeMaintenance.description,
              startTime: activeMaintenance.startTime,
              endTime: activeMaintenance.endTime
            },
            message: 'PulseChat is currently undergoing system-wide scheduled maintenance.'
          });
        }

        const affected = Array.isArray(activeMaintenance.affectedFeatures)
          ? activeMaintenance.affectedFeatures
          : [];

        if (affected.includes(featureKey)) {
          return res.status(503).json({
            success: false,
            inMaintenance: true,
            scope: 'partial',
            feature: featureKey,
            maintenance: {
              title: activeMaintenance.title,
              description: activeMaintenance.description,
              startTime: activeMaintenance.startTime,
              endTime: activeMaintenance.endTime
            },
            message: `${friendlyName} is temporarily unavailable due to scheduled maintenance.`
          });
        }
      }

      return next();
    } catch (err) {
      console.warn('[CheckFeature Middleware Error]', err);
      // In case of error, fail open to avoid crashing legitimate user requests
      return next();
    }
  };
};

module.exports = {
  checkFeature,
  FEATURE_FLAG_MAP,
  FEATURE_NAMES
};

