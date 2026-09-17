-- ============================================================
-- R.P. Builders Pvt Ltd — Complete MySQL Database Schema
-- Nepal Construction Company Accounting System
-- Created: 2082 BS (2025 AD)
-- ============================================================

-- Cloud & Local Safe: Create tables within the currently connected database
-- ============================================================
-- 1. SYSTEM / SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS company_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_name VARCHAR(200) DEFAULT 'R.P. Builders Pvt Ltd',
  company_name_np VARCHAR(200),
  company_address VARCHAR(500),
  company_phone VARCHAR(50),
  company_email VARCHAR(200),
  company_pan VARCHAR(50),
  company_logo_path VARCHAR(500),
  company_logo_data LONGTEXT,
  fiscal_year_start VARCHAR(20) DEFAULT '2082-04-01',
  currency VARCHAR(10) DEFAULT 'NPR',
  date_format ENUM('BS', 'AD') DEFAULT 'BS',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO company_settings (company_name, company_address, company_phone, company_pan)
VALUES ('R.P. Builders Pvt Ltd', 'Nepal', '977-', '');

-- ============================================================
-- 2. USERS & ROLES
-- ============================================================

CREATE TABLE roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_name VARCHAR(50) NOT NULL UNIQUE,
  role_label VARCHAR(100),
  permissions JSON COMMENT 'Array of permission strings',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (role_name, role_label, permissions) VALUES
('super_admin', 'Super Admin', '["all"]'),
('manager', 'Manager', '["view_all","create","edit","approve","reports","dashboard"]'),
('accountant', 'Accountant', '["view_all","create","edit","journal","reports"]'),
('site_supervisor', 'Site Supervisor', '["create_site_entry","view_site","reports_site"]'),
('entry_operator', 'Entry Operator', '["create_voucher","view_basic"]');

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(200) UNIQUE,
  password_hash VARCHAR(500) NOT NULL,
  role_id INT NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  profile_image VARCHAR(500),
  is_active TINYINT(1) DEFAULT 1,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Default admin user
INSERT INTO users (name, username, email, password_hash, role_id, phone)
VALUES (
  'System Administrator',
  'admin@rpbuilders',
  'admin@rpbuilders.com',
  '$2b$10$rARmz3xy2qLI7Lpa3zgxoeIwdso0PkCwbMzvff2KW88b2BPVs/bti', -- password: RPBUILDERS2026
  1,
  '9800000000'
);

CREATE TABLE user_site_access (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  site_id INT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_user_site (user_id, site_id)
);

-- ============================================================
-- 3. PROJECTS / SITES
-- ============================================================

CREATE TABLE projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_code VARCHAR(50) NOT NULL UNIQUE COMMENT 'e.g. RP-2082-001',
  project_name VARCHAR(500) NOT NULL,
  project_name_np VARCHAR(500),
  site_address TEXT,
  site_ward VARCHAR(100),
  site_municipality VARCHAR(200),
  site_district VARCHAR(100),

  project_type ENUM('solo', 'joint_venture') DEFAULT 'solo',

  -- Main client (who hired RP Builders)
  main_client_name VARCHAR(300),
  main_client_phone VARCHAR(50),
  main_client_address TEXT,
  contract_value DECIMAL(15,2) DEFAULT 0,

  -- JV partner (if joint_venture)
  partner_company_name VARCHAR(300),
  partner_company_address TEXT,
  rp_share_percent DECIMAL(5,2) DEFAULT 100,
  partner_share_percent DECIMAL(5,2) DEFAULT 0,

  start_date_bs VARCHAR(20),
  start_date_ad DATE,
  expected_end_date_bs VARCHAR(20),
  expected_end_date_ad DATE,
  actual_end_date_bs VARCHAR(20),
  actual_end_date_ad DATE,

  budget_total DECIMAL(15,2) DEFAULT 0,
  status ENUM('planning','active','on_hold','completed','closed') DEFAULT 'planning',
  description TEXT,

  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================================
