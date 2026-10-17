const User = require('../models/User');
const Session = require('../models/Session');
const { generateToken, setTokenCookie, clearTokenCookie } = require('../utils/token');

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

    // Check existing
    const existingUser = await User.findOne({
      $or: [{ username: cleanUsername }, { email: cleanEmail }]
    });

    if (existingUser) {
      if (existingUser.username === cleanUsername) {
        return res.status(400).json({ success: false, message: 'Username is already taken.' });
      }
      return res.status(400).json({ success: false, message: 'Email is already registered.' });
    }

    // First user registered or admin email can be given admin role
    const count = await User.countDocuments();
    const isAdminEmail = cleanEmail.startsWith('admin@') || (cleanEmail.includes('admin') && cleanEmail.includes('pulsechat.io'));
    const role = (count === 0 || isAdminEmail) ? 'admin' : 'user';

    const user = await User.create({
      username: cleanUsername,
      email: cleanEmail,
      password,
      nickname: nickname || username,
      bio: bio || 'Hey there! I am using PulseChat.',
      avatar: avatar || '',
      role,
      e2eePublicKey: e2eePublicKey || ''
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

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('[Register Error]', error);
    return res.status(500).json({ success: false, message: error.message || 'Error registering user.' });
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

    if (user.isDeactivated) {
      // Re-activate if logging in with valid credentials
      user.isDeactivated = false;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
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

// @desc Logout user
// @route POST /api/auth/logout
const logout = async (req, res) => {
  try {
    if (req.sessionId) {
      await Session.findByIdAndUpdate(req.sessionId, { isValid: false });
    }

    if (req.user) {
      // Check if user has other active sessions
      const activeSessions = await Session.countDocuments({ user: req.user._id, isValid: true });
      if (activeSessions <= 1) {
        await User.findByIdAndUpdate(req.user._id, { status: 'offline', lastSeen: new Date() });
      }
    }

    clearTokenCookie(res);

    return res.json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error during logout.' });
  }
};

// @desc Logout all devices
// @route POST /api/auth/logout-all
const logoutAll = async (req, res) => {
  try {
    await Session.updateMany({ user: req.user._id }, { isValid: false });
    await User.findByIdAndUpdate(req.user._id, { status: 'offline', lastSeen: new Date() });
    clearTokenCookie(res);

    return res.json({
      success: true,
      message: 'All active sessions have been revoked.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error revoking sessions.' });
  }
};

// @desc Get current logged in user
// @route GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const activeSessionsCount = await Session.countDocuments({ user: req.user._id, isValid: true });

    return res.json({
      success: true,
      user: user.toJSON(),
      activeSessionsCount
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching user profile.' });
  }
};

// @desc Change Password
// @route POST /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    // Invalidate other sessions for security
    await Session.updateMany({ user: req.user._id, _id: { $ne: req.sessionId } }, { isValid: false });

    return res.json({
      success: true,
      message: 'Password changed successfully. Other sessions have been revoked.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error changing password.' });
  }
};

// @desc Deactivate account
// @route POST /api/auth/deactivate
const deactivateAccount = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isDeactivated: true, status: 'offline', lastSeen: new Date() });
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

// @desc Delete account
// @route DELETE /api/auth/delete
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Password confirmation failed.' });
    }

    await User.findByIdAndDelete(req.user._id);
    await Session.deleteMany({ user: req.user._id });
    clearTokenCookie(res);

    return res.json({
      success: true,
      message: 'Account deleted permanently.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error deleting account.' });
  }
};

module.exports = {
  register,
  login,
  logout,
  logoutAll,
  getMe,
  changePassword,
  deactivateAccount,
  deleteAccount
};
