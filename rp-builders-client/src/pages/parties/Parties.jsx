import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Plus, Search, Filter, ArrowRight,
  Phone, MapPin, Building, CreditCard, FileText
} from 'lucide-react';
import { partiesAPI } from '../../services/api';
import { formatNPR, PARTY_TYPES } from '../../utils/helpers';
import Modal from '../../components/ui/Modal';
import Loader from '../../components/ui/Loader';
import SearchInput from '../../components/ui/SearchInput';
import toast from 'react-hot-toast';

export default function Parties() {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    party_name: '',
    party_name_np: '',
    party_type: 'thekedar',
    phone: '',
    secondary_phone: '',
    email: '',
    address: '',
    district: '',
    pan_no: '',
    vat_no: '',
    bank_name: '',
    bank_account_no: '',
    bank_branch: '',
    opening_balance: '',
    notes: '',
  });

  const loadParties = async () => {
    try {
      setLoading(true);
      const res = await partiesAPI.getAll({ search, type: typeFilter });
      if (res.data.success) {
        setParties(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load parties directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParties();
  }, [search, typeFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.party_name || !form.party_type) {
      return toast.error('Party name and type are required');
    }

    try {
      setSubmitting(true);
      const res = await partiesAPI.create({
        ...form,
        opening_balance: parseFloat(form.opening_balance || 0),
      });

      if (res.data.success) {
        toast.success(`Party ${form.party_name} added successfully!`);
        setIsModalOpen(false);
        loadParties();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add party');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-850 tracking-tight">Parties, Suppliers & Thekedar</h2>
          <p className="text-xs text-slate-500">Central master directory of all vendors, contractors, and individuals</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Party</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search party name, code, phone, PAN..."
        />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
        >
          <option value="">All Party Types</option>
          {Object.entries(PARTY_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Parties Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <Loader text="Loading directory of parties..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Party Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Phone / Contact</th>
                  <th className="py-3 px-4">PAN No</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4 text-right">Net Ledger Balance</th>
                  <th className="py-3 px-4 text-center">Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parties.map((p) => {
                  const bal = parseFloat(p.current_balance || 0);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{p.party_code}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{p.party_name}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 capitalize">
                          {p.party_type?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{p.phone || '—'}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{p.pan_no || '—'}</td>
                      <td className="py-3 px-4 text-slate-500">{p.address || p.district || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatNPR(bal)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link
                          to={`/parties/${p.id}/ledger`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold text-[11px] transition"
                        >
                          <span>Statement</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {parties.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      No parties registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Party Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register New Party / Supplier / Thekedar"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Party / Person Name *</label>
              <input
                type="text"
                required
                value={form.party_name}
                onChange={(e) => setForm({ ...form, party_name: e.target.value })}
                placeholder="e.g. Kathmandu Steels, Ram Bahadur Mistri"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Party Category / Type *</label>
              <select
                value={form.party_type}
                onChange={(e) => setForm({ ...form, party_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white capitalize"
              >
                {Object.entries(PARTY_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mobile / Phone Number</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="98xxxxxxxx"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">PAN Number (for TDS)</label>
              <input
                type="text"
                value={form.pan_no}
                onChange={(e) => setForm({ ...form, pan_no: e.target.value })}
                placeholder="9 digit PAN"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name</label>
              <input
                type="text"
                value={form.bank_name}
                onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                placeholder="e.g. Nabil Bank, Global IME"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bank Account Number</label>
              <input
                type="text"
                value={form.bank_account_no}
                onChange={(e) => setForm({ ...form, bank_account_no: e.target.value })}
                placeholder="Account number"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Opening Balance (NPR)</label>
              <input
                type="number"
                value={form.opening_balance}
                onChange={(e) => setForm({ ...form, opening_balance: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">District / City</label>
              <input
                type="text"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                placeholder="e.g. Kathmandu"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Address / Notes</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Address notes"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Register Party'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
