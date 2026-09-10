import React, { useState, useEffect } from 'react';
import { X, Target, Calendar, Repeat, RefreshCw } from 'lucide-react';
import API from '../../services/api';

const CATEGORIES = [
  'Food',
  'Shopping',
  'Travel',
  'Entertainment',
  'Bills',
  'Healthcare',
  'Salary',
  'Investment',
  'Transfer & Reimbursement',
  'Others',
];

function SetBudgetModal({ isOpen, onClose, onBudgetSaved, initialData = null, currencySymbol = '₹' }) {
  const [formData, setFormData] = useState({
    category: 'Food',
    monthlyLimit: '',
    period: 'monthly',
    customStartDate: '',
    customEndDate: '',
    rolloverEnabled: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        category: initialData.category || 'Food',
        monthlyLimit: initialData.monthlyLimit || '',
        period: initialData.period || 'monthly',
        customStartDate: initialData.customStartDate ? initialData.customStartDate.slice(0, 10) : '',
        customEndDate: initialData.customEndDate ? initialData.customEndDate.slice(0, 10) : '',
        rolloverEnabled: !!initialData.rolloverEnabled,
      });
    } else {
      setFormData({
        category: 'Food',
        monthlyLimit: '',
        period: 'monthly',
        customStartDate: '',
        customEndDate: '',
        rolloverEnabled: false,
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.monthlyLimit || parseFloat(formData.monthlyLimit) <= 0) {
      return setError('Please enter a valid budget limit amount.');
    }

    if (formData.period === 'custom' && (!formData.customStartDate || !formData.customEndDate)) {
      return setError('Please select both Start and End dates for custom budget period.');
    }

    setLoading(true);

    try {
      await API.post('/budgets', formData);
      setLoading(false);
      onBudgetSaved();
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Failed to save budget limit.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Target size={16} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-950">
                {initialData ? 'Edit Budget Target' : 'Set Category Budget'}
              </h3>
              <p className="text-[11px] text-slate-500">Configure target limit, period, and rollover</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/60 text-slate-500 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
              {error}
            </div>
          )}

          {/* Category Dropdown */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Category</label>
            <select
              value={formData.category}
              disabled={!!initialData}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none transition cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Budget Period Dropdown */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Budget Period</label>
            <select
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none transition cursor-pointer"
            >
              <option value="monthly">Monthly (Default)</option>
              <option value="weekly">Weekly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom Date Range (e.g. Vacation)</option>
            </select>
          </div>

          {/* Custom Date Pickers */}
          {formData.period === 'custom' && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 animate-fadeIn">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.customStartDate}
                  onChange={(e) => setFormData({ ...formData, customStartDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.customEndDate}
                  onChange={(e) => setFormData({ ...formData, customEndDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                />
              </div>
            </div>
          )}

          {/* Target Amount */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Target Limit ({currencySymbol})</label>
            <input
              type="number"
              required
              min="1"
              placeholder="e.g. 6000"
              value={formData.monthlyLimit}
              onChange={(e) => setFormData({ ...formData, monthlyLimit: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-extrabold text-sm text-slate-900 focus:border-emerald-500 focus:outline-none transition"
            />
          </div>

          {/* Rollover Toggle */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 block flex items-center gap-1">
                <RefreshCw size={12} className="text-emerald-600" /> Rollover Unused Amount
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Roll unspent budget from previous period into current period.
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.rolloverEnabled}
                onChange={(e) => setFormData({ ...formData, rolloverEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="py-3 px-4 rounded-xl bg-slate-950 text-white font-bold hover:bg-emerald-600 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Budget Target'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

export default SetBudgetModal;
