const express = require('express');
const router = express.Router();
const {
  getMessages,
  sendMessage,
  forwardMessages,
  editMessage,
  deleteMessage,
  reactToMessage,
  searchMessages,
  getCallHistory,
  deleteCallHistory,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  createPoll,
  votePoll,
  closePoll
} = require('../controllers/messageController');
const { protect } = require('../middlewares/auth');
const { checkFeature } = require('../middlewares/checkFeature');

router.get('/search', protect, searchMessages);
router.post('/forward', protect, checkFeature('chat'), forwardMessages);
router.get('/calls/history', protect, getCallHistory);
router.delete('/calls/history', protect, deleteCallHistory);
router.get('/pins/:conversationId', protect, getPinnedMessages);
router.post('/:conversationId/poll', protect, checkFeature('polls'), createPoll);
router.post('/:id/pin', protect, pinMessage);
router.delete('/:id/pin', protect, unpinMessage);
router.post('/:id/poll/vote', protect, checkFeature('polls'), votePoll);
router.post('/:id/poll/close', protect, checkFeature('polls'), closePoll);

router.get('/:conversationId', protect, getMessages);
router.post('/:conversationId', protect, checkFeature('chat'), sendMessage);
router.put('/:id', protect, editMessage);
router.delete('/:id', protect, deleteMessage);
router.post('/:id/react', protect, reactToMessage);

module.exports = router;
