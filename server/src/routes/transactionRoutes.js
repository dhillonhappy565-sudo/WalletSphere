const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  getTransactions,
  createTransaction,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
} = require('../controllers/transactionController');
const { parseStatement, confirmImport } = require('../controllers/importController');
const { protect } = require('../middleware/authMiddleware');

// Configure Multer in-memory storage for CSV, XLSX, and PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

// All routes are protected by JWT middleware
router.use(protect);

router.post('/import/statement', upload.single('file'), parseStatement);
router.post('/import/parse', upload.single('file'), parseStatement);
router.post('/import/csv', upload.single('file'), parseStatement);
router.post('/import/confirm', confirmImport);

router.route('/')
  .get(getTransactions)
  .post(createTransaction);

router.route('/:id')
  .get(getTransactionById)
  .put(updateTransaction)
  .delete(deleteTransaction);

module.exports = router;
