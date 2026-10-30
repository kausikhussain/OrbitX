// ==========================================================================
// Orbit Watch — Signature Feature: Scientific Data Provenance Center
// Transparent telemetry, upstream sources, conversion conventions, and accuracy.
// ==========================================================================

import { state } from "../state.js";
import { LUNAR_DISTANCE_KM, ASTRONOMICAL_UNIT_KM, JOULES_PER_MEGATON_TNT } from "../astronomy/constants.js";

const $ = (id) => document.getElementById(id);

export function initProvenanceCenter() {
  const modal = $("provenance-modal");
  const closeBtn = $("provenance-close");
  const openBtn = $("data-status"); // Clicking status pill opens provenance modal!

  if (openBtn) {
    openBtn.style.cursor = "pointer";
    openBtn.title = "Click to inspect Data Provenance & Scientific Quality Center";
    openBtn.addEventListener("click", openProvenanceCenter);
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      if (modal) modal.classList.add("hidden-hard");
    });
  }
}

export function openProvenanceCenter() {
  const modal = $("provenance-modal");
  if (!modal) return;

  // Update live values in provenance center
  $("prov-cur-source").textContent = state.dataStatus.sourceName || "NASA NeoWs";
  $("prov-cur-status").textContent = state.dataStatus.label || "Connected";
  $("prov-cur-updated").textContent = state.dataStatus.lastUpdated
    ? new Date(state.dataStatus.lastUpdated).toUTCString()
    : "Active Session";

  $("prov-const-ld").textContent = `${LUNAR_DISTANCE_KM.toLocaleString("en-US")} km (IAU mean lunar semi-major axis)`;
  $("prov-const-au").textContent = `${ASTRONOMICAL_UNIT_KM.toLocaleString("en-US")} km (IAU 2012 exact definition)`;
  $("prov-const-tnt").textContent = `${JOULES_PER_MEGATON_TNT.toExponential(4)} J (exact physical definition)`;

  modal.classList.remove("hidden-hard");
}

