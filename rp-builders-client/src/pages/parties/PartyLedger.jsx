import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Printer,
  FileSpreadsheet,
  TrendingDown,
  TrendingUp,
  User,
  Phone,
  Building,
  CreditCard,
  Receipt,
  FileText
} from 'lucide-react';
import { partiesAPI } from '../../services/api';
import { todayBS, formatBSDate, getFiscalYearList, getFiscalYear } from '../../utils/nepaliDate';
import { formatNPR } from '../../utils/helpers';
import { useCompany } from '../../contexts/CompanyContext';
import Loader from '../../components/ui/Loader';
import toast from 'react-hot-toast';

export default function PartyLedger() {
  const { company } = useCompany();
  const { id } = useParams();
  const [party, setParty] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ opening: 0, closing: 0, totalDebit: 0, totalCredit: 0 });
  const [fromBS, setFromBS] = useState('');
  const [toBS, setToBS] = useState('');
  const [selectedFY, setSelectedFY] = useState('');
  const [loading, setLoading] = useState(true);

  const fiscalYears = getFiscalYearList();

  const loadLedger = async () => {
    try {
      setLoading(true);
      const params = {
        from_bs: fromBS || undefined,
        to_bs: toBS || undefined,
        fiscal_year: selectedFY || undefined,
      };
      const res = await partiesAPI.getLedger(id, params);
      const data = res.data.data || {};
      setParty(data.party || null);
      setTransactions(data.transactions || []);

      let totalDebit = 0;
      let totalCredit = 0;
      (data.transactions || []).forEach(t => {
        totalDebit += parseFloat(t.debit || 0);
        totalCredit += parseFloat(t.credit || 0);
      });

      setSummary({
        opening: parseFloat(data.opening_balance || 0),
        closing: parseFloat(data.closing_balance || 0),
        totalDebit,
        totalCredit,
      });
    } catch (err) {
      toast.error('Failed to load party ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, [id, fromBS, toBS, selectedFY]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <Loader text="Loading party statement & invoice history..." />;
  if (!party) return <div className="p-8 text-center text-slate-400">Party not found.</div>;

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <Link
            to="/parties"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                {party.party_code}
              </span>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full uppercase bg-blue-100 text-blue-800">
                {party.party_type}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1">{party.party_name}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Fiscal Year Filter */}
          <select
            value={selectedFY}
            onChange={(e) => setSelectedFY(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
          >
            <option value="">सबै आ.व. (All Fiscal Years)</option>
            {fiscalYears.map((fy, i) => (
              <option key={i} value={fy.value}>{fy.label}</option>
            ))}
          </select>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>प्रिन्ट खाता (Print Ledger)</span>
          </button>
        </div>
      </div>

      {/* Party Info & Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 no-print">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block">सम्पर्क तथा प्यान (Contact / PAN)</span>
          <div className="text-xs font-bold text-slate-900 mt-1 space-y-0.5">
            <div>📞 {party.phone || '—'}</div>
            <div>🆔 PAN: <span className="font-mono">{party.pan_no || '—'}</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block">सुरुको मौज्दात (Opening Balance)</span>
          <span className="text-lg font-black font-mono text-slate-900 mt-1 block">
            {formatNPR(summary.opening)}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-red-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block">कुल भुक्तानी (Total Payments Debit)</span>
          <span className="text-lg font-black font-mono text-red-600 mt-1 block">
            {formatNPR(summary.totalDebit)}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-blue-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block">बाँकी हिसाब (Closing Balance)</span>
          <span className="text-lg font-black font-mono text-blue-800 mt-1 block">
            {formatNPR(summary.closing)}
          </span>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-4 mb-4 font-sans print-header">
        <div className="flex items-center justify-center gap-4 mb-2">
          <img
            src={company?.company_logo_data || '/logo.png'}
            alt={company?.company_name || 'Logo'}
            onError={(e) => { e.currentTarget.src = '/logo.png'; }}
            className="w-16 h-16 object-contain rounded-lg shrink-0"
          />
          <div className="text-left">
            <h2 className="text-2xl font-black uppercase text-slate-900 tracking-tight leading-none">
              {company?.company_name || 'R.P. BUILDERS PVT. LTD.'}
            </h2>
            <p className="text-xs text-slate-700 mt-0.5">{company?.company_name_np || 'आर. पी. विल्डर्स प्रा. लि.'}</p>
            <p className="text-[10px] text-slate-500">{company?.company_address || company?.address || 'Kathmandu, Nepal'} • Phone: {company?.company_phone || '9800000000'} • PAN: {company?.company_pan || '601234567'}</p>
          </div>
        </div>
        <h3 className="text-lg font-black mt-2 underline uppercase tracking-wide">
          पार्टी लेजर खाता विवरण (PARTY ACCOUNT STATEMENT)
        </h3>
        <div className="flex justify-between text-xs mt-2 font-semibold text-slate-800 border-t border-slate-300 pt-2">
          <span>पार्टी: <strong>{party.party_name}</strong> ({party.party_code})</span>
          <span>प्रकार: <strong>{party.party_type}</strong> | फोन: <strong>{party.phone || '—'}</strong></span>
          <span>PAN/VAT: <strong>{party.pan_no || '—'}</strong></span>
          <span>आ.व.: <strong>{selectedFY || 'सबै (All)'}</strong></span>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black text-[10px] tracking-wider">
                <th className="py-3 px-3">S.N.</th>
                <th className="py-3 px-3">मिति (Date BS)</th>
                <th className="py-3 px-3">भौचर नं.</th>
                <th className="py-3 px-3">साइट / आयोजना (Site)</th>
                <th className="py-3 px-3">विवरण तथा बिल नं. (Narration & Bill)</th>
                <th className="py-3 px-3">माध्यम / बुझ्ने व्यक्ति (Audit)</th>
                <th className="py-3 px-3 text-right">भुक्तानी (Debit)</th>
                <th className="py-3 px-3 text-right">प्राप्ति (Credit)</th>
                <th className="py-3 px-3 text-right">बाँकी मौज्दात (Balance)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((t, index) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{index + 1}</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                    {t.voucher_date_bs}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                    {t.voucher_no}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">
                    {t.project_name || '—'}
                  </td>
                  <td className="py-3 px-3 max-w-xs">
                    <div className="font-bold text-slate-800 text-[11px]">{t.category_name || 'General'}</div>
                    <div className="text-[10px] text-slate-500 line-clamp-2">{t.narration}</div>
                    {t.bill_no && (
                      <span className="inline-block mt-0.5 text-[9px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                        Bill: {t.bill_no}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-[11px]">
                    <div className="font-bold capitalize text-slate-800">{t.payment_mode}</div>
                    {t.payment_mode === 'cash' && t.cash_receiver_name && (
                      <div className="text-[10px] text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded font-medium mt-0.5">
                        बुझ्ने: {t.cash_receiver_name} {t.cash_receiver_phone ? `(${t.cash_receiver_phone})` : ''}
                      </div>
                    )}
                    {t.payment_mode !== 'cash' && (t.cheque_no || t.bank_name) && (
                      <div className="text-[10px] text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded font-mono mt-0.5">
                        {t.bank_name} {t.cheque_no ? `| Chq: ${t.cheque_no}` : ''}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-red-600">
                    {t.debit > 0 ? formatNPR(t.debit) : '-'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-emerald-600">
                    {t.credit > 0 ? formatNPR(t.credit) : '-'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                    {formatNPR(t.running_balance)}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    No transactions recorded with this party yet.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-xs">
                <td colSpan={6} className="py-3 px-3 text-right uppercase tracking-wider text-slate-700">
                  कुल जम्मा (Total Summary):
                </td>
                <td className="py-3 px-3 text-right font-mono text-red-700 text-sm">
                  {formatNPR(summary.totalDebit)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-700 text-sm">
                  {formatNPR(summary.totalCredit)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-blue-800 text-sm">
                  {formatNPR(summary.closing)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Print Signature Section */}
      <div className="hidden print:grid grid-cols-3 gap-6 pt-16 text-center text-xs font-bold text-slate-800 border-t-2 border-slate-800 mt-12 print-signature-block">
        <div>
          <div className="border-b border-slate-400 mb-2 pb-6" />
          <span>पार्टी / आपूर्तिकर्ता हस्ताक्षर<br />(Party Representative)</span>
        </div>
        <div>
          <div className="border-b border-slate-400 mb-2 pb-6" />
          <span>लेखा अधिकृत<br />(Accounts Officer)</span>
        </div>
        <div>
          <div className="border-b border-slate-400 mb-2 pb-6" />
          <span>प्रबन्ध निर्देशक<br />(Managing Director)</span>
        </div>
      </div>
    </div>
  );
}
