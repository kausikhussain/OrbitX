// ==========================================================================
// Orbit Watch — Unit Tests: Astronomy Math & Coordinates
// ==========================================================================

import assert from "node:assert";
import {
  kmToLunarDistances,
  kmToAstronomicalUnits,
  kmhToKms,
  diameterFromMagnitude,
  distToSceneUnits,
} from "../js/astronomy/calculations.js";
import { LUNAR_DISTANCE_KM, ASTRONOMICAL_UNIT_KM } from "../js/astronomy/constants.js";
import { calculateEncounterState } from "../js/astronomy/encounter.js";

export function runAstronomyTests() {
  console.log("Running Astronomy Math tests...");

  // Test km to LD conversion
  assert.strictEqual(kmToLunarDistances(384400), 1.0, "384,400 km must equal 1.0 Lunar Distance");
  assert.strictEqual(kmToLunarDistances(768800), 2.0, "768,800 km must equal 2.0 Lunar Distances");
  assert.strictEqual(kmToLunarDistances(0), 0.0);
  assert.strictEqual(kmToLunarDistances(-100), 0.0);

  // Test km to AU conversion
  assert.strictEqual(kmToAstronomicalUnits(ASTRONOMICAL_UNIT_KM), 1.0, "AU distance must equal 1.0 AU");

  // Test velocity conversion km/h to km/s
  assert.strictEqual(kmhToKms(36000), 10.0, "36,000 km/h must equal 10.0 km/s");
  assert.strictEqual(kmhToKms(72000), 20.0, "72,000 km/h must equal 20.0 km/s");

  // Test diameter from absolute magnitude H (Bowell et al. formula)
  // At H = 22.0, D should be roughly 100 - 150m for albedo 0.14
  const d22 = diameterFromMagnitude(22.0, 0.14);
  assert.ok(d22 > 80 && d22 < 200, `Diameter for H=22 should be ~100-150m, got ${d22}`);

  // Test scene logarithmic scale monotonicity
  const r1 = distToSceneUnits(384400); // 1 LD
  const r10 = distToSceneUnits(3844000); // 10 LD
  const r100 = distToSceneUnits(38440000); // 100 LD
  assert.ok(r1 < r10, "Distance scaling must be strictly monotonically increasing");
  assert.ok(r10 < r100, "Distance scaling must be strictly monotonically increasing");

  // Test Encounter Replay physics: at t=0, distance must equal nominal miss distance
  const mockAsteroid = { missKm: 1500000, velocityKmh: 45000, epochMs: 1700000000000 };
  const state0 = calculateEncounterState(mockAsteroid, 0);
  assert.strictEqual(state0.distanceKm, 1500000, "At perigee (t=0), distance must equal missKm");
  
  // At t = +6h, distance must be greater than at t=0
  const state6 = calculateEncounterState(mockAsteroid, 6);
  assert.ok(state6.distanceKm > state0.distanceKm, "Distance after perigee must increase");

  console.log("✓ All Astronomy Math tests passed successfully!");
}

