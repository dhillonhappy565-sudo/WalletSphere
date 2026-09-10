import React from 'react';
import {
  X,
  Calendar,
  Tag,
  CreditCard,
  Hash,
  ShieldCheck,
  Edit2,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  FileText,
  Clock,
} from 'lucide-react';

function TransactionDetailsModal({
  isOpen,
  onClose,
  transaction,
  onEdit,
  onDelete,
  currencySymbol = '₹',
}) {
  if (!isOpen || !transaction) return null;

  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden relative">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <span
              className={`p-2 rounded-xl text-white font-bold ${
                isIncome
                  ? 'bg-emerald-600'
                  : isTransfer
                  ? 'bg-blue-600'
                  : 'bg-rose-500'
              }`}
            >
              {isIncome ? (
                <ArrowDownLeft size={18} />
              ) : isTransfer ? (
                <ArrowRightLeft size={18} />
              ) : (
                <ArrowUpRight size={18} />
              )}
            </span>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                TRANSACTION DETAILS
              </span>
              <h3 className="text-base font-extrabold text-slate-950 truncate max-w-[240px]">
                {transaction.description}
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

        {/* Content Body */}
        <div className="p-6 space-y-6">
          
          {/* Main Amount Card */}
          <div className="text-center p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
              {transaction.type} Amount
            </span>
            <p
              className={`text-3xl sm:text-4xl font-black tracking-tight ${
                isIncome
                  ? 'text-emerald-600'
                  : isTransfer
                  ? 'text-blue-600'
                  : 'text-rose-500'
              }`}
            >
              {isIncome ? '+' : isTransfer ? '⇄ ' : '-'}{currencySymbol}{transaction.amount.toLocaleString()}
            </p>
            {transaction.isExcludedFromSummary && (
              <span className="inline-block mt-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold border border-blue-200">
                Excluded from Net Expense Summary (Neutral)
              </span>
            )}
          </div>

          {/* Details Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            
            {/* Date */}
            <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-1">
              <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                <Calendar size={13} /> Date
              </span>
              <p className="font-bold text-slate-900">
                {new Date(transaction.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Category */}
            <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-1">
              <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                <Tag size={13} /> Category
              </span>
              <p className="font-bold text-slate-900">{transaction.category}</p>
            </div>

            {/* Payment Method */}
            <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-1">
              <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                <CreditCard size={13} /> Payment Method
              </span>
              <p className="font-bold text-slate-900">{transaction.paymentMethod || 'UPI'}</p>
            </div>

            {/* Source */}
            <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-1">
              <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                <FileText size={13} /> Source
              </span>
              <p className="font-bold text-slate-900 uppercase">
                {transaction.source || 'Manual Input'}
              </p>
            </div>

          </div>

          {/* Audit Metadata Footer */}
          <div className="p-3.5 rounded-2xl bg-slate-100/60 border border-slate-200/60 space-y-1 text-[11px] text-slate-500 font-mono">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Hash size={12} /> Transaction ID:
              </span>
              <span className="font-bold text-slate-800 select-all">{transaction._id}</span>
            </div>
            {transaction.hash && (
              <div className="flex items-center justify-between">
                <span>Deduplication Hash:</span>
                <span className="font-bold text-slate-700 truncate max-w-[180px]">{transaction.hash}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                onClose();
                onEdit(transaction);
              }}
              className="py-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold text-xs hover:bg-slate-50 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Edit2 size={14} />
              Edit Details
            </button>

            <button
              onClick={() => {
                onClose();
                onDelete(transaction._id);
              }}
              className="py-3 px-4 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <Trash2 size={14} />
              Delete Transaction
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

export default TransactionDetailsModal;
