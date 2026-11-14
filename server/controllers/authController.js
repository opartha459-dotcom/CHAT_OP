const crypto = require('crypto');
const User = require('../models/User');
const Session = require('../models/Session');
const AccountRecoveryRequest = require('../models/AccountRecoveryRequest');
const VerificationCode = require('../models/VerificationCode');
const { generateToken, setTokenCookie, clearTokenCookie } = require('../utils/token');
const emailService = require('../services/emailService');

// Helper to hash single-use tokens with SHA-256
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Helper to generate a 6-digit numeric OTP code
const generateOtpCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Parse user agent info
const parseClientInfo = (req) => {
  const ua = req.headers['user-agent'] || 'Unknown';
  let deviceType = 'Desktop';
  if (/mobile/i.test(ua)) deviceType = 'Mobile';
  else if (/tablet|ipad/i.test(ua)) deviceType = 'Tablet';

  let os = 'Unknown OS';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad/i.test(ua)) os = 'iOS';

  let browser = 'Unknown Browser';
  if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';
  else if (/edg/i.test(ua)) browser = 'Edge';

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  return { ip, userAgent: ua, deviceType, os, browser };
};

// @desc Register user
// @route POST /api/auth/register
const register = async (req, res) => {
  try {
    const { username, email, password, nickname, bio, avatar, e2eePublicKey } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username, email, and password.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check if email belongs to an account in retention / pending deletion
    const pendingAccount = await User.findOne({
      email: cleanEmail,
      deletionStatus: { $in: ['pending_deletion', 'retained'] }
    });

    if (pendingAccount) {
      return res.status(403).json({
        success: false,
        requiresRecovery: true,
        message: 'An existing account with this email is pending deletion or retained. You can choose to recover the old account or create a separate account.',
        email: cleanEmail,
        username: pendingAccount.username,
        recoveryDeadline: pendingAccount.recoveryDeadline
      });
    }

    // Check existing active username or email
    const existingUser = await User.findOne({
      $or: [{ username: cleanUsername }, { email: cleanEmail }]
    });

    if (existingUser) {
      if (existingUser.username === cleanUsername) {
        return res.status(400).json({ success: false, message: 'Username is already taken.' });
      }
      return res.status(400).json({ success: false, message: 'Email is already registered.' });
    }

    // First user registered or admin email/username in env receives admin role
    const count = await User.countDocuments();
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const adminUsernames = (process.env.ADMIN_USERNAMES || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const isConfiguredAdmin = adminEmails.includes(cleanEmail) || adminUsernames.includes(cleanUsername);
    const isAdminEmail = cleanEmail.startsWith('admin@') || (cleanEmail.includes('admin') && cleanEmail.includes('pulsechat.io'));
    const role = (count === 0 || isAdminEmail || isConfiguredAdmin) ? 'admin' : 'user';

    // Generate 6-digit email verification OTP code
    const otpCode = generateOtpCode();
    const verificationHash = hashToken(otpCode);

    const user = await User.create({
      username: cleanUsername,
      email: cleanEmail,
      password,
      nickname: nickname || username,
      bio: bio || 'Hey there! I am using PulseChat.',
      avatar: avatar || '',
      role,
      e2eePublicKey: e2eePublicKey || '',
      isEmailVerified: false,
      emailVerificationToken: verificationHash,
      emailVerificationExpires: new Date(Date.now() + 72 * 3600 * 1000)
    });

    // Record verification request for admin manual dispatch
    try {
      const codeRecord = await VerificationCode.create({
        code: otpCode,
        action: 'email_verification',
        email: cleanEmail,
        username: user.username,
        user: user._id,
        status: 'pending',
        expiresAt: user.emailVerificationExpires,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || ''
      });

      const io = req.app.get('io');
      if (io) {
        const payload = {
          _id: codeRecord._id.toString(),
          code: otpCode,
          action: 'email_verification',
          email: cleanEmail,
          username: user.username,
          status: 'pending',
          createdAt: codeRecord.createdAt || new Date(),
          expiresAt: user.emailVerificationExpires
        };
        io.to('admin:room').emit('admin:new_verification_request', payload);
        io.emit('admin:new_verification_request', payload);
      }
    } catch (codeErr) {
      console.warn('[Register] Verification code record error:', codeErr.message);
    }

    // Optional email fallback
    emailService.sendVerificationEmail(cleanEmail, user.username, otpCode).catch((err) => {
      console.warn('[Email] Verification send error:', err.message);
    });

    // Do NOT automatically log in or create active session! User must verify email first.
    return res.status(201).json({
      success: true,
      requiresEmailVerification: true,
      email: cleanEmail,
      username: user.username,
      message: 'Registration successful! An admin will send your verification code shortly.'
    });
  } catch (error) {
    console.error('[Register Error]', error);
    return res.status(500).json({ success: false, message: error.message || 'Error registering user.' });
  }
};

// @desc Verify email address
// @route POST /api/auth/verify-email
const verifyEmail = async (req, res) => {
  try {
    const { token, code, email } = req.body;
    const inputCode = (code || token || '').toString().trim();
    if (!inputCode) {
      return res.status(400).json({ success: false, message: 'Verification code is required.' });
    }

    const hashed = hashToken(inputCode);
    const filter = { emailVerificationToken: hashed };
    if (email) {
      filter.email = email.trim().toLowerCase();
    }

    let userWithToken = await User.findOne(filter).select('+emailVerificationToken +emailVerificationExpires');

    if (!userWithToken && email) {
      userWithToken = await User.findOne({ emailVerificationToken: hashed }).select('+emailVerificationToken +emailVerificationExpires');
    }

    if (!userWithToken) {
      return res.status(400).json({
        success: false,
        expired: true,
        message: 'Invalid verification code or it has already been used. Please request a new code.'
      });
    }

    if (userWithToken.isEmailVerified) {
      return res.json({ success: true, message: 'Your email is already verified. You can sign in.' });
    }

    if (!userWithToken.emailVerificationExpires || userWithToken.emailVerificationExpires < new Date()) {
      return res.status(400).json({
        success: false,
        expired: true,
        email: userWithToken.email,
        message: 'Your verification code has expired. Please request a new code.'
      });
    }

    userWithToken.isEmailVerified = true;
    userWithToken.emailVerificationToken = undefined;
    userWithToken.emailVerificationExpires = undefined;
    await userWithToken.save();

    await VerificationCode.updateMany(
      { email: userWithToken.email, code: inputCode },
      { status: 'used', usedAt: new Date() }
    ).catch(() => {});

    return res.json({
      success: true,
      message: 'Your email address has been verified successfully! You can now log in.'
    });
  } catch (error) {
    console.error('[Verify Email Error]', error);
    return res.status(500).json({ success: false, message: 'Error verifying email.' });
  }
};

// @desc Resend verification email / request fresh code
// @route POST /api/auth/resend-verification
const resendVerificationEmail = async (req, res) => {
  try {
    const { email, identifier } = req.body || {};
    let user = null;

    if (req.user?._id) {
      user = await User.findById(req.user._id);
    } else if (email || identifier) {
      const search = (email || identifier).trim().toLowerCase();
      user = await User.findOne({
        $or: [{ email: search }, { username: search }]
      });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found with that email or username.' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'This email is already verified. You can log in directly.' });
    }

    const otpCode = generateOtpCode();
    user.emailVerificationToken = hashToken(otpCode);
    user.emailVerificationExpires = new Date(Date.now() + 72 * 3600 * 1000);
    await user.save();

    // Create fresh verification code record for admin
    try {
      const codeRecord = await VerificationCode.create({
        code: otpCode,
        action: 'email_verification',
        email: user.email,
        username: user.username,
        user: user._id,
        status: 'pending',
        expiresAt: user.emailVerificationExpires,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || ''
      });

      const io = req.app.get('io');
      if (io) {
        const payload = {
          _id: codeRecord._id.toString(),
          code: otpCode,
          action: 'email_verification',
          email: cleanEmail,
          username: user.username,
          status: 'pending',
          createdAt: codeRecord.createdAt || new Date(),
          expiresAt: user.emailVerificationExpires
        };
        io.to('admin:room').emit('admin:new_verification_request', payload);
        io.emit('admin:new_verification_request', payload);
      }
    } catch (e) {}

    return res.json({
      success: true,
      email: user.email,
      message: `Fresh verification code requested for ${user.email}. An admin will send your code shortly.`
    });
  } catch (error) {
    console.error('[Resend Verification Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to request verification code.' });
  }
};

