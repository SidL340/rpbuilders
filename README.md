# R.P. Builders Pvt Ltd — Construction Accounting Portal

A comprehensive, locally-hosted digital accounting and project management portal designed specifically for Nepal-based construction companies.

---

## 🏗️ Key Modules Built & Included

1. **Dashboard & Power BI Style Analytics**: Real-time KPI cards, monthly BS expenditure trends, category pie charts, project budget utilization, and recent vouchers.
2. **Project / Site Management (Solo & JV)**: Track solo projects and joint ventures (with partner name, share %, client details, and budgets).
3. **Daily Day Book (दैनिक रोजनामचा)**: Digital day book with Nepali Bikram Sambat (BS) date picker, debit/credit totals, and printable official registers.
4. **Voucher Entry & Live Receipt Preview**: Automated voucher numbering (`PV-2082-0001`), TDS tax auto-calculation (1.5%, 5%, 15%), amount in words (NPR), and printable slips.
5. **Thekedar / Thekka Subcontractor Ledger**: Work orders, running bills, retention withholdings, advance adjustments, and TDS deductions.
6. **Material Procurement & Stock Inventory**: Cement, rod, sand, aggregate, brick tracking with purchase records and on-site consumption logs.
7. **Fund & Loan (साहु) Management**: Track personal borrowings from individuals/sahu, bank overdrafts, owner capital, and client advances.
8. **Employees & Daily Labour Wages (मजदुर ज्याला)**: Permanent staff payroll and daily labour muster roll entry with group rates.
9. **Equipment, Lease & Machinery Repair**: Machine operating hours, diesel consumption logs, and repair expense vouchers.
10. **Reports & Ledgers**: Category-wise expense summary, Project-wise Profit & Loss (P&L), Double-entry Trial Balance, and Party Statements.
11. **Multi-Role Access Control**: Super Admin, Manager, Accountant, and Site Supervisor roles.

---

## 🚀 Quick Start Guide (Local Server)

### Prerequisites
1. **Node.js** (v18 or higher) — Already installed
2. **XAMPP / MySQL** — Start Apache and MySQL from XAMPP Control Panel

---

### Step 1: Initialize Database
Make sure MySQL is running in XAMPP (default port `3306`, user `root`, no password).

Open terminal in `rp-builders-server`:
```powershell
cd "C:\Users\ACER\Desktop\ALL PROGRAMMING\RP\rp-builders-server"
npm run init-db
```
*This will automatically create `rp_builders_db` with all 30+ tables, views, chart of accounts, expense categories, and realistic sample Nepali construction data.*

---

### Step 2: Start Backend Server
```powershell
cd "C:\Users\ACER\Desktop\ALL PROGRAMMING\RP\rp-builders-server"
npm start
```
*Server will start on `http://localhost:5000`.*

---

### Step 3: Start React Frontend
In a new terminal:
```powershell
cd "C:\Users\ACER\Desktop\ALL PROGRAMMING\RP\rp-builders-client"
npm run dev
```
*Client will open on `http://localhost:5173`.*

---

## 🔑 Default Login Credentials
- **Username:** `admin`
- **Password:** `password`

---

## 🌐 Local Network (LAN) Office Access
To access the accounting portal from other computers or laptops in the office:
1. Check your server PC's local IP address (e.g. `ipconfig` -> `192.168.1.100`).
2. Other office PCs can open browser and navigate to:
   `http://192.168.1.100:5173`
