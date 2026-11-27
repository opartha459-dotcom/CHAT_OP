const PERMISSION_GROUPS = [
  {
    id: 'overview',
    label: 'Dashboard & Analytics',
    description: 'View platform metrics, KPIs, and analytics charts',
    permissions: [
      { key: 'analytics.view', label: 'View Dashboard & Analytics', description: 'Access overview statistics and real-time charts' }
    ]
  },
  {
    id: 'users',
    label: 'User Management',
    description: 'Inspect, edit, ban, and remove user accounts',
    permissions: [
      { key: 'users.view', label: 'View Users', description: 'View user list and account details' },
      { key: 'users.edit', label: 'Edit Users', description: 'Edit user profile fields and official contact badge' },
      { key: 'users.ban', label: 'Ban Users', description: 'Suspend user accounts with ban reason' },
      { key: 'users.unban', label: 'Unban Users', description: 'Restore banned user accounts' },
      { key: 'users.delete', label: 'Delete Users', description: 'Move user accounts to trash or permanently delete' },
      { key: 'users.manage_deletion_requests', label: 'Manage Trash & Deletions', description: 'Restore or purge trashed accounts' }
    ]
  },
  {
    id: 'chats',
    label: 'Chats, Groups & Moderation',
    description: 'Monitor conversations and moderate messages',
    permissions: [
      { key: 'chats.view', label: 'View Chats & Groups', description: 'View platform conversations, groups, and messages' },
      { key: 'chats.moderate_messages', label: 'Moderate Messages', description: 'Delete messages across conversations' },
      { key: 'chats.delete', label: 'Delete Conversations', description: 'Delete entire chats or groups' }
    ]
  },
  {
    id: 'statuses',
    label: 'Official Stories & Statuses',
    description: 'Publish and manage official platform stories',
    permissions: [
      { key: 'statuses.view', label: 'View Stories & Replies', description: 'View official stories and user replies' },
      { key: 'statuses.create', label: 'Create Stories', description: 'Publish official PulseChat stories' },
      { key: 'statuses.edit', label: 'Edit Stories', description: 'Update existing official stories and polls' },
      { key: 'statuses.delete', label: 'Delete Stories', description: 'Remove official stories or reply threads' },
      { key: 'statuses.reply', label: 'Reply to Story Messages', description: 'Send official replies to users' }
    ]
  },
  {
    id: 'announcements',
    label: 'Announcements',
    description: 'Create and manage global platform announcements',
    permissions: [
      { key: 'announcements.view', label: 'View Announcements', description: 'View all platform announcements' },
      { key: 'announcements.create', label: 'Create Announcements', description: 'Publish new announcements and polls' },
      { key: 'announcements.edit', label: 'Edit Announcements', description: 'Update announcements or toggle polls' },
      { key: 'announcements.delete', label: 'Delete Announcements', description: 'Delete announcements' }
    ]
  },
  {
    id: 'reports',
    label: 'Reports & Safety',
    description: 'Review and resolve user-submitted abuse reports',
    permissions: [
      { key: 'reports.view', label: 'View Reports', description: 'View submitted user and message reports' },
      { key: 'reports.resolve', label: 'Resolve / Reject Reports', description: 'Take action on or dismiss reports' }
    ]
  },
  {
    id: 'security',
    label: 'Security, Codes & Audit Logs',
    description: 'Manage verification codes, recoveries, and audit logs',
    permissions: [
      { key: 'codes.view', label: 'View Verification Codes', description: 'View dispatched and pending verification codes' },
      { key: 'codes.generate', label: 'Generate & Dispatch Codes', description: 'Generate or send verification codes to users' },
      { key: 'codes.revoke', label: 'Revoke / Delete Codes', description: 'Revoke or remove verification codes' },
      { key: 'recoveries.view', label: 'View Account Recoveries', description: 'View account recovery and deletion appeals' },
      { key: 'recoveries.resolve', label: 'Resolve Account Recoveries', description: 'Approve, reject, or clear recovery requests' },
      { key: 'audit.view', label: 'View Admin Activity Logs', description: 'Read-only access to administrative audit logs' }
    ]
  },
  {
    id: 'system',
    label: 'System, Theme & Maintenance',
    description: 'Configure settings, theme, landing CMS, and maintenance',
    permissions: [
      { key: 'system.manage_settings', label: 'Manage App Settings & Contact', description: 'Edit general system settings and official contact' },
      { key: 'system.manage_features', label: 'Manage Feature Flags', description: 'Toggle platform features on or off' },
      { key: 'system.manage_theme', label: 'Manage Theme & Typography', description: 'Customize platform theme, colors, and fonts' },
      { key: 'system.manage_landing', label: 'Manage Landing Page CMS', description: 'Edit public landing page content' },
      { key: 'system.manage_maintenance', label: 'Manage Maintenance Mode', description: 'Schedule, activate, or cancel maintenance windows' }
    ]
  },
  {
    id: 'database',
    label: 'Database & Storage',
    description: 'Monitor database health and run storage cleanup',
    permissions: [
      { key: 'database.view', label: 'View Database & Storage Metrics', description: 'View database health and storage usage' },
      { key: 'database.cleanup', label: 'Run Retention & Storage Cleanup', description: 'Trigger retention jobs and clean unused files' }
    ]
  }
];

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));
const VALID_PERMISSION_SET = new Set(ALL_PERMISSION_KEYS);

const isValidPermission = (key) => typeof key === 'string' && VALID_PERMISSION_SET.has(key);

const sanitizePermissions = (permissions) => {
  if (!Array.isArray(permissions)) return [];
  return [...new Set(permissions.filter(isValidPermission))];
};

module.exports = {
  PERMISSION_GROUPS,
  ALL_PERMISSION_KEYS,
  VALID_PERMISSION_SET,
  isValidPermission,
  sanitizePermissions
};