// @desc Request Password Reset Code
// @route POST /api/auth/forgot-password
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with that email address.'
      });
    }

    const otpCode = generateOtpCode();
    user.passwordResetToken = hashToken(otpCode);
    user.passwordResetExpires = new Date(Date.now() + 3600 * 1000); // 1 hour
    await user.save();

    try {
      const codeRecord = await VerificationCode.create({
        code: otpCode,
        action: 'password_reset',
        email: cleanEmail,
        username: user.username,
        user: user._id,
        status: 'pending',
        expiresAt: user.passwordResetExpires,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || ''
      });

      const io = req.app.get('io');
      if (io) {
        const payload = {
          _id: codeRecord._id.toString(),
          code: otpCode,
          action: 'email_verification',
          email: cleanEmail,
          username: user.username,
          status: 'pending',
          createdAt: codeRecord.createdAt || new Date(),
          expiresAt: user.emailVerificationExpires
        };
        io.to('admin:room').emit('admin:new_verification_request', payload);
        io.emit('admin:new_verification_request', payload);
      }
    } catch (err) {
      console.warn('[Forgot Password] Code record creation notice:', err.message);
    }

    return res.json({
      success: true,
      email: cleanEmail,
      message: 'Password reset code requested! Admin will dispatch your reset code.'
    });
  } catch (error) {
    console.error('[Forgot Password Error]', error);
    return res.status(500).json({ success: false, message: 'Error processing password reset request.' });
  }
};

