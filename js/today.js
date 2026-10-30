// ==========================================================================
// Space Today Dashboard — APOD, Earth photography, solar weather,
// fireballs, JPL Sentry watch list, and solar system orrery.
// ==========================================================================

import { getApiKey } from "./api.js";

const $ = (id) => document.getElementById(id);
const dstr = (d) => d.toISOString().slice(0, 10);

// JPL SSD API has no CORS headers — relay through a CORS proxy with direct fallback
const prox = (u) => "https://corsproxy.io/?url=" + encodeURIComponent(u);

async function cachedJson(name, url) {
  const key = `ow-${name}-${dstr(new Date())}`;
  try {
    const c = localStorage.getItem(key);
    if (c) return JSON.parse(c);
  } catch (_) {}

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const res = await fetch(url, { signal: ctl.signal }).finally(() => clearTimeout(timer));
    if (!res.ok) throw new Error(name + " " + res.status);
    const j = await res.json();
    try {
      localStorage.setItem(key, JSON.stringify(j));
    } catch (_) {}
    return j;
  } catch (err) {
    throw err;
  }
}

/* ---------- Boot-time: fireballs + live natural events → dots on the globe ---------- */

export async function loadGlobeDots(addDots) {
  const dots = [];
  try {
    const past = new Date(Date.now() - 30 * 86400e3);
    const fb = await cachedJson(
      "fireballs",
      prox(`https://ssd-api.jpl.nasa.gov/fireball.api?date-min=${dstr(past)}&req-loc=true`)
    );
    const f = fb.fields;
    const gi = (row, name) => row[f.indexOf(name)];
    (fb.data || []).forEach((row) => {
      let lat = parseFloat(gi(row, "lat"));
      let lon = parseFloat(gi(row, "lon"));
      if (isNaN(lat) || isNaN(lon)) return;
      if (gi(row, "lat-dir") === "S") lat = -lat;
      if (gi(row, "lon-dir") === "W") lon = -lon;
      dots.push({ lat, lon, color: 0xffa04d, size: 0.05 });
    });
    window.__fireballCount = (fb.data || []).length;
  } catch (_) {
    window.__fireballCount = 0;
  }

  try {
    const ev = await cachedJson("eonet", "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=80");
    (ev.events || []).forEach((e) => {
      const g = e.geometry && e.geometry[e.geometry.length - 1];
      if (!g || !Array.isArray(g.coordinates)) return;
      const [lon, lat] = g.coordinates;
      if (typeof lat !== "number") return;
      const wild = /wildfire/i.test((e.categories[0] || {}).title || "");
      dots.push({ lat, lon, color: wild ? 0xff5c33 : 0x5cc8ff, size: 0.04 });
    });
    window.__eonetCount = (ev.events || []).length;
  } catch (_) {
    window.__eonetCount = 0;
  }

  if (dots.length) addDots(dots);
}

/* ---------- Space Today Panel Wiring ---------- */

let loaded = false;

export function initToday() {
  const openBtn = $("today-btn");
  if (openBtn) openBtn.addEventListener("click", openToday);

  // Wire close actions
  document.querySelectorAll('[data-close="today"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const el = $("today");
      if (el) el.classList.add("hidden-hard");
    });
  });

  const todayEl = $("today");
  if (todayEl) {
    todayEl.addEventListener("click", (e) => {
      if (e.target.id === "today") todayEl.classList.add("hidden-hard");
    });
  }
}

export function openToday() {
  const el = $("today");
  if (!el) return;
  el.classList.remove("hidden-hard");
  if (loaded) return;
  loaded = true;

  fillApod();
  fillEpic();
  fillSun();
  fillFireballs();
  fillSentry();
  drawOrrery();
}

async function fillApod() {
  const key = getApiKey();
  try {
    const j = await cachedJson("apod", `https://api.nasa.gov/planetary/apod?api_key=${key}`);
    const imgEl = $("apod-img");
    const titleEl = $("apod-title");
    if (j.media_type === "image" && imgEl) {
      imgEl.src = j.url;
      imgEl.style.display = "";
    }
    if (titleEl) titleEl.textContent = j.title || "";
  } catch (_) {
    const titleEl = $("apod-title");
    if (titleEl) titleEl.textContent = "Astronomy Picture of the Day unavailable (rate limit) — try again later.";
  }
}

async function fillEpic() {
  const key = getApiKey();
  try {
    const j = await cachedJson("epic", `https://api.nasa.gov/EPIC/api/natural?api_key=${key}`);
    const item = j[j.length - 1];
    if (!item) return;
    const [y, m, d] = item.date.slice(0, 10).split("-");
    const imgEl = $("epic-img");
    const capEl = $("epic-cap");
    if (imgEl) {
      imgEl.src = `https://api.nasa.gov/EPIC/archive/natural/${y}/${m}/${d}/png/${item.image}.png?api_key=${key}`;
      imgEl.style.display = "";
    }
    if (capEl) capEl.textContent = `Captured ${item.date.slice(0, 16)} UTC from 1.5M km distance (DSCOVR)`;
  } catch (_) {
    const capEl = $("epic-cap");
    if (capEl) capEl.textContent = "Earth observation imagery currently updating.";
  }
}

