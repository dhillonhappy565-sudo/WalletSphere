import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import {
  CheckCircle,
  Plus,
  BellRing,
  Edit2,
  Trash2,
  X,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

function UpcomingBillsWidget({ currencySymbol = '₹', onTransactionUpdated }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Bills',
    dueDateDay: 15,
    autoDebit: false,
  });

  const fetchBills = async () => {
    try {
      setLoading(true);
      const res = await API.get('/bills');
      setBills(res.data.data.bills || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bills:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const handleOpenAdd = () => {
    setEditingBill(null);
    setFormData({ title: '', amount: '', category: 'Bills', dueDateDay: 15, autoDebit: false });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (bill) => {
    setEditingBill(bill);
    setFormData({
      title: bill.title,
      amount: bill.amount,
      category: bill.category || 'Bills',
      dueDateDay: bill.dueDateDay,
      autoDebit: !!bill.autoDebit,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (billId) => {
    if (window.confirm('Delete this recurring bill / EMI?')) {
      try {
        await API.delete(`/bills/${billId}`);
        fetchBills();
        if (onTransactionUpdated) onTransactionUpdated();
      } catch (error) {
        alert('Failed to delete bill.');
      }
    }
  };

  const handleMarkPaid = async (billId) => {
    try {
      await API.post(`/bills/${billId}/pay`);
      fetchBills();
      if (onTransactionUpdated) onTransactionUpdated();
    } catch (error) {
      alert('Failed to mark bill paid.');
    }
  };

  const handleMarkUnpaid = async (billId) => {
    try {
      await API.post(`/bills/${billId}/unpay`);
      fetchBills();
      if (onTransactionUpdated) onTransactionUpdated();
    } catch (error) {
      alert('Failed to mark bill unpaid.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;

    try {
      if (editingBill) {
        await API.put(`/bills/${editingBill._id}`, formData);
      } else {
        await API.post('/bills', formData);
      }
      setIsModalOpen(false);
      fetchBills();
      if (onTransactionUpdated) onTransactionUpdated();
    } catch (error) {
      alert('Failed to save bill.');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <BellRing size={16} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-950">
              Upcoming Bills, EMIs & Subscriptions
            </h3>
            <p className="text-xs text-slate-400">
              Manage recurring payments and toggle Paid / Unpaid status
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
        >
          <Plus size={14} /> Add EMI / Bill
        </button>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-400">Loading upcoming bills...</div>
      ) : bills.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400">No recurring bills added yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {bills.map((bill) => {
            const isDueSoon = bill.status === 'due_soon';
            const isOverdue = bill.status === 'overdue';
            const isPaid = bill.status === 'paid';

            return (
              <div
                key={bill._id}
                className={`p-3.5 rounded-2xl border transition relative group ${
                  isPaid
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : isOverdue
                    ? 'bg-rose-50/60 border-rose-200'
                    : isDueSoon
                    ? 'bg-amber-50/60 border-amber-200'
                    : 'bg-slate-50/70 border-slate-200/80'
                }`}
              >
                {/* Edit & Delete Action Triggers */}
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => handleOpenEdit(bill)}
                    title="Edit Bill"
                    className="p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(bill._id)}
                    title="Delete Bill"
                    className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <div className="pr-12">
                  <h4 className="font-bold text-xs text-slate-900">{bill.title}</h4>
                  <p className="text-[10px] text-slate-400">Due {bill.dueDateDay}th of month</p>
                </div>

                <div className="mt-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-black text-slate-950 block">
                      {currencySymbol}{bill.amount.toLocaleString()}
                    </span>
                    {bill.autoDebit && (
                      <span className="text-[9px] font-bold text-indigo-600 block">
                        Auto-Debit
                      </span>
                    )}
                  </div>

                  {isPaid ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                        <CheckCircle size={12} /> Paid
                        {bill.autoPaidDetected && (
                          <Sparkles size={10} className="text-emerald-600" title="Auto-matched from transaction" />
                        )}
                      </span>
                      <button
                        onClick={() => handleMarkUnpaid(bill._id)}
                        title="Mark Unpaid"
                        className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleMarkPaid(bill._id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-semibold text-[10px] hover:bg-emerald-600 transition cursor-pointer"
                    >
                      Mark Paid
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Bill Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-950">
                {editingBill ? 'Edit Recurring Bill / EMI' : 'Add EMI / Recurring Subscription'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Car EMI, House Rent, Spotify"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 5000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Day of Month</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={formData.dueDateDay}
                    onChange={(e) => setFormData({ ...formData, dueDateDay: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.autoDebit}
                  onChange={(e) => setFormData({ ...formData, autoDebit: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Auto-debited from bank account</span>
              </label>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-slate-950 text-white font-semibold text-xs hover:bg-emerald-600 transition cursor-pointer"
              >
                {editingBill ? 'Save Changes' : 'Save EMI / Subscription'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default UpcomingBillsWidget;
