const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getUsers,
  deleteUser,
  banUser,
  unbanUser,
  updateUserRole,
  getReports,
  resolveReport,
  getAuditLogs,
  getAllChats,
  getChatMessages,
  deleteChat,
  deleteAdminMessage
} = require('../controllers/adminController');
const { protect } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/adminAuth');

router.use(protect);
router.use(requireAdmin);

router.get('/stats', getDashboardStats);
router.get('/users', getUsers);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/ban', banUser);
router.post('/users/:id/unban', unbanUser);
router.post('/users/:id/role', updateUserRole);
router.get('/reports', getReports);
router.post('/reports/:id/resolve', resolveReport);
router.get('/audit-logs', getAuditLogs);

// Platform Chat Monitoring & Moderation
router.get('/chats', getAllChats);
router.get('/chats/:id/messages', getChatMessages);
router.delete('/chats/:id', deleteChat);
router.delete('/messages/:id', deleteAdminMessage);

module.exports = router;
