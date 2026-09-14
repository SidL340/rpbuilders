import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { Building2, Lock, User, ArrowRight, ShieldCheck, HardHat } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { company } = useCompany();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter both username and password');
      return;
    }

    try {
      setLoading(true);
      await login(username, password);
      toast.success('Welcome to R.P. Builders Portal!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/50 to-slate-200 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Header */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {company?.company_logo_data ? (
            <img
              src={company.company_logo_data}
              alt="Logo"
              className="w-11 h-11 rounded-xl object-contain bg-white p-1 shadow-md shadow-blue-500/20"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Building2 className="w-6 h-6" />
            </div>
          )}
          <div>
            <h1 className="font-black text-slate-900 text-lg leading-tight tracking-tight">
              {company?.company_name || 'R.P. BUILDERS PVT. LTD.'}
            </h1>
            <p className="text-[11px] font-semibold text-blue-700">
              {company?.company_name_np || 'Construction & Site Management Portal (Nepal)'}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-full border border-slate-200 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Local Secured Server</span>
        </div>
      </div>

      {/* Center Card */}
      <div className="max-w-md w-full mx-auto my-8">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/30 p-8 sm:p-10">
          <div className="text-center mb-8">
            {company?.company_logo_data ? (
              <img
                src={company.company_logo_data}
                alt="Logo"
                className="w-16 h-16 rounded-2xl object-contain bg-white p-1.5 mx-auto mb-4 border border-slate-200 shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-inner">
                <HardHat className="w-7 h-7" />
              </div>
            )}
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sign In to Portal</h2>
            <p className="text-xs text-slate-500 mt-1">Enter your credentials to access daily accounts & site ledgers</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600">
              <span className="font-semibold">Default Login:</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-blue-700">admin / password</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Software Developer Attribution Footer */}
      <div className="max-w-6xl w-full mx-auto text-center pt-4 border-t border-slate-200/80">
        <p className="text-xs font-medium text-slate-500">
          Developed & Maintained by <span className="font-black text-slate-800">Nirmala Tech Innovations Pvt. Ltd.</span>
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Enterprise Construction ERP & Accounting Solutions • Nepal
        </p>
      </div>
    </div>
  );
}
