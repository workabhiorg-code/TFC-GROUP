# TFC GROUP — PHASE 0 CODEBASE AUDIT REPORT

**Document ID:** `PHASE_0_CODEBASE_AUDIT.md`  
**Audit Timestamp:** 2026-09-28 01:35 IST  
**Target Application:** TFC GROUP Multi-Enterprise Resource Management & POS Platform  
**Runtime Environment:** Google Apps Script (V8 Engine) + Google Sheets Database  
**Primary Objective:** Architectural Baseline, Dependency Matrix, and Fish-First ERP Migration Plan  

---

## 1. Executive Summary & Audit Baseline

An exhaustive audit of the entire TFC GROUP codebase has been completed across all server-side scripts (`Code.gs`), runtime metadata (`appsscript.json`, `.clasp.json`, `.claspignore`), local server tooling (`server.ps1`), and Single Page Application frontend (`index.html`), alongside all master guidance documents (`ANTIGRAVITY_MASTER_PROMPT.md`, `BUSINESS_PRIORITY_AND_UI_FREEZE.md`, `FILE_IMPLEMENTATION_MAP.md`, `FISH_FIRST_EXECUTION_CHECKLIST.md`).

### Key Audit Findings:
1. **Design System & Theme Lock:** The application visual design is design-locked. It uses a modern CSS variable system supporting light/dark mode, typography tokens (`Outfit`, `Plus Jakarta Sans`, `JetBrains Mono`), and brand accents (Primary Orange `#ff751f`, Fish Teal `#0d9488`).
2. **Current Business State:** The repository defines schemas and mock/initial data for 6 business verticals and group-wide financial/khata management. The frontend currently renders the Pragati Retail POS module as the live interface, while the backend contains CRUD handlers for Catering, Mining, Construction, Legacy Fish, Retail Outlet, Poultry, and Group Expenses.
3. **Fish Module Gap:** The current Fish Transport implementation is limited to a single legacy batch logging table (`FISH_Batches`) and handler (`saveFishBatch`), lacking multi-stage procurement, lot traceability, multi-seller distribution, running ledger calculation, daily closing, and dual-format billing (Thermal + A4).
4. **Tooling & Clasp Configuration:** `.claspignore` currently white-lists only `Code.gs`, `index.html`, and `appsscript.json`. When introducing the modular foundation (`Config.gs`, `Core_*.gs`, `Fish_*.gs`), `.claspignore` must allow `!*.gs`.

---

## 2. Current Architecture Overview

### 2.1 Backend Architecture (Google Apps Script V8)
- **Runtime Environment:** V8 Runtime (`"runtimeVersion": "V8"` in `appsscript.json`), configured with timezone `Asia/Kolkata`.
- **Web App Entrypoint:** `doGet(e)` in `Code.gs` serves `index.html` via `HtmlService.createTemplateFromFile('index')`, evaluated with `ALLOWALL` X-Frame-Options and mobile-optimized viewport meta tags.
- **Data Persistence:** Bound or standalone Google Spreadsheet accessed via `getDatabase()`, which dynamically handles direct spreadsheet IDs or URLs (`APP_CONFIG.SPREADSHEET_ID`) with fallback to `SpreadsheetApp.getActiveSpreadsheet()`.
- **Batch Data Transport:** `getInitialData()` retrieves all business verticals in a single batch read, with fallback to `getOfflineDemoState()` when disconnected from Google Sheets.
- **Client-Server Communication:** Google Apps Script RPC (`google.script.run`) with client-side offline mock fallbacks.

### 2.2 Frontend Architecture (Single Page Application)
- **Markup & Layout:** Pure HTML5 Single Page Application in `index.html`.
- **Styling:** Vanilla CSS with comprehensive CSS custom properties (tokens), CSS Grid and Flexbox responsive layouts, and `@media print` rules.
- **Icons & Libraries:** Font Awesome 6.5.1, SweetAlert2 v11 (alerts/modals), Chart.js v4.4.1.
- **Audio Synthesizer:** Built-in Web Audio API oscillator for haptic/audio feedback (`playSound('beep')` and `playSound('success')`).
- **Local Dev Server:** `server.ps1` PowerShell HTTP listener serving static files on port 8080.

---

## 3. Existing Business Modules & Priority Order

