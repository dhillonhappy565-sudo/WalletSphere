const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

// Helper to compute date range based on period
const getPeriodDateRange = (budget, currentMonthStr) => {
  const now = new Date();
  const [yearStr, monthStr] = currentMonthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;

  if (budget.period === 'custom' && budget.customStartDate && budget.customEndDate) {
    return {
      startDate: new Date(budget.customStartDate),
      endDate: new Date(budget.customEndDate),
    };
  }

  if (budget.period === 'weekly') {
    const start = new Date();
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    const startDate = new Date(start.setDate(diff));
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }

  if (budget.period === 'quarterly') {
    const quarterMonth = Math.floor(month / 3) * 3;
    const startDate = new Date(year, quarterMonth, 1);
    const endDate = new Date(year, quarterMonth + 3, 0, 23, 59, 59);
    return { startDate, endDate };
  }

  if (budget.period === 'yearly') {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);
    return { startDate, endDate };
  }

  // Default: Monthly
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59);
  return { startDate, endDate };
};

// @desc    Get user budget targets & real-time spending with periods & rollover
// @route   GET /api/budgets
// @access  Private
const getBudgets = async (req, res) => {
  try {
    const userId = req.user._id;
    const targetMonth = req.query.month || new Date().toISOString().slice(0, 7);

    const budgets = await Budget.find({ user: userId, month: targetMonth });

    // Calculate previous month string (e.g. '2026-06')
    const [y, m] = targetMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevMonthStr = prevDate.toISOString().slice(0, 7);

    // Fetch previous month budgets for rollover calculation
    const prevBudgets = await Budget.find({ user: userId, month: prevMonthStr });

    const result = await Promise.all(
      budgets.map(async (budget) => {
        const { startDate, endDate } = getPeriodDateRange(budget, targetMonth);

        // Aggregate actual spending for this category in date range
        const expenses = await Transaction.aggregate([
          {
            $match: {
              user: userId,
              category: budget.category,
              type: 'expense',
              date: { $gte: startDate, $lte: endDate },
              isExcludedFromSummary: { $ne: true },
            },
          },
          {
            $group: {
              _id: null,
              totalSpent: { $sum: '$amount' },
            },
          },
        ]);

        const spent = expenses.length > 0 ? expenses[0].totalSpent : 0;

        // Rollover logic
        let rollover = 0;
        if (budget.rolloverEnabled) {
          const prevB = prevBudgets.find((b) => b.category === budget.category);
          if (prevB) {
            const prevRange = getPeriodDateRange(prevB, prevMonthStr);
            const prevExp = await Transaction.aggregate([
              {
                $match: {
                  user: userId,
                  category: prevB.category,
                  type: 'expense',
                  date: { $gte: prevRange.startDate, $lte: prevRange.endDate },
                  isExcludedFromSummary: { $ne: true },
                },
              },
              {
                $group: {
                  _id: null,
                  totalSpent: { $sum: '$amount' },
                },
              },
            ]);
            const prevSpent = prevExp.length > 0 ? prevExp[0].totalSpent : 0;
            const unused = prevB.monthlyLimit - prevSpent;
            if (unused > 0) {
              rollover = unused;
            }
          }
        }

        const effectiveLimit = budget.monthlyLimit + rollover;
        const remaining = effectiveLimit - spent;
        const percentage = Math.min(100, Math.round((spent / effectiveLimit) * 100));

        let status = 'on_track';
        if (spent > effectiveLimit) {
          status = 'exceeded';
        } else if (percentage >= 80) {
          status = 'warning';
        }

        // Compute daily allowance remaining
        const now = new Date();
        const daysLeftInPeriod = Math.max(1, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
        const dailyAllowance = remaining > 0 ? Math.round(remaining / daysLeftInPeriod) : 0;

        return {
          ...budget.toObject(),
          spent,
          rolloverAmount: rollover,
          effectiveLimit,
          remaining,
          percentage,
          status,
          dailyAllowance,
          startDate,
          endDate,
        };
      })
    );

    return res.status(200).json({
      status: 'success',
      data: {
        month: targetMonth,
        budgets: result,
      },
    });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch budget limits',
    });
  }
};

// @desc    Set or update category budget limit
// @route   POST /api/budgets
// @access  Private
const setBudget = async (req, res) => {
  try {
    const {
      category,
      monthlyLimit,
      month,
      period,
      customStartDate,
      customEndDate,
      rolloverEnabled,
    } = req.body;

    if (!category || monthlyLimit === undefined) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide category and limit amount.',
      });
    }

    const targetMonth = month || new Date().toISOString().slice(0, 7);

    const budget = await Budget.findOneAndUpdate(
      { user: req.user._id, category, month: targetMonth },
      {
        monthlyLimit: parseFloat(monthlyLimit),
        period: period || 'monthly',
        customStartDate: customStartDate ? new Date(customStartDate) : null,
        customEndDate: customEndDate ? new Date(customEndDate) : null,
        rolloverEnabled: !!rolloverEnabled,
      },
      { upsert: true, new: true, runValidators: true }
    );

    return res.status(200).json({
      status: 'success',
      data: { budget },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to set budget limit',
    });
  }
};

// @desc    Copy previous month's budget targets to current month
// @route   POST /api/budgets/copy-previous
// @access  Private
const copyPreviousMonthBudgets = async (req, res) => {
  try {
    const userId = req.user._id;
    const currentMonth = req.body.month || new Date().toISOString().slice(0, 7);

    const [y, m] = currentMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevMonthStr = prevDate.toISOString().slice(0, 7);

    const prevBudgets = await Budget.find({ user: userId, month: prevMonthStr });

    if (prevBudgets.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: `No budget entries found for previous month (${prevMonthStr}).`,
      });
    }

    const clonedCount = [];
    for (const prevB of prevBudgets) {
      const cloned = await Budget.findOneAndUpdate(
        { user: userId, category: prevB.category, month: currentMonth },
        {
          monthlyLimit: prevB.monthlyLimit,
          period: prevB.period,
          rolloverEnabled: prevB.rolloverEnabled,
        },
        { upsert: true, new: true }
      );
      clonedCount.push(cloned);
    }

    return res.status(200).json({
      status: 'success',
      message: `Successfully copied ${clonedCount.length} budgets from ${prevMonthStr}!`,
      data: { copiedBudgets: clonedCount },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to copy previous month budgets',
    });
  }
};

// @desc    Get filtered transactions for a specific budget category & date range
// @route   GET /api/budgets/:id/transactions
// @access  Private
const getBudgetCategoryTransactions = async (req, res) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, user: req.user._id });

    if (!budget) {
      return res.status(404).json({ status: 'fail', message: 'Budget not found' });
    }

    const { startDate, endDate } = getPeriodDateRange(budget, budget.month);

    const transactions = await Transaction.find({
      user: req.user._id,
      category: budget.category,
      type: 'expense',
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: -1 });

    return res.status(200).json({
      status: 'success',
      data: {
        category: budget.category,
        transactions,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch category transactions',
    });
  }
};

module.exports = {
  getBudgets,
  setBudget,
  copyPreviousMonthBudgets,
  getBudgetCategoryTransactions,
};
