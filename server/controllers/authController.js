const crypto = require('crypto');
const User = require('../models/User');
const Session = require('../models/Session');
const AccountRecoveryRequest = require('../models/AccountRecoveryRequest');
const { generateToken, setTokenCookie, clearTokenCookie } = require('../utils/token');
const emailService = require('../services/emailService');

// Helper to hash single-use tokens with SHA-256
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
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

    // Generate email verification token (expires in 24 hours)
    const verificationRawToken = crypto.randomBytes(32).toString('hex');
    const verificationHash = hashToken(verificationRawToken);

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

    // Send verification email asynchronously
    emailService.sendVerificationEmail(cleanEmail, user.username, verificationRawToken).catch((err) => {
      console.warn('[Email] Verification send error:', err.message);
    });

    // Do NOT automatically log in or create active session! User must verify email first.
    return res.status(201).json({
      success: true,
      requiresEmailVerification: true,
      email: cleanEmail,
      username: user.username,
      message: 'Registration successful! A verification link has been sent to your email. Please verify your email to log in.'
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
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is required.' });
    }

    const hashed = hashToken(token);

    // First: check if the token exists at all (ignoring expiry)
    const userWithToken = await User.findOne({ emailVerificationToken: hashed }).select('+emailVerificationToken +emailVerificationExpires');

    if (!userWithToken) {
      // Token not in DB at all — could be already verified or truly invalid
      return res.status(400).json({
        success: false,
        expired: true,
        message: 'This verification link is invalid or has already been used. Enter your email below to get a fresh link.'
      });
    }

    // Token exists — check if already verified
    if (userWithToken.isEmailVerified) {
      return res.json({ success: true, message: 'Your email is already verified. You can sign in.' });
    }

    // Token expired — auto-generate a new one and resend
    if (!userWithToken.emailVerificationExpires || userWithToken.emailVerificationExpires < new Date()) {
      const verificationRawToken = crypto.randomBytes(32).toString('hex');
      userWithToken.emailVerificationToken = hashToken(verificationRawToken);
      userWithToken.emailVerificationExpires = new Date(Date.now() + 72 * 3600 * 1000); // 72 hours
      await userWithToken.save();

      emailService.sendVerificationEmail(userWithToken.email, userWithToken.username, verificationRawToken).catch((err) => {
        console.warn('[Email] Re-verification send error:', err.message);
      });

      return res.status(400).json({
        success: false,
        expired: true,
        email: userWithToken.email,
        message: 'Your verification link had expired. A fresh link has been sent to your email — please check your inbox.'
      });
    }

    // Valid — verify the account
    userWithToken.isEmailVerified = true;
    userWithToken.emailVerificationToken = undefined;
    userWithToken.emailVerificationExpires = undefined;
    await userWithToken.save();

    return res.json({
      success: true,
      message: 'Your email address has been verified successfully.'
    });
  } catch (error) {
    console.error('[Verify Email Error]', error);
    return res.status(500).json({ success: false, message: 'Error verifying email.' });
  }
};

// @desc Resend verification email
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

    const verificationRawToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = hashToken(verificationRawToken);
    user.emailVerificationExpires = new Date(Date.now() + 72 * 3600 * 1000);
    await user.save();

    await emailService.sendVerificationEmail(user.email, user.username, verificationRawToken);

    return res.json({
      success: true,
      message: `A fresh verification link has been sent to ${user.email}. Please check your inbox or spam folder.`
    });
  } catch (error) {
    console.error('[Resend Verification Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to resend verification email.' });
  }
};

// @desc Request Password Reset Email
// @route POST /api/auth/forgot-password
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    // Always respond with success to avoid leaking account existence
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been dispatched.'
      });
    }

    const resetRawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = hashToken(resetRawToken);
    user.passwordResetExpires = new Date(Date.now() + 3600 * 1000); // 1 hour
    await user.save();

    emailService.sendPasswordResetEmail(cleanEmail, user.username, resetRawToken).catch((err) => {
      console.warn('[Email] Reset send error:', err.message);
    });

    return res.json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been dispatched.'
    });
  } catch (error) {
    console.error('[Forgot Password Error]', error);
    return res.status(500).json({ success: false, message: 'Error processing password reset request.' });
  }
};

// @desc Reset password with token
// @route POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const hashed = hashToken(token);
    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: new Date() }
    }).select('+password');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset link.' });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Revoke previous sessions on password reset for security
    await Session.updateMany({ user: user._id }, { isValid: false });

    return res.json({
      success: true,
      message: 'Your password has been reset successfully. Please log in with your new password.'
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

// @desc Request Account Deletion (State 1: Sends email, keeps account active until confirmed)
// @route POST /api/auth/request-deletion
const requestAccountDeletion = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect password.' });
    }

    const deletionRawToken = crypto.randomBytes(32).toString('hex');
    user.deletionConfirmationToken = hashToken(deletionRawToken);
    user.deletionConfirmationExpires = new Date(Date.now() + 2 * 3600 * 1000); // 2 hours
    user.deletionRequestedAt = new Date();
    await user.save();

    await emailService.sendDeletionConfirmationEmail(user.email, user.username, deletionRawToken, 14);

    return res.json({
      success: true,
      message: 'A deletion confirmation email has been dispatched. Your account remains active until you confirm via the link in your email.'
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
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Confirmation token is required.' });
    }

    const hashed = hashToken(token);
    const user = await User.findOne({
      deletionConfirmationToken: hashed,
      deletionConfirmationExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired deletion confirmation link.' });
    }

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
    const user = await User.findById(req.user._id);
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

module.exports = {
  register,
  verifyEmail,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  login,
  requestAccountDeletion,
  confirmAccountDeletion,
  submitAccountRecovery,
  createAlternativeAccount,
  requestDataItems,
  deletionAppeal,
  logout,
  logoutAll,
  getMe,
  changePassword,
  deactivateAccount
};
