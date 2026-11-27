const mongoose = require('mongoose');
const { VALID_PERMISSION_SET } = require('../config/permissions');

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
      maxlength: [60, 'Role name cannot exceed 60 characters']
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
      default: ''
    },
    permissions: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.every((p) => VALID_PERMISSION_SET.has(p)),
        message: 'Role contains one or more invalid permission identifiers.'
      }
    },
    pageAccess: {
      chats: { type: Boolean, default: true },
      stories: { type: Boolean, default: true },
      calls: { type: Boolean, default: true },
      communities: { type: Boolean, default: true },
      settings: { type: Boolean, default: true }
    },
    restrictedMessages: {
      default: { type: String, trim: true, maxlength: 300, default: '' },
      chats: { type: String, trim: true, maxlength: 300, default: '' },
      stories: { type: String, trim: true, maxlength: 300, default: '' },
      calls: { type: String, trim: true, maxlength: 300, default: '' },
      communities: { type: String, trim: true, maxlength: 300, default: '' },
      settings: { type: String, trim: true, maxlength: 300, default: '' }
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

roleSchema.index({ name: 1 });
roleSchema.index({ createdAt: -1 });

const Role = mongoose.model('Role', roleSchema);
module.exports = Role;