// @desc Reset password with code / token
// @route POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { token, code, email, newPassword } = req.body;
    const inputCode = (code || token || '').toString().trim();

    if (!inputCode || !newPassword) {
      return res.status(400).json({ success: false, message: 'Reset code and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const hashed = hashToken(inputCode);
    const filter = {
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: new Date() }
    };

    if (email) {
      filter.email = email.trim().toLowerCase();
    }

    let user = await User.findOne(filter).select('+password');

    if (!user && email) {
      user = await User.findOne({
        passwordResetToken: hashed,
        passwordResetExpires: { $gt: new Date() }
      }).select('+password');
    }

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset code.' });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    await VerificationCode.updateMany(
      { email: user.email, code: inputCode },
      { status: 'used', usedAt: new Date() }
    ).catch(() => {});

    // Revoke previous sessions on password reset for security
    await Session.updateMany({ user: user._id }, { isValid: false });

    return res.json({
      success: true,
      message: 'Your password has been reset successfully! You can now log in.'
    });
  } catch (error) {
    console.error('[Reset Password Error]', error);
    return res.status(500).json({ success: false, message: 'Error resetting password.' });
  }
};

// @desc Login user
// @route POST /api/auth/login
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username/email and password.' });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // Find user by username or email with password field selected
    const user = await User.findOne({
      $or: [{ username: cleanIdentifier }, { email: cleanIdentifier }]
    }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: `Account is banned: ${user.banReason || 'Terms violation.'}`,
        isBanned: true
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Check if account was deleted by an administrator (Trash DB retention)
    if (user.deletionStatus === 'deleted_by_admin') {
      const reasonText = user.deletionReason || 'Your account was deleted by an administrator.';
      return res.status(403).json({
        success: false,
        isDeletedByAdmin: true,
        message: `Account deleted by administrator: "${reasonText}"`,
        adminMessage: reasonText,
        deletionReason: reasonText,
        deletedAt: user.deletedAt || user.updatedAt,
        recoveryDeadline: user.recoveryDeadline,
        email: user.email,
        username: user.username,
        appealUrl: `/deletion-appeal?email=${encodeURIComponent(user.email)}`
      });
    }

    // MANDATORY STATE 3: Check if account is pending deletion or in retention!
    if (user.deletionStatus === 'pending_deletion' || user.deletionStatus === 'retained') {
      return res.status(403).json({
        success: false,
        requiresRecovery: true,
        message: 'This account is pending deletion or under retention.',
        email: user.email,
        username: user.username,
        deletionStatus: user.deletionStatus,
        recoveryDeadline: user.recoveryDeadline
      });
    }

    // MANDATORY: Email verification is required before login
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        requiresEmailVerification: true,
        email: user.email,
        username: user.username,
        message: 'Email verification is mandatory. Please verify your email before logging in. Check your inbox or click Resend below.'
      });
    }

    if (user.isDeactivated) {
      user.isDeactivated = false;
    }

    // Ensure configured admin receives admin role
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const adminUsernames = (process.env.ADMIN_USERNAMES || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if ((adminEmails.includes(user.email) || adminUsernames.includes(user.username)) && user.role !== 'admin') {
      user.role = 'admin';
    }

    // Update status to online
    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    // Create session
    const clientInfo = parseClientInfo(req);
    const session = await Session.create({
      user: user._id,
      token: 'init',
      ...clientInfo
    });

    const token = generateToken({ userId: user._id, role: user.role, sessionId: session._id });
    session.token = token;
    await session.save();

    setTokenCookie(res, token);

    return res.json({
      success: true,
      message: 'Login successful.',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('[Login Error]', error);
    return res.status(500).json({ success: false, message: error.message || 'Error during login.' });
  }
};

// @desc Request Account Deletion (State 1: Generates OTP verification code & notifies admin for dispatch)
// @route POST /api/auth/request-deletion
const requestAccountDeletion = async (req, res) => {
  try {
    const { password, email } = req.body;
    let user = await User.findById(req.user._id).select('+password');

    // If an explicit email was provided and differs from req.user (e.g. multi-tab testing)
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      if (user && user.email.toLowerCase() !== cleanEmail) {
        const altUser = await User.findOne({ email: cleanEmail }).select('+password');
        if (altUser) {
          const matchAlt = await altUser.comparePassword(password);
          if (matchAlt) {
            user = altUser;
          }
        }
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect password.' });
    }

    // 6-digit OTP code for account deletion confirmation
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.deletionConfirmationToken = hashToken(otpCode);
    user.deletionConfirmationExpires = new Date(Date.now() + 2 * 3600 * 1000); // 2 hours
    user.deletionRequestedAt = new Date();
    await user.save();

    // Store in VerificationCode model for manual admin dispatch
    const codeDoc = await VerificationCode.create({
      code: otpCode,
      action: 'account_deletion',
      email: user.email,
      username: user.username,
      user: user._id,
      status: 'pending',
      expiresAt: user.deletionConfirmationExpires,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    // Notify admins in real-time
    const io = req.app.get('io');
    if (io) {
      const payload = {
        _id: codeDoc._id.toString(),
        code: otpCode,
        action: 'account_deletion',
        email: user.email,
        username: user.username,
        status: 'pending',
        createdAt: codeDoc.createdAt || new Date(),
        expiresAt: codeDoc.expiresAt
      };
      io.to('admin:room').emit('admin:new_verification_request', payload);
      io.emit('admin:new_verification_request', payload);
    }

    // Attempt email delivery in the background; will never throw or crash if SMTP is unconfigured
    try {
      emailService.sendDeletionConfirmationEmail(user.email, user.username, otpCode, 14).catch(() => {});
    } catch {}

    return res.json({
      success: true,
      email: user.email,
      message: `Deletion code generated for ${user.email}. The administrator has been notified to dispatch your code.`
    });
  } catch (error) {
    console.error('[Request Deletion Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to initiate deletion request.' });
  }
};

// @desc Confirm Account Deletion (State 2: Marks pending deletion, sets recovery deadline, revokes sessions)
// @route POST /api/auth/confirm-deletion
const confirmAccountDeletion = async (req, res) => {
  try {
    const { token, code, email } = req.body;
    const provided = String(code || token || '').trim();
    if (!provided) {
      return res.status(400).json({ success: false, message: 'Confirmation code is required.' });
    }

    const hashed = hashToken(provided);
    let user = null;

    if (email) {
      user = await User.findOne({
        email: email.trim().toLowerCase(),
        deletionConfirmationToken: hashed,
        deletionConfirmationExpires: { $gt: new Date() }
      });
    }

    if (!user) {
      user = await User.findOne({
        deletionConfirmationToken: hashed,
        deletionConfirmationExpires: { $gt: new Date() }
      });
    }

    // Fallback: Check VerificationCode directly if token hash check missed
    if (!user) {
      const codeRecord = await VerificationCode.findOne({
        code: provided,
        action: 'account_deletion',
        status: { $in: ['pending', 'sent'] }
      });
      if (codeRecord) {
        if (codeRecord.user) {
          user = await User.findById(codeRecord.user);
        } else if (codeRecord.email) {
          user = await User.findOne({ email: codeRecord.email.toLowerCase().trim() });
        }
      }
    }

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired deletion confirmation code.' });
    }

    // Mark verification code as used
    await VerificationCode.updateMany(
      { code: provided, email: user.email, action: 'account_deletion', status: { $in: ['pending', 'sent'] } },
      { status: 'used', usedAt: new Date() }
    ).catch(() => {});

    const deadline = new Date(Date.now() + 14 * 24 * 3600 * 1000); // 14 days recovery window
    user.deletionStatus = 'pending_deletion';
    user.deletionConfirmedAt = new Date();
    user.recoveryDeadline = deadline;
    user.status = 'offline';
    user.deletionConfirmationToken = undefined;
    user.deletionConfirmationExpires = undefined;
    await user.save();

    // Revoke all existing sessions
    await Session.updateMany({ user: user._id }, { isValid: false });
    clearTokenCookie(res);

    return res.json({
      success: true,
      message: `Your account is now pending deletion. All data is retained until ${deadline.toLocaleDateString()}. You can request account recovery before this deadline.`,
      recoveryDeadline: deadline
    });
  } catch (error) {
    console.error('[Confirm Deletion Error]', error);
    return res.status(500).json({ success: false, message: 'Error confirming account deletion.' });
  }
};

// @desc Get latest dispatched code for an email (fallback polling / instant load)
// @route GET /api/auth/pending-code
const getPendingDispatchedCode = async (req, res) => {
  try {
    const { email, action } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email query parameter is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const filter = {
      email: cleanEmail,
      status: 'sent',
      expiresAt: { $gt: new Date() }
    };

    if (action) {
      filter.action = action;
    }

    const latest = await VerificationCode.findOne(filter).sort({ sentAt: -1, createdAt: -1 });
    if (!latest) {
      return res.json({ success: false, message: 'No dispatched code found.' });
    }

    return res.json({
      success: true,
      code: latest.code,
      action: latest.action,
      email: latest.email,
      sentAt: latest.sentAt
    });
  } catch (err) {
    console.error('[Get Dispatched Code Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve code.' });
  }
};

