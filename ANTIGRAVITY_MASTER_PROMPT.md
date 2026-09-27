# ANTIGRAVITY MASTER IMPLEMENTATION PROMPT — TFC GROUP

You are modifying an existing Google Apps Script + Google Sheets application called TFC GROUP.

The supplied repository is the source of truth. Do not treat it as a blank project.

## NON-NEGOTIABLE BUSINESS ORDER

Implement and expose the businesses in exactly this order:

1. FISH TRANSPORT
2. CATERING
3. STONE CRUSHING
4. CONSTRUCTION
5. PRAGATI OUTLET
6. POULTRY

Fish Transport is the flagship and must be developed first.

## NON-NEGOTIABLE DESIGN RULE

KEEP THE CURRENT COLOR PROFILE AND THEME EXACTLY AS THE BASE DESIGN LANGUAGE.

The existing application's visual system is design-locked.

Reuse:
- current colors/CSS variables
- current typography
- current light/dark theme
- current sidebar and top navigation style
- current cards
- current buttons
- current badges
- current tables
- current modal/dialog patterns
- current toast/notification style
- current responsive behavior
- current print/receipt conventions

Do NOT introduce a new global theme or redesign the whole application.

Fish may add new screens/components, but they must look native to the existing application.

## CURRENT REPOSITORY

The project is Google Apps Script using V8 runtime and Google Sheets.

Important existing files:
- `Code.gs`
- `index.html`
- `appsscript.json`
- `.clasp.json`
- `.claspignore`
- `server.ps1`

Existing business functionality must remain operational.

Current fish functionality is currently a basic `FISH_Batches` flow. It is not sufficient for the target system.

## PRIMARY OBJECTIVE

Transform Fish Transport from the current basic batch implementation into a complete operational ERP module:

Supplier/Mandi
→ Procurement
→ Weighment
→ Lot
→ Vehicle/Driver
→ Shipment
→ Market/Hub
→ Distribution
→ Seller
→ Invoice
→ Payment
→ Ledger
→ Daily Closing
→ Reports

## DO NOT REWRITE THE WHOLE APP

First inspect the repository.

Preserve working legacy behavior.

Build a modular architecture around the existing project.

Do not delete existing sheets.

Do not rename existing sheets unless there is a migration plan.

Do not remove existing business handlers until replacement behavior is tested.

## PHASE 0 — BASELINE

Before modifying behavior:

1. Run/read the current application.
2. Inspect `Code.gs`, `index.html`, `appsscript.json`, `.clasp.json`.
3. Identify all existing functions, sheets and UI routes.
4. Record existing fish fields and formulas.
5. Confirm current theme/color variables and reuse them.
6. Create/maintain a safe baseline before migration.

## PHASE 1 — SHARED FOUNDATION

Create or implement these modular responsibilities:

- `Config.gs`
- `Core_Data.gs`
- `Core_Utils.gs`
- `Core_Validation.gs`
- `Core_Audit.gs`
- `Core_Auth.gs`

Use:
- server-side validation
- normalized IDs
- consistent timestamps
- `LockService` for financial/inventory mutations
- batch spreadsheet operations where possible
- minimal SpreadsheetApp calls
- structured error handling
- audit logs for sensitive operations

Do not build a client-side-only financial system.

## PHASE 2 — FISH MASTER DATA

Implement:
- Fish species
- Grades/sizes
- Rate history
- Suppliers
- Mandis
- Sellers
- Vehicles
- Drivers
- Destinations/markets
- Payment modes

Rate history must preserve historical transaction rates.

## PHASE 3 — PROCUREMENT

Create a complete purchase workflow.

Required fields include:
- Purchase ID
- Date
- Exact transaction time
- Supplier
- Mandi
- Species
- Grade
- Tray count
- Gross weight
- Tare weight
- Net weight
- Purchase rate/kg
- Fish value
- Ice cost
- Labour cost
- Loading cost
- Other cost
- Total procurement cost
- Payment status
- Vehicle
- Lot ID
- Remarks

Server validation:
- no negative weights
- tare cannot exceed gross
- net must be calculated safely
- quantities/rates must be numeric
- IDs must be unique

