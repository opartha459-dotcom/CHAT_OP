
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const pushSubscriptionSchema = new mongoose.Schema(
  {
    endpoint: {
      type: String,
      required: true,
      trim: true
    },
    keys: {
      p256dh: {
        type: String,
        required: true
      },
      auth: {
        type: String,
        required: true
      }
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    _id: false
  }
);

const userSchema = new mongoose.Schema(
  {
    // ----------------------------------------------
    // BASIC ACCOUNT INFORMATION
    // ----------------------------------------------

    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [
        /^[a-zA-Z0-9_]+$/,
        'Username can only contain alphanumeric characters and underscores'
      ],
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
      match: [
        /^\S+@\S+\.\S+$/,
        'Please enter a valid email address'
      ]
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

    // ----------------------------------------------
    // ACCOUNT ROLE AND SECURITY
    // ----------------------------------------------

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

    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true
    },

    emailVerificationToken: {
      type: String,
      select: false
    },

    emailVerificationExpires: {
      type: Date
    },

    passwordResetToken: {
      type: String,
      select: false
    },

    passwordResetExpires: {
      type: Date
    },

    // ----------------------------------------------
    // ACCOUNT DELETION
    // ----------------------------------------------

    deletionStatus: {
      type: String,
      enum: [
        'active',
        'pending_deletion',
        'deleted',
        'retained'
      ],
      default: 'active',
      index: true
    },

    deletionRequestedAt: {
      type: Date
    },

    deletionConfirmedAt: {
      type: Date
    },

    recoveryDeadline: {
      type: Date,
      index: true
    },

    archivedEmail: {
      type: String,
      default: ''
    },

    deletionConfirmationToken: {
      type: String,
      select: false
    },

    deletionConfirmationExpires: {
      type: Date
    },

    isDeactivated: {
      type: Boolean,
      default: false,
      index: true
    },

    // ----------------------------------------------
    // ONLINE STATUS
    // ----------------------------------------------

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

    // ----------------------------------------------
    // END-TO-END ENCRYPTION
    // ----------------------------------------------

    e2eePublicKey: {
      type: String,
      default: ''
    },

    // ----------------------------------------------
    // PRIVACY SETTINGS
    // ----------------------------------------------

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
      },

      // Status Viewer & Privacy Settings
      statusAudience: {
        type: String,
        enum: ['everyone', 'contacts', 'custom', 'only_share_with'],
        default: 'everyone'
      },

      statusAllowedUsers: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      ],

      statusExcludedUsers: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      ],

      statusViewReceipts: {
        type: Boolean,
        default: true
      }
    },

    // ----------------------------------------------
    // CHAT APPEARANCE AND SOUND SETTINGS
    // ----------------------------------------------

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
        messages: {
          type: Boolean,
          default: true
        },

        groups: {
          type: Boolean,
          default: true
        },

        mentions: {
          type: Boolean,
          default: true
        }
      }
    },

    // ----------------------------------------------
    // WEB PUSH NOTIFICATIONS
    // ----------------------------------------------

    pushSubscriptions: {
      type: [pushSubscriptionSchema],
      default: []
    }
  },
  {
    timestamps: true,

    toJSON: {
      transform: function (doc, ret) {
        // Never expose credentials or verification tokens.
        delete ret.password;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpires;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.deletionConfirmationToken;
        delete ret.deletionConfirmationExpires;

        return ret;
      }
    }
  }
);

// ----------------------------------------------
// PASSWORD HASHING
// ----------------------------------------------

userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(
    this.password,
    salt
  );
});

// ----------------------------------------------
// PASSWORD COMPARISON
// ----------------------------------------------

userSchema.methods.comparePassword = async function (
  enteredPassword
) {
  if (!this.password) {
    throw new Error(
      'Password was not selected. Use .select("+password") when querying.'
    );
  }

  return bcrypt.compare(
    enteredPassword,
    this.password
  );
};

// ----------------------------------------------
// MODEL EXPORT
// ----------------------------------------------

const User = mongoose.model('User', userSchema);

module.exports = User;
