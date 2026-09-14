import React, { useState, useEffect } from 'react';
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
  Landmark
} from 'lucide-react';
import { vouchersAPI, projectsAPI, partiesAPI, categoriesAPI, accountsAPI } from '../../services/api';
import { todayBS, todayAD, bsToAd, formatBSDate, getFiscalYear } from '../../utils/nepaliDate';
import { formatNPR, amountInWords } from '../../utils/helpers';
import { useCompany } from '../../contexts/CompanyContext';
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

  // Calculations
  const gross = parseFloat(formData.gross_amount) || 0;
  const tdsPct = parseFloat(formData.tds_percent) || 0;
  const tdsAmount = Math.round((gross * tdsPct / 100) * 100) / 100;
  const netAmount = gross - tdsAmount;

  const selectedProject = projects.find((p) => String(p.id) === String(formData.project_id));
  const selectedParty = parties.find((p) => String(p.id) === String(formData.party_id));
  const selectedCategory = categories.find((c) => String(c.id) === String(formData.category_id));
  const selectedAccount = accounts.find((a) => String(a.id) === String(formData.account_id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.voucher_date_bs) return toast.error('Please enter BS Date');
    if (!formData.account_id) return toast.error('Please select an account');
    if (!formData.narration) return toast.error('Please enter transaction description / narration');
    if (gross <= 0) return toast.error('Please enter a valid amount');

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
      toast.success(`भौचर ${res.data.data?.voucher_no || ''} सफलतापूर्वक सुरक्षित भयो!`);

      // Reset amount and narration for quick subsequent entry
      setFormData((prev) => ({
        ...prev,
        narration: '',
        gross_amount: '',
        bill_no: '',
        cheque_no: '',
        bank_voucher_no: '',
        cash_receiver_name: '',
        cash_receiver_phone: '',
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save voucher');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
              द्रुत दैनिक इन्ट्री
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {activeFiscalYear.fullLabel} ({activeFiscalYear.label})
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            दैनिक खर्च तथा आम्दानी इन्ट्री (Daily Entry)
          </h1>
          <p className="text-xs text-slate-500">
            निर्माण साइटको खर्च, ठेकेदार भुक्तानी, सामग्री खरिद वा आम्दानी एकै ठाउँबाट इन्ट्री गर्नुहोस्
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/vouchers/daybook')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold transition cursor-pointer"
        >
          <Receipt className="w-4 h-4 text-blue-600" />
          <span>दैनिक रोजनामचा (Day Book)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: The Main Fast Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs">
          {/* 1. Transaction Type: Expense vs Inflow */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              कारोबारको प्रकार (Transaction Mode) *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, voucher_type: 'payment' })}
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
                onClick={() => setFormData({ ...formData, voucher_type: 'receipt' })}
                className={`py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer border ${
                  formData.voucher_type === 'receipt'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>🟢 आम्दानी / रकम प्राप्ति (Money Inflow)</span>
              </button>
            </div>
          </div>

          {/* 2. Date & Fiscal Year & Site Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* BS Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                मिति (Nepali Date BS) *
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

            {/* Aarthik Barsha (Auto-calculated) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                आर्थिक वर्ष (Fiscal Year)
              </label>
              <div className="py-2.5 px-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-between">
                <span>{activeFiscalYear.fullLabel}</span>
                <span className="font-mono text-[10px] bg-emerald-200/60 px-1.5 py-0.5 rounded text-emerald-900">
                  {activeFiscalYear.label}
                </span>
              </div>
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
            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                खर्चको शीर्षक (Expense Category) *
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- शीर्षक छान्नुहोस् (Select Category) --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_id ? `↳ ${c.name} (${c.name_np || ''})` : `📁 ${c.name}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Party */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                सम्बन्धित पार्टी / ठेकेदार / सप्लायर्स (Party)
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
                  TDS करकट्टी (TDS Rate)
                </label>
                <select
                  name="tds_percent"
                  value={formData.tds_percent}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="0">0% (कुनै करकट्टी छैन)</option>
                  <option value="1.5">1.5% (ठेक्का / निर्माण TDS)</option>
                  <option value="10">10% (घरभाडा / परामर्श)</option>
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
                  खुद भुक्तानी (Net Amount)
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

          {/* 5. Payment Mode (Cash vs Bank Audit Details) */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                भुक्तानी माध्यम (Payment Mode & Details) *
              </label>
              <div className="flex items-center gap-2">
                {['cash', 'bank_transfer', 'cheque'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFormData({ ...formData, payment_mode: mode })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition cursor-pointer border ${
                      formData.payment_mode === mode
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {mode === 'cash' ? '💵 नगद (Cash)' : mode === 'cheque' ? '📑 चेक (Cheque)' : '🏦 बैंक ट्रान्सफर'}
                  </button>
                ))}
              </div>
            </div>

            {/* A. If Payment is CASH: Capture Receiver and Handed By */}
            {formData.payment_mode === 'cash' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    रकम बुझ्ने व्यक्तिको नाम (Receiver) *
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
                    कुन बैंकबाट (Bank Name) *
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
              placeholder="e.g. १५० बोरा सिमेन्ट र २ टन रड खरिद गरिएको / पोखरा साइट फाउण्डेसन ढलान भुक्तानी..."
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
                placeholder="e.g. INV-2083-45"
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

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-2xl font-black text-sm shadow-md shadow-blue-500/25 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{loading ? 'इन्ट्री सुरक्षित हुँदैछ...' : 'भौचर सुरक्षित गर्नुहोस् (Save & Post Entry)'}</span>
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
                  <span>Net Payable:</span>
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
                  <span>बुझ्ने (Received By)</span>
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
    </div>
  );
}
