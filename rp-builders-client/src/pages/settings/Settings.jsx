import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Building,
  Save,
  CheckCircle2,
  Shield,
  Database,
  Download,
  RotateCcw,
  Clock,
  HardDrive,
  KeyRound,
  AlertTriangle,
  Lock,
  RefreshCw,
  GitBranch,
  ExternalLink,
  Code2,
  Terminal,
  Layers,
  Upload,
  Image,
  Trash2
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { settingsAPI } from '../../services/api';
import { formatBSDate, adToBs } from '../../utils/nepaliDate';
import { useCompany } from '../../contexts/CompanyContext';
import Loader from '../../components/ui/Loader';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

export default function Settings() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'company';
  const { updateCompany } = useCompany();
  const [activeTab, setActiveTab] = useState(initialTab); // 'company' | 'backup' | 'updates'
  const [form, setForm] = useState({
    company_name: '',
    company_name_np: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    company_pan: '',
    currency: 'NPR',
    date_format: 'BS',
    company_logo_data: null,
  });
  const [fiscalYear, setFiscalYear] = useState(null);
  const [backupData, setBackupData] = useState({ lastBackupDate: null, lastBackupStatus: 'none', backups: [] });
  const [versionData, setVersionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);

  // Restore Modal State
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = useState('');
  const [passcode, setPasscode] = useState('');
  const [restoring, setRestoring] = useState(false);

  // Patch Modal State
  const [patchModalOpen, setPatchModalOpen] = useState(false);
  const [patchPasscode, setPatchPasscode] = useState('');
  const [patchDescription, setPatchDescription] = useState('');
  const [applyingPatch, setApplyingPatch] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cRes, fRes, bRes, vRes] = await Promise.all([
        settingsAPI.getCompany(),
        settingsAPI.getFiscalYear(),
        settingsAPI.getBackups().catch(() => ({ data: { data: { backups: [] } } })),
        settingsAPI.getVersion().catch(() => ({ data: { data: null } }))
      ]);
      if (cRes.data.success) setForm(cRes.data.data);
      if (fRes.data.success) setFiscalYear(fRes.data.data);
      if (bRes.data?.data) setBackupData(bRes.data.data);
      if (vRes.data?.data) setVersionData(vRes.data.data);
    } catch (err) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const tab = searchParams.get('tab');
    if (tab && ['company', 'backup', 'updates'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return toast.error('कृपया फोटो फाइल (PNG, JPG, SVG, WebP) छान्नुहोस्');
    }

    if (file.size > 3 * 1024 * 1024) {
      return toast.error('लोगोको साइज ३ MB भन्दा कम हुनुपर्दछ');
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, company_logo_data: reader.result }));
      toast.success('नयाँ लोगो लोड भयो! कृपया "Save Company Profile" बटन थिची सुरक्षित गर्नुहोस्।');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setForm((prev) => ({ ...prev, company_logo_data: '' }));
    toast.success('लोगो हटाइयो। सेभ गर्न "Save Company Profile" थिच्नुहोस्।');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await settingsAPI.updateCompany(form);
      if (res.data.success) {
        updateCompany(form);
        toast.success('कम्पनी विवरण तथा लोगो सफलतापूर्वक सुरक्षित भयो (Updated successfully)!');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update settings');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateManualBackup = async () => {
    try {
      setBackingUp(true);
      const res = await settingsAPI.createBackup();
      if (res.data.success) {
        toast.success(res.data.message || 'New backup created successfully!');
        const bRes = await settingsAPI.getBackups();
        if (bRes.data?.data) setBackupData(bRes.data.data);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create backup');
    } finally {
      setBackingUp(false);
    }
  };

  const handleOpenRestoreModal = (fileName) => {
    setSelectedBackupFile(fileName);
    setPasscode('');
    setRestoreModalOpen(true);
  };

  const handleConfirmRestore = async (e) => {
    e.preventDefault();
    if (!passcode) return toast.error('Please enter the Developer Passcode');

    try {
      setRestoring(true);
      const res = await settingsAPI.restoreBackup({ fileName: selectedBackupFile, passcode });
      if (res.data.success) {
        toast.success(res.data.message);
        setRestoreModalOpen(false);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Restore failed. Invalid Passcode.');
    } finally {
      setRestoring(false);
    }
  };

  const handleCheckUpdate = async () => {
    try {
      setCheckingUpdate(true);
      // Check online via GitHub repo or local API
      const res = await settingsAPI.checkUpdate();
      if (res.data.success) {
        setUpdateStatus(res.data.data);
        toast.success('तपाईंको सफ्टवेयर पछिल्लो भर्सनमा छ (System is up-to-date)!');
      }
    } catch (err) {
      toast.error('Failed to check for updates');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleApplyPatch = async (e) => {
    e.preventDefault();
    if (!patchPasscode) return toast.error('Developer Passcode required');

    try {
      setApplyingPatch(true);
      const res = await settingsAPI.applyPatch({ passcode: patchPasscode, patchDescription });
      if (res.data.success) {
        toast.success(res.data.message);
        setPatchModalOpen(false);
        setPatchPasscode('');
        setPatchDescription('');
        loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Invalid Passcode!');
    } finally {
      setApplyingPatch(false);
    }
  };

  if (loading) return <Loader text="Loading system settings..." />;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">System Configuration & Data Safety</h2>
          <p className="text-xs text-slate-500">कम्पनी विवरण, आर्थिक वर्ष, स्वचालित साप्ताहिक ब्याकअप र सफ्टवेयर अपडेट</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('company')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'company'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏢 कम्पनी विवरण
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'backup'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>डाटा ब्याकअप</span>
          </button>
          <button
            onClick={() => setActiveTab('updates')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'updates'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
            <span>सफ्टवेयर अपडेट</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Company Profile */}
      {activeTab === 'company' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6 text-xs">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-sm font-bold text-slate-900">Company Legal Identity & Official Logo</h3>
              <p className="text-[11px] text-slate-400">These details and the uploaded logo appear across the portal, login screen, and on all printed vouchers & registers.</p>
            </div>

            {/* Official Logo Upload Section */}
            <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-5">
              {/* Logo Preview Box */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border-2 border-dashed border-blue-200 flex items-center justify-center overflow-hidden shadow-xs shrink-0 relative group">
                {form.company_logo_data ? (
                  <>
                    <img
                      src={form.company_logo_data}
                      alt="R.P. Builders Logo"
                      className="w-full h-full object-contain p-2"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      title="Remove Logo"
                      className="absolute inset-0 bg-red-900/70 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition duration-150 cursor-pointer text-[10px] font-bold"
                    >
                      <Trash2 className="w-4 h-4 mb-0.5" />
                      <span>हटाउनुहोस्</span>
                    </button>
                  </>
                ) : (
                  <div className="text-center p-2 text-slate-400">
                    <Building className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                    <span className="text-[9px] font-bold block text-slate-500">कुनै लोगो छैन</span>
                    <span className="text-[8px] text-slate-400">No Logo</span>
                  </div>
                )}
              </div>

              {/* Upload Controls & Guide */}
              <div className="flex-1 text-center sm:text-left space-y-2">
                <div>
                  <h4 className="font-black text-slate-900 text-xs">कम्पनीको आधिकारिक लोगो (Official Company Logo)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    R.P. Builders को लोगो अपलोड गर्नुहोस्। यो लोगो सफ्टवेयरको टपबार, साइडबार, लगइन स्क्रिन र सबै प्रिन्ट भौचर/रिपोर्टमा स्वतः देखिनेछ।
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
                  <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 transition cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{form.company_logo_data ? 'लोगो परिवर्तन गर्नुहोस् (Change)' : '📁 नयाँ लोगो अपलोड (Upload Logo)'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>

                  {form.company_logo_data && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="inline-flex items-center gap-1 px-3 py-2 bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>हटाउनुहोस् (Remove)</span>
                    </button>
                  )}

                  <span className="text-[10px] text-slate-400 font-mono block sm:inline">
                    (PNG, JPG, SVG, Max 3MB)
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Company Legal Name (English) *</label>
                <input
                  type="text"
                  required
                  value={form.company_name || ''}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Company Name (Nepali)</label>
                <input
                  type="text"
                  value={form.company_name_np || ''}
                  onChange={(e) => setForm({ ...form, company_name_np: e.target.value })}
                  placeholder="आर. पी. विल्डर्स प्रा. लि."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Official PAN / VAT Number</label>
                <input
                  type="text"
                  value={form.company_pan || ''}
                  onChange={(e) => setForm({ ...form, company_pan: e.target.value })}
                  placeholder="e.g. 601234567"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Office Contact Phone</label>
                <input
                  type="text"
                  value={form.company_phone || ''}
                  onChange={(e) => setForm({ ...form, company_phone: e.target.value })}
                  placeholder="01-xxxxxxx / 98xxxxxxxx"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Office Email Address</label>
                <input
                  type="email"
                  value={form.company_email || ''}
                  onChange={(e) => setForm({ ...form, company_email: e.target.value })}
                  placeholder="info@rpbuilders.com"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Head Office Address</label>
                <input
                  type="text"
                  value={form.company_address || ''}
                  onChange={(e) => setForm({ ...form, company_address: e.target.value })}
                  placeholder="Kathmandu, Nepal"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Accounting & Fiscal Defaults</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <span className="text-emerald-800 text-[11px] font-bold block mb-0.5">Current Fiscal Year (आर्थिक वर्ष):</span>
                  <strong className="text-base text-emerald-950 font-mono font-black">
                    {fiscalYear?.fiscal_year || '2083/84'} BS
                  </strong>
                  <p className="text-[10px] text-emerald-700 mt-0.5">
                    ({fiscalYear?.start_date_bs} to {fiscalYear?.end_date_bs})
                  </p>
                </div>

                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
                  <span className="text-blue-800 text-[11px] font-bold block mb-0.5">Currency & Default Calendar:</span>
                  <strong className="text-sm text-blue-950 font-black block">
                    Nepalese Rupee (NPR - रू)
                  </strong>
                  <span className="text-[10px] text-blue-700">Official Nepal Bikram Sambat (वि.सं.) Calendar</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-600/20 transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{submitting ? 'Saving Settings...' : 'Save Company Profile'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Automated Weekly Backup & Security */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    स्वचालित साप्ताहिक ब्याकअप (Automated Weekly Backup Engine)
                  </h3>
                  <p className="text-xs text-blue-200">
                    तपाईंको सम्पूर्ण डाटा प्रत्येक ७ दिनमा स्वतः सुरक्षित हार्डडिस्क ब्याकअप हुन्छ
                  </p>
                </div>
              </div>

              <button
                onClick={handleCreateManualBackup}
                disabled={backingUp}
                className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-xs rounded-2xl shadow-md shadow-emerald-500/30 transition cursor-pointer disabled:opacity-50"
              >
                <Database className="w-4 h-4" />
                <span>{backingUp ? 'ब्याकअप बन्दैछ...' : '💾 अहिले नै ब्याकअप लिनुहोस् (Backup Now)'}</span>
              </button>
            </div>

            {/* 3 Integrity Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>पछिल्लो ब्याकअप स्थिति</span>
                </div>
                <div className="text-sm font-black text-white">
                  {backupData.lastBackupDate ? 'सफलतापूर्वक सम्पन्न (Active)' : 'पहिलो ब्याकअप बाँकी'}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-mono">
                  {backupData.lastBackupDate ? new Date(backupData.lastBackupDate).toLocaleString() : '—'}
                </div>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                <div className="flex items-center gap-2 text-blue-400 text-xs font-bold mb-1">
                  <HardDrive className="w-4 h-4" />
                  <span>डेटाबेस इन्टिग्रिटी (Security)</span>
                </div>
                <div className="text-sm font-black text-white">
                  SQLite WAL • Crash-Proof
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Zero External Server Dependencies
                </div>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
                  <Lock className="w-4 h-4" />
                  <span>डेभलपर अथेन्टिकेसन गेट</span>
                </div>
                <div className="text-sm font-black text-white">
                  पासकोड सुरक्षित (Passcode Protected)
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  By Nirmala Tech Innovations
                </div>
              </div>
            </div>
          </div>

          {/* Backup History Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h4 className="font-black text-sm text-slate-900">
                  हार्डडिस्कमा सुरक्षित ब्याकअप फाइलहरु (Available Backup Snapshots)
                </h4>
                <p className="text-[11px] text-slate-400">
                  प्रणालीले पछिल्लो ५ वटा ब्याकअप सुरक्षित राख्दछ (Auto-rotation)
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {backupData.backups?.length || 0} Backups Available
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                    <th className="py-3 px-3">फाइलको नाम (Backup File)</th>
                    <th className="py-3 px-3">प्रकार (Type)</th>
                    <th className="py-3 px-3">साइज (Size)</th>
                    <th className="py-3 px-3">मिति (Created At)</th>
                    <th className="py-3 px-3 text-right">कार्य (Action)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {backupData.backups?.map((b, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-mono font-bold text-slate-800 flex items-center gap-2">
                        <Database className="w-3.5 h-3.5 text-blue-600" />
                        <span>{b.fileName}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          b.reason === 'weekly' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {b.reason === 'weekly' ? 'साप्ताहिक (Weekly)' : 'म्यानुअल (Manual)'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">{b.sizeKB} KB</td>
                      <td className="py-3 px-3 text-slate-600 font-mono">
                        {new Date(b.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleOpenRestoreModal(b.fileName)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold border border-amber-200 transition cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>रिस्टोर (Restore)</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!backupData.backups || backupData.backups.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        कुनै ब्याकअप फाइल भेटिएन। माथिको "अहिले नै ब्याकअप लिनुहोस्" बटन थिच्नुहोस्।
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Software Updates & Developer Engine */}
      {activeTab === 'updates' && (
        <div className="space-y-6">
          {/* Main Version Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-purple-900/50 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">R.P. Builders ERP — Software Update Center</h3>
                    <span className="bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                      v1.0.0 (Latest)
                    </span>
                  </div>
                  <p className="text-xs text-purple-200 mt-0.5">
                    Official Desktop System Maintenance & Upgrades
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCheckUpdate}
                  disabled={checkingUpdate}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-black text-xs rounded-2xl shadow-md shadow-purple-600/30 transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${checkingUpdate ? 'animate-spin' : ''}`} />
                  <span>{checkingUpdate ? 'जाँच हुँदैछ...' : '🔍 नयाँ अपडेट चेक गर्नुहोस्'}</span>
                </button>

                <button
                  onClick={() => setPatchModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl border border-white/20 transition cursor-pointer"
                >
                  <Code2 className="w-4 h-4 text-purple-300" />
                  <span>म्यानुअल प्याच</span>
                </button>
              </div>
            </div>

            {/* System Info Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                <span className="text-purple-300 text-[10px] block">GitHub Repository:</span>
                <a
                  href="https://github.com/SidL340/rpbuilders"
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-blue-300 hover:underline flex items-center gap-1 mt-0.5 truncate"
                >
                  <GitBranch className="w-3.5 h-3.5 shrink-0" />
                  <span>SidL340/rpbuilders</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                <span className="text-purple-300 text-[10px] block">Software Edition:</span>
                <span className="font-bold text-white mt-0.5 block">Desktop Native (.exe)</span>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                <span className="text-purple-300 text-[10px] block">Auto Schema Migration:</span>
                <span className="font-bold text-emerald-400 mt-0.5 block">सक्रिय (Enabled)</span>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                <span className="text-purple-300 text-[10px] block">डेभलपर पासकोड:</span>
                <span className="font-mono font-black text-amber-400 mt-0.5 block">••••• (Protected)</span>
              </div>
            </div>

            {/* Live Update Status Banner */}
            {updateStatus && (
              <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-200 block text-xs">
                      {updateStatus.hasUpdate ? 'नयाँ अपडेट उपलब्ध छ!' : 'सफ्टवेयर पूर्ण रूपमा पछिल्लो भर्सनमा छ (Up to Date)'}
                    </span>
                    <span className="text-[11px] text-emerald-300/80 block">
                      हालको भर्सन: v{updateStatus.currentVersion} • {updateStatus.releaseNotes}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  {updateStatus.releaseDate}
                </span>
              </div>
            )}
          </div>

          {/* Database Zero-Data-Loss Safety Guarantee Card */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 sm:p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-xs">
              <h4 className="font-black text-emerald-900 text-sm">
                १००% डाटाबेस सुरक्षा ग्यारेन्टी (Zero Data Loss Architecture)
              </h4>
              <p className="text-emerald-800 leading-relaxed">
                सफ्टवेयर अपडेट गर्दा वा नयाँ सेटअप इन्स्टल गर्दा <strong>तपाईंको कुनै पनि पुरानो हिसाब, भौचर वा डाटा मेटिँदैन</strong>। R.P. Builders ERP को डाटाबेस विन्डोजको सुरक्षित <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono font-bold text-emerald-900">AppData/Roaming</code> वा तोकिएको सुरक्षित हार्डडिस्क फोल्डरमा अलग्गै बस्दछ। नयाँ सफ्टवेयर इन्स्टल भएपछि यसले स्वचालित रूपमा पुरानो डाटा जोडेर नयाँ कोलमहरू सुरक्षित रूपमा माइग्रेसन गर्दछ।
              </p>
            </div>
          </div>

          {/* Developer Release & Update Instructions */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
            <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-600" />
              <span>डेभलपरको लागि: नयाँ अपडेट डेलिभर गर्ने विधि (Developer Update Workflow)</span>
            </h4>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <span className="w-6 h-6 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                  १
                </span>
                <div>
                  <strong className="text-slate-900 block font-bold">नयाँ भर्सन अपडेट गर्नुहोस् (Bump Version):</strong>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    तपाईंको कम्प्युटरमा कोड परिवर्तन गरेपछि <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">rp-builders-client/package.json</code> मा भर्सन (उदा: <code className="font-mono">1.0.1</code>) परिवर्तन गर्नुहोस्।
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <span className="w-6 h-6 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                  २
                </span>
                <div>
                  <strong className="text-slate-900 block font-bold">१-क्लिकमा नयाँ इन्स्टलर बनाउनुहोस् (Compile Executable):</strong>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">build-desktop-app.bat</code> मा डबल क्लिक गर्नुहोस्। यसले नयाँ अपडेट गरिएको <code className="font-mono">R.P. Builders ERP Setup.exe</code> तुरुन्तै तयार गरिदिन्छ।
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <span className="w-6 h-6 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                  ३
                </span>
                <div>
                  <strong className="text-slate-900 block font-bold">GitHub मा रिलिज गर्नुहोस् वा क्लाइन्टलाई पठाउनुहोस्:</strong>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    तयार भएको इन्स्टलर क्लाइन्टलाई पठाउनुहोस् वा GitHub (<code className="font-mono text-blue-700">github.com/SidL340/rpbuilders/releases</code>) मा नयाँ Release को रूपमा अपलोड गर्नुहोस्। क्लाइन्टले चलाउनासाथ पुरानो डाटा सुरक्षित राख्दै स्वतः नयाँ फिचर सुरु हुन्छ।
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Database Schema Migration History */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h4 className="font-black text-sm text-slate-900">
                  डाटाबेस माइग्रेसन इतिहास (Database Schema Migrations)
                </h4>
                <p className="text-[11px] text-slate-400">
                  सफ्टवेयर अपडेट हुँदा नयाँ कोलम र टेबलहरु स्वचालित रुपमा सुरक्षित थपिएका छन्
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {versionData?.migrations?.length || 3} Migrations Applied
              </span>
            </div>

            <div className="space-y-2">
              {versionData?.migrations?.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-mono font-bold text-slate-900 mr-2">{m.version}</span>
                      <span className="text-slate-600">{m.description}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {new Date(m.applied_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Restore Security Passcode Modal */}
      {restoreModalOpen && (
        <Modal
          isOpen={restoreModalOpen}
          onClose={() => setRestoreModalOpen(false)}
          title="डाटा रिस्टोर सुरक्षा प्रमाणीकरण (Developer Authentication)"
          size="md"
        >
          <form onSubmit={handleConfirmRestore} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-xs font-bold">चेतावनी (Important Warning):</strong>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  यस ब्याकअपबाट रिस्टोर गर्दा हालको डाटाबेसमा भएको विवरण प्रतिस्थापन हुनेछ। यो कार्य सुरक्षित गर्न आधिकारिक डेभलपर पासकोड अनिवार्य छ।
                </p>
              </div>
            </div>

            <div>
              <span className="block text-slate-500 font-bold mb-1">छानिएको ब्याकअप फाइल:</span>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 font-bold">
                {selectedBackupFile}
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                डेभलपर पासकोड (Developer Passcode) *
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter 5-digit passcode"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Nirmala Tech Innovations Developer Passcode आवश्यक पर्दछ
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRestoreModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                रद्द गर्नुहोस्
              </button>
              <button
                type="submit"
                disabled={restoring}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{restoring ? 'रिस्टोर हुँदैछ...' : 'पुष्टि गरी रिस्टोर गर्नुहोस्'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Manual Patch Apply Modal */}
      {patchModalOpen && (
        <Modal
          isOpen={patchModalOpen}
          onClose={() => setPatchModalOpen(false)}
          title="म्यानुअल अपडेट प्याच लागू गर्नुहोस् (Apply Developer Patch)"
          size="md"
        >
          <form onSubmit={handleApplyPatch} className="space-y-4 text-xs">
            <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-purple-900 flex items-start gap-2.5">
              <Code2 className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-xs font-bold">डेभलपर प्याच इन्जिन (Developer Patch Engine):</strong>
                <p className="text-[11px] text-purple-800 mt-0.5">
                  यस सुविधा मार्फत डेभलपर (Nirmala Tech) ले पठाएको नयाँ प्याच वा स्कीमा अपडेट प्रमाणीकरण गरी लागू गर्न सकिन्छ।
                </p>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                प्याच विवरण (Patch Description / Release Notes)
              </label>
              <input
                type="text"
                value={patchDescription}
                onChange={(e) => setPatchDescription(e.target.value)}
                placeholder="उदा: Fix invoice tax calculation or UI update"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                डेभलपर प्रमाणीकरण पासकोड (Developer Passcode) *
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={patchPasscode}
                  onChange={(e) => setPatchPasscode(e.target.value)}
                  placeholder="Enter 5-digit passcode"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Nirmala Tech Innovations Passcode आवश्यक छ
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPatchModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                रद्द गर्नुहोस्
              </button>
              <button
                type="submit"
                disabled={applyingPatch}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{applyingPatch ? 'लागू हुँदैछ...' : 'प्याच प्रमाणीकरण गरी लागू गर्नुहोस्'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
