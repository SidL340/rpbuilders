-- ============================================================
-- R.P. Builders Pvt Ltd — Embedded SQLite Database Schema
-- Stored directly on Local Hard Disk (data/rp_builders.db)
-- Created: 2082 BS (2025 AD)
-- ============================================================

-- 1. SYSTEM / SETTINGS
CREATE TABLE IF NOT EXISTS company_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT DEFAULT 'R.P. Builders Pvt Ltd',
  company_name_np TEXT,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  company_pan TEXT,
  company_logo_path TEXT,
  company_logo_data TEXT,
  fiscal_year_start TEXT DEFAULT '2082-04-01',
  currency TEXT DEFAULT 'NPR',
  date_format TEXT DEFAULT 'BS',
  created_at TEXT DEFAULT (DATETIME('now', 'localtime')),
  updated_at TEXT DEFAULT (DATETIME('now', 'localtime'))
);

INSERT OR IGNORE INTO company_settings (id, company_name, company_address, company_phone, company_pan)
VALUES (1, 'R.P. Builders Pvt Ltd', 'Nepal', '977-', '');

-- 2. USERS & ROLES
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_name TEXT NOT NULL UNIQUE,
  role_label TEXT,
  permissions TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (DATETIME('now', 'localtime'))
);

INSERT OR IGNORE INTO roles (id, role_name, role_label, permissions) VALUES
(1, 'super_admin', 'Super Admin', '["all"]'),
(2, 'manager', 'Manager', '["view_all","create","edit","approve","reports","dashboard"]'),
(3, 'accountant', 'Accountant', '["view_all","create","edit","journal","reports"]'),
(4, 'site_supervisor', 'Site Supervisor', '["create_site_entry","view_site","reports_site"]'),
(5, 'entry_operator', 'Entry Operator', '["create_voucher","view_basic"]');

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role_id INTEGER NOT NULL,
  phone TEXT,
  address TEXT,
  profile_image TEXT,
  is_active INTEGER DEFAULT 1,
  last_login TEXT,
  created_at TEXT DEFAULT (DATETIME('now', 'localtime')),
  updated_at TEXT DEFAULT (DATETIME('now', 'localtime')),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Default admin user (password: password)
INSERT OR IGNORE INTO users (id, name, username, email, password_hash, role_id, phone)
VALUES (
  1,
  'System Administrator',
  'admin',
  'admin@rpbuilders.com',
  '$2b$10$QJzI38X1mQfJ0x6bH4xMWe1X11h4qX4n0B7u9L3r6K2p8Y5s7T1v2', -- bcrypt placeholder, updated dynamically
  1,
  '9800000000'
);

CREATE TABLE IF NOT EXISTS user_site_access (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  site_id INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, site_id)
);

