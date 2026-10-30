// ==========================================================================
// ECLIPTARA — Space Intelligence & Planetary Defense Observatory
// Core Orchestrator: Three.js 3D Engine, NASA Data, Interactions & UI State
// ==========================================================================

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import { state, setState, subscribe } from "./state.js";
import { getAsteroidFeed } from "./api/nasa.js";
import { distToSceneUnits, kmToLunarDistances, sizeComparisonText, speedComparisonText } from "./astronomy/calculations.js";
import { LUNAR_DISTANCE_KM } from "./astronomy/constants.js";

import { initEncounterReplay, openEncounterReplay, closeEncounterReplay } from "./features/encounter-replay.js";
import { initComparisonLab, openComparisonLab, toggleCompareAsteroid } from "./features/comparison-lab.js";
import { initProvenanceCenter, openProvenanceCenter } from "./features/provenance.js";
import { openImpact } from "./impact.js";
import { initSound, toggleMute, isMuted, whoosh, ping } from "./sound.js";
import { downloadShareCard } from "./share.js";
import { initSky, updateSky } from "./sky.js";
import { initSwarm } from "./swarm.js";
import { initLaunches } from "./launches.js";
import { initToday, openToday, loadGlobeDots } from "./today.js";

/* ==========================================================================
   Helper Utilities
   ========================================================================== */

const $ = (id) => document.getElementById(id);
const fmtInt = new Intl.NumberFormat("en-US");

function ldStr(km) {
  const ld = kmToLunarDistances(km);
  return ld < 1 ? `${ld.toFixed(2)} LD` : `${ld.toFixed(1)} LD`;
}

/* ==========================================================================
   Three.js Scene & Camera Setup
   ========================================================================== */

const container = $("scene-container");
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030611, 0.0016);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2500);
camera.position.set(0, 14, 34);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
container.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.48,
  0.45,
  0.84
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 5.2;
controls.maxDistance = 180;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.35;
controls.addEventListener("start", () => {
  controls.autoRotate = false;
});

/* ==========================================================================
   Lighting
   ========================================================================== */

const sun = new THREE.DirectionalLight(0xfff5e6, 3.4);
sun.position.set(32, 18, 65);
scene.add(sun);
scene.add(new THREE.AmbientLight(0x28385a, 1.1));
scene.add(new THREE.HemisphereLight(0x324d78, 0x080c16, 0.45));

/* ==========================================================================
   Starfield
   ========================================================================== */

function makeStars(count, minR, maxR, size, opacity) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const r = minR + Math.random() * (maxR - minR);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi);
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    const t = Math.random();
    c.setHSL(t < 0.7 ? 0.6 : t < 0.9 ? 0.12 : 0.0, 0.35, 0.75 + Math.random() * 0.25);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }

  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size,
    vertexColors: true,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

scene.add(makeStars(2800, 260, 950, 1.5, 0.9));
scene.add(makeStars(800, 180, 520, 2.0, 0.35));

/* ==========================================================================
   Earth, Clouds & Atmosphere
   ========================================================================== */

const EARTH_R = 3;
const earthGroup = new THREE.Group();
scene.add(earthGroup);

const texLoader = new THREE.TextureLoader();
texLoader.setCrossOrigin("anonymous");
const TEX = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r152/examples/textures/planets/";