-- 4. PARTIES (Thekedar, Supplier, Labour, etc.)
-- ============================================================

CREATE TABLE parties (
  id INT PRIMARY KEY AUTO_INCREMENT,
  party_code VARCHAR(50) NOT NULL UNIQUE,
  party_name VARCHAR(300) NOT NULL,
  party_name_np VARCHAR(300),
  party_type ENUM(
    'thekedar',
    'supplier',
    'labour',
    'equipment_owner',
    'office_vendor',
    'employee',
    'loan_provider',
    'transport',
    'utility',
    'client',
    'partner_company',
    'government',
    'other'
  ) NOT NULL,
  phone VARCHAR(50),
  secondary_phone VARCHAR(50),
  email VARCHAR(200),
  address TEXT,
  district VARCHAR(100),

  pan_no VARCHAR(50) COMMENT 'PAN number for TDS',
  vat_no VARCHAR(50),

  bank_name VARCHAR(200),
  bank_account_no VARCHAR(100),
  bank_branch VARCHAR(200),

  opening_balance DECIMAL(15,2) DEFAULT 0 COMMENT 'Positive = we owe them, Negative = they owe us',
  is_active TINYINT(1) DEFAULT 1,
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================================
-- 5. EXPENSE CATEGORIES & SUBCATEGORIES
-- ============================================================

CREATE TABLE expense_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  name_np VARCHAR(200),
  parent_id INT NULL,
  icon VARCHAR(100),
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  FOREIGN KEY (parent_id) REFERENCES expense_categories(id)
);

-- Main Categories
INSERT INTO expense_categories (id, code, name, name_np, parent_id, icon, sort_order) VALUES
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
INSERT INTO expense_categories (code, name, name_np, parent_id, sort_order) VALUES
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

-- ============================================================
-- 6. BANKS & ACCOUNTS
-- ============================================================

CREATE TABLE banks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bank_name VARCHAR(200) NOT NULL,
  bank_short VARCHAR(50),
  is_active TINYINT(1) DEFAULT 1
);

INSERT INTO banks (bank_name, bank_short) VALUES
('Rastriya Banijya Bank', 'RBB'),
('Nepal Bank Limited', 'NBL'),
('Agriculture Development Bank', 'ADBL'),
('Nabil Bank', 'NABIL'),
('Nepal Investment Mega Bank', 'NIMB'),
('Everest Bank', 'EBL'),
('Global IME Bank', 'GIBL'),
('Sanima Bank', 'SANIMA'),
('Prabhu Bank', 'PRABHU'),
('NIC Asia Bank', 'NICA'),
('Citizens Bank', 'CBL'),
('Machhapuchchhre Bank', 'MBL'),
('Cash', 'CASH');

CREATE TABLE company_accounts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  account_name VARCHAR(200) NOT NULL COMMENT 'e.g. Main Cash, Office Cash, RBB Account',
  account_type ENUM('cash', 'bank', 'mobile_banking') NOT NULL,
  bank_id INT,
  account_number VARCHAR(100),
  account_holder_name VARCHAR(200),
  branch VARCHAR(200),
  opening_balance DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  FOREIGN KEY (bank_id) REFERENCES banks(id)
);

INSERT INTO company_accounts (account_name, account_type, bank_id, opening_balance, current_balance)
VALUES ('Main Cash', 'cash', (SELECT id FROM banks WHERE bank_short='CASH'), 0, 0);

-- ============================================================
-- 7. FUND SOURCES (Where money comes from)
-- ============================================================

