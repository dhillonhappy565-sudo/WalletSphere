const express = require('express');
const router = express.Router();
const { syncGmailBankAlerts, parseRawBankText } = require('../controllers/bankSyncController');
const { protect } = require('../middleware/authMiddleware');

// Protect all routes with JWT middleware
router.use(protect);

router.post('/sync-gmail', syncGmailBankAlerts);
router.post('/parse-raw', parseRawBankText);

module.exports = router;