Per master requirements, the business modules must be implemented and exposed in the following strict order:

| Business Vertical | Priority Rank | Current State | Associated Google Sheets | Current Server Handlers |
|---|:---:|---|---|---|
| **Fish Transport & Seafood Logistics** | **#1 (Flagship)** | Basic Batch Logger (Legacy) | `FISH_Batches` | `saveFishBatch(batchData)` |
| **Catering & Events Management** | **#2** | Operational / Seeded | `CAT_Events`, `CAT_Menu_Items` | `saveCateringEvent(eventData)` |
| **Stone Mining & Crusher Operations** | **#3** | Operational / Seeded | `MINE_Trips`, `MINE_Stock` | `saveMiningTrip(tripData)` |
| **Construction & Project Sites** | **#4** | Operational / Seeded | `CONST_Projects`, `CONST_Materials`, `CONST_Labor` | `saveConstructionMaterial(matData)` |
| **Pragati Outlet (Retail POS & Dairy)** | **#5** | Operational / Live in UI | `OUTLET_Products`, `OUTLET_Sales` | `saveOutletPOSSale(saleData)` |
| **Poultry Farming & Hatchery** | **#6** | Operational / Seeded | `PLT_Batches`, `PLT_Feed`, `PLT_Sales` | `savePoultryBatch()`, `savePoultrySale()`, `savePoultryFeed()` |
| **Group HQ Consolidated Khata & Expenses** | **Shared** | Operational / Seeded | `MST_Khata`, `MST_Expenses`, `CFG_Settings` | `saveGroupExpense(expData)`, `setupDatabaseAndDemoData()`, `getInitialData()` |

---

## 4. Existing Google Sheets Database Schema

The active Google Sheets database contains 14 structured sheets:

| Sheet Tab | Primary Key / ID | Column Header Schema | Header Color |
|---|---|---|---|
| `CFG_Settings` | `Key` | `Key`, `Value`, `Description` | `#1e293b` |
| `MST_Khata` | `ID` | `ID`, `Party Name`, `Party Type`, `Business Vertical`, `Phone`, `City`, `Balance (₹)`, `Credit Limit (₹)`, `Status` | `#ff751f` |
| `MST_Expenses` | `ID` | `ID`, `Date`, `Vertical`, `Category`, `Description`, `Amount (₹)`, `Payment Mode`, `Paid By` | `#e11d48` |
| `CAT_Events` | `Event ID` | `Event ID`, `Event Name`, `Client Name`, `Phone`, `Event Date`, `Guest Count`, `Per Plate (₹)`, `Total Amount (₹)`, `Advance Paid (₹)`, `Balance (₹)`, `Status` | `#f97316` |
| `CAT_Menu_Items` | `Item ID` | `Item ID`, `Item Name`, `Category`, `Type`, `Cost Per Plate (₹)`, `Suggested Selling (₹)`, `Status` | `#f97316` |
| `MINE_Trips` | `Challan No` | `Challan No`, `Date Time`, `Vehicle No`, `Customer Name`, `Material Grade`, `Gross Wt (T)`, `Tare Wt (T)`, `Net Wt (T)`, `Rate/Ton (₹)`, `Total Bill (₹)`, `Royalty TP No`, `Payment Status` | `#78716c` |
| `MINE_Stock` | `Material ID` | `Material ID`, `Material Grade / Size`, `Stockpile Location`, `Available Stock (Tons)`, `Price/Ton (₹)`, `Status` | `#78716c` |
| `CONST_Projects` | `Project ID` | `Project ID`, `Project Name`, `Client / Dept`, `Site Location`, `Contract Value (₹)`, `Spent Amount (₹)`, `Progress (%)`, `Status` | `#0284c7` |
| `CONST_Materials` | `Indent ID` | `Indent ID`, `Date`, `Project Name`, `Material`, `Quantity`, `Unit`, `Rate (₹)`, `Total Cost (₹)`, `Supplier`, `Status` | `#0284c7` |
| `CONST_Labor` | `Date` + `Project` | `Date`, `Project Name`, `Muster Head`, `Skilled Count`, `Unskilled Count`, `Daily Wage Payout (₹)`, `Overtime Hours`, `Supervisor` | `#0284c7` |
| `FISH_Batches` *(Legacy)* | `Batch ID` | `Batch ID`, `Dispatch Date`, `Fish Species`, `Source Location`, `Crate Count`, `Gross Wt (Kg)`, `Ice Tare (Kg)`, `Mortality / Loss (Kg)`, `Net Sale Wt (Kg)`, `Mandi Buyer`, `Auction Rate/Kg (₹)`, `Gross Realization (₹)`, `Trip Cost (₹)`, `Net Profit (₹)`, `Status` | `#0d9488` |
| `OUTLET_Products` | `Barcode / SKU` | `Barcode / SKU`, `Product Name`, `Category`, `Unit`, `Cost Price (₹)`, `Selling Price (₹)`, `Stock Qty`, `Min Alert Qty`, `Status` | `#16a34a` |
| `OUTLET_Sales` | `Bill No` | `Bill No`, `Date Time`, `Customer Phone`, `Item Summary`, `Total Items`, `Subtotal (₹)`, `Discount (₹)`, `Grand Total (₹)`, `Payment Mode`, `Cashier` | `#16a34a` |
| `PLT_Batches` | `Batch ID` | `Batch ID`, `Shed No`, `Bird Breed / Type`, `Placement Date`, `Initial Birds`, `Current Birds`, `Mortality Count`, `Age (Days)`, `Avg Weight (Kg)`, `Status` | `#d97706` |
| `PLT_Feed` | `Date` + `Silo` | `Date`, `Feed Silo / Type`, `Quantity (Bags / Kg)`, `Rate/Bag (₹)`, `Total Cost (₹)`, `Supplier`, `Status` | `#d97706` |
| `PLT_Sales` | `Dispatch No` | `Dispatch No`, `Date Time`, `Buyer Name`, `Phone`, `Vehicle No`, `Type`, `Quantity / Crates`, `Gross Wt (Kg)`, `Crate Tare (Kg)`, `Net Live Wt (Kg)`, `Rate (₹)`, `Total Amount (₹)`, `Payment Status` | `#d97706` |

