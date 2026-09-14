import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, ArrowLeft, Printer, Building2 } from 'lucide-react';
import { reportsAPI, projectsAPI } from '../../services/api';
import { formatNPR } from '../../utils/helpers';
import Loader from '../../components/ui/Loader';
import toast from 'react-hot-toast';

export default function ProfitLoss() {
  const [data, setData] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsAPI.getAll().then(res => setProjects(res.data.data || [])).catch(() => {});
  }, []);

  const loadPnL = async () => {
    try {
      setLoading(true);
      const res = await reportsAPI.profitLoss({ project_id: projectId || undefined });
      if (res.data.success) {
        setData(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to calculate Profit & Loss');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPnL();
  }, [projectId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <Link
            to="/reports"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-black text-slate-850 tracking-tight">Project-wise Profit & Loss (P&L)</h2>
            <p className="text-xs text-slate-500">Compare contract billing, actual site expenditures, and margin profitability</p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md transition"
        >
          <Printer className="w-4 h-4" />
          <span>Print P&L Statement</span>
        </button>
      </div>

      {/* Filter */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 no-print">
        <span className="text-xs font-bold text-slate-700">Filter Site:</span>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
        >
          <option value="">All Construction Sites</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.project_name}</option>
          ))}
        </select>
      </div>

      {/* P&L Cards / Breakdown per site */}
      <div className="space-y-6">
        {loading ? (
          <Loader text="Auditing project revenue & cost ledgers..." />
        ) : (
          data.map((p) => {
            const isProfit = p.gross_profit >= 0;
            return (
              <div key={p.project_id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 print:border-none print:shadow-none">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {p.project_code}
                    </span>
                    <h3 className="text-base font-black text-slate-900 mt-1">{p.project_name}</h3>
                    <span className="text-[11px] text-slate-400 capitalize">Type: {p.project_type}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-medium">Estimated Gross Profit:</span>
                    <div className={`text-xl font-black font-mono ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatNPR(p.gross_profit)}
                    </div>
                    <span className="text-[11px] font-bold text-slate-500">Margin: {p.margin_percent}%</span>
                  </div>
                </div>

                {/* Grid comparing Revenue vs Expenses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  {/* Revenue / Inflow Section */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">1. Revenue & Contract Value</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Agreed Contract Value:</span>
                        <span className="font-mono font-bold text-slate-900">{formatNPR(p.contract_value)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Actual Cash Received on Site:</span>
                        <span className="font-mono font-bold text-emerald-600">{formatNPR(p.total_received)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expense Breakdown Section */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">2. Direct Site Costs Incurred</h4>
                      <span className="font-mono font-black text-red-600">{formatNPR(p.total_expense)}</span>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {p.expenses?.map((e, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] py-1 border-b border-slate-200/50">
                          <span className="text-slate-600">{e.category_name}</span>
                          <span className="font-mono font-bold text-slate-800">{formatNPR(e.amount)}</span>
                        </div>
                      ))}
                      {(!p.expenses || p.expenses.length === 0) && (
                        <p className="text-slate-400 text-center py-2">No expenditures recorded.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {data.length === 0 && !loading && (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
            No projects available for P&L computation.
          </div>
        )}
      </div>
    </div>
  );
}
