import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Receipt, PlusCircle, Search, Filter, Eye, CheckCircle2,
  XCircle, Printer, Download
} from 'lucide-react';
import { vouchersAPI, projectsAPI, partiesAPI } from '../../services/api';
import { formatNPR } from '../../utils/helpers';
import Loader from '../../components/ui/Loader';
import SearchInput from '../../components/ui/SearchInput';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

export default function VoucherList() {
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
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  useEffect(() => {
    projectsAPI.getAll().then(res => setProjects(res.data.data || [])).catch(() => {});
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
                        {v.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancel(v.id)}
                            title="Cancel"
                            className="p-1 rounded text-red-500 hover:bg-red-50"
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
              <h3 className="text-base font-black text-slate-900">R.P. BUILDERS PVT. LTD.</h3>
              <p className="text-[10px] text-slate-500">Official Accounting Voucher</p>
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
    </div>
  );
}
