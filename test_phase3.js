/**
 * ============================================================================
 * TFC GROUP — PHASE 3 AUTOMATED UNIT TESTS (test_phase3.js)
 * ============================================================================
 * Tests:
 *  1. Fish Species — Scientific Name removal and common/local name primacy.
 *  2. Enhanced Seller Directory — Wholesale/Retail types, prior history, separate
 *     opening payable & receivable balances, and balance verification.
 *  3. Seller Ledger — Opening balance posting, running balances, and idempotency.
 *  4. Fish Procurement & Weighbridge — Double-weighing calculations (Gross/Tare/Net),
 *     lot creation, financial posting, and cancellation workflows.
 *  5. Schema Safety & Repeat-Safe Setup.
 * 
 * Execution: node test_phase3.js
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock Apps Script Environment
global.Logger = {
  log: function (msg) { /* silence in tests */ }
};

// In-Memory Mock Spreadsheet Database
class MockSheet {
  constructor(name) {
    this.name = name;
    this.rows = [];
    this.frozenRows = 0;
  }
  getLastRow() {
    return this.rows.length;
  }
  getLastColumn() {
    return this.rows.length > 0 ? this.rows[0].length : 0;
  }
  appendRow(row) {
    this.rows.push([...row]);
  }
  setFrozenRows(n) {
    this.frozenRows = n;
  }
  getRange(row, col, numRows, numCols) {
    const sheetRef = this;
    return {
      setBackground: () => {},
      setFontColor: () => {},
      setFontWeight: () => {},
      getValues: () => {
        const result = [];
        for (let r = row - 1; r < row - 1 + numRows && r < sheetRef.rows.length; r++) {
          const rowData = [];
          for (let c = col - 1; c < col - 1 + numCols; c++) {
            rowData.push(sheetRef.rows[r] ? sheetRef.rows[r][c] : '');
          }
          result.push(rowData);
        }
        return result;
      },
      setValues: (values) => {
        for (let r = 0; r < values.length; r++) {
          const targetRowIdx = row - 1 + r;
          if (!sheetRef.rows[targetRowIdx]) {
            sheetRef.rows[targetRowIdx] = [];
          }
          for (let c = 0; c < values[r].length; c++) {
            sheetRef.rows[targetRowIdx][col - 1 + c] = values[r][c];
          }
        }
      }
    };
  }
}

class MockSpreadsheet {
  constructor() {
    this.sheets = {};
  }
  getSheetByName(name) {
    return this.sheets[name] || null;
  }
  insertSheet(name) {
    const s = new MockSheet(name);
    this.sheets[name] = s;
    return s;
  }
}

const mockSs = new MockSpreadsheet();
global.SpreadsheetApp = {
  getActiveSpreadsheet: () => mockSs
};

global.LockService = {
  getScriptLock() {
    return {
      tryLock() { return true; },
      releaseLock() {}
    };
  }
};

global.Session = {
  getActiveUser() { return { getEmail: () => 'procurement.officer@tfcgroup.com' }; },
  getEffectiveUser() { return { getEmail: () => 'procurement.officer@tfcgroup.com' }; }
};