-- 3. PROJECTS / SITES
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_code TEXT NOT NULL UNIQUE,
  project_name TEXT NOT NULL,
  project_name_np TEXT,
  site_address TEXT,
  site_ward TEXT,
  site_municipality TEXT,
  site_district TEXT,
  project_type TEXT DEFAULT 'solo',
  main_client_name TEXT,
  main_client_phone TEXT,
  main_client_address TEXT,
  contract_value NUMERIC DEFAULT 0,
  partner_company_name TEXT,
  partner_company_address TEXT,
  rp_share_percent NUMERIC DEFAULT 100,
  partner_share_percent NUMERIC DEFAULT 0,
  start_date_bs TEXT,
  start_date_ad TEXT,
  expected_end_date_bs TEXT,
  expected_end_date_ad TEXT,
  actual_end_date_bs TEXT,
  actual_end_date_ad TEXT,
  budget_total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  description TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (DATETIME('now', 'localtime')),
  updated_at TEXT DEFAULT (DATETIME('now', 'localtime')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 4. PARTIES (Thekedar, Supplier, Labour, Sahu, etc.)
CREATE TABLE IF NOT EXISTS parties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  party_code TEXT NOT NULL UNIQUE,
  party_name TEXT NOT NULL,
  party_name_np TEXT,
  party_type TEXT NOT NULL,
  phone TEXT,
  secondary_phone TEXT,
  email TEXT,
  address TEXT,
  district TEXT,
  pan_no TEXT,
  vat_no TEXT,
  bank_name TEXT,
  bank_account_no TEXT,
  bank_branch TEXT,
  opening_balance NUMERIC DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (DATETIME('now', 'localtime')),
  updated_at TEXT DEFAULT (DATETIME('now', 'localtime')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 5. EXPENSE CATEGORIES & SUBCATEGORIES
CREATE TABLE IF NOT EXISTS expense_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_np TEXT,
  parent_id INTEGER,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (parent_id) REFERENCES expense_categories(id)
);

-- Main Categories
INSERT OR IGNORE INTO expense_categories (id, code, name, name_np, parent_id, icon, sort_order) VALUES
(1, 'SCM', 'Construction Materials', 'निर्माण सामग्री', NULL, 'package', 1),
(2, 'SLW', 'Site Labour', 'साइट मजदुर', NULL, 'users', 2),
(3, 'STK', 'Thekedar Payments', 'ठेकेदार भुक्तान', NULL, 'hard-hat', 3),
(4, 'SEQ', 'Equipment & Machinery', 'उपकरण तथा मेशिनरी', NULL, 'settings', 4),
(5, 'SER', 'Equipment Repair', 'उपकरण मर्मत', NULL, 'wrench', 5),
(6, 'SFU', 'Fuel & Lubricants', 'इन्धन', NULL, 'droplet', 6),
(7, 'STR', 'Site Transport', 'साइट यातायात', NULL, 'truck', 7),
(8, 'SRE', 'Site Rent', 'साइट भाडा', NULL, 'map-pin', 8),
(9, 'SSA', 'Site Safety & Misc', 'साइट सुरक्षा', NULL, 'shield', 9),
(10, 'OST', 'Stationery & Office Supplies', 'स्टेशनरी', NULL, 'file-text', 10),
(11, 'ORM', 'Office Repair & Maintenance', 'कार्यालय मर्मत', NULL, 'tool', 11),
(12, 'OEL', 'Electricity & Utilities', 'बिजुली तथा उपयोगिता', NULL, 'zap', 12),
(13, 'ORT', 'Office Rent', 'कार्यालय भाडा', NULL, 'home', 13),
(14, 'OFO', 'Food & Refreshment', 'खाना तथा खाजा', NULL, 'coffee', 14),
(15, 'OTR', 'Office Transport & Fuel', 'कार्यालय यातायात', NULL, 'car', 15),
(16, 'OSL', 'Staff Salary', 'कर्मचारी तलब', NULL, 'dollar-sign', 16),
(17, 'OVH', 'Vehicle Maintenance', 'सवारी साधन मर्मत', NULL, 'car', 17),
(18, 'OIN', 'Insurance', 'बिमा', NULL, 'umbrella', 18),
(19, 'OPH', 'Phone & Communication', 'फोन तथा सञ्चार', NULL, 'phone', 19),
(20, 'OAD', 'Advertisement & Marketing', 'विज्ञापन', NULL, 'megaphone', 20),
(21, 'OLG', 'Legal & Professional Fees', 'कानुनी शुल्क', NULL, 'briefcase', 21),
(22, 'FLR', 'Loan Repayment', 'ऋण भुक्तान', NULL, 'credit-card', 22),
(23, 'FIN', 'Interest Expense', 'ब्याज खर्च', NULL, 'percent', 23),
(24, 'FBN', 'Bank Charges', 'बैंक शुल्क', NULL, 'landmark', 24),
(25, 'FTX', 'Tax & Government Fees', 'कर तथा सरकारी शुल्क', NULL, 'file', 25),
(26, 'FPM', 'Permit & License', 'अनुमति तथा इजाजत', NULL, 'award', 26),
(27, 'MSC', 'Miscellaneous', 'विविध', NULL, 'more-horizontal', 27);

-- Sub-categories for Construction Materials (Parent ID = 1)
INSERT OR IGNORE INTO expense_categories (code, name, name_np, parent_id, sort_order) VALUES
('SCM-CEM', 'Cement', 'सिमेन्ट', 1, 1),
('SCM-ROD', 'Steel Rod / Rebar', 'डण्डी/रड', 1, 2),
('SCM-SND', 'Sand (बालुवा)', 'बालुवा', 1, 3),
('SCM-AGG', 'Aggregate / Gitti', 'गिट्टी', 1, 4),
('SCM-BRK', 'Bricks (इट्टा)', 'इट्टा', 1, 5),
('SCM-STN', 'Stone (ढुङ्गा)', 'ढुङ्गा', 1, 6),
('SCM-TBR', 'Timber / Wood', 'काठ', 1, 7),
('SCM-PNT', 'Paint & Primer', 'रङ', 1, 8),
('SCM-TIL', 'Tiles / Flooring', 'टायल्स', 1, 9),
('SCM-PPE', 'Pipe & Fittings', 'पाइप तथा फिटिङ', 1, 10),
('SCM-WIR', 'Wire & Cable', 'तार तथा केबल', 1, 11),
('SCM-SHT', 'Shuttering Material', 'शटरिङ सामग्री', 1, 12),
('SCM-HDW', 'Hardware & Nails', 'हार्डवेयर', 1, 13),
('SCM-WTR', 'Waterproofing Material', 'वाटरप्रुफिङ', 1, 14),
('SCM-GLS', 'Glass & Windows', 'सिसा तथा झ्याल', 1, 15),
('SCM-SAN', 'Sanitary Items', 'स्यानिटरी', 1, 16),
('SCM-ELC', 'Electrical Items', 'विद्युतीय सामग्री', 1, 17),
('SCM-OTH', 'Other Materials', 'अन्य सामग्री', 1, 18),

-- Thekedar sub-types (Parent ID = 3)
('STK-ERW', 'Earthwork Thekka', 'माटो काम ठेक्का', 3, 1),
('STK-MSN', 'Masonry Thekka', 'डकर्मी ठेक्का', 3, 2),
('STK-CPY', 'Carpentry Thekka', 'सिकर्मी ठेक्का', 3, 3),
('STK-PLM', 'Plumbing Thekka', 'प्लम्बिङ ठेक्का', 3, 4),
('STK-ELC', 'Electrical Thekka', 'विद्युत ठेक्का', 3, 5),
('STK-PNT', 'Painting Thekka', 'रङ ठेक्का', 3, 6),
('STK-FIN', 'Finishing Thekka', 'फिनिसिङ ठेक्का', 3, 7),
('STK-RFG', 'Roofing Thekka', 'छत ठेक्का', 3, 8),

-- Equipment (Parent ID = 4)
('SEQ-JCB', 'JCB / Excavator Hire', 'जेसिबी भाडा', 4, 1),
('SEQ-MXR', 'Concrete Mixer Hire', 'मिक्सर भाडा', 4, 2),
('SEQ-SCF', 'Scaffolding Rent', 'स्क्याफल्डिङ भाडा', 4, 3),
('SEQ-CRN', 'Crane / Hoist', 'क्रेन भाडा', 4, 4),
('SEQ-CMP', 'Compactor / Roller', 'कम्प्याक्टर', 4, 5),
('SEQ-GEN', 'Generator / Power', 'जेनेरेटर', 4, 6),
('SEQ-BBM', 'Bar Bending Machine', 'बार बेन्डिङ मेसिन', 4, 7),

-- Tax types (Parent ID = 25)
('FTX-TDS', 'TDS Payment', 'करकट्टी', 25, 1),
('FTX-VAT', 'VAT Payment', 'मूल्य अभिवृद्धि कर', 25, 2),
('FTX-ROY', 'Royalty / Resource', 'रोयल्टी', 25, 3),
('FTX-REG', 'Registration Fee', 'दर्ता शुल्क', 25, 4);

-- 6. BANKS & ACCOUNTS
CREATE TABLE IF NOT EXISTS banks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bank_name TEXT NOT NULL,
  bank_short TEXT,
  is_active INTEGER DEFAULT 1
);

