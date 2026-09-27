import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { Wallet, CheckCircle2, XCircle, RefreshCw, ArrowRight } from 'lucide-react';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your email address...');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided in URL.');
      return;
    }

    const verify = async () => {
      try {
        const res = await API.get(`/auth/verify-email/${token}`);
        setStatus('success');
        setMessage(res.data.message || 'Email address verified successfully!');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification token is invalid or has expired.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-[#0B0F17] text-white flex flex-col justify-center items-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6">
        
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-lg shadow-emerald-600/30">
            <Wallet size={24} />
          </div>
        </div>

        <h2 className="text-2xl font-black text-white font-['Outfit'] tracking-tight">
          Email Verification
        </h2>

        {status === 'verifying' && (
          <div className="py-6 space-y-3">
            <RefreshCw size={36} className="animate-spin text-emerald-500 mx-auto" />
            <p className="text-xs text-slate-400 font-semibold">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-4 space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 size={36} />
            </div>
            <p className="text-sm font-bold text-emerald-400">{message}</p>
            <p className="text-xs text-slate-400">Your account is fully activated. You can now log in to access all features.</p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-lg"
            >
              <span>Go to Login</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="py-4 space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <XCircle size={36} />
            </div>
            <p className="text-sm font-bold text-rose-400">{message}</p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
            >
              <span>Return to Login</span>
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}

export default VerifyEmail;
