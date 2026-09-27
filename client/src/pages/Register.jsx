import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, Check, User, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGoogleAuth } from '../components/auth/GoogleOAuthWindow';

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    preferredCurrency: 'INR',
    agreeTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    triggerGoogleLogin,
    loading: googleLoading,
    error: googleError,
    clearError: clearGoogleError,
  } = useGoogleAuth({
    onAuthSuccess: () => navigate('/dashboard'),
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match.');
    }

    if (!formData.agreeTerms) {
      return setError('You must agree to the Terms & Conditions.');
    }

    setLoading(true);

    try {
      await register({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        preferredCurrency: formData.preferredCurrency,
      });
      setLoading(false);
      navigate('/dashboard');
    } catch (err) {
      setLoading(false);
      setError(
        err.response?.data?.message ||
        'Registration failed. Please check your details or backend connection.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-slate-900 flex flex-col justify-between p-4 sm:p-6 lg:p-10 relative overflow-hidden">
      
      {/* Soft background ambient gradient glows */}
      <div className="pointer-events-none absolute -left-20 top-0 h-[500px] w-[500px] rounded-full bg-emerald-100/60 blur-[120px]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-[500px] w-[500px] rounded-full bg-teal-100/50 blur-[130px]" />

      {/* Top Navbar Brand Header */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between z-10 py-2">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 transition-transform group-hover:scale-105">
            <Wallet size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-950 font-['Outfit']">
            WalletSphere
          </span>
        </Link>
      </header>

      {/* Main Split Layout */}
      <main className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center my-auto py-6 z-10">

        {/* LEFT BRANDING PANEL */}
        <div className="lg:col-span-6 flex flex-col justify-center">
          
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-4 py-2 text-xs font-semibold text-emerald-700 shadow-sm backdrop-blur-sm self-start">
            <Check size={14} className="text-emerald-600 stroke-[2.5]" />
            Real Email Verification & Google Auth
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950 leading-[1.1] mb-5">
            Understand your money.<br />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Build better habits.
            </span>
          </h1>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-8 max-w-md">
            Track spending, manage budgets and understand your finances without making money management complicated.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3.5 text-sm font-semibold text-slate-800">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                <Check size={14} className="stroke-[3]" />
              </div>
              Real Email Verification & Verification Links
            </div>

            <div className="flex items-center gap-3.5 text-sm font-semibold text-slate-800">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                <Check size={14} className="stroke-[3]" />
              </div>
              Google OAuth 1-Click Login
            </div>

            <div className="flex items-center gap-3.5 text-sm font-semibold text-slate-800">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                <Check size={14} className="stroke-[3]" />
              </div>
              Automated Bank Email Alert Sync ready
            </div>
          </div>
        </div>

        {/* RIGHT REGISTER FORM CARD */}
        <div className="lg:col-span-6">
          <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-xl shadow-slate-200/60 border border-slate-200/80">
            
            <div className="mb-5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                REAL EMAIL AUTHENTICATION
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 mt-1">
                Create your account
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Start managing your finances with real email verification.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                {error}
              </div>
            )}

            {googleError && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex justify-between items-center">
                <span>{googleError}</span>
                <button onClick={clearGoogleError} className="ml-2 text-rose-400 hover:text-rose-600 font-bold">✕</button>
              </div>
            )}

            {/* Google Signup Button — opens real accounts.google.com popup */}
            <button
              type="button"
              onClick={() => triggerGoogleLogin()}
              disabled={googleLoading}
              className="w-full mb-3 py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 transition text-xs font-bold text-slate-800 flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
            >
              {googleLoading ? (
                <svg className="w-4 h-4 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              )}
              <span>{googleLoading ? 'Connecting...' : 'Sign up with Google Email'}</span>
            </button>

            <div className="relative my-3 text-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
              <span className="relative bg-white px-3 text-[11px] font-bold text-slate-400 uppercase">or register below</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              
              {/* Full Name Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Email Address (Real Email)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-11 py-2.5 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Enter password again"
                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-11 py-2.5 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Preferred Currency */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Preferred Currency
                </label>
                <select
                  name="preferredCurrency"
                  value={formData.preferredCurrency}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 font-medium focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 focus:outline-none transition cursor-pointer"
                >
                  <option value="INR">INR — Indian Rupee (₹)</option>
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="EUR">EUR — Euro (€)</option>
                  <option value="GBP">GBP — British Pound (£)</option>
                </select>
              </div>

              {/* Terms & Conditions Checkbox */}
              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="agreeTerms" className="text-xs text-slate-600 font-medium cursor-pointer">
                  I agree to the <a href="#terms" className="font-semibold text-slate-900 underline">Terms & Conditions</a> and <a href="#privacy" className="font-semibold text-slate-900 underline">Privacy Policy</a>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-slate-950 py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition duration-300 hover:bg-emerald-600 hover:shadow-emerald-600/20 active:scale-[0.99] disabled:opacity-70 cursor-pointer"
              >
                {loading ? 'Sending verification email...' : 'Create Account & Send Verification Email'}
                <ArrowRight size={17} />
              </button>

            </form>

            {/* Bottom Link */}
            <div className="mt-4 text-center text-xs text-slate-600 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700 transition">
                Log in
              </Link>
            </div>

          </div>
        </div>

      </main>

      <footer className="w-full max-w-6xl mx-auto text-xs text-slate-400 font-medium z-10 py-2">
        © 2026 WalletSphere
      </footer>

    </div>
  );
}

export default Register;
