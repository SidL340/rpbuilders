import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Printer,
  Calendar,
  Filter,
  CheckCircle2,
  AlertCircle,
  Building2,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Scale,
  PlusCircle,
  Receipt
} from 'lucide-react';
import { reportsAPI, projectsAPI } from '../../services/api';
import { formatBSDate, getFiscalYearList, todayBS } from '../../utils/nepaliDate';
import { formatNPR } from '../../utils/helpers';
import Loader from '../../components/ui/Loader';
import { useCompany } from '../../contexts/CompanyContext';
import toast from 'react-hot-toast';

export default function JournalReport() {
  const { company } = useCompany();
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({ totalDebit: 0, totalCredit: 0, count: 0, isBalanced: true });
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedFY, setSelectedFY] = useState('');
  const [fromDateBs, setFromDateBs] = useState('');
  const [toDateBs, setToDateBs] = useState('');
  const [projectId, setProjectId] = useState('');
  const [type, setType] = useState('');

  const fiscalYears = getFiscalYearList();

  useEffect(() => {
    projectsAPI.getAll().then(res => setProjects(res.data.data || [])).catch(() => {});
  }, []);

  const fetchJournal = async () => {
    try {
      setLoading(true);
      const res = await reportsAPI.journal({
        fiscal_year: selectedFY || undefined,
        from_date_bs: fromDateBs || undefined,
        to_date_bs: toDateBs || undefined,
        project_id: projectId || undefined,
        type: type || undefined,
      });

      if (res.data.success) {
        setEntries(res.data.data.entries || []);
        setSummary(res.data.data.summary || { totalDebit: 0, totalCredit: 0, count: 0, isBalanced: true });
      }
    } catch (err) {
      toast.error('Failed to load Journal Report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJournal();
  }, [selectedFY, fromDateBs, toDateBs, projectId, type]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full">
              दोहोरो लेखा प्रणाली
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {summary.isBalanced ? '✓ डेबिट र क्रेडिट सन्तुलित (Balanced)' : '⚠️ असन्तुलित'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            General Journal Register (जर्नल भौचर किताब)
          </h1>
          <p className="text-xs text-slate-500">
            आधिकारिक दोहोरो प्रविष्टि (Debit / Credit) अनुसारको विस्तृत रोजनामचा जर्नल खाता
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>जर्नल प्रिन्ट गर्नुहोस् (Print Journal)</span>
          </button>

          <Link
            to="/vouchers/entry"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>नयाँ इन्ट्री</span>
          </Link>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs grid grid-cols-1 sm:grid-cols-5 gap-3 no-print text-xs">
        {/* Fiscal Year */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">आर्थिक वर्ष (Fiscal Year)</label>
          <select
            value={selectedFY}
            onChange={(e) => setSelectedFY(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
          >
            <option value="">सबै आ.व. (All Fiscal Years)</option>
            {fiscalYears.map((fy, i) => (
              <option key={i} value={fy.value}>{fy.label}</option>
            ))}
          </select>
        </div>

        {/* From Date BS */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">सुरु मिति (From Date BS)</label>
          <input
            type="text"
            value={fromDateBs}
            onChange={(e) => setFromDateBs(e.target.value)}
            placeholder="YYYY-MM-DD"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        {/* To Date BS */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">अन्तिम मिति (To Date BS)</label>
          <input
            type="text"
            value={toDateBs}
            onChange={(e) => setToDateBs(e.target.value)}
            placeholder="YYYY-MM-DD"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        {/* Site Filter */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">साइट / आयोजना (Site)</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
          >
            <option value="">सबै साइटहरु (All Sites)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.project_name}</option>
            ))}
          </select>
        </div>

        {/* Voucher Type */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">प्रकार (Type)</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
          >
            <option value="">सबै भौचर (All Vouchers)</option>
            <option value="payment">खर्च भुक्तानी (Payment)</option>
            <option value="receipt">रकम प्राप्ति (Receipt)</option>
          </select>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 no-print">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">कुल भौचर संख्या</span>
          <div className="text-xl font-black font-mono text-slate-900 mt-1">
            {summary.count} Entries
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-red-200 shadow-xs">
          <span className="text-[11px] font-bold text-red-600 uppercase">कुल डेबिट रकम (Total Debit)</span>
          <div className="text-xl font-black font-mono text-red-600 mt-1">
            {formatNPR(summary.totalDebit)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase">कुल क्रेडिट रकम (Total Credit)</span>
          <div className="text-xl font-black font-mono text-emerald-700 mt-1">
            {formatNPR(summary.totalCredit)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-purple-200 shadow-xs">
          <span className="text-[11px] font-bold text-purple-700 uppercase">लेखा सन्तुलन (Balance Check)</span>
          <div className="text-lg font-black mt-1 flex items-center gap-1.5 text-emerald-700">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{summary.isBalanced ? 'डेबिट = क्रेडिट (OK)' : 'असन्तुलित'}</span>
          </div>
        </div>
      </div>

      {/* Printable Report Header with Logo */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-4 mb-4 font-sans">
        <div className="flex items-center justify-center gap-4 mb-2">
          {company?.company_logo_data ? (
            <img
              src={company.company_logo_data}
              alt="Company Logo"
              className="w-16 h-16 object-contain rounded-lg"
            />
          ) : (
            <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-lg">
              RP
            </div>
          )}
          <div className="text-left">
            <h2 className="text-2xl font-black uppercase text-slate-900 tracking-tight leading-none">
              {company?.company_name || 'R.P. BUILDERS PVT. LTD.'}
            </h2>
            <p className="text-xs text-slate-700 mt-0.5">{company?.company_name_np || 'आर. पी. विल्डर्स प्रा. लि.'}</p>
            <p className="text-[10px] text-slate-500">{company?.company_address || 'Kathmandu, Nepal'} • PAN: {company?.company_pan || '601234567'}</p>
          </div>
        </div>

        <h3 className="text-lg font-black mt-2 underline uppercase tracking-wide">
          गोश्वारा भौचर / रोजनामचा जर्नल रजिस्टर (GENERAL JOURNAL REGISTER)
        </h3>

        <div className="flex justify-between text-xs mt-2 font-semibold text-slate-800">
          <span>आर्थिक वर्ष: <strong>{selectedFY || 'सबै (All)'}</strong></span>
          <span>मिति: <strong>{fromDateBs || 'सुरु'} देखि {toDateBs || 'हालसम्म'}</strong></span>
          <span>साइट: <strong>{projectId ? projects.find(p => String(p.id) === String(projectId))?.project_name : 'सबै साइटहरु'}</strong></span>
        </div>
      </div>

      {/* Main Journal Register Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12">
            <Loader text="Loading general journal entries..." />
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Receipt className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-600">कुनै जर्नल भौचर भेटिएन</p>
            <p className="text-xs">कृपया माथिको फिल्टर परिवर्तन गर्नुहोस्।</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-black text-[10px] tracking-wider">
                  <th className="py-3 px-3 w-12 text-center">क्र.सं.</th>
                  <th className="py-3 px-3 w-24">मिति (Date BS)</th>
                  <th className="py-3 px-3 w-28">भौचर नं. (Voucher)</th>
                  <th className="py-3 px-3">विवरण तथा खाता शीर्षक (Particulars & Ledger Accounts)</th>
                  <th className="py-3 px-3 w-20 text-center">खाता पाना (LF)</th>
                  <th className="py-3 px-3 w-32 text-right">डेबिट (Debit Rs.)</th>
                  <th className="py-3 px-3 w-32 text-right">क्रेडिट (Credit Rs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {entries.map((entry, eIdx) => (
                  <React.Fragment key={entry.id || eIdx}>
                    {/* Voucher Header Bar in Table */}
                    <tr className="bg-slate-50/70 text-[11px] font-bold text-slate-700">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono">{eIdx + 1}</td>
                      <td className="py-2 px-3 font-mono text-slate-800">{entry.voucher_date_bs}</td>
                      <td className="py-2 px-3 font-mono text-blue-700 font-black">{entry.voucher_no}</td>
                      <td colSpan={4} className="py-2 px-3 text-slate-600">
                        <span className="font-bold text-slate-800">{entry.project_name || 'कार्यालय (Head Office)'}</span>
                        {entry.party_name && <span className="ml-2 text-slate-500">| Party: {entry.party_name}</span>}
                        {entry.bill_no && <span className="ml-2 font-mono text-[10px] bg-slate-200 px-1 py-0.5 rounded">Bill: {entry.bill_no}</span>}
                      </td>
                    </tr>

                    {/* Double Entry Lines */}
                    {entry.lines.map((line, lIdx) => {
                      const isCredit = line.credit > 0;
                      return (
                        <tr key={lIdx} className="hover:bg-slate-50/50">
                          <td className="py-1.5 px-3"></td>
                          <td className="py-1.5 px-3"></td>
                          <td className="py-1.5 px-3"></td>
                          <td className="py-1.5 px-3">
                            <div className={`${isCredit ? 'pl-8 font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
                              {line.particulars}
                            </div>
                            {line.sub_text && (
                              <div className={`text-[10px] text-slate-400 ${isCredit ? 'pl-8' : ''}`}>
                                ({line.sub_text})
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-3 text-center font-mono text-slate-400 text-[10px]">
                            {line.lf || '—'}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-red-600">
                            {line.debit > 0 ? formatNPR(line.debit) : ''}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {line.credit > 0 ? formatNPR(line.credit) : ''}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Narration Row */}
                    <tr className="border-b border-slate-200/80 bg-white">
                      <td className="py-1 px-3"></td>
                      <td className="py-1 px-3"></td>
                      <td className="py-1 px-3"></td>
                      <td colSpan={4} className="py-1 px-3 italic text-slate-500 text-[11px] pb-3">
                        (Being {entry.narration || 'Expense / Inflow recorded in accounts'})
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-400 font-black text-xs">
                  <td colSpan={5} className="py-3 px-3 text-right uppercase tracking-wider text-slate-800">
                    जम्मा कुल जोड (Grand Total):
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-red-700 text-sm">
                    {formatNPR(summary.totalDebit)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-800 text-sm">
                    {formatNPR(summary.totalCredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Formal 3-Tier Signatures on Print */}
      <div className="hidden print:grid grid-cols-3 gap-6 pt-16 text-center text-xs font-bold text-slate-800 border-t-2 border-slate-800 mt-8">
        <div>
          <div className="border-b border-slate-400 mb-2 pb-6" />
          <span>तयार गर्ने (Prepared By)</span>
        </div>
        <div>
          <div className="border-b border-slate-400 mb-2 pb-6" />
          <span>जाँच्ने / लेखापाल (Checked By)</span>
        </div>
        <div>
          <div className="border-b border-slate-400 mb-2 pb-6" />
          <span>स्वीकृत गर्ने (Approved By - MD)</span>
        </div>
      </div>
    </div>
  );
}