## PHASE 4 — LOT MANAGEMENT

Each procurement can create one or more lots where appropriate.

Lot fields:
- Lot ID
- Source purchase
- Species
- Grade
- Quantity
- Weight
- Tray count
- Destination
- Shipment
- Distributed quantity
- Wastage
- Remaining quantity
- Status

Prevent over-allocation.

Provide traceability from lot back to purchase.

## PHASE 5 — TRANSPORT

Implement:
- Trips
- Vehicles
- Drivers
- Shipments
- Loading
- Dispatch
- Arrival
- Unloading
- Shipment status

Shipment lifecycle:

CREATED
→ LOADED
→ DISPATCHED
→ IN_TRANSIT
→ ARRIVED
→ UNLOADED
→ DISTRIBUTING
→ COMPLETED
→ CLOSED

Capture dispatch and arrival date/time.

## PHASE 6 — SELLER MANAGEMENT

Build Seller 360.

Seller profile:
- Seller ID
- Name
- Business/shop name
- Phone
- Market/location
- Credit limit
- Credit period
- Opening balance
- Status
- Notes

Seller 360 must show:
- today's purchases
- today's payments
- current outstanding
- overdue amount
- invoices
- ledger
- fish purchased
- transaction history

## PHASE 7 — DISTRIBUTION

A single lot must be distributable to multiple sellers.

For every distribution:
- Seller
- Lot
- Species
- Grade
- Tray quantity
- Gross weight
- Tare
- Net weight
- Rate
- Amount
- Date/time
- Invoice reference
- Collector/user

Server must reject distribution that exceeds available lot quantity/weight.

## PHASE 8 — BILLING

Create both:

### Thermal bill
Designed for the existing thermal print infrastructure.

### A4 invoice
Professional A4 layout.

Both must show:
- Business name
- Invoice ID
- Transaction date
- Exact purchase/transaction time
- Seller
- Fish species
- Grade
- Trays
- Gross weight
- Tare
- Net weight
- Rate
- Amount
- Previous balance
- Current transaction
- Payment received
- Closing balance
- Payment mode/reference

Reuse the application's existing print/receipt architecture where possible.

## PHASE 9 — PAYMENTS

Payment fields:
- Payment ID
- Party
- Date
- Exact time
- Amount
- Payment mode
- Reference
- Invoice allocation
- Collector
- Remarks

Payment modes:
- Cash
- UPI
- Bank Transfer
- NEFT
- RTGS
- Cheque
- Other

Payments must be traceable.

## PHASE 10 — LEDGER

Implement seller and supplier statements.

Formula:

Opening balance + debits - credits = closing balance

Ledger should be generated from transaction history.

Do not make the balance field the authoritative source of truth.

Include:
- date
- time
- transaction type
- reference
- debit
- credit
- running balance
- notes

## PHASE 11 — EXPENSES AND WASTAGE

Fish expenses:
- Fuel
- Ice
- Labour
- Loading
- Unloading
- Transport
- Toll
- Maintenance
- Packaging
- Commission
- Mandi/market charges
- Miscellaneous

Wastage:
- Original quantity
- Dispatched quantity
- Received quantity
- Wastage
- Reason
- Lot
- Shipment
- Date/time
- Shrinkage %

## PHASE 12 — DAILY CLOSING

Daily closing must summarize:
- Procurement
- Sales
- Collections
- Payment modes
- Expenses
- Wastage
- Receivables
- Payables
- Closing cash

Once closed:
- normal users cannot alter the day's financial transactions
- authorized users can reopen
- reopening is audited

## PHASE 13 — DASHBOARD

Fish Dashboard must show:

- Today's procurement
- Today's fish sales
- Today's collection
- Seller receivables
- Supplier payables
- Active shipments
- Fish received
- Fish distributed
- Wastage
- Expenses
- Estimated gross/net margin indicators

Do not expose misleading profit figures if cost inputs are incomplete. Label estimates clearly.

## PHASE 14 — REPORTS

Implement filters by:
- date range
- seller
- supplier
- species
- grade
- market
- vehicle
- shipment
- payment mode

