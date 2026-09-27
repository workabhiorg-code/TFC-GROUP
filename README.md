# TFC GROUP — Multi-Enterprise Resource & POS Platform

> **Priority Enterprise Order:**
> 1. **Fish Transport Trade** *(Flagship #1 — Active & Live)*
> 2. **Catering & Events** *(Next Up)*
> 3. **Stone Mining & Crusher**
> 4. **Construction & Sites**
> 5. **Pragati Retail Outlet** *(Live POS)*
> 6. **Poultry Farm & Hatchery**
> 7. **Consolidated Group HQ**

---

## 🌊 Overview

The **TFC GROUP Enterprise Platform** is a unified multi-enterprise POS and ERP solution built for Google Apps Script, web browsers, and edge static hosting (Cloudflare Pages).

### Current Completed Phases:
- **Phase 1 — Shared Foundation:** Centralized configuration, authentication roles, audit logging, validation engine, and double-entry ledger primitives.
- **Phase 2 — Fish Master Data:** Comprehensive catalogs for Species (local Odia & common names), Quality Grades, Wholesale/Retail Buyers & Sellers, Auction Mandis, Co-op Suppliers, Fleet & Drivers, Daily Market Benchmark Rates, and Hub Destinations.
- **Phase 3 — Fish Procurement & Weighbridge Terminal:** Dual-weighing gross/tare/shrinkage weighbridge terminal, automated fish lot creation (`FSH-LOT-YYYYMMDD-XXX`), commercial billing calculations, idempotent seller ledger movements (`FISH_Seller_Ledger`), and 80mm thermal receipt slip generator.

---

## 🚀 Pushing to GitHub & Deploying to Cloudflare Pages

### Option A: Deploy via GitHub + Cloudflare Pages (Recommended)

#### 1. Push Code to GitHub
```bash
# Initialize git if not already initialized
git init

# Stage all files
git add .

# Create commit
git commit -m "feat: TFC GROUP Fish Transport ERP Phase 3 complete with Cloudflare Pages & GitHub readiness"

# Link to your GitHub repository (replace with your repository URL)
git remote add origin https://github.com/YOUR_USERNAME/tfc-group-erp.git
git branch -M main
git push -u origin main
```

#### 2. Connect to Cloudflare Pages Dashboard
1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/) and go to **Workers & Pages** > **Pages** > **Connect to Git**.
2. Select your GitHub repository (`tfc-group-erp`).
3. Set the build configuration:
   - **Framework preset:** `None`
   - **Build command:** *(leave empty or `npm run build`)*
   - **Build output directory:** `.` *(or leave as root directory)*
4. Click **Save and Deploy**. Cloudflare Pages will build and give you a live production URL (e.g. `https://tfc-group-erp.pages.dev`).

---

### Option B: Direct CLI Deployment to Cloudflare Pages (Instant)

You can deploy directly to Cloudflare Pages without a GitHub repository using Wrangler:

```bash
# Deploy the current folder directly
npx wrangler pages deploy . --project-name tfc-group-erp
```

---

### Option C: Sync with Google Apps Script

To push backend files to Google Apps Script:

```bash
# Push all .gs and index.html files
clasp push
```

---

## 🧪 Automated Testing

Run the full automated unit test suite (139 / 139 tests covering Phase 1, Phase 2, and Phase 3):

```bash
# Run all test suites
npm test

# Run individual test phases
npm run test:phase1
npm run test:phase2
npm run test:phase3
```

---

## 📁 Repository Structure

```
├── .gitignore                      # Git & deployment ignore patterns
├── _headers                        # Cloudflare Pages security & caching headers
├── package.json                    # Project scripts & configuration
├── index.html                      # Single-page application interface
├── Config.gs                       # Core platform configuration & priority registry
├── Core_Utils.gs                   # Shared utilities, math, date & formatting helpers
├── Core_Data.gs                    # Sheet repository database abstractions
├── Core_Validation.gs              # Financial, weighbridge & schema validators
├── Core_Auth.gs                    # Role-based access control (RBAC)
├── Core_Audit.gs                   # Immutable audit logging engine
├── Fish_Master.gs                  # Fish master catalog CRUD & Seller Ledger
├── Fish_Procurement.gs             # Weighbridge inward, lot generator & vouchers
├── Fish_Setup.gs                   # Repeat-safe database setup for 13 Fish sheets
├── Test_Phase1.gs / test_phase1.js # Phase 1 unit test harness (50 tests)
├── Test_Phase2.gs / test_phase2.js # Phase 2 unit test harness (38 tests)
├── Test_Phase3.gs / test_phase3.js # Phase 3 unit test harness (51 tests)
├── PHASE_0_CODEBASE_AUDIT.md       # Initial architectural audit
├── PHASE_1_IMPLEMENTATION_REPORT.md# Phase 1 delivery report
├── PHASE_2_IMPLEMENTATION_REPORT.md# Phase 2 delivery report
└── PHASE_3_IMPLEMENTATION_REPORT.md# Phase 3 delivery report
```

---

## 🛡️ Theme & Design Tokens

- **Brand Primary:** `#ff751f`
- **Fish Transport Vertical:** `#0d9488`
- **Pragati Retail Vertical:** `#16a34a`
- **Catering & Events:** `#f97316`
- **Typography:** `Plus Jakarta Sans`, `Outfit`, `JetBrains Mono`
