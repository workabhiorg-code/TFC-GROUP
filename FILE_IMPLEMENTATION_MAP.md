# TFC GROUP — FILE IMPLEMENTATION MAP

## Existing files to preserve

- `Code.gs` — current Apps Script server entry point and legacy business handlers.
- `index.html` — current SPA, styling, navigation and existing business UI.
- `appsscript.json` — Apps Script runtime/deployment configuration.
- `.clasp.json`, `.claspignore`, `server.ps1` — project/deployment tooling.

These are the current production baseline. Do not replace them blindly.

## New modular foundation

| File | Responsibility |
|---|---|
| `Config.gs` | Business order, sheet names, constants, feature flags |
| `Core_Data.gs` | Safe sheet access, reads/writes, schema helpers |
| `Core_Utils.gs` | IDs, dates, numbers, normalization, common helpers |
| `Core_Validation.gs` | Server-side validation and business rules |
| `Core_Audit.gs` | Audit trail for financial/stock-sensitive actions |
| `Core_Auth.gs` | Role/action authorization |
| `Fish_Master.gs` | Species, grades, rates, suppliers, mandis, vehicles, drivers |
| `Fish_Procurement.gs` | Purchases, weighment and procurement transactions |
| `Fish_Lots.gs` | Lot creation, allocation, traceability and balances |
| `Fish_Transport.gs` | Trips, shipments, loading, dispatch and arrival |
| `Fish_Sellers.gs` | Seller profiles, limits and seller 360 |
| `Fish_Distribution.gs` | Lot-to-seller distribution with over-allocation protection |
| `Fish_Sales.gs` | Sales/invoices/returns/adjustments |
| `Fish_Payments.gs` | Collections and payment allocation |
| `Fish_Ledger.gs` | Seller/supplier statements and calculated balances |
| `Fish_Expenses.gs` | Fuel, ice, labour, loading, transport and other costs |
| `Fish_Reports.gs` | Operational, financial and management reports |
| `Fish_Print.gs` | Thermal and A4 fish documents |
| `Fish_Setup.gs` | Fish schema setup and repeat-safe migration |

## Data model

The flagship Fish module should introduce these sheets as required:

- `FISH_SPECIES`
- `FISH_GRADES`
- `FISH_RATES`
- `FISH_SUPPLIERS`
- `FISH_SUPPLIER_LEDGER`
- `FISH_PROCUREMENT`
- `FISH_PROCUREMENT_ITEMS`
- `FISH_LOTS`
- `FISH_VEHICLES`
- `FISH_DRIVERS`
- `FISH_TRIPS`
- `FISH_SHIPMENTS`
- `FISH_SELLERS`
- `FISH_SELLER_LEDGER`
- `FISH_DISTRIBUTION`
- `FISH_SALES`
- `FISH_SALE_ITEMS`
- `FISH_INVOICES`
- `FISH_INVOICE_ITEMS`
- `FISH_PAYMENTS`
- `FISH_EXPENSES`
- `FISH_WASTAGE`
- `FISH_ADJUSTMENTS`
- `FISH_DAILY_CLOSING`
- `SYS_AUDIT_LOG`

The existing `FISH_Batches` sheet must be retained and migrated only after backup,
mapping and repeat-safe migration logic are verified.

## Financial integrity

Balances should be derived from transaction history:

Opening balance + debits - credits = closing balance

Do not make a manually editable balance the source of truth.

Use `LockService` around financial and inventory mutations.