---

## 5. Existing Fish Functionality & ERP Gap Analysis

### 5.1 Existing Legacy Implementation (`FISH_Batches`)
- **Backend Function:** `saveFishBatch(batchData)` in `Code.gs` (Lines 484–519).
- **Stored Attributes:** Batch ID, Dispatch Date, Fish Species, Source Location, Crate Count, Gross Wt, Ice Tare, Mortality / Loss, Net Sale Wt, Mandi Buyer, Auction Rate, Gross Realization, Trip Cost, Net Profit, Status.
- **Calculation Formula in Legacy:**
  $$\text{Net Weight} = \max(0, \text{Gross} - \text{Ice Tare} - \text{Mortality})$$
  $$\text{Gross Realization} = \text{Net Weight} \times \text{Auction Rate}$$
  $$\text{Net Profit} = \text{Gross Realization} - \text{Trip Cost}$$

### 5.2 Critical Functional Gaps for Target ERP
1. **Lack of Master Entities:** No normalized masters for Species, Grades, Rate History, Suppliers, Mandis, Sellers, Vehicles, or Drivers.
2. **Missing Supply Chain Lifecycle:** Target flow requires:
   $$\text{Supplier/Mandi} \rightarrow \text{Procurement} \rightarrow \text{Weighment} \rightarrow \text{Lot} \rightarrow \text{Shipment/Transport} \rightarrow \text{Distribution} \rightarrow \text{Seller Billing} \rightarrow \text{Ledger} \rightarrow \text{Daily Closing}$$
3. **No Multi-Seller Lot Breakdown:** Real seafood operations procure single lots (e.g., 2,500 kg Rohu) and distribute them across 5–15 distinct retail sellers with individual gross, tare, net, and negotiated rates.
4. **Balance Calculation & Financial Integrity:** Current balances in `MST_Khata` are static numbers rather than calculated dynamically from transaction history:
   $$\text{Closing Balance} = \text{Opening Balance} + \sum \text{Debits} - \sum \text{Credits}$$
5. **Billing Format Gaps:** Absence of dual-layout billing (Thermal 80mm/58mm and Formal A4 Invoices) with previous dues, current charge, and received amount.
6. **No Daily Closing & Lock:** No mechanism to freeze a trading day's ledger or audit reopening.

---

## 6. Existing Theme & Design System (Frozen & Design-Locked)

