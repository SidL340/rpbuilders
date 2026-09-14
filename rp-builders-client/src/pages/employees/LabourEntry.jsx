import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UserCheck, Plus, Trash2, Calendar, DollarSign,
  Building2, ArrowLeft, CheckCircle2
} from 'lucide-react';
import { employeesAPI, projectsAPI, accountsAPI } from '../../services/api';
import { formatNPR } from '../../utils/helpers';
import { todayBS, formatBSDate } from '../../utils/nepaliDate';
import Loader from '../../components/ui/Loader';
import toast from 'react-hot-toast';

export default function LabourEntry() {
  const [projects, setProjects] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [dateBs, setDateBs] = useState(todayBS());
  const [projectId, setProjectId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');

  // Daily Muster Roll rows
  const [rows, setRows] = useState([
    { worker_name: 'Mason Mistri (डकर्मी दल)', worker_type: 'mason', quantity: 2, days_fraction: 1, daily_rate: 1200, remarks: 'Brick laying' },
    { worker_name: 'Helper Labour (लेबर)', worker_type: 'helper', quantity: 4, days_fraction: 1, daily_rate: 800, remarks: 'Mortar mixing & carrying' },
  ]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [pRes, aRes] = await Promise.all([
          projectsAPI.getAll({ status: 'active' }),
          accountsAPI.getAll()
        ]);
        if (pRes.data.success) {
          const p = pRes.data.data || [];
          setProjects(p);
          if (p.length > 0) setProjectId(p[0].id);
        }
        if (aRes.data.success) {
          const a = aRes.data.data || [];
          setAccounts(a);
          if (a.length > 0) setAccountId(a[0].id);
        }
      } catch (err) {
        toast.error('Failed to load muster form data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const addRow = () => {
    setRows([...rows, { worker_name: 'Unskilled Worker', worker_type: 'unskilled', quantity: 1, days_fraction: 1, daily_rate: 800, remarks: '' }]);
  };

  const removeRow = (index) => {
    if (rows.length === 1) return toast.error('At least one labour group required');
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;
    setRows(updated);
  };

  const totalWageAmount = rows.reduce((sum, r) => {
    const qty = parseFloat(r.quantity || 0);
    const day = parseFloat(r.days_fraction || 0);
    const rate = parseFloat(r.daily_rate || 0);
    return sum + (qty * day * rate);
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectId || !dateBs) return toast.error('Project site and date are required');

    try {
      setSubmitting(true);
      const res = await employeesAPI.addLabour({
        project_id: projectId,
        attendance_date_bs: dateBs,
        account_id: accountId || null,
        payment_mode: paymentMode,
        records: rows,
      });

      if (res.data.success) {
        toast.success(res.data.message);
        // Reset rows
        setRows([
          { worker_name: 'Mason Mistri', worker_type: 'mason', quantity: 2, days_fraction: 1, daily_rate: 1200, remarks: '' }
        ]);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record labour wages');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader text="Loading daily wage attendance muster..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/employees"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-black text-slate-850 tracking-tight">Daily Site Labour Wage Entry (मजदुर ज्याला)</h2>
            <p className="text-xs text-slate-500">Record daily labour attendance muster roll and cash wage payments</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Site & Date Picker */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Project Site Location *</label>
            <select
              required
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-medium"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.project_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Work Date (BS YYYY-MM-DD) *</label>
            <input
              type="text"
              required
              value={dateBs}
              onChange={(e) => setDateBs(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Paid From Cash / Bank Account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
            >
              <option value="">-- No Auto-Payment Voucher --</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.account_name} ({formatNPR(a.current_balance)})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Labour Line Items Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Worker Attendance & Daily Rates
            </h4>
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Worker Group</span>
            </button>
          </div>

          <div className="overflow-x-auto p-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-500 font-bold uppercase text-[10px] pb-2 border-b border-slate-200">
                  <th className="pb-2 px-2">Group / Worker Name</th>
                  <th className="pb-2 px-2">Skill Level / Role</th>
                  <th className="pb-2 px-2 text-center">Head Count (संख्या)</th>
                  <th className="pb-2 px-2 text-center">Day Fraction (हाजिरी)</th>
                  <th className="pb-2 px-2 text-right">Daily Rate (ज्याला)</th>
                  <th className="pb-2 px-2 text-right">Line Total</th>
                  <th className="pb-2 px-2 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => {
                  const lineTotal = (parseFloat(r.quantity || 0) * parseFloat(r.days_fraction || 0)) * parseFloat(r.daily_rate || 0);
                  return (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          value={r.worker_name}
                          onChange={(e) => updateRow(i, 'worker_name', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <select
                          value={r.worker_type}
                          onChange={(e) => updateRow(i, 'worker_type', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white capitalize"
                        >
                          <option value="mason">Mason (डकर्मी)</option>
                          <option value="helper">Helper (लेबर)</option>
                          <option value="carpenter">Carpenter (सिकर्मी)</option>
                          <option value="electrician">Electrician (विद्युत)</option>
                          <option value="plumber">Plumber (प्लम्बर)</option>
                          <option value="unskilled">Unskilled (मजदुर)</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          step="any"
                          value={r.quantity}
                          onChange={(e) => updateRow(i, 'quantity', e.target.value)}
                          className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-center"
                        />
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <select
                          value={r.days_fraction}
                          onChange={(e) => updateRow(i, 'days_fraction', e.target.value)}
                          className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        >
                          <option value="1">Full Day (1.0)</option>
                          <option value="0.5">Half Day (0.5)</option>
                          <option value="1.5">Full + OT (1.5)</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <input
                          type="number"
                          step="any"
                          value={r.daily_rate}
                          onChange={(e) => updateRow(i, 'daily_rate', e.target.value)}
                          className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-right font-bold text-slate-800"
                        />
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-black text-slate-900">
                        {formatNPR(lineTotal)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Total */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Total Labour Count:</span>
              <span className="font-bold text-slate-800 text-sm font-mono">
                {rows.reduce((sum, r) => sum + parseFloat(r.quantity || 0), 0)} Workers
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Total Daily Wage Outlay:</span>
                <span className="text-xl font-black text-red-600 tracking-tight font-mono">
                  {formatNPR(totalWageAmount)}
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/30 transition cursor-pointer"
              >
                {submitting ? 'Submitting...' : 'Save Muster & Record Wage Voucher'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
