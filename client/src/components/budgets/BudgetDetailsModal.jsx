import React, { useState, useEffect } from 'react';
import {
  X,
  PieChart,
  Zap,
  Calendar,
  Receipt,
  Edit2,
  TrendingDown,
  Clock,
  Repeat,
} from 'lucide-react';
import API from '../../services/api';

function BudgetDetailsModal({ isOpen, onClose, budget, onEdit, currencySymbol = '₹' }) {
  const [categoryTx, setCategoryTx] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && budget) {
      const fetchTx = async () => {
        try {
          setLoading(true);
          const res = await API.get(`/budgets/${budget._id}/transactions`);
          setCategoryTx(res.data.data.transactions || []);
          setLoading(false);
        } catch (err) {
          console.error('Error fetching budget transactions:', err);
          setLoading(false);
        }
      };
      fetchTx();
    }
  }, [isOpen, budget]);

  if (!isOpen || !budget) return null;

  const isExceeded = budget.status === 'exceeded';
  const isWarning = budget.status === 'warning';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 font-extrabold flex items-center justify-center">
              <PieChart size={18} />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                BUDGET DETAILS • {budget.period?.toUpperCase() || 'MONTHLY'}
              </span>
              <h3 className="text-lg font-extrabold text-slate-950">
                {budget.category}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/60 text-slate-500 hover:text-slate-900 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Main Budget Card Summary */}
          <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Budget Limit</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {currencySymbol}{budget.effectiveLimit.toLocaleString()}
                </span>
                {budget.rolloverAmount > 0 && (
                  <span className="text-[9px] font-bold text-emerald-600 block">
                    (+{currencySymbol}{budget.rolloverAmount} rollover)
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Spent</span>
                <span className={`text-sm font-extrabold ${isExceeded ? 'text-rose-600' : 'text-slate-900'}`}>
                  {currencySymbol}{budget.spent.toLocaleString()}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Remaining</span>
                <span className={`text-sm font-extrabold ${budget.remaining < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {budget.remaining < 0 ? '-' : ''}{currencySymbol}{Math.abs(budget.remaining).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500">Target Progress</span>
                <span className={isExceeded ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'}>
                  {budget.percentage}%
                </span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isExceeded ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${budget.percentage}%` }}
                />
              </div>
            </div>

            {/* Daily Allowance Remaining Widget */}
            <div className="p-3 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-amber-500" />
                <span className="text-xs font-bold text-slate-800">Daily Allowance Remaining</span>
              </div>
              <span className="text-sm font-black text-slate-950">
                {currencySymbol}{budget.dailyAllowance.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">/ day</span>
              </span>
            </div>
          </div>

          {/* Category Filtered Transactions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <Receipt size={14} className="text-slate-400" /> Category Transactions ({categoryTx.length})
              </h4>
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading category transactions...</div>
            ) : categoryTx.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">No transactions recorded for {budget.category} yet.</div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto pr-1 text-xs">
                {categoryTx.map((tx) => (
                  <div key={tx._id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{tx.description}</p>
                      <p className="text-[10px] text-slate-400">{new Date(tx.date).toLocaleDateString()}</p>
                    </div>
                    <span className="font-bold text-rose-500">
                      -{currencySymbol}{tx.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Trigger */}
          <button
            onClick={() => {
              onClose();
              onEdit(budget);
            }}
            className="w-full py-3 rounded-xl bg-slate-950 text-white font-bold text-xs hover:bg-emerald-600 transition cursor-pointer flex items-center justify-center gap-2 shadow-md"
          >
            <Edit2 size={14} /> Edit Budget Target
          </button>

        </div>

      </div>
    </div>
  );
}

export default BudgetDetailsModal;
