const { getCurrentMaintenanceState } = require('../jobs/maintenanceScheduler');
const { verifyToken } = require('../utils/token');
const User = require('../models/User');

/**
 * Checks if the incoming request belongs to an authenticated Super Admin.
 */
const isAdminRequest = async (req) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }
    if (!token) return false;
    const decoded = verifyToken(token);
    const userId = decoded?.userId || decoded?.id;
    if (!userId) return false;
    const user = await User.findById(userId).select('role').lean();
    return user?.role === 'admin';
  } catch {
    return false;
  }
};

/**
 * Enforces active full-system and partial feature maintenance at the API level.
 * Super Admins bypass maintenance so they can manage and end maintenance windows.
 */
const enforceMaintenance = (featureKey = null) => async (req, res, next) => {
  try {
    const state = await getCurrentMaintenanceState();
    const active = state?.active;
    if (!active) return next();

    const admin = await isAdminRequest(req);
    if (admin) return next();

    if (active.scope === 'full_system') {
      return res.status(503).json({
        success: false,
        maintenance: true,
        scope: 'full_system',
        title: active.title,
        message: active.description || 'System is currently under scheduled maintenance.',
        endTime: active.endTime
      });
    }

    if (featureKey && active.scope === 'partial') {
      const affected = Array.isArray(active.affectedFeatures) ? active.affectedFeatures : [];
      if (affected.includes(featureKey)) {
        return res.status(503).json({
          success: false,
          maintenance: true,
          scope: 'partial',
          feature: featureKey,
          title: active.title,
          message: `${featureKey} is temporarily unavailable due to scheduled maintenance.`,
          endTime: active.endTime
        });
      }
    }

    return next();
  } catch (err) {
    console.error('[Maintenance Guard Error]', err);
    return next();
  }
};

module.exports = { enforceMaintenance };
