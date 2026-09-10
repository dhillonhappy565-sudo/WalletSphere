const Transaction = require('../models/Transaction');
const RecurringBill = require('../models/RecurringBill');
const Budget = require('../models/Budget');

/**
 * Standard EMI Calculation Formula:
 * EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
 */
const calculateEMI = (principal, annualInterestRate = 9.5, tenureMonths = 60) => {
  const P = Math.max(0, parseFloat(principal) || 0);
  const n = Math.max(1, parseInt(tenureMonths, 10) || 60);
  const rate = Math.max(0, parseFloat(annualInterestRate) || 0);

  if (P === 0) return 0;
  if (rate === 0) return Math.round(P / n);

  const r = rate / 12 / 100;
  const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(emi);
};

const calculateFreeCashFlow = (income, expenses, existingEMIs) => {
  const inc = Math.max(0, parseFloat(income) || 0);
  const exp = Math.max(0, parseFloat(expenses) || 0);
  const emi = Math.max(0, parseFloat(existingEMIs) || 0);
  return Math.round(inc - exp - emi);
};

const calculateDebtToIncome = (totalMonthlyDebt, monthlyIncome) => {
  const inc = parseFloat(monthlyIncome) || 0;
  const debt = parseFloat(totalMonthlyDebt) || 0;
  if (inc <= 0) return 0;
  return parseFloat(((debt / inc) * 100).toFixed(1));
};

const calculateEmergencyFundCoverage = (liquidSavings, essentialMonthlyExpenses) => {
  const savings = Math.max(0, parseFloat(liquidSavings) || 0);
  const expenses = Math.max(1000, parseFloat(essentialMonthlyExpenses) || 30000);
  return parseFloat((savings / expenses).toFixed(1));
};

const calculateSavingsRate = (income, expenses) => {
  const inc = parseFloat(income) || 0;
  const exp = parseFloat(expenses) || 0;
  if (inc <= 0) return 0;
  return parseFloat((Math.max(0, (inc - exp) / inc) * 100).toFixed(1));
};

/**
 * Multi-Factor Affordability Engine
 * Evaluates Monthly Affordability, Debt Load, Emergency Preparedness separately
 */
const evaluateMultiFactorAffordability = ({
  monthlyIncome,
  newEMI,
  existingEMIs,
  monthlyExpenses,
  liquidSavings,
  downPayment = 0,
}) => {
  const income = Math.max(1, parseFloat(monthlyIncome) || 80000);
  const emi = Math.max(0, parseFloat(newEMI) || 0);
  const existingDebt = Math.max(0, parseFloat(existingEMIs) || 0);
  const expenses = Math.max(0, parseFloat(monthlyExpenses) || 0);

  const totalMonthlyDebt = existingDebt + emi;
  const freeCashFlowBefore = calculateFreeCashFlow(income, expenses, existingDebt);
  const freeCashFlowAfter = freeCashFlowBefore - emi;

  const emiToIncomeRatio = calculateDebtToIncome(emi, income);
  const totalDebtRatio = calculateDebtToIncome(totalMonthlyDebt, income);
  const freeCashFlowMargin = parseFloat(((freeCashFlowAfter / income) * 100).toFixed(1));

  const postPurchaseSavings = Math.max(0, liquidSavings - downPayment);
  const essentialOutflow = Math.max(10000, expenses > 0 ? expenses : 30000);
  const emergencyMonths = calculateEmergencyFundCoverage(postPurchaseSavings, essentialOutflow);

  // 1. Dimension: Monthly Affordability
  let monthlyAffordability = 'COMFORTABLE';
  if (emiToIncomeRatio > 20 || freeCashFlowMargin < 5 || freeCashFlowAfter < 0) {
    monthlyAffordability = 'HIGH RISK';
  } else if (emiToIncomeRatio > 15 || freeCashFlowMargin < 15) {
    monthlyAffordability = 'TIGHT';
  } else if (emiToIncomeRatio > 10 || freeCashFlowMargin < 25) {
    monthlyAffordability = 'MANAGEABLE';
  }

  // 2. Dimension: Debt Load
  let debtLoad = 'LOW';
  if (totalDebtRatio > 40) debtLoad = 'VERY HIGH';
  else if (totalDebtRatio > 30) debtLoad = 'HIGH';
  else if (totalDebtRatio > 20) debtLoad = 'MODERATE';

  // 3. Dimension: Emergency Preparedness
  let emergencyPreparedness = 'STRONG';
  if (emergencyMonths < 1) emergencyPreparedness = 'VERY WEAK';
  else if (emergencyMonths < 3) emergencyPreparedness = 'WEAK';
  else if (emergencyMonths < 6) emergencyPreparedness = 'ADEQUATE';

  // 4. Overall Score Calculation (0-100)
  let score = 100;

  // Monthly FCF impact
  if (freeCashFlowAfter < 0) score -= 50;
  else if (freeCashFlowMargin < 5) score -= 35;
  else if (freeCashFlowMargin < 15) score -= 20;
  else if (freeCashFlowMargin < 25) score -= 10;

  // Total Debt impact
  if (totalDebtRatio > 45) score -= 35;
  else if (totalDebtRatio > 35) score -= 25;
  else if (totalDebtRatio > 25) score -= 15;

  // Emergency Fund impact (important, but does NOT force HIGH RISK on its own!)
  if (emergencyMonths < 1) score -= 15;
  else if (emergencyMonths < 3) score -= 10;

  score = Math.max(0, Math.min(100, Math.round(score)));

  // Overall Assessment Verdict
  let overallAssessment = 'COMFORTABLE';
  let overallVerdict = 'Yes — manageable';

  if (freeCashFlowAfter < 0 || totalDebtRatio > 50 || score < 45) {
    overallAssessment = 'HIGH RISK';
    overallVerdict = 'No — financially risky';
  } else if (score < 65 || monthlyAffordability === 'TIGHT') {
    overallAssessment = 'TIGHT';
    overallVerdict = 'Possible, but tight';
  } else if (score < 80 || emergencyPreparedness === 'WEAK' || debtLoad === 'HIGH') {
    overallAssessment = 'MANAGEABLE';
    overallVerdict = 'Yes — manageable (with caution)';
  }

  // Concise synthesis reason
  let assessmentReason = '';
  if (overallAssessment === 'COMFORTABLE') {
    assessmentReason = `Proposed EMI is ${emiToIncomeRatio}% of income, leaving a healthy monthly free cash flow of ₹${freeCashFlowAfter.toLocaleString()}.`;
  } else if (overallAssessment === 'MANAGEABLE') {
    assessmentReason = `Monthly cash flow is manageable (₹${freeCashFlowAfter.toLocaleString()}/mo left after EMI), though total debt is ${totalDebtRatio}% of income.`;
  } else if (overallAssessment === 'TIGHT') {
    assessmentReason = `EMI and existing debt consume ${totalDebtRatio}% of income, leaving a tight monthly buffer of ₹${freeCashFlowAfter.toLocaleString()}.`;
  } else {
    assessmentReason = `Total monthly obligations (₹${totalMonthlyDebt.toLocaleString()}) create financial strain or negative cash flow.`;
  }

  return {
    score,
    overallAssessment,
    overallVerdict,
    monthlyAffordability,
    debtLoad,
    emergencyPreparedness,
    freeCashFlowBefore,
    freeCashFlowAfter,
    freeCashFlowMargin,
    emiToIncomeRatio,
    totalDebtRatio,
    emergencyMonths,
    assessmentReason,
  };
};