CREATE TABLE fund_sources (
  id INT PRIMARY KEY AUTO_INCREMENT,
  source_code VARCHAR(50) UNIQUE,
  source_name VARCHAR(300) NOT NULL,
  source_type ENUM(
    'owners_capital',
    'bank_loan',
    'personal_loan',
    'partner_contribution',
    'client_advance',
    'revenue',
    'equipment_sale',
    'other_income'
  ) NOT NULL,
  party_id INT NULL COMMENT 'Person/bank giving the loan or contribution',
  total_sanctioned_amount DECIMAL(15,2) DEFAULT 0,
  interest_rate DECIMAL(5,2) DEFAULT 0 COMMENT 'Annual % if loan',
  notes TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (party_id) REFERENCES parties(id)
);

CREATE TABLE fund_receipts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  receipt_no VARCHAR(50) UNIQUE,
  receipt_date_bs VARCHAR(20) NOT NULL,
  receipt_date_ad DATE NOT NULL,
  fund_source_id INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_mode ENUM('cash','cheque','bank_transfer','online') DEFAULT 'cash',
  account_id INT COMMENT 'Which company account received the money',
  bank_ref VARCHAR(200),
  cheque_no VARCHAR(100),
  description TEXT,
  received_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fund_source_id) REFERENCES fund_sources(id),
  FOREIGN KEY (account_id) REFERENCES company_accounts(id),
  FOREIGN KEY (received_by) REFERENCES users(id)
);

-- ============================================================
-- 8. VOUCHERS (Day Book — Main Transaction Table)
-- ============================================================

CREATE TABLE IF NOT EXISTS vouchers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  voucher_no VARCHAR(50) NOT NULL UNIQUE COMMENT 'PV-2082-0001',
  voucher_type ENUM('payment','receipt','journal','contra','debit_note','credit_note') NOT NULL,
  voucher_date_bs VARCHAR(20) NOT NULL,
  voucher_date_ad DATE NOT NULL,
  fiscal_year VARCHAR(20) DEFAULT '2083/84',

  -- Linking
  project_id INT NULL COMMENT 'NULL = office/general expense',
  party_id INT NULL,
  account_id INT NOT NULL COMMENT 'Cash/bank account affected',
  fund_source_id INT NULL,

  -- Payment details
  payment_mode ENUM('cash','cheque','bank_transfer','online','multiple') DEFAULT 'cash',
  bank_name VARCHAR(200),
  cheque_no VARCHAR(100),
  cheque_date_bs VARCHAR(20),
  bank_voucher_no VARCHAR(100),
  cash_receiver_name VARCHAR(200),
  cash_receiver_phone VARCHAR(50),
  cash_handed_by VARCHAR(200),
  reference_no VARCHAR(200),

  -- Category
  category_id INT,

  -- Description
  narration TEXT NOT NULL,

  -- Amounts
  gross_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  tds_percent DECIMAL(5,2) DEFAULT 0,
  tds_amount DECIMAL(15,2) DEFAULT 0,
  net_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Status
  status ENUM('draft','approved','cancelled') DEFAULT 'draft',
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,

  -- Attachments
  bill_image_path VARCHAR(1000),
  bill_no VARCHAR(200),

  remarks TEXT,
  entered_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (party_id) REFERENCES parties(id),
  FOREIGN KEY (account_id) REFERENCES company_accounts(id),
  FOREIGN KEY (category_id) REFERENCES expense_categories(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (entered_by) REFERENCES users(id)
);

-- ============================================================
-- 9. THEKEDAR WORK ORDERS & PAYMENTS
-- ============================================================