The visual design language in `index.html` is frozen. All new Fish components must use these exact CSS variables and classes.

### 6.1 Design Tokens (CSS Variables)
- **Primary Brand Tokens:**
  - `--primary: #ff751f` (TFC Orange)
  - `--primary-hover: #e5600c`
  - `--primary-light: rgba(255, 117, 31, 0.12)`
  - `--primary-glow: rgba(255, 117, 31, 0.35)`
  - `--primary-subtle: rgba(255, 117, 31, 0.05)`
- **Vertical Accent Colors:**
  - Fish Transport: `--fish-color: #0d9488` (Teal)
  - Pragati Outlet: `--outlet-color: #16a34a` (Emerald Green)
  - Catering: `--cat-color: #f97316` (Amber Orange)
  - Stone Mining: `--mine-color: #78716c` (Stone Grey)
  - Construction: `--const-color: #0284c7` (Sky Blue)
  - Poultry: `--poultry-color: #d97706` (Golden Brown)
  - HQ Consolidated: `--hq-color: #6366f1` (Indigo)
- **Theme Surfaces & Neutrals:**
  - Light Mode: `--bg-app: #f4f7fb`, `--bg-card: #ffffff`, `--bg-card-alt: #f8fafc`, `--border-color: #e2e8f0`, `--text-main: #0f172a`, `--text-muted: #64748b`, `--text-subtle: #94a3b8`
  - Dark Mode: `--bg-app: #090d16`, `--bg-card: #131d2e`, `--bg-card-alt: #1a253a`, `--border-color: #1f2d45`, `--text-main: #f8fafc`, `--text-muted: #94a3b8`, `--text-subtle: #64748b`
- **Typography:**
  - Headings & Titles: `'Outfit', sans-serif`
  - Body & Form Controls: `'Plus Jakarta Sans', sans-serif`
  - Numbers, Currency, Codes & Bills: `'JetBrains Mono', monospace`

### 6.2 Reusable UI Component Classes
- **Navigation & Layout:** `.sidebar`, `.sidebar-header`, `.nav-list`, `.nav-item`, `.top-header`, `.header-tabs`, `.header-tab-btn`, `.header-action-btn`, `.view-container`
- **Cards & Grids:** `.stat-card`, `.stat-card-icon`, `.stat-card-info`, `.stat-label`, `.stat-value`, `.inventory-stats-bar`
- **Tables:** `.tfc-table`, `.table-toolbar`, `.inventory-table-wrap`
- **Badges & Status:** `.stock-chip`, `.stock-in`, `.stock-low`, `.stock-out`, `.badge-status`, `.badge-live`, `.badge-queue`
- **Forms & Inputs:** `.pos-search-input`, `.search-bar-wrapper`, `.shortcut-badge`, `.category-pills-bar`, `.cat-pill`
- **Buttons & Modals:** `.btn-checkout-now`, `.btn-hold-cart`, `.modal-overlay`, `.modal-card`, `.modal-header`, `.modal-title`, `.btn-close-modal`, `.modal-body`
- **Payment Elements:** `.payment-modes-grid`, `.pay-mode-btn`, `.quick-cash-grid`, `.cash-pill-btn`

---

## 7. Existing Printing & Ledger Architecture

### 7.1 Thermal Print Architecture
- Rendered in modal container `#printableReceipt` (`.receipt-container`).
- Styled using `@media print` rules that hide all DOM elements except `#printableReceipt` (`visibility: hidden` for `body *` and `visibility: visible` for `#printableReceipt *`).
- Includes business header, tax ID (GSTIN), receipt timestamp, itemized quantity/rate/amount table, subtotal, discount, net amount, and tender mode.

### 7.2 Ledger & Tender System
- Multi-tender payment capture: Cash, UPI (with live QR code generation via QR Server API), Khata (ledger credit), and Bank Transfer.
- Customer Khata selector with balance warning badge (`.bal-zero`, `.bal-due`) and dynamic modal account creation (`promptAddNewKhata()`).

---

## 8. Function Catalog: Reusable vs. Must-Not-Break

