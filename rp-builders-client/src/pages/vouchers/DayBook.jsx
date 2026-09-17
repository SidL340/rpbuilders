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
  BookmarkCheck,
  Edit3,
  Trash2
} from 'lucide-react';
import { vouchersAPI, projectsAPI, partiesAPI, categoriesAPI, accountsAPI } from '../../services/api';
import { todayBS, formatBSDate, getFiscalYear, getFiscalYearList } from '../../utils/nepaliDate';
import { formatNPR } from '../../utils/helpers';
import { useCompany } from '../../contexts/CompanyContext';
import Loader from '../../components/ui/Loader';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

export default function DayBook() {
  const { company } = useCompany();
  const [dateBS, setDateBS] = useState(todayBS());
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('');
  const [projects, setProjects] = useState([]);
  const [parties, setParties] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [summary, setSummary] = useState({ totalDebit: 0, totalCredit: 0, netFlow: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  // Edit Voucher Modal
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const fiscalYears = getFiscalYearList();
  const currentFY = getFiscalYear(dateBS);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [pRes, prRes, cRes, aRes] = await Promise.all([
          projectsAPI.getAll(),
          partiesAPI.getAll(),
          categoriesAPI.getAll(),
          accountsAPI.getAll(),
        ]);
        setProjects(pRes.data.data || []);
        setParties(prRes.data.data || []);
        setCategories(cRes.data.data || []);
        setAccounts(aRes.data.data || []);
      } catch (err) {
        console.error(err);
      }
    }
    loadMeta();
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

  const handleOpenEdit = (v) => {
    setEditingVoucher(v);
    setEditForm({
      voucher_type: v.voucher_type || 'payment',
      voucher_date_bs: v.voucher_date_bs || '',
      project_id: v.project_id ? String(v.project_id) : '',
      party_id: v.party_id ? String(v.party_id) : '',
      account_id: v.account_id ? String(v.account_id) : '',
      category_id: v.category_id ? String(v.category_id) : '',
      narration: v.narration || '',
      gross_amount: String(v.gross_amount || ''),
      tds_percent: String(v.tds_percent || '0'),
      payment_mode: v.payment_mode || 'cash',
      cheque_no: v.cheque_no || '',
      bank_name: v.bank_name || '',
      cash_receiver_name: v.cash_receiver_name || '',
      cash_receiver_phone: v.cash_receiver_phone || '',
      reference_no: v.reference_no || '',
      bill_no: v.bill_no || '',
      remarks: v.remarks || '',
      status: v.status || 'approved'
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.gross_amount || parseFloat(editForm.gross_amount) <= 0) {
      return toast.error('Valid gross amount is required');
    }

    try {
      setSavingEdit(true);
      const res = await vouchersAPI.update(editingVoucher.id, {
        ...editForm,
        gross_amount: parseFloat(editForm.gross_amount),
        tds_percent: parseFloat(editForm.tds_percent) || 0,
      });

      if (res.data.success) {
        toast.success(`भौचर "${editingVoucher.voucher_no}" सफलतापूर्वक सम्पादन गरियो!`);
        setEditingVoucher(null);
        fetchDayBook();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update voucher');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteVoucher = async (v) => {
    if (!window.confirm(`के तपाईं भौचर नं. ${v.voucher_no} (${formatNPR(v.net_amount)}) मेटाउन निश्चित हुनुहुन्छ? यो भौचर मेटाइएपछि खाता ब्यालेन्स स्वतः मिलान हुनेछ।`)) {
      return;
    }

    try {
      const res = await vouchersAPI.delete(v.id);
      if (res.data.success) {
        toast.success(res.data.message);
        fetchDayBook();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete voucher');
    }
  };

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
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
          दैनिक रोजनामचा खाता (DAY BOOK REGISTER)
        </h3>
        <div className="flex justify-between text-xs mt-2 font-semibold text-slate-800 border-t border-slate-300 pt-2">
          <span>कारोबार मिति: <strong>{formatBSDate(dateBS, 'np')} ({dateBS} BS)</strong></span>
          <span>आर्थिक वर्ष: <strong>{selectedFiscalYear || currentFY.label}</strong></span>
          <span>साइट / आयोजना: <strong>{selectedProject ? projects.find(p => String(p.id) === String(selectedProject))?.project_name : 'सबै साइटहरु (All Sites)'}</strong></span>
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
                  <th className="py-3 px-3 text-center no-print">कार्य (Action)</th>
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
                      <td className="py-3 px-3 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(v)}
                            title="सम्पादन गर्नुहोस् (Edit)"
                            className="p-1 rounded text-amber-600 hover:bg-amber-50"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteVoucher(v)}
                            title="मेटाउनुहोस् (Delete)"
                            className="p-1 rounded text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
                  <td className="no-print"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Edit Voucher Modal in DayBook */}
      {editingVoucher && editForm && (
        <Modal
          isOpen={!!editingVoucher}
          onClose={() => setEditingVoucher(null)}
          title={`भौचर सम्पादन (Edit Voucher) — ${editingVoucher.voucher_no}`}
          size="lg"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">भौचर प्रकार (Type) *</label>
                <select
                  value={editForm.voucher_type}
                  onChange={(e) => setEditForm({ ...editForm, voucher_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-bold capitalize"
                >
                  <option value="payment">खर्च भुक्तानी (Payment)</option>
                  <option value="receipt">रकम प्राप्ति (Receipt)</option>
                  <option value="journal">जर्नल भौचर (Journal)</option>
                  <option value="contra">कन्ट्रा (Contra)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">मिति (Date BS YYYY-MM-DD) *</label>
                <input
                  type="text"
                  required
                  value={editForm.voucher_date_bs}
                  onChange={(e) => setEditForm({ ...editForm, voucher_date_bs: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">स्थिति (Status)</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-bold capitalize"
                >
                  <option value="approved">Approved (स्वीकृत)</option>
                  <option value="draft">Draft (पेन्डिङ)</option>
                  <option value="cancelled">Cancelled (रद्द)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">साइट / आयोजना (Project Site)</label>
                <select
                  value={editForm.project_id}
                  onChange={(e) => setEditForm({ ...editForm, project_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">-- कार्यालय / General Office --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.project_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">पार्टी / सप्लायर्स (Party)</label>
                <select
                  value={editForm.party_id}
                  onChange={(e) => setEditForm({ ...editForm, party_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">-- सिधै भुक्तानी (Direct / Cash) --</option>
                  {parties.map((pr) => (
                    <option key={pr.id} value={pr.id}>{pr.party_name} ({pr.party_type})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">खर्च शीर्षक (Category)</label>
                <select
                  value={editForm.category_id}
                  onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">-- शीर्षक छान्नुहोस् --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.category_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">कम्पनी खाता (Bank / Cash Account) *</label>
                <select
                  required
                  value={editForm.account_id}
                  onChange={(e) => setEditForm({ ...editForm, account_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-medium"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.account_name} ({formatNPR(a.current_balance)})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">कुल रकम (Gross NPR) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editForm.gross_amount}
                  onChange={(e) => setEditForm({ ...editForm, gross_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">TDS कट्टी %</label>
                <input
                  type="number"
                  step="any"
                  value={editForm.tds_percent}
                  onChange={(e) => setEditForm({ ...editForm, tds_percent: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">भुक्तानी माध्यम (Mode)</label>
                <select
                  value={editForm.payment_mode}
                  onChange={(e) => setEditForm({ ...editForm, payment_mode: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white capitalize font-medium"
                >
                  <option value="cash">नगद (Cash)</option>
                  <option value="cheque">चेक (Cheque)</option>
                  <option value="bank_transfer">बैंक ट्रान्सफर (Bank Transfer)</option>
                  <option value="online">अनलाइन (Online)</option>
                </select>
              </div>
            </div>

            {/* Mode details */}
            {editForm.payment_mode === 'cash' ? (
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-amber-900 mb-1">नगद बुझ्ने व्यक्तिको नाम</label>
                  <input
                    type="text"
                    value={editForm.cash_receiver_name}
                    onChange={(e) => setEditForm({ ...editForm, cash_receiver_name: e.target.value })}
                    placeholder="e.g. राम प्रसाद दाहाल"
                    className="w-full px-3 py-1.5 border border-amber-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-amber-900 mb-1">सम्पर्क फोन नं.</label>
                  <input
                    type="text"
                    value={editForm.cash_receiver_phone}
                    onChange={(e) => setEditForm({ ...editForm, cash_receiver_phone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-amber-200 rounded-lg bg-white font-mono"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-blue-900 mb-1">बैंकको नाम</label>
                  <input
                    type="text"
                    value={editForm.bank_name}
                    onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })}
                    placeholder="e.g. Nabil Bank"
                    className="w-full px-3 py-1.5 border border-blue-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-blue-900 mb-1">चेक नं. / Voucher Ref</label>
                  <input
                    type="text"
                    value={editForm.cheque_no}
                    onChange={(e) => setEditForm({ ...editForm, cheque_no: e.target.value })}
                    className="w-full px-3 py-1.5 border border-blue-200 rounded-lg bg-white font-mono"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">कारोबार विवरण (Narration) *</label>
              <textarea
                required
                rows={2}
                value={editForm.narration}
                onChange={(e) => setEditForm({ ...editForm, narration: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingVoucher(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
              >
                रद्द गर्नुहोस् (Cancel)
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm"
              >
                {savingEdit ? 'सुरक्षित गर्दै...' : 'परिवर्तन सुरक्षित गर्नुहोस् (Save Changes)'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Print Signature Section */}
      <div className="hidden print:grid grid-cols-4 gap-6 pt-16 text-center text-xs font-bold text-slate-800 border-t-2 border-slate-800 mt-12 print-signature-block">
        <div>
          <div className="border-b border-slate-400 mb-2 pb-6" />
          <span>तयार गर्ने / लेखापाल<br />(Accountant)</span>
        </div>
        <div>
          <div className="border-b border-slate-400 mb-2 pb-6" />
          <span>साइट इन्चार्ज<br />(Site In-charge)</span>
        </div>
        <div>
          <div className="border-b border-slate-400 mb-2 pb-6" />
          <span>आन्तरिक लेखापरीक्षक<br />(Internal Auditor)</span>
        </div>
        <div>
          <div className="border-b border-slate-400 mb-2 pb-6" />
          <span>प्रबन्ध निर्देशक<br />(Managing Director)</span>
        </div>
      </div>
    </div>
  );
}
