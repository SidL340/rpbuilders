import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HardHat, ArrowLeft, Printer, CheckCircle, FileText } from 'lucide-react';
import { thekedarAPI } from '../../services/api';
import { formatNPR } from '../../utils/helpers';
import Loader from '../../components/ui/Loader';
import toast from 'react-hot-toast';

export default function ThekedarDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await thekedarAPI.getWorkOrder(id);
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (err) {
        toast.error('Failed to load contract ledger');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <Loader text="Loading thekedar work order statement..." />;
  if (!data) return <div className="p-8 text-center text-slate-500">Thekka record not found.</div>;

  const { work_order, payments } = data;
  const balance = parseFloat(work_order.total_contract_amount) - parseFloat(work_order.total_paid);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <Link
            to="/thekedar"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {work_order.work_order_no}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 uppercase">
                {work_order.status}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-850 tracking-tight mt-0.5">
              {work_order.thekedar_name} — {work_order.work_type}
            </h2>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md transition"
        >
          <Printer className="w-4 h-4" />
          <span>Print Thekka Ledger</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Contract Scope</span>
          <h4 className="text-sm font-bold text-slate-800 mt-1 truncate">{work_order.work_description}</h4>
          <p className="text-[10px] text-slate-400 mt-0.5">Site: {work_order.project_name}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Contract Value</span>
          <h3 className="text-xl font-black text-slate-900 mt-1">{formatNPR(work_order.total_contract_amount)}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">TDS Rate: {work_order.tds_percent}%</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Disbursed</span>
          <h3 className="text-xl font-black text-emerald-600 mt-1">{formatNPR(work_order.total_paid)}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Advance Held: {formatNPR(work_order.advance_paid)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Balance Payable</span>
          <h3 className={`text-xl font-black mt-1 ${balance <= 0 ? 'text-slate-900' : 'text-red-600'}`}>
            {formatNPR(balance)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">{Math.round(work_order.completion_percent || 0)}% completed</p>
        </div>
      </div>

      {/* Payment History Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border-none print:shadow-none">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-850 uppercase tracking-wide">
            Payment & Running Bill Disbursal History
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                <th className="py-3 px-4">Date (BS)</th>
                <th className="py-3 px-4">Voucher No</th>
                <th className="py-3 px-4">Bill Type</th>
                <th className="py-3 px-4">Bill No</th>
                <th className="py-3 px-4 text-right">Gross Bill</th>
                <th className="py-3 px-4 text-right">TDS Ded.</th>
                <th className="py-3 px-4 text-right">Advance Adj.</th>
                <th className="py-3 px-4 text-right">Net Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono text-slate-600">{p.payment_date_bs}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{p.voucher_no || '—'}</td>
                  <td className="py-3 px-4 capitalize font-semibold text-slate-700">{p.payment_type?.replace('_', ' ')}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">{p.bill_no || '—'}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">{formatNPR(p.gross_amount)}</td>
                  <td className="py-3 px-4 text-right font-mono text-red-600">{p.tds_amount > 0 ? formatNPR(p.tds_amount) : '—'}</td>
                  <td className="py-3 px-4 text-right font-mono text-amber-600">{p.advance_adjusted > 0 ? formatNPR(p.advance_adjusted) : '—'}</td>
                  <td className="py-3 px-4 text-right font-mono font-black text-emerald-600">{formatNPR(p.net_amount)}</td>
                </tr>
              ))}

              {payments.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No running bill payments recorded for this work order yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
