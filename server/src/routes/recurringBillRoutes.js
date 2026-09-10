const express = require('express');
const router = express.Router();
const {
  getRecurringBills,
  createRecurringBill,
  updateRecurringBill,
  deleteRecurringBill,
  markBillPaid,
  markBillUnpaid,
} = require('../controllers/recurringBillController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getRecurringBills)
  .post(createRecurringBill);

router.route('/:id')
  .put(updateRecurringBill)
  .delete(deleteRecurringBill);

router.post('/:id/pay', markBillPaid);
router.post('/:id/unpay', markBillUnpaid);

module.exports = router;