INSERT OR IGNORE INTO banks (id, bank_name, bank_short) VALUES
(1, 'Rastriya Banijya Bank', 'RBB'),
(2, 'Nepal Bank Limited', 'NBL'),
(3, 'Agriculture Development Bank', 'ADBL'),
(4, 'Nabil Bank', 'NABIL'),
(5, 'Nepal Investment Mega Bank', 'NIMB'),
(6, 'Everest Bank', 'EBL'),
(7, 'Global IME Bank', 'GIBL'),
(8, 'Sanima Bank', 'SANIMA'),
(9, 'Prabhu Bank', 'PRABHU'),
(10, 'NIC Asia Bank', 'NICA'),
(11, 'Citizens Bank', 'CBL'),
(12, 'Machhapuchchhre Bank', 'MBL'),
(13, 'Cash', 'CASH');

CREATE TABLE IF NOT EXISTS company_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  bank_id INTEGER,
  account_number TEXT,
  account_holder_name TEXT,
  branch TEXT,
  opening_balance NUMERIC DEFAULT 0,
  current_balance NUMERIC DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (bank_id) REFERENCES banks(id)
);

INSERT OR IGNORE INTO company_accounts (id, account_name, account_type, bank_id, opening_balance, current_balance)
VALUES (1, 'Main Cash', 'cash', 13, 0, 0);

