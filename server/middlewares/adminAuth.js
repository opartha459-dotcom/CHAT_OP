const { ALL_PERMISSION_KEYS, sanitizePermissions } = require('../config/permissions');

/**
 * Resolve effective RBAC capabilities for an authenticated user.
 * Super Admin (role === 'admin') always has full system-level access.
 */
const resolveUserAccess = (user) => {
  if (!user) {
    return {
      isSuperAdmin: false,
      customRole: null,
      effectivePermissions: []
    };
  }

  if (user.role === 'admin') {
    return {
      isSuperAdmin: true,
      customRole: null,
      effectivePermissions: [...ALL_PERMISSION_KEYS]
    };
  }

  const roleDoc = user.customRole && typeof user.customRole === 'object' ? user.customRole : null;
  const effectivePermissions = roleDoc ? sanitizePermissions(roleDoc.permissions) : [];

  return {
    isSuperAdmin: false,
    customRole: roleDoc
      ? {
          _id: roleDoc._id,
          name: roleDoc.name,
          slug: roleDoc.slug,
          description: roleDoc.description || '',
          permissions: effectivePermissions
        }
      : null,
    effectivePermissions
  };
};

/**
 * Allows Super Admin or any user with an assigned custom role that has at least 1 valid permission.
 */
const requireAdmin = (req, res, next) => {
  const access = resolveUserAccess(req.user);
  if (!access.isSuperAdmin && access.effectivePermissions.length === 0) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrative privileges required.'
    });
  }
  req.rbac = access;
  next();
};

/**
 * Strictly requires protected Super Admin (role === 'admin').
 * Custom roles can NEVER bypass this boundary.
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super Admin privileges required.'
    });
  }
  req.rbac = resolveUserAccess(req.user);
  next();
};

/**
 * Enforces a specific granular permission from the centralized permission catalog.
 */
const requirePermission = (permissionKey) => (req, res, next) => {
  const access = req.rbac || resolveUserAccess(req.user);
  if (access.isSuperAdmin || access.effectivePermissions.includes(permissionKey)) {
    req.rbac = access;
    return next();
  }
  return res.status(403).json({
    success: false,
    message: `Access denied. Missing required permission: ${permissionKey}`
  });
};

/**
 * Enforces that the user has at least one of the listed permissions.
 */
const requireAnyPermission = (permissionKeys = []) => (req, res, next) => {
  const access = req.rbac || resolveUserAccess(req.user);
  if (
    access.isSuperAdmin ||
    permissionKeys.some((k) => access.effectivePermissions.includes(k))
  ) {
    req.rbac = access;
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied. Insufficient permissions.'
  });
};

module.exports = {
  resolveUserAccess,
  requireAdmin,
  requireAdminAccess: requireAdmin,
  requireSuperAdmin,
  requirePermission,
  requireAnyPermission
};
