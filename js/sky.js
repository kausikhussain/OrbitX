// Cinematic sky: Milky Way backdrop, visible Sun with lens flare, shooting stars.
import * as THREE from "three";
import { Lensflare, LensflareElement } from "three/addons/objects/Lensflare.js";

const TEX = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r152/examples/textures/";
let meteors = [];
let nextMeteorAt = 3;

export function initSky(scene, sunLight) {
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");

  // --- Milky Way dome (procedurally painted — no photo assets) ---
  {
    const cv = document.createElement("canvas");
    cv.width = 2048; cv.height = 1024;
    const c = cv.getContext("2d");
    c.fillStyle = "#020409";
    c.fillRect(0, 0, 2048, 1024);

    // the galactic band: a soft wavy ribbon of layered glow blobs
    for (let i = 0; i < 240; i++) {
      const x = Math.random() * 2048;
      const y = 512 + Math.sin(x / 2048 * Math.PI * 2 + 1.2) * 140 + (Math.random() - 0.5) * 110;
      const r = 25 + Math.random() * 80;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      const hue = Math.random();
      const tint = hue < 0.7 ? "170,190,235" : hue < 0.9 ? "205,185,235" : "235,210,180";
      g.addColorStop(0, `rgba(${tint},${0.015 + Math.random() * 0.03})`);
      g.addColorStop(1, `rgba(${tint},0)`);
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
    // dark dust lanes cutting through the band
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * 2048;
      const y = 512 + Math.sin(x / 2048 * Math.PI * 2 + 1.2) * 140 + (Math.random() - 0.5) * 60;
      const r = 15 + Math.random() * 45;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(2,4,9,0.14)");
      g.addColorStop(1, "rgba(2,4,9,0)");
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
    // a modest sprinkle of stars concentrated in the band
    // (the 3D point clouds already handle the rest of the sky)
    for (let i = 0; i < 1100; i++) {
      const x = Math.random() * 2048;
      const band = Math.abs(Math.random() + Math.random() - 1); // triangular dist
      const y = 512 + Math.sin(x / 2048 * Math.PI * 2 + 1.2) * 140 + (band - 0.5) * 300;
      const a = 0.15 + Math.random() * 0.4;
      c.fillStyle = Math.random() > 0.92 ? `rgba(255,225,190,${a})` : `rgba(225,235,255,${a})`;
      c.fillRect(x, y, 1, 1);
    }

    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8; // kills the shimmering-grain moiré at glancing angles
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1400, 48, 32),
      new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false })
    );
    dome.rotation.z = 0.45;
    dome.renderOrder = -10;
    scene.add(dome);
  }

  // --- The Sun (bright core sprite + lens flare) ---
  const sunPos = sunLight.position.clone().normalize().multiplyScalar(900);

  const coreCv = document.createElement("canvas");
  coreCv.width = coreCv.height = 128;
  const cx = coreCv.getContext("2d");
  const grad = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,240,1)");
  grad.addColorStop(0.25, "rgba(255,240,200,0.9)");
  grad.addColorStop(0.6, "rgba(255,200,120,0.25)");
  grad.addColorStop(1, "rgba(255,180,80,0)");
  cx.fillStyle = grad;
  cx.fillRect(0, 0, 128, 128);
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(coreCv),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  }));
  sunSprite.scale.setScalar(180);
  sunSprite.position.copy(sunPos);
  scene.add(sunSprite);

  loader.load(TEX + "lensflare/lensflare0.png", (t0) => {
    loader.load(TEX + "lensflare/lensflare3.png", (t3) => {
      const flare = new Lensflare();
      flare.addElement(new LensflareElement(t0, 420, 0, new THREE.Color(1, 0.95, 0.85)));
      flare.addElement(new LensflareElement(t3, 80, 0.4));
      flare.addElement(new LensflareElement(t3, 120, 0.6));
      flare.addElement(new LensflareElement(t3, 60, 0.9));
      flare.addElement(new LensflareElement(t3, 90, 1.2));
      const holder = new THREE.PointLight(0xffffff, 0.0001, 1);
      holder.position.copy(sunPos);
      holder.add(flare);
      scene.add(holder);
    });
  });

  // --- Shooting star pool ---
  const streakCv = document.createElement("canvas");
  streakCv.width = 128; streakCv.height = 8;
  const sx = streakCv.getContext("2d");
  const sg = sx.createLinearGradient(0, 0, 128, 0);
  sg.addColorStop(0, "rgba(255,255,255,0)");
  sg.addColorStop(0.7, "rgba(200,225,255,0.55)");
  sg.addColorStop(1, "rgba(255,255,255,1)");
  sx.fillStyle = sg;
  sx.fillRect(0, 0, 128, 8);
  const streakTex = new THREE.CanvasTexture(streakCv);

  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 0.14),
      new THREE.MeshBasicMaterial({
        map: streakTex,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      })
    );
    m.visible = false;
    m.userData = { life: 0, vel: new THREE.Vector3() };
    scene.add(m);
    meteors.push(m);
  }
}

function spawnMeteor() {
  const m = meteors.find((x) => !x.visible);
  if (!m) return;
  // random point on a big shell, moving roughly tangentially
  const dir = new THREE.Vector3().randomDirection();
  const pos = dir.clone().multiplyScalar(150 + Math.random() * 250);
  const vel = new THREE.Vector3().randomDirection().cross(dir).normalize().multiplyScalar(160 + Math.random() * 120);
  m.position.copy(pos);
  m.userData.vel.copy(vel);
  m.userData.life = 1;
  // align the streak with its velocity
  m.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), vel.clone().normalize());
  m.visible = true;
}

export function updateSky(dt, elapsed) {
  if (elapsed > nextMeteorAt) {
    spawnMeteor();
    nextMeteorAt = elapsed + 5 + Math.random() * 9;
  }
  for (const m of meteors) {
    if (!m.visible) continue;
    m.userData.life -= dt;
    if (m.userData.life <= 0) { m.visible = false; m.material.opacity = 0; continue; }
    m.position.addScaledVector(m.userData.vel, dt);
    const l = m.userData.life;
    m.material.opacity = l > 0.7 ? (1 - l) * 3 : l * 1.2;
  }
}
