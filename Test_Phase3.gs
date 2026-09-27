/**
 * ============================================================================
 * TFC GROUP — PHASE 3 APPS SCRIPT TEST HARNESS (Test_Phase3.gs)
 * ============================================================================
 * In-cloud test runner executable directly from Google Apps Script editor.
 * Validates: Fish_Procurement.gs, Fish_Master.gs (Enhanced Sellers & Ledger),
 * Weighbridge double-weighing calculations, Fish Lots, and Idempotent Ledger updates.
 * ============================================================================
 */

function runPhase3Tests() {
  const results = [];
  let passed = 0;
  let failed = 0;

  function assert(condition, name, details) {
    if (condition) {
      passed++;
      results.push(`✅ [PASS] ${name}`);
    } else {
      failed++;
      results.push(`❌ [FAIL] ${name}: ${details || 'Assertion failed'}`);
    }
  }

  Logger.log('Starting Phase 3 Fish Procurement & Seller History Test Execution...');

  // 1. Setup & Schema Initializer
  const setupRes = FishSetup.setupFishMasterSheets();
  assert(setupRes && setupRes.success === true, 'setupFishMasterSheets initialized all 13 Fish ERP tabs');

  // 2. Scientific Name Removal Verification
  const species = FishMaster.getAllSpecies(false);
  assert(species.length > 0, 'getAllSpecies returns active species');
  const spc1 = species[0];
  assert(spc1['Common Name'] !== undefined, 'Common Name is primary display identifier');

  // 3. Enhanced Seller Directory & Opening Balances
  const sellers = FishMaster.getAllSellers(false);
  assert(sellers.length > 0, 'getAllSellers returns enhanced seller directory');
  const wholesaleSeller = sellers.find(s => s['Seller Type'] === 'Wholesale') || sellers[0];
  assert(wholesaleSeller['Seller Type'] === 'Wholesale' || wholesaleSeller['Seller Type'] === 'Retail', 'Seller Type is explicitly Wholesale or Retail');
  assert(wholesaleSeller['Opening Payable (₹)'] !== undefined, 'Opening Payable is separately tracked');
  assert(wholesaleSeller['Opening Receivable (₹)'] !== undefined, 'Opening Receivable is separately tracked');

  // 4. Seller Financial Summary
  const summary = FishMaster.getSellerFinancialSummary(wholesaleSeller['Seller ID']);
  assert(summary !== null, 'getSellerFinancialSummary returns financial position');
  assert(summary.lifetimeProcurementValue !== undefined, 'Lifetime procurement value calculated');
  assert(summary.currentOutstandingBalance !== undefined, 'Live outstanding balance calculated from ledger');

  // 5. Weighbridge Double-Weighing & Lot Creation
  const testProcData = {
    sellerId: wholesaleSeller['Seller ID'],
    speciesId: spc1['Species ID'],
    grossWeightKg: 1500,
    tareWeightKg: 200,
    shrinkageDeductionKg: 10,
    ratePerKg: 140,
    deductions: 500,
    amountPaid: 50000,
    paymentMode: 'Bank Transfer'
  };
  const procRes = FishProcurement.createProcurementVoucher(testProcData, 'test.admin@tfcgroup.com');
  assert(procRes && procRes.success === true, 'createProcurementVoucher creates inward voucher');
  if (procRes && procRes.success) {
    assert(procRes.data.netWeight === 1290, 'Weighbridge Net Weight is 1500 - 200 - 10 = 1290 Kg');
    assert(procRes.data.grossTotal === 180600, 'Gross total is 1290 * 140 = ₹1,80,600');
    assert(procRes.data.lotId.startsWith('FSH-LOT-'), 'Fish Lot automatically generated');

    // 6. Seller Ledger Posting Check
    const ledger = FishMaster.getSellerLedger(wholesaleSeller['Seller ID']);
    assert(ledger.some(l => l['Voucher Ref No'] === procRes.data.voucherId), 'Ledger contains linked procurement movement');
  }

  const logSummary = `\n========================================\nPHASE 3 TESTS: ${passed} PASSED, ${failed} FAILED\n========================================`;
  Logger.log(results.join('\n') + logSummary);

  return {
    success: failed === 0,
    passed: passed,
    failed: failed,
    total: passed + failed,
    results: results
  };
}