function proceduralEarthTexture() {
  const cv = document.createElement("canvas");
  cv.width = 1024;
  cv.height = 512;
  const ctx = cv.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#0e2a52");
  g.addColorStop(0.5, "#123a6e");
  g.addColorStop(1, "#0e2a52");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);
  ctx.fillStyle = "#1e774a";
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 1024;
    const y = 100 + Math.random() * 312;
    ctx.beginPath();
    ctx.ellipse(x, y, 20 + Math.random() * 70, 12 + Math.random() * 40, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const earthMat = new THREE.MeshPhongMaterial({
  map: proceduralEarthTexture(),
  shininess: 20,
  specular: new THREE.Color(0x333344),
  emissive: new THREE.Color(0x000000),
});

// Night-side city lights via custom shader injection
earthMat.onBeforeCompile = (shader) => {
  shader.uniforms.sunDirW = { value: sun.position.clone().normalize() };
  shader.fragmentShader = shader.fragmentShader
    .replace("uniform vec3 emissive;", "uniform vec3 emissive;\nuniform vec3 sunDirW;")
    .replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
       float nightSide = smoothstep(0.12, -0.2, dot(normalize(normal), normalize((viewMatrix * vec4(sunDirW, 0.0)).xyz)));
       totalEmissiveRadiance *= nightSide;`
    );
};

texLoader.load(TEX + "earth_lights_2048.png", (t) => {
  t.colorSpace = THREE.SRGBColorSpace;
  earthMat.emissiveMap = t;
  earthMat.emissive.set(0xffc890);
  earthMat.emissiveIntensity = 1.4;
  earthMat.needsUpdate = true;
});
texLoader.load(TEX + "earth_atmos_2048.jpg", (t) => {
  t.colorSpace = THREE.SRGBColorSpace;
  earthMat.map = t;
  earthMat.needsUpdate = true;
});
texLoader.load(TEX + "earth_normal_2048.jpg", (t) => {
  t.colorSpace = THREE.SRGBColorSpace;
  earthMat.normalMap = t;
  earthMat.normalScale.set(0.8, 0.8);
  earthMat.needsUpdate = true;
});
texLoader.load(TEX + "earth_specular_2048.jpg", (t) => {
  t.colorSpace = THREE.SRGBColorSpace;
  earthMat.specularMap = t;
  earthMat.needsUpdate = true;
});

const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 96, 96), earthMat);
earthGroup.add(earth);

// Cloud shell
const cloudMat = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.0, depthWrite: false });
const clouds = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.012, 64, 64), cloudMat);
earthGroup.add(clouds);
texLoader.load(TEX + "earth_clouds_1024.png", (t) => {
  t.colorSpace = THREE.SRGBColorSpace;
  cloudMat.map = t;
  cloudMat.opacity = 0.55;
  cloudMat.needsUpdate = true;
});

// Atmosphere rim glow
const atmosMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: { c: { value: new THREE.Color(0x4aa8ff) } },
  vertexShader: `
    varying vec3 vN; varying vec3 vP;
    void main() {
      vN = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vP = mv.xyz;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    uniform vec3 c; varying vec3 vN; varying vec3 vP;
    void main() {
      float f = pow(0.62 + dot(normalize(vN), normalize(vP)), 4.8);
      gl_FragColor = vec4(c, clamp(f, 0.0, 1.0) * 0.45);
    }`,
});
const atmosMesh = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.1, 64, 64), atmosMat);
earthGroup.add(atmosMesh);

// Optional Lat / Long reference wireframe grid
const gridGeo = new THREE.SphereGeometry(EARTH_R * 1.002, 24, 12);
const gridMat = new THREE.MeshBasicMaterial({
  color: 0x6ee7ff,
  wireframe: true,
  transparent: true,
  opacity: 0.08,
});
const gridMesh = new THREE.Mesh(gridGeo, gridMat);
gridMesh.visible = false;
earthGroup.add(gridMesh);

/* ==========================================================================
   Moon & Lunar Reference Ring
   ========================================================================== */

const MOON_DIST = distToSceneUnits(LUNAR_DISTANCE_KM);
const moonPivot = new THREE.Object3D();
moonPivot.rotation.x = THREE.MathUtils.degToRad(5.1);
scene.add(moonPivot);

const moonMat = new THREE.MeshPhongMaterial({ color: 0xb8b8c0 });
texLoader.load(TEX + "moon_1024.jpg", (t) => {
  t.colorSpace = THREE.SRGBColorSpace;
  moonMat.map = t;
  moonMat.color.set(0xffffff);
  moonMat.needsUpdate = true;
});
const moon = new THREE.Mesh(new THREE.SphereGeometry(0.8, 48, 48), moonMat);
moon.position.x = MOON_DIST;
moonPivot.add(moon);

function createOrbitRing(radius, color, opacity) {
  const pts = [];
  const segments = 128;
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.Line(
    geo,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
  );
}
const moonOrbitRing = createOrbitRing(MOON_DIST, 0x8fa3c8, 0.22);
moonPivot.add(moonOrbitRing);

/* ==========================================================================
   Sky & Globe Markers
   ========================================================================== */

initSky(scene, sun);

const surfaceDots = new THREE.Group();
earth.add(surfaceDots);

function latLonToVec(lat, lon, r) {
  const la = THREE.MathUtils.degToRad(lat);
  const lo = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(
    r * Math.cos(la) * Math.cos(lo),
    r * Math.sin(la),
    -r * Math.cos(la) * Math.sin(lo)
  );
}

function addSurfaceDots(list) {
  for (const d of list) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(d.size || 0.045, 8, 8),
      new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0.9 })
    );
    m.position.copy(latLonToVec(d.lat, d.lon, EARTH_R * 1.004));
    surfaceDots.add(m);
  }
}

/* ==========================================================================
   International Space Station (ISS)
   ========================================================================== */

const ISS_R = EARTH_R * 1.35;
const issGroup = new THREE.Group();
{
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.14, 0.32),
    new THREE.MeshStandardMaterial({
      color: 0xdde4f0,
      emissive: 0x88b8ff,
      emissiveIntensity: 0.5,
      metalness: 0.6,
      roughness: 0.35,
    })
  );
  issGroup.add(body);
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x2462c0,
    emissive: 0x2462c0,
    emissiveIntensity: 0.6,
    side: THREE.DoubleSide,
  });
  const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.16), panelMat);
  p1.position.x = 0.38;
  const p2 = p1.clone();
  p2.position.x = -0.38;
  issGroup.add(p1, p2);
}
issGroup.position.set(ISS_R, 0.5, 0);
scene.add(issGroup);

const issHitbox = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
issHitbox.userData.iss = true;
issHitbox.userData.asteroid = {
  id: "iss",
  name: "International Space Station",
  designation: "NORAD 25544",
  diameterM: 109,
  hazardous: false,
  missKm: 420,
  velocityKmh: 27600,
  time: "Continuous LEO Orbit",
  magnitudeH: -3.8,
  url: "https://www.nasa.gov/international-space-station/",
};
scene.add(issHitbox);

let issLatLon = { lat: 20, lon: 77 };
let issHumans = 7;

async function pollISS() {
  try {
    const res = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
    const d = await res.json();
    if (typeof d.latitude === "number") issLatLon = { lat: d.latitude, lon: d.longitude };
  } catch (_) {}
}
pollISS();
setInterval(pollISS, 5000);

/* ==========================================================================
   Near-Earth Object (Asteroid) Visualization System
   ========================================================================== */

const asteroidMeshes = [];
const asteroidGroup = new THREE.Group();
scene.add(asteroidGroup);

function rockGeometry(size) {
  const geo = new THREE.IcosahedronGeometry(size, 1);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.multiplyScalar(0.78 + Math.random() * 0.44);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function sizeToUnits(diameterM) {
  return THREE.MathUtils.clamp(0.14 + Math.log10(1 + diameterM) * 0.26, 0.16, 1.0);
}

function addAsteroid(a) {
  const radius = distToSceneUnits(a.missKm);
  const pivot = new THREE.Object3D();
  pivot.rotation.set(
    THREE.MathUtils.degToRad(THREE.MathUtils.randFloatSpread(56)),
    Math.random() * Math.PI * 2,
    THREE.MathUtils.degToRad(THREE.MathUtils.randFloatSpread(14))
  );
  asteroidGroup.add(pivot);

  const color = a.hazardous ? 0xff5277 : 0xcbb694;
  const mesh = new THREE.Mesh(
    rockGeometry(sizeToUnits(a.diameterM)),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.88,
      metalness: 0.1,
      emissive: color,
      emissiveIntensity: a.hazardous ? 0.55 : 0.14,
    })
  );
  mesh.position.x = radius;
  mesh.userData.asteroid = a;
  mesh.userData.nominalRadius = radius;
  pivot.add(mesh);

  // Subtle restrained opacity for unselected orbit rings to avoid visual clutter
  const ringColor = a.hazardous ? 0xff5277 : 0x5a80a8;
  const ring = createOrbitRing(radius, ringColor, a.hazardous ? 0.18 : 0.08);
  ring.visible = state.preferences.showOrbits;
  pivot.add(ring);
  mesh.userData.orbitRing = ring;

  mesh.userData.pivot = pivot;
  mesh.userData.spin = new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.8);
  mesh.userData.speed = (0.04 + Math.random() * 0.08) * (26 / radius);
  asteroidMeshes.push(mesh);
}

/* ==========================================================================
   Data Status Indicator
   ========================================================================== */

function setDataStatus(type, label, sourceName = "NASA NeoWs") {
  const containerEl = $("data-status");
  const textEl = $("data-status-text");
  if (!containerEl || !textEl) return;

  containerEl.className = "status-indicator " + type;
  textEl.textContent = label;

  state.dataStatus = {
    type,
    label,
    sourceName,
    lastUpdated: Date.now(),
  };
}

/* ==========================================================================
   Asteroid Filter & Sort Engine
   ========================================================================== */

function applyFiltersAndSort() {
  let list = [...state.asteroids];

  // Search filter
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(
      (a) => a.name.toLowerCase().includes(q) || a.designation.toLowerCase().includes(q)
    );
  }

  // Hazard filter
  if (state.filterHazardous) {
    list = list.filter((a) => a.hazardous);
  }

  // Sorting
  list.sort((a, b) => {
    switch (state.sortBy) {
      case "distance":
        return a.missKm - b.missKm;
      case "distance-desc":
        return b.missKm - a.missKm;
      case "velocity-desc":
        return b.velocityKmh - a.velocityKmh;
      case "velocity":
        return a.velocityKmh - b.velocityKmh;
      case "size-desc":
        return b.diameterM - a.diameterM;
      case "size":
        return a.diameterM - b.diameterM;
      case "time":
        return (a.epochMs || 0) - (b.epochMs || 0);
      default:
        return a.missKm - b.missKm;
    }
  });

  state.filteredAsteroids = list;
  renderAsteroidList();
}

function renderAsteroidList() {
  const listEl = $("asteroid-list");
  const emptyEl = $("list-empty");
  const clearBtn = $("clear-filters");
  if (!listEl) return;

  listEl.innerHTML = "";

  const isFiltered = state.searchQuery || state.filterHazardous;
  if (clearBtn) clearBtn.classList.toggle("hidden-hard", !isFiltered);

  if (state.filteredAsteroids.length === 0) {
    if (emptyEl) emptyEl.classList.remove("hidden-hard");
    return;
  }
  if (emptyEl) emptyEl.classList.add("hidden-hard");

  state.filteredAsteroids.forEach((a) => {
    const card = document.createElement("div");
    card.className = "neo-card" + (state.selectedAsteroid && state.selectedAsteroid.id === a.id ? " selected" : "");
    card.dataset.id = a.id;
    card.tabIndex = 0;
    card.setAttribute("role", "option");
    card.setAttribute("aria-selected", state.selectedAsteroid && state.selectedAsteroid.id === a.id ? "true" : "false");

    const sizeStr = `~${Math.round(a.diameterM)} m`;
    const missLd = ldStr(a.missKm);
    const speedStr = `${fmtInt.format(Math.round(a.velocityKmh))} km/h`;
    const isCompared = state.comparisonList.some((item) => item.id === a.id);

    card.innerHTML = `
      <div class="neo-card-top">
        <div class="neo-name-group">
          <span class="neo-name">${a.name}</span>
          <span class="neo-size-tag">⌀ ${sizeStr}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          ${a.hazardous ? '<span class="hazard-pill">PHA</span>' : ""}
          <button class="card-compare-btn" title="Add to Comparison Lab" style="padding:2px 6px;font-size:10px;border-radius:4px;border:1px solid rgba(110,231,255,0.25);color:${isCompared ? '#6ee7ff' : '#8fa3c8'};background:${isCompared ? 'rgba(110,231,255,0.18)' : 'transparent'}">
            ${isCompared ? "✓ Comp" : "+ Comp"}
          </button>
        </div>
      </div>
      <div class="neo-card-metrics">
        <div class="metric-pair">
          <span class="metric-label">Miss Distance</span>
          <span class="metric-val">${missLd}</span>
        </div>
        <div class="metric-pair">
          <span class="metric-label">Velocity</span>
          <span class="metric-val">${speedStr}</span>
        </div>
      </div>
    `;

    // Click on card body opens object
    card.addEventListener("click", (e) => {
      if (e.target.closest(".card-compare-btn")) return;
      const mesh = asteroidMeshes.find((m) => m.userData.asteroid.id === a.id);
      if (mesh) selectObject(mesh);
    });

    // Quick compare button
    const compBtn = card.querySelector(".card-compare-btn");
    compBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCompareAsteroid(a);
      renderAsteroidList();
    });

    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const mesh = asteroidMeshes.find((m) => m.userData.asteroid.id === a.id);
        if (mesh) selectObject(mesh);
      }
    });

    listEl.appendChild(card);
  });
}

/* ==========================================================================
   Selection & Details Synchronization
   ========================================================================== */

let cameraFlight = null;

function flyTo(targetPos, dist = null) {
  whoosh();
  const dir = camera.position.clone().sub(controls.target).normalize();
  const d = dist ?? Math.max(6, targetPos.length() * 0.35 + 5.5);
  cameraFlight = {
    t0: performance.now(),
    dur: state.preferences.reducedMotion ? 200 : 1300,
    fromT: controls.target.clone(),
    toT: targetPos.clone(),
    fromC: camera.position.clone(),
    toC: targetPos.clone().add(dir.multiplyScalar(d)),
  };
}

function selectObject(mesh) {
  if (mesh.userData.iss) {
    selectISS();
    return;
  }

  state.selectedMesh = mesh;
  const a = mesh.userData.asteroid;
  state.selectedAsteroid = a;
  ping();

  // Highlight in 3D: boost emissive on selected rock and highlight its orbit path
  asteroidMeshes.forEach((m) => {
    m.material.emissiveIntensity = m.userData.asteroid.hazardous ? 0.45 : 0.14;
    if (m.userData.orbitRing) {
      m.userData.orbitRing.material.opacity = m.userData.asteroid.hazardous ? 0.16 : 0.07;
      m.userData.orbitRing.material.color.set(m.userData.asteroid.hazardous ? 0xff5277 : 0x5a80a8);
    }
  });

  mesh.material.emissiveIntensity = 0.95;
  if (mesh.userData.orbitRing) {
    mesh.userData.orbitRing.material.opacity = 0.85;
    mesh.userData.orbitRing.material.color.set(0x6ee7ff);
  }

  // Sync callset list cards
  document.querySelectorAll(".neo-card").forEach((c) => {
    const isThis = c.dataset.id === a.id;
    c.classList.toggle("selected", isThis);
    c.setAttribute("aria-selected", isThis ? "true" : "false");
  });
  const activeCard = document.querySelector(".neo-card.selected");
  if (activeCard) activeCard.scrollIntoView({ block: "nearest", behavior: "smooth" });

  // Open Inspector Drawer if collapsed
  const drawer = $("inspector-drawer");
  if (drawer) {
    drawer.classList.remove("collapsed", "hidden");
    document.body.classList.remove("inspector-collapsed");
    $("rail-encounters")?.classList.add("active");
  }

  // Switch Inspector Drawer to Detail Dossier View
  $("inspector-list-view")?.classList.add("hidden-hard");
  $("inspector-detail-view")?.classList.remove("hidden-hard");
  $("inspector-back-btn")?.classList.remove("hidden-hard");
  if ($("inspector-title")) $("inspector-title").textContent = "Encounter Telemetry";

  // Populate Dossier fields
  if ($("detail-name")) $("detail-name").textContent = a.name;
  if ($("detail-designation")) $("detail-designation").textContent = a.designation ? `Designation: ${a.designation}` : "";

  const hazardBadge = $("detail-hazard");
  if (hazardBadge) {
    hazardBadge.textContent = "⚠ POTENTIALLY HAZARDOUS";
    hazardBadge.className = "hazard-badge-pill";
    hazardBadge.classList.toggle("hidden-hard", !a.hazardous);
  }

  if ($("detail-time")) $("detail-time").textContent = a.time || "Approach time pending ephemeris";
  if ($("detail-distance")) $("detail-distance").textContent = `${fmtInt.format(Math.round(a.missKm))} km`;
  if ($("detail-distance-lunar")) $("detail-distance-lunar").textContent = `${(a.missKm / LUNAR_DISTANCE_KM).toFixed(2)} Lunar Distances`;
  if ($("detail-velocity")) $("detail-velocity").textContent = `${fmtInt.format(Math.round(a.velocityKmh))} km/h (${(a.velocityKmh / 3600).toFixed(1)} km/s)`;

  const minM = a.diameterMinM ? Math.round(a.diameterMinM) : Math.round(a.diameterM * 0.7);
  const maxM = a.diameterMaxM ? Math.round(a.diameterMaxM) : Math.round(a.diameterM * 1.3);
  if ($("detail-diameter")) $("detail-diameter").textContent = `~${Math.round(a.diameterM)} m (${minM} – ${maxM} m range)`;
  if ($("detail-size-cmp")) $("detail-size-cmp").textContent = sizeComparisonText(a.diameterM);
  if ($("detail-magnitude")) $("detail-magnitude").textContent = a.magnitudeH !== null ? `${a.magnitudeH} mag` : "Not listed in feed";

  if ($("impact-btn")) $("impact-btn").style.display = "";
  if ($("detail-link")) $("detail-link").href = a.url;

  // Smooth camera zoom to rock
  const target = mesh.getWorldPosition(new THREE.Vector3());
  flyTo(target);
  controls.autoRotate = false;

  updateUrlState();
}

function selectISS() {
  state.selectedMesh = issHitbox;
  state.selectedAsteroid = issHitbox.userData.asteroid;
  ping();

  document.querySelectorAll(".neo-card").forEach((c) => c.classList.remove("selected"));

  // Open Inspector Drawer
  const drawer = $("inspector-drawer");
  if (drawer) {
    drawer.classList.remove("collapsed", "hidden");
    document.body.classList.remove("inspector-collapsed");
    $("rail-encounters")?.classList.add("active");
  }

  // Switch Inspector Drawer to Detail Dossier View
  $("inspector-list-view")?.classList.add("hidden-hard");
  $("inspector-detail-view")?.classList.remove("hidden-hard");
  $("inspector-back-btn")?.classList.remove("hidden-hard");
  if ($("inspector-title")) $("inspector-title").textContent = "Crewed LEO Station";

  if ($("detail-name")) $("detail-name").textContent = "International Space Station";
  if ($("detail-designation")) $("detail-designation").textContent = "NORAD ID: 25544 · Low Earth Orbit";

  const hazardBadge = $("detail-hazard");
  if (hazardBadge) {
    hazardBadge.textContent = "🛰️ Crewed Orbital Habitat";
    hazardBadge.className = "hazard-badge-pill";
    hazardBadge.style.color = "#6ee7ff";
    hazardBadge.style.borderColor = "rgba(110,231,255,0.4)";
    hazardBadge.style.background = "rgba(110,231,255,0.15)";
    hazardBadge.classList.remove("hidden-hard");
  }

  if ($("detail-time")) $("detail-time").textContent = "92.9 min orbital period · 51.6° orbital inclination";
  if ($("detail-distance")) $("detail-distance").textContent = "≈ 420 km altitude above Earth";
  if ($("detail-distance-lunar")) $("detail-distance-lunar").textContent = "0.001 LD (within Earth exosphere)";
  if ($("detail-velocity")) $("detail-velocity").textContent = "27,600 km/h (≈ 7.66 km/s)";
  if ($("detail-diameter")) $("detail-diameter").textContent = "109 m width (solar array tip-to-tip)";
  if ($("detail-size-cmp")) $("detail-size-cmp").textContent = "roughly the size of an entire football field";
  if ($("detail-magnitude")) $("detail-magnitude").textContent = "-3.8 mag (visible to naked eye from ground)";

  if ($("impact-btn")) $("impact-btn").style.display = "none";
  if ($("detail-link")) $("detail-link").href = "https://www.nasa.gov/international-space-station/";

  flyTo(issGroup.position.clone(), 5);
  controls.autoRotate = false;
  updateUrlState();
}

function clearSelection() {
  state.selectedMesh = null;
  state.selectedAsteroid = null;

  document.querySelectorAll(".neo-card").forEach((c) => {
    c.classList.remove("selected");
    c.setAttribute("aria-selected", "false");
  });

  // Switch Inspector Drawer back to callset list view
  $("inspector-detail-view")?.classList.add("hidden-hard");
  $("inspector-list-view")?.classList.remove("hidden-hard");
  $("inspector-back-btn")?.classList.add("hidden-hard");
  if ($("inspector-title")) $("inspector-title").textContent = "Asteroid Encounters";

  asteroidMeshes.forEach((m) => {
    m.material.emissiveIntensity = m.userData.asteroid.hazardous ? 0.45 : 0.14;
    if (m.userData.orbitRing) {
      m.userData.orbitRing.material.opacity = m.userData.asteroid.hazardous ? 0.18 : 0.08;
      m.userData.orbitRing.material.color.set(m.userData.asteroid.hazardous ? 0xff5277 : 0x5a80a8);
    }
    // Restore nominal position if scrubbed by replay
    if (m.userData.nominalRadius) {
      m.position.set(m.userData.nominalRadius, 0, 0);
    }
  });

  flyTo(new THREE.Vector3(0, 0, 0), state.viewMode === "orbit" ? 75 : 34);
  updateUrlState();
}

/* ==========================================================================
   Dock Statistics & Timeline Pips
   ========================================================================== */

function updateDockStatistics(asteroids) {
  if (!asteroids.length) {
    if ($("stat-count")) $("stat-count").textContent = "0";
    if ($("stat-closest")) $("stat-closest").textContent = "—";
    if ($("stat-fastest")) $("stat-fastest").textContent = "—";
    if ($("stat-hazard")) $("stat-hazard").textContent = "0";
    if ($("brief-headline")) $("brief-headline").textContent = "No Near-Earth asteroid encounters recorded.";
    return;
  }

  const closest = asteroids[0];
  const fastest = asteroids.reduce((m, a) => (a.velocityKmh > m.velocityKmh ? a : m), asteroids[0]);
  const hazardCount = asteroids.filter((a) => a.hazardous).length;

  if ($("stat-count")) $("stat-count").textContent = String(asteroids.length);
  if ($("stat-closest")) $("stat-closest").textContent = `${ldStr(closest.missKm)}`;
  if ($("stat-fastest")) $("stat-fastest").textContent = `${fmtInt.format(Math.round(fastest.velocityKmh))} km/h`;

  const hazardStatEl = $("stat-hazard");
  if (hazardStatEl) {
    hazardStatEl.textContent = String(hazardCount);
    hazardStatEl.className = "t-stat-num" + (hazardCount > 0 ? " hazard" : "");
  }

  // Update Observation Brief badge
  const briefHeadline = $("brief-headline");
  if (briefHeadline) {
    briefHeadline.textContent = `${asteroids.length} Near-Earth Asteroids · Closest ${ldStr(closest.missKm)} (${fmtInt.format(Math.round(closest.missKm))} km) · ${hazardCount} PHAs`;
    briefHeadline.classList.toggle("hazard", hazardCount > 0);
  }
}

function renderTimelinePips(asteroids) {
  const pipsLayer = $("timeline-pips");
  if (!pipsLayer) return;
  pipsLayer.innerHTML = "";

  const baseDate = new Date(state.currentDate + "T00:00:00Z").getTime();
  const dayMs = 86400 * 1000;

  asteroids.forEach((a, idx) => {
    let pct = 0;
    if (a.epochMs && a.epochMs >= baseDate && a.epochMs <= baseDate + dayMs) {
      pct = ((a.epochMs - baseDate) / dayMs) * 100;
    } else {
      pct = Math.min(96, Math.max(4, (idx / Math.max(1, asteroids.length - 1)) * 92 + 4));
    }

    const pip = document.createElement("div");
    pip.className = "timeline-pip" + (a.hazardous ? " pha" : "");
    pip.style.left = `${pct}%`;
    pip.title = `${a.name} · ${ldStr(a.missKm)} · ${a.time || ""}`;
    pip.addEventListener("click", () => {
      const mesh = asteroidMeshes.find((m) => m.userData.asteroid.id === a.id);
      if (mesh) selectObject(mesh);
    });
    pipsLayer.appendChild(pip);
  });
}

/* ==========================================================================
   Day Data Loading & Lifecycle
   ========================================================================== */

async function loadDay(dateStr, forceRefresh = false) {
  const loadingEl = $("list-loading");
  const errorEl = $("list-error");
  const emptyEl = $("list-empty");
  const listEl = $("asteroid-list");

  if (loadingEl) loadingEl.classList.remove("hidden-hard");
  if (errorEl) errorEl.classList.add("hidden-hard");
  if (emptyEl) emptyEl.classList.add("hidden-hard");
  if (listEl) listEl.innerHTML = "";

  setDataStatus("loading", "Connecting");

  // Clear existing asteroid meshes and orbits
  asteroidGroup.clear();
  asteroidMeshes.length = 0;
  clearSelection();

  try {
    const { asteroids, source, date } = await getAsteroidFeed(dateStr, { forceRefresh });
    state.currentDate = date;
    state.asteroids = asteroids;

    if (loadingEl) loadingEl.classList.add("hidden-hard");

    // Rebuild 3D asteroid objects
    asteroids.forEach(addAsteroid);

    // Update status indicator
    if (source === "live") {
      setDataStatus("live", "NASA Live");
    } else if (source === "cached") {
      setDataStatus("cached", "Cached");
    } else if (source === "reference") {
      setDataStatus("sample", "Reference Data");
    }

    // Update UI headers
    if ($("neo-count")) $("neo-count").textContent = String(asteroids.length);
    if ($("date-text")) {
      $("date-text").textContent = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    if ($("date-picker")) $("date-picker").value = date;

    // Update statistics, 24h timeline track & filter list
    updateDockStatistics(asteroids);
    renderTimelinePips(asteroids);
    applyFiltersAndSort();

    // Check if URL specified an asteroid to select
    checkInitialUrlSelection();
  } catch (err) {
    if (loadingEl) loadingEl.classList.add("hidden-hard");
    if (errorEl) errorEl.classList.remove("hidden-hard");
    setDataStatus("error", "Data Error");
    console.error("[Ecliptara] Load failed:", err);
  }
}

/* ==========================================================================
   URL State Sync (#date=YYYY-MM-DD&neo=ID&view=earth|orbit)
   ========================================================================== */

function updateUrlState() {
  const params = new URLSearchParams();
  if (state.currentDate) params.set("date", state.currentDate);
  if (state.selectedAsteroid) params.set("neo", state.selectedAsteroid.id);
  if (state.viewMode !== "earth") params.set("view", state.viewMode);

  const hash = "#" + params.toString();
  if (window.location.hash !== hash) {
    window.history.replaceState(null, "", hash);
  }
}

function parseUrlState() {
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  return {
    date: params.get("date"),
    neo: params.get("neo"),
    view: params.get("view"),
  };
}

function checkInitialUrlSelection() {
  const { neo } = parseUrlState();
  if (!neo) return;
  if (neo === "iss") {
    selectISS();
    return;
  }
  const mesh = asteroidMeshes.find((m) => m.userData.asteroid.id === neo);
  if (mesh) selectObject(mesh);
}

/* ==========================================================================
   View Mode Switching (Earth vs Orbital Overview)
   ========================================================================== */

function setViewMode(mode) {
  state.viewMode = mode;
  $("view-earth").classList.toggle("active", mode === "earth");
  $("view-orbit").classList.toggle("active", mode === "orbit");

  if (mode === "orbit") {
    flyTo(new THREE.Vector3(0, 0, 0), 80);
  } else {
    flyTo(new THREE.Vector3(0, 0, 0), 34);
  }
  updateUrlState();
}

/* ==========================================================================
   Raycasting & 3D Picking
   ========================================================================== */

const raycaster = new THREE.Raycaster();
raycaster.params.Points = { threshold: 2 };
const pointer = new THREE.Vector2();
const tooltip = $("tooltip");
let pointerDownPos = null;

renderer.domElement.addEventListener("pointerdown", (e) => {
  pointerDownPos = [e.clientX, e.clientY];
});

renderer.domElement.addEventListener("pointerup", (e) => {
  if (!pointerDownPos) return;
  const dist = Math.hypot(e.clientX - pointerDownPos[0], e.clientY - pointerDownPos[1]);
  pointerDownPos = null;
  if (dist > 5) return; // Distinguish click from drag

  const hit = pickObject(e.clientX, e.clientY);
  if (hit) {
    selectObject(hit);
  } else if (!e.target.closest("button, aside, header, footer, .overlay")) {
    clearSelection();
  }
});

renderer.domElement.addEventListener("pointermove", (e) => {
  if (!state.preferences.showLabels) {
    tooltip.classList.remove("visible");
    return;
  }

  const hit = pickObject(e.clientX, e.clientY);
  if (hit) {
    const a = hit.userData.asteroid;
    tooltip.textContent = hit.userData.iss
      ? `🛰️ ISS · ${issHumans} humans aboard`
      : `${a.name} · ${ldStr(a.missKm)}`;
    tooltip.style.left = e.clientX + "px";
    tooltip.style.top = e.clientY + "px";
    tooltip.classList.add("visible");
    renderer.domElement.style.cursor = "pointer";
  } else {
    tooltip.classList.remove("visible");
    renderer.domElement.style.cursor = "grab";
  }
});

function pickObject(x, y) {
  pointer.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);

  const targets = [issHitbox, ...asteroidMeshes];
  const hits = raycaster.intersectObjects(targets, false);
  if (hits.length) return hits[0].object;

  // Proximity fallback check
  let best = null;
  let bestDist = 1.6;
  const p = new THREE.Vector3();
  for (const m of targets) {
    m.getWorldPosition(p);
    const d = raycaster.ray.distanceToPoint(p);
    if (d < bestDist) {
      bestDist = d;
      best = m;
    }
  }
  return best;
}

/* ==========================================================================
   Animation Loop
   ========================================================================== */

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t = clock.elapsedTime;

  if (!state.preferences.reducedMotion) {
    earth.rotation.y += dt * 0.045;
    clouds.rotation.y += dt * 0.058;
    moonPivot.rotation.y += dt * 0.018;

    // Animate asteroid orbital revolution & tumbling (unless paused for encounter replay)
    if (!state.encounterReplay.active) {
      for (const m of asteroidMeshes) {
        m.userData.pivot.rotation.y += dt * m.userData.speed;
        m.rotation.x += dt * m.userData.spin.x;
        m.rotation.y += dt * m.userData.spin.y;
        if (m.userData.asteroid.hazardous) {
          m.material.emissiveIntensity = 0.35 + Math.sin(t * 3.2) * 0.22;
        }
      }
    }
  }

  // ISS tracking position
  const issTarget = latLonToVec(issLatLon.lat, issLatLon.lon, ISS_R);
  issGroup.position.lerp(issTarget, 0.03);
  issGroup.lookAt(0, 0, 0);
  issHitbox.position.copy(issGroup.position);

  updateSky(dt, t);
  if (swarmApi && state.swarmVisible) swarmApi.update();

  // Camera flight interpolation
  if (cameraFlight) {
    const p = Math.min((performance.now() - cameraFlight.t0) / cameraFlight.dur, 1);
    const e = 1 - Math.pow(1 - p, 3);
    controls.target.lerpVectors(cameraFlight.fromT, cameraFlight.toT, e);
    camera.position.lerpVectors(cameraFlight.fromC, cameraFlight.toC, e);
    if (p >= 1) cameraFlight = null;
  } else if (state.selectedMesh) {
    const wp = state.selectedMesh.getWorldPosition(new THREE.Vector3());
    controls.target.lerp(wp, 0.05);
  }

  controls.update();
  composer.render();
}

/* ==========================================================================
   Viewport Resize Handling
   ========================================================================== */

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.setSize(window.innerWidth, window.innerHeight);
  bloom.setSize(window.innerWidth, window.innerHeight);
});

/* ==========================================================================
   Event Listeners & Workspace Wiring
   ========================================================================== */

// Top Nav date navigation
function shiftDate(days) {
  const current = new Date(state.currentDate + "T12:00:00");
  current.setDate(current.getDate() + days);
  const nextDateStr = current.toISOString().slice(0, 10);
  loadDay(nextDateStr);
}

$("prev-date")?.addEventListener("click", () => shiftDate(-1));
$("next-date")?.addEventListener("click", () => shiftDate(1));
$("date-picker")?.addEventListener("change", (e) => {
  if (e.target.value) loadDay(e.target.value);
});
$("refresh-btn")?.addEventListener("click", () => {
  loadDay(state.currentDate, true);
});

// Telemetry pill click opens Provenance Center
$("data-status")?.addEventListener("click", openProvenanceCenter);

// Vertical Navigation Rail
$("rail-observatory")?.addEventListener("click", () => {
  clearSelection();
  setViewMode("earth");
  document.querySelectorAll(".rail-btn").forEach((b) => b.classList.remove("active"));
  $("rail-observatory")?.classList.add("active");
});

$("rail-encounters")?.addEventListener("click", () => {
  const drawer = $("inspector-drawer");
  if (!drawer) return;
  const isCollapsed = drawer.classList.toggle("collapsed");
  document.body.classList.toggle("inspector-collapsed", isCollapsed);
  $("rail-encounters")?.classList.toggle("active", !isCollapsed);
});

$("rail-replay")?.addEventListener("click", () => {
  const target = state.selectedAsteroid || state.asteroids[0];
  if (target) openEncounterReplay(target);
});

$("rail-compare")?.addEventListener("click", openComparisonLab);

$("rail-impact")?.addEventListener("click", () => {
  const target = state.selectedAsteroid || state.asteroids[0];
  if (target) openImpact(target);
});

$("rail-satellites")?.addEventListener("click", () => {
  state.swarmVisible = !state.swarmVisible;
  if (swarmApi) swarmApi.setVisible(state.swarmVisible);
  $("rail-satellites")?.classList.toggle("active", state.swarmVisible);
});

$("rail-today")?.addEventListener("click", openToday);
$("rail-provenance")?.addEventListener("click", openProvenanceCenter);

// Inspector Drawer Header Controls
$("inspector-close")?.addEventListener("click", () => {
  $("inspector-drawer")?.classList.add("collapsed");
  document.body.classList.add("inspector-collapsed");
  $("rail-encounters")?.classList.remove("active");
});

$("inspector-back-btn")?.addEventListener("click", () => {
  $("inspector-detail-view")?.classList.add("hidden-hard");
  $("inspector-list-view")?.classList.remove("hidden-hard");
  $("inspector-back-btn")?.classList.add("hidden-hard");
  if ($("inspector-title")) $("inspector-title").textContent = "Asteroid Encounters";
});

// Inspector List Filters
$("asteroid-search")?.addEventListener("input", (e) => {
  state.searchQuery = e.target.value.trim();
  applyFiltersAndSort();
});

$("sort-select")?.addEventListener("change", (e) => {
  state.sortBy = e.target.value;
  applyFiltersAndSort();
});

$("filter-hazardous")?.addEventListener("change", (e) => {
  state.filterHazardous = e.target.checked;
  applyFiltersAndSort();
});

$("clear-filters")?.addEventListener("click", () => {
  state.searchQuery = "";
  state.filterHazardous = false;
  state.sortBy = "distance";
  if ($("asteroid-search")) $("asteroid-search").value = "";
  if ($("filter-hazardous")) $("filter-hazardous").checked = false;
  if ($("sort-select")) $("sort-select").value = "distance";
  applyFiltersAndSort();
});

$("retry-btn")?.addEventListener("click", () => {
  loadDay(state.currentDate, true);
});

// Scene Toolbar Controls
$("view-earth")?.addEventListener("click", () => setViewMode("earth"));
$("view-orbit")?.addEventListener("click", () => setViewMode("orbit"));
$("grid-toggle-btn")?.addEventListener("click", () => {
  state.preferences.showGrid = !state.preferences.showGrid;
  gridMesh.visible = state.preferences.showGrid;
  $("grid-toggle-btn")?.classList.toggle("active", state.preferences.showGrid);
  if ($("setting-grid")) $("setting-grid").checked = state.preferences.showGrid;
});
$("view-reset")?.addEventListener("click", () => {
  clearSelection();
  setViewMode("earth");
});

// Sound Instruments
const soundBtn = $("sound-btn");
const soundOnIcon = $("sound-icon-on");
const soundOffIcon = $("sound-icon-off");

function updateSoundUI() {
  const muted = isMuted();
  if (soundOnIcon) soundOnIcon.classList.toggle("hidden-hard", muted);
  if (soundOffIcon) soundOffIcon.classList.toggle("hidden-hard", !muted);
}

soundBtn?.addEventListener("click", () => {
  initSound();
  toggleMute();
  updateSoundUI();
});
updateSoundUI();

const handleFirstGesture = () => {
  initSound();
  window.removeEventListener("pointerdown", handleFirstGesture);
};
window.addEventListener("pointerdown", handleFirstGesture);

// Screenshot capture
$("screenshot-btn")?.addEventListener("click", () => {
  composer.render();
  const dataUrl = renderer.domElement.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `ecliptara-3d-${state.currentDate}.png`;
  a.click();
});

// Dossier actions
$("impact-btn")?.addEventListener("click", () => {
  if (state.selectedAsteroid) openImpact(state.selectedAsteroid);
});

$("replay-btn")?.addEventListener("click", () => {
  if (state.selectedAsteroid) openEncounterReplay(state.selectedAsteroid);
});

$("detail-compare-btn")?.addEventListener("click", () => {
  if (state.selectedAsteroid) {
    toggleCompareAsteroid(state.selectedAsteroid);
    renderAsteroidList();
    updateCompareBadge();
    openComparisonLab();
  }
});

function updateCompareBadge() {
  const badge = $("compare-count-badge");
  if (!badge) return;
  const count = state.comparisonList.length;
  badge.textContent = String(count);
  badge.style.display = count > 0 ? "inline-block" : "none";
}

// Comparison Lab clear button wiring
$("comparison-clear-btn")?.addEventListener("click", () => {
  state.comparisonList = [];
  updateCompareBadge();
  renderAsteroidList();
});

// Initialize Feature Systems
initProvenanceCenter();
initComparisonLab();
initEncounterReplay((asteroid, deltaHours, encState) => {
  // Reposition asteroid in 3D scene in real time as the user scrubs!
  const mesh = asteroidMeshes.find((m) => m.userData.asteroid.id === asteroid.id);
  if (!mesh) return;
  const nominalR = mesh.userData.nominalRadius || distToSceneUnits(asteroid.missKm);
  const zOffset = (deltaHours / 24.0) * (nominalR * 1.4);
  mesh.position.set(nominalR, 0, zOffset);
});

// Settings & Help Modals
$("help-btn")?.addEventListener("click", () => $("help-panel")?.classList.remove("hidden-hard"));
$("settings-btn")?.addEventListener("click", () => $("settings-panel")?.classList.remove("hidden-hard"));

document.querySelectorAll('[data-close="settings-panel"]').forEach((btn) => {
  btn.addEventListener("click", () => $("settings-panel")?.classList.add("hidden-hard"));
});
document.querySelectorAll('[data-close="help-panel"]').forEach((btn) => {
  btn.addEventListener("click", () => $("help-panel")?.classList.add("hidden-hard"));
});

// Settings inputs
$("setting-orbits")?.addEventListener("change", (e) => {
  state.preferences.showOrbits = e.target.checked;
  asteroidMeshes.forEach((m) => {
    if (m.userData.orbitRing) m.userData.orbitRing.visible = state.preferences.showOrbits;
  });
  moonOrbitRing.visible = state.preferences.showOrbits;
});

$("setting-grid")?.addEventListener("change", (e) => {
  state.preferences.showGrid = e.target.checked;
  gridMesh.visible = state.preferences.showGrid;
  $("grid-toggle-btn")?.classList.toggle("active", state.preferences.showGrid);
});

$("setting-atmosphere")?.addEventListener("change", (e) => {
  state.preferences.showAtmosphere = e.target.checked;
  atmosMesh.visible = state.preferences.showAtmosphere;
});

$("setting-clouds")?.addEventListener("change", (e) => {
  state.preferences.showClouds = e.target.checked;
  clouds.visible = state.preferences.showClouds;
});

$("setting-labels")?.addEventListener("change", (e) => {
  state.preferences.showLabels = e.target.checked;
});

$("setting-reduced-motion")?.addEventListener("change", (e) => {
  state.preferences.reducedMotion = e.target.checked;
});

$("setting-high-contrast")?.addEventListener("change", (e) => {
  document.body.classList.toggle("high-contrast", e.target.checked);
});

$("clear-cache-btn")?.addEventListener("click", () => {
  const keys = Object.keys(localStorage).filter(
    (k) => k.startsWith("ow_cache_") || k.startsWith("orbitwatch-") || k.startsWith("tle_")
  );
  keys.forEach((k) => localStorage.removeItem(k));
  alert(`Purged ${keys.length} cached data records. Reloading fresh telemetry…`);
  loadDay(state.currentDate, true);
});

/* ==========================================================================
   Signature Feature: Command Palette (Ctrl + K)
   ========================================================================== */

const cmdPalette = $("command-palette");
const cmdInput = $("cmd-search-input");
const cmdResults = $("cmd-results");
let cmdSelectedIndex = 0;
let currentCmdItems = [];

function openCommandPalette() {
  if (!cmdPalette) return;
  cmdPalette.classList.remove("hidden-hard");
  cmdSelectedIndex = 0;
  if (cmdInput) {
    cmdInput.value = "";
    cmdInput.focus();
  }
  renderCommandResults("");
}

function closeCommandPalette() {
  if (!cmdPalette) return;
  cmdPalette.classList.add("hidden-hard");
}

$("cmd-launcher-btn")?.addEventListener("click", openCommandPalette);
document.querySelectorAll('[data-close="cmd"]').forEach((el) => {
  el.addEventListener("click", closeCommandPalette);
});

function getCommandActions() {
  const actions = [
    { title: "Observatory View", meta: "Reset camera to Earth geocentric view", icon: "🌍", exec: () => { clearSelection(); setViewMode("earth"); } },
    { title: "Orrery Overview", meta: "Inner solar system orbital perspective", icon: "🪐", exec: () => setViewMode("orbit") },
    { title: "Asteroid Encounters", meta: "Toggle Asteroid Callset Drawer", icon: "☄️", exec: () => {
      const drawer = $("inspector-drawer");
      if (drawer) {
        drawer.classList.toggle("collapsed");
        document.body.classList.toggle("inspector-collapsed", drawer.classList.contains("collapsed"));
        $("rail-encounters")?.classList.toggle("active", !drawer.classList.contains("collapsed"));
      }
    } },
    { title: "Encounter Replay", meta: "Scrub instantaneous flyby trajectory", icon: "⏱", exec: () => {
      const target = state.selectedAsteroid || state.asteroids[0];
      if (target) openEncounterReplay(target);
    } },
    { title: "Asteroid Comparison Lab", meta: "Multi-object side-by-side analysis", icon: "⚖", exec: openComparisonLab },
    { title: "Hypothetical Impact Simulator", meta: "Physics blast model on Indian cities", icon: "💥", exec: () => {
      const target = state.selectedAsteroid || state.asteroids[0];
      if (target) openImpact(target);
    } },
    { title: "Space Today Dashboard", meta: "NASA APOD, solar weather, fireballs", icon: "🌞", exec: openToday },
    { title: "Satellite Swarm", meta: "Toggle CelesTrak tracked orbits", icon: "🛰️", exec: () => {
      state.swarmVisible = !state.swarmVisible;
      if (swarmApi) swarmApi.setVisible(state.swarmVisible);
      $("rail-satellites")?.classList.toggle("active", state.swarmVisible);
    } },
    { title: "Data Provenance Center", meta: "Authoritative feeds and telemetry audit", icon: "🔬", exec: openProvenanceCenter },
    { title: "Toggle Space Audio", meta: "Synthesized procedural space hum", icon: "🔊", exec: () => {
      initSound();
      toggleMute();
      updateSoundUI();
    } },
    { title: "Export Scene Screenshot", meta: "Capture high-resolution 3D PNG", icon: "📸", exec: () => $("screenshot-btn")?.click() },
    { title: "Display & Preferences", meta: "Grid, atmosphere, contrast settings", icon: "⚙️", exec: () => $("settings-btn")?.click() },
    { title: "Keyboard Shortcuts", meta: "Guidance & planetary defense standards", icon: "❓", exec: () => $("help-btn")?.click() },
  ];

  // Append currently loaded asteroids
  state.asteroids.forEach((a) => {
    actions.push({
      title: `${a.name} (${ldStr(a.missKm)})`,
      meta: `${a.designation ? a.designation + " · " : ""}~${Math.round(a.diameterM)}m · ${fmtInt.format(Math.round(a.velocityKmh))} km/h${a.hazardous ? " · PHA" : ""}`,
      icon: a.hazardous ? "⚠" : "☄️",
      badge: a.hazardous ? "PHA" : ldStr(a.missKm),
      exec: () => {
        const mesh = asteroidMeshes.find((m) => m.userData.asteroid.id === a.id);
        if (mesh) selectObject(mesh);
      },
    });
  });

  return actions;
}

function renderCommandResults(query) {
  if (!cmdResults) return;
  cmdResults.innerHTML = "";
  const q = (query || "").toLowerCase().trim();
  const all = getCommandActions();
  currentCmdItems = q ? all.filter((a) => a.title.toLowerCase().includes(q) || a.meta.toLowerCase().includes(q)) : all;

  if (!currentCmdItems.length) {
    cmdResults.innerHTML = `<div class="cmd-item" style="color:var(--text-muted);cursor:default">No matching commands or objects</div>`;
    return;
  }

  cmdSelectedIndex = Math.min(cmdSelectedIndex, currentCmdItems.length - 1);

  currentCmdItems.forEach((item, idx) => {
    const el = document.createElement("div");
    el.className = "cmd-item" + (idx === cmdSelectedIndex ? " active" : "");
    el.innerHTML = `
      <div class="cmd-item-left">
        <span class="cmd-item-icon">${item.icon}</span>
        <div>
          <div class="cmd-item-title">${item.title}</div>
          <div class="cmd-item-meta">${item.meta}</div>
        </div>
      </div>
      ${item.badge ? `<span class="cmd-item-badge">${item.badge}</span>` : ""}
    `;
    el.addEventListener("click", () => {
      closeCommandPalette();
      item.exec();
    });
    cmdResults.appendChild(el);
  });
}

cmdInput?.addEventListener("input", (e) => {
  cmdSelectedIndex = 0;
  renderCommandResults(e.target.value);
});

cmdInput?.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (currentCmdItems.length > 0) {
      cmdSelectedIndex = (cmdSelectedIndex + 1) % currentCmdItems.length;
      renderCommandResults(cmdInput.value);
      const activeEl = cmdResults.querySelectorAll(".cmd-item")[cmdSelectedIndex];
      if (activeEl) activeEl.scrollIntoView({ block: "nearest" });
    }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (currentCmdItems.length > 0) {
      cmdSelectedIndex = (cmdSelectedIndex - 1 + currentCmdItems.length) % currentCmdItems.length;
      renderCommandResults(cmdInput.value);
      const activeEl = cmdResults.querySelectorAll(".cmd-item")[cmdSelectedIndex];
      if (activeEl) activeEl.scrollIntoView({ block: "nearest" });
    }
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (currentCmdItems[cmdSelectedIndex]) {
      closeCommandPalette();
      currentCmdItems[cmdSelectedIndex].exec();
    }
  } else if (e.key === "Escape") {
    closeCommandPalette();
  }
});

// Live UTC Clock
setInterval(() => {
  const clockEl = $("live-utc-clock");
  if (clockEl) clockEl.textContent = new Date().toISOString().slice(11, 19);
}, 1000);

// Global Keyboard Navigation
window.addEventListener("keydown", (e) => {
  // Command palette toggle (Ctrl+K, Cmd+K)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    if (cmdPalette && !cmdPalette.classList.contains("hidden-hard")) {
      closeCommandPalette();
    } else {
      openCommandPalette();
    }
    return;
  }

  if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;

  switch (e.key) {
    case "ArrowLeft":
      e.preventDefault();
      shiftDate(-1);
      break;
    case "ArrowRight":
      e.preventDefault();
      shiftDate(1);
      break;
    case "ArrowUp": {
      e.preventDefault();
      if (!state.filteredAsteroids.length) return;
      const curIdx = state.selectedAsteroid
        ? state.filteredAsteroids.findIndex((a) => a.id === state.selectedAsteroid.id)
        : -1;
      const prevIdx = (curIdx - 1 + state.filteredAsteroids.length) % state.filteredAsteroids.length;
      const mesh = asteroidMeshes.find((m) => m.userData.asteroid.id === state.filteredAsteroids[prevIdx].id);
      if (mesh) selectObject(mesh);
      break;
    }
    case "ArrowDown": {
      e.preventDefault();
      if (!state.filteredAsteroids.length) return;
      const curIdx = state.selectedAsteroid
        ? state.filteredAsteroids.findIndex((a) => a.id === state.selectedAsteroid.id)
        : -1;
      const nextIdx = (curIdx + 1) % state.filteredAsteroids.length;
      const mesh = asteroidMeshes.find((m) => m.userData.asteroid.id === state.filteredAsteroids[nextIdx].id);
      if (mesh) selectObject(mesh);
      break;
    }
    case "Escape":
      clearSelection();
      closeEncounterReplay();
      closeCommandPalette();
      document.querySelectorAll(".overlay").forEach((ov) => ov.classList.add("hidden-hard"));
      break;
    case "e":
    case "E": {
      const drawer = $("inspector-drawer");
      if (drawer) {
        drawer.classList.toggle("collapsed");
        document.body.classList.toggle("inspector-collapsed", drawer.classList.contains("collapsed"));
        $("rail-encounters")?.classList.toggle("active", !drawer.classList.contains("collapsed"));
      }
      break;
    }
    case "t":
    case "T": {
      const target = state.selectedAsteroid || state.asteroids[0];
      if (target) openEncounterReplay(target);
      break;
    }
    case "c":
    case "C":
      openComparisonLab();
      break;
    case "r":
    case "R":
      clearSelection();
      setViewMode("earth");
      break;
    case "f":
    case "F":
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
      break;
    case "m":
    case "M":
      initSound();
      toggleMute();
      updateSoundUI();
      break;
    case "s":
    case "S": {
      state.swarmVisible = !state.swarmVisible;
      if (swarmApi) swarmApi.setVisible(state.swarmVisible);
      $("rail-satellites")?.classList.toggle("active", state.swarmVisible);
      break;
    }
    case "/":
      e.preventDefault();
      openCommandPalette();
      break;
    case "?":
      $("help-panel")?.classList.toggle("hidden-hard");
      break;
  }
});

/* ==========================================================================
   Satellite Swarm Integration
   ========================================================================== */

let swarmApi = null;

function bootSwarm(tries = 0) {
  if (!window.satellite) {
    if (tries < 40) setTimeout(() => bootSwarm(tries + 1), 250);
    return;
  }

  initSwarm(scene, EARTH_R)
    .then((api) => {
      if (!api) return;
      swarmApi = api;
      api.setVisible(state.swarmVisible);
    })
    .catch((err) => console.warn("[Ecliptara] Swarm unavailable:", err.message));
}
bootSwarm();

/* ==========================================================================
   External Feeds (Launches, Space Today, Fireball Dots)
   ========================================================================== */

initLaunches().catch((e) => console.warn("[Ecliptara] Launches feed unavailable:", e.message));
initToday();
loadGlobeDots(addSurfaceDots).catch(() => {});

/* ==========================================================================
   Cinematic Observatory Boot Sequence
   ========================================================================== */

(async function boot() {
  const { date, view } = parseUrlState();
  const initialDate = date || new Date().toISOString().slice(0, 10);
  if (view === "orbit") state.viewMode = "orbit";

  // Position camera at Moon distance behind loader
  camera.position.set(MOON_DIST + 4, 2.2, 5);
  animate();

  const setProgress = (pct) => {
    const bar = $("loader-progress-bar");
    if (bar) bar.style.width = `${pct}%`;
  };

  const setStep = (stepNum) => {
    for (let i = 1; i <= 4; i++) {
      const line = $(`log-step-${i}`);
      if (!line) continue;
      if (i < stepNum) {
        line.className = "loader-terminal-line done";
      } else if (i === stepNum) {
        line.className = "loader-terminal-line active";
      } else {
        line.className = "loader-terminal-line";
      }
    }
  };

  setProgress(20);
  setStep(1);

  await new Promise((r) => setTimeout(r, 350));
  setProgress(45);
  setStep(2);
  if ($("loader-status")) $("loader-status").textContent = "Establishing NASA NeoWs telemetry…";

  await loadDay(initialDate);

  setProgress(80);
  setStep(3);
  if ($("loader-status")) $("loader-status").textContent = `Calibrated ${state.asteroids.length} near-Earth objects…`;

  await new Promise((r) => setTimeout(r, 300));
  setProgress(100);
  setStep(4);
  if ($("loader-status")) $("loader-status").textContent = "Observatory workstation ready.";

  setTimeout(() => {
    $("loader")?.classList.add("hidden");

    // Camera glide from Moon approach to default workstation view
    cameraFlight = {
      t0: performance.now(),
      dur: 2800,
      fromT: controls.target.clone(),
      toT: new THREE.Vector3(0, 0, 0),
      fromC: camera.position.clone(),
      toC: state.viewMode === "orbit" ? new THREE.Vector3(0, 24, 75) : new THREE.Vector3(0, 14, 34),
    };

    // Show interface elements
    ["command-bar", "nav-rail", "canvas-hud", "orbital-timeline", "inspector-drawer"].forEach((id) => {
      const el = $(id);
      if (el) el.classList.remove("hidden");
    });

    setTimeout(() => $("loader")?.remove(), 800);
  }, 450);
})();
