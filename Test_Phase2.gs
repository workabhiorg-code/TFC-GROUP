/**
 * ============================================================================
 * TFC GROUP — PHASE 2 APPS SCRIPT TEST HARNESS (Test_Phase2.gs)
 * ============================================================================
 * In-cloud test runner executable directly from Google Apps Script editor.
 * Validates: Fish_Master.gs, Fish_Setup.gs, Schemas, Seed Data, Rates.
 * ============================================================================
 */

function runPhase2Tests() {
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

  Logger.log('Starting Phase 2 Fish Master Data Test Execution...');

  // 1. Setup
  const setupRes = FishSetup.setupFishMasterSheets();
  assert(setupRes && setupRes.success === true, 'setupFishMasterSheets executes successfully');

  // 2. Species
  const speciesList = FishMaster.getAllSpecies(false);
  assert(speciesList && speciesList.length > 0, 'getAllSpecies returns active species');

  // 3. Grades
  const gradesList = FishMaster.getAllGrades(false);
  assert(gradesList && gradesList.length > 0, 'getAllGrades returns active grades');

  // 4. Rates Deterministic Lookup
  const rohuRate = FishMaster.getEffectiveRate('FSH-SPC-ROHU', 'FSH-GRD-ROHU-A', 'GLOBAL', 'PURCHASE', new Date());
  assert(rohuRate !== null && Number(rohuRate['Rate/Kg (₹)']) > 0, 'getEffectiveRate retrieves active purchase rate for Rohu');

  // 5. Sellers
  const sellersList = FishMaster.getAllSellers(false);
  assert(sellersList && sellersList.length > 0, 'getAllSellers returns registered sellers');

  // 6. Vehicles & Drivers
  const vehList = FishMaster.getAllVehicles(false);
  assert(vehList && vehList.length > 0, 'getAllVehicles returns active vehicles');
  const drvList = FishMaster.getAllDrivers(false);
  assert(drvList && drvList.length > 0, 'getAllDrivers returns active drivers');

  // 7. Unified Master State
  const unified = FishMaster.getAllFishMasterData(false);
  assert(unified && unified.success === true && unified.species.length > 0, 'getAllFishMasterData returns complete master payload');

  const summary = `\n========================================\nPHASE 2 TESTS: ${passed} PASSED, ${failed} FAILED\n========================================`;
  Logger.log(results.join('\n') + summary);

  return {
    success: failed === 0,
    passed: passed,
    failed: failed,
    results: results
  };
}
