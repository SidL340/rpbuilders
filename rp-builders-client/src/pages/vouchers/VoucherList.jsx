import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Receipt, PlusCircle, Search, Filter, Eye, CheckCircle2,
  XCircle, Printer, Download, Edit3, Trash2
} from 'lucide-react';
import { vouchersAPI, projectsAPI, partiesAPI, categoriesAPI, accountsAPI } from '../../services/api';
import { formatNPR } from '../../utils/helpers';
import { useCompany } from '../../contexts/CompanyContext';
import Loader from '../../components/ui/Loader';
import SearchInput from '../../components/ui/SearchInput';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

export default function VoucherList() {
  const { company } = useCompany();
  const [vouchers, setVouchers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [projectId, setProjectId] = useState('');
  const [fromDateBs, setFromDateBs] = useState('');
  const [toDateBs, setToDateBs] = useState('');

  const [projects, setProjects] = useState([]);
  const [parties, setParties] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  // Edit Voucher Modal
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    Promise.all([
      projectsAPI.getAll().then(res => setProjects(res.data.data || [])).catch(() => {}),
      partiesAPI.getAll().then(res => setParties(res.data.data || [])).catch(() => {}),
      categoriesAPI.getAll().then(res => setCategories(res.data.data || [])).catch(() => {}),
      accountsAPI.getAll().then(res => setAccounts(res.data.data || [])).catch(() => {})
    ]);
  }, []);

  const loadVouchers = async (page = 1) => {
    try {
      setLoading(true);
      const res = await vouchersAPI.getAll({
        search,
        status,
        type,
        project_id: projectId || undefined,
        from_date_bs: fromDateBs || undefined,
        to_date_bs: toDateBs || undefined,
        page,
        limit: 20
      });

      if (res.data.success) {
        setVouchers(res.data.data.vouchers || []);
        setPagination(res.data.data.pagination || { page: 1, totalPages: 1 });
      }
    } catch (err) {
      toast.error('Failed to load vouchers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVouchers(1);
  }, [search, status, type, projectId, fromDateBs, toDateBs]);

  const handleApprove = async (id) => {
    try {
      const res = await vouchersAPI.approve(id);
      if (res.data.success) {
        toast.success('Voucher approved successfully');
        loadVouchers(pagination.page);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to approve voucher');
    }
  };

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
      status: v.status || 'draft'
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
        loadVouchers(pagination.page);
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
        loadVouchers(pagination.page);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete voucher');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this voucher?')) return;
    try {
      const res = await vouchersAPI.cancel(id);
      if (res.data.success) {
        toast.success('Voucher cancelled');
        loadVouchers(pagination.page);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to cancel');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-850 tracking-tight">All Expenditure & Receipt Vouchers</h2>
          <p className="text-xs text-slate-500">Full searchable transaction audit log across all construction sites</p>
        </div>
        <Link
          to="/vouchers/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Voucher Entry</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search voucher no, narration, party..."
        />

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
        >
          <option value="">All Types</option>
          <option value="payment">Payment</option>
          <option value="receipt">Receipt</option>
          <option value="journal">Journal (JV)</option>
          <option value="contra">Contra</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="approved">Approved</option>
          <option value="draft">Draft (Pending)</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
        >
          <option value="">All Project Sites</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.project_name}</option>
          ))}
        </select>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <Loader text="Loading vouchers database..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                  <th className="py-3 px-4">Voucher No</th>
                  <th className="py-3 px-4">Date (BS)</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Project Site</th>
                  <th className="py-3 px-4">Party / Payee</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Net Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{v.voucher_no}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{v.voucher_date_bs}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        v.voucher_type === 'payment' ? 'bg-red-50 text-red-700' :
                        v.voucher_type === 'receipt' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {v.voucher_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{v.project_name || 'General Office'}</td>
                    <td className="py-3 px-4 text-slate-700">{v.party_name || '—'}</td>
                    <td className="py-3 px-4 text-slate-600">{v.category_name || '—'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatNPR(v.net_amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        v.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        v.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedVoucher(v)}
                          title="View Slip"
                          className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {v.status === 'draft' && (
                          <button
                            onClick={() => handleApprove(v.id)}
                            title="Approve"
                            className="p-1 rounded text-emerald-600 hover:bg-emerald-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(v)}
                          title="सम्पादन गर्नुहोस् (Edit Voucher)"
                          className="p-1 rounded text-amber-600 hover:bg-amber-50"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteVoucher(v)}
                          title="मेटाउनुहोस् (Delete Voucher)"
                          className="p-1 rounded text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {v.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancel(v.id)}
                            title="Cancel"
                            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {vouchers.length === 0 && (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-400">
                      No vouchers found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(p) => loadVouchers(p)}
        />
      </div>

      {/* Slip Modal */}
      {selectedVoucher && (
        <Modal
          isOpen={!!selectedVoucher}
          onClose={() => setSelectedVoucher(null)}
          title={`Voucher Slip — ${selectedVoucher.voucher_no}`}
          size="md"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="text-center pb-3 border-b border-slate-200">
              {company?.company_logo_data ? (
                <img
                  src={company.company_logo_data}
                  alt="Logo"
                  className="h-10 max-w-[150px] object-contain mx-auto mb-1.5"
                />
              ) : null}
              <h3 className="text-base font-black text-slate-900">{company?.company_name || 'R.P. BUILDERS PVT. LTD.'}</h3>
              <p className="text-[10px] text-slate-500">{company?.address || 'Nepal'} • Official Accounting Voucher</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div><strong>Voucher No:</strong> {selectedVoucher.voucher_no}</div>
              <div><strong>Date:</strong> {selectedVoucher.voucher_date_bs} BS</div>
              <div><strong>Project:</strong> {selectedVoucher.project_name || 'General Office'}</div>
              <div><strong>Party/Payee:</strong> {selectedVoucher.party_name || 'Direct'}</div>
              <div><strong>Category:</strong> {selectedVoucher.category_name}</div>
              <div><strong>Payment Mode:</strong> {selectedVoucher.payment_mode}</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <strong>Narration:</strong>
              <p className="mt-1 text-slate-700">{selectedVoucher.narration}</p>
            </div>

            <div className="text-right space-y-1 font-mono">
              <div>Gross: {formatNPR(selectedVoucher.gross_amount)}</div>
              {parseFloat(selectedVoucher.tds_amount) > 0 && (
                <div className="text-red-600">TDS: -{formatNPR(selectedVoucher.tds_amount)}</div>
              )}
              <div className="text-base font-black text-slate-900 pt-1 border-t border-slate-200">
                Net Amount: {formatNPR(selectedVoucher.net_amount)}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Print Slip
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Voucher Modal */}
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
    </div>
  );
}