### 8.1 Reusable Functions for Fish ERP Engine
- `getDatabase()`: High-reliability resolution of Google Spreadsheet instance by ID/URL or active sheet.
- `getOrCreateSheet(ss, tabName, headers, headerColor)`: Sheet tab creation with styled headers and frozen first row.
- `readSheetRows(ss, sheetName)`: Batch array-to-JSON mapper converting dates to ISO strings.
- `saveRecord(tabName, rowArray)`: Append row wrapper.
- `getInitialData()` / `getOfflineDemoState()`: High-performance state loader.
- Audio synthesis engine `playSound('beep')` / `playSound('success')`.

### 8.2 Must NOT Be Broken (Strict Regression Protection)
- `doGet(e)` and `include(filename)`
- `setupDatabaseAndDemoData()`
- `saveCateringEvent(eventData)`
- `saveMiningTrip(tripData)`
- `saveConstructionMaterial(matData)`
- `saveOutletPOSSale(saleData)`
- `saveGroupExpense(expData)`
- `savePoultryBatch(batchData)`
- `savePoultrySale(saleData)`
- `savePoultryFeed(feedData)`
- Existing sheet tables (`CFG_*`, `MST_*`, `CAT_*`, `MINE_*`, `CONST_*`, `OUTLET_*`, `PLT_*`)
- Existing legacy `FISH_Batches` data table

---

## 9. Architectural Risks & Mitigation Strategies

| Risk | Severity | Impact | Mitigation Strategy |
|---|:---:|---|---|
| **Concurrent Write Collisions** | **High** | Multiple dispatchers/cashiers writing procurement or distributions simultaneously causing stock or balance corruption. | Wrap all write operations in Google Apps Script `LockService.getScriptLock()` with 10-second timeout. |
| **Balance Drift & Financial Discrepancies** | **High** | Manually editable balance cells drifting away from true transaction totals. | Derive balances on-the-fly: $\text{Balance} = \text{Opening} + \sum \text{Debits} - \sum \text{Credits}$. Balances are never the raw source of truth. |
| **Data Loss During Legacy Migration** | **High** | Accidental overwriting or corruption of existing `FISH_Batches` data during schema upgrade. | Retain `FISH_Batches` permanently. Build repeat-safe, idempotent migration in `Fish_Setup.gs` with source ID mapping. |
| **GAS Quota & Execution Timeouts** | **Medium** | Cell-by-cell `SpreadsheetApp` read/write calls exceeding the 6-minute Google Apps Script execution limit. | Always perform batch reads (`getDataRange().getValues()`) and bulk appends/updates. |
| **Clasp Deployment Exclusion** | **Medium** | Adding new `.gs` files while `.claspignore` only whitelists `Code.gs`. | Update `.claspignore` to include `!*.gs` before deploying new modular server files. |
| **UI Regression Across Other Verticals** | **Medium** | Modifying shared styles or navigation breaking Catering, Mining, Construction, Pragati Outlet, or Poultry. | Preserve existing CSS tokens and view containers; add Fish views as isolated sub-views under the navigation controller. |

---

## 10. File Modification & Boundary Rules

### 10.1 Files to Be Created in Modular Architecture
1. **Shared Foundation (Phase 1):**
   - `Config.gs`: Business priority constants, sheet tab names, lifecycle statuses, role definitions.
   - `Core_Data.gs`: Safe sheet access, `LockService` wrappers, batch reads/writes, atomic updates.
   - `Core_Utils.gs`: Unique ID generators (`FSH-PUR-XXXX`, `FSH-LOT-XXXX`, `FSH-INV-XXXX`), date/time formatters, numeric rounders.
   - `Core_Validation.gs`: Server-side business rule validation (non-negative weights, tare < gross, lot limits).
   - `Core_Audit.gs`: Immutable audit trail logging to `SYS_AUDIT_LOG`.
   - `Core_Auth.gs`: Role/action authorization matrix.
