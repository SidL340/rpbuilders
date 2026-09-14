import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HardHat, Plus, Search, Filter, ArrowRight,
  DollarSign, CheckCircle2, AlertCircle, FileText
} from 'lucide-react';
import { thekedarAPI, projectsAPI, partiesAPI, accountsAPI } from '../../services/api';
import { formatNPR } from '../../utils/helpers';
import { todayBS } from '../../utils/nepaliDate';
import Modal from '../../components/ui/Modal';
import Loader from '../../components/ui/Loader';
import SearchInput from '../../components/ui/SearchInput';
import toast from 'react-hot-toast';

export default function Thekedar() {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [projects, setProjects] = useState([]);
  const [thekedars, setThekedars] = useState([]);
  const [accounts, setAccounts] = useState([]);

  // Modals
  const [isWOModalOpen, setIsWOModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // New Work Order Form
  const [woForm, setWoForm] = useState({
    project_id: '',
    thekedar_id: '',
    work_description: '',
    work_type: 'Masonry (डकर्मी)',
    unit: 'SFT',
    quantity: '',
    unit_rate: '',
    total_contract_amount: '',
    advance_paid: '0',
    retention_percent: '5',
    tds_percent: '1.5',
    start_date_bs: todayBS(),
    end_date_bs: '',
  });

  // Payment Form
  const [payForm, setPayForm] = useState({
    payment_date_bs: todayBS(),
    payment_type: 'running_bill',
    gross_amount: '',
    retention_amount: '0',
    tds_amount: '0',
    advance_adjusted: '0',
    work_completion_percent: '',
    account_id: '',
    payment_mode: 'cash',
    bill_no: '',
    remarks: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [woRes, pRes, pyRes, accRes] = await Promise.all([
        thekedarAPI.getWorkOrders({ project_id: projectFilter || undefined, status: statusFilter || undefined }),
        projectsAPI.getAll({ status: 'active' }),
        partiesAPI.getAll({ type: 'thekedar' }),
        accountsAPI.getAll()
      ]);

      if (woRes.data.success) setWorkOrders(woRes.data.data || []);
      if (pRes.data.success) setProjects(pRes.data.data || []);
      if (pyRes.data.success) setThekedars(pyRes.data.data || []);
      if (accRes.data.success) {
        const a = accRes.data.data || [];
        setAccounts(a);
        if (a.length > 0) setPayForm(prev => ({ ...prev, account_id: a[0].id }));
      }
    } catch (err) {
      toast.error('Failed to load thekedar contracts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectFilter, statusFilter]);

  const handleCreateWO = async (e) => {
    e.preventDefault();
    if (!woForm.project_id || !woForm.thekedar_id || !woForm.work_description) {
      return toast.error('Project, Thekedar, and Description are required');
    }

    try {
      setSubmitting(true);
      const res = await thekedarAPI.createWorkOrder({
        ...woForm,
        quantity: parseFloat(woForm.quantity || 0),
        unit_rate: parseFloat(woForm.unit_rate || 0),
        total_contract_amount: parseFloat(woForm.total_contract_amount || 0),
        advance_paid: parseFloat(woForm.advance_paid || 0),
        retention_percent: parseFloat(woForm.retention_percent || 0),
        tds_percent: parseFloat(woForm.tds_percent || 1.5),
      });

      if (res.data.success) {
        toast.success(`Work Order ${res.data.data.work_order_no} created successfully`);
        setIsWOModalOpen(false);
        loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create work order');
    } finally {
      setSubmitting(false);
    }
  };

  const openPaymentModal = (wo) => {
    setSelectedWO(wo);
    setPayForm(prev => ({
      ...prev,
      gross_amount: '',
      retention_amount: '0',
      tds_amount: '0',
      advance_adjusted: '0',
      work_completion_percent: wo.completion_percent || '',
      remarks: '',
    }));
    setIsPayModalOpen(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!payForm.gross_amount || parseFloat(payForm.gross_amount) <= 0) {
      return toast.error('Enter a valid gross amount');
    }

    try {
      setSubmitting(true);
      const res = await thekedarAPI.createPayment(selectedWO.id, payForm);
      if (res.data.success) {
        toast.success(res.data.message);
        setIsPayModalOpen(false);
        loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Payment recording failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-850 tracking-tight">Thekedar & Subcontractor Thekka</h2>
          <p className="text-xs text-slate-500">Track contract scopes, running bill measurements, retention, and TDS</p>
        </div>
        <button
          onClick={() => setIsWOModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Thekka Work Order</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
        >
          <option value="">All Construction Sites</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.project_name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="active">Active Thekka</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Work Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <Loader text="Loading thekedar contracts..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                  <th className="py-3 px-4">WO Number</th>
                  <th className="py-3 px-4">Project Site</th>
                  <th className="py-3 px-4">Thekedar (ठेकेदार)</th>
                  <th className="py-3 px-4">Work Scope</th>
                  <th className="py-3 px-4 text-right">Contract Value</th>
                  <th className="py-3 px-4 text-right">Paid So Far</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Progress</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workOrders.map((wo) => {
                  const compPct = Math.round(wo.completion_percent || 0);
                  const bal = parseFloat(wo.total_contract_amount) - parseFloat(wo.total_paid);
                  return (
                    <tr key={wo.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{wo.work_order_no}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{wo.project_name}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{wo.thekedar_name}</td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={wo.work_description}>
                        {wo.work_description}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatNPR(wo.total_contract_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                        {formatNPR(wo.total_paid)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-red-600">
                        {formatNPR(bal)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${compPct}%` }} />
                          </div>
                          <span className="font-bold text-[10px] text-slate-700">{compPct}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openPaymentModal(wo)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition"
                          >
                            Pay Bill
                          </button>
                          <Link
                            to={`/thekedar/${wo.id}`}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition"
                          >
                            History
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {workOrders.length === 0 && (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-400">
                      No thekedar work orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Work Order Modal */}
      <Modal
        isOpen={isWOModalOpen}
        onClose={() => setIsWOModalOpen(false)}
        title="Create Thekedar Work Order (ठेक्का सम्झौता)"
        size="lg"
      >
        <form onSubmit={handleCreateWO} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Project Site Location *</label>
              <select
                required
                value={woForm.project_id}
                onChange={(e) => setWoForm({ ...woForm, project_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
              >
                <option value="">-- Select Project Site --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.project_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Thekedar (ठेकेदार) *</label>
              <select
                required
                value={woForm.thekedar_id}
                onChange={(e) => setWoForm({ ...woForm, thekedar_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
              >
                <option value="">-- Select Thekedar --</option>
                {thekedars.map((py) => (
                  <option key={py.id} value={py.id}>{py.party_name} ({py.phone})</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Work Description & Scope *</label>
              <textarea
                rows="2"
                required
                value={woForm.work_description}
                onChange={(e) => setWoForm({ ...woForm, work_description: e.target.value })}
                placeholder="e.g. Masonry brickwork from Ground to 2nd Floor, Earthwork excavation for foundation"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Work Category Type</label>
              <input
                type="text"
                value={woForm.work_type}
                onChange={(e) => setWoForm({ ...woForm, work_type: e.target.value })}
                placeholder="Masonry, Carpentry, Shuttering, Earthwork"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Measurement Unit</label>
              <input
                type="text"
                value={woForm.unit}
                onChange={(e) => setWoForm({ ...woForm, unit: e.target.value })}
                placeholder="SFT, CFT, CUM, LST, RFT"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Quantity (Optional)</label>
              <input
                type="number"
                value={woForm.quantity}
                onChange={(e) => {
                  const q = e.target.value;
                  const r = woForm.unit_rate;
                  setWoForm({
                    ...woForm,
                    quantity: q,
                    total_contract_amount: q && r ? String(parseFloat(q) * parseFloat(r)) : woForm.total_contract_amount
                  });
                }}
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Unit Rate (NPR)</label>
              <input
                type="number"
                value={woForm.unit_rate}
                onChange={(e) => {
                  const r = e.target.value;
                  const q = woForm.quantity;
                  setWoForm({
                    ...woForm,
                    unit_rate: r,
                    total_contract_amount: q && r ? String(parseFloat(q) * parseFloat(r)) : woForm.total_contract_amount
                  });
                }}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Total Agreed Thekka Amount (NPR) *</label>
              <input
                type="number"
                required
                value={woForm.total_contract_amount}
                onChange={(e) => setWoForm({ ...woForm, total_contract_amount: e.target.value })}
                placeholder="Total contract value"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-900 bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Initial Advance Given (NPR)</label>
              <input
                type="number"
                value={woForm.advance_paid}
                onChange={(e) => setWoForm({ ...woForm, advance_paid: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">TDS Rate %</label>
              <input
                type="number"
                value={woForm.tds_percent}
                onChange={(e) => setWoForm({ ...woForm, tds_percent: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start Date (BS)</label>
              <input
                type="text"
                value={woForm.start_date_bs}
                onChange={(e) => setWoForm({ ...woForm, start_date_bs: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsWOModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-600 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              {submitting ? 'Creating...' : 'Create Thekka Contract'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Pay Bill Modal */}
      {selectedWO && (
        <Modal
          isOpen={isPayModalOpen}
          onClose={() => setIsPayModalOpen(false)}
          title={`Pay Thekedar Bill — ${selectedWO.thekedar_name} (${selectedWO.work_order_no})`}
          size="md"
        >
          <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div><strong>Site:</strong> {selectedWO.project_name}</div>
              <div><strong>Scope:</strong> {selectedWO.work_description}</div>
              <div className="flex justify-between font-mono pt-1 text-slate-600">
                <span>Contract: {formatNPR(selectedWO.total_contract_amount)}</span>
                <span>Paid: {formatNPR(selectedWO.total_paid)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Date (BS)</label>
                <input
                  type="text"
                  required
                  value={payForm.payment_date_bs}
                  onChange={(e) => setPayForm({ ...payForm, payment_date_bs: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bill Type</label>
                <select
                  value={payForm.payment_type}
                  onChange={(e) => setPayForm({ ...payForm, payment_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="running_bill">Running Bill (चलु बिल)</option>
                  <option value="advance">Additional Advance (पेश्की)</option>
                  <option value="final_bill">Final Bill (अन्तिम भुक्तान)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Gross Bill Amount (NPR) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={payForm.gross_amount}
                  onChange={(e) => {
                    const g = parseFloat(e.target.value || 0);
                    const tds = Math.round((g * (selectedWO.tds_percent || 1.5) / 100) * 100) / 100;
                    setPayForm({
                      ...payForm,
                      gross_amount: e.target.value,
                      tds_amount: String(tds)
                    });
                  }}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">TDS Amount ({selectedWO.tds_percent}%)</label>
                <input
                  type="number"
                  value={payForm.tds_amount}
                  onChange={(e) => setPayForm({ ...payForm, tds_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Advance Deducted</label>
                <input
                  type="number"
                  value={payForm.advance_adjusted}
                  onChange={(e) => setPayForm({ ...payForm, advance_adjusted: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Paid From Account</label>
                <select
                  required
                  value={payForm.account_id}
                  onChange={(e) => setPayForm({ ...payForm, account_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.account_name} ({formatNPR(a.current_balance)})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Net calculation preview */}
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
              <span className="font-bold text-blue-900">Net Amount to Pay:</span>
              <span className="font-mono font-black text-blue-950 text-base">
                {formatNPR(
                  parseFloat(payForm.gross_amount || 0) -
                  parseFloat(payForm.retention_amount || 0) -
                  parseFloat(payForm.tds_amount || 0) -
                  parseFloat(payForm.advance_adjusted || 0)
                )}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer"
              >
                {submitting ? 'Recording...' : 'Disburse & Record Voucher'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
