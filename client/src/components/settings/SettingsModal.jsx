import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import {
  User,
  Settings,
  X,
  Lock,
  Mail,
  Calendar,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Globe,
  Briefcase,
  Phone,
  DollarSign,
  TrendingUp,
  Target,
  ShieldAlert,
  Sliders,
  Check,
  Wallet,
} from 'lucide-react';

function SettingsModal({ isOpen, onClose, user, onUserUpdated, initialTab = 'profile' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Profile Form States
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [occupation, setOccupation] = useState(user?.occupation || '');
  const [monthlyIncome, setMonthlyIncome] = useState(user?.monthlyIncome || '');
  const [netWorth, setNetWorth] = useState(user?.netWorth || '');
  const [incomeType, setIncomeType] = useState(user?.incomeType || 'Salaried');
  const [riskTolerance, setRiskTolerance] = useState(user?.riskTolerance || 'Moderate');
  const [primaryFinancialGoal, setPrimaryFinancialGoal] = useState(user?.primaryFinancialGoal || 'Wealth Building');
  const [emergencyFundTargetMonths, setEmergencyFundTargetMonths] = useState(user?.emergencyFundTargetMonths || 6);
  const [preferredCurrency, setPreferredCurrency] = useState(user?.preferredCurrency || 'INR');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
      setOccupation(user.occupation || '');
      setMonthlyIncome(user.monthlyIncome || '');
      setNetWorth(user.netWorth || '');
      setIncomeType(user.incomeType || 'Salaried');
      setRiskTolerance(user.riskTolerance || 'Moderate');
      setPrimaryFinancialGoal(user.primaryFinancialGoal || 'Wealth Building');
      setEmergencyFundTargetMonths(user.emergencyFundTargetMonths || 6);
      setPreferredCurrency(user.preferredCurrency || 'INR');
    }
  }, [user]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  const currencySymbol = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
  }[preferredCurrency] || '₹';

  const currencies = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR ₹)' },
    { code: 'USD', symbol: '$', name: 'US Dollar (USD $)' },
    { code: 'EUR', symbol: '€', name: 'Euro (EUR €)' },
    { code: 'GBP', symbol: '£', name: 'British Pound (GBP £)' },
  ];

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');

    try {
      const payload = {
        fullName,
        phone,
        occupation,
        monthlyIncome: parseFloat(monthlyIncome) || 0,
        netWorth: parseFloat(netWorth) || 0,
        incomeType,
        riskTolerance,
        primaryFinancialGoal,
        emergencyFundTargetMonths: parseInt(emergencyFundTargetMonths, 10) || 6,
        preferredCurrency,
      };

      if (password.trim().length > 0) {
        if (password.length < 6) {
          alert('Password must be at least 6 characters long');
          setLoading(false);
          return;
        }
        payload.password = password;
      }

      const res = await API.put('/auth/profile', payload);

      const updatedUser = res.data.data;
      if (onUserUpdated) onUserUpdated(updatedUser);

      setSuccessMessage('Financial profile & preferences updated successfully!');
      setPassword('');
      setLoading(false);

      setTimeout(() => {
        setSuccessMessage('');
      }, 3500);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(error.response?.data?.message || 'Failed to update profile.');
      setLoading(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      setExportLoading(true);
      const res = await API.get('/auth/export-backup');
      const backupData = res.data.data;

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `WalletSphere_Backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setExportLoading(false);
    } catch (error) {
      console.error('Error exporting backup:', error);
      alert('Failed to export backup data.');
      setExportLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExportLoading(true);
      const res = await API.get('/transactions', { params: { limit: 1000 } });
      const transactions = res.data.data.transactions;

      if (!transactions || transactions.length === 0) {
        alert('No transactions recorded to export.');
        setExportLoading(false);
        return;
      }

      const headers = ['Date', 'Description', 'Type', 'Category', 'Amount', 'Payment Method'];
      const rows = transactions.map((t) => [
        new Date(t.date).toISOString().split('T')[0],
        `"${(t.description || '').replace(/"/g, '""')}"`,
        t.type,
        t.category,
        t.amount,
        t.paymentMethod || 'UPI',
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `WalletSphere_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setExportLoading(false);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export transactions CSV.');
      setExportLoading(false);
    }
  };

  const memberDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Recent Member';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              {activeTab === 'profile' ? <User size={20} /> : <Settings size={20} />}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-950">
                {activeTab === 'profile' ? 'Financial Profile & Persona' : 'Settings & Backups'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {activeTab === 'profile' ? 'View and edit baseline financial persona & net worth' : 'Manage currency preference and data exports'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-100 px-6 pt-3 gap-4 bg-white">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 text-xs font-bold transition border-b-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            My Financial Profile
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`pb-3 text-xs font-bold transition border-b-2 cursor-pointer ${
              activeTab === 'preferences'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Preferences & Backups
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 size={16} /> {successMessage}
            </div>
          )}

          {activeTab === 'profile' ? (
            /* TAB 1: FINANCIAL PROFILE & EDIT */
            <div className="space-y-6">
              
              {/* Profile Overview Card */}
              <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-600/20 shrink-0">
                    {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <h4 className="text-sm font-black text-slate-950 truncate">{fullName || 'User'}</h4>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-slate-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> Joined {memberDate}
                      </span>
                      {occupation && (
                        <span className="flex items-center gap-1 text-slate-600 font-bold">
                          • <Briefcase size={11} /> {occupation}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Financial Badges Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 text-[10px]">
                  <div className="p-2 rounded-xl bg-white border border-slate-200/80">
                    <span className="text-slate-400 block font-semibold">Total Net Worth</span>
                    <b className="text-xs text-emerald-800">{netWorth ? `${currencySymbol}${parseFloat(netWorth).toLocaleString()}` : 'Not set'}</b>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200/80">
                    <span className="text-slate-400 block font-semibold">Monthly Income</span>
                    <b className="text-xs text-emerald-800">{monthlyIncome ? `${currencySymbol}${parseFloat(monthlyIncome).toLocaleString()}` : 'Not set'}</b>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200/80">
                    <span className="text-slate-400 block font-semibold">Risk Persona</span>
                    <b className="text-xs text-slate-900">{riskTolerance} Risk</b>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200/80">
                    <span className="text-slate-400 block font-semibold">Primary Goal</span>
                    <b className="text-xs text-slate-900 truncate block">{primaryFinancialGoal}</b>
                  </div>
                </div>
              </div>

              {/* Profile Edit Form */}
              <form onSubmit={handleSaveProfile} className="space-y-5">
                
                {/* Section 1: Personal & Contact */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={14} className="text-emerald-600" /> Personal & Contact Details
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Occupation / Profession</label>
                    <input
                      type="text"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      placeholder="e.g. Software Engineer, Business Owner"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                {/* Section 2: Financial Baseline & Net Worth */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet size={14} className="text-emerald-600" /> Financial Baseline & Net Worth
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Total Net Worth Baseline ({currencySymbol})</label>
                      <input
                        type="number"
                        step="1000"
                        value={netWorth}
                        onChange={(e) => setNetWorth(e.target.value)}
                        placeholder="e.g. 500000 (Assets minus Liabilities)"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition"
                      />
                      <span className="text-[10px] text-slate-400 block mt-0.5">Total assets (savings, investments, property) minus liabilities.</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Monthly Take-Home Income ({currencySymbol})</label>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        value={monthlyIncome}
                        onChange={(e) => setMonthlyIncome(e.target.value)}
                        placeholder="e.g. 80000"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Employment / Income Source</label>
                    <select
                      value={incomeType}
                      onChange={(e) => setIncomeType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition cursor-pointer"
                    >
                      {['Salaried', 'Self-Employed', 'Freelance', 'Student', 'Retired', 'Other'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Section 3: Risk Tolerance & Goals */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Target size={14} className="text-emerald-600" /> Risk Persona & Financial Goals
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Risk Tolerance Profile</label>
                      <select
                        value={riskTolerance}
                        onChange={(e) => setRiskTolerance(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition cursor-pointer"
                      >
                        <option value="Conservative">Conservative (Low Risk / Capital Protection)</option>
                        <option value="Moderate">Moderate (Balanced Growth & Safety)</option>
                        <option value="Aggressive">Aggressive (High Growth / Equity Focused)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Target Emergency Reserve</label>
                      <select
                        value={emergencyFundTargetMonths}
                        onChange={(e) => setEmergencyFundTargetMonths(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition cursor-pointer"
                      >
                        <option value="3">3 Months of Essential Expenses</option>
                        <option value="6">6 Months of Essential Expenses</option>
                        <option value="9">9 Months of Essential Expenses</option>
                        <option value="12">12 Months of Essential Expenses</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Primary Financial Goal</label>
                    <select
                      value={primaryFinancialGoal}
                      onChange={(e) => setPrimaryFinancialGoal(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition cursor-pointer"
                    >
                      {['Wealth Building', 'Debt Payoff', 'Emergency Savings', 'Retirement', 'Home Purchase', 'General Savings'].map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Section 4: Security */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock size={14} className="text-emerald-600" /> Security Credentials
                  </h4>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">New Password (Optional)</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Leave blank to keep current password"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
                >
                  {loading ? <RefreshCw size={15} className="animate-spin" /> : 'Save Financial Profile & Persona'}
                </button>
              </form>

            </div>
          ) : (
            /* TAB 2: PREFERENCES & BACKUPS */
            <div className="space-y-6">
              
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Currency & Region
                </h4>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Preferred Currency Symbol
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Globe size={16} />
                    </div>
                    <select
                      value={preferredCurrency}
                      onChange={(e) => setPreferredCurrency(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition cursor-pointer"
                    >
                      {currencies.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw size={15} className="animate-spin" /> : 'Save Currency Preference'}
                </button>
              </form>

              {/* Data Export & Backup Section */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Data Backups & Export
                </h4>
                <p className="text-xs text-slate-500">
                  Download your complete WalletSphere account data for backup or portability.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    disabled={exportLoading}
                    className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition cursor-pointer flex items-center gap-2.5 text-xs font-bold text-slate-800 group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-white text-emerald-600 flex items-center justify-center border border-slate-200 shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition">
                      <Download size={15} />
                    </div>
                    <div className="text-left leading-snug">
                      <span>Export JSON</span>
                      <span className="text-[10px] text-slate-400 block font-normal">Complete Backup</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCSV}
                    disabled={exportLoading}
                    className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition cursor-pointer flex items-center gap-2.5 text-xs font-bold text-slate-800 group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-white text-emerald-600 flex items-center justify-center border border-slate-200 shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition">
                      <FileSpreadsheet size={15} />
                    </div>
                    <div className="text-left leading-snug">
                      <span>Export CSV</span>
                      <span className="text-[10px] text-slate-400 block font-normal">Transactions Log</span>
                    </div>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}

export default SettingsModal;