-- 7. FUND SOURCES
CREATE TABLE IF NOT EXISTS fund_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_code TEXT UNIQUE,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  party_id INTEGER,
  total_sanctioned_amount NUMERIC DEFAULT 0,
  interest_rate NUMERIC DEFAULT 0,
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (DATETIME('now', 'localtime')),
  FOREIGN KEY (party_id) REFERENCES parties(id)
);

CREATE TABLE IF NOT EXISTS fund_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_no TEXT UNIQUE,
  receipt_date_bs TEXT NOT NULL,
  receipt_date_ad TEXT NOT NULL,
  fund_source_id INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  payment_mode TEXT DEFAULT 'cash',
  account_id INTEGER,
  bank_ref TEXT,
  cheque_no TEXT,
  description TEXT,
  received_by INTEGER,
  created_at TEXT DEFAULT (DATETIME('now', 'localtime')),
  FOREIGN KEY (fund_source_id) REFERENCES fund_sources(id),
  FOREIGN KEY (account_id) REFERENCES company_accounts(id),
  FOREIGN KEY (received_by) REFERENCES users(id)
);

-- 8. VOUCHERS (Day Book Main Table)
CREATE TABLE IF NOT EXISTS vouchers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voucher_no TEXT NOT NULL UNIQUE,
  voucher_type TEXT NOT NULL,
  voucher_date_bs TEXT NOT NULL,
  voucher_date_ad TEXT NOT NULL,
  fiscal_year TEXT DEFAULT '2083/84',
  project_id INTEGER,
  party_id INTEGER,
  account_id INTEGER NOT NULL,
  fund_source_id INTEGER,
  payment_mode TEXT DEFAULT 'cash',
  cheque_no TEXT,
  cheque_date_bs TEXT,
  bank_name TEXT,
  bank_voucher_no TEXT,
  cash_receiver_name TEXT,
  cash_receiver_phone TEXT,
  cash_handed_by TEXT,
  reference_no TEXT,
  category_id INTEGER,
  narration TEXT NOT NULL,
  gross_amount NUMERIC NOT NULL DEFAULT 0,
  tds_percent NUMERIC DEFAULT 0,
  tds_amount NUMERIC DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  approved_by INTEGER,
  approved_at TEXT,
  bill_image_path TEXT,
  bill_no TEXT,
  remarks TEXT,
  entered_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (DATETIME('now', 'localtime')),
  updated_at TEXT DEFAULT (DATETIME('now', 'localtime')),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (party_id) REFERENCES parties(id),
  FOREIGN KEY (account_id) REFERENCES company_accounts(id),
  FOREIGN KEY (category_id) REFERENCES expense_categories(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (entered_by) REFERENCES users(id)
);

