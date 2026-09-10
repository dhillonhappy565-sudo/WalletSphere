import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, Check, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      setLoading(false);
      navigate('/dashboard');
    } catch (err) {
      setLoading(false);
      setError(
        err.response?.data?.message ||
        'Login failed. Please check your credentials or backend connection.'
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

      <main className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center my-auto py-8 z-10">

        <div className="lg:col-span-6 flex flex-col justify-center">
          
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-4 py-2 text-xs font-semibold text-emerald-700 shadow-sm backdrop-blur-sm self-start">
            <Check size={14} className="text-emerald-600 stroke-[2.5]" />
            Welcome back to WalletSphere
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950 leading-[1.1] mb-5">
            Your money.<br />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Your decisions.
            </span>
          </h1>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-8 max-w-md">
            Pick up where you left off and keep building better financial habits with WalletSphere.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3.5 text-sm font-semibold text-slate-800">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                <Check size={14} className="stroke-[3]" />
              </div>
              See your financial overview at a glance
            </div>

            <div className="flex items-center gap-3.5 text-sm font-semibold text-slate-800">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                <Check size={14} className="stroke-[3]" />
              </div>
              Stay on top of spending and budgets
            </div>

            <div className="flex items-center gap-3.5 text-sm font-semibold text-slate-800">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                <Check size={14} className="stroke-[3]" />
              </div>
              Understand where your money is going
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="bg-white rounded-3xl p-7 sm:p-10 shadow-xl shadow-slate-200/60 border border-slate-200/80">
            
            <div className="mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                WELCOME BACK
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 mt-1">
                Log in to WalletSphere
              </h2>
              <p className="text-sm text-slate-600 mt-1.5">
                Enter your details to access your financial dashboard.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Email Address
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
                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-3 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-slate-800">
                    Password
                  </label>
                  <a href="#forgot" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition">
                    Forgot password?
                  </a>
                </div>
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
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-11 py-3 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 focus:outline-none transition"
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

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 font-medium">Remember me</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl bg-slate-950 py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition duration-300 hover:bg-emerald-600 hover:shadow-emerald-600/20 active:scale-[0.99] disabled:opacity-70 cursor-pointer"
              >
                {loading ? 'Logging in...' : 'Log In'}
                <ArrowRight size={17} />
              </button>

            </form>

            <div className="mt-6 text-center text-xs text-slate-600 font-medium">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-emerald-600 hover:text-emerald-700 transition">
                Create account
              </Link>
            </div>

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto text-xs text-slate-400 font-medium z-10 py-2">
        © 2026 WalletSphere
      </footer>

    </div>
  );
}

export default Login;
