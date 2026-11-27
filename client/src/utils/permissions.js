export const isSuperAdminUser = (user) => user?.role === 'admin';

export const hasPermission = (user, permissionKey) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!permissionKey) return false;
  return Array.isArray(user.effectivePermissions) && user.effectivePermissions.includes(permissionKey);
};

export const hasAnyPermission = (user, permissionKeys = []) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!Array.isArray(permissionKeys) || permissionKeys.length === 0) return false;
  const perms = user.effectivePermissions || [];
  return permissionKeys.some((key) => perms.includes(key));
};

export const hasAdminAccess = (user) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return Array.isArray(user.effectivePermissions) && user.effectivePermissions.length > 0;
};

export const getRoleDisplayLabel = (user) => {
  if (!user) return 'Guest';
  if (user.role === 'admin') return 'Super Admin';
  if (user.customRole?.name) return user.customRole.name;
  return 'User';
};
