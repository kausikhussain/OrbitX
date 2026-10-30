// ==========================================================================
// Hypothetical Impact Simulator
// Standard cube-root blast scaling & Leaflet visual footprint on Indian cities.
// ==========================================================================

const CITIES = {
  Mumbai: [19.076, 72.8777],
  Delhi: [28.6139, 77.209],
  Bengaluru: [12.9716, 77.5946],
  Hyderabad: [17.385, 78.4867],
  Chennai: [13.0827, 80.2707],
  Kolkata: [22.5726, 88.3639],
  Pune: [18.5204, 73.8567],
  Jaipur: [26.9124, 75.7873],
};

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const $ = (id) => document.getElementById(id);

let map = null;
let rings = [];
let current = null;

function compute(a) {
  const densitySelect = $("impact-density");
  const density = densitySelect ? parseFloat(densitySelect.value) || 3000 : 3000;
  const r = (a.diameterM || 40) / 2;
  const mass = (4 / 3) * Math.PI * Math.pow(r, 3) * density;
  const v = (a.velocityKmh || 40000) / 3.6; // m/s
  const joules = 0.5 * mass * v * v;
  const mt = joules / 4.184e15; // Megatons TNT equivalent
  return {
    mt,
    hiroshima: mt / 0.015,
    airburst: (a.diameterM || 40) < 25, // < 25m disintegrates in upper atmosphere
    craterKm: 1.2 * Math.pow(Math.max(mt, 0.001), 0.294),
    fireballKm: Math.max(0.9 * Math.pow(Math.max(mt, 0.001), 0.4), 0.3),
    blastKm: 4.6 * Math.cbrt(Math.max(mt, 0.001)),
    glassKm: 11 * Math.cbrt(Math.max(mt, 0.001)),
  };
}

function mtLabel(mt) {
  if (mt >= 1) return fmt.format(mt) + " Mt TNT";
  if (mt >= 0.001) return fmt.format(mt * 1000) + " kt TNT";
  return "< 1 kt TNT";
}

function ensureMap() {
  if (map || !window.L) return;
  map = window.L.map("impact-map", { zoomControl: false }).setView(CITIES.Mumbai, 9);
  window.L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 12,
    attribution: "&copy; OpenStreetMap &copy; CARTO",
  }).addTo(map);
}

function getSelectedCityCoords() {
  const select = $("impact-city");
  if (!select) return CITIES.Mumbai;
  const val = select.value;
  if (val.includes(",")) {
    const parts = val.split(",").map((s) => parseFloat(s.trim()));
    if (!isNaN(parts[0]) && !isNaN(parts[1])) return parts;
  }
  return CITIES[val] || CITIES.Mumbai;
}

function render() {
  if (!current) return;
  const a = current;
  const c = compute(a);
  const center = getSelectedCityCoords();

  const nameEl = $("impact-name");
  if (nameEl) nameEl.textContent = a.name;

  if (map) {
    rings.forEach((r) => map.removeLayer(r));
    rings = [];
    const addRing = (km, color, fillOpacity) => {
      if (km <= 0) return;
      rings.push(
        window.L.circle(center, {
          radius: km * 1000,
          color,
          weight: 1.5,
          fillColor: color,
          fillOpacity,
        }).addTo(map)
      );
    };

    addRing(c.glassKm, "#22d3ee", 0.06);
    addRing(c.blastKm, "#f59e0b", 0.12);
    addRing(c.fireballKm, "#f97316", 0.22);
    if (!c.airburst) {
      addRing(c.craterKm / 2, "#ef4444", 0.4);
    }

    if (rings[0]) {
      map.fitBounds(rings[0].getBounds().pad(0.3));
    }
    setTimeout(() => map.invalidateSize(), 80);
  }

  // Populate numeric metrics
  if ($("impact-energy")) $("impact-energy").textContent = mtLabel(c.mt);
  if ($("impact-hiroshima")) $("impact-hiroshima").textContent = `≈ ${fmt.format(c.hiroshima)} bombs`;
  if ($("impact-crater")) $("impact-crater").textContent = c.airburst ? "Airburst (no crater)" : `Ø ${(c.craterKm).toFixed(1)} km`;
  if ($("impact-fireball")) $("impact-fireball").textContent = `r ≈ ${c.fireballKm.toFixed(1)} km`;
  if ($("impact-blast")) $("impact-blast").textContent = `r ≈ ${c.blastKm.toFixed(1)} km`;
  if ($("impact-glass")) $("impact-glass").textContent = `r ≈ ${c.glassKm.toFixed(0)} km`;
}

export function openImpact(asteroid) {
  current = asteroid;
  const overlay = $("impact");
  if (!overlay) return;
  overlay.classList.remove("hidden-hard");
  ensureMap();
  render();
}

// Event listeners wiring
document.querySelectorAll('[data-close="impact"]').forEach((btn) => {
  btn.addEventListener("click", () => {
    const el = $("impact");
    if (el) el.classList.add("hidden-hard");
  });
});

const impactEl = $("impact");
if (impactEl) {
  impactEl.addEventListener("click", (e) => {
    if (e.target.id === "impact") impactEl.classList.add("hidden-hard");
  });
}

const citySelect = $("impact-city");
if (citySelect) {
  citySelect.addEventListener("change", render);
}

const densitySelect = $("impact-density");
if (densitySelect) {
  densitySelect.addEventListener("change", render);
}
