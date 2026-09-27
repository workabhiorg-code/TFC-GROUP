/**
 * ============================================================================
 * TFC GROUP — PHASE 2 TEST RUNNER (test_phase2.js)
 * ============================================================================
 * Comprehensive unit test suite for Fish Master Data (Fish_Master.gs, Fish_Setup.gs).
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// In-memory mock spreadsheet database for testing
const mockSheetsData = {};

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

// Mock GAS environment globals
global.Session = {
  getScriptTimeZone: () => 'Asia/Kolkata',
  getActiveUser: () => ({ getEmail: () => 'admin@tfcgroup.com' }),
  getEffectiveUser: () => ({ getEmail: () => 'admin@tfcgroup.com' })
};

global.Utilities = {
  formatDate: (d, tz, pattern) => {
    const pad = n => String(n).padStart(2, '0');
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hr = pad(d.getHours());
    const min = pad(d.getMinutes());
    const sec = pad(d.getSeconds());
    if (pattern === 'yyyyMMdd') return `${y}${m}${day}`;
    if (pattern === 'yyyy-MM-dd') return `${y}-${m}-${day}`;
    if (pattern === 'yyyy-MM-dd HH:mm:ss') return `${y}-${m}-${day} ${hr}:${min}:${sec}`;
    return `${y}-${m}-${day}`;
  }
};

global.SpreadsheetApp = {
  getActiveSpreadsheet: () => mockSs,
  openById: () => mockSs
};

global.getDatabase = () => mockSs;

// Load all GS files in global context
function loadScript(filename) {
  const code = fs.readFileSync(path.join(__dirname, filename), 'utf8');
  vm.runInThisContext(code, { filename });
}

loadScript('Config.gs');
loadScript('Core_Utils.gs');
loadScript('Core_Data.gs');
loadScript('Core_Validation.gs');
loadScript('Core_Audit.gs');
loadScript('Core_Auth.gs');
loadScript('Fish_Procurement.gs');
loadScript('Fish_Master.gs');
loadScript('Fish_Setup.gs');

let totalTests = 0;
let passedTests = 0;
let failedTests = [];

function assert(condition, testName, details) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests.push({ name: testName, details });
    console.error(`  ❌ [FAIL] ${testName}: ${details || 'Assertion failed'}`);
  }
}

console.log('\n========================================================');
console.log('  RUNNING TFC GROUP PHASE 2 FISH MASTER DATA TESTS');
console.log('========================================================\n');

// ----------------------------------------------------
// 1. SETUP & SCHEMA TESTS
// ----------------------------------------------------
console.log('--- 1. Testing Fish_Setup.gs ---');
const setupRes1 = FishSetup.setupFishMasterSheets(mockSs);
assert(setupRes1.success === true, 'setupFishMasterSheets runs successfully');
assert(setupRes1.data.createdSheets.length >= 9, 'All 9 master sheets created');
assert(setupRes1.data.seededRecords.species > 0, 'Seed records populated for Species');
assert(setupRes1.data.seededRecords.sellers > 0, 'Seed records populated for Sellers');

// Idempotency check: run setup again
const setupRes2 = FishSetup.setupFishMasterSheets(mockSs);
assert(setupRes2.success === true, 'Repeat setup runs without errors');
assert(setupRes2.data.createdSheets.length === 0, 'No duplicate sheets created on second run');
assert(FishMaster.getAllSpecies(true).length >= 6, 'Existing records preserved on second setup run');

// ----------------------------------------------------
// 2. FISH SPECIES TESTS
// ----------------------------------------------------
console.log('\n--- 2. Testing Fish Species CRUD ---');
const newSpeciesRes = FishMaster.createSpecies({
  commonName: 'Silver Pomfret Premium',
  localName: 'Chandi Machha',
  scientificName: 'Pampus argenteus',
  defaultUnit: 'Kg',
  notes: 'High grade coastal harvest'
}, 'admin@tfcgroup.com');
assert(newSpeciesRes.success === true, 'createSpecies creates new species');
const createdSpeciesId = newSpeciesRes.data.speciesId;

// Duplicate species name rejection
const dupSpecies = FishMaster.createSpecies({ commonName: 'Silver Pomfret Premium' }, 'admin@tfcgroup.com');
assert(dupSpecies.success === false, 'Duplicate species common name rejected');

// Species update
const updateSpeciesRes = FishMaster.updateSpecies(createdSpeciesId, { localName: 'Rupachanda / Chandi' }, 'admin@tfcgroup.com');
assert(updateSpeciesRes.success === true, 'updateSpecies updates fields');

// Species deactivation
const deactSpecies = FishMaster.setSpeciesStatus(createdSpeciesId, 'Inactive', 'admin@tfcgroup.com');
assert(deactSpecies.success === true, 'setSpeciesStatus deactivates species');
const activeSpeciesList = FishMaster.getAllSpecies(false);
assert(!activeSpeciesList.some(s => s['Species ID'] === createdSpeciesId), 'Deactivated species excluded from active list');
const allSpeciesList = FishMaster.getAllSpecies(true);
assert(allSpeciesList.some(s => s['Species ID'] === createdSpeciesId), 'Deactivated species included in full list');

// ----------------------------------------------------
// 3. FISH GRADES TESTS
// ----------------------------------------------------
console.log('\n--- 3. Testing Fish Grades CRUD ---');
const gradeRes = FishMaster.createGrade({
  gradeCode: 'Jumbo Premium (3.0 Kg+)',
  speciesId: 'FSH-SPC-001',
  description: 'Extra large size for banquet catering'
}, 'admin@tfcgroup.com');
assert(gradeRes.success === true, 'createGrade creates new grade');

// Grade foreign key validation (invalid species)
const invalidGrade = FishMaster.createGrade({
  gradeCode: 'Invalid Grade',
  speciesId: 'NON_EXISTENT_SPECIES'
}, 'admin@tfcgroup.com');
assert(invalidGrade.success === false, 'Grade creation rejects non-existent Species ID');

// Grade filtering by species
const rohuGrades = FishMaster.getGradesBySpecies('FSH-SPC-001', true);
assert(rohuGrades.length >= 2, 'getGradesBySpecies returns matching grades');

// ----------------------------------------------------
// 4. HISTORICAL RATE ENGINE & DETERMINISTIC LOOKUP
// ----------------------------------------------------
console.log('\n--- 4. Testing Historical Rate Engine ---');

// Record a historical rate for Rohu in 2026-08-01
const pastRateRes = FishMaster.recordRate({
  speciesId: 'FSH-SPC-001',
  gradeId: 'FSH-GRD-001',
  mandiScope: 'FSH-MND-001',
  rateType: 'PURCHASE',
  ratePerKg: 130,
  effectiveFrom: '2026-08-01 00:00:00',
  effectiveTo: '2026-08-31 23:59:59',
  sourceReference: 'August Paradeep Mandi Circular'
}, 'admin@tfcgroup.com');
assert(pastRateRes.success === true, 'recordRate registers historical rate');

// Record current rate for Rohu in 2026-09-01 onwards
const currentRateRes = FishMaster.recordRate({
  speciesId: 'FSH-SPC-001',
  gradeId: 'FSH-GRD-001',
  mandiScope: 'FSH-MND-001',
  rateType: 'PURCHASE',
  ratePerKg: 145,
  effectiveFrom: '2026-09-01 00:00:00',
  sourceReference: 'September Updated Base Rate'
}, 'admin@tfcgroup.com');
assert(currentRateRes.success === true, 'recordRate registers current rate');

// Rejection of negative / zero rate
const invalidZeroRate = FishMaster.recordRate({
  speciesId: 'FSH-SPC-001',
  rateType: 'PURCHASE',
  ratePerKg: 0
}, 'admin@tfcgroup.com');
assert(invalidZeroRate.success === false, 'recordRate rejects 0 rate');

// Deterministic Rate Lookup as of August 2026
const augLookup = FishMaster.getEffectiveRate('FSH-SPC-001', 'FSH-GRD-001', 'FSH-MND-001', 'PURCHASE', '2026-08-15');
assert(augLookup !== null && Number(augLookup['Rate/Kg (₹)']) === 130, 'Deterministic lookup returns historical rate ₹130 for August 2026');

// Deterministic Rate Lookup as of Current Date
const curLookup = FishMaster.getEffectiveRate('FSH-SPC-001', 'FSH-GRD-001', 'FSH-MND-001', 'PURCHASE', '2026-09-28');
assert(curLookup !== null && Number(curLookup['Rate/Kg (₹)']) === 145, 'Deterministic lookup returns latest rate ₹145 for September 2026');

// Specificity Fallback (GLOBAL scope when Mandi scope not defined)
const globalLookup = FishMaster.getEffectiveRate('FSH-SPC-001', 'FSH-GRD-001', 'UNLISTED_MANDI', 'PURCHASE', '2026-09-28');
assert(globalLookup !== null && Number(globalLookup['Rate/Kg (₹)']) >= 140, 'Specificity fallback finds GLOBAL base rate');

// ----------------------------------------------------
// 5. SUPPLIERS & MANDIS TESTS
// ----------------------------------------------------
console.log('\n--- 5. Testing Suppliers & Mandis CRUD ---');
const mandiRes = FishMaster.createMandi({
  mandiName: 'Chandipur Marine Harbor',
  location: 'Chandipur, Balasore',
  contactPerson: 'Kailash Mandal',
  phone: '+91 94370 22334',
  commissionRate: 1.8
}, 'admin@tfcgroup.com');
assert(mandiRes.success === true, 'createMandi creates new mandi');

const supplierRes = FishMaster.createSupplier({
  supplierName: 'Bay of Bengal Deep Sea Catch Federation',
  contactPerson: 'Captain D. K. Sahoo',
  phone: '+91 98610 11223',
  address: 'Jetty 2, Paradeep',
  associatedMandi: 'FSH-MND-PARADEEP',
  openingBalance: 0
}, 'admin@tfcgroup.com');
assert(supplierRes.success === true, 'createSupplier registers new supplier');

// ----------------------------------------------------
// 6. SELLERS TESTS
// ----------------------------------------------------
console.log('\n--- 6. Testing Sellers CRUD ---');
const sellerRes = FishMaster.createSeller({
  sellerName: 'Kolkata Central Fish Wholesalers',
  shopName: 'Maa Tara Fish Agency',
  phone: '+91 93344 11223',
  market: 'Sealdah Fish Market, Kolkata',
  creditLimit: 300000,
  creditPeriod: 7,
  openingBalance: -25000
}, 'admin@tfcgroup.com');
assert(sellerRes.success === true, 'createSeller registers new seller with credit limits');

// Seller update
const sellerUpdate = FishMaster.updateSeller(sellerRes.data.sellerId, { creditLimit: 400000 }, 'admin@tfcgroup.com');
assert(sellerUpdate.success === true, 'updateSeller updates credit limit');

// ----------------------------------------------------
// 7. FLEET VEHICLES & DRIVERS TESTS
// ----------------------------------------------------
console.log('\n--- 7. Testing Vehicles & Drivers CRUD ---');
const vehRes = FishMaster.createVehicle({
  registrationNo: 'OD-02-KL-9988',
  vehicleType: 'Refrigerated Cold Van (Tata 407)',
  capacityKg: 3500,
  ownershipType: 'Owned'
}, 'admin@tfcgroup.com');
assert(vehRes.success === true, 'createVehicle registers fleet vehicle');

// Duplicate vehicle registration prevention
const dupVeh = FishMaster.createVehicle({
  registrationNo: 'OD-02-KL-9988',
  capacityKg: 2000
}, 'admin@tfcgroup.com');
assert(dupVeh.success === false, 'Duplicate vehicle registration number rejected');

// Driver creation
const drvRes = FishMaster.createDriver({
  driverName: 'Pradeep Das',
  phone: '+91 94371 44556',
  licenseNo: 'OD02-20160098765',
  licenseExpiry: '2030-06-30'
}, 'admin@tfcgroup.com');
assert(drvRes.success === true, 'createDriver registers driver profile');

// ----------------------------------------------------
// 8. DESTINATIONS & UNIFIED STATE LOADER
// ----------------------------------------------------
console.log('\n--- 8. Testing Destinations & Unified State Loader ---');
const destRes = FishMaster.createDestination({
  marketName: 'Digha Wholesale Landing Market',
  city: 'Digha, West Bengal',
  notes: 'Interstate border delivery point'
}, 'admin@tfcgroup.com');
assert(destRes.success === true, 'createDestination registers destination market');

const unifiedState = FishMaster.getAllFishMasterData(false);
assert(unifiedState.success === true, 'getAllFishMasterData returns unified master state');
assert(unifiedState.species.length > 0, 'Unified state contains species array');
assert(unifiedState.sellers.length > 0, 'Unified state contains sellers array');
assert(unifiedState.vehicles.length > 0, 'Unified state contains vehicles array');
assert(unifiedState.drivers.length > 0, 'Unified state contains drivers array');
assert(unifiedState.mandis.length > 0, 'Unified state contains mandis array');

// ----------------------------------------------------
// 9. AUTHORIZATION & SECURITY TESTS
// ----------------------------------------------------
console.log('\n--- 9. Testing Authorization & Security on Masters ---');
let viewerWriteBlocked = false;
try {
  FishMaster.createSpecies({ commonName: 'Viewer Illegal Species' }, 'Viewer');
} catch (e) {
  viewerWriteBlocked = true;
}
assert(viewerWriteBlocked, 'Viewer role is blocked from creating master records');

let managerWriteAllowed = false;
try {
  const mRes = FishMaster.createSpecies({ commonName: 'Manager Special Crab', defaultUnit: 'Kg' }, 'Manager');
  if (mRes.success) managerWriteAllowed = true;
} catch (e) {
  managerWriteAllowed = false;
}
assert(managerWriteAllowed, 'Manager role is authorized to create master records');

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log('\n========================================================');
console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
if (failedTests.length === 0) {
  console.log('  🎉 ALL PHASE 2 FISH MASTER TESTS PASSED WITH ZERO ERRORS!');
} else {
  console.log(`  ⚠️ ${failedTests.length} TEST(S) FAILED:`);
  failedTests.forEach(f => console.log(`   - ${f.name}: ${f.details}`));
}
console.log('========================================================\n');

if (failedTests.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
