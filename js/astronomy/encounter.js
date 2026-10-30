// ==========================================================================
// Orbit Watch — Encounter Replay Astrodynamics
// Models time-dependent relative asteroid flyby trajectories around Earth.
// ==========================================================================

import {
  EARTH_MU_M3_S2,
  LUNAR_DISTANCE_KM,
} from "./constants.js";
import { distToSceneUnits } from "./calculations.js";

/**
 * Calculates instantaneous flyby distance and velocity at a time offset from perigee.
 * Uses hyperbolic flyby kinematics with Earth gravitational acceleration.
 * 
 * @param {Object} asteroid - Asteroid data object.
 * @param {number} deltaHours - Time offset from closest approach (hours, can be negative).
 * @returns {Object} Instantaneous trajectory parameters.
 */
export function calculateEncounterState(asteroid, deltaHours) {
  const dMinKm = Math.max(1000, Number(asteroid.missKm) || 2e6);
  const vInfKmh = Math.max(5000, Number(asteroid.velocityKmh) || 45000);
  const vInfMs = vInfKmh / 3.6;

  // Time in seconds from closest approach (perigee)
  const deltaSec = deltaHours * 3600.0;

  // Asymptotic rectilinear distance approximation: r^2 = d_min^2 + (v_inf * t)^2
  const distKm = Math.sqrt(Math.pow(dMinKm, 2) + Math.pow((vInfMs * deltaSec) / 1000.0, 2));

  // Gravitational energy conservation for instantaneous speed: v(r)^2 = v_inf^2 + 2*mu/r
  const rMeters = distKm * 1000.0;
  const vInstMs = Math.sqrt(Math.pow(vInfMs, 2) + (2.0 * EARTH_MU_M3_S2) / rMeters);
  const vInstKmh = vInstMs * 3.6;

  const epochMs = (asteroid.epochMs || Date.now()) + deltaHours * 3600.0 * 1000.0;
  const dateObj = new Date(epochMs);

  return {
    deltaHours,
    distanceKm: distKm,
    distanceLd: distKm / LUNAR_DISTANCE_KM,
    velocityKmh: vInstKmh,
    velocityKms: vInstKmh / 3600.0,
    timestampUtc: dateObj.toUTCString(),
    timestampIso: dateObj.toISOString(),
  };
}

/**
 * Generates 3D trajectory points representing the flyby arc in scene coordinates.
 * 
 * @param {Object} asteroid - Asteroid data.
 * @param {number} [hoursSpan=24] - Extent of trajectory to render (-hoursSpan to +hoursSpan).
 * @param {number} [steps=64] - Number of interpolation points.
 * @returns {Array<{x: number, y: number, z: number, distKm: number}>} Array of 3D points.
 */
export function generateTrajectoryArc(asteroid, hoursSpan = 24, steps = 64) {
  const pts = [];
  const nominalRadius = distToSceneUnits(asteroid.missKm);
  const vKmh = asteroid.velocityKmh || 45000;

  for (let i = 0; i <= steps; i++) {
    const t = -hoursSpan + (i / steps) * (2 * hoursSpan);
    const state = calculateEncounterState(asteroid, t);

    // In local orbit frame:
    // x axis is closest approach axis (perigee)
    // z axis is along the asymptotic trajectory velocity vector
    const sceneR = distToSceneUnits(state.distanceKm);
    const zOffset = (t / hoursSpan) * (nominalRadius * 1.4);
    
    // Scale x so that at t=0, x = nominalRadius
    const xPos = nominalRadius;
    const yPos = Math.sin((t / hoursSpan) * Math.PI) * (nominalRadius * 0.12);

    pts.push({
      x: xPos,
      y: yPos,
      z: zOffset,
      distKm: state.distanceKm,
      deltaHours: t,
    });
  }

  return pts;
}