CREATE TABLE thekedar_work_orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  work_order_no VARCHAR(50) UNIQUE,
  project_id INT NOT NULL,
  thekedar_id INT NOT NULL COMMENT 'party_id with type=thekedar',
  work_description TEXT NOT NULL,
  work_type VARCHAR(200) COMMENT 'Earthwork, Masonry, etc.',
  unit VARCHAR(50) COMMENT 'RFT, SFT, CUM, LST',
  quantity DECIMAL(10,2),
  unit_rate DECIMAL(10,2),
  total_contract_amount DECIMAL(15,2) NOT NULL,
  advance_paid DECIMAL(15,2) DEFAULT 0,
  total_paid DECIMAL(15,2) DEFAULT 0,
  retention_percent DECIMAL(5,2) DEFAULT 0,
  tds_percent DECIMAL(5,2) DEFAULT 1.5,
  completion_percent DECIMAL(5,2) DEFAULT 0,
  start_date_bs VARCHAR(20),
  start_date_ad DATE,
  end_date_bs VARCHAR(20),
  end_date_ad DATE,
  status ENUM('active','completed','terminated','on_hold') DEFAULT 'active',
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (thekedar_id) REFERENCES parties(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE thekedar_payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  work_order_id INT NOT NULL,
  voucher_id INT COMMENT 'Links to main voucher',
  payment_date_bs VARCHAR(20) NOT NULL,
  payment_date_ad DATE NOT NULL,
  bill_no VARCHAR(100),
  gross_amount DECIMAL(15,2) NOT NULL,
  retention_amount DECIMAL(15,2) DEFAULT 0,
  tds_amount DECIMAL(15,2) DEFAULT 0,
  advance_adjusted DECIMAL(15,2) DEFAULT 0,
  net_amount DECIMAL(15,2) NOT NULL,
  payment_type ENUM('advance','running_bill','final_bill','retention_release') DEFAULT 'running_bill',
  work_completion_percent DECIMAL(5,2),
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (work_order_id) REFERENCES thekedar_work_orders(id),
  FOREIGN KEY (voucher_id) REFERENCES vouchers(id)
);

-- ============================================================
-- 10. MATERIALS / INVENTORY
-- ============================================================

CREATE TABLE materials (
  id INT PRIMARY KEY AUTO_INCREMENT,
  material_code VARCHAR(50) UNIQUE,
  material_name VARCHAR(200) NOT NULL,
  material_name_np VARCHAR(200),
  unit ENUM('bag','kg','ton','cft','cum','nos','meter','rft','sft','ltr','bundle','rod','sheet','box','pair','set','other') NOT NULL,
  category_code VARCHAR(20),
  notes TEXT,
  is_active TINYINT(1) DEFAULT 1
);

INSERT INTO materials (material_code, material_name, material_name_np, unit, category_code) VALUES
('MAT-CEM-001', 'Cement (OPC 43)', 'सिमेन्ट (OPC 43)', 'bag', 'SCM-CEM'),
('MAT-CEM-002', 'Cement (OPC 53)', 'सिमेन्ट (OPC 53)', 'bag', 'SCM-CEM'),
('MAT-CEM-003', 'White Cement', 'सेतो सिमेन्ट', 'bag', 'SCM-CEM'),
('MAT-ROD-001', 'TMT Rod 8mm', 'डण्डी 8mm', 'kg', 'SCM-ROD'),
('MAT-ROD-002', 'TMT Rod 10mm', 'डण्डी 10mm', 'kg', 'SCM-ROD'),
('MAT-ROD-003', 'TMT Rod 12mm', 'डण्डी 12mm', 'kg', 'SCM-ROD'),
('MAT-ROD-004', 'TMT Rod 16mm', 'डण्डी 16mm', 'kg', 'SCM-ROD'),
('MAT-ROD-005', 'TMT Rod 20mm', 'डण्डी 20mm', 'kg', 'SCM-ROD'),
('MAT-SND-001', 'River Sand (Fine)', 'नदी बालुवा', 'cft', 'SCM-SND'),
('MAT-SND-002', 'Coarse Sand', 'खस्रो बालुवा', 'cft', 'SCM-SND'),
('MAT-AGG-001', 'Aggregate 20mm', 'गिट्टी 20mm', 'cft', 'SCM-AGG'),
('MAT-AGG-002', 'Aggregate 40mm', 'गिट्टी 40mm', 'cft', 'SCM-AGG'),
('MAT-BRK-001', 'Wire Cut Brick', 'इट्टा (तारकट)', 'nos', 'SCM-BRK'),
('MAT-BRK-002', 'Pressed Brick', 'इट्टा (थिचेको)', 'nos', 'SCM-BRK'),
('MAT-STN-001', 'Boulder Stone', 'ढुङ्गा', 'cft', 'SCM-STN'),
('MAT-STN-002', 'Dressed Stone', 'काटेको ढुङ्गा', 'cft', 'SCM-STN'),
('MAT-DSL-001', 'Diesel', 'डिजेल', 'ltr', 'SFU'),
('MAT-PTR-001', 'Petrol', 'पेट्रोल', 'ltr', 'SFU'),
('MAT-OIL-001', 'Engine Oil', 'इन्जिन आयल', 'ltr', 'SFU');

