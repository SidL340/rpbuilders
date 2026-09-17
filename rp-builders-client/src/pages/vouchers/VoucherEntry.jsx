import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Receipt,
  Building2,
  Calendar,
  DollarSign,
  User,
  CreditCard,
  Building,
  CheckCircle2,
  Printer,
  Sparkles,
  FileText,
  BookmarkCheck,
  Phone,
  Landmark,
  Upload,
  Download,
  Clock,
  RotateCcw,
  FileSpreadsheet,
  ListPlus
} from 'lucide-react';
import { vouchersAPI, projectsAPI, partiesAPI, categoriesAPI, accountsAPI } from '../../services/api';
import { todayBS, todayAD, bsToAd, formatBSDate, getFiscalYear, getFiscalYearList, getFiscalYearDateRange, toNepaliDigits } from '../../utils/nepaliDate';
import { formatNPR, amountInWords } from '../../utils/helpers';
import { useCompany } from '../../contexts/CompanyContext';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const NEPALI_BANKS = [
  'Nabil Bank Ltd',
  'Global IME Bank Ltd',
  'NIC Asia Bank Ltd',
  'Rastriya Banijya Bank',
  'Nepal Investment Mega Bank',
  'Everest Bank Ltd',
  'Sanima Bank Ltd',
  'Prabhu Bank Ltd',
  'Citizens Bank International',
  'Agriculture Development Bank',
  'Nepal Bank Ltd',
  'Machhapuchchhre Bank Ltd',
  'Kumari Bank Ltd',
  'Siddharth Bank Ltd',
  'Laxmi Sunrise Bank Ltd',
  'Prime Commercial Bank Ltd',
  'Other / सहकारी'
];

