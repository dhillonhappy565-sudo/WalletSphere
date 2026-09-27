import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Wallet, Lock, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await API.post(`/auth/reset-password/${token}`, { password });
      alert(res.data.message || 'Password reset successful!');
      navigate('/login');
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Password reset failed. Link may be expired.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-white flex flex-col justify-center items-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold mx-auto shadow-lg shadow-emerald-600/30">
            <Wallet size={24} />
          </div>
          <h2 className="text-2xl font-black text-white font-['Outfit'] tracking-tight">
            Reset Password
          </h2>
          <p className="text-xs text-slate-400">
            Enter your new password below.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold animate-fadeIn">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock size={16} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-semibold text-white focus:border-emerald-500 focus:outline-none transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock size={16} />
              </div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-semibold text-white focus:border-emerald-500 focus:outline-none transition"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <>Update Password →</>}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link to="/login" className="text-xs font-bold text-emerald-400 hover:underline">
            ← Back to Login
          </Link>
        </div>

      </div>
    </div>
  );
}

export default ResetPassword;