global.Utilities = {
  formatDate(date, tz, format) {
    const d = new Date(date);
    const pad = n => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const HH = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`;
  }
};

// Load GS files into global context using vm.runInThisContext
function loadScript(filename) {
  const code = fs.readFileSync(path.join(__dirname, filename), 'utf8');
  vm.runInThisContext(code, { filename });
}

loadScript('Config.gs');
loadScript('Core_Utils.gs');
loadScript('Core_Audit.gs');
loadScript('Core_Auth.gs');
loadScript('Core_Validation.gs');
loadScript('Core_Data.gs');
loadScript('Fish_Master.gs');
loadScript('Fish_Procurement.gs');
loadScript('Fish_Setup.gs');

// Test Runner Harness
let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

console.log('\n========================================================');
console.log('  RUNNING TFC GROUP PHASE 3 AUTOMATED UNIT TESTS');
console.log('========================================================\n');

// ----------------------------------------------------------------------------
// 1. TEST SETUP ENGINE (Repeat-Safe Initializer)
// ----------------------------------------------------------------------------
console.log('--- 1. Testing Fish Master & Procurement Setup ---');
const setupRes1 = FishSetup.setupFishMasterSheets();
assert(setupRes1.success === true, 'setupFishMasterSheets initialized all schemas');
assert(mockSs.sheets[TFC_CONFIG.SHEETS.FISH_PROCUREMENT] !== undefined, 'FISH_Procurement sheet created');
assert(mockSs.sheets[TFC_CONFIG.SHEETS.FISH_LOTS] !== undefined, 'FISH_Lots sheet created');
assert(mockSs.sheets[TFC_CONFIG.SHEETS.FISH_SELLER_LEDGER] !== undefined, 'FISH_Seller_Ledger sheet created');

// Test repeat safe setup
const setupRes2 = FishSetup.setupFishMasterSheets();
assert(setupRes2.success === true, 'Repeat setup executed without errors');
const speciesRows = mockSs.sheets[TFC_CONFIG.SHEETS.FISH_SPECIES].rows.length;
assert(speciesRows === 7, 'Seed records preserved without duplication on rerun');

// ----------------------------------------------------------------------------
// 2. TEST FISH SPECIES (SCIENTIFIC NAME REMOVAL)
// ----------------------------------------------------------------------------
console.log('\n--- 2. Testing Fish Species Master (Scientific Name Removed) ---');
const newSpecies = FishMaster.createSpecies({
  commonName: 'Chilika Silver Pomfret Special',
  localName: 'Rupachandi',
  defaultUnit: 'Kg',
  notes: 'High demand sweetwater catch'
}, 'procurement.officer@tfcgroup.com');

assert(newSpecies.success === true, 'Species created without scientific name field');
assert(newSpecies.data.commonName === 'Chilika Silver Pomfret Special', 'Common name stored as primary identifier');

const fetchedSpecies = FishMaster.getSpeciesById(newSpecies.data.speciesId);
assert(fetchedSpecies['Common Name'] === 'Chilika Silver Pomfret Special', 'Species retrieved successfully');
assert(fetchedSpecies['Local Name'] === 'Rupachandi', 'Local name correctly retrieved');

// ----------------------------------------------------------------------------
// 3. TEST ENHANCED SELLER DIRECTORY & OPENING BALANCES
// ----------------------------------------------------------------------------
console.log('\n--- 3. Testing Enhanced Seller Directory & History ---');

// 3.1 Wholesale Seller with Prior History and Separate Opening Balances
const seller1 = FishMaster.createSeller({
  sellerType: 'Wholesale',
  sellerName: 'Paradeep Marine Traders Co.',
  contactPerson: 'Arun Kumar Mohapatra',
  phone: '+91 94370 12345',
  alternatePhone: '+91 94370 12346',
  address: 'Jetty 2 Commercial Complex',
  district: 'Jagatsinghpur',
  state: 'Odisha',
  gstin: '21AAACT9999F1Z1',
  hasPriorProcurement: 'Yes',
  priorProcurementCount: 28,
  priorProcurementQtyKg: 14500,
  priorProcurementValue: 2150000,
  lastProcurementDate: '2026-09-15',
  lastProcurementRef: 'VR-PAR-098',
  historyRemarks: 'Verified against FY25 bank reconciliations',
  openingPayableBalance: 35000,
  openingReceivableBalance: 0,
  openingBalanceDate: '2026-09-28',
  openingBalanceNotes: 'Verified outstanding payable from previous trip settlement',
  balanceVerificationStatus: 'Unverified'
}, 'procurement.officer@tfcgroup.com');

assert(seller1.success === true, 'Wholesale seller with prior procurement history registered');
assert(seller1.data.sellerType === 'Wholesale', 'Seller type correctly identified as Wholesale');

// 3.2 Retail Seller with No Prior History (Zero Balances)
const seller2 = FishMaster.createSeller({
  sellerType: 'Retail',
  sellerName: 'Bapuji Nagar Daily Fish Stall',
  contactPerson: 'Kailash Sahu',
  phone: '+91 70081 55667',
  address: 'Market Yard Stall 4',
  district: 'Khordha',
  state: 'Odisha',
  hasPriorProcurement: 'No',
  priorProcurementCount: 0,
  priorProcurementQtyKg: 0,
  priorProcurementValue: 0,
  openingPayableBalance: 0,
  openingReceivableBalance: 0,
  balanceVerificationStatus: 'Verified'
}, 'procurement.officer@tfcgroup.com');

assert(seller2.success === true, 'Retail seller with no prior history registered cleanly');
assert(seller2.data.sellerType === 'Retail', 'Seller type correctly identified as Retail');

// 3.3 Rejection of negative opening balances
const invalidSeller = FishMaster.createSeller({
  sellerName: 'Invalid Negative Balance Trader',
  phone: '+91 90000 00000',
  openingPayableBalance: -500
}, 'procurement.officer@tfcgroup.com');
assert(invalidSeller.success === false, 'Negative opening payable balance rejected by validation');

// 3.4 Verify Opening Balance Workflow
const verifyRes = FishMaster.verifySellerOpeningBalance(seller1.data.sellerId, 'manager@tfcgroup.com');
assert(verifyRes.success === true, 'Seller opening balance marked as Verified by Manager');

// 3.5 Check Seller Financial Summary
const summary = FishMaster.getSellerFinancialSummary(seller1.data.sellerId);
assert(summary.priorProcurementCount === 28, 'Financial summary reports 28 prior procurements');
assert(summary.priorProcurementValue === 2150000, 'Financial summary reports ₹21,50,000 prior procurement value');
assert(summary.openingPayable === 35000, 'Financial summary isolates opening payable of ₹35,000');
assert(summary.currentPayable === 35000, 'Current payable reflects verified opening balance');

// ----------------------------------------------------------------------------
// 4. TEST SELLER LEDGER MOVEMENTS & IDEMPOTENCY
// ----------------------------------------------------------------------------
console.log('\n--- 4. Testing Seller Ledger Movements & Idempotency ---');
const seller1Ledger = FishMaster.getSellerLedger(seller1.data.sellerId);
assert(seller1Ledger.length >= 1, 'Opening balance automatically created ledger entry');
assert(seller1Ledger[0]['Voucher Type'] === 'OPENING_BALANCE', 'First ledger entry is OPENING_BALANCE');
assert(Number(seller1Ledger[0]['Outstanding Balance (₹)']) === 35000, 'Ledger initial outstanding balance is ₹35,000');

// ----------------------------------------------------------------------------
// 5. TEST FISH PROCUREMENT & WEIGHBRIDGE CALCULATIONS
// ----------------------------------------------------------------------------
console.log('\n--- 5. Testing Fish Procurement & Weighbridge Logic ---');

// 5.1 Valid Inward Voucher Creation with Double-Weighing
const proc1 = FishProcurement.createProcurementVoucher({
  sellerId: seller1.data.sellerId,
  speciesId: 'FSH-SPC-001', // Rohu & Katla
  gradeId: 'FSH-GRD-001',   // Grade A
  mandiId: 'FSH-MND-001',   // Paradeep Harbor
  vehicleId: 'FSH-VEH-001',
  driverName: 'Bapi Nayak',
  grossWeightKg: 2500,
  tareWeightKg: 300,
  shrinkageDeductionKg: 20, // Net = 2500 - 300 - 20 = 2180 Kg
  crateCount: 65,
  ratePerKg: 140.00,        // Gross Total = 2180 * 140 = ₹3,05,200.00
  deductions: 5200.00,      // Net Payable = 3,05,200 - 5200 = ₹3,00,000.00
  amountPaid: 100000.00,    // Balance Due = ₹2,00,000.00
  paymentMode: 'Bank Transfer',
  weighbridgeOperator: 'Weighbridge Till #1'
}, 'procurement.officer@tfcgroup.com');

if (!proc1.success) console.log('proc1 error details:', JSON.stringify(proc1, null, 2));
assert(proc1.success === true, 'Procurement voucher created successfully');
assert(proc1.data.netWeight === 2180, 'Weighbridge Net Weight calculated correctly (2180 Kg)');
assert(proc1.data.grossTotal === 305200, 'Gross Total calculated correctly (₹3,05,200)');
assert(proc1.data.netPayable === 300000, 'Net Payable calculated correctly after deductions (₹3,00,000)');
assert(proc1.data.balanceDue === 200000, 'Balance Due calculated correctly (₹2,00,000)');
assert(proc1.data.paymentStatus === 'PARTIAL', 'Payment Status marked as PARTIAL');
assert(proc1.data.lotId.startsWith('FSH-LOT-'), 'Fish Lot automatically generated (FSH-LOT-...)');

// 5.2 Verify Linked Lot in FISH_Lots
const linkedLots = FishProcurement.getProcurementLots(proc1.data.voucherId);
assert(linkedLots.length === 1, 'Linked lot found in FISH_Lots');
assert(Number(linkedLots[0]['Initial Qty (Kg)']) === 2180, 'Lot initial quantity matches voucher net weight (2180 Kg)');
assert(Number(linkedLots[0]['Available Qty (Kg)']) === 2180, 'Lot available quantity initialized to 2180 Kg');
assert(linkedLots[0]['Status'] === 'ACTIVE', 'Lot status is ACTIVE');

// 5.3 Verify Automatic Seller Ledger Posting
const updatedLedger = FishMaster.getSellerLedger(seller1.data.sellerId);
assert(updatedLedger.length === 2, 'Seller ledger has 2 entries (Opening + Procurement)');
const procLedgerEntry = updatedLedger[1];
assert(procLedgerEntry['Voucher Type'] === 'PROCUREMENT', 'Second entry voucher type is PROCUREMENT');
assert(Number(procLedgerEntry['Gross Amount (₹)']) === 305200, 'Ledger records Gross Amount ₹3,05,200');
assert(Number(procLedgerEntry['Net Amount (₹)']) === 300000, 'Ledger records Net Amount ₹3,00,000');
assert(Number(procLedgerEntry['Payment Amount (₹)']) === 100000, 'Ledger records Payment Amount ₹1,00,000');
assert(Number(procLedgerEntry['Outstanding Balance (₹)']) === 235000, 'Ledger running balance: ₹35,000 + ₹3,00,000 - ₹1,00,000 = ₹2,35,000');

// 5.4 Check Updated Seller Financial Summary
const updatedSummary = FishMaster.getSellerFinancialSummary(seller1.data.sellerId);
assert(updatedSummary.liveProcurementCount === 1, 'Live procurement count updated to 1');
assert(updatedSummary.totalProcurementCount === 29, 'Total procurement count: 28 prior + 1 live = 29');
assert(updatedSummary.currentPayable === 235000, 'Seller current payable is exactly ₹2,35,000');

// 5.5 Weighbridge Validation: Rejection of Invalid Weights
const invalidWeight = FishProcurement.createProcurementVoucher({
  sellerId: seller1.data.sellerId,
  speciesId: 'FSH-SPC-001',
  grossWeightKg: 500,
  tareWeightKg: 600, // Tare > Gross -> Invalid
  ratePerKg: 100
}, 'procurement.officer@tfcgroup.com');
assert(invalidWeight.success === false, 'Invalid weight triple (Tare > Gross) rejected');

// 5.6 Rejection of Inactive Seller
FishMaster.setSpeciesStatus('FSH-SPC-006', 'Inactive', 'procurement.officer@tfcgroup.com');
const inactiveProc = FishProcurement.createProcurementVoucher({
  sellerId: seller1.data.sellerId,
  speciesId: 'FSH-SPC-006', // Inactive Species
  grossWeightKg: 500,
  tareWeightKg: 50,
  ratePerKg: 100
}, 'procurement.officer@tfcgroup.com');
assert(inactiveProc.success === false, 'Procurement with inactive species rejected');

// 5.7 Procurement Voucher Cancellation & Ledger Reversal
const cancelRes = FishProcurement.cancelProcurementVoucher(proc1.data.voucherId, 'Consignment quality rejected on deep chill check', 'procurement.officer@tfcgroup.com');
assert(cancelRes.success === true, 'Procurement voucher cancelled successfully');

const cancelledVoucher = FishProcurement.getProcurementVoucher(proc1.data.voucherId);
assert(cancelledVoucher['Status'] === 'CANCELLED', 'Voucher status updated to CANCELLED');

const cancelledLot = FishProcurement.getProcurementLots(proc1.data.voucherId)[0];
assert(cancelledLot['Status'] === 'CLOSED', 'Linked fish lot closed on cancellation');

const ledgerAfterCancel = FishMaster.getSellerLedger(seller1.data.sellerId);
assert(ledgerAfterCancel.length === 3, 'Ledger has 3 entries after cancellation');
const cancelLedgerEntry = ledgerAfterCancel[2];
assert(cancelLedgerEntry['Voucher Type'] === 'ADJUSTMENT', 'Cancellation ledger entry type is ADJUSTMENT');
assert(Number(cancelLedgerEntry['Outstanding Balance (₹)']) === 35000, 'Outstanding balance restored to initial ₹35,000');

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
console.log('\n========================================================');
console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
if (passedTests === totalTests) {
  console.log('  🎉 ALL PHASE 3 FISH PROCUREMENT & SELLER TESTS PASSED WITH ZERO ERRORS!');
} else {
  console.log(`  ⚠️ ${totalTests - passedTests} TESTS FAILED.`);
}
console.log('========================================================\n');