export default function VoucherEntry() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { company } = useCompany();
  const amountInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [parties, setParties] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    voucher_type: 'payment', // payment (खर्च) or receipt (आम्दानी)
    voucher_date_bs: todayBS(),
    project_id: '',
    party_id: '',
    account_id: '',
    category_id: '',
    narration: '',
    gross_amount: '',
    tds_percent: '0',
    payment_mode: 'cash',
    
    // Cash Audit Fields
    cash_receiver_name: '',
    cash_receiver_phone: '',
    cash_handed_by: user?.name || 'R.P. Builders Accountant',

    // Bank / Cheque Audit Fields
    bank_name: '',
    cheque_no: '',
    cheque_date_bs: todayBS(),
    bank_voucher_no: '',

    bill_no: '',
    remarks: '',
  });

  const activeFiscalYear = getFiscalYear(formData.voucher_date_bs);
  const currentFiscalYear = getFiscalYear(todayBS()).label;
  const isPastFiscalYear = activeFiscalYear.label !== currentFiscalYear;

  // Bulk Import State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [parsedBulkRows, setParsedBulkRows] = useState([]);
  const [importingBulk, setImportingBulk] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [projRes, partyRes, catRes, accRes] = await Promise.all([
          projectsAPI.getAll(),
          partiesAPI.getAll(),
          categoriesAPI.getFlat(),
          accountsAPI.getAll(),
        ]);
        setProjects(projRes.data.data || []);
        setParties(partyRes.data.data || []);
        setCategories(catRes.data.data || []);
        
        const accs = accRes.data.data || [];
        setAccounts(accs);
        if (accs.length > 0) {
          setFormData((prev) => ({ ...prev, account_id: accs[0].id }));
        }
      } catch (err) {
        toast.error('Failed to load form metadata');
      }
    }
    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // When user picks a fiscal year from dropdown
  const handleFiscalYearSelect = (fy) => {
    if (!fy) return;
    const range = getFiscalYearDateRange(fy);
    setFormData((prev) => ({
      ...prev,
      voucher_date_bs: range.start || prev.voucher_date_bs,
      cheque_date_bs: range.start || prev.cheque_date_bs,
    }));
  };

  // Reset to Current Today BS
  const handleResetToCurrentFY = () => {
    setFormData((prev) => ({
      ...prev,
      voucher_date_bs: todayBS(),
      cheque_date_bs: todayBS(),
    }));
  };

  // Filter Categories by Mode: Expense vs Income
  const visibleCategories = categories.filter((c) => {
    if (formData.voucher_type === 'receipt') {
      return c.category_type === 'income';
    }
    return c.category_type !== 'income';
  });

  // Calculations
  const gross = parseFloat(formData.gross_amount) || 0;
  const tdsPct = parseFloat(formData.tds_percent) || 0;
  const tdsAmount = Math.round((gross * tdsPct / 100) * 100) / 100;
  const netAmount = gross - tdsAmount;

  const selectedProject = projects.find((p) => String(p.id) === String(formData.project_id));
  const selectedParty = parties.find((p) => String(p.id) === String(formData.party_id));
  const selectedCategory = categories.find((c) => String(c.id) === String(formData.category_id));
  const selectedAccount = accounts.find((a) => String(a.id) === String(formData.account_id));

  const handleSubmit = async (e, keepOpen = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.voucher_date_bs) return toast.error('कारोबार मिति (BS Date) प्रविष्टि गर्नुहोस्');
    if (!formData.account_id) return toast.error('कृपया खाता छान्नुहोस्');
    if (!formData.narration) return toast.error('कारोबारको विवरण / कैफियत प्रविष्टि गर्नुहोस्');
    if (gross <= 0) return toast.error('कृपया मान्य रकम प्रविष्टि गर्नुहोस्');

    try {
      setLoading(true);
      const payload = {
        ...formData,
        fiscal_year: activeFiscalYear.label,
        voucher_date_ad: bsToAd(formData.voucher_date_bs) || todayAD(),
        gross_amount: gross,
        tds_percent: tdsPct,
        tds_amount: tdsAmount,
        net_amount: netAmount,
        auto_approve: true,
      };

      const res = await vouchersAPI.create(payload);
      toast.success(`भौचर ${res.data.data?.voucher_no || ''} (${activeFiscalYear.label}) सुरक्षित भयो!`);

      if (keepOpen) {
        // Continuous Entry Mode: Retain date, project, account, payment mode, fiscal year
        setFormData((prev) => ({
          ...prev,
          narration: '',
          gross_amount: '',
          bill_no: '',
          cheque_no: '',
          bank_voucher_no: '',
          cash_receiver_name: '',
          cash_receiver_phone: '',
          remarks: '',
        }));
        if (amountInputRef.current) {
          amountInputRef.current.focus();
        }
      } else {
        // Standard Entry Reset
        setFormData((prev) => ({
          ...prev,
          narration: '',
          gross_amount: '',
          bill_no: '',
          cheque_no: '',
          bank_voucher_no: '',
          cash_receiver_name: '',
          cash_receiver_phone: '',
          remarks: '',
        }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save voucher');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Bulk Past-Year Data Import Logic
  // -------------------------------------------------------------
  const downloadSampleCSV = () => {
    const headers = 'Date_BS,Type,Project_Name,Category_Name,Party_Name,Account_Name,Gross_Amount,TDS_Percent,Narration,Bill_No,Payment_Mode';
    const sampleRows = [
      '2081-05-10,payment,Pokhara Bridge Project,Cement,Shree Ram Hardware,Main Cash Account,45000,0,Purchase of 50 bags OPC cement,INV-102,cash',
      '2081-06-15,receipt,Pokhara Bridge Project,Client Running Bill / Invoice Payment,Department of Roads,Global IME Bank A/C,250000,1.5,Running bill #01 payment received,RB-01,bank_transfer',
      '2081-08-20,payment,Butwal Commercial Complex,Site Labour,Ram Bahadur Thekedar,Nabil Bank A/C,75000,1.5,Masonry labour running wage payment,V-401,bank_transfer',
      '2080-11-12,payment,Head Office,Electricity & Utilities,Nepal Electricity Authority,Main Cash Account,12500,0,Office electricity bill payment,BILL-99,cash',
      '2080-12-25,receipt,Head Office,Owner / Partner Capital Investment,Director Capital,Global IME Bank A/C,500000,0,Capital equity deposit for project launch,DEP-01,bank_transfer',
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent([headers, ...sampleRows].join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', 'rp_builders_past_fiscal_year_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSVRows = (text) => {
    if (!text.trim()) {
      setParsedBulkRows([]);
      return;
    }

    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;

    // Detect if first line is header
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('date') || firstLine.includes('type') || firstLine.includes('amount');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const parsed = dataLines.map((line, index) => {
      // Handle tab-separated (copy-paste from Excel) or comma-separated
      const cols = line.includes('\t') ? line.split('\t') : line.split(',');
      const clean = cols.map((c) => c.replace(/^["']|["']$/g, '').trim());

      const dateBs = clean[0] || '';
      const vType = (clean[1] || 'payment').toLowerCase().includes('rec') ? 'receipt' : 'payment';
      const projStr = clean[2] || '';
      const catStr = clean[3] || '';
      const partyStr = clean[4] || '';
      const accStr = clean[5] || '';
      const grossAmt = parseFloat(clean[6]) || 0;
      const tds = parseFloat(clean[7]) || 0;
      const narr = clean[8] || (vType === 'receipt' ? 'Past year income record' : 'Past year expense record');
      const bill = clean[9] || '';
      const mode = (clean[10] || 'cash').toLowerCase();

      // Auto-match metadata
      const matchedProj = projects.find(
        (p) => p.project_name.toLowerCase().includes(projStr.toLowerCase()) || p.project_code.toLowerCase() === projStr.toLowerCase()
      );
      const matchedCat = categories.find(
        (c) => c.name.toLowerCase().includes(catStr.toLowerCase()) || c.code.toLowerCase() === catStr.toLowerCase()
      );
      const matchedParty = parties.find((p) => p.party_name.toLowerCase().includes(partyStr.toLowerCase()));
      const matchedAcc = accounts.find((a) => a.account_name.toLowerCase().includes(accStr.toLowerCase())) || accounts[0];

      const rowFY = getFiscalYear(dateBs).label;
      const isValid = Boolean(dateBs && grossAmt > 0 && matchedAcc);

      return {
        id: index + 1,
        voucher_date_bs: dateBs,
        voucher_type: vType,
        fiscal_year: rowFY,
        project_id: matchedProj ? matchedProj.id : null,
        projectName: matchedProj ? matchedProj.project_name : '🏢 Head Office',
        category_id: matchedCat ? matchedCat.id : null,
        categoryName: matchedCat ? matchedCat.name : catStr || 'General',
        party_id: matchedParty ? matchedParty.id : null,
        partyName: matchedParty ? matchedParty.party_name : partyStr || 'N/A',
        account_id: matchedAcc ? matchedAcc.id : accounts[0]?.id,
        accountName: matchedAcc ? matchedAcc.account_name : 'Default Account',
        gross_amount: grossAmt,
        tds_percent: tds,
        payment_mode: ['cash', 'cheque', 'bank_transfer'].includes(mode) ? mode : 'cash',
        narration: narr,
        bill_no: bill,
        isValid,
      };
    });

    setParsedBulkRows(parsed);
  };

  const handleBulkFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target.result;
      setBulkText(content);
      parseCSVRows(content);
    };
    reader.readAsText(file);
  };

  const handleImportAllVouchers = async () => {
    const validRows = parsedBulkRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      return toast.error('No valid rows to import. Please check date and amount.');
    }

    try {
      setImportingBulk(true);
      const payload = validRows.map((r) => ({
        voucher_type: r.voucher_type,
        voucher_date_bs: r.voucher_date_bs,
        voucher_date_ad: bsToAd(r.voucher_date_bs) || todayAD(),
        fiscal_year: r.fiscal_year,
        project_id: r.project_id,
        category_id: r.category_id,
        party_id: r.party_id,
        account_id: r.account_id,
        gross_amount: r.gross_amount,
        tds_percent: r.tds_percent,
        payment_mode: r.payment_mode,
        narration: r.narration,
        bill_no: r.bill_no,
      }));

      const res = await vouchersAPI.createBulk(payload);
      toast.success(`सफलतापूर्वक ${res.data.data?.length || validRows.length} वटा भौचरहरू प्रणालीमा प्रविष्टि भए!`);
      setShowBulkModal(false);
      setBulkText('');
      setParsedBulkRows([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to bulk import vouchers');
    } finally {
      setImportingBulk(false);
    }
  };

  const bulkTotalPayment = parsedBulkRows.filter((r) => r.voucher_type === 'payment').reduce((sum, r) => sum + r.gross_amount, 0);
  const bulkTotalReceipt = parsedBulkRows.filter((r) => r.voucher_type === 'receipt').reduce((sum, r) => sum + r.gross_amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
              द्रुत इन्ट्री पोर्टल
            </span>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                isPastFiscalYear
                  ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                  : 'text-emerald-700 bg-emerald-50 border-emerald-200'
              }`}
            >
              {activeFiscalYear.fullLabel} ({activeFiscalYear.label})
              {isPastFiscalYear ? ' • विगत आर्थिक वर्ष' : ' • चालु आ.व.'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            दैनिक तथा विगत आ.व. खर्च/आम्दानी प्रविष्टि (Voucher Entry)
          </h1>
          <p className="text-xs text-slate-500">
            चालु वा विगत आर्थिक वर्षका खर्च, आम्दानी, बिल भुक्तानी तथा पेश्की कारोबारहरू प्रविष्टि गर्नुहोस्
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>📥 विगत आ.व. एकमुष्ठ आयात (Excel/CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/vouchers/daybook')}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold transition cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-blue-600" />
            <span>दैनिक रोजनामचा (Day Book)</span>
          </button>
        </div>
      </div>

      {/* Past Fiscal Year Active Notice Banner */}
      {isPastFiscalYear && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 rounded-2xl border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black">
                🕒 विगत आर्थिक वर्ष प्रविष्टि सक्रिय छ: {activeFiscalYear.fullLabel} ({activeFiscalYear.label})
              </p>
              <p className="text-[11px] text-amber-800">
                तपाईं विगत वर्षका कारोबार प्रविष्टि गर्दै हुनुहुन्छ। भौचर नं. स्वतः {activeFiscalYear.label.split('/')[0]} वर्ष अनुसार जारी हुनेछ।
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetToCurrentFY}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>चालु आ.व. ({currentFiscalYear}) मा फर्कनुहोस्</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: The Main Fast Form */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="lg:col-span-2 space-y-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs">
          {/* 1. Transaction Type: Expense vs Inflow */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              कारोबारको प्रकार (Transaction Mode) *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, voucher_type: 'payment', category_id: '' })}
                className={`py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer border ${
                  formData.voucher_type === 'payment'
                    ? 'bg-red-50 text-red-700 border-red-300 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span>🔴 खर्च भुक्तानी (Expense / Payment)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, voucher_type: 'receipt', category_id: '' })}
                className={`py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer border ${
                  formData.voucher_type === 'receipt'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>🟢 आम्दानी / रकम प्राप्ति (Money Inflow / Receipt)</span>
              </button>
            </div>
          </div>

          {/* 2. Fiscal Year, BS Date & Site Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Fiscal Year Quick Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                आर्थिक वर्ष (Fiscal Year) *
              </label>
              <select
                value={activeFiscalYear.label}
                onChange={(e) => handleFiscalYearSelect(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {getFiscalYearList().map((fy) => (
                  <option key={fy.value} value={fy.value}>
                    {fy.label}
                  </option>
                ))}
              </select>
            </div>

            {/* BS Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                कारोबार मिति (Nepali Date BS) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="voucher_date_bs"
                  value={formData.voucher_date_bs}
                  onChange={handleChange}
                  placeholder="YYYY-MM-DD"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
                <Calendar className="w-4 h-4 text-blue-600 absolute left-3 top-3" />
              </div>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">
                {formatBSDate(formData.voucher_date_bs, 'np')}
              </p>
            </div>

            {/* Site / Project */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                साइट / आयोजना (Site / Project)
              </label>
              <select
                name="project_id"
                value={formData.project_id}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">🏢 कार्यालय / हेड अफिस (Head Office)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_type === 'joint_venture' ? '🤝 [JV] ' : '🏛️ [Solo] '}
                    {p.project_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Category & Party Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Dynamic Category (Expense vs Income) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {formData.voucher_type === 'receipt'
                  ? 'आम्दानीको शीर्षक (Income Category) *'
                  : 'खर्चको शीर्षक (Expense Category) *'}
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- शीर्षक छान्नुहोस् (Select Category) --</option>
                {visibleCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_id ? `↳ ${c.name} (${c.name_np || ''})` : `📁 ${c.name} (${c.name_np || ''})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic Party (Payer vs Payee) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {formData.voucher_type === 'receipt'
                  ? 'रकम भुक्तान गर्ने पार्टी / ग्राहक / साझेदार (Client / Payer)'
                  : 'सम्बन्धित पार्टी / ठेकेदार / सप्लायर्स (Payee Party)'}
              </label>
              <select
                name="party_id"
                value={formData.party_id}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- पार्टी छान्नुहोस् (Optional Party) --</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.party_type?.toUpperCase()}] {p.party_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Amount, TDS & Net Payable */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-900 mb-1">
                  रकम (Gross Amount NPR) *
                </label>
                <input
                  ref={amountInputRef}
                  type="number"
                  step="0.01"
                  name="gross_amount"
                  value={formData.gross_amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-black text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              {/* TDS Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {formData.voucher_type === 'receipt'
                    ? 'TDS कट्टी (TDS by Client)'
                    : 'TDS करकट्टी (TDS Rate)'}
                </label>
                <select
                  name="tds_percent"
                  value={formData.tds_percent}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="0">0% (कुनै करकट्टी छैन)</option>
                  <option value="1.5">1.5% (ठेक्का / निर्माण TDS)</option>
                  <option value="5">5% (परामर्श / सेवा TDS)</option>
                  <option value="10">10% (घरभाडा TDS)</option>
                  <option value="15">15% (कम्पनी अडिट / सेवा)</option>
                </select>
                {tdsAmount > 0 && (
                  <p className="text-[10px] text-red-600 font-mono font-bold mt-1">
                    TDS: -{formatNPR(tdsAmount)}
                  </p>
                )}
              </div>

              {/* Net Payable Display */}
              <div>
                <label className="block text-xs font-black text-blue-900 mb-1">
                  {formData.voucher_type === 'receipt' ? 'खुद प्राप्त रकम (Net Received)' : 'खुद भुक्तानी (Net Amount)'}
                </label>
                <div className="px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm font-mono font-black text-blue-800">
                  {formatNPR(netAmount)}
                </div>
              </div>
            </div>

            {/* Amount In Words (Nepali Format) */}
            {netAmount > 0 && (
              <div className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700">अक्षरेपी: </span>
                <span className="italic text-blue-900 font-medium capitalize">
                  {amountInWords(netAmount)}
                </span>
              </div>
            )}
          </div>

          {/* 5. Account & Payment Mode */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {formData.voucher_type === 'receipt'
                    ? 'रकम जम्मा भएको खाता / बैंक (Deposit Account) *'
                    : 'भुक्तानी दिइएको खाता / बैंक (Paid From Account) *'}
                </label>
                <select
                  name="account_id"
                  value={formData.account_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      🏦 {a.account_name} ({a.account_type?.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  भुक्तानी माध्यम (Mode) *
                </label>
                <div className="flex items-center gap-2">
                  {['cash', 'bank_transfer', 'cheque'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setFormData({ ...formData, payment_mode: mode })}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition cursor-pointer border ${
                        formData.payment_mode === mode
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {mode === 'cash' ? '💵 नगद' : mode === 'cheque' ? '📑 चेक' : '🏦 ट्रान्सफर'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* A. If Payment is CASH: Capture Receiver and Handed By */}
            {formData.payment_mode === 'cash' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    रकम बुझ्ने व्यक्तिको नाम (Receiver)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="cash_receiver_name"
                      value={formData.cash_receiver_name}
                      onChange={handleChange}
                      placeholder="e.g. रामु मिस्त्री / ड्राइभर"
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    बुझ्नेको फोन नं. (Receiver Phone)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="cash_receiver_phone"
                      value={formData.cash_receiver_phone}
                      onChange={handleChange}
                      placeholder="98XXXXXXXX"
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    रकम बुझाउने व्यक्ति (Handed Over By)
                  </label>
                  <input
                    type="text"
                    name="cash_handed_by"
                    value={formData.cash_handed_by}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* B. If Payment is BANK / CHEQUE: Capture Bank, Cheque No, Date, Voucher Ref */}
            {(formData.payment_mode === 'bank_transfer' || formData.payment_mode === 'cheque') && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    कुन बैंकबाट (Bank Name)
                  </label>
                  <select
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">-- बैंक छान्नुहोस् --</option>
                    {NEPALI_BANKS.map((b, i) => (
                      <option key={i} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    चेक नं. (Cheque No.)
                  </label>
                  <input
                    type="text"
                    name="cheque_no"
                    value={formData.cheque_no}
                    onChange={handleChange}
                    placeholder="e.g. 09812345"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    चेक मिति (Cheque Date BS)
                  </label>
                  <input
                    type="text"
                    name="cheque_date_bs"
                    value={formData.cheque_date_bs}
                    onChange={handleChange}
                    placeholder="YYYY-MM-DD"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    बैंक भौचर / Ref ID
                  </label>
                  <input
                    type="text"
                    name="bank_voucher_no"
                    value={formData.bank_voucher_no}
                    onChange={handleChange}
                    placeholder="Ref / Txn No."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 6. Description / Narration */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              विवरण / कैफियत (Narration / Purpose) *
            </label>
            <textarea
              name="narration"
              rows={2}
              value={formData.narration}
              onChange={handleChange}
              placeholder={
                formData.voucher_type === 'receipt'
                  ? 'e.g. रनिङ बिल नं ३ भुक्तानी / पेश्की रकम / कबाडी बिक्री...'
                  : 'e.g. १५० बोरा सिमेन्ट र २ टन रड खरिद गरिएको / पोखरा साइट फाउण्डेसन ढलान भुक्तानी...'
              }
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          {/* Bill No & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                बिल / भ्याट इनभ्वाइस नं. (Bill / Tax Invoice No.)
              </label>
              <input
                type="text"
                name="bill_no"
                value={formData.bill_no}
                onChange={handleChange}
                placeholder="e.g. INV-2081-45"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                अन्य थप विवरण (Remarks)
              </label>
              <input
                type="text"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                placeholder="Optional remarks"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Continuous & Standard Entry Buttons */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={(e) => handleSubmit(e, true)}
              className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-2xl font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ListPlus className="w-4 h-4" />
              <span>{loading ? 'सुरक्षित हुँदैछ...' : '💾 सुरक्षित गरी अर्को थप्नुहोस् (Save & Add Next)'}</span>
            </button>

            <button
              type="submit"
              disabled={loading}
              className="py-3.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-2xl font-black text-xs sm:text-sm shadow-md shadow-blue-500/25 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'सुरक्षित हुँदैछ...' : '✅ भौचर सुरक्षित गर्नुहोस् (Save Voucher)'}</span>
            </button>
          </div>
        </form>

        {/* Right 1 Col: Live Printable Slip Preview */}
        <div className="space-y-4">
          <div className="bg-gradient-to-b from-slate-900 to-blue-950 text-white p-5 rounded-3xl shadow-lg border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                  भौचर स्लिप प्रिभ्यू (Slip Preview)
                </span>
              </div>
              <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-400/30">
                {activeFiscalYear.fullLabel}
              </span>
            </div>

            {/* Simulated Printed Voucher Receipt */}
            <div className="bg-white text-slate-900 p-5 rounded-2xl shadow-sm text-xs space-y-3 font-sans">
              <div className="text-center border-b border-slate-200 pb-2">
                {company?.company_logo_data ? (
                  <img
                    src={company.company_logo_data}
                    alt="Logo"
                    className="h-10 max-w-[150px] object-contain mx-auto mb-1.5"
                  />
                ) : null}
                <h3 className="font-black text-sm tracking-tight text-slate-900">
                  {company?.company_name || 'R.P. BUILDERS PVT. LTD.'}
                </h3>
                <p className="text-[10px] text-slate-500">{company?.address || 'Nepal'} • Construction Accounting Portal</p>
                <div className="inline-block mt-1 px-2.5 py-0.5 bg-slate-100 rounded-md font-bold text-[10px] uppercase tracking-wider text-blue-700 border border-slate-200">
                  {formData.voucher_type === 'payment' ? 'खर्च भुक्तानी भौचर (Payment Voucher)' : 'रकम प्राप्ति भौचर (Receipt Voucher)'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] border-b border-slate-100 pb-2">
                <div>
                  <span className="text-slate-400 block">मिति (Date):</span>
                  <span className="font-bold text-slate-800">{formatBSDate(formData.voucher_date_bs, 'np')}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">आ.व. (Fiscal Year):</span>
                  <span className="font-bold text-emerald-700">{activeFiscalYear.label}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">साइट (Site):</span>
                  <span className="font-bold text-slate-800">{selectedProject?.project_name || 'कार्यालय (Head Office)'}</span>
                </div>
                {selectedParty && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">पार्टी (Party):</span>
                    <span className="font-bold text-slate-800">{selectedParty.party_name}</span>
                  </div>
                )}
                {selectedCategory && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">शीर्षक (Category):</span>
                    <span className="font-bold text-slate-800">{selectedCategory.name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">माध्यम (Mode):</span>
                  <span className="font-bold capitalize text-slate-800">{formData.payment_mode}</span>
                </div>

                {/* Cash Specific Receiver */}
                {formData.payment_mode === 'cash' && formData.cash_receiver_name && (
                  <div className="flex justify-between bg-amber-50 p-1.5 rounded text-amber-950">
                    <span>रकम बुझ्ने (Receiver):</span>
                    <span className="font-bold">{formData.cash_receiver_name} {formData.cash_receiver_phone ? `(${formData.cash_receiver_phone})` : ''}</span>
                  </div>
                )}

                {/* Bank Cheque Specific */}
                {formData.payment_mode !== 'cash' && (formData.bank_name || formData.cheque_no) && (
                  <div className="bg-blue-50 p-1.5 rounded text-blue-950 space-y-0.5">
                    {formData.bank_name && <div className="flex justify-between"><span>बैंक:</span><span className="font-bold">{formData.bank_name}</span></div>}
                    {formData.cheque_no && <div className="flex justify-between"><span>चेक नं:</span><span className="font-mono font-bold">{formData.cheque_no}</span></div>}
                  </div>
                )}
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Gross Amount:</span>
                  <span className="font-mono font-bold text-slate-700">{formatNPR(gross)}</span>
                </div>
                {tdsAmount > 0 && (
                  <div className="flex justify-between text-[11px] text-red-600">
                    <span>TDS ({tdsPct}%):</span>
                    <span className="font-mono font-bold">-{formatNPR(tdsAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-black text-slate-900 border-t border-slate-200 pt-1">
                  <span>{formData.voucher_type === 'receipt' ? 'Net Received:' : 'Net Payable:'}</span>
                  <span className="font-mono text-blue-700">{formatNPR(netAmount)}</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-1 pt-4 text-center text-[9px] text-slate-400 border-t border-dashed border-slate-200">
                <div>
                  <div className="border-b border-slate-300 mb-1 pb-4" />
                  <span>तयार गर्ने (Prepared)</span>
                </div>
                <div>
                  <div className="border-b border-slate-300 mb-1 pb-4" />
                  <span>{formData.voucher_type === 'receipt' ? 'दाखिला गर्ने' : 'बुझ्ने (Receiver)'}</span>
                </div>
                <div>
                  <div className="border-b border-slate-300 mb-1 pb-4" />
                  <span>स्वीकृत (Approved)</span>
                </div>
              </div>

              <div className="text-[9px] text-slate-400 text-center pt-1">
                Developed by Nirmala Tech Innovations Pvt. Ltd.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Bulk Past-Year Data Import Modal                          */}
      {/* ========================================================= */}
      <Modal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="📥 विगत आर्थिक वर्षको एकमुष्ठ खर्च/आम्दानी आयात (Bulk Import Past Records)"
        size="xl"
      >
        <div className="space-y-5">
          {/* Instructions and Template Download */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-black text-slate-900">
                एक्सेल वा CSV फाइलबाट एकमुष्ठ भौचर प्रविष्टि गर्नुहोस्
              </h4>
              <p className="text-[11px] text-slate-500">
                विगत आर्थिक वर्ष (२०८१/८२, २०८०/८१ आदि) को सम्पूर्ण खर्च तथा आम्दानी रेकर्ड एकै क्लिकमा आयात गर्न मिल्छ।
              </p>
            </div>
            <button
              type="button"
              onClick={downloadSampleCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>नमुना CSV डाउनलोड (Download Template)</span>
            </button>
          </div>

          {/* File Upload or Text Paste */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                CSV फाइल छान्नुहोस् वा तल एक्सेलबाट सिधै पेस्ट (Paste) गर्नुहोस्:
              </label>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer border border-slate-300">
                <Upload className="w-3.5 h-3.5" />
                <span>CSV फाइल अपलोड</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleBulkFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <textarea
              rows={5}
              value={bulkText}
              onChange={(e) => {
                setBulkText(e.target.value);
                parseCSVRows(e.target.value);
              }}
              placeholder="Date_BS,Type,Project_Name,Category_Name,Party_Name,Account_Name,Gross_Amount,TDS_Percent,Narration,Bill_No,Payment_Mode&#10;2081-05-10,payment,Pokhara Bridge Project,Cement,Shree Ram Hardware,Main Cash Account,45000,0,Purchase of 50 bags OPC cement,INV-102,cash&#10;2081-06-15,receipt,Pokhara Bridge Project,Client Running Bill / Invoice Payment,Department of Roads,Global IME Bank A/C,250000,1.5,Running bill #01 payment received,RB-01,bank_transfer"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Parsed Rows Preview */}
          {parsedBulkRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50 p-3.5 rounded-xl border border-blue-200 text-xs">
                <div className="font-bold text-blue-900">
                  कुल प्रविष्टि संख्या: <span className="font-mono font-black">{parsedBulkRows.length} वटा</span>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="text-red-700 font-bold">
                    कुल खर्च (Debit): {formatNPR(bulkTotalPayment)}
                  </span>
                  <span className="text-emerald-700 font-bold">
                    कुल आम्दानी (Credit): {formatNPR(bulkTotalReceipt)}
                  </span>
                  <span className="text-blue-800 font-black">
                    खुद रकम (Net): {formatNPR(bulkTotalReceipt - bulkTotalPayment)}
                  </span>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">मिति (BS)</th>
                      <th className="p-2.5">आ.व.</th>
                      <th className="p-2.5">प्रकार</th>
                      <th className="p-2.5">आयोजना</th>
                      <th className="p-2.5">शीर्षक</th>
                      <th className="p-2.5">पार्टी</th>
                      <th className="p-2.5 text-right">रकम (NPR)</th>
                      <th className="p-2.5">विवरण</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {parsedBulkRows.map((r) => (
                      <tr key={r.id} className={r.isValid ? 'hover:bg-slate-50' : 'bg-red-50/50'}>
                        <td className="p-2.5 font-mono text-slate-400">{r.id}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-800">{r.voucher_date_bs}</td>
                        <td className="p-2.5">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            {r.fiscal_year}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.voucher_type === 'receipt' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {r.voucher_type === 'receipt' ? 'आम्दानी' : 'खर्च'}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-700 font-medium truncate max-w-[120px]">{r.projectName}</td>
                        <td className="p-2.5 text-slate-700 truncate max-w-[120px]">{r.categoryName}</td>
                        <td className="p-2.5 text-slate-600 truncate max-w-[100px]">{r.partyName}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {formatNPR(r.gross_amount)}
                        </td>
                        <td className="p-2.5 text-slate-600 truncate max-w-[150px]">{r.narration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowBulkModal(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              बन्द गर्नुहोस् (Cancel)
            </button>
            <button
              type="button"
              disabled={importingBulk || parsedBulkRows.filter((r) => r.isValid).length === 0}
              onClick={handleImportAllVouchers}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {importingBulk
                  ? 'भौचरहरू आयात हुँदैछ...'
                  : `सबै (${parsedBulkRows.filter((r) => r.isValid).length}) भौचर प्रणालीमा सुरक्षित गर्नुहोस्`}
              </span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