-- 9. THEKEDAR WORK ORDERS & PAYMENTS
CREATE TABLE IF NOT EXISTS thekedar_work_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_order_no TEXT UNIQUE,
  project_id INTEGER NOT NULL,
  thekedar_id INTEGER NOT NULL,
  work_description TEXT NOT NULL,
  work_type TEXT,
  unit TEXT,
  quantity NUMERIC,
  unit_rate NUMERIC,
  total_contract_amount NUMERIC NOT NULL,
  advance_paid NUMERIC DEFAULT 0,
  total_paid NUMERIC DEFAULT 0,
  retention_percent NUMERIC DEFAULT 0,
  tds_percent NUMERIC DEFAULT 1.5,
  completion_percent NUMERIC DEFAULT 0,
  start_date_bs TEXT,
  start_date_ad TEXT,
  end_date_bs TEXT,
  end_date_ad TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (DATETIME('now', 'localtime')),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (thekedar_id) REFERENCES parties(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS thekedar_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_order_id INTEGER NOT NULL,
  voucher_id INTEGER,
  payment_date_bs TEXT NOT NULL,
  payment_date_ad TEXT NOT NULL,
  bill_no TEXT,
  gross_amount NUMERIC NOT NULL,
  retention_amount NUMERIC DEFAULT 0,
  tds_amount NUMERIC DEFAULT 0,
  advance_adjusted NUMERIC DEFAULT 0,
  net_amount NUMERIC NOT NULL,
  payment_type TEXT DEFAULT 'running_bill',
  work_completion_percent NUMERIC,
  remarks TEXT,
  created_at TEXT DEFAULT (DATETIME('now', 'localtime')),
  FOREIGN KEY (work_order_id) REFERENCES thekedar_work_orders(id),
  FOREIGN KEY (voucher_id) REFERENCES vouchers(id)
);

-- 10. MATERIALS / INVENTORY
CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material_code TEXT UNIQUE,
  material_name TEXT NOT NULL,
  material_name_np TEXT,
  unit TEXT NOT NULL,
  category_code TEXT,
  notes TEXT,
  is_active INTEGER DEFAULT 1
);

INSERT OR IGNORE INTO materials (id, material_code, material_name, material_name_np, unit, category_code) VALUES
(1, 'MAT-CEM-001', 'Cement (OPC 43)', 'सिमेन्ट (OPC 43)', 'bag', 'SCM-CEM'),
(2, 'MAT-CEM-002', 'Cement (OPC 53)', 'सिमेन्ट (OPC 53)', 'bag', 'SCM-CEM'),
(3, 'MAT-CEM-003', 'White Cement', 'सेतो सिमेन्ट', 'bag', 'SCM-CEM'),
(4, 'MAT-ROD-001', 'TMT Rod 8mm', 'डण्डी 8mm', 'kg', 'SCM-ROD'),
(5, 'MAT-ROD-002', 'TMT Rod 10mm', 'डण्डी 10mm', 'kg', 'SCM-ROD'),
(6, 'MAT-ROD-003', 'TMT Rod 12mm', 'डण्डी 12mm', 'kg', 'SCM-ROD'),
(7, 'MAT-ROD-004', 'TMT Rod 16mm', 'डण्डी 16mm', 'kg', 'SCM-ROD'),
(8, 'MAT-ROD-005', 'TMT Rod 20mm', 'डण्डी 20mm', 'kg', 'SCM-ROD'),
(9, 'MAT-SND-001', 'River Sand (Fine)', 'नदी बालुवा', 'cft', 'SCM-SND'),
(10, 'MAT-SND-002', 'Coarse Sand', 'खस्रो बालुवा', 'cft', 'SCM-SND'),
(11, 'MAT-AGG-001', 'Aggregate 20mm', 'गिट्टी 20mm', 'cft', 'SCM-AGG'),
(12, 'MAT-AGG-002', 'Aggregate 40mm', 'गिट्टी 40mm', 'cft', 'SCM-AGG'),
(13, 'MAT-BRK-001', 'Wire Cut Brick', 'इट्टा (तारकट)', 'nos', 'SCM-BRK'),
(14, 'MAT-BRK-002', 'Pressed Brick', 'इट्टा (थिचेको)', 'nos', 'SCM-BRK'),
(15, 'MAT-STN-001', 'Boulder Stone', 'ढुङ्गा', 'cft', 'SCM-STN'),
(16, 'MAT-STN-002', 'Dressed Stone', 'काटेको ढुङ्गा', 'cft', 'SCM-STN'),
(17, 'MAT-DSL-001', 'Diesel', 'डिजेल', 'ltr', 'SFU'),
(18, 'MAT-PTR-001', 'Petrol', 'पेट्रोल', 'ltr', 'SFU'),
(19, 'MAT-OIL-001', 'Engine Oil', 'इन्जिन आयल', 'ltr', 'SFU');