CREATE TABLE material_purchases (
  id INT PRIMARY KEY AUTO_INCREMENT,
  voucher_id INT,
  project_id INT NOT NULL,
  material_id INT NOT NULL,
  supplier_id INT COMMENT 'party_id',
  purchase_date_bs VARCHAR(20) NOT NULL,
  purchase_date_ad DATE NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_rate DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  bill_no VARCHAR(200),
  delivery_address TEXT,
  remarks TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (voucher_id) REFERENCES vouchers(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (material_id) REFERENCES materials(id),
  FOREIGN KEY (supplier_id) REFERENCES parties(id)
);

CREATE TABLE material_usage (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  material_id INT NOT NULL,
  usage_date_bs VARCHAR(20) NOT NULL,
  usage_date_ad DATE NOT NULL,
  quantity_used DECIMAL(10,2) NOT NULL,
  purpose TEXT,
  recorded_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (material_id) REFERENCES materials(id)
);

-- ============================================================
-- 11. EMPLOYEES & LABOUR
-- ============================================================

CREATE TABLE employees (
  id INT PRIMARY KEY AUTO_INCREMENT,
  emp_code VARCHAR(50) UNIQUE,
  name VARCHAR(200) NOT NULL,
  name_np VARCHAR(200),
  designation VARCHAR(200),
  department VARCHAR(200),
  phone VARCHAR(50),
  address TEXT,
  join_date_bs VARCHAR(20),
  join_date_ad DATE,
  monthly_salary DECIMAL(10,2) DEFAULT 0,
  daily_rate DECIMAL(10,2) DEFAULT 0,
  bank_name VARCHAR(200),
  bank_account VARCHAR(100),
  pan_no VARCHAR(50),
  citizenship_no VARCHAR(100),
  is_active TINYINT(1) DEFAULT 1,
  party_id INT COMMENT 'Links to parties table for ledger',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (party_id) REFERENCES parties(id)
);

CREATE TABLE daily_labour_attendance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  attendance_date_bs VARCHAR(20) NOT NULL,
  attendance_date_ad DATE NOT NULL,
  worker_name VARCHAR(200) NOT NULL,
  worker_type ENUM('mason','helper','unskilled','electrician','plumber','carpenter','painter','other') DEFAULT 'unskilled',
  quantity DECIMAL(5,2) DEFAULT 1 COMMENT 'Number of workers',
  days_fraction DECIMAL(4,2) DEFAULT 1 COMMENT '1=full day, 0.5=half day',
  daily_rate DECIMAL(8,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  voucher_id INT,
  remarks TEXT,
  entered_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (voucher_id) REFERENCES vouchers(id)
);

CREATE TABLE salary_payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  payment_month_bs VARCHAR(20) NOT NULL COMMENT 'e.g. 2082-05',
  payment_month_ad VARCHAR(20),
  gross_salary DECIMAL(10,2) NOT NULL,
  deductions DECIMAL(10,2) DEFAULT 0,
  net_salary DECIMAL(10,2) NOT NULL,
  payment_date_bs VARCHAR(20),
  payment_date_ad DATE,
  voucher_id INT,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (voucher_id) REFERENCES vouchers(id)
);

