const Transaction = require('../models/Transaction');

// @desc    Get all transactions for logged in user (with filtering, pagination & summary)
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { category, type, search, startDate, endDate, page = 1, limit = 20 } = req.query;

    // Build Query Filter
    const query = { user: userId };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (type && type !== 'All') {
      query.type = type.toLowerCase();
    }

    if (search) {
      query.description = { $regex: search, $options: 'i' };
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Fetch Transactions for page
    const transactions = await Transaction.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalCount = await Transaction.countDocuments(query);

    // Calculate User's Overall Financial Summary & 6-Month Trend
    const allUserTransactions = await Transaction.find({ user: userId });

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = {};

    // Build 6-Month Chronological Trend Timeline (Past 6 Months)
    const monthlyTrendMap = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mName = d.toLocaleString('default', { month: 'short' });
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrendMap[key] = { month: mName, Income: 0, Expense: 0 };
    }

    allUserTransactions.forEach((tx) => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      if (tx.type === 'income' && !tx.isExcludedFromSummary) {
        totalIncome += tx.amount;
        if (monthlyTrendMap[key]) {
          monthlyTrendMap[key].Income += tx.amount;
        }
      } else if (tx.type === 'expense' && !tx.isExcludedFromSummary) {
        totalExpense += tx.amount;
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
        if (monthlyTrendMap[key]) {
          monthlyTrendMap[key].Expense += tx.amount;
        }
      }
    });

    const netBalance = totalIncome - totalExpense;
    const monthlyTrend = Object.values(monthlyTrendMap);

    // Category Colors
    const categoryColors = {
      Food: '#10b981',
      Shopping: '#3b82f6',
      Bills: '#f59e0b',
      Travel: '#8b5cf6',
      Entertainment: '#ec4899',
      Healthcare: '#ef4444',
      Salary: '#10b981',
      Investment: '#06b6d4',
      'Transfer & Reimbursement': '#64748b',
      Others: '#64748b',
    };

    const categoryBreakdown = Object.keys(categoryTotals).map((cat) => {
      const val = categoryTotals[cat];
      const percentage = totalExpense > 0 ? parseFloat(((val / totalExpense) * 100).toFixed(1)) : 0;
      return {
        name: cat,
        value: val,
        percentage,
        color: categoryColors[cat] || '#64748b',
      };
    });

    return res.status(200).json({
      status: 'success',
      data: {
        transactions,
        pagination: {
          total: totalCount,
          page: pageNum,
          pages: Math.ceil(totalCount / limitNum) || 1,
        },
        summary: {
          totalIncome,
          totalExpense,
          netBalance,
          categoryBreakdown,
          monthlyTrend,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch transactions',
    });
  }
};

// @desc    Create new transaction (With Duplicate Detection & Warning)
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
  try {
    const {
      description,
      amount,
      type,
      category,
      date,
      paymentMethod,
      source,
      isExcludedFromSummary,
      allowDuplicate,
    } = req.body;

    if (!description || !amount || !type || !category) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide description, amount, type, and category',
      });
    }

    const numericAmount = parseFloat(amount);
    const targetDate = date ? new Date(date) : new Date();

    if (!allowDuplicate) {
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existingDuplicate = await Transaction.findOne({
        user: req.user._id,
        amount: numericAmount,
        type: type.toLowerCase(),
        description: { $regex: `^${description.trim()}$`, $options: 'i' },
        date: { $gte: startOfDay, $lte: endOfDay },
      });

      if (existingDuplicate) {
        return res.status(409).json({
          status: 'duplicate_warning',
          message: 'Potential duplicate transaction detected',
          existingTransaction: {
            _id: existingDuplicate._id,
            description: existingDuplicate.description,
            amount: existingDuplicate.amount,
            category: existingDuplicate.category,
            date: existingDuplicate.date,
          },
        });
      }
    }

    const transactionType = type.toLowerCase();
    const isExcluded = isExcludedFromSummary || transactionType === 'transfer';

    const transaction = await Transaction.create({
      user: req.user._id,
      description: description.trim(),
      amount: numericAmount,
      type: transactionType,
      category,
      isExcludedFromSummary: isExcluded,
      date: targetDate,
      paymentMethod: paymentMethod || 'UPI',
      source: source || 'manual',
    });

    return res.status(201).json({
      status: 'success',
      data: transaction,
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create transaction',
    });
  }
};

// @desc    Get single transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({
        status: 'fail',
        message: 'Transaction not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: transaction,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Error fetching transaction details',
    });
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = async (req, res) => {
  try {
    let transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({
        status: 'fail',
        message: 'Transaction not found',
      });
    }

    const { description, amount, type, category, date, paymentMethod, isExcludedFromSummary } = req.body;

    if (description !== undefined) transaction.description = description.trim();
    if (amount !== undefined) transaction.amount = parseFloat(amount);
    if (type !== undefined) {
      transaction.type = type.toLowerCase();
      if (transaction.type === 'transfer') {
        transaction.isExcludedFromSummary = true;
      }
    }
    if (category !== undefined) transaction.category = category;
    if (date !== undefined) transaction.date = new Date(date);
    if (paymentMethod !== undefined) transaction.paymentMethod = paymentMethod;
    if (isExcludedFromSummary !== undefined) transaction.isExcludedFromSummary = isExcludedFromSummary;

    const updatedTransaction = await transaction.save();

    return res.status(200).json({
      status: 'success',
      data: updatedTransaction,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update transaction',
    });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({
        status: 'fail',
        message: 'Transaction not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to delete transaction',
    });
  }
};

module.exports = {
  getTransactions,
  createTransaction,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
};
