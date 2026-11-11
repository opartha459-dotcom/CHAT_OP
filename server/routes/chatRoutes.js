const express = require('express');
const router = express.Router();
const {
  getConversations,
  getOrCreatePrivateChat,
  togglePin,
  toggleArchive,
  toggleMute,
  deleteConversation,
  markAsRead
} = require('../controllers/chatController');
const { protect } = require('../middlewares/auth');
const { checkFeature } = require('../middlewares/checkFeature');

router.get('/', protect, getConversations);
router.post('/private', protect, checkFeature('chat'), getOrCreatePrivateChat);
router.post('/:id/pin', protect, togglePin);
router.post('/:id/archive', protect, toggleArchive);
router.post('/:id/mute', protect, toggleMute);
router.delete('/:id', protect, deleteConversation);
router.post('/:id/read', protect, markAsRead);

module.exports = router;
