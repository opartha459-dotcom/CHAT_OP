const express = require('express');
const router = express.Router();
const {
  register,
  verifyEmail,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  login,
  requestAccountDeletion,
  confirmAccountDeletion,
  submitAccountRecovery,
  createAlternativeAccount,
  logout,
  logoutAll,
  getMe,
  changePassword,
  deactivateAccount
} = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

// Public Authentication & Lifecycle Routes
router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/confirm-deletion', confirmAccountDeletion);
router.post('/recover-account', submitAccountRecovery);
router.post('/create-alternative-account', createAlternativeAccount);

// Protected Routes (Session Required)
router.post('/logout', protect, logout);
router.post('/logout-all', protect, logoutAll);
router.get('/me', protect, getMe);
router.post('/change-password', protect, changePassword);
router.post('/deactivate', protect, deactivateAccount);
router.post('/request-deletion', protect, requestAccountDeletion);

module.exports = router;