Reports:
- Procurement
- Sales
- Seller dues
- Supplier dues
- Collections
- Expenses
- Wastage
- Shipment performance
- Fish movement
- Seller statements
- Supplier statements
- Daily closing
- Management summary

## PHASE 15 — NAVIGATION

Fish must be first in the main business navigation.

Suggested Fish menu:

Fish Dashboard
Procurement
  - New Purchase
  - Purchase History
  - Supplier/Mandi
Lots
  - Active Lots
  - Lot History
  - Traceability
Transport
  - Trips
  - Shipments
  - Vehicles
  - Drivers
Distribution
  - New Distribution
  - Distribution History
Sellers
  - Seller List
  - Seller 360
  - Seller Ledger
Billing
  - Invoices
  - Returns/Adjustments
Accounts
  - Receivables
  - Payables
  - Payments
  - Expenses
Reports
Daily Closing
Settings

## PHASE 16 — PERMISSIONS

Support role/action authorization such as:

- Super Admin
- Admin
- Manager
- Procurement Staff
- Billing Staff
- Collection Staff
- Transport Staff
- Accountant
- Viewer

Permissions must be action-based.

Examples:
- create procurement
- edit procurement
- approve adjustment
- distribute fish
- create invoice
- collect payment
- reopen daily closing
- view reports

## PHASE 17 — LEGACY FISH_BATCHES MIGRATION

Existing `FISH_Batches` is legacy data.

Do not delete it.

Create repeat-safe migration logic:
- backup
- map old fields
- preserve original IDs
- preserve original dates
- preserve weights
- preserve rates
- preserve financial values
- store source legacy ID
- prevent duplicate migration

Only mark migration complete after verification.

## PHASE 18 — DATA INTEGRITY

Mandatory protections:

1. Unique transaction IDs.
2. No negative net weight.
3. No tare greater than gross.
4. No over-distribution.
5. No duplicate payment posting.
6. Historical rates remain unchanged.
7. Financial adjustments require authorization.
8. Cancelled transactions remain auditable.
9. Daily closing locks normal edits.
10. Financial/stock writes use `LockService`.
11. Server-side validation is authoritative.

## PHASE 19 — PERFORMANCE

Google Apps Script constraints matter.

Avoid:
- one SpreadsheetApp call per row
- repeatedly loading entire spreadsheets for small views
- unnecessary recalculation
- huge client payloads

Prefer:
- batch reads/writes
- filtered server queries
- cached master data where appropriate
- compact dashboard payloads
- pagination for history tables

## PHASE 20 — UI ACCEPTANCE

The new Fish screens are accepted only if they look like they belong to the current application.

Before changing any CSS:
1. identify the existing design tokens;
2. reuse them;
3. reuse existing component classes;
4. add only missing components;
5. keep light/dark mode behavior consistent.

The current color profile and theme are frozen.

## PHASE 21 — OTHER BUSINESS ORDER

Do not start full feature development of other businesses before Fish reaches a stable acceptance milestone.

After Fish:
2. Catering
3. Stone Crushing
4. Construction
5. Pragati Outlet
6. Poultry

Existing functionality for those businesses must remain available throughout Fish development.

## DEFINITION OF DONE FOR FISH

A tester must be able to complete:

1. Create supplier/mandi.
2. Record procurement.
3. Create lot.
4. Assign lot to shipment.
5. Assign vehicle and driver.
6. Dispatch shipment.
7. Mark arrival.
8. Record received quantity/wastage.
9. Distribute fish among multiple sellers.
10. Generate thermal invoice.
11. Generate A4 invoice.
12. Record full/partial payment.
13. See seller ledger.
14. See supplier ledger.
15. See pending dues.
16. Record expenses.
17. Close the day.
18. View reports.
19. Trace an invoice back to seller → distribution → lot → shipment → procurement.
20. Verify the original existing businesses still work.

## FINAL RULE

Build incrementally.

After every major phase:
- validate syntax
- test server functions
- test UI navigation
- test existing business flows
- test dark/light theme
- test printing
- test financial calculations
- test duplicate/concurrency scenarios

Do not declare completion merely because screens exist.

The system is complete only when the end-to-end Fish Transport workflow works with persistent Google Sheets data and existing TFC Group businesses remain intact.
