const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  logoutAll,
  getMe,
  changePassword,
  deactivateAccount,
  deleteAccount
} = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/logout-all', protect, logoutAll);
router.get('/me', protect, getMe);
router.post('/change-password', protect, changePassword);
router.post('/deactivate', protect, deactivateAccount);
router.delete('/delete', protect, deleteAccount);

module.exports = router;
