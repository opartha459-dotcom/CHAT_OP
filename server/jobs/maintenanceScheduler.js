const MaintenanceSchedule = require('../models/MaintenanceSchedule');

let intervalTimer = null;

const getCurrentMaintenanceState = async () => {
  try {
    const now = new Date();

    // 1. Find currently active maintenance
    let active = await MaintenanceSchedule.findOne({
      status: 'active',
      $or: [
        { endTime: { $exists: false } },
        { endTime: null },
        { endTime: { $gt: now } }
      ]
    })
      .sort({ createdAt: -1 })
      .lean();

    // Fallback: Check scheduled maintenance whose start time has arrived
    if (!active) {
      active = await MaintenanceSchedule.findOne({
        status: 'scheduled',
        startTime: { $lte: now },
        $or: [
          { endTime: { $exists: false } },
          { endTime: null },
          { endTime: { $gt: now } }
        ]
      })
        .sort({ startTime: 1 })
        .lean();
    }

    // 2. Find closest upcoming scheduled maintenance
    const upcoming = await MaintenanceSchedule.findOne({
      status: 'scheduled',
      startTime: { $gt: now }
    })
      .sort({ startTime: 1 })
      .lean();

    return { active: active || null, upcoming: upcoming || null };
  } catch (err) {
    console.error('[Maintenance State Error]', err);
    return { active: null, upcoming: null };
  }
};

const tickMaintenance = async (app) => {
  try {
    const now = new Date();
    let changed = false;

    // 1. Auto-activate scheduled maintenance whose start time has arrived
    const toActivate = await MaintenanceSchedule.find({
      status: 'scheduled',
      startTime: { $lte: now }
    });

    for (const schedule of toActivate) {
      schedule.status = 'active';
      await schedule.save();
      changed = true;
      console.log(`[Maintenance] Activated scheduled maintenance: "${schedule.title}" (ID: ${schedule._id})`);
    }

    // 2. Auto-complete active maintenance whose end time has passed
    const toComplete = await MaintenanceSchedule.find({
      status: 'active',
      endTime: { $lte: now, $ne: null }
    });

    for (const schedule of toComplete) {
      schedule.status = 'completed';
      schedule.completedAt = now;
      await schedule.save();
      changed = true;
      console.log(`[Maintenance] Completed maintenance: "${schedule.title}" (ID: ${schedule._id})`);
    }

    // If state changed, broadcast to all connected clients
    if (changed && app) {
      const io = app.get('io');
      if (io) {
        const state = await getCurrentMaintenanceState();
        io.emit('maintenance:updated', state);
      }
    }
  } catch (err) {
    console.warn('[Maintenance Scheduler Tick Error]', err);
  }
};

const initMaintenanceScheduler = (app) => {
  if (intervalTimer) {
    clearInterval(intervalTimer);
  }

  // Initial immediate pass
  tickMaintenance(app).catch(console.error);

  // Periodic pass every 15 seconds
  intervalTimer = setInterval(() => {
    tickMaintenance(app).catch(console.error);
  }, 15000);

  console.log('[JOBS] Maintenance scheduler initialized.');
};

module.exports = {
  initMaintenanceScheduler,
  getCurrentMaintenanceState,
  tickMaintenance
};

