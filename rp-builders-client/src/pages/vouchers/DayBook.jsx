import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Printer,
  Download,
  Filter,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  Building2,
  Users,
  Search,
  BookmarkCheck
} from 'lucide-react';
import { vouchersAPI, projectsAPI } from '../../services/api';
import { todayBS, formatBSDate, getFiscalYear, getFiscalYearList } from '../../utils/nepaliDate';
import { formatNPR } from '../../utils/helpers';
import Loader from '../../components/ui/Loader';
import toast from 'react-hot-toast';

export default function DayBook() {
  const [dateBS, setDateBS] = useState(todayBS());
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('');
  const [projects, setProjects] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [summary, setSummary] = useState({ totalDebit: 0, totalCredit: 0, netFlow: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  const fiscalYears = getFiscalYearList();
  const currentFY = getFiscalYear(dateBS);

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await projectsAPI.getAll();
        setProjects(res.data.data || []);
      } catch (err) {
        console.error(err);
      }
    }
    loadProjects();
  }, []);

  const fetchDayBook = async () => {
    try {
      setLoading(true);
      const params = {
        date_bs: selectedFiscalYear ? undefined : dateBS,
        fiscal_year: selectedFiscalYear || undefined,
        project_id: selectedProject || undefined,
        type: selectedType || undefined,
      };
      const res = await vouchersAPI.daybook(params);
      const data = res.data.data || {};
      setVouchers(data.vouchers || []);
      setSummary(data.summary || { totalDebit: 0, totalCredit: 0, netFlow: 0, count: 0 });
    } catch (err) {
      toast.error('Failed to load Day Book entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDayBook();
  }, [dateBS, selectedProject, selectedType, selectedFiscalYear]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Print Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
              दैनिक रोजनामचा खाता
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {currentFY.fullLabel}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            Day Book Register (दैनिक रोजनामचा)
          </h1>
          <p className="text-xs text-slate-500">
            दैनिक सम्पूर्ण खर्च तथा आम्दानी कारोबारको विस्तृत रजिस्टर विवरण
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold shadow-sm shadow-blue-500/20 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>प्रिन्ट गर्नुहोस् (Print Register)</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-4 no-print">
        {/* Date Filter */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            कारोबार मिति (BS Date)
          </label>
          <div className="relative">
            <input
              type="text"
              value={dateBS}
              onChange={(e) => {
                setDateBS(e.target.value);
                setSelectedFiscalYear('');
              }}
              placeholder="YYYY-MM-DD"
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <Calendar className="w-4 h-4 text-blue-600 absolute left-2.5 top-2.5" />
          </div>
          <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
            {formatBSDate(dateBS, 'np')}
          </span>
        </div>

        {/* Fiscal Year Filter */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            आर्थिक वर्ष (Fiscal Year)
          </label>
          <select
            value={selectedFiscalYear}
            onChange={(e) => setSelectedFiscalYear(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">-- तोकिएको मिति अनुसार (By Date) --</option>
            {fiscalYears.map((fy, i) => (
              <option key={i} value={fy.value}>{fy.label}</option>
            ))}
          </select>
        </div>

        {/* Site Filter */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            साइट / आयोजना (Site)
          </label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">सबै साइटहरु (All Sites)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.project_name}</option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            प्रकार (Type)
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">सबै कारोबार (All Transactions)</option>
            <option value="payment">🔴 खर्च भुक्तानी (Payment)</option>
            <option value="receipt">🟢 रकम प्राप्ति (Receipt)</option>
          </select>
        </div>
      </div>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-red-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              कुल खर्च (Total Payment)
            </span>
            <div className="text-xl font-black font-mono text-red-600 mt-0.5">
              {formatNPR(summary.totalDebit)}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              कुल आम्दानी (Total Inflow)
            </span>
            <div className="text-xl font-black font-mono text-emerald-600 mt-0.5">
              {formatNPR(summary.totalCredit)}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-blue-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              खुद नगद प्रवाह (Net Cash Flow)
            </span>
            <div className={`text-xl font-black font-mono mt-0.5 ${summary.netFlow >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {formatNPR(summary.netFlow)}
            </div>
          </div>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block text-center border-b-2 border-slate-800 pb-4 mb-4">
        <h2 className="text-2xl font-black uppercase text-slate-900 tracking-tight">
          R.P. BUILDERS PVT. LTD.
        </h2>
        <p className="text-xs text-slate-600">Nepal • Construction & Engineering</p>
        <h3 className="text-lg font-bold mt-2 underline">
          दैनिक रोजनामचा खाता (DAY BOOK REGISTER)
        </h3>
        <div className="flex justify-between text-xs mt-2 font-medium">
          <span>मिति: <strong>{formatBSDate(dateBS, 'np')} ({dateBS} BS)</strong></span>
          <span>आर्थिक वर्ष: <strong>{selectedFiscalYear || currentFY.label}</strong></span>
          <span>साइट: <strong>{selectedProject ? projects.find(p => String(p.id) === String(selectedProject))?.project_name : 'सबै साइटहरु'}</strong></span>
        </div>
      </div>

      {/* Main Day Book Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12">
            <Loader text="Loading Day Book register entries..." />
          </div>
        ) : vouchers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Receipt className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-600">यस मितिमा कुनै भौचर भेटिएन</p>
            <p className="text-xs">माथिको मिति वा आर्थिक वर्ष परिवर्तन गरी हेर्नुहोस्।</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black text-[10px] tracking-wider">
                  <th className="py-3 px-3">S.N.</th>
                  <th className="py-3 px-3">भौचर नं. (Voucher)</th>
                  <th className="py-3 px-3">मिति (Date)</th>
                  <th className="py-3 px-3">साइट / पार्टी (Site & Party)</th>
                  <th className="py-3 px-3">खर्च शीर्षक / विवरण (Narration)</th>
                  <th className="py-3 px-3">माध्यम / बुझ्ने व्यक्ति (Payment Audit)</th>
                  <th className="py-3 px-3 text-right">खर्च (Debit)</th>
                  <th className="py-3 px-3 text-right">आम्दानी (Credit)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vouchers.map((v, index) => {
                  const isPayment = v.voucher_type === 'payment';
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{index + 1}</td>
                      <td className="py-3 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {v.voucher_no}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {v.voucher_date_bs}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{v.project_name || '🏢 कार्यालय (Head Office)'}</div>
                        {v.party_name && (
                          <div className="text-[10px] text-slate-500 font-medium">{v.party_name}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-bold text-slate-800 text-[11px]">{v.category_name || 'General'}</div>
                        <div className="text-[10px] text-slate-500 line-clamp-2">{v.narration}</div>
                        {v.bill_no && (
                          <span className="inline-block mt-0.5 text-[9px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                            Bill: {v.bill_no}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[11px]">
                        <div className="font-bold capitalize text-slate-800">{v.payment_mode}</div>
                        {/* Cash Receiver Audit */}
                        {v.payment_mode === 'cash' && v.cash_receiver_name && (
                          <div className="text-[10px] text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded font-medium mt-0.5">
                            बुझ्ने: {v.cash_receiver_name} {v.cash_receiver_phone ? `(${v.cash_receiver_phone})` : ''}
                          </div>
                        )}
                        {/* Bank Cheque Audit */}
                        {v.payment_mode !== 'cash' && (v.cheque_no || v.bank_name) && (
                          <div className="text-[10px] text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded font-mono mt-0.5">
                            {v.bank_name} {v.cheque_no ? `| Chq: ${v.cheque_no}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-red-600">
                        {isPayment ? formatNPR(v.net_amount) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-600">
                        {!isPayment ? formatNPR(v.net_amount) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-xs">
                  <td colSpan={6} className="py-3 px-3 text-right uppercase tracking-wider text-slate-700">
                    जम्मा कुल रकम (Grand Total):
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-red-700 text-sm">
                    {formatNPR(summary.totalDebit)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-700 text-sm">
                    {formatNPR(summary.totalCredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Print Signature Section */}
      <div className="hidden print:grid grid-cols-4 gap-6 pt-16 text-center text-xs font-bold text-slate-800 border-t-2 border-slate-800 mt-8">
        <div>
          <div className="border-b border-slate-400 mb-2 pb-6" />
          <span>लेखापाल (Accountant)</span>
        </div>
        <div>
          <div className="border-b border-slate-400 mb-2 pb-6" />
          <span>साइट इन्चार्ज (Site In-charge)</span>
        </div>
        <div>
          <div className="border-b border-slate-400 mb-2 pb-6" />
          <span>आन्तरिक लेखापरीक्षक (Auditor)</span>
        </div>
        <div>
          <div className="border-b border-slate-400 mb-2 pb-6" />
          <span>प्रबन्ध निर्देशक (Managing Director)</span>
        </div>
      </div>
    </div>
  );
}
