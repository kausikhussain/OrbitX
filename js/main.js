import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { fetchAsteroids, LUNAR_DISTANCE_KM } from "./api.js";
import { openImpact } from "./impact.js";
import { initSound, toggleMute, isMuted, whoosh, ping } from "./sound.js";
import { downloadShareCard } from "./share.js";
import { initSky, updateSky } from "./sky.js";
import { initSwarm } from "./swarm.js";
import { initLaunches } from "./launches.js";
import { initToday, loadGlobeDots } from "./today.js";

/* ================= Scene basics ================= */

const container = document.getElementById("scene-container");
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030612, 0.0018);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 2000);
camera.position.set(0, 14, 34);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
container.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.5, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 6;
controls.maxDistance = 160;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.4;
controls.addEventListener("start", () => { controls.autoRotate = false; });

/* ================= Lights ================= */

const sun = new THREE.DirectionalLight(0xfff3e0, 3.2);
sun.position.set(30, 18, 65);
scene.add(sun);
scene.add(new THREE.AmbientLight(0x33456e, 1.15));
scene.add(new THREE.HemisphereLight(0x3a5a8a, 0x0a0a14, 0.45));

/* ================= Starfield ================= */

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
    // subtle blue/white/amber variance
    const t = Math.random();
    c.setHSL(t < 0.75 ? 0.6 : t < 0.92 ? 0.12 : 0.0, 0.35, 0.75 + Math.random() * 0.25);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size, vertexColors: true, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}
scene.add(makeStars(2600, 260, 900, 1.6, 0.9));
scene.add(makeStars(700, 180, 500, 2.1, 0.35));

/* ================= Earth ================= */

const EARTH_R = 3;
const earthGroup = new THREE.Group();
scene.add(earthGroup);

const texLoader = new THREE.TextureLoader();
texLoader.setCrossOrigin("anonymous");
const TEX = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r152/examples/textures/planets/";

// Procedural fallback texture in case the CDN is unreachable
function proceduralEarthTexture() {
  const cv = document.createElement("canvas");
  cv.width = 1024; cv.height = 512;
  const ctx = cv.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#0e2a52"); g.addColorStop(0.5, "#123a6e"); g.addColorStop(1, "#0e2a52");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
  ctx.fillStyle = "#1f7a4d";
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 1024, y = 100 + Math.random() * 312;
    ctx.beginPath();
    ctx.ellipse(x, y, 20 + Math.random() * 70, 12 + Math.random() * 40, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function loadTex(file, onOk) {
  texLoader.load(TEX + file, (t) => { t.colorSpace = THREE.SRGBColorSpace; onOk(t); }, undefined, () => {});
}

const earthMat = new THREE.MeshPhongMaterial({
  map: proceduralEarthTexture(),
  shininess: 18,
  specular: new THREE.Color(0x333344),
  emissive: new THREE.Color(0x000000),
});
// city lights that only glow on the night side
earthMat.onBeforeCompile = (shader) => {
  shader.uniforms.sunDirW = { value: new THREE.Vector3(30, 18, 65).normalize() };
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
loadTex("earth_atmos_2048.jpg", (t) => { earthMat.map = t; earthMat.needsUpdate = true; });
texLoader.load(TEX + "earth_normal_2048.jpg", (t) => { earthMat.normalMap = t; earthMat.normalScale.set(0.8, 0.8); earthMat.needsUpdate = true; });
texLoader.load(TEX + "earth_specular_2048.jpg", (t) => { earthMat.specularMap = t; earthMat.needsUpdate = true; });

const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 96, 96), earthMat);
earthGroup.add(earth);

// Cloud shell
const cloudMat = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.0, depthWrite: false });
const clouds = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.012, 64, 64), cloudMat);
earthGroup.add(clouds);
texLoader.load(TEX + "earth_clouds_1024.png", (t) => {
  t.colorSpace = THREE.SRGBColorSpace;
  cloudMat.map = t; cloudMat.opacity = 0.55; cloudMat.needsUpdate = true;
});

