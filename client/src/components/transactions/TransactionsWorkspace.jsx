import React, { useState } from 'react';
import CustomDropdown from '../common/CustomDropdown';
import TransactionDetailsModal from './TransactionDetailsModal';
import {
  Search,
  Upload,
  Plus,
  Edit,
  Trash2,
  Receipt,
  Layers,
  Utensils,
  ShoppingBag,
  Compass,
  Briefcase,
  Activity,
  HeartPulse,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Eye,
  SlidersHorizontal,
  MoreVertical,
} from 'lucide-react';

function TransactionsWorkspace({
  transactions,
  pagination,
  loading,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedType,
  onTypeChange,
  onOpenAddModal,
  onOpenImportModal,
  onEditTransaction,
  onDeleteTransaction,
  onPageChange,
  currencySymbol = '₹',
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewingTransaction, setViewingTransaction] = useState(null);

  // Category Icon Mapping
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

  // Category & Type Dropdown Options
  const categoryFilterOptions = [
    { label: 'All Categories', value: 'All', icon: Layers, color: '#64748b' },
    { label: 'Food', value: 'Food', colorDot: '#10b981', icon: Utensils },
    { label: 'Shopping', value: 'Shopping', colorDot: '#3b82f6', icon: ShoppingBag },
    { label: 'Travel', value: 'Travel', colorDot: '#8b5cf6', icon: Compass },
    { label: 'Entertainment', value: 'Entertainment', colorDot: '#ec4899', icon: Tag },
    { label: 'Bills', value: 'Bills', colorDot: '#f59e0b', icon: Receipt },
    { label: 'Healthcare', value: 'Healthcare', colorDot: '#ef4444', icon: HeartPulse },
    { label: 'Salary', value: 'Salary', colorDot: '#10b981', icon: Briefcase },
    { label: 'Investment', value: 'Investment', colorDot: '#06b6d4', icon: Activity },
    { label: 'Transfer & Reimbursement', value: 'Transfer & Reimbursement', colorDot: '#64748b', icon: ArrowRightLeft },
    { label: 'Others', value: 'Others', colorDot: '#64748b', icon: Tag },
  ];

  const typeFilterOptions = [
    { label: 'All Types', value: 'All', icon: Layers, color: '#64748b' },
    { label: 'Income', value: 'income', icon: ArrowDownLeft, color: '#10b981' },
    { label: 'Expense', value: 'expense', icon: ArrowUpRight, color: '#fb7185' },
    { label: 'Transfer / Neutral', value: 'transfer', icon: ArrowRightLeft, color: '#3b82f6' },
  ];

  // Select Checkbox Logic
  const handleSelectAll = () => {
    if (selectedIds.length === transactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(transactions.map((t) => t._id));
    }
  };

  const handleToggleSelect = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete ${selectedIds.length} selected transactions?`)) {
      selectedIds.forEach((id) => onDeleteTransaction(id));
      setSelectedIds([]);
    }
  };

  const currentPage = pagination?.page || 1;
  const totalPages = pagination?.pages || 1;
  const totalItems = pagination?.total || transactions.length;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-16 md:pb-0">
      
      {/* WORKSPACE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight">
            Transactions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage and review your financial activity. Tap any entry for details.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenImportModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-2xs hover:bg-slate-50 transition cursor-pointer"
          >
            <Upload size={14} />
            Import
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-950 text-white text-xs font-bold shadow-md hover:bg-emerald-600 transition cursor-pointer"
          >
            <Plus size={15} />
            Add Transaction
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH WORKSPACE BAR (RESPONSIVE) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs p-3.5 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search transactions..."
              className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition"
            />
          </div>

          {/* Custom Dropdown Filters */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <CustomDropdown
              options={categoryFilterOptions}
              value={selectedCategory}
              onChange={onCategoryChange}
              placeholder="Category"
              className="w-full sm:w-auto"
            />

            <CustomDropdown
              options={typeFilterOptions}
              value={selectedType}
              onChange={onTypeChange}
              placeholder="Type"
              className="w-full sm:w-auto"
            />
          </div>

        </div>

        {/* Bulk Operations Action Bar */}
        {selectedIds.length > 0 && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs animate-fadeIn">
            <span className="font-bold text-emerald-900">
              {selectedIds.length} selected
            </span>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 transition cursor-pointer flex items-center gap-1 text-[11px]"
            >
              <Trash2 size={12} />
              Delete Selected
            </button>
          </div>
        )}
      </div>

      {/* TRANSACTIONS DATA CONTAINER */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 font-semibold">
            Loading transaction workspace...
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <Receipt size={36} className="mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-700 text-sm">No transactions match your search/filters</p>
            <p className="text-slate-400 mt-1">Try resetting filters or tap "Add Transaction".</p>
          </div>
        ) : (
          <>
            {/* MOBILE CARD LIST VIEW (< 768px) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {transactions.map((tx) => {
                const isSelected = selectedIds.includes(tx._id);
                const IconComponent = getCategoryIcon(tx.category);
                const isIncome = tx.type === 'income';
                const isTransfer = tx.type === 'transfer';

                return (
                  <div
                    key={tx._id}
                    onClick={() => setViewingTransaction(tx)}
                    className={`p-3.5 flex items-center justify-between gap-3 active:bg-slate-100 transition cursor-pointer ${
                      isSelected ? 'bg-emerald-50/50' : ''
                    }`}
                  >
                    {/* Checkbox & Avatar Icon */}
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={(e) => handleToggleSelect(tx._id, e)}
                        className="text-slate-400 p-1 -ml-1 cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare size={17} className="text-emerald-600" />
                        ) : (
                          <Square size={17} />
                        )}
                      </button>

                      <div
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-white shrink-0 ${
                          isIncome
                            ? 'bg-emerald-500'
                            : isTransfer
                            ? 'bg-blue-500'
                            : 'bg-slate-800'
                        }`}
                      >
                        <IconComponent size={16} />
                      </div>

                      <div className="min-w-0">
                        <p className="font-extrabold text-xs text-slate-950 truncate">
                          {tx.description}
                        </p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-600">{tx.category}</span>
                        </p>
                      </div>
                    </div>

                    {/* Amount & Quick Menu */}
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <span
                          className={`font-black text-xs block ${
                            isIncome
                              ? 'text-emerald-600'
                              : isTransfer
                              ? 'text-blue-600'
                              : 'text-rose-500'
                          }`}
                        >
                          {isIncome ? '+' : isTransfer ? '⇄ ' : '-'}{currencySymbol}{tx.amount.toLocaleString()}
                        </span>
                        <span className="text-[9px] text-slate-400 block font-medium">
                          {tx.paymentMethod || 'UPI'}
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTransaction(tx);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-900 transition"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTransaction(tx._id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE VIEW (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-10">
                      <button onClick={handleSelectAll} className="text-slate-400 hover:text-slate-700 transition cursor-pointer">
                        {selectedIds.length === transactions.length ? (
                          <CheckSquare size={16} className="text-emerald-600" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </th>
                    <th className="py-3.5 px-3">Date</th>
                    <th className="py-3.5 px-3">Description</th>
                    <th className="py-3.5 px-3">Category</th>
                    <th className="py-3.5 px-3">Type</th>
                    <th className="py-3.5 px-3">Payment</th>
                    <th className="py-3.5 px-3 text-right">Amount</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {transactions.map((tx) => {
                    const isSelected = selectedIds.includes(tx._id);
                    return (
                      <tr
                        key={tx._id}
                        onClick={() => setViewingTransaction(tx)}
                        className={`transition cursor-pointer ${
                          isSelected ? 'bg-emerald-50/40' : 'hover:bg-slate-50/90'
                        }`}
                      >
                        <td className="py-3.5 px-4" onClick={(e) => handleToggleSelect(tx._id, e)}>
                          <button className="text-slate-400 hover:text-slate-700 transition cursor-pointer">
                            {isSelected ? (
                              <CheckSquare size={16} className="text-emerald-600" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        </td>
                        <td className="py-3.5 px-3 text-slate-400 whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3.5 px-3 font-bold text-slate-950 min-w-[160px]">
                          {tx.description}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {tx.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {tx.type === 'income' ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-100">
                              Income
                            </span>
                          ) : tx.type === 'transfer' ? (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-100">
                              Neutral
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-100">
                              Expense
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">{tx.paymentMethod}</td>
                        <td
                          className={`py-3.5 px-3 text-right font-extrabold text-sm whitespace-nowrap ${
                            tx.type === 'income'
                              ? 'text-emerald-600'
                              : tx.type === 'transfer'
                              ? 'text-blue-600'
                              : 'text-rose-500'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '⇄ ' : '-'}{currencySymbol}{tx.amount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setViewingTransaction(tx)}
                              title="View Full Details"
                              className="p-1.5 text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => onEditTransaction(tx)}
                              title="Edit"
                              className="p-1.5 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => onDeleteTransaction(tx._id)}
                              title="Delete"
                              className="p-1.5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* PAGINATION FOOTER */}
        <div className="px-4 sm:px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-slate-500 font-medium text-[11px] sm:text-xs">
            Showing {transactions.length > 0 ? (currentPage - 1) * 20 + 1 : 0}–
            {Math.min(currentPage * 20, totalItems)} of {totalItems} transactions
          </span>

          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="px-3 py-1.5 font-bold text-slate-800 text-[11px] sm:text-xs">
              Page {currentPage} of {totalPages}
            </span>

            <button
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

      </div>

      {/* FULL TRANSACTION DETAILS MODAL */}
      <TransactionDetailsModal
        isOpen={!!viewingTransaction}
        onClose={() => setViewingTransaction(null)}
        transaction={viewingTransaction}
        onEdit={onEditTransaction}
        onDelete={onDeleteTransaction}
        currencySymbol={currencySymbol}
      />

    </div>
  );
}

export default TransactionsWorkspace;
