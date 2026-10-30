// ==========================================================================
// ECLIPTARA — Automated Test Suite Runner
// ==========================================================================

import { runAstronomyTests } from "./astronomy.test.js";
import { runImpactTests } from "./impact.test.js";
import { runApiTests } from "./api.test.js";

console.log("==================================================");
console.log("☄️  ECLIPTARA — SCIENTIFIC VALIDATION SUITE");
console.log("==================================================");

let failed = false;

try {
  runAstronomyTests();
  runImpactTests();
  runApiTests();
  console.log("==================================================");
  console.log("✅ ALL TESTS PASSED! SCIENTIFIC MODELS VERIFIED.");
  console.log("==================================================");
} catch (err) {
  console.error("❌ TEST FAILURE:", err);
  failed = true;
  process.exit(1);
}

