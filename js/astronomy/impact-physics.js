// ==========================================================================
// Orbit Watch — Educational Impact Physics Modeling
// Based on Collins, Melosh & Marcus (2005) & Glasstone & Dolan (1977).
// Note: This provides educational orders-of-magnitude for hypothetical scenarios.
// ==========================================================================

import {
  JOULES_PER_MEGATON_TNT,
  JOULES_PER_HIROSHIMA_DEVICE,
  DENSITY_STONY_KG_M3,
  STANDARD_GRAVITY_MS2,
} from "./constants.js";

/**
 * Computes hypothetical impact energy and atmospheric/surface damage radii.
 * 
 * @param {Object} params
 * @param {number} params.diameterM - Effective spherical asteroid diameter (meters).
 * @param {number} params.velocityKmh - Encounter relative velocity (km/h).
 * @param {number} [params.densityKgM3=3000] - Impactor bulk density (kg/m^3).
 * @param {number} [params.impactAngleDeg=45] - Impact angle from horizontal (degrees).
 * @returns {Object} Calculated physics and damage boundary metrics.
 */
export function computeImpactPhysics(params) {
  const d = Math.max(1, Number(params.diameterM) || 40);
  const vKmh = Math.max(1000, Number(params.velocityKmh) || 45000);
  const density = Number(params.densityKgM3) || DENSITY_STONY_KG_M3;
  const angleDeg = Number(params.impactAngleDeg) || 45;

  const radiusM = d / 2.0;
  const volumeM3 = (4.0 / 3.0) * Math.PI * Math.pow(radiusM, 3);
  const massKg = volumeM3 * density;

  const vMs = vKmh / 3.6;
  const kineticEnergyJoules = 0.5 * massKg * Math.pow(vMs, 2);
  const energyMegatons = kineticEnergyJoules / JOULES_PER_MEGATON_TNT;
  const hiroshimaEquiv = kineticEnergyJoules / JOULES_PER_HIROSHIMA_DEVICE;

  // Small objects (< ~25-30m) generally undergo explosive atmospheric disruption / airburst
  // rather than producing a coherent surface impact crater (e.g., Chelyabinsk 2013, Tunguska 1908).
  const isAirburst = d < 28.0;

  // Crater diameter scaling: Collins et al. (2005) eq 12 for transient crater
  const targetDensity = 2500.0; // typical crustal rock
  const angleRad = (angleDeg * Math.PI) / 180.0;
  const g = STANDARD_GRAVITY_MS2;

  let craterDiameterKm = 0;
  if (!isAirburst) {
    // D_t in meters = 1.161 * (mass / targetDensity)^(1/3) * (vMs)^0.44 * g^(-0.22) * (sin angle)^(1/3)
    const dtM =
      1.161 *
      Math.pow(massKg / targetDensity, 1 / 3) *
      Math.pow(vMs, 0.44) *
      Math.pow(g, -0.22) *
      Math.pow(Math.sin(angleRad), 1 / 3);
    // Simple-to-complex transition threshold on Earth is ~3.2 km
    const dfM = dtM < 3200 ? 1.25 * dtM : 1.17 * Math.pow(dtM, 1.13) / Math.pow(3200, 0.13);
    craterDiameterKm = Math.max(0.05, dfM / 1000.0);
  }

  // Thermal radiation (fireball) radius for 3rd degree burns / ignition:
  // Glasstone & Dolan scaling: R_thermal ≈ 0.95 * E_Mt^0.41 (km)
  const fireballRadiusKm = Math.max(0.2, 0.95 * Math.pow(Math.max(energyMegatons, 0.001), 0.41));

  // Blast overpressure wave radii (Glasstone & Dolan standard cube-root scaling):
  // 5 psi overpressure (residential walls collapse, high casualties without shelter):
  const blastOverpressure5psiKm = Math.max(0.3, 4.8 * Math.cbrt(Math.max(energyMegatons, 0.001)));

  // 1 psi overpressure (widespread window pane breakage, projectile glass hazards):
  const blastOverpressure1psiKm = Math.max(0.8, 11.2 * Math.cbrt(Math.max(energyMegatons, 0.001)));

  return {
    massKg,
    kineticEnergyJoules,
    energyMegatons,
    hiroshimaEquiv,
    isAirburst,
    craterDiameterKm,
    fireballRadiusKm,
    blastOverpressure5psiKm,
    blastOverpressure1psiKm,
  };
}

/**
 * Generates formatted human-readable units for TNT energy release.
 * @param {number} megatons - Energy in Mt.
 * @returns {string} Formatted label (e.g. "12.4 Mt TNT").
 */
export function formatEnergyLabel(megatons) {
  if (megatons >= 1.0) {
    return `${megatons.toFixed(1)} Mt TNT`;
  }
  if (megatons >= 0.001) {
    return `${(megatons * 1000).toFixed(0)} kt TNT`;
  }
  return "< 1 kt TNT";
}

