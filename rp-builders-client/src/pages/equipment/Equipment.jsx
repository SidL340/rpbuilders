import React, { useState, useEffect } from 'react';
import {
  Hammer, Plus, Search, Filter, Wrench,
  Fuel, Clock, DollarSign, Calendar
} from 'lucide-react';
import { equipmentAPI, projectsAPI, partiesAPI, accountsAPI } from '../../services/api';
import { formatNPR } from '../../utils/helpers';
import { todayBS } from '../../utils/nepaliDate';
import Modal from '../../components/ui/Modal';
import Loader from '../../components/ui/Loader';
import toast from 'react-hot-toast';

export default function Equipment() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [equipmentList, setEquipmentList] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [parties, setParties] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isEqModalOpen, setIsEqModalOpen] = useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Equipment create form
  const [eqForm, setEqForm] = useState({
    equipment_name: '',
    equipment_type: 'owned',
    category: 'Excavator (JCB)',
    owner_party_id: '',
    registration_no: '',
    model: '',
    daily_hire_rate: '',
    hourly_hire_rate: '',
    notes: '',
  });

  // Usage Form
  const [usageForm, setUsageForm] = useState({
    equipment_id: '',
    project_id: '',
    usage_date_bs: todayBS(),
    hours_used: '8',
    days_used: '1',
    fuel_consumed_ltr: '',
    hire_cost: '',
    operator_name: '',
    remarks: '',
  });

  // Maintenance Form
  const [maintForm, setMaintForm] = useState({
    equipment_id: '',
    maintenance_date_bs: todayBS(),
    maintenance_type: 'repair',
    description: '',
    cost: '',
    vendor_party_id: '',
    account_id: '',
    payment_mode: 'cash',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [eRes, uRes, pRes, pyRes, aRes] = await Promise.all([
        equipmentAPI.getAll(),
        equipmentAPI.getUsage(),
        projectsAPI.getAll({ status: 'active' }),
        partiesAPI.getAll(),
        accountsAPI.getAll()
      ]);

      if (eRes.data.success) setEquipmentList(eRes.data.data || []);
      if (uRes.data.success) setUsageLogs(uRes.data.data || []);
      if (pRes.data.success) setProjects(pRes.data.data || []);
      if (pyRes.data.success) setParties(pyRes.data.data || []);
      if (aRes.data.success) {
        const a = aRes.data.data || [];
        setAccounts(a);
        if (a.length > 0) setMaintForm(prev => ({ ...prev, account_id: a[0].id }));
      }
    } catch (err) {
      toast.error('Failed to load equipment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateEq = async (e) => {
    e.preventDefault();
    if (!eqForm.equipment_name) return toast.error('Equipment name is required');
    try {
      setSubmitting(true);
      const res = await equipmentAPI.create({
        ...eqForm,
        daily_hire_rate: parseFloat(eqForm.daily_hire_rate || 0),
        hourly_hire_rate: parseFloat(eqForm.hourly_hire_rate || 0),
      });
      if (res.data.success) {
        toast.success(`Equipment ${eqForm.equipment_name} registered!`);
        setIsEqModalOpen(false);
        loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add equipment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogUsage = async (e) => {
    e.preventDefault();
    if (!usageForm.equipment_id || !usageForm.project_id) {
      return toast.error('Equipment and site project are required');
    }
    try {
      setSubmitting(true);
      const res = await equipmentAPI.logUsage({
        ...usageForm,
        hours_used: parseFloat(usageForm.hours_used || 0),
        days_used: parseFloat(usageForm.days_used || 0),
        fuel_consumed_ltr: parseFloat(usageForm.fuel_consumed_ltr || 0),
        hire_cost: parseFloat(usageForm.hire_cost || 0),
      });
      if (res.data.success) {
        toast.success('Equipment run & fuel log saved!');
        setIsUsageModalOpen(false);
        loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to log usage');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogMaint = async (e) => {
    e.preventDefault();
    if (!maintForm.equipment_id || !maintForm.cost) {
      return toast.error('Equipment and repair cost are required');
    }
    try {
      setSubmitting(true);
      const res = await equipmentAPI.logMaintenance({
        ...maintForm,
        cost: parseFloat(maintForm.cost || 0),
      });
      if (res.data.success) {
        toast.success('Maintenance logged & repair voucher recorded!');
        setIsMaintModalOpen(false);
        loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to log maintenance');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-850 tracking-tight">Equipment, Machinery & Repairs</h2>
          <p className="text-xs text-slate-500">Track owned & hired JCBs, mixers, rollers, diesel consumption, and machine repairs</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsMaintModalOpen(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            + Machine Repair Cost
          </button>
          <button
            onClick={() => setIsUsageModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            Log Machine Hours / Fuel
          </button>
          <button
            onClick={() => setIsEqModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Machinery</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 flex px-6 space-x-6">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-3.5 text-xs font-bold border-b-2 transition ${
              activeTab === 'inventory' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Equipment Inventory ({equipmentList.length})
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`py-3.5 text-xs font-bold border-b-2 transition ${
              activeTab === 'usage' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Daily Run Hours & Fuel Log ({usageLogs.length})
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <Loader text="Loading machinery database..." />
          ) : activeTab === 'inventory' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipmentList.map((eq) => (
                <div key={eq.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      {eq.equipment_code}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      eq.equipment_type === 'owned' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {eq.equipment_type === 'owned' ? 'Company Owned' : 'On Lease / Hired'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-slate-900">{eq.equipment_name}</h4>
                    <p className="text-slate-500 text-[11px]">{eq.category} {eq.model ? `• ${eq.model}` : ''}</p>
                  </div>

                  <div className="py-2 border-y border-slate-200/60 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Current Site:</span>
                      <span className="font-semibold text-slate-800">{eq.current_project_name || 'Yard / Available'}</span>
                    </div>
                    {eq.registration_no && (
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-500">Plate / Reg:</span>
                        <span className="font-bold text-slate-700">{eq.registration_no}</span>
                      </div>
                    )}
                    {eq.equipment_type === 'hired' && (
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-500">Hire Rate:</span>
                        <span className="font-bold text-slate-900">{formatNPR(eq.daily_hire_rate)}/day</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                    <th className="py-3 px-4">Date (BS)</th>
                    <th className="py-3 px-4">Equipment</th>
                    <th className="py-3 px-4">Project Site</th>
                    <th className="py-3 px-4 text-center">Run Hours</th>
                    <th className="py-3 px-4 text-center">Diesel (Ltr)</th>
                    <th className="py-3 px-4 text-right">Hire Cost</th>
                    <th className="py-3 px-4">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usageLogs.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono text-slate-600">{u.usage_date_bs}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{u.equipment_name}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{u.project_name}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-blue-600">{u.hours_used} hrs</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-amber-600">{u.fuel_consumed_ltr || '—'} L</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                        {u.hire_cost > 0 ? formatNPR(u.hire_cost) : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{u.operator_name || '—'}</td>
                    </tr>
                  ))}
                  {usageLogs.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400">
                        No equipment logs recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Equipment Modal */}
      <Modal
        isOpen={isEqModalOpen}
        onClose={() => setIsEqModalOpen(false)}
        title="Add Machine or Equipment"
        size="md"
      >
        <form onSubmit={handleCreateEq} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Equipment Name *</label>
            <input
              type="text"
              required
              value={eqForm.equipment_name}
              onChange={(e) => setEqForm({ ...eqForm, equipment_name: e.target.value })}
              placeholder="e.g. JCB 3DX Excavator, Concrete Mixer 1 Bag"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Ownership Type</label>
              <select
                value={eqForm.equipment_type}
                onChange={(e) => setEqForm({ ...eqForm, equipment_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="owned">Owned by RP Builders</option>
                <option value="hired">Hired / Leased from Outside</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Machinery Category</label>
              <input
                type="text"
                value={eqForm.category}
                onChange={(e) => setEqForm({ ...eqForm, category: e.target.value })}
                placeholder="Excavator, Mixer, Crane, Roller"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Registration / Plate No.</label>
              <input
                type="text"
                value={eqForm.registration_no}
                onChange={(e) => setEqForm({ ...eqForm, registration_no: e.target.value })}
                placeholder="Ba 2 Ka 1234"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Daily Hire Rate (if hired)</label>
              <input
                type="number"
                value={eqForm.daily_hire_rate}
                onChange={(e) => setEqForm({ ...eqForm, daily_hire_rate: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEqModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl"
            >
              Save Equipment
            </button>
          </div>
        </form>
      </Modal>

      {/* Usage Log Modal */}
      <Modal
        isOpen={isUsageModalOpen}
        onClose={() => setIsUsageModalOpen(false)}
        title="Log Machinery Operation & Diesel Usage"
        size="md"
      >
        <form onSubmit={handleLogUsage} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Machinery *</label>
            <select
              required
              value={usageForm.equipment_id}
              onChange={(e) => setUsageForm({ ...usageForm, equipment_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
            >
              <option value="">-- Select Machine --</option>
              {equipmentList.map((eq) => (
                <option key={eq.id} value={eq.id}>{eq.equipment_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Project Site Location *</label>
            <select
              required
              value={usageForm.project_id}
              onChange={(e) => setUsageForm({ ...usageForm, project_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
            >
              <option value="">-- Select Project Site --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.project_name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Date (BS) *</label>
              <input
                type="text"
                required
                value={usageForm.usage_date_bs}
                onChange={(e) => setUsageForm({ ...usageForm, usage_date_bs: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Operating Hours</label>
              <input
                type="number"
                step="any"
                value={usageForm.hours_used}
                onChange={(e) => setUsageForm({ ...usageForm, hours_used: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Fuel Consumed (Liters)</label>
              <input
                type="number"
                step="any"
                value={usageForm.fuel_consumed_ltr}
                onChange={(e) => setUsageForm({ ...usageForm, fuel_consumed_ltr: e.target.value })}
                placeholder="Diesel in Ltrs"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Operator Name</label>
              <input
                type="text"
                value={usageForm.operator_name}
                onChange={(e) => setUsageForm({ ...usageForm, operator_name: e.target.value })}
                placeholder="Driver / Operator"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsUsageModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-md transition"
            >
              Save Log
            </button>
          </div>
        </form>
      </Modal>

      {/* Maintenance Cost Modal */}
      <Modal
        isOpen={isMaintModalOpen}
        onClose={() => setIsMaintModalOpen(false)}
        title="Record Equipment Repair & Spare Parts Cost"
        size="md"
      >
        <form onSubmit={handleLogMaint} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Repaired Machine *</label>
            <select
              required
              value={maintForm.equipment_id}
              onChange={(e) => setMaintForm({ ...maintForm, equipment_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
            >
              <option value="">-- Select Machine --</option>
              {equipmentList.map((eq) => (
                <option key={eq.id} value={eq.id}>{eq.equipment_name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Date (BS) *</label>
              <input
                type="text"
                required
                value={maintForm.maintenance_date_bs}
                onChange={(e) => setMaintForm({ ...maintForm, maintenance_date_bs: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Repair Cost (NPR) *</label>
              <input
                type="number"
                step="any"
                required
                value={maintForm.cost}
                onChange={(e) => setMaintForm({ ...maintForm, cost: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Paid From Account *</label>
              <select
                required
                value={maintForm.account_id}
                onChange={(e) => setMaintForm({ ...maintForm, account_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.account_name} ({formatNPR(a.current_balance)})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Repair Workshop / Vendor</label>
              <select
                value={maintForm.vendor_party_id}
                onChange={(e) => setMaintForm({ ...maintForm, vendor_party_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="">-- Direct Workshop / Cash --</option>
                {parties.map((py) => (
                  <option key={py.id} value={py.id}>{py.party_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Repair Work Details (के मर्मत गरियो?)</label>
            <input
              type="text"
              required
              value={maintForm.description}
              onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })}
              placeholder="e.g. Hydraulic hose replacement, engine oil change, mixer bearing fix"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsMaintModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              {submitting ? 'Recording...' : 'Record Repair & Voucher'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