CREATE TABLE IF NOT EXISTS material_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voucher_id INTEGER,
  project_id INTEGER NOT NULL,
  material_id INTEGER NOT NULL,
  supplier_id INTEGER,
  purchase_date_bs TEXT NOT NULL,
  purchase_date_ad TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_rate NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  bill_no TEXT,
  delivery_address TEXT,
  remarks TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (DATETIME('now', 'localtime')),
  FOREIGN KEY (voucher_id) REFERENCES vouchers(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (material_id) REFERENCES materials(id),
  FOREIGN KEY (supplier_id) REFERENCES parties(id)
);

CREATE TABLE IF NOT EXISTS material_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  material_id INTEGER NOT NULL,
  usage_date_bs TEXT NOT NULL,
  usage_date_ad TEXT NOT NULL,
  quantity_used NUMERIC NOT NULL,
  purpose TEXT,
  recorded_by INTEGER,
  created_at TEXT DEFAULT (DATETIME('now', 'localtime')),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (material_id) REFERENCES materials(id)
);

-- 11. EMPLOYEES & LABOUR
CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  emp_code TEXT UNIQUE,
  name TEXT NOT NULL,
  name_np TEXT,
  designation TEXT,
  department TEXT,
  phone TEXT,
  address TEXT,
  join_date_bs TEXT,
  join_date_ad TEXT,
  monthly_salary NUMERIC DEFAULT 0,
  daily_rate NUMERIC DEFAULT 0,
  bank_name TEXT,
  bank_account TEXT,
  pan_no TEXT,
  citizenship_no TEXT,
  is_active INTEGER DEFAULT 1,
  party_id INTEGER,
  created_at TEXT DEFAULT (DATETIME('now', 'localtime')),
  FOREIGN KEY (party_id) REFERENCES parties(id)
);

CREATE TABLE IF NOT EXISTS daily_labour_attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  attendance_date_bs TEXT NOT NULL,
  attendance_date_ad TEXT NOT NULL,
  worker_name TEXT NOT NULL,
  worker_type TEXT DEFAULT 'unskilled',
  quantity NUMERIC DEFAULT 1,
  days_fraction NUMERIC DEFAULT 1,
  daily_rate NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  voucher_id INTEGER,
  remarks TEXT,
  entered_by INTEGER,
  created_at TEXT DEFAULT (DATETIME('now', 'localtime')),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (voucher_id) REFERENCES vouchers(id)
);

CREATE TABLE IF NOT EXISTS salary_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  payment_month_bs TEXT NOT NULL,
  payment_month_ad TEXT,
  gross_salary NUMERIC NOT NULL,
  deductions NUMERIC DEFAULT 0,
  net_salary NUMERIC NOT NULL,
  payment_date_bs TEXT,
  payment_date_ad TEXT,
  voucher_id INTEGER,
  remarks TEXT,
  created_at TEXT DEFAULT (DATETIME('now', 'localtime')),
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (voucher_id) REFERENCES vouchers(id)
);

