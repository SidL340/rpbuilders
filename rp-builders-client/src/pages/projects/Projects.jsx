import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Handshake,
  Plus,
  Filter,
  Search,
  ArrowRight,
  TrendingUp,
  MapPin,
  Calendar,
  Percent,
  CheckCircle,
  Clock,
  Edit3,
  Trash2
} from 'lucide-react';
import { projectsAPI } from '../../services/api';
import { formatNPR } from '../../utils/helpers';
import { todayBS } from '../../utils/nepaliDate';
import Modal from '../../components/ui/Modal';
import Loader from '../../components/ui/Loader';
import toast from 'react-hot-toast';

export default function Projects() {
  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = searchParams.get('type') || '';
  
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState(typeParam || 'all'); // 'all' | 'solo' | 'joint_venture'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const [form, setForm] = useState({
    project_name: '',
    project_name_np: '',
    project_type: 'solo',
    partner_company_name: '',
    rp_share_percent: '60',
    partner_share_percent: '40',
    main_client_name: '',
    main_client_phone: '',
    site_address: '',
    site_district: 'Kathmandu',
    contract_value: '',
    budget_total: '',
    start_date_bs: todayBS(),
    status: 'active',
    description: '',
  });

  useEffect(() => {
    if (typeParam) {
      setActiveTab(typeParam);
    }
  }, [typeParam]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await projectsAPI.getAll();
      if (res.data.success) {
        setProjects(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load project sites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleEditOpen = (project) => {
    setEditingProject(project);
    setForm({
      project_name: project.project_name || '',
      project_name_np: project.project_name_np || '',
      project_type: project.project_type || 'solo',
      partner_company_name: project.partner_company_name || '',
      rp_share_percent: String(project.rp_share_percent || 60),
      partner_share_percent: String(project.partner_share_percent || 40),
      main_client_name: project.main_client_name || '',
      main_client_phone: project.main_client_phone || '',
      site_address: project.site_address || '',
      site_district: project.site_district || 'Kathmandu',
      contract_value: project.contract_value ? String(project.contract_value) : '',
      budget_total: project.budget_total ? String(project.budget_total) : '',
      start_date_bs: project.start_date_bs || todayBS(),
      status: project.status || 'active',
      description: project.description || '',
    });
    setIsModalOpen(true);
  };

  const handleCreateOpen = () => {
    setEditingProject(null);
    setForm({
      project_name: '',
      project_name_np: '',
      project_type: activeTab === 'joint_venture' ? 'joint_venture' : 'solo',
      partner_company_name: '',
      rp_share_percent: '60',
      partner_share_percent: '40',
      main_client_name: '',
      main_client_phone: '',
      site_address: '',
      site_district: 'Kathmandu',
      contract_value: '',
      budget_total: '',
      start_date_bs: todayBS(),
      status: 'active',
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.project_name) {
      return toast.error('Project Name is required');
    }

    try {
      setSubmitting(true);
      const payload = {
        ...form,
        contract_value: parseFloat(form.contract_value) || 0,
        budget_total: parseFloat(form.budget_total) || 0,
        rp_share_percent: form.project_type === 'joint_venture' ? parseFloat(form.rp_share_percent) || 50 : 100,
        partner_share_percent: form.project_type === 'joint_venture' ? parseFloat(form.partner_share_percent) || 50 : 0,
      };

      if (editingProject) {
        const res = await projectsAPI.update(editingProject.id, payload);
        if (res.data.success) {
          toast.success(`Site "${form.project_name}" updated successfully!`);
          setIsModalOpen(false);
          setEditingProject(null);
          loadProjects();
        }
      } else {
        const res = await projectsAPI.create(payload);
        if (res.data.success) {
          toast.success(`Site "${form.project_name}" created successfully!`);
          setIsModalOpen(false);
          loadProjects();
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save project site');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async (project) => {
    if (!window.confirm(`के तपाईं "${project.project_name}" (${project.project_code}) साइट हटाउन निश्चित हुनुहुन्छ?`)) {
      return;
    }

    try {
      const res = await projectsAPI.delete(project.id);
      if (res.data.success) {
        toast.success(`Site "${project.project_name}" deleted successfully!`);
        loadProjects();
      }
    } catch (err) {
      if (err?.response?.data?.hasVouchers) {
        const confirmForce = window.confirm(
          `यस साइटमा ${err.response.data.voucherCount} वटा भौचर कारोबार जोडिएका छन्।\n\nके तपाईं ती भौचरहरु अन-लिंक गरी साइट पूर्ण रुपमा मेटाउन निश्चित हुनुहुन्छ?`
        );
        if (confirmForce) {
          try {
            const forceRes = await projectsAPI.delete(project.id, true);
            if (forceRes.data.success) {
              toast.success(`Site "${project.project_name}" deleted successfully!`);
              loadProjects();
            }
          } catch (forceErr) {
            toast.error(forceErr?.response?.data?.message || 'Failed to force delete site');
          }
        }
      } else {
        toast.error(err?.response?.data?.message || 'Failed to delete site');
      }
    }
  };

  // Filter projects by Tab and Search
  const filteredProjects = projects.filter((p) => {
    const matchesTab =
      activeTab === 'all'
        ? true
        : activeTab === 'solo'
        ? p.project_type === 'solo'
        : p.project_type === 'joint_venture';

    const matchesSearch =
      p.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.project_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.main_client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.partner_company_name?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const soloCount = projects.filter(p => p.project_type === 'solo').length;
  const jvCount = projects.filter(p => p.project_type === 'joint_venture').length;

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Sites & Projects (निर्माण आयोजना तथा साइटहरु)
          </h2>
          <p className="text-xs text-slate-500">
            Dedicated separation between Solo RP Builders Sites and Joint Venture (JV) Partnerships
          </p>
        </div>

        <button
          onClick={handleCreateOpen}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/25 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>नयाँ साइट थप्नुहोस् (New Site)</span>
        </button>
      </div>

      {/* Tabs Row (Solo vs JV) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            सबै आयोजना (All Sites) ({projects.length})
          </button>

          <button
            onClick={() => setActiveTab('solo')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'solo'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                : 'bg-white text-blue-700 hover:bg-blue-50 border border-blue-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>🏛️ RP एकल आयोजना (Solo Projects) ({soloCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('joint_venture')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'joint_venture'
                ? 'bg-purple-700 text-white shadow-sm shadow-purple-700/20'
                : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-200'
            }`}
          >
            <Handshake className="w-3.5 h-3.5" />
            <span>🤝 साझेदारी आयोजना (Joint Venture) ({jvCount})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search site, client, or partner..."
            className="pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Grid of Project Cards */}
      {loading ? (
        <Loader text="Loading construction sites..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const isJV = project.project_type === 'joint_venture';
            const spent = project.total_spent || 0;
            const budget = project.budget_total || 1;
            const percentUsed = Math.min(Math.round((spent / budget) * 100), 100);

            return (
              <div
                key={project.id}
                className={`bg-white rounded-3xl border transition shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden ${
                  isJV ? 'border-purple-200/90' : 'border-slate-200/90'
                }`}
              >
                <div>
                  {/* Top Bar with Badges */}
                  <div className={`p-4 border-b flex items-center justify-between ${isJV ? 'bg-purple-50/50 border-purple-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 shadow-2xs">
                        {project.project_code}
                      </span>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                        isJV ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {isJV ? '🤝 Joint Venture (JV)' : '🏛️ Solo (100% RP)'}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {project.status}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="font-black text-slate-900 text-base leading-snug">
                        {project.project_name}
                      </h3>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{project.site_address || 'Address not specified'}, {project.site_district}</span>
                      </div>
                    </div>

                    {/* Client & JV Partner Info */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">क्लाइन्ट (Client):</span>
                        <span className="font-bold text-slate-800">{project.main_client_name || 'Direct / Self'}</span>
                      </div>

                      {isJV && (
                        <div className="pt-1.5 border-t border-slate-200/60 space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-purple-700 font-semibold">पार्टनर (JV Partner):</span>
                            <span className="font-bold text-purple-950">{project.partner_company_name || 'Partner Co.'}</span>
                          </div>
                          <div className="flex justify-between font-mono font-bold text-[10px] text-slate-600">
                            <span>RP: {project.rp_share_percent}%</span>
                            <span>Partner: {project.partner_share_percent}%</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Budget & Progress */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">खर्च / बजेट (Spent vs Budget):</span>
                        <span className="font-mono font-bold text-slate-800">
                          {formatNPR(spent)} / {formatNPR(project.budget_total)}
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            percentUsed > 90 ? 'bg-red-500' : isJV ? 'bg-purple-600' : 'bg-blue-600'
                          }`}
                          style={{ width: `${percentUsed}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium font-mono">
                    Start: {project.start_date_bs} BS
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditOpen(project)}
                      title="साइट सम्पादन गर्नुहोस् (Edit Site)"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProject(project)}
                      title="साइट मेटाउनुहोस् (Delete Site)"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <Link
                      to={`/projects/${project.id}`}
                      className="inline-flex items-center gap-1 text-xs font-black text-blue-600 hover:text-blue-800 transition ml-1"
                    >
                      <span>विवरण (Details)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredProjects.length === 0 && (
            <div className="col-span-full bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-400 text-xs">
              No construction sites found for selected tab. Click "नयाँ साइट थप्नुहोस्" above to add one.
            </div>
          )}
        </div>
      )}

      {/* Project Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProject(null);
        }}
        title={editingProject ? `साइट सम्पादन: ${editingProject.project_name}` : "नयाँ निर्माण साइट / आयोजना सिर्जना गर्नुहोस्"}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Project Type Radio */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <label className="block font-black text-slate-800 uppercase tracking-wide mb-2 text-[11px]">
              आयोजनाको प्रकृति रोज्नुहोस् (Project Nature) *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                form.project_type === 'solo'
                  ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}>
                <input
                  type="radio"
                  name="project_type"
                  value="solo"
                  checked={form.project_type === 'solo'}
                  onChange={() => setForm({ ...form, project_type: 'solo' })}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="text-xs">🏛️ RP एकल आयोजना (Solo)</div>
                  <div className="text-[10px] font-normal text-slate-500">100% RP Builders</div>
                </div>
              </label>

              <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                form.project_type === 'joint_venture'
                  ? 'bg-purple-50 border-purple-400 text-purple-900 font-bold'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}>
                <input
                  type="radio"
                  name="project_type"
                  value="joint_venture"
                  checked={form.project_type === 'joint_venture'}
                  onChange={() => setForm({ ...form, project_type: 'joint_venture' })}
                  className="w-4 h-4 text-purple-600"
                />
                <div>
                  <div className="text-xs">🤝 साझेदारी (Joint Venture - JV)</div>
                  <div className="text-[10px] font-normal text-slate-500">Tied-up with Partner</div>
                </div>
              </label>
            </div>
          </div>

          {/* If JV: Partner Details */}
          {form.project_type === 'joint_venture' && (
            <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-3">
              <h4 className="font-bold text-purple-900 text-xs">साझेदार कम्पनी विवरण (JV Partner Info)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block font-bold text-slate-700 mb-1">Partner Company Name *</label>
                  <input
                    type="text"
                    required
                    value={form.partner_company_name}
                    onChange={(e) => setForm({ ...form, partner_company_name: e.target.value })}
                    placeholder="e.g. Annapurna Construction"
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">RP Builders Share (%) *</label>
                  <input
                    type="number"
                    value={form.rp_share_percent}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setForm({
                        ...form,
                        rp_share_percent: e.target.value,
                        partner_share_percent: (100 - val).toString()
                      });
                    }}
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Partner Share (%) *</label>
                  <input
                    type="number"
                    value={form.partner_share_percent}
                    readOnly
                    className="w-full px-3 py-2 bg-purple-100/70 border border-purple-200 rounded-xl font-mono font-bold text-slate-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Project Name & Nepali Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Site / Project Name (English) *</label>
              <input
                type="text"
                required
                value={form.project_name}
                onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                placeholder="e.g. Kathmandu Commercial Complex"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">आयोजनाको नाम (नेपाली)</label>
              <input
                type="text"
                value={form.project_name_np}
                onChange={(e) => setForm({ ...form, project_name_np: e.target.value })}
                placeholder="काठमाडौं कम्प्लेक्स"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Client Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Client Name (ग्राहक / साहुको नाम)</label>
              <input
                type="text"
                value={form.main_client_name}
                onChange={(e) => setForm({ ...form, main_client_name: e.target.value })}
                placeholder="e.g. Everest Trade Concern"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Client Contact Phone</label>
              <input
                type="text"
                value={form.main_client_phone}
                onChange={(e) => setForm({ ...form, main_client_phone: e.target.value })}
                placeholder="98xxxxxxxx"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Financials & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Contract Value (ठेक्का रकम)</label>
              <input
                type="number"
                value={form.contract_value}
                onChange={(e) => setForm({ ...form, contract_value: e.target.value })}
                placeholder="e.g. 45000000"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Estimated Budget (बजेट)</label>
              <input
                type="number"
                value={form.budget_total}
                onChange={(e) => setForm({ ...form, budget_total: e.target.value })}
                placeholder="e.g. 38000000"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">सुरु मिति (Start Date BS)</label>
              <input
                type="text"
                value={form.start_date_bs}
                onChange={(e) => setForm({ ...form, start_date_bs: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold"
              />
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Site Address (ठेगाना)</label>
              <input
                type="text"
                value={form.site_address}
                onChange={(e) => setForm({ ...form, site_address: e.target.value })}
                placeholder="e.g. New Baneshwor"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">District (जिल्ला)</label>
              <input
                type="text"
                value={form.site_district}
                onChange={(e) => setForm({ ...form, site_district: e.target.value })}
                placeholder="Kathmandu"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingProject(null);
              }}
              className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600"
            >
              रद्द गर्नुहोस् (Cancel)
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              {submitting ? 'सुरक्षित हुँदैछ...' : editingProject ? 'साइट अपडेट गर्नुहोस् (Update Site)' : 'नयाँ साइट सुरक्षित गर्नुहोस् (Save Site)'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
