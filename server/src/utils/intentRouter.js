/**
 * WalletSphere Semantic Intent Router & Query Classifier
 */

const CATEGORY_ALIASES = [
  { keywords: ['food', 'dining', 'eating', 'groceries', 'zomato', 'swiggy', 'restaurant', 'restaurants', 'eating out'], category: 'Food' },
  { keywords: ['shopping', 'amazon', 'flipkart', 'clothes'], category: 'Shopping' },
  { keywords: ['transport', 'transportation', 'cab', 'uber', 'taxi', 'commute', 'petrol', 'fuel'], category: 'Transportation' },
  { keywords: ['entertainment', 'movies', 'netflix', 'spotify'], category: 'Entertainment' },
  { keywords: ['subscriptions', 'subscription'], category: 'Subscriptions' },
  { keywords: ['bills', 'utilities', 'electricity', 'wifi', 'recharge'], category: 'Bills & Utilities' },
  { keywords: ['emis', 'emi', 'loans', 'loan'], category: 'EMIs' },
  { keywords: ['income', 'salary', 'earn', 'earned', 'earnings'], category: 'Income' },
  { keywords: ['expenses', 'spending', 'spend', 'money', 'transaction', 'transactions'], category: 'All Expenses' },
];

/**
 * Classify Query Intent and extract Semantic Filter Entities
 */
const classifyIntent = (message = '', conversationState = {}) => {
  const text = message.toLowerCase().trim();

  // 1. Pure Educational / General Knowledge Definitions
  if (/^what is (an?|the)?\s*(expense|food inflation|emi|mutual fund|sip|budgeting|budget|subscription|income|zomato|cagr)\??$/i.test(text) ||
      /^explain (recursion|binary search|photosynthesis|java|python|http)\??$/i.test(text)) {
    return { intent: 'GENERAL' };
  }

  // 2. Action Requests (e.g. "Create a ₹5,000 food budget", "Add ₹500 spent on Zomato")
  if (/^(create|add|set|change|categorize|make)\s+.*(budget|goal|transaction|category)/i.test(text)) {
    return { intent: 'WALLETWISE_ACTION' };
  }

  // 3. What-If Scenario Queries (High priority if prompt involves buying/affording items)
  const isScenarioPurchase = /\b(buy|afford|purchase|car|bike|house|phone|vacation|laptop|loan|down payment|upfront|tenure)\b/i.test(text) &&
                             !/\b(my emis|my loans|existing emis)\b/i.test(text);
  const hasActiveScenario = conversationState.purchasePrice || conversationState.tenureMonths || conversationState.userSpecifiedIncome;

  if (isScenarioPurchase || (hasActiveScenario && /^(emi|what about|what if|instead|and|can i|how about|make it|if i)/i.test(text))) {
    return { intent: 'WHAT_IF_SCENARIO' };
  }

  // 4. Personal Financial Data Queries (Semantic Detection)
  const isPossessive = /\b(my|mine|i|i've|our|me)\b/i.test(text);
  const isDataPhrase = /\b(food|spending|spent|expenses|expense|zomato|swiggy|uber|amazon|groceries|shopping|income|salary|earn|earned|emis|emi|subscriptions|budgets|balance|saved|earnings|highest|biggest|where|transactions)\b/i.test(text);

  let isPersonalData = false;
  if (isPossessive && isDataPhrase) {
    isPersonalData = true;
  } else if (/^(my|food|expenses|spending|income|subscriptions|emis|budgets|groceries|zomato|swiggy|uber|amazon|shopping)\s*(expenses|spending|this month|last month|today|yesterday|this year)?\??$/i.test(text)) {
    isPersonalData = true;
  } else if (/(how much|where did|where|what did i|biggest|highest|show|list)\s+.*(spend|spent|food|zomato|shopping|earn|earned|expense|transaction|money)/i.test(text)) {
    isPersonalData = true;
  }

  // Extract Category
  let matchedCategory = 'All Expenses';
  for (const group of CATEGORY_ALIASES) {
    if (group.keywords.some((kw) => text.includes(kw))) {
      matchedCategory = group.category;
      break; // Stop at first specific matched category!
    }
  }

  // Extract Merchant Specific Queries
  const merchantMatch = text.match(/\b(zomato|swiggy|uber|amazon|flipkart|blinkit)\b/i);
  const merchant = merchantMatch ? merchantMatch[0] : null;

  // Extract Period
  let period = 'current_month';
  if (text.includes('last month') || text.includes('previous month')) period = 'last_month';
  else if (text.includes('this year')) period = 'this_year';
  else if (text.includes('today')) period = 'today';
  else if (text.includes('yesterday')) period = 'yesterday';

  if (isPersonalData) {
    return {
      intent: 'PERSONAL_DATA_QUERY',
      category: matchedCategory,
      merchant,
      period,
      queryType: merchant ? 'merchant_total' : (matchedCategory ? 'category_total' : 'general_expense_summary'),
    };
  }

  // 5. Follow-up Context Processing
  if (conversationState.lastIntent === 'PERSONAL_DATA_QUERY') {
    if (/^last month\??$/i.test(text) || /^previous month\??$/i.test(text)) {
      return {
        intent: 'PERSONAL_DATA_QUERY',
        category: conversationState.lastCategory || 'Food',
        merchant: conversationState.lastMerchant || null,
        period: 'last_month',
        isFollowUp: true,
      };
    }
    if (/^why.*(higher|more|increase)\??$/i.test(text) || /^why\??$/i.test(text)) {
      return {
        intent: 'PERSONAL_DATA_QUERY',
        queryType: 'comparison',
        category: conversationState.lastCategory || null,
        period: 'current_month',
        isFollowUp: true,
      };
    }
  }

  // Fallback default: GENERAL
  return { intent: 'GENERAL' };
};

module.exports = {
  classifyIntent,
  CATEGORY_ALIASES,
};
