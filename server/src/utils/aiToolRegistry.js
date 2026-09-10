const Transaction = require('../models/Transaction');
const RecurringBill = require('../models/RecurringBill');

/**
 * High-Performance AI Tool Registry
 * Uses MongoDB Aggregation Pipelines & Short-Lived TTL Caching
 */

// 30-Second Short-Lived TTL Cache
const toolCache = new Map();
const CACHE_TTL_MS = 30000;

const getCachedData = (key) => {
  const item = toolCache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL_MS) {
    return item.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  toolCache.set(key, { data, timestamp: Date.now() });
};

const invalidateUserCache = (userId) => {
  const prefix = userId.toString();
  for (const key of toolCache.keys()) {
    if (key.startsWith(prefix)) {
      toolCache.delete(key);
    }
  }
};

// Helper for date bounds
const getPeriodDates = (period = 'current_month') => {
  const now = new Date();
  let start, end;
  let label = 'this month';

  if (period === 'last_month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    label = 'last month';
  } else if (period === 'this_year') {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    label = 'this year';
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    label = 'this month';
  }

  return { start, end, label };
};

/**
 * Ultra-Fast Category Spending via MongoDB Aggregation
 */
const getCategorySpendingDetails = async (userId, categoryName, period = 'current_month') => {
  const cacheKey = `${userId}_cat_${categoryName}_${period}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const { start, end, label } = getPeriodDates(period);

  const matchQuery = {
    user: userId,
    type: 'expense',
    date: { $gte: start, $lte: end },
    isExcludedFromSummary: { $ne: true },
  };

  if (categoryName && categoryName !== 'All Expenses') {
    matchQuery.category = { $regex: categoryName, $options: 'i' };
  }

  // MongoDB Aggregation Pipeline for Instant Sum & Count
  const [aggResult, largestTx] = await Promise.all([
    Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
        },
      },
    ]),
    Transaction.findOne(matchQuery).sort({ amount: -1 }).select('description amount date category'),
  ]);

  const total = aggResult[0]?.total || 0;
  const transactionCount = aggResult[0]?.transactionCount || 0;

  const largestTransaction = largestTx ? {
    merchant: largestTx.description,
    amount: largestTx.amount,
    date: largestTx.date.toISOString().split('T')[0],
  } : null;

  // Month-over-month comparison
  let comparison = null;
  if (period === 'current_month') {
    const now = new Date();
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const prevMatch = {
      user: userId,
      type: 'expense',
      date: { $gte: prevStart, $lte: prevEnd },
      isExcludedFromSummary: { $ne: true },
    };
    if (categoryName && categoryName !== 'All Expenses') {
      prevMatch.category = { $regex: categoryName, $options: 'i' };
    }

    const prevAgg = await Transaction.aggregate([
      { $match: prevMatch },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const prevTotal = prevAgg[0]?.total || 0;
    const diff = total - prevTotal;

    comparison = {
      prevTotal,
      diff,
      percentChange: prevTotal > 0 ? parseFloat(((diff / prevTotal) * 100).toFixed(1)) : 0,
    };
  }

  const responseData = {
    category: categoryName || 'All Expenses',
    period: label,
    total,
    transactionCount,
    largestTransaction,
    comparison,
  };

  setCachedData(cacheKey, responseData);
  return responseData;
};

/**
 * Ultra-Fast Merchant Spending Query
 */
const getMerchantSpending = async (userId, merchantName, period = 'current_month') => {
  const cacheKey = `${userId}_merch_${merchantName}_${period}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const { start, end, label } = getPeriodDates(period);

  const matchQuery = {
    user: userId,
    type: 'expense',
    date: { $gte: start, $lte: end },
    description: { $regex: merchantName, $options: 'i' },
  };

  const aggResult = await Transaction.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const responseData = {
    merchant: merchantName,
    count: aggResult[0]?.count || 0,
    totalAmount: aggResult[0]?.total || 0,
    period: label,
  };

  setCachedData(cacheKey, responseData);
  return responseData;
};

/**
 * Ultra-Fast Subscriptions Query
 */
const getSubscriptionsList = async (userId) => {
  const cacheKey = `${userId}_subs`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const bills = await RecurringBill.find({ user: userId }).select('title amount dueDateDay');
  const subscriptions = bills.filter((b) => !b.title.toLowerCase().includes('loan') && !b.title.toLowerCase().includes('emi') && b.amount < 1500);

  const monthlyTotal = subscriptions.reduce((sum, s) => sum + s.amount, 0);

  const responseData = {
    count: subscriptions.length,
    monthlyTotal,
    annualTotal: monthlyTotal * 12,
    subscriptions: subscriptions.map((s) => ({ title: s.title, amount: s.amount })),
  };

  setCachedData(cacheKey, responseData);
  return responseData;
};

/**
 * Ultra-Fast EMIs Query
 */
const getEMIsList = async (userId) => {
  const cacheKey = `${userId}_emis`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const bills = await RecurringBill.find({ user: userId }).select('title amount dueDateDay');
  const emis = bills.filter((b) => b.title.toLowerCase().includes('loan') || b.title.toLowerCase().includes('emi') || b.amount >= 1500);

  const monthlyTotal = emis.reduce((sum, e) => sum + e.amount, 0);

  const responseData = {
    count: emis.length,
    monthlyTotal,
    emis: emis.map((e) => ({ title: e.title, amount: e.amount, dueDay: e.dueDateDay })),
  };

  setCachedData(cacheKey, responseData);
  return responseData;
};

module.exports = {
  getCategorySpendingDetails,
  getMerchantSpending,
  getSubscriptionsList,
  getEMIsList,
  invalidateUserCache,
};