// Atmosphere fresnel glow
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
      float f = pow(0.62 + dot(normalize(vN), normalize(vP)), 5.0);
      gl_FragColor = vec4(c, clamp(f, 0.0, 1.0) * 0.45);
    }`,
});
earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.1, 64, 64), atmosMat));

/* ================= Moon + reference ring ================= */

function distToUnits(km) {
  const ld = km / LUNAR_DISTANCE_KM;
  return 10 + Math.log10(1 + ld) * 22; // log scale keeps everything on screen
}

const MOON_DIST = distToUnits(LUNAR_DISTANCE_KM);
const moonPivot = new THREE.Object3D();
moonPivot.rotation.x = THREE.MathUtils.degToRad(5);
scene.add(moonPivot);
const moonMat = new THREE.MeshPhongMaterial({ color: 0xb8b8c0 });
texLoader.load(TEX + "moon_1024.jpg", (t) => { t.colorSpace = THREE.SRGBColorSpace; moonMat.map = t; moonMat.color.set(0xffffff); moonMat.needsUpdate = true; });
const moon = new THREE.Mesh(new THREE.SphereGeometry(0.8, 48, 48), moonMat);
moon.position.x = MOON_DIST;
moonPivot.add(moon);

function orbitRing(radius, color, opacity) {
  const pts = [];
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
}
moonPivot.add(orbitRing(MOON_DIST, 0x8fa3c8, 0.22));

/* ================= Sky, dots on the globe ================= */

initSky(scene, sun);

// small pulsing markers glued to Earth's surface (fireballs, cyclones, wildfires)
const surfaceDots = new THREE.Group();
earth.add(surfaceDots);
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

/* ================= ISS (live position) ================= */

const ISS_R = EARTH_R * 1.35;
const issGroup = new THREE.Group();
{
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.13, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xdde4f0, emissive: 0xaac8ff, emissiveIntensity: 0.55, metalness: 0.6, roughness: 0.35 })
  );
  issGroup.add(body);
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x2b6fd4, emissive: 0x2b6fd4, emissiveIntensity: 0.6, side: THREE.DoubleSide });
  const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.15), panelMat);
  p1.position.x = 0.36;
  const p2 = p1.clone();
  p2.position.x = -0.36;
  issGroup.add(p1, p2);
}
issGroup.position.set(ISS_R, 0.5, 0);
scene.add(issGroup);

// invisible, generous hitbox so the tiny station is easy to click
const issHitbox = new THREE.Mesh(
  new THREE.SphereGeometry(0.7, 8, 8),
  new THREE.MeshBasicMaterial({ visible: false })
);
issHitbox.userData.iss = true;
issHitbox.userData.asteroid = { id: "iss", name: "International Space Station" };
scene.add(issHitbox);

let issLatLon = { lat: 20, lon: 77 };
let issHumans = 7;

function latLonToVec(lat, lon, r) {
  const la = THREE.MathUtils.degToRad(lat);
  const lo = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(
    r * Math.cos(la) * Math.cos(lo),
    r * Math.sin(la),
    -r * Math.cos(la) * Math.sin(lo)
  );
}

async function pollISS() {
  try {
    const res = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
    const d = await res.json();
    if (typeof d.latitude === "number") issLatLon = { lat: d.latitude, lon: d.longitude };
  } catch (_) { /* keep last known position */ }
}
pollISS();
setInterval(pollISS, 5000);
// crew count (best effort — falls back to 7)
(async () => {
  try {
    const res = await fetch("http://api.open-notify.org/astros.json");
    const d = await res.json();
    if (d.number) issHumans = d.number;
  } catch (_) {}
})();

/* ================= Asteroids ================= */

const asteroidMeshes = [];
const asteroidGroup = new THREE.Group();
scene.add(asteroidGroup);

function rockGeometry(size) {
  const geo = new THREE.IcosahedronGeometry(size, 1);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.multiplyScalar(0.78 + Math.random() * 0.5);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function sizeToUnits(diameterM) {
  // 10 m → ~0.18, 500 m → ~0.85
  return THREE.MathUtils.clamp(0.14 + Math.log10(1 + diameterM) * 0.26, 0.16, 1.0);
}

function addAsteroid(a) {
  const radius = distToUnits(a.missKm);
  const pivot = new THREE.Object3D();
  pivot.rotation.set(
    THREE.MathUtils.degToRad(THREE.MathUtils.randFloatSpread(56)),
    Math.random() * Math.PI * 2,
    THREE.MathUtils.degToRad(THREE.MathUtils.randFloatSpread(14))
  );
  asteroidGroup.add(pivot);

  const color = a.hazardous ? 0xff5c7a : 0xcbb694;
  const mesh = new THREE.Mesh(
    rockGeometry(sizeToUnits(a.diameterM)),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.9,
      metalness: 0.08,
      emissive: color,
      emissiveIntensity: a.hazardous ? 0.5 : 0.14,
    })
  );
  mesh.position.x = radius;
  mesh.userData.asteroid = a;
  pivot.add(mesh);
  pivot.add(orbitRing(radius, color, a.hazardous ? 0.28 : 0.12));

  mesh.userData.pivot = pivot;
  mesh.userData.spin = new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.9);
  // farther rocks drift slower; each gets its own pace
  mesh.userData.speed = (0.05 + Math.random() * 0.08) * (26 / radius);
  asteroidMeshes.push(mesh);
}

/* ================= Formatting helpers ================= */

const fmt = new Intl.NumberFormat("en-IN");

function sizeComparison(m) {
  if (m < 15) return "about the size of a school bus";
  if (m < 50) return "about the size of a Boeing 747";
  if (m < 120) return "about the size of a football field";
  if (m < 200) return "roughly the size of Wankhede Stadium";
  if (m < 400) return "taller than the Eiffel Tower";
  if (m < 900) return "nearly the size of the Burj Khalifa";
  return "the size of a small mountain";
}
function speedComparison(kmh) {
  return `~${Math.round(kmh / 3240)}× faster than a rifle bullet`;
}
function missComparison(km) {
  const ld = km / LUNAR_DISTANCE_KM;
  if (ld < 1) return `closer than the Moon 😳 (${ld.toFixed(2)}× lunar distance)`;
  return `${ld.toFixed(1)}× the distance to the Moon`;
}
const ldStr = (km) => (km / LUNAR_DISTANCE_KM).toFixed(1) + "× Moon";

/* ================= UI ================= */

const el = (id) => document.getElementById(id);
let selected = null;
let currentAsteroid = null;
let currentList = [];

/* When does this rock zip past India's sky? */
function indiaLine(a) {
  if (!a.epochMs) return "";
  const d = new Date(a.epochMs);
  const time = d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });
  const day = d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
  const h = Number(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }));
  const vibe =
    h >= 5 && h < 11 ? "right around morning chai ☕" :
    h >= 11 && h < 16 ? "in the middle of the workday 💼" :
    h >= 16 && h < 21 ? "during evening chai ☕" :
    "while India was fast asleep 😴";
  return `🇮🇳 Zips past at <b>${time} IST</b> (${day}) — ${vibe}`;
}

function showUI() {
  ["banner", "list-panel", "stats", "help-btn", "fab-stack", "left-stack"].forEach((id) => el(id).classList.remove("hidden"));
}

/* Welcome overlay — shows on first visit, reopenable via "?" */
function openWelcome() { el("welcome").classList.remove("hidden-hard"); }
function closeWelcome() {
  el("welcome").classList.add("hidden-hard");
  try { localStorage.setItem("orbitwatch-welcomed", "1"); } catch (_) {}
}
el("welcome-go").addEventListener("click", closeWelcome);
el("welcome").addEventListener("click", (e) => { if (e.target.id === "welcome") closeWelcome(); });
el("help-btn").addEventListener("click", openWelcome);

function countUp(node, target, suffix = "", decimals = 0) {
  const dur = 1400, t0 = performance.now();
  (function tick(t) {
    const p = Math.min((t - t0) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    node.textContent = (target * eased).toFixed(decimals) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}

function buildUI(asteroids, source, dateStr) {
  const closest = asteroids[0];
  const fastest = asteroids.reduce((m, a) => (a.velocityKmh > m.velocityKmh ? a : m));
  const hazards = asteroids.filter((a) => a.hazardous);
  const anyScary = hazards.some((a) => a.missKm < LUNAR_DISTANCE_KM);
  const isToday = !dateStr || dateStr === new Date().toISOString().slice(0, 10);

  // Verdict
  const verdict = el("verdict");
  verdict.classList.remove("danger");
  if (anyScary) {
    verdict.textContent = isToday ? "TODAY'S A SPICY ONE 👀" : "THAT WAS A SPICY DAY 👀";
    verdict.classList.add("danger");
  } else {
    verdict.textContent = isToday ? "NOPE. YOU'RE SAFE ✅" : "NOTHING HIT. ALL GOOD ✅";
  }
  const closestLd = closest.missKm / LUNAR_DISTANCE_KM;
  el("verdict-sub").textContent =
    `${asteroids.length} space rock${asteroids.length === 1 ? "" : "s"} ${isToday ? "passing today" : "passed that day"} · nearest one stays ${closestLd.toFixed(1)}× farther than the Moon` +
    (hazards.length ? ` · ${hazards.length} being watched by NASA` : "");

  // Source chip
  if (source === "sample") {
    el("source-label").textContent = "SAMPLE DATA · NASA RATE-LIMITED";
    el("data-source").classList.add("sample");
  }

  // Date
  const shown = dateStr ? new Date(dateStr + "T12:00:00") : new Date();
  el("today-date").textContent = shown.toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
  el("list-title").textContent = isToday ? "Today's flybys" : "Flybys that day";

  // Stats
  countUp(el("stat-count"), asteroids.length);
  countUp(el("stat-closest"), closest.missKm / LUNAR_DISTANCE_KM, "× Moon", 1);
  countUp(el("stat-fastest"), fastest.velocityKmh / 1000, "k km/h", 0);
  countUp(el("stat-hazard"), hazards.length);

  // List
  const list = el("asteroid-list");
  list.innerHTML = "";
  asteroids.forEach((a) => {
    const card = document.createElement("div");
    card.className = "ast-card" + (a.hazardous ? " hazard" : "");
    card.dataset.id = a.id;
    card.innerHTML = `
      <div class="ast-swatch"></div>
      <div class="ast-info">
        <div class="ast-name">${a.name}</div>
        <div class="ast-meta">⌀ ${fmt.format(Math.round(a.diameterM))} m · ${fmt.format(Math.round(a.velocityKmh))} km/h</div>
      </div>
      <div class="ast-dist">${ldStr(a.missKm)}</div>`;
    card.addEventListener("click", () => {
      const mesh = asteroidMeshes.find((m) => m.userData.asteroid.id === a.id);
      if (mesh) select(mesh);
    });
    list.appendChild(card);
  });
}

function selectISS() {
  selected = issHitbox;
  currentAsteroid = null;
  document.querySelectorAll(".ast-card").forEach((c) => c.classList.remove("active"));
  el("detail-name").textContent = "International Space Station";
  el("detail-time").textContent = "420 km up · one lap around Earth every 92 minutes";
  const hz = el("detail-hazard");
  hz.textContent = "🛰️ crewed spacecraft";
  hz.className = "detail-hazard safe";
  el("detail-size").textContent = "~109 m wide";
  el("detail-size-cmp").textContent = "about the size of a football field";
  el("detail-speed").textContent = "27,600 km/h";
  el("detail-speed-cmp").textContent = "Mumbai to Delhi in about 3 minutes";
  el("detail-miss").textContent = `${issHumans} humans aboard right now`;
  el("detail-miss-cmp").textContent = "the only offworld address humanity has";
  el("detail-india").innerHTML = "";
  el("impact-btn").style.display = "none";
  el("detail-link").href = "https://www.nasa.gov/international-space-station/";
  el("detail-panel").classList.remove("hidden");
  flyTo(issGroup.position.clone(), 5);
  controls.autoRotate = false;
  ping();
}

function select(mesh) {
  if (mesh.userData.iss) return selectISS();
  selected = mesh;
  const a = mesh.userData.asteroid;
  currentAsteroid = a;
  ping();

  document.querySelectorAll(".ast-card").forEach((c) =>
    c.classList.toggle("active", c.dataset.id === a.id));
  const active = document.querySelector(".ast-card.active");
  if (active) active.scrollIntoView({ block: "nearest", behavior: "smooth" });

  el("detail-name").textContent = a.name;
  el("detail-time").textContent = a.time ? "Closest approach: " + a.time : "";
  const hz = el("detail-hazard");
  hz.textContent = a.hazardous ? "⚠ potentially hazardous" : "harmless flyby";
  hz.className = "detail-hazard " + (a.hazardous ? "danger" : "safe");
  el("detail-size").textContent = "~" + fmt.format(Math.round(a.diameterM)) + " m wide";
  el("detail-size-cmp").textContent = sizeComparison(a.diameterM);
  el("detail-speed").textContent = fmt.format(Math.round(a.velocityKmh)) + " km/h";
  el("detail-speed-cmp").textContent = speedComparison(a.velocityKmh);
  el("detail-miss").textContent = "misses by " + fmt.format(Math.round(a.missKm)) + " km";
  el("detail-miss-cmp").textContent = missComparison(a.missKm);
  el("detail-india").innerHTML = indiaLine(a);
  el("impact-btn").style.display = "";
  el("detail-link").href = a.url;
  el("detail-panel").classList.remove("hidden");

  // fly the camera toward the rock
  const target = mesh.getWorldPosition(new THREE.Vector3());
  flyTo(target);
  controls.autoRotate = false;
}

el("detail-close").addEventListener("click", () => {
  el("detail-panel").classList.add("hidden");
  document.querySelectorAll(".ast-card").forEach((c) => c.classList.remove("active"));
  selected = null;
  flyTo(new THREE.Vector3(0, 0, 0), 34);
});

/* Camera tween */
let fly = null;
function flyTo(targetPos, dist = null) {
  whoosh();
  const dir = camera.position.clone().sub(controls.target).normalize();
  const d = dist ?? Math.max(6, targetPos.length() * 0.35 + 5);
  fly = {
    t0: performance.now(),
    dur: 1300,
    fromT: controls.target.clone(),
    toT: targetPos.clone(),
    fromC: camera.position.clone(),
    toC: targetPos.clone().add(dir.multiplyScalar(d)),
  };
}

/* ================= Picking ================= */

const raycaster = new THREE.Raycaster();
raycaster.params.Points = { threshold: 2 };
const pointer = new THREE.Vector2();
const tooltip = el("tooltip");
let downAt = null;

renderer.domElement.addEventListener("pointerdown", (e) => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener("pointerup", (e) => {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
  downAt = null;
  if (moved > 5) return;
  const hit = pick(e.clientX, e.clientY);
  if (hit) select(hit);
});
renderer.domElement.addEventListener("pointermove", (e) => {
  const hit = pick(e.clientX, e.clientY);
  if (hit) {
    const a = hit.userData.asteroid;
    tooltip.textContent = hit.userData.iss
      ? `🛰️ ISS · ${issHumans} humans aboard`
      : `${a.name} · ${ldStr(a.missKm)}`;
    tooltip.style.left = e.clientX + "px";
    tooltip.style.top = e.clientY + "px";
    tooltip.classList.remove("hidden");
    renderer.domElement.style.cursor = "pointer";
  } else {
    tooltip.classList.add("hidden");
    renderer.domElement.style.cursor = "grab";
  }
});

function pick(x, y) {
  pointer.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  // generous hit area: test against slightly inflated bounding spheres
  const targets = [issHitbox, ...asteroidMeshes];
  const hits = raycaster.intersectObjects(targets, false);
  if (hits.length) return hits[0].object;
  let best = null, bestD = 1.6;
  const p = new THREE.Vector3();
  for (const m of targets) {
    m.getWorldPosition(p);
    const d = raycaster.ray.distanceToPoint(p);
    if (d < bestD) { bestD = d; best = m; }
  }
  return best;
}

/* ================= Animation loop ================= */

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t = clock.elapsedTime;

  earth.rotation.y += dt * 0.05;
  clouds.rotation.y += dt * 0.065;
  moonPivot.rotation.y += dt * 0.02;

  // ISS drifts toward its real position (polled every 5 s)
  const issTarget = latLonToVec(issLatLon.lat, issLatLon.lon, ISS_R);
  issGroup.position.lerp(issTarget, 0.02);
  issGroup.lookAt(0, 0, 0);
  issHitbox.position.copy(issGroup.position);

  updateSky(dt, t);
  if (swarmApi) swarmApi.update();

  for (const m of asteroidMeshes) {
    m.userData.pivot.rotation.y += dt * m.userData.speed;
    m.rotation.x += dt * m.userData.spin.x;
    m.rotation.y += dt * m.userData.spin.y;
    if (m.userData.asteroid.hazardous) {
      m.material.emissiveIntensity = 0.35 + Math.sin(t * 3.2) * 0.25;
    }
  }

  if (fly) {
    const p = Math.min((performance.now() - fly.t0) / fly.dur, 1);
    const e = 1 - Math.pow(1 - p, 3);
    controls.target.lerpVectors(fly.fromT, fly.toT, e);
    camera.position.lerpVectors(fly.fromC, fly.toC, e);
    if (p >= 1) fly = null;
  } else if (selected) {
    // gently follow the selected rock as it drifts
    const wp = selected.getWorldPosition(new THREE.Vector3());
    controls.target.lerp(wp, 0.06);
  }

  controls.update();
  composer.render();
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

/* ================= Day loading (today or time travel) ================= */

async function loadDay(dateStr) {
  // clear previous day's rocks
  asteroidGroup.clear();
  asteroidMeshes.length = 0;
  selected = null;
  currentAsteroid = null;
  el("detail-panel").classList.add("hidden");

  const { asteroids, source } = await fetchAsteroids(dateStr);
  currentList = asteroids;
  asteroids.forEach(addAsteroid);
  buildUI(asteroids, source, dateStr);
}

/* ================= Feature wiring ================= */

// Time travel
const datePicker = el("date-picker");
datePicker.value = new Date().toISOString().slice(0, 10);
datePicker.addEventListener("change", () => {
  if (datePicker.value) loadDay(datePicker.value);
});

// Impact simulator
el("impact-btn").addEventListener("click", () => {
  if (currentAsteroid) openImpact(currentAsteroid);
});

// Share card
el("share-btn").addEventListener("click", () => {
  if (!currentList.length) return;
  downloadShareCard({
    verdict: el("verdict").textContent,
    sub: el("verdict-sub").textContent,
    date: el("today-date").textContent,
    count: currentList.length,
    closest: currentList[0],
  });
});

// Sound
el("sound-btn").textContent = isMuted() ? "🔇" : "🔊";
el("sound-btn").addEventListener("click", () => {
  initSound();
  el("sound-btn").textContent = toggleMute() ? "🔇" : "🔊";
});
const gestureInit = () => { initSound(); removeEventListener("pointerdown", gestureInit); };
addEventListener("pointerdown", gestureInit);

// Satellite swarm (waits for the deferred satellite.js script)
let swarmApi = null;
function bootSwarm(tries = 0) {
  if (!window.satellite) {
    if (tries < 40) setTimeout(() => bootSwarm(tries + 1), 250);
    return;
  }
  initSwarm(scene, EARTH_R).then((api) => {
    if (!api) return;
    swarmApi = api;
    el("swarm-chip").classList.remove("hidden-hard");
    el("swarm-count").textContent =
      `${api.counts.total.toLocaleString("en-IN")} objects in orbit right now · ${api.counts.india} are India's`;
    let swarmOn = true, indiaOn = false;
    el("swarm-toggle").addEventListener("click", () => {
      swarmOn = !swarmOn;
      api.setVisible(swarmOn);
      el("swarm-toggle").classList.toggle("active", swarmOn);
    });
    el("india-toggle").addEventListener("click", () => {
      indiaOn = !indiaOn;
      api.setIndiaFocus(indiaOn);
      el("india-toggle").classList.toggle("active", indiaOn);
      if (indiaOn && !swarmOn) { swarmOn = true; api.setVisible(true); el("swarm-toggle").classList.add("active"); }
    });
  }).catch((e) => console.warn("[OrbitWatch] swarm unavailable:", e.message));
}
bootSwarm();

// Launches, Space Today panel, globe event dots — all best-effort
initLaunches().catch((e) => console.warn("[OrbitWatch] launches unavailable:", e.message));
initToday();
loadGlobeDots(addSurfaceDots).catch(() => {});

/* ================= Boot ================= */

(async function boot() {
  // cinematic opening: start beside the Moon, glide home to Earth
  camera.position.set(MOON_DIST + 4, 2.2, 5);
  animate(); // start rendering behind the loader immediately

  el("loader-status").textContent = "Contacting NASA…";
  await loadDay(null);
  el("loader-status").textContent = `Tracking ${currentList.length} rocks…`;

  setTimeout(() => {
    el("loader").classList.add("hidden");
    fly = {
      t0: performance.now(),
      dur: 3200,
      fromT: controls.target.clone(),
      toT: new THREE.Vector3(0, 0, 0),
      fromC: camera.position.clone(),
      toC: new THREE.Vector3(0, 14, 34),
    };
    showUI();
    let welcomed = false;
    try { welcomed = !!localStorage.getItem("orbitwatch-welcomed"); } catch (_) {}
    if (!welcomed) openWelcome();
    setTimeout(() => el("loader").remove(), 900);
  }, 700);
})();
