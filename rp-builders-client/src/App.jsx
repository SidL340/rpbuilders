import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Layout
import AppLayout from './components/layout/AppLayout';

// Pages
import LoginPage      from './pages/auth/LoginPage';
import Dashboard      from './pages/Dashboard';
import Projects       from './pages/projects/Projects';
import ProjectDetail  from './pages/projects/ProjectDetail';
import Parties        from './pages/parties/Parties';
import PartyLedger    from './pages/parties/PartyLedger';
import VoucherEntry   from './pages/vouchers/VoucherEntry';
import VoucherList    from './pages/vouchers/VoucherList';
import DayBook        from './pages/vouchers/DayBook';
import Thekedar       from './pages/thekedar/Thekedar';
import ThekedarDetail from './pages/thekedar/ThekedarDetail';
import FundManagement from './pages/funds/FundManagement';
import Materials      from './pages/materials/Materials';
import MaterialStock  from './pages/materials/MaterialStock';
import Employees      from './pages/employees/Employees';
import LabourEntry    from './pages/employees/LabourEntry';
import Equipment      from './pages/equipment/Equipment';
import Reports        from './pages/reports/Reports';
import ExpenseSummary from './pages/reports/ExpenseSummary';
import ProfitLoss     from './pages/reports/ProfitLoss';
import TrialBalance   from './pages/reports/TrialBalance';
import Settings       from './pages/settings/Settings';
import Users          from './pages/settings/Users';
import NotFound       from './pages/NotFound';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '12px', background: '#0f172a', color: '#fff', fontSize: '13px' },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

          {/* Protected - inside AppLayout */}
          <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />

            {/* Sites & Projects */}
            <Route path="projects"             element={<Projects />} />
            <Route path="projects/:id"         element={<ProjectDetail />} />

            {/* Daily Entry & Day Book */}
            <Route path="vouchers/entry"       element={<VoucherEntry />} />
            <Route path="vouchers/new"         element={<VoucherEntry />} />
            <Route path="vouchers/daybook"     element={<DayBook />} />
            <Route path="daybook"              element={<DayBook />} />
            <Route path="vouchers/list"        element={<VoucherList />} />
            <Route path="vouchers"             element={<VoucherList />} />

            {/* Parties */}
            <Route path="parties"              element={<Parties />} />
            <Route path="parties/:id/ledger"   element={<PartyLedger />} />

            {/* Thekedar */}
            <Route path="thekedar"             element={<Thekedar />} />
            <Route path="thekedar/:id"         element={<ThekedarDetail />} />

            {/* Funds & Loans */}
            <Route path="funds"                element={<FundManagement />} />

            {/* Materials & Stock */}
            <Route path="materials"            element={<Materials />} />
            <Route path="materials/stock"      element={<MaterialStock />} />

            {/* Labour & Employees */}
            <Route path="employees"            element={<Employees />} />
            <Route path="employees/labour"     element={<LabourEntry />} />
            <Route path="labour"               element={<LabourEntry />} />

            {/* Equipment & Machinery */}
            <Route path="equipment"            element={<Equipment />} />

            {/* Reports */}
            <Route path="reports"              element={<Reports />} />
            <Route path="reports/expenses"     element={<ExpenseSummary />} />
            <Route path="reports/expense"      element={<ExpenseSummary />} />
            <Route path="reports/profit-loss"  element={<ProfitLoss />} />
            <Route path="reports/pnl"          element={<ProfitLoss />} />
            <Route path="reports/trial-balance" element={<TrialBalance />} />
            <Route path="reports/trial"        element={<TrialBalance />} />

            {/* Settings */}
            <Route path="settings"             element={<Settings />} />
            <Route path="settings/users"       element={<Users />} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
