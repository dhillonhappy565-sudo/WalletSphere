import React, { useState } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  CreditCard,
  TrendingUp,
  PieChart as PieIcon,
  Sparkles,
  ArrowRight,
  Utensils,
  ShoppingBag,
  Receipt,
  Compass,
  Briefcase,
  Activity,
  HeartPulse,
  Tag,
  Target,
  Edit,
  Trash2,
  Receipt as ReceiptIcon,
  ShieldCheck,
  Zap,
  Award,
  Calendar,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Pie,
  Cell,
  Sector,
  PieChart as RechartsPieChart,
} from 'recharts';
import { generateAIInsights } from '../../utils/aiInsightsGenerator';
import UpcomingBillsWidget from './UpcomingBillsWidget';

function DashboardOverview({
  summary,
  transactions,
  user,
  currencySymbol = '₹',
  onNavigateToTransactions,
  onNavigateToBudgets,
  onEditTransaction,
  onDeleteTransaction,
  onTransactionUpdated,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showDailySpendTooltip, setShowDailySpendTooltip] = useState(false);

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Food': return Utensils;
      case 'Shopping': return ShoppingBag;
      case 'Bills': return Receipt;
      case 'Travel': return Compass;
      case 'Salary': return Briefcase;
      case 'Investment': return Activity;
      case 'Healthcare': return HeartPulse;
      default: return Tag;
    }
  };

  // Custom Active Shape for Donut Chart
  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 2}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: 'drop-shadow(0px 4px 10px rgba(0,0,0,0.15))' }}
        />
      </g>
    );
  };

  // 6-Month Chronological Trend for Area Chart
  const trendData = summary.monthlyTrend && summary.monthlyTrend.length > 0
    ? summary.monthlyTrend
    : [
        { month: 'Feb', Income: 0, Expense: 0 },
        { month: 'Mar', Income: 0, Expense: 0 },
        { month: 'Apr', Income: 0, Expense: 0 },
        { month: 'May', Income: 0, Expense: 0 },
        { month: 'Jun', Income: 0, Expense: 0 },
        { month: 'Jul', Income: summary.totalIncome, Expense: summary.totalExpense },
      ];

  // Category Breakdown Data for Donut
  const categoryData = summary.categoryBreakdown && summary.categoryBreakdown.length > 0
    ? summary.categoryBreakdown
    : [{ name: 'No Expenses', value: 1, percentage: 100, color: '#e2e8f0' }];

  // Calculate Savings Rate %
  const savingsRate = summary.totalIncome > 0
    ? Math.max(0, parseFloat((((summary.totalIncome - summary.totalExpense) / summary.totalIncome) * 100).toFixed(1)))
    : 0;

  // Calculate Financial Health Score (Out of 100)
  const healthScore = Math.min(100, Math.max(20, Math.round((savingsRate * 0.7) + (summary.netBalance > 0 ? 30 : 0))));

  // Calculate Daily Safe Spend Limit
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate() + 1;
  const remainingBudget = Math.max(0, summary.totalIncome - summary.totalExpense);
  const dailySafeSpend = daysLeft > 0 ? Math.round(remainingBudget / daysLeft) : 0;

  // AI Smart Insights
  const aiInsights = generateAIInsights(summary, transactions);

  // Top 5 Recent Transactions for Overview
  const recentTop5 = transactions.slice(0, 5);
  const userName = user?.fullName?.split(' ')[0] || 'Test1';

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      
      {/* OVERVIEW HERO BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-600">
            FINANCIAL DASHBOARD
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight mt-0.5">
            Welcome back, {userName} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Here is your financial decision-making summary & net worth health.
          </p>
        </div>

        <button
          onClick={onNavigateToTransactions}
          className="inline-flex items-center justify-center gap-2 px-4.5 py-2.5 rounded-xl bg-slate-950 text-white text-xs font-semibold shadow-md hover:bg-emerald-600 transition cursor-pointer"
        >
          <span>View All Transactions</span>
          <ArrowRight size={15} />
        </button>
      </div>

      {/* 4 FINANCIAL SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        
        {/* Total Net Worth */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Total Net Worth</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Wallet size={17} />
            </div>
          </div>
          <p className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight">
            {currencySymbol}{summary.netBalance.toLocaleString()}
          </p>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 block">Live net balance</span>
        </div>

        {/* This Month Income */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500">This Month Income</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft size={17} className="stroke-[2.5]" />
            </div>
          </div>
          <p className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight">
            {currencySymbol}{summary.totalIncome.toLocaleString()}
          </p>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 block">Excludes transfers</span>
        </div>

        {/* This Month Expenses */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500">This Month Expenses</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
              <ArrowUpRight size={17} className="stroke-[2.5]" />
            </div>
          </div>
          <p className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight">
            {currencySymbol}{summary.totalExpense.toLocaleString()}
          </p>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 block">Excludes transfers</span>
        </div>

        {/* Savings Rate % */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Savings Rate</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              %
            </div>
          </div>
          <p className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight">
            {savingsRate}%
          </p>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 block">
            {currencySymbol}{Math.max(0, summary.netBalance).toLocaleString()} saved
          </span>
        </div>

      </div>

      {/* EXTRAORDINARY GLASSMOPHIC AI INTELLIGENCE CARD */}
      <div className="relative rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-indigo-500/10 border border-emerald-500/20 backdrop-blur-xl p-6 sm:p-7 shadow-sm overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-400/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -top-12 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          
          {/* AI Header Badge & Financial Health Score */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-950">
                    WalletSphere AI Intelligence
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                    REAL-TIME
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Personalized spending insights and daily budget limits
                </p>
              </div>
            </div>

            {/* Health Score Pill */}
            <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200/80 shadow-2xs self-start sm:self-auto">
              <Award size={18} className="text-emerald-600" />
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Health Score</span>
                <span className="text-sm font-black text-slate-950">{healthScore} / 100</span>
              </div>
            </div>
          </div>

          {/* AI Insights Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            
            {/* Daily Safe Spend Limit Widget with Info Tooltip */}
            <div className="p-4 rounded-2xl bg-white/95 border border-slate-200/90 shadow-2xs space-y-1.5 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-500" /> Daily Safe Spend
                  <button
                    onClick={() => setShowDailySpendTooltip(!showDailySpendTooltip)}
                    className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
                    title="What is Daily Safe Spend?"
                  >
                    <HelpCircle size={13} />
                  </button>
                </span>
                <span className="text-[10px] font-bold text-slate-400">{daysLeft} days left</span>
              </div>

              {showDailySpendTooltip && (
                <div className="p-2.5 rounded-xl bg-slate-900 text-white text-[11px] space-y-1 my-1 animate-fadeIn">
                  <p className="font-bold text-emerald-400">💡 How Daily Safe Spend Works:</p>
                  <p className="text-slate-200 leading-tight">
                    It takes your remaining money for the month ({currencySymbol}{remainingBudget.toLocaleString()}) and divides it evenly by the {daysLeft} remaining days in this month.
                  </p>
                  <p className="text-slate-300 font-medium">
                    If you spend less than {currencySymbol}{dailySafeSpend.toLocaleString()} today, you will stay 100% on track!
                  </p>
                </div>
              )}

              <p className="text-xl font-black text-slate-950">
                {currencySymbol}{dailySafeSpend.toLocaleString()} <span className="text-xs font-medium text-slate-400">/ day</span>
              </p>
              <p className="text-[11px] text-slate-500 leading-tight">
                Recommended maximum daily budget to stay cash-positive.
              </p>
            </div>

            {/* AI Generated Dynamic Tips */}
            {aiInsights.slice(0, 2).map((tip) => (
              <div
                key={tip.id}
                className="p-4 rounded-2xl bg-white/95 border border-slate-200/90 shadow-2xs space-y-1"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{tip.icon}</span>
                  <h4 className="text-xs font-bold text-slate-900">{tip.title}</h4>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  {tip.message}
                </p>
              </div>
            ))}

          </div>

        </div>
      </div>

      {/* UPCOMING BILLS, EMIS & RECURRING SUBSCRIPTIONS WIDGET */}
      <UpcomingBillsWidget
        currencySymbol={currencySymbol}
        onTransactionUpdated={onTransactionUpdated}
      />

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        
        {/* Left Chart: Income vs Expenses */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div>
              <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                Income vs Expenses Trend
                <TrendingUp size={16} className="text-emerald-500" />
              </h3>
              <p className="text-xs text-slate-400">6-Month historical cash flow timeline</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Income
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> Expense
                </span>
              </div>
            </div>
          </div>

          <div className="w-full flex-1 min-h-[300px] sm:min-h-[350px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 15, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.45}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fb7185" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#fb7185" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  contentStyle={{ background: '#0F172A', borderRadius: '12px', border: 'none', color: '#fff' }}
                  formatter={(value) => [`${currencySymbol}${value.toLocaleString()}`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="Income"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#incomeGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="Expense"
                  stroke="#fb7185"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#expenseGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Chart: Spending by Category */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                  Spending by Category
                  <PieIcon size={16} className="text-indigo-500" />
                </h3>
                <p className="text-xs text-slate-400">Category breakdown of total expenses</p>
              </div>
            </div>

            <div className="relative w-full h-40 my-1 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} cursor="pointer" />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  TOTAL EXPENSE
                </span>
                <span className="text-lg font-black text-slate-950 tracking-tight">
                  {currencySymbol}{summary.totalExpense.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100 max-h-48 overflow-y-auto pr-1">
            {categoryData.map((cat, idx) => {
              const IconComponent = getCategoryIcon(cat.name);
              const isSelected = activeIndex === idx;
              return (
                <div
                  key={cat.name}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`p-2 rounded-xl transition duration-200 cursor-pointer ${
                    isSelected ? 'bg-slate-50 border border-slate-200/80 shadow-xs' : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center text-white text-xs shrink-0"
                        style={{ backgroundColor: cat.color }}
                      >
                        <IconComponent size={11} />
                      </div>
                      <span className="font-semibold text-slate-800 truncate">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-950">
                        {currencySymbol}{cat.value.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium w-8 text-right">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

      {/* RECENT TRANSACTIONS WIDGET (TOP 5 ONLY) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-950">Recent Activity</h3>
            <p className="text-xs text-slate-400">Top 5 latest transactions recorded</p>
          </div>

          <button
            onClick={onNavigateToTransactions}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {recentTop5.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            <ReceiptIcon size={28} className="mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700">No recent activity</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {recentTop5.map((tx) => (
              <div key={tx._id} className="py-3 flex items-center justify-between hover:bg-slate-50/60 px-2 rounded-xl transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                    {tx.description.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 flex items-center gap-2">
                      {tx.description}
                      {tx.type === 'transfer' && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-600 font-bold border border-blue-100">
                          Neutral
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(tx.date).toLocaleDateString()} • {tx.category}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`font-bold text-sm ${
                      tx.type === 'income'
                        ? 'text-emerald-600'
                        : tx.type === 'transfer'
                        ? 'text-blue-600'
                        : 'text-rose-500'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '⇄ ' : '-'}{currencySymbol}{tx.amount.toLocaleString()}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditTransaction(tx)}
                      className="p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      onClick={() => onDeleteTransaction(tx._id)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default DashboardOverview;
