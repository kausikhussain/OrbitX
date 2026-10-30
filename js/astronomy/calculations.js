// ==========================================================================
// Orbit Watch — Astronomical Calculations & Unit Conversions
// Pure, deterministic functions with documented formulas.
// ==========================================================================

import {
  LUNAR_DISTANCE_KM,
  ASTRONOMICAL_UNIT_KM,
  RIFLE_BULLET_VELOCITY_MS,
} from "./constants.js";

/**
 * Converts distance in kilometers to Lunar Distances (LD).
 * @param {number} km - Distance in kilometers.
 * @returns {number} Distance in LD.
 */
export function kmToLunarDistances(km) {
  if (typeof km !== "number" || isNaN(km) || km < 0) return 0;
  return km / LUNAR_DISTANCE_KM;
}

/**
 * Converts distance in kilometers to Astronomical Units (AU).
 * @param {number} km - Distance in kilometers.
 * @returns {number} Distance in AU.
 */
export function kmToAstronomicalUnits(km) {
  if (typeof km !== "number" || isNaN(km) || km < 0) return 0;
  return km / ASTRONOMICAL_UNIT_KM;
}

/**
 * Converts velocity in km/h to km/s.
 * @param {number} kmh - Velocity in kilometers per hour.
 * @returns {number} Velocity in kilometers per second.
 */
export function kmhToKms(kmh) {
  if (typeof kmh !== "number" || isNaN(kmh)) return 0;
  return kmh / 3600;
}

/**
 * Calculates theoretical diameter in meters from absolute magnitude (H)
 * and geometric visual albedo (p_v).
 * Formula: D (km) = (1329 / sqrt(albedo)) * 10^(-0.2 * H)
 * Reference: Bowell et al. (1989), Asteroids II.
 * @param {number} h - Absolute magnitude H.
 * @param {number} [albedo=0.14] - Geometric albedo (default 0.14 for average S-type NEO).
 * @returns {number} Diameter in meters.
 */
export function diameterFromMagnitude(h, albedo = 0.14) {
  if (typeof h !== "number" || isNaN(h)) return 50;
  const pv = Math.max(0.01, Math.min(1.0, albedo));
  const diameterKm = (1329 / Math.sqrt(pv)) * Math.pow(10, -0.2 * h);
  return diameterKm * 1000;
}

/**
 * Expresses relative velocity as a multiple of a typical high-powered rifle bullet (900 m/s).
 * @param {number} kmh - Velocity in km/h.
 * @returns {number} Multiple of bullet speed.
 */
export function bulletSpeedMultiple(kmh) {
  const ms = (kmh || 0) / 3.6;
  return Math.round(ms / RIFLE_BULLET_VELOCITY_MS);
}

/**
 * Human-scale descriptive comparison for an asteroid's diameter.
 * @param {number} meters - Diameter in meters.
 * @returns {string} Human-friendly comparison phrase.
 */
export function sizeComparisonText(meters) {
  const m = Number(meters) || 0;
  if (m < 15) return "comparable to a passenger bus";
  if (m < 45) return "comparable to a Boeing 737 airliner";
  if (m < 110) return "roughly the length of a football pitch";
  if (m < 220) return "comparable to a major sports stadium";
  if (m < 380) return "taller than the Eiffel Tower (330 m)";
  if (m < 850) return "rivaling the Burj Khalifa (828 m)";
  return "the size of a small mountain massif";
}

/**
 * Human-scale comparison for an asteroid's speed.
 * @param {number} kmh - Velocity in km/h.
 * @returns {string} Description including km/s and bullet multiple.
 */
export function speedComparisonText(kmh) {
  const kms = kmhToKms(kmh).toFixed(1);
  const multiple = bulletSpeedMultiple(kmh);
  return `${kms} km/s (≈ ${multiple}× rifle bullet velocity)`;
}

/**
 * Formats miss distance in both LD and kilometers with clear units.
 * @param {number} km - Miss distance in kilometers.
 * @returns {string} Formatted string.
 */
export function missComparisonText(km) {
  const ld = kmToLunarDistances(km);
  if (ld < 1.0) {
    return `Closer than the Moon (${ld.toFixed(2)} LD)`;
  }
  return `${ld.toFixed(1)}× the distance to the Moon (${ld.toFixed(1)} LD)`;
}

/**
 * Maps an astronomical distance in kilometers to Three.js scene units.
 * Uses a logarithmic scale to compress wide ranges (300,000 km to 70,000,000 km)
 * into a viewport where Earth and all orbits remain legible and framed.
 * @param {number} km - Distance in kilometers.
 * @returns {number} Scene units from origin.
 */
export function distToSceneUnits(km) {
  const ld = kmToLunarDistances(km);
  // Logarithmic transformation ensuring monotonicity and legibility:
  // Moon (1 LD) -> ~16.6 scene units
  // 10 LD -> ~32 scene units
  // 100 LD -> ~54 scene units
  return 10.0 + Math.log10(1.0 + ld) * 22.0;
}

