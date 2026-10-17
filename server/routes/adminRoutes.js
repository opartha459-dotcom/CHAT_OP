const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getUsers,
  banUser,
  unbanUser,
  updateUserRole,
  getReports,
  resolveReport,
  getAuditLogs
} = require('../controllers/adminController');
const { protect } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/adminAuth');

router.use(protect);
router.use(requireAdmin);

router.get('/stats', getDashboardStats);
router.get('/users', getUsers);
router.post('/users/:id/ban', banUser);
router.post('/users/:id/unban', unbanUser);
router.post('/users/:id/role', updateUserRole);
router.get('/reports', getReports);
router.post('/reports/:id/resolve', resolveReport);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
