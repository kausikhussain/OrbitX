// "What if it hit?" — back-of-envelope impact physics rendered on a real map.
// Rocky asteroid assumed (density 3000 kg/m³). Estimates use standard
// cube-root blast scaling; this is for perspective, not civil defence.

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

const fmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const $ = (id) => document.getElementById(id);

let map = null;
let rings = [];
let current = null;

function compute(a) {
  const r = a.diameterM / 2;
  const mass = (4 / 3) * Math.PI * r ** 3 * 3000; // kg
  const v = a.velocityKmh / 3.6; // m/s
  const joules = 0.5 * mass * v * v;
  const mt = joules / 4.184e15; // megatons TNT
  return {
    mt,
    hiroshima: mt / 0.015,
    airburst: a.diameterM < 25, // small rocks explode in the atmosphere
    craterKm: 1.2 * Math.pow(mt, 0.294),
    fireballKm: Math.max(0.9 * Math.pow(mt, 0.4), 0.4),
    blastKm: 4.6 * Math.cbrt(mt), // buildings heavily damaged
    glassKm: 11 * Math.cbrt(mt), // windows shatter
  };
}

function mtLabel(mt) {
  if (mt >= 1) return fmt.format(mt) + " megatons";
  if (mt >= 0.001) return fmt.format(mt * 1000) + " kilotons";
  return "under a kiloton";
}

function ensureMap() {
  if (map || !window.L) return;
  map = L.map("impact-map", { zoomControl: false }).setView(CITIES.Mumbai, 8);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 12,
    attribution: "&copy; OpenStreetMap &copy; CARTO",
  }).addTo(map);
}

function render() {
  if (!current) return;
  const a = current;
  const c = compute(a);
  const center = CITIES[$("impact-city").value] || CITIES.Mumbai;

  $("impact-name").textContent = a.name;

  if (map) {
    rings.forEach((r) => map.removeLayer(r));
    rings = [];
    const add = (km, color, fill) => {
      if (km <= 0) return;
      rings.push(L.circle(center, { radius: km * 1000, color, weight: 1.5, fillColor: color, fillOpacity: fill }).addTo(map));
    };
    add(c.glassKm, "#6ee7ff", 0.05);
    add(c.blastKm, "#f5b14c", 0.1);
    add(c.fireballKm, "#ff8f3d", 0.18);
    if (!c.airburst) add(c.craterKm / 2, "#ff3355", 0.35); // crater radius
    const outer = rings[0];
    if (outer) map.fitBounds(outer.getBounds().pad(0.25));
    setTimeout(() => map.invalidateSize(), 60);
  }

  $("impact-legend").innerHTML = [
    !c.airburst ? `<span style="color:#ff3355;border-color:#ff3355">⬤ crater</span>` : "",
    `<span style="color:#ff8f3d;border-color:#ff8f3d">⬤ fireball</span>`,
    `<span style="color:#f5b14c;border-color:#f5b14c">⬤ buildings flattened</span>`,
    `<span style="color:#6ee7ff;border-color:#6ee7ff">⬤ windows shatter</span>`,
  ].join("");

  const cells = [];
  cells.push(cell("💣", mtLabel(c.mt) + " of TNT",
    c.hiroshima >= 1 ? `≈ ${fmt.format(c.hiroshima)} Hiroshima bombs` : "a fraction of a Hiroshima bomb"));
  if (c.airburst) {
    cells.push(cell("🌠", "Explodes mid-air",
      "Rocks this small burst in the sky — like Chelyabinsk 2013, which shattered windows across a whole Russian city."));
  } else {
    cells.push(cell("🕳️", c.craterKm.toFixed(1) + " km wide crater",
      "the hole where the city centre used to be"));
  }
  cells.push(cell("🏚️", "Flattened to " + c.blastKm.toFixed(1) + " km",
    "concrete buildings heavily damaged inside this ring"));
  cells.push(cell("🪟", "Glass rains to " + c.glassKm.toFixed(0) + " km",
    "every window inside this ring shatters"));
  $("impact-stats").innerHTML = cells.join("");
}

function cell(icon, big, small) {
  return `<div class="is-cell"><b>${icon} ${big}</b><small>${small}</small></div>`;
}

export function openImpact(asteroid) {
  current = asteroid;
  $("impact").classList.remove("hidden-hard");
  ensureMap();
  render();
}

/* one-time wiring */
$("impact-close").addEventListener("click", () => $("impact").classList.add("hidden-hard"));
$("impact").addEventListener("click", (e) => { if (e.target.id === "impact") $("impact").classList.add("hidden-hard"); });
$("impact-city").addEventListener("change", render);
