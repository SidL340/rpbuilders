import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import Topbar from './Topbar';
import {
  LayoutDashboard,
  Building2,
  Handshake,
  PlusCircle,
  BookOpen,
  Users,
  HardHat,
  Package,
  UserCheck,
  Truck,
  Landmark,
  Wallet,
  BarChart3,
  Settings,
  Shield,
  Menu,
  X,
  Code2
} from 'lucide-react';

const NAV_GROUPS = [
  {
    title: 'Main',
    items: [
      { to: '/', label: 'Dashboard (ड्यासबोर्ड)', icon: LayoutDashboard, exact: true },
    ]
  },
  {
    title: 'Sites & Projects',
    items: [
      { to: '/projects?type=solo', label: 'RP एकल आयोजना (Solo Sites)', icon: Building2 },
      { to: '/projects?type=joint_venture', label: 'साझेदारी आयोजना (JV Sites)', icon: Handshake },
    ]
  },
  {
    title: 'Daily Accounting (दैनिक हिसाब)',
    items: [
      { to: '/vouchers/entry', label: 'दैनिक इन्ट्री (New Entry)', icon: PlusCircle, badge: 'Quick' },
      { to: '/vouchers/daybook', label: 'दैनिक रोजनामचा (Day Book)', icon: BookOpen },
      { to: '/parties', label: 'पार्टी खाता (Party Ledgers)', icon: Users },
    ]
  },
  {
    title: 'Subcontract & Operations',
    items: [
      { to: '/thekedar', label: 'Thekedar / Thekka (ठेकेदार)', icon: HardHat },
      { to: '/materials', label: 'Materials & Stock (सामग्री)', icon: Package },
      { to: '/employees/labour', label: 'Daily Labour Wage (मजदुर)', icon: UserCheck },
      { to: '/equipment', label: 'Machinery & Fuel (उपकरण)', icon: Truck },
    ]
  },
  {
    title: 'Funds & Loans (ऋण/कोष)',
    items: [
      { to: '/funds', label: 'Sahu Loans & Funds (साहु ऋण)', icon: Landmark },
      { to: '/parties?type=supplier', label: 'Supplier Accounts (सप्लायर्स)', icon: Wallet },
    ]
  },
  {
    title: 'Financial Reports',
    items: [
      { to: '/reports/profit-loss', label: 'Project P&L (नाफा/नोक्सान)', icon: BarChart3 },
      { to: '/reports/expenses', label: 'Expense Summary (खर्च विवरण)', icon: BarChart3 },
      { to: '/reports/trial-balance', label: 'Trial Balance (सन्तुलन)', icon: BarChart3 },
      { to: '/reports', label: 'All Reports Hub (सबै रिपोर्ट)', icon: BarChart3 },
    ]
  },
  {
    title: 'System Settings',
    items: [
      { to: '/settings', label: 'Company Profile (कम्पनी)', icon: Settings },
      { to: '/settings/users', label: 'User Roles (प्रयोगकर्ता)', icon: Shield },
    ]
  }
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden text-slate-850">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-0 lg:translate-x-0 hidden lg:flex'
        }`}
      >
        {/* Company Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-md shadow-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-black text-white text-sm tracking-tight leading-none">
                R.P. BUILDERS
              </h1>
              <p className="text-[10px] text-blue-400 font-bold mt-1">Pvt. Ltd. • Nepal</p>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar text-xs">
          {NAV_GROUPS.map((group, idx) => (
            <div key={idx}>
              <div className="px-3 mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item, itemIdx) => {
                  const Icon = item.icon;
                  const isActive = item.exact
                    ? location.pathname === item.to
                    : location.pathname + location.search === item.to ||
                      (location.pathname === item.to && !item.to.includes('?'));

                  return (
                    <NavLink
                      key={itemIdx}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition duration-150 ${
                        isActive
                          ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-emerald-500 text-white uppercase tracking-tight">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Developer Attribution Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-300">
            <Code2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Nirmala Tech Innovations</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
            Software Developer & Tech Partner
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-100/90 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>

          {/* Bottom Footer Attribution */}
          <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-slate-200 text-center no-print">
            <p className="text-xs text-slate-500 font-medium">
              R.P. Builders Pvt. Ltd. Accounting Portal • Developed & Maintained by{' '}
              <span className="font-bold text-slate-800">Nirmala Tech Innovations Pvt. Ltd.</span>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