-- ============================================================
-- 12. EQUIPMENT
-- ============================================================

CREATE TABLE equipment (
  id INT PRIMARY KEY AUTO_INCREMENT,
  equipment_code VARCHAR(50) UNIQUE,
  equipment_name VARCHAR(200) NOT NULL,
  equipment_type ENUM('owned','hired') DEFAULT 'owned',
  category VARCHAR(100) COMMENT 'JCB, Mixer, Vehicle, etc.',
  owner_party_id INT NULL COMMENT 'If hired, who owns it',
  registration_no VARCHAR(100),
  model VARCHAR(200),
  purchase_date_ad DATE NULL,
  purchase_value DECIMAL(12,2) DEFAULT 0,
  daily_hire_rate DECIMAL(10,2) DEFAULT 0,
  hourly_hire_rate DECIMAL(10,2) DEFAULT 0,
  current_project_id INT NULL,
  is_active TINYINT(1) DEFAULT 1,
  notes TEXT,
  FOREIGN KEY (owner_party_id) REFERENCES parties(id),
  FOREIGN KEY (current_project_id) REFERENCES projects(id)
);

CREATE TABLE equipment_usage_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  equipment_id INT NOT NULL,
  project_id INT NOT NULL,
  usage_date_bs VARCHAR(20) NOT NULL,
  usage_date_ad DATE NOT NULL,
  hours_used DECIMAL(6,2) DEFAULT 0,
  days_used DECIMAL(5,2) DEFAULT 0,
  fuel_consumed_ltr DECIMAL(8,2) DEFAULT 0,
  hire_cost DECIMAL(10,2) DEFAULT 0,
  operator_name VARCHAR(200),
  voucher_id INT,
  remarks TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE equipment_maintenance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  equipment_id INT NOT NULL,
  maintenance_date_bs VARCHAR(20) NOT NULL,
  maintenance_date_ad DATE NOT NULL,
  maintenance_type ENUM('repair','service','tyre_change','oil_change','other') DEFAULT 'repair',
  description TEXT,
  cost DECIMAL(10,2) DEFAULT 0,
  vendor_party_id INT,
  voucher_id INT,
  next_service_date_ad DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id),
  FOREIGN KEY (vendor_party_id) REFERENCES parties(id)
);

-- ============================================================
-- 13. DOUBLE-ENTRY JOURNAL
-- ============================================================

CREATE TABLE chart_of_accounts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  account_code VARCHAR(20) NOT NULL UNIQUE,
  account_name VARCHAR(200) NOT NULL,
  account_name_np VARCHAR(200),
  account_type ENUM('asset','liability','equity','income','expense') NOT NULL,
  parent_id INT NULL,
  is_system TINYINT(1) DEFAULT 0 COMMENT 'System accounts cannot be deleted',
  is_active TINYINT(1) DEFAULT 1,
  FOREIGN KEY (parent_id) REFERENCES chart_of_accounts(id)
);

