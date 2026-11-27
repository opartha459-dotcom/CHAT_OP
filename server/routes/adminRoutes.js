const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAnalytics,
  getUsers,
  deleteUser,
  banUser,
  unbanUser,
  updateUserRole,
  updateUserAdmin,
  getReports,
  resolveReport,
  getAuditLogs,
  deleteAuditLogs,
  getAllChats,
  getChatMessages,
  deleteChat,
  deleteAdminMessage,
  getDatabaseStatus,
  getSystemSettings,
  updateSystemSettings,
  updateSystemTheme,
  getLandingConfig,
  updateLandingConfig,
  getAdminContact,
  updateAdminContact,
  getStorageMetrics,
  runStorageCleanup,
  getRecoveryRequests,
  resolveRecoveryRequest,
  resolveDataItem,
  deleteRecoveryRequests,
  getVerificationCodes,
  sendVerificationCode,
  generateVerificationCode,
  revokeVerificationCode,
  deleteVerificationCodes,
  runManualRetention,
  getTrashAccounts,
  restoreTrashAccount,
  purgeTrashAccount,
  purgeExpiredTrashAccounts,
  getMaintenanceSchedules,
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
  activateMaintenanceSchedule,
  endMaintenanceSchedule,
  cancelMaintenanceSchedule,
  deleteMaintenanceHistory,
  deleteSingleMaintenance,
  getAdminStories,
  getAdminStoryReplies,
  createAdminStory,
  updateAdminStory,
  deleteAdminStory,
  toggleAdminStoryPoll,
  getOfficialConversationMessages,
  sendOfficialReply,
  deleteAdminConversation
} = require('../controllers/adminController');
const {
  getPermissionCatalog,
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  duplicateRole,
  deleteRole,
  assignCustomRoleToUser
} = require('../controllers/roleController');
const { protect } = require('../middlewares/auth');
const {
  requireAdmin,
  requireSuperAdmin,
  requirePermission,
  requireAnyPermission
} = require('../middlewares/adminAuth');
const upload = require('../middlewares/upload');
const { uploadFile } = require('../controllers/userController');

router.use(protect);
router.use(requireAdmin);

// RBAC: Role & Permission Management (Super Admin Only)
router.get('/permissions', requireSuperAdmin, getPermissionCatalog);
router.get('/roles', requireSuperAdmin, getRoles);
router.get('/roles/:id', requireSuperAdmin, getRoleById);
router.post('/roles', requireSuperAdmin, createRole);
router.put('/roles/:id', requireSuperAdmin, updateRole);
router.post('/roles/:id/duplicate', requireSuperAdmin, duplicateRole);
router.delete('/roles/:id', requireSuperAdmin, deleteRole);
router.put('/users/:id/custom-role', requireSuperAdmin, assignCustomRoleToUser);

// Overview & Analytics
router.get('/stats', requirePermission('analytics.view'), getDashboardStats);
router.get('/analytics', requirePermission('analytics.view'), getAnalytics);

// User Management
router.get('/users', requirePermission('users.view'), getUsers);
router.put('/users/:id', requirePermission('users.edit'), updateUserAdmin);
router.delete('/users/:id', requirePermission('users.delete'), deleteUser);
router.post('/users/:id/ban', requirePermission('users.ban'), banUser);
router.post('/users/:id/unban', requirePermission('users.unban'), unbanUser);
router.post('/users/:id/role', requireSuperAdmin, updateUserRole);

// Reports & Audit Logs
router.get('/reports', requirePermission('reports.view'), getReports);
router.post('/reports/:id/resolve', requirePermission('reports.resolve'), resolveReport);
router.get('/audit-logs', requirePermission('audit.view'), getAuditLogs);
router.delete('/audit-logs', requireSuperAdmin, deleteAuditLogs);

