const { verifyToken } = require('../utils/token');
const User = require('../models/User');
const Session = require('../models/Session');

const protect = async (req, res, next) => {
  try {
    let token;

    // Prefer explicit Authorization header over cookies to prevent cookie bleed across tabs
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }

    let decoded = verifyToken(token);
    let userId = decoded?.userId || decoded?.id;
    let user = userId ? await User.findById(userId) : null;

    // Smart Admin Route fallback: If an admin route is accessed and the current token does not have admin role,
    // but the cookie token belongs to an administrator, safely use the admin session.
    const isAdminRoute = (req.baseUrl && req.baseUrl.includes('/admin')) || (req.originalUrl && req.originalUrl.includes('/admin'));
    if (isAdminRoute && (!user || user.role !== 'admin') && req.cookies?.token) {
      try {
        const cookieDecoded = verifyToken(req.cookies.token);
        const cookieUserId = cookieDecoded?.userId || cookieDecoded?.id;
        if (cookieUserId) {
          const cookieUser = await User.findById(cookieUserId);
          if (cookieUser && cookieUser.role === 'admin') {
            user = cookieUser;
            decoded = cookieDecoded;
            token = req.cookies.token;
            userId = cookieUserId;
          }
        }
      } catch {}
    }

    if (!decoded || !userId || !user) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
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
      let session = await Session.findOne({ _id: decoded.sessionId });
      if (!session) {
        if (user.role === 'admin') {
          session = await Session.create({
            _id: decoded.sessionId,
            user: user._id,
            isValid: true,
            lastActive: new Date()
          }).catch(async () => {
            return await Session.findOne({ user: user._id, isValid: true });
          });
        } else {
          return res.status(401).json({ success: false, message: 'Session has been revoked or expired.' });
        }
      } else if (!session.isValid) {
        if (user.role === 'admin') {
          session.isValid = true;
          session.lastActive = new Date();
          await session.save();
        } else {
          return res.status(401).json({ success: false, message: 'Session has been revoked or expired.' });
        }
      } else {
        session.lastActive = new Date();
        await session.save();
      }
      if (session) req.sessionId = session._id;
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