2. **Fish Vertical Modules (Phases 2–15):**
   - `Fish_Master.gs`: Species, grades, rates, suppliers, mandis, sellers, vehicles, drivers.
   - `Fish_Procurement.gs`: Purchase orders, weighment, multi-component landed costs.
   - `Fish_Lots.gs`: Lot creation, allocation tracking, traceability back to purchase.
   - `Fish_Transport.gs`: Trips, shipments, vehicle loading, dispatch, transit, arrival.
   - `Fish_Sellers.gs`: Seller profiles, credit limits, Seller 360 overview.
   - `Fish_Distribution.gs`: Multi-seller distribution with over-allocation prevention.
   - `Fish_Sales.gs`: Sales orders, itemization, returns, and adjustments.
   - `Fish_Payments.gs`: Collection logging, multi-tender payment allocations.
   - `Fish_Ledger.gs`: Seller and supplier statements, running balance computation.
   - `Fish_Expenses.gs`: Consignment-specific and operational expense logging.
   - `Fish_Reports.gs`: Operational, financial, wastage, and shipment performance reporting.
   - `Fish_Print.gs`: Thermal 80mm/58mm and formal A4 billing generator.
   - `Fish_Setup.gs`: Schema initializer and repeat-safe migration of `FISH_Batches`.
3. **UI Integration:**
   - `index.html`: Update sidebar to elevate Fish Transport to #1 position, integrate modular Fish views, and maintain existing design tokens.
   - `.claspignore`: Update to allow all `.gs` files (`!*.gs`).

### 10.2 Files to Remain Untouched / Preserved
- `Code.gs` legacy handlers for other verticals (`saveCateringEvent`, `saveMiningTrip`, etc.)
- `appsscript.json` (V8 configuration and timezone settings)
- `.clasp.json` (Script ID binding)
- `server.ps1` (Local development HTTP server)
- All existing sheets: `CFG_*`, `MST_*`, `CAT_*`, `MINE_*`, `CONST_*`, `OUTLET_*`, `PLT_*`, and legacy `FISH_Batches`.

---

## 11. Proposed Implementation Sequence for Phase 1

Phase 1 establishes the shared server foundation without altering existing business logic or UI. The execution sequence is structured as follows:

```
Step 1: Config.gs (Constants, Sheet Names, Status Enums, Business Priority)
   │
Step 2: Core_Utils.gs (ID Generators, Date/Time Helpers, Numeric Parsers)
   │
Step 3: Core_Data.gs (LockService, Safe Batch Sheet Reader/Writer)
   │
Step 4: Core_Validation.gs (Weight Integrity, Lot Allocation, Financial Rules)
   │
Step 5: Core_Audit.gs (SYS_AUDIT_LOG Schema & Logging Engine)
   │
Step 6: Core_Auth.gs (Role & Action Authorization Matrix)
   │
Step 7: Tooling Update (.claspignore to allow !*.gs)
   │
Step 8: Verification & Syntax Validation (Clean loading without circular deps)
```

### Detailed Phase 1 Step Breakdown:
1. **`Config.gs`:** Define `BUSINESS_ORDER` (Fish #1, Catering #2, Mining #3, Construction #4, Pragati #5, Poultry #6), `SHEET_NAMES` (including new `FISH_*` and `SYS_AUDIT_LOG`), transaction prefixes, status lifecycles, and user roles.
2. **`Core_Utils.gs`:** Implement collision-resistant ID generators (`generateId(prefix)`), Indian currency formatters, 3-decimal weight rounders, and timezone-aware date/time stringifiers.
3. **`Core_Data.gs`:** Implement `withLock(callback, timeoutMs)` using `LockService.getScriptLock()`, `batchReadSheet(sheetName)`, `batchAppendRows(sheetName, rows)`, and `findRowByKeyValue(sheetName, keyColumn, keyValue)`.
4. **`Core_Validation.gs`:** Create pure validation functions: `validateWeights(gross, tare, net)`, `validateLotAllocation(lotNetWt, requestedWt)`, `validateProcurement(data)`, and `validatePayment(data)`.
5. **`Core_Audit.gs`:** Implement `logAudit(action, entityType, entityId, userId, details)` and ensure the `SYS_AUDIT_LOG` sheet tab is created with standardized header colors.
6. **`Core_Auth.gs`:** Define role-action permission map (`canUserPerform(userRole, action)`) covering `PROCURE`, `DISTRIBUTE`, `BILL`, `COLLECT`, `REOPEN_DAY`, and `EXPORT_REPORT`.
7. **`Tooling Update`:** Update `.claspignore` to include `!*.gs` so all modular files deploy cleanly.
8. **`Phase 1 Verification`:** Run validation tests to confirm zero syntax errors, zero circular dependencies, and complete backward compatibility with existing `Code.gs` functions.

---

**Phase 0 Codebase Audit Complete.**  
*Ready to proceed to Phase 1 upon user approval.*
