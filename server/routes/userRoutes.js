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
  unsubscribePush,
  getCallInfo,
  declineCall,
  answerCall
} = require('../controllers/userController');
const { protect } = require('../middlewares/auth');
const { checkFeature } = require('../middlewares/checkFeature');
const upload = require('../middlewares/upload');

router.get('/push-key', getPushPublicKey);
router.post('/push-subscribe', protect, subscribePush);
router.post('/push-unsubscribe', protect, unsubscribePush);
router.get('/call/:callId', getCallInfo);
router.post('/call/:callId/decline', declineCall);
router.post('/call/:callId/answer', answerCall);

const multer = require('multer');

router.get('/search', protect, searchUsers);
router.get('/blocked', protect, getBlockedUsers);
router.get('/sessions', protect, getActiveSessions);
router.delete('/sessions/:id', protect, revokeSession);

// Upload with multer error handler so size/type rejections return clean JSON
router.post(
  '/upload',
  protect,
  checkFeature('fileSharing'),
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          const msg = err.code === 'LIMIT_FILE_SIZE'
            ? 'File is too large. Maximum size is 50 MB.'
            : err.message || 'File upload error.';
          return res.status(400).json({ success: false, message: msg });
        }
        // fileFilter rejection or other error
        return res.status(400).json({ success: false, message: err.message || 'Unsupported file type.' });
      }
      next();
    });
  },
  uploadFile
);
router.put('/profile', protect, updateProfile);
router.put('/settings/privacy', protect, updatePrivacySettings);
router.put('/settings/chat', protect, updateChatSettings);
router.post('/block/:id', protect, blockUser);
router.post('/unblock/:id', protect, unblockUser);
router.get('/:id', protect, getUserProfile);

module.exports = router;