// @desc Option A: Submit Account Recovery Request for Retained Account
// @route POST /api/auth/recover-account
const submitAccountRecovery = async (req, res) => {
  try {
    const { identifier, password, reason } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide your account username/email and password.' });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // Find the retained account
    const user = await User.findOne({
      $or: [{ username: cleanIdentifier }, { email: cleanIdentifier }],
      deletionStatus: { $in: ['pending_deletion', 'retained'] }
    }).select('+password');

    if (!user) {
      // Check if account exists at all but isn't in deletion — give a better error
      const anyUser = await User.findOne({
        $or: [{ username: cleanIdentifier }, { email: cleanIdentifier }]
      });
      if (anyUser && anyUser.deletionStatus === 'active') {
        return res.status(400).json({
          success: false,
          message: 'This account is active and does not require recovery. Please log in normally.'
        });
      }
      return res.status(404).json({ success: false, message: 'No retained account found with that username or email.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
    }

    // Check if recovery request already exists
    const existingReq = await AccountRecoveryRequest.findOne({
      user: user._id,
      status: 'pending'
    });

    if (existingReq) {
      return res.json({
        success: true,
        message: 'A recovery request is already pending administrator review.',
        requestId: existingReq._id
      });
    }

    const recoveryReq = await AccountRecoveryRequest.create({
      user: user._id,
      email: user.email,
      originalUsername: user.username,
      userNote: reason || 'User requested account restoration during retention period.',
      ipAddress: req.ip
    });

    // Notify user via email
    emailService.sendRecoveryNotificationEmail(user.email, user.username, recoveryReq._id.toString()).catch(() => {});

    return res.status(201).json({
      success: true,
      message: 'Account recovery request submitted. An administrator will review your request shortly.',
      requestId: recoveryReq._id
    });
  } catch (error) {
    console.error('[Submit Recovery Error]', error);
    return res.status(500).json({ success: false, message: 'Error submitting recovery request.' });
  }
};

// @desc Option B: Create Brand New Account while Old Data is retained separately
// @route POST /api/auth/create-alternative-account
const createAlternativeAccount = async (req, res) => {
  try {
    const { email, password, newUsername, nickname, e2eePublicKey } = req.body;

    if (!email || !password || !newUsername) {
      return res.status(400).json({ success: false, message: 'Email, password, and new username are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = newUsername.trim().toLowerCase();

    // Check if new username is available
    const existingUsername = await User.findOne({ username: cleanUsername });
    if (existingUsername) {
      return res.status(400).json({ success: false, message: 'Username is already taken. Please choose another.' });
    }

    // Find any existing account with this email that would block creation
    // Priority: pending_deletion/retained (old archived account) first,
    // then any other status (e.g. a leftover from a previous partial attempt)
    const pendingAccount = await User.findOne({ email: cleanEmail });

    let oldAccountId = null;
    let oldUsername = null;
    let oldOriginalEmail = cleanEmail;

    if (pendingAccount) {
      oldAccountId = pendingAccount._id;
      oldUsername = pendingAccount.username;
      oldOriginalEmail = pendingAccount.email;

      // Archive the email using updateOne (bypasses validators) so unique index is freed
      const archiveEmail = `archived_${pendingAccount._id}_${Date.now()}@archive.pulsechat.internal`;
      await User.updateOne(
        { _id: pendingAccount._id },
        {
          $set: {
            email: archiveEmail,
            archivedEmail: oldOriginalEmail   // preserve original for admin reference
          }
        }
      );
    }

    // Create the brand-new independent account
    const user = await User.create({
      username: cleanUsername,
      email: cleanEmail,
      password,
      nickname: nickname || cleanUsername,
      bio: 'Hey there! I am using PulseChat.',
      avatar: '',
      role: 'user',
      e2eePublicKey: e2eePublicKey || '',
      isEmailVerified: true // Inherits verified email ownership
    });

    // Create session
    const clientInfo = parseClientInfo(req);
    const session = await Session.create({
      user: user._id,
      token: 'init',
      ...clientInfo
    });

    const token = generateToken({ userId: user._id, role: user.role, sessionId: session._id });
    session.token = token;
    await session.save();

    setTokenCookie(res, token);

    // Create a data-migration recovery request (no items selected yet — user picks via /request-data-items)
    let recoveryRequestId = null;
    if (oldAccountId) {
      try {
        const migrationReq = await AccountRecoveryRequest.create({
          user: oldAccountId,
          newAccount: user._id,
          requestType: 'data_migration',
          email: oldOriginalEmail,
          originalEmail: oldOriginalEmail,
          originalUsername: oldUsername,
          requestedItems: [],   // filled in by the next step (POST /request-data-items)
          userNote: `User created a new account (@${cleanUsername}) and may request specific data from their old account.`,
          ipAddress: req.ip
        });
        recoveryRequestId = migrationReq._id;
        // Notify user
        emailService.sendRecoveryNotificationEmail(cleanEmail, cleanUsername, recoveryRequestId.toString()).catch(() => {});
      } catch (e) {
        console.warn('[Alt Account] Could not create migration request:', e.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'New account created successfully.',
      user: user.toJSON(),
      token,
      hasPendingOldAccount: !!oldAccountId,
      recoveryRequestId: recoveryRequestId ? recoveryRequestId.toString() : null
    });
  } catch (error) {
    console.error('[Alternative Account Error]', error);
    return res.status(500).json({ success: false, message: error.message || 'Error creating new account.' });
  }
};

// @desc User selects which data items to request from their old account
// @route POST /api/auth/request-data-items
// Body: { recoveryRequestId, items: ['chats','contacts','call_history','media','profile'] }
const requestDataItems = async (req, res) => {
  try {
    const { recoveryRequestId, items } = req.body;
    if (!recoveryRequestId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'recoveryRequestId and at least one item are required.' });
    }

    const ALLOWED_ITEMS = {
      chats:        'Chat History',
      contacts:     'Contacts & Friends',
      call_history: 'Call History',
      media:        'Shared Media & Files',
      profile:      'Profile Info & Bio'
    };

    const recoveryReq = await AccountRecoveryRequest.findById(recoveryRequestId);
    if (!recoveryReq) {
      return res.status(404).json({ success: false, message: 'Recovery request not found.' });
    }

    // Only allow the new-account owner to update
    if (recoveryReq.newAccount?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorised.' });
    }

    // Build items list — merge with existing, avoid duplicates
    const existingKeys = new Set(recoveryReq.requestedItems.map(i => i.key));
    const newItems = items
      .filter(k => ALLOWED_ITEMS[k] && !existingKeys.has(k))
      .map(k => ({ key: k, label: ALLOWED_ITEMS[k], status: 'pending' }));

    recoveryReq.requestedItems.push(...newItems);
    recoveryReq.status = 'pending'; // ensure overall still pending
    await recoveryReq.save();

    return res.json({
      success: true,
      message: 'Data items requested successfully. An admin will review each one.',
      requestedItems: recoveryReq.requestedItems
    });
  } catch (error) {
    console.error('[Request Data Items Error]', error);
    return res.status(500).json({ success: false, message: 'Error requesting data items.' });
  }
};

// @desc Submit a deletion appeal (public — no auth)
// @route POST /api/auth/deletion-appeal
const deletionAppeal = async (req, res) => {
  try {
    const { email, reason } = req.body;
    if (!email || !reason) {
      return res.status(400).json({ success: false, message: 'Email and reason are required.' });
    }
    const cleanEmail = email.trim().toLowerCase();

    // Notify admin(s) by email (non-blocking)
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);
    const smtpUser = process.env.SMTP_USER;
    const notifyTargets = adminEmails.length ? adminEmails : (smtpUser ? [smtpUser] : []);

    if (notifyTargets.length) {
      const nodemailer = require('nodemailer');
      const host = process.env.SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      const pass = process.env.SMTP_PASS;
      if (host && smtpUser && pass) {
        const transporter = nodemailer.createTransport({
          host, port,
          secure: port === 465,
          auth: { user: smtpUser, pass },
          tls: { rejectUnauthorized: false }
        });
        transporter.sendMail({
          from: process.env.EMAIL_FROM || `"PulseChat Admin" <${smtpUser}>`,
          to: notifyTargets.join(', '),
          subject: `PulseChat Deletion Appeal — ${cleanEmail}`,
          html: `<h2>Account Deletion Appeal</h2><p><strong>From:</strong> ${cleanEmail}</p><p><strong>Reason:</strong></p><blockquote style="border-left:4px solid #6366f1;padding:10px 16px;background:#f5f3ff;margin:12px 0;">${reason.replace(/\n/g, '<br/>')}</blockquote><p style="color:#6b7280;font-size:13px;">Review this appeal in the PulseChat admin panel.</p>`
        }).catch((err) => console.warn('[Appeal] Admin notify error:', err.message));
      }
    }

    return res.json({
      success: true,
      message: 'Your appeal has been submitted. An admin will review it shortly.'
    });
  } catch (error) {
    console.error('[Deletion Appeal Error]', error);
    return res.status(500).json({ success: false, message: 'Error submitting appeal.' });
  }
};

// @desc Logout user
// @route POST /api/auth/logout
const logout = async (req, res) => {
  try {
    if (req.sessionId) {
      await Session.findByIdAndUpdate(req.sessionId, { isValid: false });
    }

    if (req.user) {
      const activeSessions = await Session.countDocuments({ user: req.user._id, isValid: true });
      if (activeSessions <= 1) {
        await User.findByIdAndUpdate(req.user._id, { status: 'offline', lastSeen: new Date() });
      }
    }

    clearTokenCookie(res);
    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error during logout.' });
  }
};

// @desc Logout from all devices
// @route POST /api/auth/logout-all
const logoutAll = async (req, res) => {
  try {
    await Session.updateMany({ user: req.user._id }, { isValid: false });
    await User.findByIdAndUpdate(req.user._id, { status: 'offline', lastSeen: new Date() });
    clearTokenCookie(res);

    return res.json({ success: true, message: 'Logged out from all active sessions.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error terminating all sessions.' });
  }
};

// @desc Get current authenticated user
// @route GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('privacySettings.statusAllowedUsers', 'username nickname avatar')
      .populate('privacySettings.statusExcludedUsers', 'username nickname avatar');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const adminUsernames = (process.env.ADMIN_USERNAMES || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if ((adminEmails.includes(user.email) || adminUsernames.includes(user.username)) && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    return res.json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching profile.' });
  }
};

// @desc Change password
// @route PUT /api/auth/password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new password.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match.' });
    }

    user.password = newPassword;
    await user.save();

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error updating password.' });
  }
};

