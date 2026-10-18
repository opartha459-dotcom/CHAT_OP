const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain alphanumeric characters and underscores'],
      index: true
    },
    nickname: {
      type: String,
      trim: true,
      maxlength: [50, 'Nickname cannot exceed 50 characters'],
      default: ''
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    avatar: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [200, 'Bio cannot exceed 200 characters'],
      default: 'Hey there! I am using PulseChat.'
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true
    },
    isBanned: {
      type: Boolean,
      default: false,
      index: true
    },
    banReason: {
      type: String,
      default: ''
    },
    bannedAt: {
      type: Date
    },
    isDeactivated: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'away'],
      default: 'offline',
      index: true
    },
    lastSeen: {
      type: Date,
      default: Date.now
    },
    e2eePublicKey: {
      type: String,
      default: ''
    },
    privacySettings: {
      profileVisibility: {
        type: String,
        enum: ['everyone', 'contacts', 'nobody'],
        default: 'everyone'
      },
      lastSeenVisibility: {
        type: String,
        enum: ['everyone', 'contacts', 'nobody'],
        default: 'everyone'
      },
      readReceipts: {
        type: Boolean,
        default: true
      },
      typingIndicators: {
        type: Boolean,
        default: true
      },
      groupAddPermission: {
        type: String,
        enum: ['everyone', 'contacts', 'nobody'],
        default: 'everyone'
      }
    },
    chatSettings: {
      theme: {
        type: String,
        enum: ['system', 'dark', 'light'],
        default: 'system'
      },
      accentColor: {
        type: String,
        default: 'indigo'
      },
      fontSize: {
        type: String,
        enum: ['small', 'medium', 'large'],
        default: 'medium'
      },
      soundEnabled: {
        type: Boolean,
        default: true
      },
      notificationPreferences: {
        messages: { type: Boolean, default: true },
        groups: { type: Boolean, default: true },
        mentions: { type: Boolean, default: true }
      }
    },
    pushSubscriptions: [
      {
        endpoint: { type: String, required: true },
        keys: {
          p256dh: { type: String, required: true },
          auth: { type: String, required: true }
        },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
