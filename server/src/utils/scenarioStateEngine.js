/**
 * Persistent Scenario State Engine
 * Remembers and updates What-If scenario parameters across conversation turns with strict priority overrides
 */

const userScenarioMap = new Map();

/**
 * Get active scenario state for a user
 */
const getUserScenarioState = (userId) => {
  return userScenarioMap.get(userId.toString()) || null;
};

/**
 * Update and persist scenario state
 */
const updateUserScenarioState = (userId, newParams) => {
  const current = getUserScenarioState(userId) || {};
  const updated = {
    ...current,
    ...newParams,
    lastUpdated: Date.now(),
  };
  userScenarioMap.set(userId.toString(), updated);
  return updated;
};

/**
 * Clear scenario state for a user
 */
const clearUserScenarioState = (userId) => {
  userScenarioMap.delete(userId.toString());
};

/**
 * Parse prompt text to extract user overrides and scenario parameter updates
 */
const extractScenarioParamsFromPrompt = (message, currentState = {}) => {
  const text = message.toLowerCase();
  const updates = {};

  // 1. Extract Expense Reduction / Override (e.g. "if I reduce expenses to 20k", "expenses 20k", "assume expenses 15k")
  const expenseOverrideMatch = text.match(/(?:reduce|cut|assume|lower|make|my)?\s*(?:current|monthly)?\s*expenses\s*(?:to|=|:)?\s*₹?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|k)?/i) ||
                               text.match(/₹?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|k)?\s*(?:expenses|spending)/i);
  if (expenseOverrideMatch) {
    const val = parseFloat(expenseOverrideMatch[1]);
    const unit = (expenseOverrideMatch[2] || '').toLowerCase();
    let expenseVal = val;
    if (unit.includes('lakh') || unit.includes('lac')) expenseVal = val * 100000;
    else if (unit.includes('k')) expenseVal = val * 1000;

    if (expenseVal > 0) {
      updates.userSpecifiedExpenses = expenseVal;
      updates.expenseSource = 'user_scenario';
    }
  }

  // 2. Extract Income Overrides (e.g. "salary is 80k", "income 80000", "my income is 1.2 lakh")
  const incomeMatch = text.match(/(?:salary|income)\s*(?:is|=|:)?\s*₹?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|k)?/i) ||
                      text.match(/earn\s*₹?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|k)?/i);
  if (incomeMatch) {
    const val = parseFloat(incomeMatch[1]);
    const unit = (incomeMatch[2] || '').toLowerCase();
    let incomeVal = val;
    if (unit.includes('lakh') || unit.includes('lac')) incomeVal = val * 100000;
    else if (unit.includes('k')) incomeVal = val * 1000;

    if (incomeVal > 0) {
      updates.userSpecifiedIncome = incomeVal;
      updates.incomeSource = 'user';
    }
  }

  // 3. Extract Purchase Price Updates (STRICT USER OVERRIDE - e.g. "car of 5 lakh", "5 lakh car", "car price 10 lakh")
  const priceMatch = text.match(/(?:car|bike|house|phone|vacation|item|purchase)?\s*(?:of|is|price|cost)?\s*₹?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|k)?\s*(?:car|bike|house|phone|item|purchase)?/i);
  if (priceMatch) {
    const val = parseFloat(priceMatch[1]);
    const unit = (priceMatch[2] || '').toLowerCase();
    let price = val;
    if (unit.includes('lakh') || unit.includes('lac')) price = val * 100000;
    else if (unit.includes('k')) price = val * 1000;

    if (price >= 1000) {
      // EXPLICIT OVERRIDE: user specified a new purchase price!
      updates.purchasePrice = price;
      updates.priceSource = 'user';
      if (text.includes('car')) updates.purchaseType = 'car_purchase';
      else if (text.includes('bike')) updates.purchaseType = 'bike_purchase';
      else if (text.includes('house')) updates.purchaseType = 'home_purchase';
    }
  }

  // 4. Extract Tenure Updates (e.g., "1 year", "2 years", "12 months", "3 years", "5 years")
  const tenureYearMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:year|yrs|yr)/i);
  const tenureMonthMatch = text.match(/(\d+)\s*(?:month|months|mth)/i);

  if (tenureYearMatch) {
    const years = parseFloat(tenureYearMatch[1]);
    updates.tenureMonths = Math.round(years * 12);
    updates.tenureSource = 'user';
  } else if (tenureMonthMatch) {
    updates.tenureMonths = parseInt(tenureMonthMatch[1], 10);
    updates.tenureSource = 'user';
  }

  // 5. Extract Down Payment Updates (e.g. "pay 2 lakh down payment", "1 lakh upfront")
  const dpMatch = text.match(/(?:down\s*payment|upfront|pay)\s*(?:is|=|:)?\s*₹?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|k)?/i) ||
                  text.match(/₹?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|k)?\s*(?:down\s*payment|upfront)/i);
  if (dpMatch) {
    const val = parseFloat(dpMatch[1]);
    const unit = (dpMatch[2] || '').toLowerCase();
    let dpVal = val;
    if (unit.includes('lakh') || unit.includes('lac')) dpVal = val * 100000;
    else if (unit.includes('k')) dpVal = val * 1000;

    updates.downPayment = dpVal;
    updates.downPaymentSource = 'user';
  }

  // 6. Extract Interest Rate Updates (e.g. "interest is 8%", "9.5%")
  const rateMatch = text.match(/(?:interest|rate)\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)\s*%/i) ||
                    text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:interest|rate)?/i);
  if (rateMatch) {
    updates.annualInterestRate = parseFloat(rateMatch[1]);
    updates.interestSource = 'user';
  }

  return updates;
};

module.exports = {
  getUserScenarioState,
  updateUserScenarioState,
  clearUserScenarioState,
  extractScenarioParamsFromPrompt,
};