// @desc Deactivate account temporarily
// @route PUT /api/auth/deactivate
const deactivateAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Password confirmation failed.' });
    }

    user.isDeactivated = true;
    user.status = 'offline';
    await user.save();

    await Session.updateMany({ user: req.user._id }, { isValid: false });
    clearTokenCookie(res);

    return res.json({
      success: true,
      message: 'Account has been deactivated.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error deactivating account.' });
  }
};

// @desc Get status of old retained data & migration requests for current logged-in user
// @route GET /api/auth/old-data-status
const getOldDataStatus = async (req, res) => {
  try {
    const SystemConfig = require('../models/SystemConfig');
    const config = await SystemConfig.findOne({ key: 'system_settings' });
    const isEnabled = config?.featureFlags?.allowOldDataRequests !== false;

    if (!isEnabled) {
      return res.json({
        success: true,
        isEnabled: false,
        message: 'Old data request feature is currently disabled by administrator.'
      });
    }

    // 1. Check if there is an existing data_migration request for this user's account
    let recoveryReq = await AccountRecoveryRequest.findOne({
      $or: [
        { newAccount: req.user._id, requestType: 'data_migration' },
        { originalEmail: req.user.email, requestType: 'data_migration' }
      ]
    })
      .populate('user', 'username email deletionStatus recoveryDeadline deletionReason deletedAt createdAt')
      .sort({ createdAt: -1 });

    let oldAccount = null;

    if (recoveryReq) {
      oldAccount = recoveryReq.user;
    } else {
      // 2. Check if an archived/retained account exists under this email or archivedEmail
      oldAccount = await User.findOne({
        $or: [
          { archivedEmail: req.user.email },
          { email: req.user.email }
        ],
        _id: { $ne: req.user._id },
        deletionStatus: { $in: ['pending_deletion', 'retained', 'deleted_by_admin', 'confirmed_pending_purge'] }
      }).select('username email deletionStatus recoveryDeadline deletionReason deletedAt createdAt');
    }

    return res.json({
      success: true,
      isEnabled: true,
      hasOldAccount: !!oldAccount || !!recoveryReq,
      oldAccount: oldAccount ? {
        _id: oldAccount._id,
        username: oldAccount.username || recoveryReq?.originalUsername,
        email: recoveryReq?.originalEmail || oldAccount.email,
        deletionStatus: oldAccount.deletionStatus,
        recoveryDeadline: oldAccount.recoveryDeadline,
        deletionReason: oldAccount.deletionReason,
        deletedAt: oldAccount.deletedAt
      } : null,
      recoveryRequest: recoveryReq ? {
        _id: recoveryReq._id,
        status: recoveryReq.status,
        requestedItems: recoveryReq.requestedItems || [],
        userNote: recoveryReq.userNote,
        adminDecisionReason: recoveryReq.adminDecisionReason,
        createdAt: recoveryReq.createdAt,
        decidedAt: recoveryReq.decidedAt
      } : null
    });
  } catch (error) {
    console.error('[Get Old Data Status Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve old data status.' });
  }
};

