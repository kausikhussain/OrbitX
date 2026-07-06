// "Space Today" — APOD, Earth-from-space, solar weather, fireballs,
// NASA's real risk list, and a live solar-system orrery.
const NASA_KEY = "JzNSq7Webv1x2EiQ0tQujRgoYnmXdUZph3AdR2V0";
const $ = (id) => document.getElementById(id);
const dstr = (d) => d.toISOString().slice(0, 10);
// JPL's ssd-api has no CORS headers — relay through a public proxy
const prox = (u) => "https://corsproxy.io/?url=" + encodeURIComponent(u);

async function cachedJson(name, url) {
  const key = `ow-${name}-${dstr(new Date())}`;
  try {
    const c = localStorage.getItem(key);
    if (c) return JSON.parse(c);
  } catch (_) {}
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  const res = await fetch(url, { signal: ctl.signal }).finally(() => clearTimeout(timer));
  if (!res.ok) throw new Error(name + " " + res.status);
  const j = await res.json();
  try { localStorage.setItem(key, JSON.stringify(j)); } catch (_) {}
  return j;
}

/* ---------- boot-time: fireballs + live natural events → dots on the globe ---------- */

export async function loadGlobeDots(addDots) {
  const dots = [];
  try {
    const past = new Date(Date.now() - 30 * 86400e3);
    const fb = await cachedJson("fireballs",
      prox(`https://ssd-api.jpl.nasa.gov/fireball.api?date-min=${dstr(past)}&req-loc=true`));
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
  } catch (_) {}
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
  } catch (_) {}
  if (dots.length) addDots(dots);
}

/* ---------- the panel (fetched lazily on first open) ---------- */

let loaded = false;

export function initToday() {
  $("today-btn").addEventListener("click", open);
  $("today-close").addEventListener("click", () => $("today").classList.add("hidden-hard"));
  $("today").addEventListener("click", (e) => { if (e.target.id === "today") $("today").classList.add("hidden-hard"); });
}

function open() {
  $("today").classList.remove("hidden-hard");
  if (loaded) return;
  loaded = true;
  fillApod(); fillEpic(); fillSun(); fillFireballs(); fillSentry(); drawOrrery();
}

async function fillApod() {
  try {
    const j = await cachedJson("apod", `https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}`);
    if (j.media_type === "image") {
      $("apod-img").src = j.url;
      $("apod-img").style.display = "";
    }
    $("apod-title").textContent = j.title || "";
  } catch (_) { $("apod-title").textContent = "NASA's picture of the day is napping (rate limit) — try later."; }
}

async function fillEpic() {
  try {
    const j = await cachedJson("epic", `https://api.nasa.gov/EPIC/api/natural?api_key=${NASA_KEY}`);
    const item = j[j.length - 1];
    if (!item) return;
    const [y, m, d] = item.date.slice(0, 10).split("-");
    $("epic-img").src = `https://api.nasa.gov/EPIC/archive/natural/${y}/${m}/${d}/png/${item.image}.png?api_key=${NASA_KEY}`;
    $("epic-img").style.display = "";
    $("epic-cap").textContent = `Photographed ${item.date.slice(0, 16)} UTC from 1.5 million km away`;
  } catch (_) { $("epic-cap").textContent = "Earth photo unavailable right now."; }
}

async function fillSun() {
  try {
    const past = new Date(Date.now() - 7 * 86400e3);
    const j = await cachedJson("donki",
      `https://api.nasa.gov/DONKI/FLR?startDate=${dstr(past)}&api_key=${NASA_KEY}`);
    const flares = Array.isArray(j) ? j : [];
    const classes = flares.map((f) => f.classType || "").filter(Boolean);
    const worst = classes.sort().pop() || "";
    let mood = "😌 The Sun is calm this week.";
    if (worst.startsWith("C")) mood = "✨ Minor sparks — the Sun is doodling.";
    if (worst.startsWith("M")) mood = "⚠️ The Sun is feisty — medium flares this week.";
    if (worst.startsWith("X")) mood = "🔥 The Sun threw a tantrum — X-class flare!";
    $("sun-status").textContent = mood;
    $("sun-detail").textContent = flares.length
      ? `${flares.length} solar flare${flares.length === 1 ? "" : "s"} in the last 7 days · strongest: ${worst}`
      : "Zero flares recorded in the last 7 days";
  } catch (_) { $("sun-status").textContent = "☀️ Sun status unavailable (rate limit)."; }
}

function fillFireballs() {
  const n = window.__fireballCount;
  $("fireball-line").textContent = typeof n === "number"
    ? `${n} fireball${n === 1 ? "" : "s"} exploded in Earth's atmosphere in the last 30 days — orange dot${n === 1 ? "" : "s"} on the globe. You missed ${n === 1 ? "it" : "every single one"}.`
    : "Fireball data unavailable right now.";
}

async function fillSentry() {
  try {
    const j = await cachedJson("sentry", prox("https://ssd-api.jpl.nasa.gov/sentry.api"));
    const top = (j.data || [])
      .map((r) => ({ des: r.des || r.fullname, ip: parseFloat(r.ip), range: r.range }))
      .filter((r) => r.ip > 0)
      .sort((a, b) => b.ip - a.ip)
      .slice(0, 3);
    $("sentry-list").innerHTML = top.map((r) =>
      `<div class="watch-row"><b>${r.des}</b><span>1-in-${Math.round(1 / r.ip).toLocaleString("en-IN")} chance · sometime ${r.range}</span></div>`
    ).join("") || "<div class='watch-row'>Watch list unavailable.</div>";
  } catch (_) { $("sentry-list").innerHTML = "<div class='watch-row'>Watch list unavailable right now.</div>"; }
}

/* ---------- solar system right now (astronomy-engine) ---------- */

function drawOrrery() {
  const cv = $("orrery");
  if (!cv || !window.Astronomy) { if (cv) cv.style.display = "none"; return; }
  const ctx = cv.getContext("2d");
  const S = cv.width; // square
  const C = S / 2;
  const planets = [
    ["Mercury", "#b5a397"], ["Venus", "#e6c07a"], ["Earth", "#6ee7ff"], ["Mars", "#ff6f4d"],
    ["Jupiter", "#e0b184"], ["Saturn", "#d9c9a3"], ["Uranus", "#9fd8e0"], ["Neptune", "#6f8fff"],
  ];
  ctx.clearRect(0, 0, S, S);

  // sun
  ctx.fillStyle = "#ffd76a";
  ctx.shadowColor = "#ffd76a"; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.arc(C, C, 9, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  const now = new Date();
  planets.forEach(([name, color], i) => {
    const r = 34 + i * ((C - 48) / 7);
    ctx.strokeStyle = "rgba(140,180,255,0.14)";
    ctx.beginPath(); ctx.arc(C, C, r, 0, Math.PI * 2); ctx.stroke();
    try {
      const v = window.Astronomy.HelioVector(window.Astronomy.Body[name], now);
      const a = Math.atan2(v.y, v.x);
      const px = C + Math.cos(a) * r, py = C - Math.sin(a) * r;
      ctx.fillStyle = color;
      ctx.shadowColor = color; ctx.shadowBlur = name === "Earth" ? 14 : 6;
      ctx.beginPath(); ctx.arc(px, py, name === "Earth" ? 6 : 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = name === "Earth" ? "#6ee7ff" : "#8fa3c8";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(name === "Earth" ? "Earth (you)" : name, px, py - 10);
    } catch (_) {}
  });
}
