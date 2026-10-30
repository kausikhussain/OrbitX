// ==========================================================================
// Orbit Watch — Signature Feature: Encounter Replay Workspace
// Interactive time-scrubbed astrodynamic investigation of asteroid flybys.
// ==========================================================================

import { calculateEncounterState } from "../astronomy/encounter.js";
import { kmToLunarDistances } from "../astronomy/calculations.js";
import { state, setState } from "../state.js";

const $ = (id) => document.getElementById(id);
const fmtInt = new Intl.NumberFormat("en-US");

let playbackTimer = null;

export function initEncounterReplay(onPositionUpdate) {
  const modal = $("replay-modal");
  const closeBtn = $("replay-close");
  const slider = $("replay-slider");
  const playBtn = $("replay-play-btn");
  const resetBtn = $("replay-reset-btn");
  const stepBackBtn = $("replay-step-back");
  const stepFwdBtn = $("replay-step-fwd");

  if (!modal) return;

  function updateDisplay(deltaHours) {
    const a = state.encounterReplay.asteroid;
    if (!a) return;

    const res = calculateEncounterState(a, deltaHours);

    $("replay-time-display").textContent = deltaHours === 0
      ? "Closest Approach (Perigee)"
      : `${deltaHours > 0 ? "+" : ""}${deltaHours.toFixed(1)} hours from perigee`;

    $("replay-timestamp").textContent = res.timestampUtc;
    $("replay-distance-val").textContent = `${fmtInt.format(Math.round(res.distanceKm))} km (${res.distanceLd.toFixed(2)} LD)`;
    $("replay-velocity-val").textContent = `${fmtInt.format(Math.round(res.velocityKmh))} km/h (${res.velocityKms.toFixed(1)} km/s)`;

    // Notify 3D engine to reposition asteroid mesh along its trajectory
    if (typeof onPositionUpdate === "function") {
      onPositionUpdate(a, deltaHours, res);
    }
  }

  if (slider) {
    slider.addEventListener("input", (e) => {
      const hours = parseFloat(e.target.value);
      state.encounterReplay.offsetHours = hours;
      updateDisplay(hours);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      slider.value = 0;
      state.encounterReplay.offsetHours = 0;
      updateDisplay(0);
    });
  }

  if (stepBackBtn) {
    stepBackBtn.addEventListener("click", () => {
      const cur = parseFloat(slider.value);
      const next = Math.max(-24, cur - 1);
      slider.value = next;
      state.encounterReplay.offsetHours = next;
      updateDisplay(next);
    });
  }

  if (stepFwdBtn) {
    stepFwdBtn.addEventListener("click", () => {
      const cur = parseFloat(slider.value);
      const next = Math.min(24, cur + 1);
      slider.value = next;
      state.encounterReplay.offsetHours = next;
      updateDisplay(next);
    });
  }

  if (playBtn) {
    playBtn.addEventListener("click", () => {
      if (playbackTimer) {
        clearInterval(playbackTimer);
        playbackTimer = null;
        playBtn.textContent = "▶ Play";
      } else {
        playBtn.textContent = "⏸ Pause";
        playbackTimer = setInterval(() => {
          let val = parseFloat(slider.value) + 0.25;
          if (val > 24) val = -24;
          slider.value = val;
          state.encounterReplay.offsetHours = val;
          updateDisplay(val);
        }, 80);
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", closeEncounterReplay);
  }
}

export function openEncounterReplay(asteroid) {
  if (!asteroid) return;
  state.encounterReplay.active = true;
  state.encounterReplay.asteroid = asteroid;
  state.encounterReplay.offsetHours = 0;

  const modal = $("replay-modal");
  if (modal) modal.classList.remove("hidden-hard");

  $("replay-target-name").textContent = asteroid.name;
  $("replay-slider").value = 0;

  const res = calculateEncounterState(asteroid, 0);
  $("replay-time-display").textContent = "Closest Approach (Perigee)";
  $("replay-timestamp").textContent = res.timestampUtc;
  $("replay-distance-val").textContent = `${fmtInt.format(Math.round(res.distanceKm))} km (${res.distanceLd.toFixed(2)} LD)`;
  $("replay-velocity-val").textContent = `${fmtInt.format(Math.round(res.velocityKmh))} km/h (${res.velocityKms.toFixed(1)} km/s)`;
}

export function closeEncounterReplay() {
  if (playbackTimer) {
    clearInterval(playbackTimer);
    playbackTimer = null;
    const playBtn = $("replay-play-btn");
    if (playBtn) playBtn.textContent = "▶ Play";
  }

  state.encounterReplay.active = false;
  state.encounterReplay.asteroid = null;

  const modal = $("replay-modal");
  if (modal) modal.classList.add("hidden-hard");
}

