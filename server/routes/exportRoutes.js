const express = require('express');
const router = express.Router();
const { exportChat, exportPersonalData } = require('../controllers/exportController');
const { protect } = require('../middlewares/auth');

router.get('/chat/:id', protect, exportChat);
router.get('/personal-data', protect, exportPersonalData);

module.exports = router;
