import React, { useState, useEffect, useCallback } from 'react';
import API from '../../services/api';
import CustomDropdown from '../common/CustomDropdown';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  PieChart as PieIcon,
  TrendingUp,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Printer,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  Building2,
  Tv,
  Store,
  Receipt,
  ArrowRightLeft,
  SlidersHorizontal,
  CheckSquare,
  Square,
  X,
  Lightbulb,
} from 'lucide-react';

function ReportsView({ currencySymbol = '₹' }) {
  const [period, setPeriod] = useState('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);

  // Section Checkbox Filters for Custom Builder
  const [sections, setSections] = useState({
    summary: true,
    income: true,
    expense: true,
    cashFlow: true,
    budget: true,
    savings: true,
    loans: true,
    subscriptions: true,
    merchants: true,
    paymentMethods: true,
  });

  // Report Data States
  const [reportData, setReportData] = useState({
    startDateStr: '',
    endDateStr: '',
    openingBalance: 0,
    closingBalance: 0,
    totalIncome: 0,
    totalExpense: 0,
    netCashFlow: 0,
    savingsRate: 0,
    incomeSources: [],
    expenseCategories: [],
    cashFlowTrend: [],
    budgetPerformance: [],
    overallBudget: 0,
    actualSpending: 0,
    budgetRemaining: 0,
    loans: [],
    subscriptions: [],
    topMerchants: [],
    paymentMethods: [],
    rawTransactions: [],
    aiExecutiveSummary: null,
  });

  const periodOptions = [
    { label: 'This Month', value: 'this_month' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'Last 3 Months', value: '3M' },
    { label: 'Last 6 Months', value: '6M' },
    { label: 'This Year', value: 'this_year' },
    { label: 'Last Year', value: 'last_year' },
    { label: 'Custom Date Range', value: 'custom' },
  ];

  // Calculate Date Range based on selected period
  const getDateRange = useCallback(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (period === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (period === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (period === '3M') {
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (period === '6M') {
      start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (period === 'this_year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else if (period === 'last_year') {
      start = new Date(now.getFullYear() - 1, 0, 1);
      end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
    } else if (period === 'custom' && customStartDate && customEndDate) {
      start = new Date(customStartDate);
      end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  }, [period, customStartDate, customEndDate]);

  // AI Executive Summary Generator
  const generateAIExecutiveSummary = (totalIncome, totalExpense, expenseCategories, budgetPerformance, subscriptions) => {
    const net = totalIncome - totalExpense;
    const largestCategory = [...expenseCategories].sort((a, b) => b.amount - a.amount)[0];
    const exceededBudgets = budgetPerformance.filter((b) => b.status === 'Exceeded');
    const totalSubMonthly = subscriptions.reduce((sum, s) => sum + s.amount, 0);

    const summaryText = `Your total cash inflow for this period reached ${currencySymbol}${totalIncome.toLocaleString()}, while total expenses were ${currencySymbol}${totalExpense.toLocaleString()} (${net >= 0 ? 'retaining a net surplus of ' + currencySymbol + net.toLocaleString() : 'resulting in a net deficit of ' + currencySymbol + Math.abs(net).toLocaleString()}). ${largestCategory ? largestCategory.category + ' is your largest spending category accounting for ' + largestCategory.percentage + '% of total expenses.' : ''} ${exceededBudgets.length > 0 ? 'You exceeded budget limits in ' + exceededBudgets.map(b => b.category).join(', ') + '.' : 'All category budgets remained within targeted limits.'}`;

    const recommendations = [];
    if (largestCategory && largestCategory.amount > 3000) {
      const potentialSave = Math.round(largestCategory.amount * 0.2);
      recommendations.push(
        `Reducing discretionary ${largestCategory.category} spending by 20% (${currencySymbol}${potentialSave.toLocaleString()}/mo) could save ~${currencySymbol}${(potentialSave * 12).toLocaleString()}/year.`
      );
    }

    if (totalSubMonthly > 500) {
      recommendations.push(
        `Recurring subscriptions total ${currencySymbol}${totalSubMonthly.toLocaleString()}/mo (${currencySymbol}${(totalSubMonthly * 12).toLocaleString()}/yr). Reviewing underutilized apps could unlock ${currencySymbol}3,000+ in annual savings.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintaining your current savings trajectory will support long-term investment goals.');
    }

    return { summaryText, recommendations };
  };

  // Generate Report Data
  const generateReport = useCallback(async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();

      const [txRes, budgetRes, billRes] = await Promise.all([
        API.get('/transactions', { params: { limit: 1000 } }),
        API.get('/budgets', { params: { month: start.toISOString().slice(0, 7) } }),
        API.get('/bills'),
      ]);

      const allTx = txRes.data.data.transactions || [];
      const userBudgets = budgetRes.data.data.budgets || [];
      const userBills = billRes.data.data.bills || [];

      const periodTx = allTx.filter((t) => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });

      let totalIncome = 0;
      let totalExpense = 0;
      const incomeMap = {};
      const expenseMap = {};
      const merchantMap = {};
      const paymentMap = {};

      periodTx.forEach((tx) => {
        if (tx.isExcludedFromSummary) return;

        if (tx.type === 'income') {
          totalIncome += tx.amount;
          const cat = tx.category || 'Salary';
          incomeMap[cat] = (incomeMap[cat] || 0) + tx.amount;
        } else if (tx.type === 'expense') {
          totalExpense += tx.amount;
          const cat = tx.category || 'Others';
          expenseMap[cat] = (expenseMap[cat] || 0) + tx.amount;

          const cleanDesc = tx.description
            .replace(/(upi|ach|neft|rtgs|imps|\d{5,})/gi, '')
            .replace(/[^\w\s]/g, ' ')
            .trim();
          const merchantName = cleanDesc.length >= 3 ? cleanDesc : tx.description;
          merchantMap[merchantName] = (merchantMap[merchantName] || 0) + tx.amount;

          const pm = tx.paymentMethod || 'UPI';
          if (!paymentMap[pm]) paymentMap[pm] = { count: 0, amount: 0 };
          paymentMap[pm].count += 1;
          paymentMap[pm].amount += tx.amount;
        }
      });

      const netCashFlow = totalIncome - totalExpense;
      const savingsRate = totalIncome > 0
        ? Math.max(0, parseFloat(((netCashFlow / totalIncome) * 100).toFixed(1)))
        : 0;

      const incomeSources = Object.keys(incomeMap).map((cat) => ({
        source: cat,
        amount: incomeMap[cat],
        percentage: totalIncome > 0 ? parseFloat(((incomeMap[cat] / totalIncome) * 100).toFixed(1)) : 0,
      }));

      const expenseCategories = Object.keys(expenseMap).map((cat, idx) => ({
        category: cat,
        amount: expenseMap[cat],
        percentage: totalExpense > 0 ? parseFloat(((expenseMap[cat] / totalExpense) * 100).toFixed(1)) : 0,
        color: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444', '#06b6d4', '#64748b'][idx % 8],
      }));

      const topMerchants = Object.keys(merchantMap)
        .map((m) => ({ name: m, amount: merchantMap[m] }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      const paymentMethods = Object.keys(paymentMap).map((pm) => ({
        method: pm,
        count: paymentMap[pm].count,
        amount: paymentMap[pm].amount,
        percentage: totalExpense > 0 ? parseFloat(((paymentMap[pm].amount / totalExpense) * 100).toFixed(1)) : 0,
      }));

      const subscriptions = userBills
        .filter((b) => b.category === 'Entertainment' || b.title.toLowerCase().includes('netflix') || b.title.toLowerCase().includes('spotify') || b.title.toLowerCase().includes('icloud') || b.amount < 1500)
        .map((b) => ({
          title: b.title,
          amount: b.amount,
          frequency: b.billingCycle || 'Monthly',
        }));

      const loans = userBills
        .filter((b) => b.title.toLowerCase().includes('loan') || b.title.toLowerCase().includes('emi') || b.amount >= 1500)
        .map((b) => ({
          title: b.title,
          outstanding: b.amount * 120,
          emi: b.amount,
          principalPaid: Math.round(b.amount * 0.55),
          interestPaid: Math.round(b.amount * 0.45),
        }));

      let overallBudget = 0;
      let actualSpending = 0;

      const budgetPerformance = userBudgets.map((b) => {
        overallBudget += b.effectiveLimit;
        actualSpending += b.spent;
        const diff = b.effectiveLimit - b.spent;
        return {
          category: b.category,
          budget: b.effectiveLimit,
          spent: b.spent,
          difference: diff,
          status: b.spent > b.effectiveLimit ? 'Exceeded' : 'Within',
        };
      });

      const budgetRemaining = overallBudget - actualSpending;

      const openingBalance = 72500;
      const closingBalance = openingBalance + netCashFlow;
      const monthlyTrend = txRes.data.data.summary?.monthlyTrend || [];

      // AI Executive Summary
      const aiExecutiveSummary = generateAIExecutiveSummary(
        totalIncome,
        totalExpense,
        expenseCategories,
        budgetPerformance,
        subscriptions
      );

      setReportData({
        startDateStr: start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        endDateStr: end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        openingBalance,
        closingBalance,
        totalIncome,
        totalExpense,
        netCashFlow,
        savingsRate,
        incomeSources,
        expenseCategories,
        cashFlowTrend: monthlyTrend,
        budgetPerformance,
        overallBudget,
        actualSpending,
        budgetRemaining,
        loans,
        subscriptions,
        topMerchants,
        paymentMethods,
        rawTransactions: periodTx,
        aiExecutiveSummary,
      });

      setLoading(false);
    } catch (error) {
      console.error('Error generating report:', error);
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  // Export CSV
  const handleExportCSV = () => {
    if (!reportData.rawTransactions.length) return;
    const headers = ['Date', 'Description', 'Category', 'Type', 'Payment Method', 'Amount'];
    const rows = reportData.rawTransactions.map((tx) => [
      new Date(tx.date).toISOString().split('T')[0],
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.category,
      tx.type,
      tx.paymentMethod || 'UPI',
      tx.amount,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `WalletSphere_Report_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF / Print
  const handleExportPDF = () => {
    window.print();
  };

  const totalMonthlySubscriptions = reportData.subscriptions.reduce((sum, s) => sum + s.amount, 0);
  const estimatedAnnualSubscriptions = totalMonthlySubscriptions * 12;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn printable-area">
      
      {/* 1. REPORTS HEADER & CONTROLS */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-600">
              FINANCIAL STATEMENT & REPORTS
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight mt-0.5">
              Reports
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate detailed financial statements, AI executive summaries, and export custom reports.
            </p>
          </div>

          {/* Export Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsBuilderModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-800 text-xs font-bold hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              <SlidersHorizontal size={15} /> Custom Builder
            </button>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-950 text-white text-xs font-bold shadow-md hover:bg-emerald-600 transition cursor-pointer"
            >
              <Printer size={15} /> Export PDF
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet size={15} /> Export CSV
            </button>
          </div>
        </div>

        {/* Period Selector & Generate Trigger */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Period:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-bold focus:bg-white focus:border-emerald-500 focus:outline-none transition cursor-pointer"
            >
              {periodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {period === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                />
              </div>
            )}
          </div>

          <button
            onClick={generateReport}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 font-semibold">
          Generating financial statement report...
        </div>
      ) : (
        <>
          {/* 19. AI EXECUTIVE SUMMARY & PREDICTIVE RECOMMENDATIONS CARD */}
          {reportData.aiExecutiveSummary && (
            <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-indigo-500/10 border border-emerald-500/20 backdrop-blur-xl rounded-3xl p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-950">WalletSphere AI Executive Insights</h3>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">STATEMENT SUMMARY & PREDICTIVE RECOMMENDATIONS</span>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {reportData.aiExecutiveSummary.summaryText}
              </p>

              {reportData.aiExecutiveSummary.recommendations.length > 0 && (
                <div className="pt-2 border-t border-emerald-500/20 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                    <Lightbulb size={13} className="text-amber-500" /> Potential Predictive Recommendations:
                  </span>
                  <ul className="space-y-1 text-xs text-slate-600 pl-4 list-disc font-medium">
                    {reportData.aiExecutiveSummary.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 2. FINANCIAL SUMMARY STATEMENT CARD */}
          {sections.summary && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-7 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                    STATEMENT SUMMARY
                  </span>
                  <h3 className="text-lg font-black text-slate-950">FINANCIAL SUMMARY</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    {reportData.startDateStr} – {reportData.endDateStr}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Savings Rate</span>
                  <span className="text-2xl font-black text-emerald-600">{reportData.savingsRate}%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center pt-1">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Opening Balance</span>
                  <span className="text-base font-black text-slate-900">
                    {currencySymbol}{reportData.openingBalance.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Total Income</span>
                  <span className="text-base font-black text-emerald-700">
                    +{currencySymbol}{reportData.totalIncome.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200/80">
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Total Expenses</span>
                  <span className="text-base font-black text-rose-700">
                    -{currencySymbol}{reportData.totalExpense.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Net Cash Flow</span>
                  <span className={`text-base font-black ${reportData.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {reportData.netCashFlow >= 0 ? '+' : ''}{currencySymbol}{reportData.netCashFlow.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900 text-white border border-slate-800 col-span-2 md:col-span-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Closing Balance</span>
                  <span className="text-base font-black">
                    {currencySymbol}{reportData.closingBalance.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. INCOME & 4. EXPENSE REPORTS GRID (PERFECTLY BALANCED EQUAL HEIGHT CARDS WITH VISUAL PROGRESS BARS) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-stretch">
            
            {/* 3. INCOME REPORT */}
            {sections.income && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                        <ArrowDownLeft size={18} className="text-emerald-600" /> Income Report
                      </h3>
                      <p className="text-xs text-slate-400">Where your money came from</p>
                    </div>
                    <span className="text-sm font-black text-emerald-600">
                      +{currencySymbol}{reportData.totalIncome.toLocaleString()}
                    </span>
                  </div>

                  {reportData.incomeSources.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">No income entries recorded for this period.</div>
                  ) : (
                    <div className="space-y-3 pt-3">
                      {reportData.incomeSources.map((item) => (
                        <div key={item.source} className="p-3 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-extrabold text-slate-950">{item.source}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-emerald-600">
                                +{currencySymbol}{item.amount.toLocaleString()}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                {item.percentage}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Balance Helper Widget for Visual Symmetry */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between text-xs mt-auto">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-emerald-600" /> Primary Inflow Channel
                  </span>
                  <span className="font-extrabold text-emerald-700">
                    {reportData.incomeSources[0]?.source || 'Salary'} ({reportData.incomeSources[0]?.percentage || 100}%)
                  </span>
                </div>
              </div>
            )}

            {/* 4. EXPENSE REPORT */}
            {sections.expense && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                        <ArrowUpRight size={18} className="text-rose-500" /> Expense Report
                      </h3>
                      <p className="text-xs text-slate-400">Where your money went</p>
                    </div>
                    <span className="text-sm font-black text-rose-500">
                      -{currencySymbol}{reportData.totalExpense.toLocaleString()}
                    </span>
                  </div>

                  {reportData.expenseCategories.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">No expense entries recorded for this period.</div>
                  ) : (
                    <div className="space-y-2.5 pt-3 max-h-[340px] overflow-y-auto pr-1">
                      {reportData.expenseCategories.map((item) => (
                        <div key={item.category} className="p-2.5 rounded-xl hover:bg-slate-50/80 transition space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                              <span className="font-bold text-slate-900">{item.category}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-950">
                                -{currencySymbol}{item.amount.toLocaleString()}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 w-10 text-right">
                                {item.percentage}%
                              </span>
                            </div>
                          </div>

                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Balance Summary Widget */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs mt-auto">
                  <span className="font-bold text-slate-700">Total Categories Analyzed</span>
                  <span className="font-extrabold text-slate-950">{reportData.expenseCategories.length} categories</span>
                </div>
              </div>
            )}

          </div>

          {/* 5. CASH FLOW REPORT */}
          {sections.cashFlow && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                    <TrendingUp size={18} className="text-emerald-600" /> Cash Flow Report
                  </h3>
                  <p className="text-xs text-slate-400">Inflow vs Outflow cash trajectory</p>
                </div>
                <span className={`text-base font-black ${reportData.netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  Net: {reportData.netCashFlow >= 0 ? '+' : ''}{currencySymbol}{reportData.netCashFlow.toLocaleString()}
                </span>
              </div>

              {reportData.cashFlowTrend.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-3">Month</th>
                        <th className="py-3 px-3 text-right">Income (Inflow)</th>
                        <th className="py-3 px-3 text-right">Expense (Outflow)</th>
                        <th className="py-3 px-3 text-right">Net Flow</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 font-semibold">
                      {reportData.cashFlowTrend.map((row) => {
                        const net = row.Income - row.Expense;
                        return (
                          <tr key={row.month} className="hover:bg-slate-50/60 transition">
                            <td className="py-3 px-3 font-extrabold text-slate-900">{row.month}</td>
                            <td className="py-3 px-3 text-right text-emerald-600">+{currencySymbol}{row.Income.toLocaleString()}</td>
                            <td className="py-3 px-3 text-right text-rose-500">-{currencySymbol}{row.Expense.toLocaleString()}</td>
                            <td className={`py-3 px-3 text-right font-black ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {net >= 0 ? '+' : ''}{currencySymbol}{net.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 6. BUDGET PERFORMANCE REPORT */}
          {sections.budget && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                    <PieIcon size={18} className="text-indigo-500" /> Budget Performance Report
                  </h3>
                  <p className="text-xs text-slate-400">Target limits vs actual spending analysis</p>
                </div>

                <div className="text-right text-xs">
                  <span className="text-slate-400 font-medium block">Overall Remaining</span>
                  <span className={`font-black text-sm ${reportData.budgetRemaining >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {reportData.budgetRemaining >= 0 ? '+' : ''}{currencySymbol}{reportData.budgetRemaining.toLocaleString()}
                  </span>
                </div>
              </div>

              {reportData.budgetPerformance.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">No budget entries set for this period.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3 text-right">Budget</th>
                        <th className="py-3 px-3 text-right">Spent</th>
                        <th className="py-3 px-3 text-right">Difference</th>
                        <th className="py-3 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 font-semibold">
                      {reportData.budgetPerformance.map((b) => (
                        <tr key={b.category} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-3 font-extrabold text-slate-900">{b.category}</td>
                          <td className="py-3 px-3 text-right">{currencySymbol}{b.budget.toLocaleString()}</td>
                          <td className="py-3 px-3 text-right text-slate-900">{currencySymbol}{b.spent.toLocaleString()}</td>
                          <td className={`py-3 px-3 text-right font-bold ${b.difference >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {b.difference >= 0 ? '+' : ''}{currencySymbol}{b.difference.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                b.status === 'Exceeded'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 7. SAVINGS REPORT */}
          {sections.savings && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-3">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                    <Wallet size={18} className="text-blue-500" /> Savings Report
                  </h3>
                  <p className="text-xs text-slate-400">Total savings rate and monthly accumulation</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Savings Rate</span>
                  <span className="text-xl font-black text-emerald-600">{reportData.savingsRate}%</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center py-2">
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Total Income</span>
                  <span className="text-base font-black text-emerald-700">+{currencySymbol}{reportData.totalIncome.toLocaleString()}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200">
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Total Expenses</span>
                  <span className="text-base font-black text-rose-700">-{currencySymbol}{reportData.totalExpense.toLocaleString()}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900 text-white border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Net Savings</span>
                  <span className="text-base font-black">+{currencySymbol}{reportData.netCashFlow.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* 10. LOAN / EMI REPORT & 11. SUBSCRIPTION REPORT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            
            {/* 10. LOAN / EMI REPORT */}
            {sections.loans && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-3">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                      <Building2 size={18} className="text-amber-600" /> Loan & EMI Liability Report
                    </h3>
                    <p className="text-xs text-slate-400">Track outstanding loans, principal, and EMI interest</p>
                  </div>
                </div>

                {reportData.loans.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">No active loans or EMIs logged.</div>
                ) : (
                  <div className="space-y-3">
                    {reportData.loans.map((loan) => (
                      <div key={loan.title} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-xs text-slate-950">{loan.title}</h4>
                          <span className="text-xs font-black text-rose-600">{currencySymbol}{loan.emi.toLocaleString()} / mo</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                          <div><span className="text-slate-400 block">Outstanding</span><b>{currencySymbol}{loan.outstanding.toLocaleString()}</b></div>
                          <div><span className="text-slate-400 block">Principal</span><b>{currencySymbol}{loan.principalPaid.toLocaleString()}</b></div>
                          <div><span className="text-slate-400 block">Interest</span><b>{currencySymbol}{loan.interestPaid.toLocaleString()}</b></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 11. SUBSCRIPTION REPORT */}
            {sections.subscriptions && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-3">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                      <Tv size={18} className="text-purple-600" /> Subscription Report
                    </h3>
                    <p className="text-xs text-slate-400">Analyze recurring digital & entertainment costs</p>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-slate-400 block font-medium">Est. Annual</span>
                    <span className="font-black text-purple-600">{currencySymbol}{estimatedAnnualSubscriptions.toLocaleString()}</span>
                  </div>
                </div>

                {reportData.subscriptions.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">No active subscriptions detected.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                          <th className="py-2 px-2">Subscription</th>
                          <th className="py-2 px-2 text-center">Frequency</th>
                          <th className="py-2 px-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                        {reportData.subscriptions.map((sub) => (
                          <tr key={sub.title} className="hover:bg-slate-50/60 transition">
                            <td className="py-2.5 px-2 font-bold text-slate-900">{sub.title}</td>
                            <td className="py-2.5 px-2 text-center text-slate-500">{sub.frequency}</td>
                            <td className="py-2.5 px-2 text-right font-extrabold text-purple-600">
                              {currencySymbol}{sub.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* 12. MERCHANT / PAYEE & 13. PAYMENT METHOD REPORT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            
            {/* 12. MERCHANT / PAYEE REPORT */}
            {sections.merchants && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-3">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                    <Store size={18} className="text-blue-600" /> Top Merchants / Payees Report
                  </h3>
                  <p className="text-xs text-slate-400">Top places where money was spent</p>
                </div>

                {reportData.topMerchants.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">No merchant data available.</div>
                ) : (
                  <div className="space-y-2 text-xs">
                    {reportData.topMerchants.map((m) => (
                      <div key={m.name} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition">
                        <span className="font-bold text-slate-900">{m.name}</span>
                        <span className="font-extrabold text-slate-950">{currencySymbol}{m.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 13. PAYMENT METHOD REPORT */}
            {sections.paymentMethods && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-3">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                    <CreditCard size={18} className="text-emerald-600" /> Payment Method Breakdown Report
                  </h3>
                  <p className="text-xs text-slate-400">Transaction volume & amount per channel</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-2 px-2">Method</th>
                        <th className="py-2 px-2 text-center">Tx Count</th>
                        <th className="py-2 px-2 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                      {reportData.paymentMethods.map((pm) => (
                        <tr key={pm.method} className="hover:bg-slate-50/60 transition">
                          <td className="py-2.5 px-2 font-bold text-slate-900">{pm.method}</td>
                          <td className="py-2.5 px-2 text-center text-slate-500">{pm.count} txs</td>
                          <td className="py-2.5 px-2 text-right font-extrabold text-slate-950">
                            {currencySymbol}{pm.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </>
      )}

      {/* 18. CUSTOM REPORT BUILDER MODAL */}
      {isBuilderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <SlidersHorizontal size={16} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-950">Custom Report Builder</h3>
                  <p className="text-[11px] text-slate-400">Choose exactly which sections to include in your statement</p>
                </div>
              </div>
              <button onClick={() => setIsBuilderModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <span className="font-bold text-slate-700 block">Include Sections:</span>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { key: 'summary', label: 'Financial Summary' },
                  { key: 'income', label: 'Income Report' },
                  { key: 'expense', label: 'Expense Report' },
                  { key: 'cashFlow', label: 'Cash Flow Report' },
                  { key: 'budget', label: 'Budget Performance' },
                  { key: 'savings', label: 'Savings Report' },
                  { key: 'loans', label: 'Loans & EMIs' },
                  { key: 'subscriptions', label: 'Subscriptions' },
                  { key: 'merchants', label: 'Top Merchants' },
                  { key: 'paymentMethods', label: 'Payment Methods' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer select-none font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={!!sections[item.key]}
                      onChange={() => setSections({ ...sections, [item.key]: !sections[item.key] })}
                      className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setIsBuilderModalOpen(false);
                generateReport();
              }}
              className="w-full py-3 rounded-xl bg-slate-950 text-white font-bold text-xs hover:bg-emerald-600 transition cursor-pointer shadow-md mt-2"
            >
              Generate Custom Report →
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default ReportsView;
