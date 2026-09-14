import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Plus, DollarSign, ArrowRight, UserCheck,
  Phone, Briefcase, CreditCard
} from 'lucide-react';
import { employeesAPI, accountsAPI } from '../../services/api';
import { formatNPR } from '../../utils/helpers';
import { todayBS } from '../../utils/nepaliDate';
import Modal from '../../components/ui/Modal';
import Loader from '../../components/ui/Loader';
import toast from 'react-hot-toast';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Employee Form
  const [empForm, setEmpForm] = useState({
    name: '',
    name_np: '',
    designation: 'Site Engineer',
    department: 'Operations',
    phone: '',
    address: '',
    monthly_salary: '',
    daily_rate: '',
    bank_name: '',
    bank_account: '',
    pan_no: '',
  });

  // Salary payment form
  const [payForm, setPayForm] = useState({
    payment_month_bs: todayBS().substring(0, 7),
    gross_salary: '',
    deductions: '0',
    account_id: '',
    payment_mode: 'cash',
    remarks: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [eRes, aRes] = await Promise.all([
        employeesAPI.getAll(),
        accountsAPI.getAll()
      ]);

      if (eRes.data.success) setEmployees(eRes.data.data || []);
      if (aRes.data.success) {
        const a = aRes.data.data || [];
        setAccounts(a);
        if (a.length > 0) setPayForm(prev => ({ ...prev, account_id: a[0].id }));
      }
    } catch (err) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateEmp = async (e) => {
    e.preventDefault();
    if (!empForm.name) return toast.error('Employee name is required');

    try {
      setSubmitting(true);
      const res = await employeesAPI.create({
        ...empForm,
        monthly_salary: parseFloat(empForm.monthly_salary || 0),
        daily_rate: parseFloat(empForm.daily_rate || 0),
      });

      if (res.data.success) {
        toast.success(`Employee ${empForm.name} registered!`);
        setIsEmpModalOpen(false);
        loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add employee');
    } finally {
      setSubmitting(false);
    }
  };

  const openSalaryModal = (emp) => {
    setSelectedEmp(emp);
    setPayForm(prev => ({
      ...prev,
      gross_salary: String(emp.monthly_salary || ''),
      deductions: '0',
      remarks: `Monthly Salary for ${prev.payment_month_bs}`,
    }));
    setIsPayModalOpen(true);
  };

  const handlePaySalary = async (e) => {
    e.preventDefault();
    if (!payForm.gross_salary || !payForm.account_id) {
      return toast.error('Salary amount and paid account required');
    }

    try {
      setSubmitting(true);
      const res = await employeesAPI.paySalary({
        employee_id: selectedEmp.id,
        payment_month_bs: payForm.payment_month_bs,
        gross_salary: parseFloat(payForm.gross_salary),
        deductions: parseFloat(payForm.deductions || 0),
        account_id: payForm.account_id,
        payment_mode: payForm.payment_mode,
        remarks: payForm.remarks,
      });

      if (res.data.success) {
        toast.success(res.data.message);
        setIsPayModalOpen(false);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Salary processing failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-850 tracking-tight">Employees & Staff Payroll</h2>
          <p className="text-xs text-slate-500">Manage permanent site engineers, supervisors, office staff and disburse salaries</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/labour"
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition"
          >
            Daily Labour Wages
          </Link>
          <button
            onClick={() => setIsEmpModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <Loader text="Loading staff records..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                  <th className="py-3 px-4">Emp Code</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4 text-right">Monthly Salary</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{e.emp_code}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{e.name}</td>
                    <td className="py-3 px-4 text-slate-700">{e.designation || '—'}</td>
                    <td className="py-3 px-4 text-slate-500">{e.department || '—'}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{e.phone || '—'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatNPR(e.monthly_salary)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        e.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {e.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => openSalaryModal(e)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition"
                      >
                        Pay Salary
                      </button>
                    </td>
                  </tr>
                ))}

                {employees.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      No employees registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      <Modal
        isOpen={isEmpModalOpen}
        onClose={() => setIsEmpModalOpen(false)}
        title="Register New Employee / Staff Member"
        size="lg"
      >
        <form onSubmit={handleCreateEmp} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Full Name (English) *</label>
              <input
                type="text"
                required
                value={empForm.name}
                onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                placeholder="e.g. Ramesh Thapa"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Full Name (Nepali)</label>
              <input
                type="text"
                value={empForm.name_np}
                onChange={(e) => setEmpForm({ ...empForm, name_np: e.target.value })}
                placeholder="e.g. रमेश थापा"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Designation</label>
              <input
                type="text"
                value={empForm.designation}
                onChange={(e) => setEmpForm({ ...empForm, designation: e.target.value })}
                placeholder="Site Engineer, Supervisor, Accountant, Driver"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={empForm.department}
                onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                placeholder="Site Management, Accounts, Administration"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Mobile / Phone</label>
              <input
                type="text"
                value={empForm.phone}
                onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                placeholder="98xxxxxxxx"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Monthly Salary (NPR)</label>
              <input
                type="number"
                value={empForm.monthly_salary}
                onChange={(e) => setEmpForm({ ...empForm, monthly_salary: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Bank Name</label>
              <input
                type="text"
                value={empForm.bank_name}
                onChange={(e) => setEmpForm({ ...empForm, bank_name: e.target.value })}
                placeholder="e.g. NIC Asia Bank"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Bank Account No.</label>
              <input
                type="text"
                value={empForm.bank_account}
                onChange={(e) => setEmpForm({ ...empForm, bank_account: e.target.value })}
                placeholder="Account number"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEmpModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              Save Employee
            </button>
          </div>
        </form>
      </Modal>

      {/* Pay Salary Modal */}
      {selectedEmp && (
        <Modal
          isOpen={isPayModalOpen}
          onClose={() => setIsPayModalOpen(false)}
          title={`Disburse Staff Salary — ${selectedEmp.name} (${selectedEmp.emp_code})`}
          size="md"
        >
          <form onSubmit={handlePaySalary} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Salary Month (BS YYYY-MM) *</label>
                <input
                  type="text"
                  required
                  value={payForm.payment_month_bs}
                  onChange={(e) => setPayForm({ ...payForm, payment_month_bs: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Gross Salary (NPR) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={payForm.gross_salary}
                  onChange={(e) => setPayForm({ ...payForm, gross_salary: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Deductions / Advance</label>
                <input
                  type="number"
                  value={payForm.deductions}
                  onChange={(e) => setPayForm({ ...payForm, deductions: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Paid From Account *</label>
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

            <div>
              <label className="block font-bold text-slate-700 mb-1">Remarks / Note</label>
              <input
                type="text"
                value={payForm.remarks}
                onChange={(e) => setPayForm({ ...payForm, remarks: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
              <span className="font-bold text-emerald-900">Net Salary Paid:</span>
              <span className="font-mono font-black text-emerald-950 text-base">
                {formatNPR(parseFloat(payForm.gross_salary || 0) - parseFloat(payForm.deductions || 0))}
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
                {submitting ? 'Processing...' : 'Disburse & Create Salary Voucher'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
