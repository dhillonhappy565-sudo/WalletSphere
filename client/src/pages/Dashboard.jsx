import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import AddTransactionModal from '../components/transactions/AddTransactionModal';
import ImportModal from '../components/transactions/ImportModal';
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
} from 'lucide-react';

function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [page, setPage] = useState(1);

  
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

  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const currencySymbol = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
  }[user?.preferredCurrency || 'INR'] || '₹';

  
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


  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setPage(1);
  };


  const handleCategoryChange = (val) => {
    setSelectedCategory(val);
    setPage(1);
  };

  const handleTypeChange = (val) => {
    setSelectedType(val);
    setPage(1);
  };

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


  const handleEditClick = (tx) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };


  const handleAddClick = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-slate-900 flex flex-col font-sans pb-20 md:pb-6">
      
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <Wallet size={19} />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-950 font-['Outfit']">
              WalletSphere
            </span>
          </div>


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

              <div className="flex items-center gap-2 sm:gap-3">
            <button className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer">
              <Settings size={18} />
            </button>

            <div className="flex items-center gap-2 pl-1 sm:pl-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center font-bold text-xs">
                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'T'}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-xs font-bold text-slate-900">{user?.fullName || 'Test1'}</p>
                <p className="text-[10px] text-slate-400 truncate max-w-[110px]">{user?.email || 'test1@gmail.com'}</p>
              </div>
            </div>

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

      <main className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-6 sm:py-8 w-full flex-1">
        {activeTab === 'Dashboard' ? (
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
            onEditTransaction={handleEditClick}
            onDeleteTransaction={handleDeleteTransaction}
            onTransactionUpdated={fetchTransactions}
          />
        ) : activeTab === 'Transactions' ? (
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
          <BudgetsView currencySymbol={currencySymbol} />
        ) : activeTab === 'Reports' ? (
          <ReportsView currencySymbol={currencySymbol} />
        ) : activeTab === 'AI' ? (
          <AIChatWorkspace user={user} currencySymbol={currencySymbol} />
        ) : null}
      </main>

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

      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTransactionSaved={fetchTransactions}
        transactionToEdit={editingTransaction}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={fetchTransactions}
      />

    </div>
  );
}

export default Dashboard;
