// ==========================================================================
// Orbit Watch — Signature Feature: Asteroid Comparison Lab
// Side-by-side comparative analysis of up to 3 near-Earth objects.
// ==========================================================================

import { state, setState, subscribe } from "../state.js";
import { kmToLunarDistances, sizeComparisonText } from "../astronomy/calculations.js";
import { computeImpactPhysics, formatEnergyLabel } from "../astronomy/impact-physics.js";

const $ = (id) => document.getElementById(id);
const fmtInt = new Intl.NumberFormat("en-US");

export function initComparisonLab() {
  const modal = $("comparison-modal");
  const closeBtn = $("comparison-close");
  const clearBtn = $("comparison-clear-btn");

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      if (modal) modal.classList.add("hidden-hard");
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      state.comparisonList = [];
      renderComparisonTable();
      updateCompareBadges();
    });
  }

  subscribe("comparisonList", () => {
    renderComparisonTable();
    updateCompareBadges();
  });
}

export function openComparisonLab() {
  const modal = $("comparison-modal");
  if (!modal) return;
  modal.classList.remove("hidden-hard");
  renderComparisonTable();
}

export function toggleCompareAsteroid(asteroid) {
  if (!asteroid) return;
  const idx = state.comparisonList.findIndex((a) => a.id === asteroid.id);
  if (idx >= 0) {
    state.comparisonList.splice(idx, 1);
  } else {
    if (state.comparisonList.length >= 3) {
      alert("Comparison Lab supports up to 3 objects simultaneously. Remove one before adding another.");
      return;
    }
    state.comparisonList.push(asteroid);
  }
  setState("comparisonList", [...state.comparisonList]);
}

function updateCompareBadges() {
  const badge = $("compare-count-badge");
  if (badge) {
    badge.textContent = String(state.comparisonList.length);
    badge.style.display = state.comparisonList.length > 0 ? "inline-flex" : "none";
  }
}

function renderComparisonTable() {
  const container = $("comparison-grid");
  const emptyNotice = $("comparison-empty-notice");
  if (!container) return;

  container.innerHTML = "";

  if (state.comparisonList.length === 0) {
    if (emptyNotice) emptyNotice.style.display = "block";
    return;
  }
  if (emptyNotice) emptyNotice.style.display = "none";

  // Render comparative columns
  state.comparisonList.forEach((a) => {
    const col = document.createElement("div");
    col.className = "comparison-column";

    const ld = kmToLunarDistances(a.missKm);
    const impact = computeImpactPhysics({ diameterM: a.diameterM, velocityKmh: a.velocityKmh });

    col.innerHTML = `
      <div class="comp-col-header">
        <div class="comp-name">${a.name}</div>
        <button class="comp-remove-btn" data-remove-id="${a.id}" title="Remove from comparison">✕</button>
      </div>

      <div class="comp-section">
        <div class="comp-label">Designation</div>
        <div class="comp-val">${a.designation || a.name}</div>
      </div>

      <div class="comp-section">
        <div class="comp-label">Estimated Diameter</div>
        <div class="comp-val">~${Math.round(a.diameterM)} m</div>
        <div class="comp-sub">${Math.round(a.diameterMinM)} – ${Math.round(a.diameterMaxM)} m range</div>
        <div class="comp-bar-wrapper">
          <div class="comp-bar-fill" style="width: ${Math.min(100, (a.diameterM / 600) * 100)}%"></div>
        </div>
      </div>

      <div class="comp-section">
        <div class="comp-label">Miss Distance</div>
        <div class="comp-val">${fmtInt.format(Math.round(a.missKm))} km</div>
        <div class="comp-sub">${ld.toFixed(2)} Lunar Distances</div>
        <div class="comp-bar-wrapper">
          <div class="comp-bar-fill dist" style="width: ${Math.min(100, (ld / 40) * 100)}%"></div>
        </div>
      </div>

      <div class="comp-section">
        <div class="comp-label">Relative Velocity</div>
        <div class="comp-val">${fmtInt.format(Math.round(a.velocityKmh))} km/h</div>
        <div class="comp-sub">${(a.velocityKmh / 3600).toFixed(1)} km/s</div>
      </div>

      <div class="comp-section">
        <div class="comp-label">Absolute Magnitude (H)</div>
        <div class="comp-val">${a.magnitudeH !== null ? a.magnitudeH + " mag" : "—"}</div>
      </div>

      <div class="comp-section">
        <div class="comp-label">Hazard Status</div>
        <div class="comp-val ${a.hazardous ? 'hazard' : 'safe'}">
          ${a.hazardous ? "⚠ Potentially Hazardous (PHA)" : "✓ Non-Hazardous Flyby"}
        </div>
      </div>

      <div class="comp-section">
        <div class="comp-label">Hypothetical Kinetic Energy</div>
        <div class="comp-val">${formatEnergyLabel(impact.energyMegatons)}</div>
        <div class="comp-sub">≈ ${fmtInt.format(Math.round(impact.hiroshimaEquiv))} Hiroshima devices</div>
      </div>
    `;

    col.querySelector(".comp-remove-btn").addEventListener("click", () => {
      toggleCompareAsteroid(a);
    });

    container.appendChild(col);
  });
}

