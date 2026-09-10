const RecurringBill = require('../models/RecurringBill');
const Transaction = require('../models/Transaction');

// Helper to check if a bill was paid in current month transactions
const findMatchingTransaction = (bill, currentMonthTransactions) => {
  const billTitleLower = bill.title.toLowerCase().trim();

  return currentMonthTransactions.find((tx) => {
    const txDescLower = tx.description.toLowerCase().trim();
    const titleMatch = txDescLower.includes(billTitleLower) || billTitleLower.includes(txDescLower);
    const amountMatch = Math.abs(tx.amount - bill.amount) / bill.amount <= 0.15;

    return titleMatch || (tx.category === bill.category && amountMatch);
  });
};

// @desc    Get user recurring bills
// @route   GET /api/bills
// @access  Private
const getRecurringBills = async (req, res) => {
  try {
    const userId = req.user._id;
    let bills = await RecurringBill.find({ user: userId }).sort({ dueDateDay: 1 });

    // Seed default starter bills if user has none
    if (bills.length === 0) {
      const defaultBills = [
        { title: 'House Rent', amount: 15000, category: 'Bills', dueDateDay: 5, autoDebit: true },
        { title: 'Car EMI', amount: 8500, category: 'Bills', dueDateDay: 10, autoDebit: true },
        { title: 'Broadband WiFi', amount: 999, category: 'Bills', dueDateDay: 15, autoDebit: false },
        { title: 'Netflix Subscription', amount: 649, category: 'Entertainment', dueDateDay: 22, autoDebit: true },
      ];

      bills = await RecurringBill.insertMany(
        defaultBills.map((b) => ({ ...b, user: userId }))
      );
    }

    const now = new Date();
    const currentMonthKey = now.toISOString().slice(0, 7); // e.g. '2026-07'
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const currentMonthTx = await Transaction.find({
      user: userId,
      type: 'expense',
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });

    const today = new Date();
    const currentDay = today.getDate();

    const formattedBills = await Promise.all(
      bills.map(async (bill) => {
        const isManuallyUnpaidThisMonth = bill.lastUnpaidMonth === currentMonthKey;

        let matchingTx = null;
        if (!isManuallyUnpaidThisMonth) {
          matchingTx = findMatchingTransaction(bill, currentMonthTx);
        }

        const isPaid = !isManuallyUnpaidThisMonth && (bill.isPaid || !!matchingTx);

        const diff = bill.dueDateDay - currentDay;
        let status = 'upcoming';

        if (isPaid) {
          status = 'paid';
        } else if (diff < 0) {
          status = 'overdue';
        } else if (diff <= 5) {
          status = 'due_soon';
        }

        return {
          ...bill.toObject(),
          isPaid,
          status,
          daysLeft: diff,
          autoPaidDetected: !isManuallyUnpaidThisMonth && !!matchingTx,
        };
      })
    );

    return res.status(200).json({
      status: 'success',
      data: {
        bills: formattedBills,
      },
    });
  } catch (error) {
    console.error('Error fetching recurring bills:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch recurring bills',
    });
  }
};

// @desc    Create a new recurring bill / EMI / subscription
// @route   POST /api/bills
// @access  Private
const createRecurringBill = async (req, res) => {
  try {
    const { title, amount, category, dueDateDay, autoDebit } = req.body;

    if (!title || !amount || !dueDateDay) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide title, amount, and due date day.',
      });
    }

    const bill = await RecurringBill.create({
      user: req.user._id,
      title,
      amount,
      category: category || 'Bills',
      dueDateDay: parseInt(dueDateDay, 10),
      autoDebit: !!autoDebit,
    });

    return res.status(201).json({
      status: 'success',
      data: { bill },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create recurring bill',
    });
  }
};

// @desc    Update recurring bill / EMI / subscription
// @route   PUT /api/bills/:id
// @access  Private
const updateRecurringBill = async (req, res) => {
  try {
    const { title, amount, category, dueDateDay, autoDebit, isPaid } = req.body;
    const bill = await RecurringBill.findOne({ _id: req.params.id, user: req.user._id });

    if (!bill) {
      return res.status(404).json({ status: 'fail', message: 'Bill not found' });
    }

    if (title !== undefined) bill.title = title;
    if (amount !== undefined) bill.amount = amount;
    if (category !== undefined) bill.category = category;
    if (dueDateDay !== undefined) bill.dueDateDay = parseInt(dueDateDay, 10);
    if (autoDebit !== undefined) bill.autoDebit = !!autoDebit;
    if (isPaid !== undefined) {
      bill.isPaid = !!isPaid;
      if (isPaid) bill.lastUnpaidMonth = null;
    }

    await bill.save();

    return res.status(200).json({
      status: 'success',
      data: { bill },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update recurring bill',
    });
  }
};