/**
 * Ultra-Fast Base Objective Metrics from DB via Parallel Aggregation
 */
const getFinancialMetrics = async (userId) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Parallel Execution of Independent Queries
  const [incomeAgg, expenseAgg, bills, monthsAgg] = await Promise.all([
    Transaction.aggregate([
      { $match: { user: userId, type: 'income', isExcludedFromSummary: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { user: userId, type: 'expense', isExcludedFromSummary: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    RecurringBill.find({ user: userId }).select('title amount dueDateDay'),
    Transaction.aggregate([
      { $match: { user: userId } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } } } },
    ]),
  ]);

  const totalIncome = incomeAgg[0]?.total || 0;
  const totalExpense = expenseAgg[0]?.total || 0;
  const netBalance = totalIncome - totalExpense;

  let totalEMIs = 0;
  bills.forEach((b) => {
    const isEmi = b.title.toLowerCase().includes('loan') || b.title.toLowerCase().includes('emi') || b.amount >= 1500;
    if (isEmi) totalEMIs += b.amount;
  });

  const liquidSavings = Math.max(0, netBalance);
  const essentialMonthlyExpenses = Math.max(10000, totalExpense > 0 ? totalExpense : 30000);
  const emergencyCoverageMonths = calculateEmergencyFundCoverage(liquidSavings, essentialMonthlyExpenses);

  return {
    totalIncome,
    totalExpense,
    netBalance,
    liquidSavings,
    essentialMonthlyExpenses,
    emergencyCoverageMonths,
    totalEMIs,
    historyMonthsCount: monthsAgg.length || 1,
  };
};

/**
 * Unified What-If Purchase Simulator with Strict Precedence & Two-Option Comparison
 */
const simulatePurchaseScenario = ({
  purchaseType = 'car_purchase',
  purchasePrice = 500000,
  downPayment = 100000,
  annualInterestRate = 9.5,
  tenureMonths = 60,
  userSpecifiedIncome = null,
  userSpecifiedExpenses = null,
  userSpecifiedEMIs = null,
  dbMetrics = {},
}) => {
  // Precedence Resolution
  const price = Math.max(0, parseFloat(purchasePrice) || 500000);
  const dp = Math.max(0, parseFloat(downPayment) !== undefined ? parseFloat(downPayment) : Math.round(price * 0.20));
  const loanAmt = Math.max(0, price - dp);
  const rate = parseFloat(annualInterestRate) !== undefined ? parseFloat(annualInterestRate) : 9.5;
  const tenure = Math.max(1, parseInt(tenureMonths, 10) || 60);

  const income = userSpecifiedIncome !== null ? userSpecifiedIncome : (dbMetrics.totalIncome || 80000);
  const expenses = userSpecifiedExpenses !== null ? userSpecifiedExpenses : (dbMetrics.totalExpense || 35000);
  const existingEMIs = userSpecifiedEMIs !== null ? userSpecifiedEMIs : (dbMetrics.totalEMIs || 0);

  // Exact Primary EMI Calculation
  const monthlyEMI = calculateEMI(loanAmt, rate, tenure);

  // Multi-Factor Evaluation
  const evalResult = evaluateMultiFactorAffordability({
    monthlyIncome: income,
    newEMI: monthlyEMI,
    existingEMIs,
    monthlyExpenses: expenses,
    liquidSavings: dbMetrics.liquidSavings || 0,
    downPayment: dp,
  });

  // Generate Option B (Alternative Tenure - e.g. 3 years vs 5 years)
  let optionB = null;
  if (tenure === 60) {
    const tenureB = 36;
    const emiB = calculateEMI(loanAmt, rate, tenureB);
    const evalB = evaluateMultiFactorAffordability({
      monthlyIncome: income,
      newEMI: emiB,
      existingEMIs,
      monthlyExpenses: expenses,
      liquidSavings: dbMetrics.liquidSavings || 0,
      downPayment: dp,
    });

    optionB = {
      title: 'Option B — Faster Repayment (3 Years)',
      tenureMonths: 36,
      tenureLabel: '3 years (36 months)',
      monthlyEMI: emiB,
      freeCashFlowAfter: evalB.freeCashFlowAfter,
      overallAssessment: evalB.overallAssessment,
      advantage: 'Lower total interest paid, loan ends 2 years earlier.',
      tradeoff: `Higher monthly EMI (+₹${(emiB - monthlyEMI).toLocaleString()}/mo).`,
    };
  }

  // Data Sources & Assumptions List
  const dataSources = [];
  const assumptions = [];
  const overrides = [];

  if (userSpecifiedIncome !== null) {
    dataSources.push(`Monthly Income: ₹${income.toLocaleString()} (User override)`);
  } else {
    dataSources.push(`Monthly Income: ₹${income.toLocaleString()} (WalletSphere DB)`);
  }

  if (userSpecifiedExpenses !== null) {
    overrides.push(`Expenses reduced to ₹${expenses.toLocaleString()}/month (User scenario override, DB history: ₹${(dbMetrics.totalExpense || 0).toLocaleString()})`);
    dataSources.push(`Monthly Expenses: ₹${expenses.toLocaleString()} (Scenario override)`);
  } else {
    dataSources.push(`Monthly Expenses: ₹${expenses.toLocaleString()} (WalletSphere DB)`);
  }

  dataSources.push(`Purchase Price: ₹${price.toLocaleString()}`);
  dataSources.push(`Down Payment: ₹${dp.toLocaleString()}`);
  dataSources.push(`Tenure: ${tenure % 12 === 0 ? `${tenure / 12} years` : `${tenure} months`} @ ${rate}% interest`);

  if (!downPayment && downPayment !== 0) assumptions.push(`₹${dp.toLocaleString()} down payment assumed (20% default).`);
  if (!annualInterestRate) assumptions.push(`${rate}% annual interest rate assumed.`);

  return {
    type: purchaseType,
    purchasePrice: price,
    downPayment: dp,
    loanAmount: loanAmt,
    annualInterestRate: rate,
    tenureMonths: tenure,
    tenureLabel: tenure % 12 === 0 ? `${tenure / 12} years (${tenure} months)` : `${tenure} months`,
    monthlyEMI,
    monthlyIncome: income,
    monthlyExpenses: expenses,
    historicalExpenses: dbMetrics.totalExpense || 0,
    existingEMIs,
    freeCashFlowBefore: evalResult.freeCashFlowBefore,
    freeCashFlowAfter: evalResult.freeCashFlowAfter,
    emiToIncomeRatio: evalResult.emiToIncomeRatio,
    totalDebtRatio: evalResult.totalDebtRatio,

    // Multi-Dimensional Assessment Breakdown
    overallAssessment: evalResult.overallAssessment,
    overallVerdict: evalResult.overallVerdict,
    monthlyAffordability: evalResult.monthlyAffordability,
    debtLoad: evalResult.debtLoad,
    emergencyPreparedness: evalResult.emergencyPreparedness,
    assessmentReason: evalResult.assessmentReason,
    score: evalResult.score,

    optionB,
    dataSources,
    assumptions,
    overrides,
  };
};

module.exports = {
  calculateEMI,
  calculateFreeCashFlow,
  calculateDebtToIncome,
  calculateEmergencyFundCoverage,
  calculateSavingsRate,
  evaluateMultiFactorAffordability,
  getFinancialMetrics,
  simulatePurchaseScenario,
};
