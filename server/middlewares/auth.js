const { verifyToken } = require('../utils/token');
const User = require('../models/User');
const Session = require('../models/Session');

const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
    }

    // Verify user exists and is not banned or deactivated
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User account not found.' });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: `Account is banned. Reason: ${user.banReason || 'Violation of platform terms.'}`,
        isBanned: true
      });
    }

    if (user.isDeactivated) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Please contact support to reactivate.',
        isDeactivated: true
      });
    }

    // Verify session is active
    if (decoded.sessionId) {
      const session = await Session.findOne({ _id: decoded.sessionId, isValid: true });
      if (!session) {
        return res.status(401).json({ success: false, message: 'Session has been revoked or expired.' });
      }
      session.lastActive = new Date();
      await session.save();
      req.sessionId = session._id;
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('[Auth Middleware Error]', error);
    return res.status(500).json({ success: false, message: 'Server error during authentication.' });
  }
};

module.exports = { protect };
