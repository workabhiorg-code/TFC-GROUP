/**
 * ============================================================================
 * TFC GROUP — PHASE 1 APPS SCRIPT TEST HARNESS (Test_Phase1.gs)
 * ============================================================================
 * In-cloud test runner executable directly from Google Apps Script editor.
 * Validates: Config.gs, Core_Utils.gs, Core_Data.gs, Core_Validation.gs,
 *            Core_Audit.gs, Core_Auth.gs
 * ============================================================================
 */

function runPhase1Tests() {
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

  Logger.log('Starting Phase 1 Test Execution...');

  // 1. Config.gs
  assert(TFC_CONFIG.BUSINESS_PRIORITY[0].id === 'FISH' && TFC_CONFIG.BUSINESS_PRIORITY[0].rank === 1, 'Fish Transport is Priority #1');
  assert(TFC_CONFIG.SHEETS.FISH_PROCUREMENT === 'FISH_Procurement', 'FISH_Procurement sheet defined');
  assert(TFC_CONFIG.SHEETS.LEGACY_FISH_BATCHES === 'FISH_Batches', 'Legacy FISH_Batches sheet preserved');

  // 2. Core_Utils.gs
  const id1 = CoreUtils.generateId('FSH-PUR');
  assert(id1.startsWith('FSH-PUR-'), 'generateId generates correct prefix');
  assert(CoreUtils.parseStrictNumber('₹ 1,25,000.50') === 125000.5, 'parseStrictNumber parses Indian currency format');
  assert(CoreUtils.roundCurrency(125.456) === 125.46, 'roundCurrency rounds to 2 decimals');
  assert(CoreUtils.roundWeight(125.45678) === 125.457, 'roundWeight rounds to 3 decimals');
  assert(CoreUtils.formatINR(125000) === '₹ 1,25,000.00', 'formatINR formats Indian currency');

  // 3. Core_Validation.gs
  const weightTest = CoreValidation.validateWeightTriple(100, 15);
  assert(weightTest.isValid === true && weightTest.net === 85, 'Weight: Gross 100, Tare 15 -> Net 85');
  assert(CoreValidation.validateWeightTriple(50, 60).isValid === false, 'Weight: Tare > Gross rejected');
  assert(CoreValidation.validatePaymentMode('Cash').isValid === true, 'Payment Mode "Cash" accepted');
  assert(CoreValidation.validateStatusTransition('SHIPMENT', 'CREATED', 'LOADED').isValid === true, 'Status: CREATED -> LOADED allowed');
  assert(CoreValidation.validateStatusTransition('SHIPMENT', 'CREATED', 'COMPLETED').isValid === false, 'Status: CREATED -> COMPLETED blocked');

  // 4. Core_Auth.gs
  assert(CoreAuth.checkPermission('Super Admin', 'ANY_ACTION').allowed === true, 'Super Admin wildcard access');
  assert(CoreAuth.checkPermission('Manager', 'PROCURE_CREATE').allowed === true, 'Manager can create procurement');
  assert(CoreAuth.checkPermission('Billing Staff', 'PROCURE_CREATE').allowed === false, 'Billing Staff blocked from procurement');

  // 5. Core_Audit.gs
  const auditId = CoreAudit.log({
    action: 'TEST_PHASE_1',
    vertical: 'Fish Transport',
    entityType: 'TEST',
    entityId: 'TEST-001',
    details: { test: 'Phase 1 Apps Script In-Cloud Execution' }
  });
  assert(auditId && auditId.startsWith('AUD-'), 'Audit logging generates Audit ID');

  const summary = `\n========================================\nPHASE 1 TESTS: ${passed} PASSED, ${failed} FAILED\n========================================`;
  Logger.log(results.join('\n') + summary);

  return {
    success: failed === 0,
    passed: passed,
    failed: failed,
    results: results
  };
}
