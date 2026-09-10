const express = require('express');
const router = express.Router();
const {
  getBudgets,
  setBudget,
  copyPreviousMonthBudgets,
  getBudgetCategoryTransactions,
} = require('../controllers/budgetController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getBudgets)
  .post(setBudget);

router.post('/copy-previous', copyPreviousMonthBudgets);
router.get('/:id/transactions', getBudgetCategoryTransactions);

module.exports = router;