-- Standard chart of accounts
INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_system) VALUES
-- Assets
('1000', 'Current Assets', 'asset', 1),
('1010', 'Cash in Hand', 'asset', 1),
('1020', 'Bank Accounts', 'asset', 1),
('1030', 'Accounts Receivable', 'asset', 1),
('1040', 'Material Stock', 'asset', 1),
('1050', 'Advance to Thekedar', 'asset', 1),
('1060', 'Advance to Supplier', 'asset', 1),
('1070', 'Other Current Assets', 'asset', 1),
('1500', 'Fixed Assets', 'asset', 1),
('1510', 'Land & Building', 'asset', 1),
('1520', 'Equipment & Machinery', 'asset', 1),
('1530', 'Vehicles', 'asset', 1),
-- Liabilities
('2000', 'Current Liabilities', 'liability', 1),
('2010', 'Accounts Payable', 'liability', 1),
('2020', 'TDS Payable', 'liability', 1),
('2030', 'VAT Payable', 'liability', 1),
('2040', 'Thekedar Retention', 'liability', 1),
('2050', 'Client Advance Received', 'liability', 1),
('2500', 'Long-term Liabilities', 'liability', 1),
('2510', 'Bank Loans', 'liability', 1),
('2520', 'Personal Loans', 'liability', 1),
-- Equity
('3000', 'Owners Equity', 'equity', 1),
('3010', 'Paid-up Capital', 'equity', 1),
('3020', 'Retained Earnings', 'equity', 1),
('3030', 'Partners Capital', 'equity', 1),
-- Income
('4000', 'Revenue', 'income', 1),
('4010', 'Contract Revenue', 'income', 1),
('4020', 'Other Income', 'income', 1),
-- Expenses
('5000', 'Direct Expenses', 'expense', 1),
('5010', 'Construction Materials', 'expense', 1),
('5020', 'Labour Expenses', 'expense', 1),
('5030', 'Thekedar Payments', 'expense', 1),
('5040', 'Equipment & Fuel', 'expense', 1),
('5050', 'Site Overhead', 'expense', 1),
('6000', 'Administrative Expenses', 'expense', 1),
('6010', 'Staff Salaries', 'expense', 1),
('6020', 'Office Rent', 'expense', 1),
('6030', 'Office Expenses', 'expense', 1),
('6040', 'Vehicle & Transport', 'expense', 1),
('7000', 'Financial Expenses', 'expense', 1),
('7010', 'Interest Expense', 'expense', 1),
('7020', 'Bank Charges', 'expense', 1),
('7030', 'Tax Expenses', 'expense', 1);

CREATE TABLE journal_entries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  entry_no VARCHAR(50) UNIQUE,
  entry_date_bs VARCHAR(20) NOT NULL,
  entry_date_ad DATE NOT NULL,
  narration TEXT NOT NULL,
  project_id INT NULL,
  reference_voucher_id INT NULL,
  total_debit DECIMAL(15,2) NOT NULL,
  total_credit DECIMAL(15,2) NOT NULL,
  is_auto TINYINT(1) DEFAULT 0 COMMENT 'Auto-generated from voucher',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (reference_voucher_id) REFERENCES vouchers(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE journal_entry_lines (
  id INT PRIMARY KEY AUTO_INCREMENT,
  journal_id INT NOT NULL,
  account_id INT NOT NULL,
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  description TEXT,
  FOREIGN KEY (journal_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
);

-- ============================================================
-- 14. AUDIT LOG
-- ============================================================

CREATE TABLE audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action ENUM('create','update','delete','login','logout','approve','cancel') NOT NULL,
  table_name VARCHAR(100),
  record_id INT,
  old_data JSON,
  new_data JSON,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- VIEWS (for easy reporting)
-- ============================================================

CREATE OR REPLACE VIEW v_voucher_summary AS
SELECT
  v.id,
  v.voucher_no,
  v.voucher_type,
  v.voucher_date_bs,
  v.voucher_date_ad,
  p.project_name,
  p.project_code,
  py.party_name,
  py.party_type,
  ec.name AS category_name,
  ca.account_name AS paid_from,
  v.narration,
  v.gross_amount,
  v.tds_amount,
  v.net_amount,
  v.payment_mode,
  v.status,
  u.name AS entered_by_name,
  ap.name AS approved_by_name
FROM vouchers v
LEFT JOIN projects p ON v.project_id = p.id
LEFT JOIN parties py ON v.party_id = py.id
LEFT JOIN expense_categories ec ON v.category_id = ec.id
LEFT JOIN company_accounts ca ON v.account_id = ca.id
LEFT JOIN users u ON v.entered_by = u.id
LEFT JOIN users ap ON v.approved_by = ap.id;

CREATE OR REPLACE VIEW v_project_expense_summary AS
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

CREATE OR REPLACE VIEW v_party_balance AS
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
