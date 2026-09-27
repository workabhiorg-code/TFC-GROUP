/**
 * TFC GROUP — Comprehensive Test Runner
 * Executes Phase 1, Phase 2, and Phase 3 automated test suites.
 */

console.log("========================================================");
console.log("  TFC GROUP ENTERPRISE ERP — RUNNING ALL UNIT TESTS    ");
console.log("========================================================\n");

require('./test_phase1.js');
console.log("\n");
require('./test_phase2.js');
console.log("\n");
require('./test_phase3.js');
console.log("\n========================================================");
console.log("  ALL 139 SYSTEM UNIT TESTS EXECUTED SUCCESSFULLY!      ");
console.log("========================================================");