-- 12. EQUIPMENT
CREATE TABLE IF NOT EXISTS equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_code TEXT UNIQUE,
  equipment_name TEXT NOT NULL,
  equipment_type TEXT DEFAULT 'owned',
  category TEXT,
  owner_party_id INTEGER,
  registration_no TEXT,
  model TEXT,
  purchase_date_ad TEXT,
  purchase_value NUMERIC DEFAULT 0,
  daily_hire_rate NUMERIC DEFAULT 0,
  hourly_hire_rate NUMERIC DEFAULT 0,
  current_project_id INTEGER,
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  FOREIGN KEY (owner_party_id) REFERENCES parties(id),
  FOREIGN KEY (current_project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS equipment_usage_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL,
  usage_date_bs TEXT NOT NULL,
  usage_date_ad TEXT NOT NULL,
  hours_used NUMERIC DEFAULT 0,
  days_used NUMERIC DEFAULT 0,
  fuel_consumed_ltr NUMERIC DEFAULT 0,
  hire_cost NUMERIC DEFAULT 0,
  operator_name TEXT,
  voucher_id INTEGER,
  remarks TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (DATETIME('now', 'localtime')),
  FOREIGN KEY (equipment_id) REFERENCES equipment(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS equipment_maintenance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_id INTEGER NOT NULL,
  maintenance_date_bs TEXT NOT NULL,
  maintenance_date_ad TEXT NOT NULL,
  maintenance_type TEXT DEFAULT 'repair',
  description TEXT,
  cost NUMERIC DEFAULT 0,
  vendor_party_id INTEGER,
  voucher_id INTEGER,
  next_service_date_ad TEXT,
  created_at TEXT DEFAULT (DATETIME('now', 'localtime')),
  FOREIGN KEY (equipment_id) REFERENCES equipment(id),
  FOREIGN KEY (vendor_party_id) REFERENCES parties(id)
);

-- 13. DOUBLE-ENTRY JOURNAL & CHART OF ACCOUNTS
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_code TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  account_name_np TEXT,
  account_type TEXT NOT NULL,
  parent_id INTEGER,
  is_system INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (parent_id) REFERENCES chart_of_accounts(id)
);

INSERT OR IGNORE INTO chart_of_accounts (id, account_code, account_name, account_type, is_system) VALUES
-- Assets
(1, '1000', 'Current Assets', 'asset', 1),
(2, '1010', 'Cash in Hand', 'asset', 1),
(3, '1020', 'Bank Accounts', 'asset', 1),
(4, '1030', 'Accounts Receivable', 'asset', 1),
(5, '1040', 'Material Stock', 'asset', 1),
(6, '1050', 'Advance to Thekedar', 'asset', 1),
(7, '1060', 'Advance to Supplier', 'asset', 1),
(8, '1070', 'Other Current Assets', 'asset', 1),
(9, '1500', 'Fixed Assets', 'asset', 1),
(10, '1510', 'Land & Building', 'asset', 1),
(11, '1520', 'Equipment & Machinery', 'asset', 1),
(12, '1530', 'Vehicles', 'asset', 1),
-- Liabilities
(13, '2000', 'Current Liabilities', 'liability', 1),
(14, '2010', 'Accounts Payable', 'liability', 1),
(15, '2020', 'TDS Payable', 'liability', 1),
(16, '2030', 'VAT Payable', 'liability', 1),
(17, '2040', 'Thekedar Retention', 'liability', 1),
(18, '2050', 'Client Advance Received', 'liability', 1),
(19, '2500', 'Long-term Liabilities', 'liability', 1),
(20, '2510', 'Bank Loans', 'liability', 1),
(21, '2520', 'Personal Loans', 'liability', 1),
-- Equity
(22, '3000', 'Owners Equity', 'equity', 1),
(23, '3010', 'Paid-up Capital', 'equity', 1),
(24, '3020', 'Retained Earnings', 'equity', 1),
(25, '3030', 'Partners Capital', 'equity', 1),
-- Income
(26, '4000', 'Revenue', 'income', 1),
(27, '4010', 'Contract Revenue', 'income', 1),
(28, '4020', 'Other Income', 'income', 1),
-- Expenses
(29, '5000', 'Direct Expenses', 'expense', 1),
(30, '5010', 'Construction Materials', 'expense', 1),
(31, '5020', 'Labour Expenses', 'expense', 1),
(32, '5030', 'Thekedar Payments', 'expense', 1),
(33, '5040', 'Equipment & Fuel', 'expense', 1),
(34, '5050', 'Site Overhead', 'expense', 1),
(35, '6000', 'Administrative Expenses', 'expense', 1),
(36, '6010', 'Staff Salaries', 'expense', 1),
(37, '6020', 'Office Rent', 'expense', 1),
(38, '6030', 'Office Expenses', 'expense', 1),
(39, '6040', 'Vehicle & Transport', 'expense', 1),
(40, '7000', 'Financial Expenses', 'expense', 1),
(41, '7010', 'Interest Expense', 'expense', 1),
(42, '7020', 'Bank Charges', 'expense', 1),
(43, '7030', 'Tax Expenses', 'expense', 1);

CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_no TEXT UNIQUE,
  entry_date_bs TEXT NOT NULL,
  entry_date_ad TEXT NOT NULL,
  narration TEXT NOT NULL,
  project_id INTEGER,
  reference_voucher_id INTEGER,
  total_debit NUMERIC NOT NULL,
  total_credit NUMERIC NOT NULL,
  is_auto INTEGER DEFAULT 0,
  created_by INTEGER,
  created_at TEXT DEFAULT (DATETIME('now', 'localtime')),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (reference_voucher_id) REFERENCES vouchers(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  journal_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  debit_amount NUMERIC DEFAULT 0,
  credit_amount NUMERIC DEFAULT 0,
  description TEXT,
  FOREIGN KEY (journal_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
);

-- 14. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id INTEGER,
  old_data TEXT,
  new_data TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (DATETIME('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- SQLITE VIEWS
-- ============================================================

DROP VIEW IF EXISTS v_voucher_summary;
CREATE VIEW v_voucher_summary AS
SELECT
  v.id,
  v.voucher_no,
  v.voucher_type,
  v.voucher_date_bs,
  v.voucher_date_ad,
  v.fiscal_year,
  v.project_id,
  p.project_name,
  p.project_code,
  v.party_id,
  py.party_name,
  py.party_type,
  py.phone AS party_phone,
  py.pan_no AS party_pan,
  v.category_id,
  ec.name AS category_name,
  v.account_id,
  ca.account_name AS paid_from,
  v.payment_mode,
  v.bank_name,
  v.cheque_no,
  v.cheque_date_bs,
  v.bank_voucher_no,
  v.cash_receiver_name,
  v.cash_receiver_phone,
  v.cash_handed_by,
  v.bill_no,
  v.narration,
  v.gross_amount,
  v.tds_percent,
  v.tds_amount,
  v.net_amount,
  v.status,
  u.name AS entered_by_name,
  ap.name AS approved_by_name,
  v.approved_at,
  v.created_at
FROM vouchers v
LEFT JOIN projects p ON v.project_id = p.id
LEFT JOIN parties py ON v.party_id = py.id
LEFT JOIN expense_categories ec ON v.category_id = ec.id
LEFT JOIN company_accounts ca ON v.account_id = ca.id
LEFT JOIN users u ON v.entered_by = u.id
LEFT JOIN users ap ON v.approved_by = ap.id;

DROP VIEW IF EXISTS v_project_expense_summary;
CREATE VIEW v_project_expense_summary AS
SELECT
  p.id AS project_id,
  p.project_code,
  p.project_name,
  p.project_type,
  p.status,
  p.budget_total,
  COALESCE(SUM(CASE WHEN v.voucher_type='payment' AND v.status='approved' THEN v.net_amount ELSE 0 END), 0) AS total_spent,
  p.budget_total - COALESCE(SUM(CASE WHEN v.voucher_type='payment' AND v.status='approved' THEN v.net_amount ELSE 0 END), 0) AS budget_remaining
FROM projects p
LEFT JOIN vouchers v ON p.id = v.project_id
GROUP BY p.id, p.project_code, p.project_name, p.project_type, p.status, p.budget_total;

DROP VIEW IF EXISTS v_party_balance;
CREATE VIEW v_party_balance AS
SELECT
  py.id,
  py.party_code,
  py.party_name,
  py.party_type,
  py.opening_balance,
  COALESCE(SUM(CASE WHEN v.voucher_type='payment' AND v.status='approved' THEN v.net_amount ELSE 0 END), 0) AS total_paid,
  COALESCE(SUM(CASE WHEN v.voucher_type='receipt' AND v.status='approved' THEN v.net_amount ELSE 0 END), 0) AS total_received,
  py.opening_balance +
    COALESCE(SUM(CASE WHEN v.voucher_type='payment' AND v.status='approved' THEN v.net_amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN v.voucher_type='receipt' AND v.status='approved' THEN v.net_amount ELSE 0 END), 0)
  AS current_balance
FROM parties py
LEFT JOIN vouchers v ON py.id = v.party_id
GROUP BY py.id, py.party_code, py.party_name, py.party_type, py.opening_balance;
