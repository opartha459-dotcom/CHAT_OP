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
  getRecoveryRequests,
  resolveRecoveryRequest,
  resolveDataItem,
  deleteRecoveryRequests,
  getVerificationCodes,
  sendVerificationCode,
  deleteVerificationCodes,
  runManualRetention
} = require('../controllers/adminController');
const { protect } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/adminAuth');

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
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);
router.get('/recoveries', getRecoveryRequests);
router.post('/recoveries/:id/resolve', resolveRecoveryRequest);
router.post('/recoveries/:id/items/:itemKey/resolve', resolveDataItem);
router.delete('/recoveries', deleteRecoveryRequests);

// Verification Codes (Manual Admin Dispatch)
router.get('/verification-codes', getVerificationCodes);
router.post('/verification-codes/:id/send', sendVerificationCode);
router.delete('/verification-codes', deleteVerificationCodes);

// Platform Chat Monitoring & Moderation
router.get('/chats', getAllChats);
router.get('/chats/:id/messages', getChatMessages);
router.delete('/chats/:id', deleteChat);
router.delete('/messages/:id', deleteAdminMessage);

module.exports = router;
