const express = require('express');
const router = express.Router();
const {
  createGroup,
  getGroupDetails,
  updateGroup,
  addMembers,
  removeMember,
  promoteAdmin,
  demoteAdmin,
  transferOwnership,
  leaveGroup,
  generateInviteLink,
  joinByInvite
} = require('../controllers/groupController');
const { protect } = require('../middlewares/auth');
const { checkFeature } = require('../middlewares/checkFeature');

router.post('/', protect, checkFeature('chat'), createGroup);
router.get('/:id', protect, getGroupDetails);
router.put('/:id', protect, updateGroup);
router.post('/:id/members', protect, addMembers);
router.delete('/:id/members/:memberId', protect, removeMember);
router.post('/:id/promote/:memberId', protect, promoteAdmin);
router.post('/:id/demote/:memberId', protect, demoteAdmin);
router.post('/:id/transfer', protect, transferOwnership);
router.post('/:id/leave', protect, leaveGroup);
router.post('/:id/invite', protect, generateInviteLink);
router.post('/join/:code', protect, joinByInvite);

module.exports = router;
