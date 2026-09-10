import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  AlignLeft,
  Smartphone,
  CreditCard,
  Banknote,
  Building,
  CircleEllipsis,
  Info,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import API from '../../services/api';

const CATEGORIES = [
  { name: 'Food', color: '#10b981' },
  { name: 'Shopping', color: '#3b82f6' },
  { name: 'Travel', color: '#8b5cf6' },
  { name: 'Entertainment', color: '#ec4899' },
  { name: 'Bills', color: '#f59e0b' },
  { name: 'Healthcare', color: '#ef4444' },
  { name: 'Salary', color: '#10b981' },
  { name: 'Investment', color: '#06b6d4' },
  { name: 'Transfer & Reimbursement', color: '#64748b' },
  { name: 'Others', color: '#64748b' },
];

const PAYMENT_METHODS = [
  { name: 'UPI', icon: Smartphone, color: '#10b981' },
  { name: 'Credit Card', icon: CreditCard, color: '#6366f1' },
  { name: 'Debit Card', icon: CreditCard, color: '#3b82f6' },
  { name: 'Cash', icon: Banknote, color: '#84cc16' },
  { name: 'Bank Transfer', icon: Building, color: '#8b5cf6' },
  { name: 'Other', icon: CircleEllipsis, color: '#64748b' },
];

function AddTransactionModal({ isOpen, onClose, onTransactionSaved, initialData = null, currencySymbol = '₹' }) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense',
    category: 'Food',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'UPI',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        description: initialData.description || '',
        amount: initialData.amount || '',
        type: initialData.type || 'expense',
        category: initialData.category || 'Food',
        date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        paymentMethod: initialData.paymentMethod || 'UPI',
      });
    } else {
      setFormData({
        description: '',
        amount: '',
        type: 'expense',
        category: 'Food',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'UPI',
      });
    }
    setError('');
    setDuplicateWarning(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e, forceAllowDuplicate = false) => {
    if (e) e.preventDefault();
    setError('');

    if (!formData.description.trim()) {
      return setError('Please enter a description');
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return setError('Please enter a valid amount greater than 0');
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        isExcludedFromSummary: formData.type === 'transfer',
        allowDuplicate: forceAllowDuplicate,
      };

      if (initialData && initialData._id) {
        await API.put(`/transactions/${initialData._id}`, payload);
      } else {
        await API.post('/transactions', payload);
      }

      setLoading(false);
      setDuplicateWarning(null);
      onTransactionSaved();
      onClose();
    } catch (err) {
      setLoading(false);
      if (err.response?.status === 409 && err.response?.data?.status === 'duplicate_warning') {
        // Show Duplicate Warning Screen
        setDuplicateWarning(err.response.data.existingTransaction);
      } else {
        setError(err.response?.data?.message || 'Failed to save transaction. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-950">
              {duplicateWarning ? 'Duplicate Detected' : initialData ? 'Edit Transaction' : 'Add New Transaction'}
            </h3>
            <p className="text-xs text-slate-400">
              {duplicateWarning ? 'Potential duplicate entry warning' : 'Record income, expense, or neutral transfer'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/60 text-slate-500 hover:text-slate-900 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* DUPLICATE WARNING OVERLAY SCREEN */}
        {duplicateWarning ? (
          <div className="p-6 space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto border border-amber-200">
              <AlertTriangle size={28} />
            </div>

            <div>
              <h4 className="text-lg font-extrabold text-slate-950">
                Possible Duplicate Transaction
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                You already recorded an entry for <strong>"{duplicateWarning.description}"</strong> worth <strong>{currencySymbol}{duplicateWarning.amount}</strong> on {new Date(duplicateWarning.date).toLocaleDateString()}.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-left text-xs space-y-1 text-amber-900 font-medium">
              <div className="flex justify-between">
                <span className="text-amber-700 font-semibold">Existing Entry:</span>
                <span className="font-bold">{duplicateWarning.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-700 font-semibold">Amount:</span>
                <span className="font-bold">{currencySymbol}{duplicateWarning.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-700 font-semibold">Category:</span>
                <span className="font-bold">{duplicateWarning.category}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Skip / Cancel
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleSubmit(null, true)}
                className="py-3 px-4 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition shadow-md cursor-pointer disabled:opacity-70"
              >
                {loading ? 'Adding...' : 'Add Anyway'}
              </button>
            </div>
          </div>
        ) : (
          /* STANDARD FORM */
          <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                {error}
              </div>
            )}

            {/* Income / Expense / Transfer Toggle Pills */}
            <div>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, type: 'expense' }))}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    formData.type === 'expense'
                      ? 'bg-white text-rose-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <ArrowUpRight size={15} className="stroke-[2.5]" />
                  Expense
                </button>

                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, type: 'income', category: 'Salary' }))}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    formData.type === 'income'
                      ? 'bg-white text-emerald-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <ArrowDownLeft size={15} className="stroke-[2.5]" />
                  Income
                </button>

                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, type: 'transfer', category: 'Transfer & Reimbursement' }))}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    formData.type === 'transfer'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <ArrowRightLeft size={15} className="stroke-[2.5]" />
                  Transfer
                </button>
              </div>

              {formData.type === 'transfer' && (
                <div className="mt-2 flex items-start gap-2 p-2.5 rounded-xl bg-blue-50/80 border border-blue-100 text-[11px] text-blue-800">
                  <Info size={14} className="shrink-0 text-blue-600 mt-0.5" />
                  <span>
                    <strong>Neutral Transfer:</strong> Self-account transfers or friend reimbursements will be logged cleanly, but <strong>excluded</strong> from monthly Income/Expense metrics.
                  </span>
                </div>
              )}
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount ({currencySymbol})
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-sm">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  name="amount"
                  required
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-900 font-bold placeholder:font-normal focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Description Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <AlignLeft size={16} />
                </div>
                <input
                  type="text"
                  name="description"
                  required
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="e.g. Grocery Shopping, Salary, Uber Trip"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Category Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Category
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    type="button"
                    key={cat.name}
                    onClick={() => setFormData((prev) => ({ ...prev, category: cat.name }))}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      formData.category === cat.name
                        ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                    <span className="truncate">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((pm) => {
                  const IconComponent = pm.icon;
                  const isSelected = formData.paymentMethod === pm.name;
                  return (
                    <button
                      type="button"
                      key={pm.name}
                      onClick={() => setFormData((prev) => ({ ...prev, paymentMethod: pm.name }))}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/90 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <IconComponent size={13} />
                      </div>
                      <span className="truncate font-medium">{pm.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:border-emerald-500 focus:outline-none cursor-pointer"
              />
            </div>

            {/* Submit Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-slate-950 text-white font-semibold text-sm hover:bg-emerald-600 transition duration-300 shadow-md shadow-slate-950/10 cursor-pointer disabled:opacity-70"
              >
                {loading ? 'Saving...' : initialData ? 'Update Transaction' : 'Add Transaction'}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}

export default AddTransactionModal;
