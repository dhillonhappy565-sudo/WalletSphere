import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import AddTransactionModal from '../components/transactions/AddTransactionModal';
import ImportModal from '../components/transactions/ImportModal';
import SettingsModal from '../components/settings/SettingsModal';
import BankEmailSyncModal from '../components/dashboard/BankEmailSyncModal';
import DashboardOverview from '../components/dashboard/DashboardOverview';
import TransactionsWorkspace from '../components/transactions/TransactionsWorkspace';
import BudgetsView from '../components/budgets/BudgetsView';
import ReportsView from '../components/reports/ReportsView';
import AIChatWorkspace from '../components/ai/AIChatWorkspace';
import {
  Wallet,
  LogOut,
  Settings,
  LayoutDashboard,
  Receipt,
  PieChart,
  FileSpreadsheet,
  Sparkles,
  Zap,
} from 'lucide-react';

function Dashboard() {
  const { user, logout, updateUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [page, setPage] = useState(1);

  // API Data State
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    categoryBreakdown: [],
    monthlyTrend: [],
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBankSyncModalOpen, setIsBankSyncModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('profile');
  const [editingTransaction, setEditingTransaction] = useState(null);

  const currencySymbol = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
  }[user?.preferredCurrency || 'INR'] || '₹';

  // Fetch Transactions & Summary from API
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: activeTab === 'Dashboard' ? 5 : 20,
      };
      if (searchQuery) params.search = searchQuery;
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedType !== 'All') params.type = selectedType;

      const res = await API.get('/transactions', { params });
      setTransactions(res.data.data.transactions);
      setPagination(res.data.data.pagination);
      setSummary(res.data.data.summary);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setLoading(false);
    }
  }, [page, searchQuery, selectedCategory, selectedType, activeTab]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Handle Search Input Change
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setPage(1);
  };

  // Handle Category Filter Change
  const handleCategoryChange = (val) => {
    setSelectedCategory(val);
    setPage(1);
  };

  // Handle Type Filter Change
  const handleTypeChange = (val) => {
    setSelectedType(val);
    setPage(1);
  };

  // Handle Delete
  const handleDeleteTransaction = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await API.delete(`/transactions/${id}`);
        fetchTransactions();
      } catch (error) {
        alert('Failed to delete transaction.');
      }
    }
  };

  // Open Edit Modal
  const handleEditClick = (tx) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };

  // Open Add Modal
  const handleAddClick = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-slate-900 flex flex-col font-sans pb-20 md:pb-6">
      
      {/* TOP NAVBAR */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <Wallet size={19} />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-950 font-['Outfit']">
              WalletSphere
            </span>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/70 p-1.5 rounded-2xl border border-slate-200/60">
            {[
              { name: 'Dashboard', label: 'Dashboard' },
              { name: 'Transactions', label: 'Transactions' },
              { name: 'Budgets', label: 'Budgets' },
              { name: 'Reports', label: 'Reports' },
              { name: 'AI', label: '✨ AI Assistant' },
            ].map((tab) => (
              <button
                key={tab.name}
                onClick={() => {
                  setActiveTab(tab.name);
                  setPage(1);
                }}
                className={`px-4 py-1.5 text-xs font-bold rounded-xl transition duration-200 cursor-pointer flex items-center gap-1.5 ${
                  activeTab === tab.name
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Controls Right */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Auto Bank Email Sync Quick Button */}
            <button
              onClick={() => setIsBankSyncModalOpen(true)}
              title="Auto Bank Email Sync (Gmail/Parse)"
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Zap size={14} className="text-emerald-600 fill-emerald-500/30" />
              <span className="hidden sm:inline">Bank Email Sync</span>
            </button>

            <button
              onClick={() => {
                setSettingsInitialTab('preferences');
                setIsSettingsModalOpen(true);
              }}
              title="Settings & Preferences"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <Settings size={18} />
            </button>

            {/* Clickable User Profile Badge */}
            <button
              onClick={() => {
                setSettingsInitialTab('profile');
                setIsSettingsModalOpen(true);
              }}
              title="View & Edit Profile"
              className="flex items-center gap-2 pl-1 sm:pl-2 cursor-pointer hover:opacity-80 transition group text-left"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center font-bold text-xs group-hover:bg-emerald-600 group-hover:text-white transition">
                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition">{user?.fullName || 'User'}</p>
                <p className="text-[10px] text-slate-400 truncate max-w-[110px]">{user?.email || ''}</p>
              </div>
            </button>

            {/* Logout Button */}
            <button
              onClick={logout}
              title="Log out"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition cursor-pointer"
            >
              <LogOut size={18} />
            </button>
          </div>

        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-6 sm:py-8 w-full flex-1">
        {activeTab === 'Dashboard' ? (
          /* TAB 1: DASHBOARD OVERVIEW */
          <DashboardOverview
            summary={summary}
            transactions={transactions}
            user={user}
            currencySymbol={currencySymbol}
            onNavigateToTransactions={() => {
              setActiveTab('Transactions');
              setPage(1);
            }}
            onNavigateToBudgets={() => setActiveTab('Budgets')}
            onOpenBankSyncModal={() => setIsBankSyncModalOpen(true)}
            onEditTransaction={handleEditClick}
            onDeleteTransaction={handleDeleteTransaction}
            onTransactionUpdated={fetchTransactions}
          />
        ) : activeTab === 'Transactions' ? (
          /* TAB 2: TRANSACTIONS WORKSPACE */
          <TransactionsWorkspace
            transactions={transactions}
            pagination={pagination}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            selectedType={selectedType}
            onTypeChange={handleTypeChange}
            onOpenAddModal={handleAddClick}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onEditTransaction={handleEditClick}
            onDeleteTransaction={handleDeleteTransaction}
            onPageChange={(newPage) => setPage(newPage)}
            currencySymbol={currencySymbol}
          />
        ) : activeTab === 'Budgets' ? (
          /* TAB 3: BUDGETS VIEW */
          <BudgetsView currencySymbol={currencySymbol} />
        ) : activeTab === 'Reports' ? (
          /* TAB 4: REPORTS & EXPORTS VIEW */
          <ReportsView currencySymbol={currencySymbol} />
        ) : activeTab === 'AI' ? (
          /* TAB 5: ✨ WALLETSPHERE AI WORKSPACE */
          <AIChatWorkspace user={user} currencySymbol={currencySymbol} />
        ) : null}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 flex items-center justify-around">
        {[
          { name: 'Dashboard', icon: LayoutDashboard },
          { name: 'Transactions', icon: Receipt },
          { name: 'Budgets', icon: PieChart },
          { name: 'Reports', icon: FileSpreadsheet },
          { name: 'AI', icon: Sparkles, label: '✨ AI' },
        ].map((item) => {
          const IconComp = item.icon;
          const isActive = activeTab === item.name;
          return (
            <button
              key={item.name}
              onClick={() => {
                setActiveTab(item.name);
                setPage(1);
              }}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition cursor-pointer ${
                isActive ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <IconComp size={18} />
              <span className="text-[10px] font-semibold">{item.label || item.name}</span>
            </button>
          );
        })}
      </div>

      {/* ADD / EDIT TRANSACTION MODAL */}
      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTransactionSaved={fetchTransactions}
        transactionToEdit={editingTransaction}
      />

      {/* IMPORT BANK STATEMENT MODAL */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={fetchTransactions}
      />

      {/* BANK EMAIL ALERT SYNC MODAL */}
      <BankEmailSyncModal
        isOpen={isBankSyncModalOpen}
        onClose={() => setIsBankSyncModalOpen(false)}
        onSyncComplete={fetchTransactions}
      />

      {/* PROFILE & SETTINGS MODAL */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        user={user}
        initialTab={settingsInitialTab}
        onUserUpdated={async (updatedData) => {
          await updateUserProfile(updatedData);
          fetchTransactions();
        }}
      />

    </div>
  );
}

export default Dashboard;
