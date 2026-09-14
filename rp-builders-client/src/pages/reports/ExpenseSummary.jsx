import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, ArrowLeft, Printer, Filter, Calendar } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { reportsAPI, projectsAPI } from '../../services/api';
import { formatNPR } from '../../utils/helpers';
import Loader from '../../components/ui/Loader';
import toast from 'react-hot-toast';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

export default function ExpenseSummary() {
  const [data, setData] = useState({ items: [], grandTotal: 0 });
  const [projects, setProjects] = useState([]);
  const [projectFilter, setProjectFilter] = useState('');
  const [fromBs, setFromBs] = useState('');
  const [toBs, setToBs] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsAPI.getAll().then(res => setProjects(res.data.data || [])).catch(() => {});
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      const res = await reportsAPI.expenseSummary({
        project_id: projectFilter || undefined,
        from_date_bs: fromBs || undefined,
        to_date_bs: toBs || undefined,
      });
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load expense report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [projectFilter, fromBs, toBs]);

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
            <h2 className="text-xl font-black text-slate-850 tracking-tight">Category-wise Expenditure Report</h2>
            <p className="text-xs text-slate-500">Analyze material, labour, thekka, equipment, and administrative costs</p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md transition"
        >
          <Printer className="w-4 h-4" />
          <span>Print Report / PDF</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3 no-print">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
        >
          <option value="">All Project Sites & Office</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.project_name}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">From BS:</span>
          <input
            type="text"
            value={fromBs}
            onChange={(e) => setFromBs(e.target.value)}
            placeholder="YYYY-MM-DD"
            className="w-28 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">To BS:</span>
          <input
            type="text"
            value={toBs}
            onChange={(e) => setToBs(e.target.value)}
            placeholder="YYYY-MM-DD"
            className="w-28 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
          />
        </div>
      </div>

      {/* Chart Section */}
      {data.items?.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs no-print">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-4">Expenditure Distribution</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.items.slice(0, 10)} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                <XAxis dataKey="category_name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `रू ${val / 1000}k`} />
                <Tooltip formatter={(val) => [formatNPR(val), 'Spent']} />
                <Bar dataKey="total_amount" radius={[6, 6, 0, 0]}>
                  {data.items.slice(0, 10).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border-none print:shadow-none">
        <div className="hidden print:block p-6 text-center border-b border-slate-300">
          <h1 className="text-2xl font-black text-slate-900">R.P. BUILDERS PVT. LTD.</h1>
          <h2 className="text-sm font-bold mt-1 uppercase underline">CATEGORY-WISE EXPENDITURE AUDIT REPORT</h2>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <Loader text="Compiling expense statement..." />
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Expense Title / Category</th>
                  <th className="py-3 px-4">Parent Group</th>
                  <th className="py-3 px-4 text-center">Voucher Entries</th>
                  <th className="py-3 px-4 text-right">Total Amount (NPR)</th>
                  <th className="py-3 px-4 text-right">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items?.map((item) => (
                  <tr key={item.category_id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{item.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{item.category_name}</td>
                    <td className="py-3 px-4 text-slate-600">{item.main_category}</td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600">{item.transaction_count}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatNPR(item.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">
                      {item.percent}%
                    </td>
                  </tr>
                ))}

                {data.items?.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      No expense data found for selected filters.
                    </td>
                  </tr>
                )}
              </tbody>

              {data.items?.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                    <td colSpan="4" className="py-3 px-4 text-right uppercase text-[11px]">
                      Grand Total Expenditures:
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm font-black text-red-600">
                      {formatNPR(data.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm font-bold text-slate-900">
                      100%
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
