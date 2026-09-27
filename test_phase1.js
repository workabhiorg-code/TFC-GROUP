/**
 * ============================================================================
 * TFC GROUP — PHASE 1 TEST RUNNER (test_phase1.js)
 * ============================================================================
 * Comprehensive unit test suite validating the shared foundation modules:
 * Config.gs, Core_Utils.gs, Core_Data.gs, Core_Validation.gs, Core_Audit.gs, Core_Auth.gs
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock GAS environment globals for local execution
global.Session = {
  getScriptTimeZone: () => 'Asia/Kolkata',
  getActiveUser: () => ({ getEmail: () => 'manager@tfcgroup.com' }),
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

// Mock SpreadsheetApp
global.SpreadsheetApp = {
  getActiveSpreadsheet: () => null,
  openById: () => null
};

// Load GS files into global execution context
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
console.log('  RUNNING TFC GROUP PHASE 1 SHARED FOUNDATION TESTS');
console.log('========================================================\n');

// ----------------------------------------------------
// TEST GROUP 1: Config.gs
// ----------------------------------------------------
console.log('--- 1. Testing Config.gs ---');
assert(TFC_CONFIG.BUSINESS_PRIORITY[0].id === 'FISH' && TFC_CONFIG.BUSINESS_PRIORITY[0].rank === 1, 'Fish Transport is Priority #1');
assert(TFC_CONFIG.BUSINESS_PRIORITY[1].id === 'CAT' && TFC_CONFIG.BUSINESS_PRIORITY[1].rank === 2, 'Catering is Priority #2');
assert(TFC_CONFIG.BUSINESS_PRIORITY[2].id === 'MINE' && TFC_CONFIG.BUSINESS_PRIORITY[2].rank === 3, 'Stone Mining is Priority #3');
assert(TFC_CONFIG.BUSINESS_PRIORITY[3].id === 'CONST' && TFC_CONFIG.BUSINESS_PRIORITY[3].rank === 4, 'Construction is Priority #4');
assert(TFC_CONFIG.BUSINESS_PRIORITY[4].id === 'OUTLET' && TFC_CONFIG.BUSINESS_PRIORITY[4].rank === 5, 'Pragati Outlet is Priority #5');
assert(TFC_CONFIG.BUSINESS_PRIORITY[5].id === 'PLT' && TFC_CONFIG.BUSINESS_PRIORITY[5].rank === 6, 'Poultry is Priority #6');
assert(TFC_CONFIG.SHEETS.FISH_PROCUREMENT === 'FISH_Procurement', 'FISH_Procurement sheet defined');
assert(TFC_CONFIG.SHEETS.LEGACY_FISH_BATCHES === 'FISH_Batches', 'Legacy FISH_Batches sheet preserved in config');
assert(TFC_CONFIG.PAYMENT_MODES.includes('Cash') && TFC_CONFIG.PAYMENT_MODES.includes('UPI'), 'Payment modes configured');

// ----------------------------------------------------
// TEST GROUP 2: Core_Utils.gs
// ----------------------------------------------------
console.log('\n--- 2. Testing Core_Utils.gs ---');

// ID Generation
const id1 = CoreUtils.generateId('FSH-PUR');
const id2 = CoreUtils.generateId('FSH-PUR');
assert(id1.startsWith('FSH-PUR-'), 'generateId has correct prefix');
assert(id1 !== id2, 'generateId produces unique sequential IDs');

// Collision resistance check: 500 unique IDs
const idSet = new Set();
for (let i = 0; i < 500; i++) {
  idSet.add(CoreUtils.generateId('TEST'));
}
assert(idSet.size === 500, '500 generated IDs contain zero collisions');

// Strict number parsing
assert(CoreUtils.parseStrictNumber(125.5) === 125.5, 'parseStrictNumber accepts numbers');
assert(CoreUtils.parseStrictNumber('₹ 1,25,000.50') === 125000.5, 'parseStrictNumber cleans INR formatting');
let parseErrorCaught = false;
try {
  CoreUtils.parseStrictNumber('invalid_text', 'TestField');
} catch (e) {
  parseErrorCaught = true;
}
assert(parseErrorCaught, 'parseStrictNumber throws error on invalid text input');

// Currency & Weight Rounding
assert(CoreUtils.roundCurrency(125.456) === 125.46, 'roundCurrency rounds to 2 decimal places');
assert(CoreUtils.roundWeight(125.45678) === 125.457, 'roundWeight rounds to 3 decimal places');

// Indian Numbering System Formatting
assert(CoreUtils.formatINR(125000) === '₹ 1,25,000.00', 'formatINR formats Lakhs (₹ 1,25,000.00)');
assert(CoreUtils.formatINR(10000000) === '₹ 1,00,00,000.00', 'formatINR formats Crores (₹ 1,00,00,000.00)');
assert(CoreUtils.formatINR(-4500.5) === '₹ -4,500.50', 'formatINR formats negative amounts');

// Response objects
const successRes = CoreUtils.createSuccessResponse({ id: '123' }, 'Item created');
assert(successRes.success === true && successRes.data.id === '123', 'createSuccessResponse structure');
const errRes = CoreUtils.createErrorResponse('Failed to create', 'VALIDATION_ERR');
assert(errRes.success === false && errRes.errorCode === 'VALIDATION_ERR', 'createErrorResponse structure');

// ----------------------------------------------------
// TEST GROUP 3: Core_Validation.gs
// ----------------------------------------------------
console.log('\n--- 3. Testing Core_Validation.gs ---');

// Required fields
const reqResultPass = CoreValidation.validateRequiredFields({ a: 1, b: 'test' }, ['a', 'b']);
assert(reqResultPass.isValid === true, 'validateRequiredFields passes on full data');
const reqResultFail = CoreValidation.validateRequiredFields({ a: 1, b: '' }, ['a', 'b', 'c']);
assert(reqResultFail.isValid === false && reqResultFail.missing.length === 2, 'validateRequiredFields identifies missing keys');

// Weight integrity tests
const validWeight = CoreValidation.validateWeightTriple(100, 15);
assert(validWeight.isValid === true && validWeight.net === 85, 'validateWeightTriple: Gross 100, Tare 15 -> Net 85');

const validWeightWithShrinkage = CoreValidation.validateWeightTriple(100, 15, null, { shrinkage: 2 });
assert(validWeightWithShrinkage.isValid === true && validWeightWithShrinkage.net === 83, 'validateWeightTriple: Gross 100, Tare 15, Shrinkage 2 -> Net 83');

const invalidGrossZero = CoreValidation.validateWeightTriple(0, 0);
assert(invalidGrossZero.isValid === false, 'validateWeightTriple: Gross = 0 is rejected');

const invalidTareGreater = CoreValidation.validateWeightTriple(50, 60);
assert(invalidTareGreater.isValid === false, 'validateWeightTriple: Tare (60) > Gross (50) is rejected');

const invalidTareEqual = CoreValidation.validateWeightTriple(50, 50);
assert(invalidTareEqual.isValid === false, 'validateWeightTriple: Tare (50) == Gross (50) is rejected');

const assertedNetMismatch = CoreValidation.validateWeightTriple(100, 20, 75); // Net should be 80, not 75
assert(assertedNetMismatch.isValid === false, 'validateWeightTriple: Asserted Net mismatch is rejected');

// Rate & Total Billing validation
const rateTest = CoreValidation.validateRateAndTotal(85.5, 250);
assert(rateTest.isValid === true && rateTest.total === 21375, 'validateRateAndTotal calculates ₹21,375.00');

const rateMismatch = CoreValidation.validateRateAndTotal(10, 100, 950);
assert(rateMismatch.isValid === false, 'validateRateAndTotal rejects mismatched total');

// Payment Mode Validation
assert(CoreValidation.validatePaymentMode('Cash').isValid === true, 'validatePaymentMode accepts "Cash"');
assert(CoreValidation.validatePaymentMode('UPI').isValid === true, 'validatePaymentMode accepts "UPI"');
assert(CoreValidation.validatePaymentMode('Bitcoin').isValid === false, 'validatePaymentMode rejects unaccepted tender "Bitcoin"');

// Status Transitions
assert(CoreValidation.validateStatusTransition('SHIPMENT', 'CREATED', 'LOADED').isValid === true, 'Status transition: CREATED -> LOADED allowed');
assert(CoreValidation.validateStatusTransition('SHIPMENT', 'CREATED', 'COMPLETED').isValid === false, 'Status transition: CREATED -> COMPLETED blocked');

// Lot Allocation Interface
const validAlloc = CoreValidation.validateLotAllocationInterface({
  lotId: 'FSH-LOT-101',
  sellerId: 'FSH-SLR-201',
  trayCount: 5,
  grossWeight: 120,
  tareWeight: 20,
  ratePerKg: 180
});
assert(validAlloc.isValid === true, 'validateLotAllocationInterface passes for valid allocation request');

// ----------------------------------------------------
// TEST GROUP 4: Core_Auth.gs
// ----------------------------------------------------
console.log('\n--- 4. Testing Core_Auth.gs ---');

// Super Admin wildcard check
assert(CoreAuth.checkPermission('Super Admin', 'ANY_ACTION_XYZ').allowed === true, 'Super Admin has wildcard * permission');

// Manager Role
assert(CoreAuth.checkPermission('Manager', 'PROCURE_CREATE').allowed === true, 'Manager can create procurement');
assert(CoreAuth.checkPermission('Manager', 'DAILY_CLOSE_SUBMIT').allowed === true, 'Manager can submit daily close');
assert(CoreAuth.checkPermission('Manager', 'DAILY_CLOSE_REOPEN').allowed === false, 'Manager cannot reopen daily close');

// Billing Staff Role
assert(CoreAuth.checkPermission('Billing Staff', 'INVOICE_CREATE').allowed === true, 'Billing Staff can create invoice');
assert(CoreAuth.checkPermission('Billing Staff', 'PROCURE_CREATE').allowed === false, 'Billing Staff cannot create procurement');

// Transport Staff Role
assert(CoreAuth.checkPermission('Transport Staff', 'SHIPMENT_DISPATCH').allowed === true, 'Transport Staff can dispatch shipment');
assert(CoreAuth.checkPermission('Transport Staff', 'INVOICE_CREATE').allowed === false, 'Transport Staff cannot create invoice');

// Viewer Role (Least Privilege)
assert(CoreAuth.checkPermission('Viewer', 'REPORTS_VIEW').allowed === true, 'Viewer can view reports');
assert(CoreAuth.checkPermission('Viewer', 'INVOICE_CREATE').allowed === false, 'Viewer cannot create invoice');

// Assert Permission error throwing
let assertPassed = false;
try {
  CoreAuth.assertPermission('Viewer', 'PROCURE_CREATE');
} catch (e) {
  assertPassed = true;
}
assert(assertPassed, 'assertPermission throws error on unauthorized action');

// ----------------------------------------------------
// TEST GROUP 5: Core_Audit.gs
// ----------------------------------------------------
console.log('\n--- 5. Testing Core_Audit.gs ---');

const auditId = CoreAudit.log({
  action: 'PROCURE_CREATE',
  vertical: 'Fish Transport',
  entityType: 'PURCHASE',
  entityId: 'FSH-PUR-20260928-001',
  actor: 'procurement.officer@tfcgroup.com',
  details: {
    species: 'Rohu',
    weight: 2500,
    password: 'SuperSecretPasswordShouldBeMasked',
    token: 'jwt_secret_token_here'
  }
});
assert(auditId.startsWith('AUD-'), 'CoreAudit.log returns generated Audit ID');

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log('\n========================================================');
console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
if (failedTests.length === 0) {
  console.log('  🎉 ALL PHASE 1 UNIT TESTS PASSED WITH ZERO ERRORS!');
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
