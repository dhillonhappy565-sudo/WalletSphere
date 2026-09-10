import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import SetBudgetModal from './SetBudgetModal';
import BudgetDetailsModal from './BudgetDetailsModal';
import {
  PieChart,
  Plus,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Sliders,
  Copy,
  RefreshCw,
  Calendar,
  Zap,
} from 'lucide-react';

function BudgetsView({ currencySymbol = '₹' }) {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));

  // Modal States
  const [isSetModalOpen, setIsSetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [viewingBudgetDetails, setViewingBudgetDetails] = useState(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const res = await API.get('/budgets', { params: { month: currentMonth } });
      setBudgets(res.data.data.budgets || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading budgets:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [currentMonth]);

  const handleCopyPreviousMonth = async () => {
    try {
      setCopyLoading(true);
      setMessage('');
      const res = await API.post('/budgets/copy-previous', { month: currentMonth });
      setCopyLoading(false);
      setMessage(res.data.message || 'Budgets copied from previous month successfully!');
      fetchBudgets();
    } catch (err) {
      setCopyLoading(false);
      setMessage(err.response?.data?.message || 'Failed to copy previous month budgets.');
    }
  };

  const handleOpenSetModal = (budget = null) => {
    setEditingBudget(budget);
    setIsSetModalOpen(true);
  };

  // Calculate Aggregates
  const totalBudgeted = budgets.reduce((sum, b) => sum + b.effectiveLimit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const overallPercentage = totalBudgeted > 0 ? Math.min(100, Math.round((totalSpent / totalBudgeted) * 100)) : 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-600">
            SMART BUDGET PLANNING
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight mt-0.5">
            Category Budgets & Rollover
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Set multi-period budget targets, roll over unspent amounts, and prevent overspending.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCopyPreviousMonth}
            disabled={copyLoading}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <Copy size={15} />
            {copyLoading ? 'Copying...' : "Copy Previous Month's Budgets"}
          </button>

          <button
            onClick={() => handleOpenSetModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 text-white text-xs font-semibold shadow-md hover:bg-emerald-600 transition cursor-pointer"
          >
            <Plus size={16} />
            Set Category Budget
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center justify-between animate-fadeIn">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-emerald-600 hover:text-emerald-950">✕</button>
        </div>
      )}

      {/* OVERALL BUDGET HEALTH BANNER */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Budgeted</span>
            <span className="text-xl sm:text-2xl font-black text-slate-950">
              {currencySymbol}{totalBudgeted.toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Spent</span>
            <span className="text-xl sm:text-2xl font-black text-slate-950">
              {currencySymbol}{totalSpent.toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Remaining</span>
            <span className={`text-xl sm:text-2xl font-black ${totalRemaining < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {totalRemaining < 0 ? '-' : ''}{currencySymbol}{Math.abs(totalRemaining).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-600">Overall Monthly Budget Health</span>
            <span className={overallPercentage >= 100 ? 'text-rose-600' : 'text-emerald-600'}>
              {overallPercentage}% Spent
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                overallPercentage >= 100 ? 'bg-rose-500' : overallPercentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${overallPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* BUDGET CARDS GRID */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-semibold">
          Loading budget targets...
        </div>
      ) : budgets.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-400 space-y-3">
          <PieChart size={36} className="mx-auto text-slate-300" />
          <p className="font-bold text-slate-700 text-sm">No budget targets set for this month</p>
          <p className="text-slate-400">
            Click "Set Category Budget" or "Copy Previous Month's Budgets" to start tracking.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {budgets.map((b) => {
            const isExceeded = b.status === 'exceeded';
            const isWarning = b.status === 'warning';

            return (
              <div
                key={b._id}
                onClick={() => setViewingBudgetDetails(b)}
                className={`p-5 rounded-3xl border bg-white shadow-xs hover:shadow-md transition duration-300 cursor-pointer space-y-3 relative group ${
                  isExceeded
                    ? 'border-rose-200 bg-rose-50/20'
                    : isWarning
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-slate-200/80 hover:border-emerald-300'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-950">{b.category}</span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase">
                      {b.period || 'monthly'}
                    </span>
                  </div>

                  {b.rolloverAmount > 0 && (
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <RefreshCw size={10} /> +{currencySymbol}{b.rolloverAmount} Rollover
                    </span>
                  )}
                </div>

                {/* Amount Row */}
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Spent</span>
                    <span className={`text-xl font-black ${isExceeded ? 'text-rose-600' : 'text-slate-950'}`}>
                      {currencySymbol}{b.spent.toLocaleString()}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Limit</span>
                    <span className="text-sm font-extrabold text-slate-700">
                      {currencySymbol}{b.effectiveLimit.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-400 font-medium">{b.remaining < 0 ? 'Exceeded by' : 'Remaining'}</span>
                    <span className={isExceeded ? 'text-rose-600 font-extrabold' : 'text-emerald-600'}>
                      {currencySymbol}{Math.abs(b.remaining).toLocaleString()} ({b.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isExceeded ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${b.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Daily Allowance Remaining Footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                    <Zap size={13} className="text-amber-500" /> Daily Allowance
                  </span>
                  <span className="font-extrabold text-slate-900">
                    {currencySymbol}{b.dailyAllowance.toLocaleString()} / day
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SET / EDIT BUDGET MODAL */}
      <SetBudgetModal
        isOpen={isSetModalOpen}
        onClose={() => setIsSetModalOpen(false)}
        onBudgetSaved={fetchBudgets}
        initialData={editingBudget}
        currencySymbol={currencySymbol}
      />

      {/* BUDGET DETAILS MODAL */}
      <BudgetDetailsModal
        isOpen={!!viewingBudgetDetails}
        onClose={() => setViewingBudgetDetails(null)}
        budget={viewingBudgetDetails}
        onEdit={(b) => {
          setViewingBudgetDetails(null);
          handleOpenSetModal(b);
        }}
        currencySymbol={currencySymbol}
      />

    </div>
  );
}

export default BudgetsView;
