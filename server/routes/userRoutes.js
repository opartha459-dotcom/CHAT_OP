const express = require('express');
const router = express.Router();
const {
  searchUsers,
  getUserProfile,
  updateProfile,
  updatePrivacySettings,
  updateChatSettings,
  blockUser,
  unblockUser,
  getBlockedUsers,
  getActiveSessions,
  revokeSession,
  uploadFile,
  getPushPublicKey,
  subscribePush,
  unsubscribePush
} = require('../controllers/userController');
const { protect } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.get('/push-key', protect, getPushPublicKey);
router.post('/push-subscribe', protect, subscribePush);
router.post('/push-unsubscribe', protect, unsubscribePush);

router.get('/search', protect, searchUsers);
router.get('/blocked', protect, getBlockedUsers);
router.get('/sessions', protect, getActiveSessions);
router.delete('/sessions/:id', protect, revokeSession);
router.post('/upload', protect, upload.single('file'), uploadFile);
router.put('/profile', protect, updateProfile);
router.put('/settings/privacy', protect, updatePrivacySettings);
router.put('/settings/chat', protect, updateChatSettings);
router.post('/block/:id', protect, blockUser);
router.post('/unblock/:id', protect, unblockUser);
router.get('/:id', protect, getUserProfile);

module.exports = router;