// System & Database Management
router.get('/database/status', requireAnyPermission(['database.view', 'analytics.view']), getDatabaseStatus);
router.post('/retention/run', requirePermission('database.cleanup'), runManualRetention);
router.get('/trash/accounts', requirePermission('users.manage_deletion_requests'), getTrashAccounts);
router.post('/trash/restore/:id', requirePermission('users.manage_deletion_requests'), restoreTrashAccount);
router.delete('/trash/purge/:id', requirePermission('users.manage_deletion_requests'), purgeTrashAccount);
router.post('/trash/purge-expired', requirePermission('users.manage_deletion_requests'), purgeExpiredTrashAccounts);
router.get('/storage/metrics', requirePermission('database.view'), getStorageMetrics);
router.post('/storage/cleanup', requirePermission('database.cleanup'), runStorageCleanup);
router.get('/settings', requireAnyPermission(['system.manage_settings', 'system.manage_features']), getSystemSettings);
router.put('/settings', requireAnyPermission(['system.manage_settings', 'system.manage_features']), updateSystemSettings);
router.put('/theme', requirePermission('system.manage_theme'), updateSystemTheme);
router.get('/landing', requirePermission('system.manage_landing'), getLandingConfig);
router.put('/landing', requirePermission('system.manage_landing'), updateLandingConfig);
router.get('/contact', requirePermission('system.manage_settings'), getAdminContact);
router.put('/contact', requirePermission('system.manage_settings'), updateAdminContact);
router.post('/upload', requireAnyPermission(['statuses.create', 'statuses.edit', 'system.manage_landing', 'system.manage_settings']), upload.single('file'), uploadFile);

// Scheduled Maintenance Management
router.get('/maintenance', requirePermission('system.manage_maintenance'), getMaintenanceSchedules);
router.post('/maintenance', requirePermission('system.manage_maintenance'), createMaintenanceSchedule);
router.put('/maintenance/:id', requirePermission('system.manage_maintenance'), updateMaintenanceSchedule);
router.post('/maintenance/:id/activate', requirePermission('system.manage_maintenance'), activateMaintenanceSchedule);
router.post('/maintenance/:id/end', requirePermission('system.manage_maintenance'), endMaintenanceSchedule);
router.delete('/maintenance/history', requirePermission('system.manage_maintenance'), deleteMaintenanceHistory);
router.delete('/maintenance/:id/permanent', requirePermission('system.manage_maintenance'), deleteSingleMaintenance);
router.delete('/maintenance/:id', requirePermission('system.manage_maintenance'), cancelMaintenanceSchedule);
router.get('/recoveries', requirePermission('recoveries.view'), getRecoveryRequests);
router.post('/recoveries/:id/resolve', requirePermission('recoveries.resolve'), resolveRecoveryRequest);
router.post('/recoveries/:id/items/:itemKey/resolve', requirePermission('recoveries.resolve'), resolveDataItem);
router.delete('/recoveries', requirePermission('recoveries.resolve'), deleteRecoveryRequests);

// Verification Codes (Manual Admin Dispatch & Generation)
router.get('/verification-codes', requirePermission('codes.view'), getVerificationCodes);
router.post('/verification-codes/generate', requirePermission('codes.generate'), generateVerificationCode);
router.post('/verification-codes/:id/send', requirePermission('codes.generate'), sendVerificationCode);
router.post('/verification-codes/:id/revoke', requirePermission('codes.revoke'), revokeVerificationCode);
router.delete('/verification-codes', requirePermission('codes.revoke'), deleteVerificationCodes);

// Platform Chat Monitoring & Moderation
router.get('/chats', requirePermission('chats.view'), getAllChats);
router.get('/chats/:id/messages', requirePermission('chats.view'), getChatMessages);
router.delete('/chats/:id', requirePermission('chats.delete'), deleteChat);
router.delete('/messages/:id', requirePermission('chats.moderate_messages'), deleteAdminMessage);

// Official PulseChat Stories & Replies
router.get('/stories', requirePermission('statuses.view'), getAdminStories);
router.get('/stories/replies', requirePermission('statuses.view'), getAdminStoryReplies);
router.get('/stories/replies/conversation/:userId', requirePermission('statuses.view'), getOfficialConversationMessages);
router.post('/stories/replies/send', requirePermission('statuses.reply'), sendOfficialReply);
router.delete('/stories/replies/conversation/:id', requirePermission('statuses.delete'), deleteAdminConversation);
router.post('/stories', requirePermission('statuses.create'), createAdminStory);
router.put('/stories/:id', requirePermission('statuses.edit'), updateAdminStory);
router.delete('/stories/:id', requirePermission('statuses.delete'), deleteAdminStory);
router.post('/stories/:id/poll/close', requirePermission('statuses.edit'), toggleAdminStoryPoll);

module.exports = router;
