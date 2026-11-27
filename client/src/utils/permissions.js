export const APP_PAGE_OPTIONS = [
  { key: 'chats', label: 'Chats', description: 'Direct messages & chat list' },
  { key: 'stories', label: 'Stories', description: 'Pulse Stories & updates feed' },
  { key: 'calls', label: 'Calls', description: 'Audio/video call history & calling' },
  { key: 'communities', label: 'Communities', description: 'Groups & community channels' },
  { key: 'settings', label: 'Settings', description: 'Account, privacy & theme settings' }
];

const TAB_TO_PAGE_KEY = {
  chats: 'chats',
  updates: 'stories',
  stories: 'stories',
  calls: 'calls',
  communities: 'communities',
  settings: 'settings'
};

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

export const canAccessAppPage = (user, tabOrPageKey) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const pageKey = TAB_TO_PAGE_KEY[tabOrPageKey] || tabOrPageKey;
  const pageAccess = user.customRole?.pageAccess;
  if (!pageAccess || typeof pageAccess !== 'object') return true;
  return pageAccess[pageKey] !== false;
};

export const getRestrictedPageMessage = (user, tabOrPageKey) => {
  const pageKey = TAB_TO_PAGE_KEY[tabOrPageKey] || tabOrPageKey;
  const msgs = user?.customRole?.restrictedMessages || {};
  return (
    msgs[pageKey] ||
    msgs.default ||
    'Access Restricted: You do not have permission to open this page. Please contact your administrator.'
  );
};
