import React from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, BookOpen, PieChart, TrendingUp,
  Scale, Users, HardHat, Package, Wallet, ArrowRight
} from 'lucide-react';

export default function Reports() {
  const reports = [
    {
      title: 'Daily Day Book Register (रोजनामचा)',
      desc: 'Chronological daily register of all payments and cash inflows for any Bikram Sambat date',
      icon: BookOpen,
      to: '/daybook',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'General Journal Register (जर्नल भौचर किताब)',
      desc: 'Double-entry debit and credit accounting register showing ledger postings, narration, and audits',
      icon: Scale,
      to: '/reports/journal',
      color: 'bg-indigo-50 text-indigo-700',
    },
    {
      title: 'Expense Breakdown by Category',
      desc: 'Categorized analysis of construction materials, labor, fuel, office maintenance, and taxes',
      icon: PieChart,
      to: '/reports/expense',
      color: 'bg-red-50 text-red-600',
    },
    {
      title: 'Project-wise Profit & Loss (P&L)',
      desc: 'Financial profitability statement comparing contract values, revenues, and actual site costs',
      icon: TrendingUp,
      to: '/reports/pnl',
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Trial Balance & Chart of Accounts',
      desc: 'Double-entry accounting trial balance verifying debit and credit equality across all ledgers',
      icon: Scale,
      to: '/reports/trial',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: 'Party & Supplier Statement Ledgers',
      desc: 'Complete running balance accounts statement for material suppliers, vendors, and clients',
      icon: Users,
      to: '/parties',
      color: 'bg-amber-50 text-amber-600',
    },
    {
      title: 'Thekedar Contract & Payment Ledger',
      desc: 'Audit of all work orders, running bills, retention withholdings, and TDS tax deducted',
      icon: HardHat,
      to: '/thekedar',
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: 'Site Material Stock Inventory',
      desc: 'Inventory position showing purchased versus consumed quantities of cement, steel, and sand',
      icon: Package,
      to: '/materials/stock',
      color: 'bg-cyan-50 text-cyan-600',
    },
    {
      title: 'Fund Flow & Sahoo Loan Balances',
      desc: 'Summary of total borrowings, owner equity contributions, and liquid company account balances',
      icon: Wallet,
      to: '/funds',
      color: 'bg-teal-50 text-teal-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-850 tracking-tight">Financial & Construction Reports</h2>
        <p className="text-xs text-slate-500">Official accounting registers, site costing ledgers, and analytical statements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reports.map((r, i) => {
          const Icon = r.icon;
          return (
            <Link
              key={i}
              to={r.to}
              className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className={`w-11 h-11 rounded-xl ${r.color} flex items-center justify-center font-bold mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-tight mb-2 group-hover:text-blue-600 transition">
                  {r.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">{r.desc}</p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-blue-600 transition">
                <span>View Report</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
