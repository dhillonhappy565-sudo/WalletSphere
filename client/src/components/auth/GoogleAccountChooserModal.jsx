import React, { useState } from 'react';
import API from '../../services/api';
import { X, UserPlus, ShieldCheck, ArrowRight } from 'lucide-react';

function GoogleAccountChooserModal({ isOpen, onClose, onAccountSelected }) {
  const [customEmail, setCustomEmail] = useState('');
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState('');

  if (!isOpen) return null;

  // Saved / Active Google Accounts on the System
  const savedAccounts = [
    {
      name: 'Dhillon Happy',
      email: 'dhillonhappy565@gmail.com',
      avatarUrl: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      initials: 'DH',
      color: 'bg-emerald-600',
    },
    {
      name: 'Personal Account',
      email: 'user.personal@gmail.com',
      avatarUrl: '',
      initials: 'PA',
      color: 'bg-indigo-600',
    },
  ];

  const handleSelectAccount = async (account) => {
    setLoadingEmail(account.email);
    try {
      const res = await API.post('/auth/google', {
        email: account.email,
        fullName: account.name,
        profilePicture: account.avatarUrl || '',
      });

      const { token, ...userData } = res.data.data;
      localStorage.setItem('walletsphere_token', token);
      localStorage.setItem('walletsphere_user', JSON.stringify(userData));

      if (onAccountSelected) {
        onAccountSelected(userData);
      } else {
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Google Auth Error:', error);
      alert('Google authentication failed. Please try again.');
      setLoadingEmail('');
    }
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customEmail || !customEmail.includes('@')) {
      alert('Please enter a valid Google email address');
      return;
    }

    handleSelectAccount({
      name: customEmail.split('@')[0],
      email: customEmail,
      avatarUrl: '',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 text-center border-b border-slate-100 bg-slate-50/60 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
          </div>

          <h3 className="text-lg font-black text-slate-950">Choose an account</h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            to continue to <span className="font-bold text-slate-900">WalletSphere</span>
          </p>
        </div>

        {/* Accounts List */}
        <div className="p-4 space-y-2 overflow-y-auto max-h-[350px]">
          {savedAccounts.map((acc) => {
            const isLoading = loadingEmail === acc.email;
            return (
              <button
                key={acc.email}
                onClick={() => handleSelectAccount(acc)}
                disabled={!!loadingEmail}
                className="w-full p-3.5 rounded-2xl border border-slate-200/80 hover:border-emerald-500 bg-white hover:bg-emerald-50/40 transition cursor-pointer flex items-center justify-between group text-left disabled:opacity-60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-full ${acc.color} text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs`}>
                    {acc.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition truncate">
                      {acc.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{acc.email}</p>
                  </div>
                </div>

                <div className="text-slate-400 group-hover:text-emerald-600 transition shrink-0 pl-2">
                  {isLoading ? (
                    <span className="text-[10px] font-extrabold text-emerald-600 animate-pulse">Logging in...</span>
                  ) : (
                    <ArrowRight size={16} />
                  )}
                </div>
              </button>
            );
          })}

          {!showAddCustom ? (
            <button
              onClick={() => setShowAddCustom(true)}
              className="w-full p-3.5 rounded-2xl border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition cursor-pointer flex items-center gap-3 text-xs font-bold text-slate-700 mt-2"
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <UserPlus size={18} />
              </div>
              <span>Use another Google account</span>
            </button>
          ) : (
            <form onSubmit={handleCustomSubmit} className="p-3.5 rounded-2xl border border-emerald-300 bg-emerald-50/30 space-y-2.5 mt-2 animate-fadeIn">
              <label className="text-xs font-bold text-slate-800 block">Enter Google Email Address</label>
              <input
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="your.email@gmail.com"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                autoFocus
                required
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddCustom(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500"
                >
                  Continue →
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 text-center font-medium">
          To continue, Google will share your name and email address with WalletSphere.
        </div>

      </div>
    </div>
  );
}

export default GoogleAccountChooserModal;
