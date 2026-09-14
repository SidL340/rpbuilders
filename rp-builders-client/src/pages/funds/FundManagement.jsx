import React, { useState, useEffect } from 'react';
import {
  Wallet, Plus, DollarSign, ArrowUpRight,
  TrendingUp, Users, Landmark, FileText
} from 'lucide-react';
import { fundsAPI, partiesAPI, accountsAPI } from '../../services/api';
import { formatNPR } from '../../utils/helpers';
import { todayBS } from '../../utils/nepaliDate';
import Modal from '../../components/ui/Modal';
import Loader from '../../components/ui/Loader';
import toast from 'react-hot-toast';

export default function FundManagement() {
  const [activeTab, setActiveTab] = useState('sources');
  const [sources, setSources] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [parties, setParties] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Source form
  const [sourceForm, setSourceForm] = useState({
    source_name: '',
    source_type: 'personal_loan',
    party_id: '',
    total_sanctioned_amount: '',
    interest_rate: '',
    notes: '',
  });

  // Receipt form
  const [receiptForm, setReceiptForm] = useState({
    fund_source_id: '',
    receipt_date_bs: todayBS(),
    amount: '',
    payment_mode: 'cash',
    account_id: '',
    bank_ref: '',
    cheque_no: '',
    description: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [sRes, rRes, sumRes, pyRes, accRes] = await Promise.all([
        fundsAPI.getSources(),
        fundsAPI.getReceipts(),
        fundsAPI.getSummary(),
        partiesAPI.getAll(),
        accountsAPI.getAll()
      ]);

      if (sRes.data.success) setSources(sRes.data.data || []);
      if (rRes.data.success) setReceipts(rRes.data.data || []);
      if (sumRes.data.success) setSummary(sumRes.data.data || null);
      if (pyRes.data.success) setParties(pyRes.data.data || []);
      if (accRes.data.success) {
        const a = accRes.data.data || [];
        setAccounts(a);
        if (a.length > 0) setReceiptForm(prev => ({ ...prev, account_id: a[0].id }));
      }
    } catch (err) {
      toast.error('Failed to load fund records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSource = async (e) => {
    e.preventDefault();
    if (!sourceForm.source_name) return toast.error('Source name is required');
    try {
      setSubmitting(true);
      const res = await fundsAPI.createSource({
        ...sourceForm,
        total_sanctioned_amount: parseFloat(sourceForm.total_sanctioned_amount || 0),
        interest_rate: parseFloat(sourceForm.interest_rate || 0),
      });
      if (res.data.success) {
        toast.success(`Fund source ${sourceForm.source_name} added!`);
        setIsSourceModalOpen(false);
        loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add source');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReceipt = async (e) => {
    e.preventDefault();
    if (!receiptForm.fund_source_id || !receiptForm.amount) {
      return toast.error('Source and amount are required');
    }
    try {
      setSubmitting(true);
      const res = await fundsAPI.createReceipt({
        ...receiptForm,
        amount: parseFloat(receiptForm.amount || 0),
      });
      if (res.data.success) {
        toast.success(res.data.message);
        setIsReceiptModalOpen(false);
        loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record receipt');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-850 tracking-tight">Fund & Loan (साहु) Management</h2>
          <p className="text-xs text-slate-500">Track capital inflow, bank borrowings, sahoo loans, and client advances</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSourceModalOpen(true)}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            + New Fund Source
          </button>
          <button
            onClick={() => setIsReceiptModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Receive Inflow Money</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Capital / Inflows Received</span>
          <h3 className="text-xl font-black text-emerald-600 mt-1">{formatNPR(summary?.total_funds_received || 0)}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">All verified fund receipts</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Construction Spent</span>
          <h3 className="text-xl font-black text-red-600 mt-1">{formatNPR(summary?.total_expense || 0)}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Approved site & office expenses</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Current Liquid Liquidity</span>
          <h3 className="text-xl font-black text-blue-700 mt-1">{formatNPR(summary?.total_balance || 0)}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Available in company accounts</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 flex px-6 space-x-6">
          <button
            onClick={() => setActiveTab('sources')}
            className={`py-3.5 text-xs font-bold border-b-2 transition ${
              activeTab === 'sources' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Fund Sources & Credit Facilities ({sources.length})
          </button>
          <button
            onClick={() => setActiveTab('receipts')}
            className={`py-3.5 text-xs font-bold border-b-2 transition ${
              activeTab === 'receipts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Fund Inflow Receipt History ({receipts.length})
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <Loader text="Loading fund ledger..." />
          ) : activeTab === 'sources' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Source Title</th>
                    <th className="py-3 px-4">Category Type</th>
                    <th className="py-3 px-4">Linked Party (साहु)</th>
                    <th className="py-3 px-4 text-right">Sanctioned Limit</th>
                    <th className="py-3 px-4 text-right">Total Disbursed</th>
                    <th className="py-3 px-4 text-right">Available Limit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sources.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{s.source_code}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{s.source_name}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 capitalize">
                          {s.source_type?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{s.party_name || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        {formatNPR(s.total_sanctioned_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                        {formatNPR(s.total_received)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatNPR(s.remaining_sanctioned)}
                      </td>
                    </tr>
                  ))}
                  {sources.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400">
                        No fund sources added yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                    <th className="py-3 px-4">Receipt No</th>
                    <th className="py-3 px-4">Date (BS)</th>
                    <th className="py-3 px-4">Source Title</th>
                    <th className="py-3 px-4">Credited Account</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Inflow Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receipts.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{r.receipt_no}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{r.receipt_date_bs}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{r.source_name}</td>
                      <td className="py-3 px-4 text-slate-700">{r.account_name}</td>
                      <td className="py-3 px-4 capitalize font-mono text-slate-500">{r.payment_mode}</td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{r.description || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-600">
                        {formatNPR(r.amount)}
                      </td>
                    </tr>
                  ))}
                  {receipts.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400">
                        No inflow receipts recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Source Modal */}
      <Modal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        title="Add Fund Source or Loan Facility"
        size="md"
      >
        <form onSubmit={handleCreateSource} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Source Name / Bank *</label>
            <input
              type="text"
              required
              value={sourceForm.source_name}
              onChange={(e) => setSourceForm({ ...sourceForm, source_name: e.target.value })}
              placeholder="e.g. Loan from Nabil Bank, Hari Prasad Sahoo Loan"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Inflow Category</label>
            <select
              value={sourceForm.source_type}
              onChange={(e) => setSourceForm({ ...sourceForm, source_type: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
            >
              <option value="personal_loan">व्यक्तिगत ऋण / Personal Loan (साहु)</option>
              <option value="bank_loan">बैंक ऋण / Bank Commercial Loan</option>
              <option value="owners_capital">मालिकको लगानी / Owners Capital</option>
              <option value="partner_contribution">JV Partner Capital</option>
              <option value="client_advance">Client Advance on Tender</option>
              <option value="other_income">Other Income</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Linked Party (साहु / Bank)</label>
            <select
              value={sourceForm.party_id}
              onChange={(e) => setSourceForm({ ...sourceForm, party_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
            >
              <option value="">-- Direct / No Linked Party --</option>
              {parties.map((py) => (
                <option key={py.id} value={py.id}>{py.party_name} ({py.party_type})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Sanctioned Limit (NPR)</label>
              <input
                type="number"
                value={sourceForm.total_sanctioned_amount}
                onChange={(e) => setSourceForm({ ...sourceForm, total_sanctioned_amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Interest Rate % (Annual)</label>
              <input
                type="number"
                value={sourceForm.interest_rate}
                onChange={(e) => setSourceForm({ ...sourceForm, interest_rate: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Notes & Terms</label>
            <textarea
              rows="2"
              value={sourceForm.notes}
              onChange={(e) => setSourceForm({ ...sourceForm, notes: e.target.value })}
              placeholder="Repayment terms, mortgage details"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSourceModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              Save Source
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Receipt Modal */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Record Fund / Loan Inflow Receipt"
        size="md"
      >
        <form onSubmit={handleCreateReceipt} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Fund Source *</label>
            <select
              required
              value={receiptForm.fund_source_id}
              onChange={(e) => setReceiptForm({ ...receiptForm, fund_source_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
            >
              <option value="">-- Select Source --</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>{s.source_name} ({s.source_type})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Date (BS) *</label>
              <input
                type="text"
                required
                value={receiptForm.receipt_date_bs}
                onChange={(e) => setReceiptForm({ ...receiptForm, receipt_date_bs: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Amount Received (NPR) *</label>
              <input
                type="number"
                step="any"
                required
                value={receiptForm.amount}
                onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Credited To Account *</label>
              <select
                required
                value={receiptForm.account_id}
                onChange={(e) => setReceiptForm({ ...receiptForm, account_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.account_name} ({formatNPR(a.current_balance)})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={receiptForm.payment_mode}
                onChange={(e) => setReceiptForm({ ...receiptForm, payment_mode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Description / Notes</label>
            <input
              type="text"
              value={receiptForm.description}
              onChange={(e) => setReceiptForm({ ...receiptForm, description: e.target.value })}
              placeholder="e.g. Received partial loan disbursement for Site 1"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsReceiptModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              {submitting ? 'Recording...' : 'Record Inflow & Create RV Voucher'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
