import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowLeft, Search, Filter, Printer, Layers } from 'lucide-react';
import { materialsAPI, projectsAPI } from '../../services/api';
import Loader from '../../components/ui/Loader';
import toast from 'react-hot-toast';

export default function MaterialStock() {
  const [stock, setStock] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectFilter, setProjectFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsAPI.getAll().then(res => setProjects(res.data.data || [])).catch(() => {});
  }, []);

  const loadStock = async () => {
    try {
      setLoading(true);
      const res = await materialsAPI.getStock({ project_id: projectFilter || undefined });
      if (res.data.success) {
        setStock(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load stock position');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, [projectFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <Link
            to="/materials"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-black text-slate-850 tracking-tight">Site Material Stock Balance</h2>
            <p className="text-xs text-slate-500">Live inventory position per construction site (Purchased - Consumed)</p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md transition"
        >
          <Printer className="w-4 h-4" />
          <span>Print Stock Report</span>
        </button>
      </div>

      {/* Filter */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 no-print">
        <span className="text-xs font-bold text-slate-700">Filter Site:</span>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
        >
          <option value="">All Active Sites</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.project_name}</option>
          ))}
        </select>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border-none print:shadow-none">
        <div className="hidden print:block p-6 text-center border-b border-slate-300">
          <h1 className="text-2xl font-black text-slate-900">R.P. BUILDERS PVT. LTD.</h1>
          <h2 className="text-sm font-bold mt-1 uppercase underline">MATERIAL INVENTORY & STOCK POSITION</h2>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <Loader text="Calculating stock balances across project sites..." />
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                  <th className="py-3 px-4">Project Site</th>
                  <th className="py-3 px-4">Material Name</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4 text-right">Total Purchased</th>
                  <th className="py-3 px-4 text-right">Total Consumed</th>
                  <th className="py-3 px-4 text-right">Remaining Stock</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stock.map((s, idx) => {
                  const curr = parseFloat(s.current_stock || 0);
                  const isLow = curr <= 10;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-medium text-slate-800">{s.project_name}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{s.material_name}</td>
                      <td className="py-3 px-4 uppercase font-mono text-slate-500">{s.unit}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">{s.total_purchased}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">{s.total_used}</td>
                      <td className={`py-3 px-4 text-right font-mono font-black ${
                        curr > 0 ? 'text-blue-700 text-sm' : 'text-slate-400'
                      }`}>
                        {curr}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          curr <= 0 ? 'bg-slate-100 text-slate-600' : isLow ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {curr <= 0 ? 'Depleted' : isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {stock.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      No material activity logged for this site.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
