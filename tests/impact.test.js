// ==========================================================================
// Orbit Watch — Unit Tests: Impact Physics Model
// ==========================================================================

import assert from "node:assert";
import { computeImpactPhysics, formatEnergyLabel } from "../js/astronomy/impact-physics.js";

export function runImpactTests() {
  console.log("Running Impact Physics tests...");

  // Test airburst threshold: small rocks (< 25m) are classified as airbursts
  const smallRock = computeImpactPhysics({ diameterM: 18, velocityKmh: 45000 });
  assert.strictEqual(smallRock.isAirburst, true, "18m asteroid must be classified as atmospheric airburst");
  assert.strictEqual(smallRock.craterDiameterKm, 0, "Airburst should produce zero primary surface crater diameter");

  // Larger rock (e.g. 150m) must create a surface crater
  const largeRock = computeImpactPhysics({ diameterM: 150, velocityKmh: 54000 });
  assert.strictEqual(largeRock.isAirburst, false, "150m asteroid must produce a surface crater");
  assert.ok(largeRock.craterDiameterKm > 0.5, "150m asteroid should produce crater > 0.5 km wide");

  // Kinetic energy must increase with mass (diameter^3) and velocity^2
  const fastRock = computeImpactPhysics({ diameterM: 150, velocityKmh: 108000 }); // 2x velocity
  assert.ok(
    fastRock.kineticEnergyJoules > 3.8 * largeRock.kineticEnergyJoules,
    "Doubling velocity must quadruple kinetic energy"
  );

  // Blast wave 1 psi radius must be larger than 5 psi radius
  assert.ok(
    largeRock.blastOverpressure1psiKm > largeRock.blastOverpressure5psiKm,
    "1 psi glass shatter zone must exceed 5 psi structural collapse zone"
  );

  // Energy formatting
  assert.strictEqual(formatEnergyLabel(12.5), "12.5 Mt TNT");
  assert.strictEqual(formatEnergyLabel(0.045), "45 kt TNT");

  console.log("✓ All Impact Physics tests passed successfully!");
}

