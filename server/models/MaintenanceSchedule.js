const mongoose = require('mongoose');

const maintenanceScheduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Maintenance title is required'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    scope: {
      type: String,
      enum: ['full_system', 'partial'],
      default: 'full_system'
    },
    affectedFeatures: {
      type: [String],
      default: [] // e.g. ['chat', 'status', 'calls', 'file_sharing', 'registration']
    },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
      index: true
    },
    endTime: {
      type: Date,
      index: true
    },
    isImmediate: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    completedAt: {
      type: Date
    },
    cancelledAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Helper to determine if a specific feature is affected by this maintenance
maintenanceScheduleSchema.methods.affectsFeature = function (featureKey) {
  if (this.status !== 'active') return false;
  if (this.scope === 'full_system') return true;
  return Array.isArray(this.affectedFeatures) && this.affectedFeatures.includes(featureKey);
};

module.exports = mongoose.model('MaintenanceSchedule', maintenanceScheduleSchema);

