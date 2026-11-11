const express = require('express');
const router = express.Router();
const {
  createStatus,
  getStatusFeed,
  getMyStatuses,
  viewStatus,
  reactToStatus,
  voteStatusPoll,
  closeStatusPoll,
  deleteStatus
} = require('../controllers/statusController');
const { protect } = require('../middlewares/auth');
const { checkFeature } = require('../middlewares/checkFeature');

router.use(protect);

router.post('/', checkFeature('status'), createStatus);
router.get('/feed', getStatusFeed);
router.get('/mine', getMyStatuses);
router.post('/:id/view', viewStatus);
router.post('/:id/react', checkFeature('status'), reactToStatus);
router.post('/:id/poll/vote', checkFeature('status'), voteStatusPoll);
router.post('/:id/poll/close', checkFeature('status'), closeStatusPoll);
router.delete('/:id', deleteStatus);

module.exports = router;
