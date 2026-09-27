import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import { Wallet, Mail, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await API.post('/auth/forgot-password', { email });
      setSuccessMessage(res.data.message || 'Password reset link sent! Check your inbox.');
      setLoading(false);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to send password reset email.');
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
            Forgot Password
          </h2>
          <p className="text-xs text-slate-400">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 size={18} className="shrink-0" /> {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold animate-fadeIn">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail size={16} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-semibold text-white focus:border-emerald-500 focus:outline-none transition"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <>Send Reset Link <ArrowRight size={16} /></>}
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

export default ForgotPassword;
