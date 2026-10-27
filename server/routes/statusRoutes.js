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

router.use(protect);

router.post('/', createStatus);
router.get('/feed', getStatusFeed);
router.get('/mine', getMyStatuses);
router.post('/:id/view', viewStatus);
router.post('/:id/react', reactToStatus);
router.post('/:id/poll/vote', voteStatusPoll);
router.post('/:id/poll/close', closeStatusPoll);
router.delete('/:id', deleteStatus);

module.exports = router;
