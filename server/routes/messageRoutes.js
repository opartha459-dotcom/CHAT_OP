const express = require('express');
const router = express.Router();
const {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  searchMessages,
  getCallHistory
} = require('../controllers/messageController');
const { protect } = require('../middlewares/auth');

router.get('/search', protect, searchMessages);
router.get('/calls/history', protect, getCallHistory);
router.get('/:conversationId', protect, getMessages);
router.post('/:conversationId', protect, sendMessage);
router.put('/:id', protect, editMessage);
router.delete('/:id', protect, deleteMessage);
router.post('/:id/react', protect, reactToMessage);

module.exports = router;