// @desc Request old account data items from profile
// @route POST /api/auth/request-old-data
const requestOldData = async (req, res) => {
  try {
    const SystemConfig = require('../models/SystemConfig');
    const config = await SystemConfig.findOne({ key: 'system_settings' });
    if (config?.featureFlags?.allowOldDataRequests === false) {
      return res.status(403).json({
        success: false,
        message: 'Old data request feature is currently disabled by administrator.'
      });
    }

    const { items, userNote, oldIdentifier, oldPassword } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one data item to request.' });
    }

    const ALLOWED_ITEMS = {
      chats:        'Chat History',
      contacts:     'Contacts & Friends',
      call_history: 'Call History',
      media:        'Shared Media & Files',
      profile:      'Profile Info & Bio'
    };

    // 1. Check existing request for this user
    let recoveryReq = await AccountRecoveryRequest.findOne({
      $or: [
        { newAccount: req.user._id, requestType: 'data_migration' },
        { originalEmail: req.user.email, requestType: 'data_migration' }
      ]
    });

    let oldAccount = null;

    if (!recoveryReq) {
      // Find archived user
      if (oldIdentifier) {
        const cleanOld = oldIdentifier.trim().toLowerCase();
        oldAccount = await User.findOne({
          $or: [
            { username: cleanOld },
            { email: cleanOld },
            { archivedEmail: cleanOld }
          ],
          _id: { $ne: req.user._id },
          deletionStatus: { $in: ['pending_deletion', 'retained', 'deleted_by_admin', 'confirmed_pending_purge'] }
        }).select('+password');

        if (oldAccount && oldPassword) {
          const isMatch = await oldAccount.matchPassword(oldPassword);
          if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid password for the previous account.' });
          }
        }
      }

      if (!oldAccount) {
        oldAccount = await User.findOne({
          $or: [
            { archivedEmail: req.user.email },
            { email: req.user.email }
          ],
          _id: { $ne: req.user._id },
          deletionStatus: { $in: ['pending_deletion', 'retained', 'deleted_by_admin', 'confirmed_pending_purge'] }
        });
      }

      if (!oldAccount) {
        return res.status(404).json({
          success: false,
          message: 'No retained or deleted account found matching your profile. If you have an account under a different username or email, please provide its credentials.'
        });
      }

      // Create new recovery request
      recoveryReq = await AccountRecoveryRequest.create({
        user: oldAccount._id,
        newAccount: req.user._id,
        requestType: 'data_migration',
        email: oldAccount.archivedEmail || req.user.email,
        originalEmail: oldAccount.archivedEmail || req.user.email,
        originalUsername: oldAccount.username,
        requestedItems: [],
        userNote: userNote || `User requested old data via Profile (@${req.user.username})`,
        ipAddress: req.ip
      });
    }

    // Merge requested items
    const existingMap = new Map((recoveryReq.requestedItems || []).map(i => [i.key, i]));
    const updatedItems = [...(recoveryReq.requestedItems || [])];

    items.forEach(key => {
      if (ALLOWED_ITEMS[key]) {
        if (!existingMap.has(key)) {
          updatedItems.push({
            key,
            label: ALLOWED_ITEMS[key],
            status: 'pending'
          });
        } else {
          // If was rejected, reset to pending
          const item = existingMap.get(key);
          if (item.status === 'rejected') {
            item.status = 'pending';
            item.adminNote = '';
            item.decidedAt = undefined;
          }
        }
      }
    });

    recoveryReq.requestedItems = updatedItems;
    recoveryReq.status = 'pending';
    recoveryReq.newAccount = req.user._id;
    if (userNote) {
      recoveryReq.userNote = userNote;
    }

    await recoveryReq.save();

    // Notify admins via socket in real-time
    const io = req.app.get('io');
    if (io) {
      const payload = {
        _id: recoveryReq._id.toString(),
        requestType: 'data_migration',
        originalUsername: recoveryReq.originalUsername,
        originalEmail: recoveryReq.originalEmail,
        newAccount: {
          _id: req.user._id,
          username: req.user.username,
          email: req.user.email
        },
        requestedItems: recoveryReq.requestedItems,
        status: 'pending',
        userNote: recoveryReq.userNote,
        createdAt: recoveryReq.createdAt
      };
      io.to('admin:room').emit('admin:new_recovery_request', payload);
      io.emit('admin:new_recovery_request', payload);
    }

    return res.json({
      success: true,
      message: 'Old data request submitted successfully! An administrator will review your requested items.',
      recoveryRequest: {
        _id: recoveryReq._id,
        status: recoveryReq.status,
        requestedItems: recoveryReq.requestedItems,
        userNote: recoveryReq.userNote
      }
    });
  } catch (error) {
    console.error('[Request Old Data Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to submit old data request.' });
  }
};

module.exports = {
  register,
  verifyEmail,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  login,
  requestAccountDeletion,
  confirmAccountDeletion,
  getPendingDispatchedCode,
  submitAccountRecovery,
  createAlternativeAccount,
  requestDataItems,
  getOldDataStatus,
  requestOldData,
  deletionAppeal,
  logout,
  logoutAll,
  getMe,
  changePassword,
  deactivateAccount
};
