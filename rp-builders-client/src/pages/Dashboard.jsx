import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Handshake,
  TrendingDown,
  Clock,
  Wallet,
  ArrowRight,
  PlusCircle,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Receipt,
  Users,
  HardHat
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { dashboardAPI, accountsAPI, projectsAPI } from '../services/api';
import { formatNPR } from '../utils/helpers';
import { todayBS, formatBSDate } from '../utils/nepaliDate';
import Loader from '../components/ui/Loader';
import toast from 'react-hot-toast';

const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [projectsOverview, setProjectsOverview] = useState([]);
  const [recentVouchers, setRecentVouchers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const bsDate = todayBS();

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const [sRes, mRes, cRes, pRes, rRes, aRes] = await Promise.all([
          dashboardAPI.getStats(),
          dashboardAPI.getMonthlyExpenses(),
          dashboardAPI.getCategoryBreakdown(),
          dashboardAPI.getProjectOverview(),
          dashboardAPI.getRecentVouchers(),
          accountsAPI.getAll(),
        ]);

        setStats(sRes.data.data);
        setMonthlyExpenses(mRes.data.data || []);
        setCategoryBreakdown(cRes.data.data || []);
        setProjectsOverview(pRes.data.data || []);
        setRecentVouchers(rRes.data.data || []);
        setAccounts(aRes.data.data || []);
      } catch (err) {
        toast.error('Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) return <Loader text="Loading construction accounting dashboard..." />;

  const soloProjects = projectsOverview.filter(p => p.project_type === 'solo');
  const jvProjects = projectsOverview.filter(p => p.project_type === 'joint_venture');

  const totalLiquidCash = accounts.reduce((sum, acc) => sum + (parseFloat(acc.current_balance) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome Row */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/30 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-400/30">
              R.P. Builders ERP System
            </span>
            <span className="text-[10px] text-slate-400 font-mono">BS {bsDate}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Executive Accounting Dashboard
          </h1>
          <p className="text-xs text-slate-300">
            आजको मिति: <strong className="text-white">{formatBSDate(bsDate)}</strong> • Real-time Construction Site Financial Tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/vouchers/entry"
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black shadow-md shadow-blue-500/30 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>दैनिक खर्च / आम्दानी इन्ट्री</span>
          </Link>

          <Link
            to="/vouchers/daybook"
            className="inline-flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold border border-white/20 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>दैनिक रोजनामचा (Day Book)</span>
          </Link>
        </div>
      </div>

      {/* 4 Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Solo Sites */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              RP एकल आयोजना (Solo)
            </span>
            <div className="text-xl font-black font-mono text-slate-900 mt-0.5">
              {soloProjects.length} <span className="text-xs font-normal text-slate-500">Sites</span>
            </div>
            <span className="text-[10px] text-blue-600 font-bold">100% Owned by RP</span>
          </div>
        </div>

        {/* 2. JV Partnerships */}
        <div className="bg-white p-5 rounded-3xl border border-purple-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100">
            <Handshake className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wide">
              साझेदारी आयोजना (JV)
            </span>
            <div className="text-xl font-black font-mono text-purple-950 mt-0.5">
              {jvProjects.length} <span className="text-xs font-normal text-slate-500">Partnerships</span>
            </div>
            <span className="text-[10px] text-purple-600 font-bold">Tied-up with Partners</span>
          </div>
        </div>

        {/* 3. Monthly Expenses */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              यो महिनाको खर्च (This Month)
            </span>
            <div className="text-xl font-black font-mono text-slate-900 mt-0.5">
              {formatNPR(stats?.total_expense_this_month || 0)}
            </div>
            <span className="text-[10px] text-slate-400">Total verified payment vouchers</span>
          </div>
        </div>

        {/* 4. Liquid Balance */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              नगद तथा बैंक मौज्दात (Liquid Cash)
            </span>
            <div className="text-xl font-black font-mono text-emerald-600 mt-0.5">
              {formatNPR(totalLiquidCash)}
            </div>
            <span className="text-[10px] text-slate-400">Main Cash & Bank Accounts</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Expense Trend */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-black text-slate-900 text-sm">
                मासिक खर्च प्रवृत्ति (Monthly Expenditure Trend - BS)
              </h3>
              <p className="text-[11px] text-slate-400">Construction material, thekka, labour & operational expenses</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyExpenses} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <XAxis dataKey="month_label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `रू ${val / 1000}k`} />
                <Tooltip formatter={(val) => [formatNPR(val), 'खर्च']} />
                <Bar dataKey="total_expense" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Category Breakdown Pie Chart */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-black text-slate-900 text-sm">
              खर्चको वर्गिकरण (Category Breakdown)
            </h3>
            <p className="text-[11px] text-slate-400 mb-2">Top site & office expenditure distribution</p>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={65}
                    innerRadius={35}
                    paddingAngle={3}
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => [formatNPR(val), 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mini Legend */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 max-h-32 overflow-y-auto">
            {categoryBreakdown.slice(0, 4).map((c, idx) => (
              <div key={idx} className="flex justify-between items-center text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="text-slate-600 truncate max-w-[120px]">{c.category}</span>
                </div>
                <span className="font-mono font-bold text-slate-800">{formatNPR(c.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Active Construction Sites Table & Recent Vouchers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Sites Overview */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-black text-slate-900 text-sm">
                सक्रिय निर्माण साइटहरु (Active Sites Overview)
              </h3>
              <p className="text-[11px] text-slate-400">Budget utilization and progress across Solo & JV sites</p>
            </div>
            <Link to="/projects" className="text-xs font-bold text-blue-600 hover:underline">
              सबै हेर्नुहोस् (View All)
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 uppercase font-bold text-[10px] border-b border-slate-100">
                  <th className="pb-2">Site / Project</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Budget</th>
                  <th className="pb-2">Spent</th>
                  <th className="pb-2">Budget Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projectsOverview.map((p) => {
                  const isJV = p.project_type === 'joint_venture';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 font-bold text-slate-900">
                        <Link to={`/projects/${p.id}`} className="hover:text-blue-600">
                          {p.project_name}
                        </Link>
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isJV ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {isJV ? '🤝 JV' : '🏛️ Solo'}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-slate-700">{formatNPR(p.budget)}</td>
                      <td className="py-3 font-mono font-bold text-slate-900">{formatNPR(p.spent)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${p.percent_used > 85 ? 'bg-red-500' : 'bg-blue-600'}`}
                              style={{ width: `${Math.min(p.percent_used, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 font-mono">{p.percent_used}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Recent Day Book Vouchers */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-black text-slate-900 text-sm">
                पछिल्ला भौचरहरु (Recent Vouchers)
              </h3>
              <p className="text-[11px] text-slate-400">Latest day book transactions</p>
            </div>
            <Link to="/vouchers/daybook" className="text-xs font-bold text-blue-600 hover:underline">
              Day Book
            </Link>
          </div>

          <div className="space-y-3">
            {recentVouchers.slice(0, 5).map((v) => (
              <div key={v.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-mono font-bold text-blue-700">{v.voucher_no}</span>
                  <span className="font-mono text-slate-500">{v.voucher_date_bs}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 truncate max-w-[130px]">{v.party_name || v.category_name}</span>
                  <span className="font-mono font-black text-slate-900">{formatNPR(v.net_amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