// @desc    Delete recurring bill & cleanup linked transaction
// @route   DELETE /api/bills/:id
// @access  Private
const deleteRecurringBill = async (req, res) => {
  try {
    const bill = await RecurringBill.findOne({ _id: req.params.id, user: req.user._id });

    if (!bill) {
      return res.status(404).json({ status: 'fail', message: 'Bill not found' });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    if (bill.linkedTransactionId) {
      await Transaction.findByIdAndDelete(bill.linkedTransactionId);
    }

    // Delete any matching bill payment transaction in current month
    await Transaction.deleteMany({
      user: req.user._id,
      type: 'expense',
      date: { $gte: startOfMonth, $lte: endOfMonth },
      description: { $regex: bill.title, $options: 'i' },
    });

    await bill.deleteOne();

    return res.status(200).json({
      status: 'success',
      message: 'Recurring bill deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete recurring bill',
    });
  }
};

// @desc    Mark recurring bill as paid & log transaction without duplicates
// @route   POST /api/bills/:id/pay
// @access  Private
const markBillPaid = async (req, res) => {
  try {
    const bill = await RecurringBill.findOne({ _id: req.params.id, user: req.user._id });
    if (!bill) {
      return res.status(404).json({ status: 'fail', message: 'Bill not found' });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Check if an expense transaction for this bill already exists in current month
    let existingTx = null;
    if (bill.linkedTransactionId) {
      existingTx = await Transaction.findById(bill.linkedTransactionId);
    }

    if (!existingTx) {
      existingTx = await Transaction.findOne({
        user: req.user._id,
        type: 'expense',
        description: `Bill Payment: ${bill.title}`,
        date: { $gte: startOfMonth, $lte: endOfMonth },
      });
    }

    const validCategories = [
      'Food', 'Shopping', 'Travel', 'Entertainment', 'Bills',
      'Healthcare', 'Salary', 'Investment', 'Transfer & Reimbursement', 'Others'
    ];
    const txCategory = validCategories.includes(bill.category) ? bill.category : 'Bills';

    if (!existingTx) {
      existingTx = await Transaction.create({
        user: req.user._id,
        description: `Bill Payment: ${bill.title}`,
        amount: bill.amount,
        type: 'expense',
        category: txCategory,
        date: new Date(),
        paymentMethod: bill.autoDebit ? 'Auto Debit' : 'UPI',
        source: 'manual',
      });
    }

    bill.isPaid = true;
    bill.lastUnpaidMonth = null;
    bill.linkedTransactionId = existingTx._id;
    await bill.save();

    return res.status(200).json({
      status: 'success',
      data: { bill, transaction: existingTx },
    });
  } catch (error) {
    console.error('Error marking bill paid:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to mark bill paid',
    });
  }
};

// @desc    Mark recurring bill as unpaid & remove logged transaction from spent calculations
// @route   POST /api/bills/:id/unpay
// @access  Private
const markBillUnpaid = async (req, res) => {
  try {
    const bill = await RecurringBill.findOne({ _id: req.params.id, user: req.user._id });
    if (!bill) {
      return res.status(404).json({ status: 'fail', message: 'Bill not found' });
    }

    const now = new Date();
    const currentMonthKey = now.toISOString().slice(0, 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 1. Delete linked transaction if present
    if (bill.linkedTransactionId) {
      await Transaction.findByIdAndDelete(bill.linkedTransactionId);
    }

    // 2. Delete any matching bill payment transaction in current month
    await Transaction.deleteMany({
      user: req.user._id,
      type: 'expense',
      date: { $gte: startOfMonth, $lte: endOfMonth },
      $or: [
        { description: `Bill Payment: ${bill.title}` },
        { description: { $regex: bill.title, $options: 'i' } },
      ],
    });

    bill.isPaid = false;
    bill.lastUnpaidMonth = currentMonthKey;
    bill.linkedTransactionId = null;
    await bill.save();

    return res.status(200).json({
      status: 'success',
      data: { bill },
    });
  } catch (error) {
    console.error('Error marking bill unpaid:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to mark bill unpaid',
    });
  }
};

module.exports = {
  getRecurringBills,
  createRecurringBill,
  updateRecurringBill,
  deleteRecurringBill,
  markBillPaid,
  markBillUnpaid,
};
