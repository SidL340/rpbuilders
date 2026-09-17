import axios from 'axios';

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && (window.location.protocol === 'file:' || window.electronAPI)) {
    return 'http://127.0.0.1:5000/api';
  }
  return '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Add JWT token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('rp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally without flickering / reload loops
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('rp_token');
      localStorage.removeItem('rp_user');
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── Auth ─────────────────────────────────────────────
export const authAPI = {
  login:          (data) => api.post('/auth/login', data),
  logout:         ()     => api.post('/auth/logout'),
  me:             ()     => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ─── Projects ──────────────────────────────────────────
export const projectsAPI = {
  getAll:      (params) => api.get('/projects', { params }),
  create:      (data)   => api.post('/projects', data),
  getById:     (id)     => api.get(`/projects/${id}`),
  update:      (id, d)  => api.put(`/projects/${id}`, d),
  delete:      (id, force) => api.delete(`/projects/${id}${force ? '?force=true' : ''}`),
  getSummary:  (id)     => api.get(`/projects/${id}/summary`),
  getExpenses: (id, p)  => api.get(`/projects/${id}/expenses`, { params: p }),
  getLedger:   (id, p)  => api.get(`/projects/${id}/ledger`, { params: p }),
};

// ─── Parties ───────────────────────────────────────────
export const partiesAPI = {
  getAll:     (params) => api.get('/parties', { params }),
  create:     (data)   => api.post('/parties', data),
  getById:    (id)     => api.get(`/parties/${id}`),
  update:     (id, d)  => api.put(`/parties/${id}`, d),
  getLedger:  (id, p)  => api.get(`/parties/${id}/ledger`, { params: p }),
  getBalance: (id)     => api.get(`/parties/${id}/balance`),
};

// ─── Categories ────────────────────────────────────────
export const categoriesAPI = {
  getAll:  () => api.get('/categories'),
  getFlat: () => api.get('/categories/flat'),
};

// ─── Vouchers ──────────────────────────────────────────
export const vouchersAPI = {
  getAll:   (params) => api.get('/vouchers', { params }),
  create:   (data)   => api.post('/vouchers', data),
  getById:  (id)     => api.get(`/vouchers/${id}`),
  update:   (id, d)  => api.put(`/vouchers/${id}`, d),
  delete:   (id)     => api.delete(`/vouchers/${id}`),
  approve:  (id)     => api.put(`/vouchers/${id}/approve`),
  cancel:   (id)     => api.put(`/vouchers/${id}/cancel`),
  daybook:  (params) => api.get('/vouchers/daybook', { params }),
};

// ─── Funds ─────────────────────────────────────────────
export const fundsAPI = {
  getSources:    (params) => api.get('/funds/sources', { params }),
  createSource:  (data)   => api.post('/funds/sources', data),
  getReceipts:   (params) => api.get('/funds/receipts', { params }),
  createReceipt: (data)   => api.post('/funds/receipts', data),
  getSummary:    ()       => api.get('/funds/summary'),
};

// ─── Thekedar ──────────────────────────────────────────
export const thekedarAPI = {
  getWorkOrders:    (params) => api.get('/thekedar/work-orders', { params }),
  createWorkOrder:  (data)   => api.post('/thekedar/work-orders', data),
  getWorkOrder:     (id)     => api.get(`/thekedar/work-orders/${id}`),
  updateWorkOrder:  (id, d)  => api.put(`/thekedar/work-orders/${id}`, d),
  createPayment:    (id, d)  => api.post(`/thekedar/work-orders/${id}/payments`, d),
  getPayments:      (id)     => api.get(`/thekedar/work-orders/${id}/payments`),
  getStatement:     (params) => api.get('/thekedar/statement', { params }),
};

// ─── Materials ─────────────────────────────────────────
export const materialsAPI = {
  getAll:      (params) => api.get('/materials', { params }),
  create:      (data)   => api.post('/materials', data),
  getPurchases:(params) => api.get('/materials/purchases', { params }),
  addPurchase: (data)   => api.post('/materials/purchases', data),
  addUsage:    (data)   => api.post('/materials/usage', data),
  getStock:    (params) => api.get('/materials/stock', { params }),
  getProjectStock: (id) => api.get(`/materials/stock/${id}`),
};

// ─── Employees & Labour ────────────────────────────────
export const employeesAPI = {
  getAll:           (params) => api.get('/employees', { params }),
  create:           (data)   => api.post('/employees', data),
  getById:          (id)     => api.get(`/employees/${id}`),
  update:           (id, d)  => api.put(`/employees/${id}`, d),
  addLabour:        (data)   => api.post('/employees/labour-attendance', data),
  getLabour:        (params) => api.get('/employees/labour-attendance', { params }),
  paySalary:        (data)   => api.post('/employees/salary-payments', data),
  getSalaryHistory: (params) => api.get('/employees/salary-payments', { params }),
};

// ─── Equipment ─────────────────────────────────────────
export const equipmentAPI = {
  getAll:        (params) => api.get('/equipment', { params }),
  create:        (data)   => api.post('/equipment', data),
  update:        (id, d)  => api.put(`/equipment/${id}`, d),
  logUsage:      (data)   => api.post('/equipment/usage', data),
  getUsage:      (params) => api.get('/equipment/usage', { params }),
  logMaintenance:(data)   => api.post('/equipment/maintenance', data),
  getMaintenance:(id)     => api.get(`/equipment/maintenance/${id}`),
};

// ─── Reports ───────────────────────────────────────────
export const reportsAPI = {
  daybook:        (params) => api.get('/reports/daybook', { params }),
  journal:        (params) => api.get('/reports/journal', { params }),
  partyLedger:    (id, p)  => api.get(`/reports/ledger/party/${id}`, { params: p }),
  projectLedger:  (id)     => api.get(`/reports/ledger/project/${id}`),
  expenseSummary: (params) => api.get('/reports/expense-summary', { params }),
  trialBalance:   (params) => api.get('/reports/trial-balance', { params }),
  profitLoss:     (params) => api.get('/reports/profit-loss', { params }),
  fundFlow:       (params) => api.get('/reports/fund-flow', { params }),
};

// ─── Dashboard ─────────────────────────────────────────
export const dashboardAPI = {
  getStats:         () => api.get('/dashboard/stats'),
  getMonthlyExpenses:() => api.get('/dashboard/monthly-expenses'),
  getCategoryBreakdown:() => api.get('/dashboard/category-breakdown'),
  getProjectOverview:() => api.get('/dashboard/project-overview'),
  getRecentVouchers: () => api.get('/dashboard/recent-vouchers'),
};

// ─── Accounts ──────────────────────────────────────────
export const accountsAPI = {
  getAll:  () => api.get('/accounts'),
  create:  (data)  => api.post('/accounts', data),
  update:  (id, d) => api.put(`/accounts/${id}`, d),
};

// ─── Users ─────────────────────────────────────────────
export const usersAPI = {
  getAll:       () => api.get('/users'),
  create:       (data)  => api.post('/users', data),
  update:       (id, d) => api.put(`/users/${id}`, d),
  toggleActive: (id)    => api.put(`/users/${id}/toggle-active`),
};

// ─── Settings ──────────────────────────────────────────
export const settingsAPI = {
  getCompany:    () => api.get('/settings/company'),
  updateCompany: (data) => api.put('/settings/company', data),
  getFiscalYear: () => api.get('/settings/fiscal-year'),
  getBackups:    () => api.get('/settings/backups'),
  createBackup:  () => api.post('/settings/backups/create'),
  restoreBackup: (data) => api.post('/settings/backups/restore', data),
  getVersion:    () => api.get('/settings/version'),
  checkUpdate:   () => api.post('/settings/check-update'),
  applyPatch:    (data) => api.post('/settings/apply-patch', data),
};

