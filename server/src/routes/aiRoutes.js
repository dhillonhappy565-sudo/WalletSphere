const express = require('express');
const router = express.Router();
const { chatWithAI, executeAIAction } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/chat', chatWithAI);
router.post('/execute-action', executeAIAction);

module.exports = router;
