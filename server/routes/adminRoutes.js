const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
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
  getMaintenanceSchedules,
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
  activateMaintenanceSchedule,
  endMaintenanceSchedule,
  cancelMaintenanceSchedule,
  deleteMaintenanceHistory,
  deleteSingleMaintenance
} = require('../controllers/adminController');
const { protect } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/adminAuth');
const upload = require('../middlewares/upload');
const { uploadFile } = require('../controllers/userController');

router.use(protect);
router.use(requireAdmin);

router.get('/stats', getDashboardStats);
router.get('/users', getUsers);
router.put('/users/:id', updateUserAdmin);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/ban', banUser);
router.post('/users/:id/unban', unbanUser);
router.post('/users/:id/role', updateUserRole);
router.get('/reports', getReports);
router.post('/reports/:id/resolve', resolveReport);
router.get('/audit-logs', getAuditLogs);
router.delete('/audit-logs', deleteAuditLogs);

// System & Database Management
router.get('/database/status', getDatabaseStatus);
router.post('/retention/run', runManualRetention);
router.get('/storage/metrics', getStorageMetrics);
router.post('/storage/cleanup', runStorageCleanup);
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);
router.put('/theme', updateSystemTheme);
router.get('/landing', getLandingConfig);
router.put('/landing', updateLandingConfig);
router.get('/contact', getAdminContact);
router.put('/contact', updateAdminContact);
router.post('/upload', upload.single('file'), uploadFile);

// Scheduled Maintenance Management
router.get('/maintenance', getMaintenanceSchedules);
router.post('/maintenance', createMaintenanceSchedule);
router.put('/maintenance/:id', updateMaintenanceSchedule);
router.post('/maintenance/:id/activate', activateMaintenanceSchedule);
router.post('/maintenance/:id/end', endMaintenanceSchedule);
router.delete('/maintenance/history', deleteMaintenanceHistory);
router.delete('/maintenance/:id/permanent', deleteSingleMaintenance);
router.delete('/maintenance/:id', cancelMaintenanceSchedule);
router.get('/recoveries', getRecoveryRequests);
router.post('/recoveries/:id/resolve', resolveRecoveryRequest);
router.post('/recoveries/:id/items/:itemKey/resolve', resolveDataItem);
router.delete('/recoveries', deleteRecoveryRequests);

// Verification Codes (Manual Admin Dispatch & Generation)
router.get('/verification-codes', getVerificationCodes);
router.post('/verification-codes/generate', generateVerificationCode);
router.post('/verification-codes/:id/send', sendVerificationCode);
router.post('/verification-codes/:id/revoke', revokeVerificationCode);
router.delete('/verification-codes', deleteVerificationCodes);

// Platform Chat Monitoring & Moderation
router.get('/chats', getAllChats);
router.get('/chats/:id/messages', getChatMessages);
router.delete('/chats/:id', deleteChat);
router.delete('/messages/:id', deleteAdminMessage);

module.exports = router;
