import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Scale, ArrowLeft, Printer, CheckCircle, AlertTriangle } from 'lucide-react';
import { reportsAPI } from '../../services/api';
import { formatNPR } from '../../utils/helpers';
import Loader from '../../components/ui/Loader';
import toast from 'react-hot-toast';

export default function TrialBalance() {
  const [data, setData] = useState({ accounts: [], totalDebit: 0, totalCredit: 0, isBalanced: true });
  const [loading, setLoading] = useState(true);

  const loadTB = async () => {
    try {
      setLoading(true);
      const res = await reportsAPI.trialBalance();
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to compile Trial Balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTB();
  }, []);

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
            <h2 className="text-xl font-black text-slate-850 tracking-tight">Double-Entry Trial Balance</h2>
            <p className="text-xs text-slate-500">Official ledger trial balance verifying debit equals credit equality</p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print Trial Balance</span>
        </button>
      </div>

      {/* Balance Indicator */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between no-print ${
        data.isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
      }`}>
        <div className="flex items-center gap-2.5">
          {data.isBalanced ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <div>
            <h4 className="text-xs font-bold">
              {data.isBalanced ? 'Trial Balance is Balanced (Debit = Credit)' : 'Unbalanced Trial Balance Warning'}
            </h4>
            <p className="text-[11px] opacity-80">
              Total Debit: {formatNPR(data.totalDebit)} | Total Credit: {formatNPR(data.totalCredit)}
            </p>
          </div>
        </div>
      </div>

      {/* Trial Balance Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border-none print:shadow-none">
        <div className="hidden print:block p-6 text-center border-b border-slate-300">
          <h1 className="text-2xl font-black text-slate-900">R.P. BUILDERS PVT. LTD.</h1>
          <h2 className="text-sm font-bold mt-1 uppercase underline">OFFICIAL ACCOUNTING TRIAL BALANCE</h2>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <Loader text="Auditing general ledger accounts..." />
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                  <th className="py-3 px-4 w-24">A/C Code</th>
                  <th className="py-3 px-4">Account Title</th>
                  <th className="py-3 px-4">Account Type</th>
                  <th className="py-3 px-4 text-right">Debit (NPR)</th>
                  <th className="py-3 px-4 text-right">Credit (NPR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.accounts?.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{acc.account_code}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{acc.account_name}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-slate-100 text-slate-700">
                        {acc.account_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {acc.debit > 0 ? formatNPR(acc.debit) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {acc.credit > 0 ? formatNPR(acc.credit) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                  <td colSpan="3" className="py-3 px-4 text-right uppercase text-[11px]">
                    Total Trial Balance:
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm font-black text-slate-900">
                    {formatNPR(data.totalDebit)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm font-black text-slate-900">
                    {formatNPR(data.totalCredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
