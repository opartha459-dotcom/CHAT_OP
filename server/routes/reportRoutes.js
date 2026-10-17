const express = require('express');
const router = express.Router();
const { createReport, getMyReports } = require('../controllers/reportController');
const { protect } = require('../middlewares/auth');

router.post('/', protect, createReport);
router.get('/my', protect, getMyReports);

module.exports = router;
