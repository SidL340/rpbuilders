import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { todayBS, formatBSDate, getFiscalYear } from '../../utils/nepaliDate';
import { Calendar, LogOut, User, Menu, PlusCircle, BookmarkCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Topbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const { company } = useCompany();
  const bsToday = todayBS();
  const currentFY = getFiscalYear(bsToday);

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between z-30 shadow-xs">
      {/* Left: Mobile Menu Toggle & Nepali Date & Aarthik Barsha */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        {company?.company_logo_data && (
          <img
            src={company.company_logo_data}
            alt="Logo"
            className="w-8 h-8 rounded-lg object-contain bg-slate-50 border border-slate-200 p-0.5 lg:hidden"
          />
        )}

        {/* Live Nepali Date Badge */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl">
          <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            आजको मिति: <strong className="text-slate-900 font-bold">{formatBSDate(bsToday, 'np')}</strong>{' '}
            <span className="text-slate-400 font-mono text-[11px]">({bsToday} BS)</span>
          </span>
        </div>

        {/* Active Aarthik Barsha (Fiscal Year) Badge */}
        <div className="hidden md:flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
          <BookmarkCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{currentFY.fullLabel}</span>
          <span className="text-[10px] text-emerald-600 font-mono">({currentFY.label})</span>
        </div>
      </div>

      {/* Right: Quick Entry + Developer Badge + User + Logout */}
      <div className="flex items-center gap-3">
        {/* Quick New Entry Button */}
        <Link
          to="/vouchers/entry"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>दैनिक इन्ट्री</span>
        </Link>

        {/* Developer Info Chip */}
        <div className="hidden xl:flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-400">Dev:</span>
          <span className="font-bold text-slate-700">Nirmala Tech Innovations</span>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-bold text-slate-900 leading-none">{user?.name || 'User'}</div>
            <div className="text-[10px] font-semibold text-blue-600 mt-0.5 capitalize">
              {user?.role_label || user?.role || 'Admin'}
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Sign Out"
          className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
