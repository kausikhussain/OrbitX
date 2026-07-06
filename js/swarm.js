// Every tracked satellite in orbit, live — CelesTrak TLEs propagated in-browser
// with satellite.js. ISRO birds get their own saffron layer. 🇮🇳
import * as THREE from "three";

const INDIA_RE = /(INSAT|GSAT|CARTOSAT|RISAT|IRNSS|NVS-|ASTROSAT|OCEANSAT|RESOURCESAT|EOS-\d|EMISAT|SARAL|SCATSAT|MEGHA|KALPANA|IRS-|HAMSAT|MICROSAT|ANUSAT|YOUTHSAT|CHANDRAYAAN|ADITYA|XPOSAT|GISAT|CMS-\d|DS-SAR|PRATHAM|SROSS|ROHINI|APPLE|BHASKARA|ARYABHATA|AZAADISAT|ANAND|SINDHU|VELOX|INS-\d)/i;

const CHUNK = 700; // satellites re-propagated per frame (round-robin)

export async function initSwarm(scene, EARTH_R) {
  if (!window.satellite) return null;

  // --- fetch TLEs (cached per day) ---
  let text = null;
  const key = "tle-" + new Date().toISOString().slice(0, 10);
  try { text = localStorage.getItem(key); } catch (_) {}
  if (!text) {
    const res = await fetch("https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle");
    if (!res.ok) throw new Error("celestrak " + res.status);
    text = await res.text();
    try {
      // keep quota sane: drop older TLE caches first
      Object.keys(localStorage).filter((k) => k.startsWith("tle-") && k !== key)
        .forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(key, text);
    } catch (_) {}
  }

  // --- parse ---
  const lines = text.split("\n").map((l) => l.trimEnd()).filter(Boolean);
  const sats = [];
  const india = [];
  for (let i = 0; i + 2 < lines.length + 1; i += 3) {
    const name = lines[i];
    const l1 = lines[i + 1], l2 = lines[i + 2];
    if (!l1 || !l2 || l1[0] !== "1" || l2[0] !== "2") continue;
    try {
      const rec = window.satellite.twoline2satrec(l1, l2);
      (INDIA_RE.test(name) ? india : sats).push({ name, rec });
    } catch (_) {}
  }
  if (!sats.length) return null;

  const UNIT = EARTH_R / 6371; // km → scene units

  // soft round glow sprite so points aren't hard squares
  const dotCv = document.createElement("canvas");
  dotCv.width = dotCv.height = 32;
  const dctx = dotCv.getContext("2d");
  const dg = dctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  dg.addColorStop(0, "rgba(255,255,255,1)");
  dg.addColorStop(0.4, "rgba(255,255,255,0.6)");
  dg.addColorStop(1, "rgba(255,255,255,0)");
  dctx.fillStyle = dg;
  dctx.fillRect(0, 0, 32, 32);
  const dotTex = new THREE.CanvasTexture(dotCv);

  function makeCloud(list, color, size, opacity) {
    const pos = new Float32Array(list.length * 3).fill(99999);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color, size, transparent: true, opacity, map: dotTex,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    scene.add(points);
    return { list, geo, mat, points, cursor: 0 };
  }

  const main = makeCloud(sats, 0x86b8ff, 0.075, 0.42);
  const desi = makeCloud(india, 0xff9933, 0.3, 1.0);

  function propagate(cloud, count) {
    const now = new Date();
    const arr = cloud.geo.attributes.position.array;
    const n = cloud.list.length;
    for (let k = 0; k < count && k < n; k++) {
      const i = cloud.cursor;
      cloud.cursor = (cloud.cursor + 1) % n;
      try {
        const p = window.satellite.propagate(cloud.list[i].rec, now).position;
        if (p) {
          // ECI (z-up) → scene (y-up)
          arr[i * 3] = p.x * UNIT;
          arr[i * 3 + 1] = p.z * UNIT;
          arr[i * 3 + 2] = -p.y * UNIT;
        }
      } catch (_) { /* decayed / bad TLE — leave parked far away */ }
    }
    cloud.geo.attributes.position.needsUpdate = true;
  }

  // initial full pass so the swarm pops in complete
  propagate(main, sats.length);
  propagate(desi, india.length);

  return {
    counts: { total: sats.length + india.length, india: india.length },
    update() {
      propagate(main, CHUNK);
      propagate(desi, india.length); // ours stay perfectly live
    },
    setVisible(v) { main.points.visible = v; desi.points.visible = v; },
    setIndiaFocus(v) {
      // dim the world's satellites so India's shine
      main.mat.opacity = v ? 0.05 : 0.42;
      desi.mat.size = v ? 0.5 : 0.3;
    },
  };
}
