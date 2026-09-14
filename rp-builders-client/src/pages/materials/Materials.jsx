import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Plus, Search, Filter, ShoppingCart,
  ArrowRight, Layers, FileText, CheckCircle2
} from 'lucide-react';
import { materialsAPI, projectsAPI, partiesAPI, accountsAPI } from '../../services/api';
import { formatNPR } from '../../utils/helpers';
import { todayBS } from '../../utils/nepaliDate';
import Modal from '../../components/ui/Modal';
import Loader from '../../components/ui/Loader';
import SearchInput from '../../components/ui/SearchInput';
import toast from 'react-hot-toast';

export default function Materials() {
  const [activeTab, setActiveTab] = useState('purchases');
  const [materials, setMaterials] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [projects, setProjects] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Purchase Form
  const [purchaseForm, setPurchaseForm] = useState({
    project_id: '',
    material_id: '',
    supplier_id: '',
    purchase_date_bs: todayBS(),
    quantity: '',
    unit_rate: '',
    bill_no: '',
    account_id: '',
    payment_mode: 'cash',
    remarks: '',
  });

  // Usage Form
  const [usageForm, setUsageForm] = useState({
    project_id: '',
    material_id: '',
    usage_date_bs: todayBS(),
    quantity_used: '',
    purpose: '',
  });

  // Material item form
  const [itemForm, setItemForm] = useState({
    material_name: '',
    material_name_np: '',
    unit: 'bag',
    category_code: 'SCM-CEM',
    notes: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [mRes, pRes, projRes, pyRes, accRes] = await Promise.all([
        materialsAPI.getAll(),
        materialsAPI.getPurchases(),
        projectsAPI.getAll({ status: 'active' }),
        partiesAPI.getAll({ type: 'supplier' }),
        accountsAPI.getAll()
      ]);

      if (mRes.data.success) setMaterials(mRes.data.data || []);
      if (pRes.data.success) setPurchases(pRes.data.data || []);
      if (projRes.data.success) setProjects(projRes.data.data || []);
      if (pyRes.data.success) setSuppliers(pyRes.data.data || []);
      if (accRes.data.success) {
        const a = accRes.data.data || [];
        setAccounts(a);
        if (a.length > 0) setPurchaseForm(prev => ({ ...prev, account_id: a[0].id }));
      }
    } catch (err) {
      toast.error('Failed to load materials data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (!purchaseForm.project_id || !purchaseForm.material_id || !purchaseForm.quantity || !purchaseForm.unit_rate) {
      return toast.error('Project, material, quantity, and unit rate are required');
    }

    try {
      setSubmitting(true);
      const res = await materialsAPI.addPurchase({
        ...purchaseForm,
        quantity: parseFloat(purchaseForm.quantity),
        unit_rate: parseFloat(purchaseForm.unit_rate),
      });

      if (res.data.success) {
        toast.success('Material purchase logged & payment voucher recorded!');
        setIsPurchaseModalOpen(false);
        loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record purchase');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUsage = async (e) => {
    e.preventDefault();
    if (!usageForm.project_id || !usageForm.material_id || !usageForm.quantity_used) {
      return toast.error('Project, material, and quantity are required');
    }

    try {
      setSubmitting(true);
      const res = await materialsAPI.addUsage({
        ...usageForm,
        quantity_used: parseFloat(usageForm.quantity_used),
      });

      if (res.data.success) {
        toast.success('Material site consumption recorded!');
        setIsUsageModalOpen(false);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record usage');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (!itemForm.material_name) return toast.error('Material name required');
    try {
      setSubmitting(true);
      const res = await materialsAPI.create(itemForm);
      if (res.data.success) {
        toast.success(`Material item ${itemForm.material_name} registered!`);
        setIsItemModalOpen(false);
        loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add item');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-850 tracking-tight">Construction Materials & Purchases</h2>
          <p className="text-xs text-slate-500">Procure cement, steel rods, sand, aggregates, bricks, and log usage</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/materials/stock"
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition"
          >
            Check Stock Balance
          </Link>
          <button
            onClick={() => setIsUsageModalOpen(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            Log Site Consumption
          </button>
          <button
            onClick={() => setIsPurchaseModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Material Purchase</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 flex px-6 space-x-6">
          <button
            onClick={() => setActiveTab('purchases')}
            className={`py-3.5 text-xs font-bold border-b-2 transition ${
              activeTab === 'purchases' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Purchase Orders & Deliveries ({purchases.length})
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`py-3.5 text-xs font-bold border-b-2 transition ${
              activeTab === 'items' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Materials Master Catalog ({materials.length})
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <Loader text="Loading materials and purchases..." />
          ) : activeTab === 'purchases' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                    <th className="py-3 px-4">Date (BS)</th>
                    <th className="py-3 px-4">Project Site</th>
                    <th className="py-3 px-4">Material Item</th>
                    <th className="py-3 px-4">Supplier / Vendor</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4 text-right">Unit Rate</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-center">Voucher Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono text-slate-600">{p.purchase_date_bs}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{p.project_name}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{p.material_name}</td>
                      <td className="py-3 px-4 text-slate-700">{p.supplier_name || 'Direct Shop'}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        {p.quantity} {p.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatNPR(p.unit_rate)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                        {formatNPR(p.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-xs text-blue-600">
                        {p.voucher_no || '—'}
                      </td>
                    </tr>
                  ))}
                  {purchases.length === 0 && (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-400">
                        No material purchases recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => setIsItemModalOpen(true)}
                  className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold"
                >
                  + Add Catalog Material
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {materials.map((m) => (
                  <div key={m.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-bold text-slate-900">{m.material_name}</h4>
                      <p className="text-[11px] text-slate-500">{m.material_name_np || '—'}</p>
                    </div>
                    <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 uppercase">
                      Unit: {m.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Record Purchase Modal */}
      <Modal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        title="Record Site Material Purchase & Delivery"
        size="lg"
      >
        <form onSubmit={handlePurchase} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Destination Project Site *</label>
              <select
                required
                value={purchaseForm.project_id}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, project_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="">-- Select Project Site --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.project_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Material Item *</label>
              <select
                required
                value={purchaseForm.material_id}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, material_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="">-- Select Material --</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.material_name} ({m.unit})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Supplier / Dealer</label>
              <select
                value={purchaseForm.supplier_id}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="">-- Cash / Direct Local Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.party_name} ({s.phone})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Purchase Date (BS) *</label>
              <input
                type="text"
                required
                value={purchaseForm.purchase_date_bs}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_date_bs: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Delivered Quantity *</label>
              <input
                type="number"
                step="any"
                required
                value={purchaseForm.quantity}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                placeholder="e.g. 50"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Unit Rate (NPR) *</label>
              <input
                type="number"
                step="any"
                required
                value={purchaseForm.unit_rate}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, unit_rate: e.target.value })}
                placeholder="e.g. 750.00"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Paid From Account</label>
              <select
                required
                value={purchaseForm.account_id}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, account_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.account_name} ({formatNPR(a.current_balance)})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Bill / Challan No.</label>
              <input
                type="text"
                value={purchaseForm.bill_no}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, bill_no: e.target.value })}
                placeholder="Challan / Tax invoice number"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>
          </div>

          {/* Amount Calculation */}
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
            <span className="font-bold text-blue-900">Total Purchase Amount:</span>
            <span className="font-mono font-black text-blue-950 text-base">
              {formatNPR(parseFloat(purchaseForm.quantity || 0) * parseFloat(purchaseForm.unit_rate || 0))}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPurchaseModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Record Purchase & Voucher'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Log Usage Modal */}
      <Modal
        isOpen={isUsageModalOpen}
        onClose={() => setIsUsageModalOpen(false)}
        title="Log Material Consumption on Site"
        size="md"
      >
        <form onSubmit={handleUsage} className="space-y-4 text-xs">
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

          <div>
            <label className="block font-bold text-slate-700 mb-1">Material Item Consumed *</label>
            <select
              required
              value={usageForm.material_id}
              onChange={(e) => setUsageForm({ ...usageForm, material_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
            >
              <option value="">-- Select Material --</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>{m.material_name} ({m.unit})</option>
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
              <label className="block font-bold text-slate-700 mb-1">Quantity Used *</label>
              <input
                type="number"
                step="any"
                required
                value={usageForm.quantity_used}
                onChange={(e) => setUsageForm({ ...usageForm, quantity_used: e.target.value })}
                placeholder="Quantity"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Purpose / Structure Area</label>
            <input
              type="text"
              value={usageForm.purpose}
              onChange={(e) => setUsageForm({ ...usageForm, purpose: e.target.value })}
              placeholder="e.g. Ground floor slab casting, boundary wall brickwork"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl"
            />
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
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              {submitting ? 'Logging...' : 'Log Site Consumption'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title="Add Material to Master Catalog"
        size="md"
      >
        <form onSubmit={handleCreateItem} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Material Name (English) *</label>
            <input
              type="text"
              required
              value={itemForm.material_name}
              onChange={(e) => setItemForm({ ...itemForm, material_name: e.target.value })}
              placeholder="e.g. Waterproofing Chemical, Tile Adhesive"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Material Name (Nepali)</label>
            <input
              type="text"
              value={itemForm.material_name_np}
              onChange={(e) => setItemForm({ ...itemForm, material_name_np: e.target.value })}
              placeholder="e.g. वाटरप्रुफिङ केमिकल"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Unit of Measurement *</label>
            <select
              value={itemForm.unit}
              onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white uppercase"
            >
              <option value="bag">Bag (बोरा)</option>
              <option value="kg">Kg</option>
              <option value="ton">Ton</option>
              <option value="cft">CFT (घन फिट)</option>
              <option value="cum">CUM (घन मिटर)</option>
              <option value="nos">Nos (थान)</option>
              <option value="ltr">Liter</option>
              <option value="sheet">Sheet</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsItemModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl"
            >
              Register Material
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
