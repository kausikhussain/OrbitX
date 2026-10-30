// ==========================================================================
// Orbit Watch — Unit Tests: Data Schemas & Reference Integrity
// ==========================================================================

import assert from "node:assert";
import { REFERENCE_ASTEROIDS } from "../js/api/nasa.js";

export function runApiTests() {
  console.log("Running Data Schema tests...");

  // Verify reference dataset integrity
  assert.ok(Array.isArray(REFERENCE_ASTEROIDS) && REFERENCE_ASTEROIDS.length >= 8, "Reference catalog must have >= 8 items");

  REFERENCE_ASTEROIDS.forEach((a) => {
    assert.ok(typeof a.id === "string" && a.id.length > 0, "Asteroid must have string id");
    assert.ok(typeof a.name === "string" && a.name.length > 0, "Asteroid must have valid name");
    assert.ok(typeof a.diameterM === "number" && a.diameterM > 0, "Diameter must be positive number");
    assert.ok(typeof a.missKm === "number" && a.missKm > 0, "Miss distance must be positive number");
    assert.ok(typeof a.velocityKmh === "number" && a.velocityKmh > 0, "Velocity must be positive number");
    assert.ok(typeof a.hazardous === "boolean", "Hazardous flag must be boolean");
    assert.ok(a.url && a.url.startsWith("https://"), "JPL URL must be secure HTTPS");
  });

  console.log("✓ All Data Schema tests passed successfully!");
}