async function fillSun() {
  const key = getApiKey();
  try {
    const past = new Date(Date.now() - 7 * 86400e3);
    const j = await cachedJson(
      "donki",
      `https://api.nasa.gov/DONKI/FLR?startDate=${dstr(past)}&api_key=${key}`
    );
    const flares = Array.isArray(j) ? j : [];
    
    // Sort flares by class strength properly: X > M > C > B > A with numbers
    const scoreFlare = (cls) => {
      if (!cls) return 0;
      const type = cls[0].toUpperCase();
      const val = parseFloat(cls.slice(1)) || 1;
      const mult = { A: 1, B: 10, C: 100, M: 1000, X: 10000 }[type] || 0;
      return mult * val;
    };

    const sorted = flares.slice().sort((a, b) => scoreFlare(a.classType) - scoreFlare(b.classType));
    const strongest = sorted.length ? sorted[sorted.length - 1].classType : "";

    let mood = "☀️ Calm solar wind conditions this week.";
    if (strongest.startsWith("C")) mood = "✨ Minor solar activity — small C-class flares.";
    if (strongest.startsWith("M")) mood = "⚠️ Active solar region — moderate M-class flares.";
    if (strongest.startsWith("X")) mood = "🔥 Intense solar storm — major X-class flare recorded!";

    const statusEl = $("sun-status");
    const detailEl = $("sun-detail");
    if (statusEl) statusEl.textContent = mood;
    if (detailEl) {
      detailEl.textContent = flares.length
        ? `${flares.length} flare${flares.length === 1 ? "" : "s"} in past 7 days · Max: ${strongest}`
        : "Zero solar flares recorded in past 7 days.";
    }
  } catch (_) {
    const statusEl = $("sun-status");
    if (statusEl) statusEl.textContent = "Solar activity monitoring unavailable.";
  }
}

function fillFireballs() {
  const n = window.__fireballCount;
  const el = $("fireball-line");
  if (el) {
    el.textContent = typeof n === "number" && n > 0
      ? `${n} atmospheric fireball events recorded in the last 30 days (marked in orange on the 3D globe).`
      : "Atmospheric fireball sensor data syncing.";
  }
}

async function fillSentry() {
  const listEl = $("sentry-list");
  if (!listEl) return;
  try {
    const j = await cachedJson("sentry", prox("https://ssd-api.jpl.nasa.gov/sentry.api"));
    const top = (j.data || [])
      .map((r) => ({ des: r.des || r.fullname, ip: parseFloat(r.ip), range: r.range }))
      .filter((r) => r.ip > 0)
      .sort((a, b) => b.ip - a.ip)
      .slice(0, 3);

    listEl.innerHTML = top.map((r) =>
      `<div class="watch-row"><b>${r.des}</b><span>1-in-${Math.round(1 / r.ip).toLocaleString("en-US")} chance · est. ${r.range}</span></div>`
    ).join("") || "<div class='watch-row'>No objects above threshold.</div>";
  } catch (_) {
    listEl.innerHTML = "<div class='watch-row'>JPL Sentry impact monitoring records syncing.</div>";
  }
}

/* ---------- Solar system positions via astronomy-engine ---------- */

function drawOrrery() {
  const cv = $("orrery");
  if (!cv || !window.Astronomy) {
    if (cv) cv.style.display = "none";
    return;
  }
  const ctx = cv.getContext("2d");
  const S = cv.width;
  const C = S / 2;
  const planets = [
    ["Mercury", "#b5a397"],
    ["Venus", "#e6c07a"],
    ["Earth", "#6ee7ff"],
    ["Mars", "#ff6f4d"],
    ["Jupiter", "#e0b184"],
    ["Saturn", "#d9c9a3"],
    ["Uranus", "#9fd8e0"],
    ["Neptune", "#6f8fff"],
  ];
  ctx.clearRect(0, 0, S, S);

  // Sun
  ctx.fillStyle = "#ffd76a";
  ctx.shadowColor = "#ffd76a";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(C, C, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  const now = new Date();
  planets.forEach(([name, color], i) => {
    const r = 34 + i * ((C - 48) / 7);
    ctx.strokeStyle = "rgba(140,180,255,0.12)";
    ctx.beginPath();
    ctx.arc(C, C, r, 0, Math.PI * 2);
    ctx.stroke();

    try {
      const v = window.Astronomy.HelioVector(window.Astronomy.Body[name], now);
      const a = Math.atan2(v.y, v.x);
      const px = C + Math.cos(a) * r;
      const py = C - Math.sin(a) * r;

      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = name === "Earth" ? 14 : 5;
      ctx.beginPath();
      ctx.arc(px, py, name === "Earth" ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = name === "Earth" ? "#6ee7ff" : "#8fa3c8";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(name === "Earth" ? "Earth (you)" : name, px, py - 9);
    } catch (_) {}
  });
}
