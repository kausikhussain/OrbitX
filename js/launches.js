// ==========================================================================
// Launch Tracker — Upcoming Rocket Launches (Launch Library 2 API)
// Prioritizes ISRO missions, calculates live countdown, resilient caching.
// ==========================================================================

const $ = (id) => document.getElementById(id);

let countdownInterval = null;

export async function initLaunches() {
  const chip = $("launch-chip");
  if (!chip) return;

  let list = null;
  const cacheKey = "ll2-cache-v2";

  // Check cache first (valid for 4 hours)
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
    if (cached && Date.now() - cached.t < 4 * 3600 * 1000 && Array.isArray(cached.d)) {
      list = cached.d;
    }
  } catch (_) {}

  if (!list) {
    try {
      const res = await fetch("https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=40&mode=list");
      if (res.ok) {
        const j = await res.json();
        list = (j.results || []).map((x) => ({
          name: x.name || "Mission",
          net: x.net,
          lsp: x.lsp_name || (x.launch_service_provider && x.launch_service_provider.name) || "Space Agency",
          pad: (x.pad && x.pad.name) || (x.location && x.location.name) || "",
        }));
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), d: list }));
        } catch (_) {}
      }
    } catch (err) {
      console.warn("[OrbitWatch] Launch Library 2 fetch error:", err.message);
    }
  }

  // If live fetch and cache both failed, use realistic reference upcoming schedule
  if (!list || !list.length) {
    try {
      const expired = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (expired && Array.isArray(expired.d)) list = expired.d;
    } catch (_) {}
  }

  const future = (list || []).filter((l) => l.net && new Date(l.net).getTime() > Date.now());
  if (!future.length) {
    // If no future launches found in feed, display clean standby status
    chip.classList.remove("hidden-hard");
    if ($("launch-label")) $("launch-label").textContent = "🚀 Space Launches";
    if ($("launch-rocket")) $("launch-rocket").textContent = "Awaiting schedule update";
    if ($("launch-count")) $("launch-count").textContent = "TBD";
    return;
  }

  // Prioritize ISRO launches if any are scheduled
  const isro = future.find((l) => /ISRO|Indian Space/i.test(l.lsp) || /PSLV|GSLV|LVM3|SSLV/i.test(l.name));
  const pick = isro || future[0];

  chip.classList.remove("hidden-hard");
  const isISRO = /ISRO|Indian Space/i.test(pick.lsp) || /PSLV|GSLV|LVM3|SSLV/i.test(pick.name);
  
  const missionName = (pick.name.split("|")[1] || pick.name).trim();
  const rocketName = (pick.name.split("|")[0] || "").trim();

  if ($("launch-label")) $("launch-label").textContent = (isISRO ? "🇮🇳 " : "🚀 ") + missionName;
  if ($("launch-rocket")) $("launch-rocket").textContent = `${isISRO ? "ISRO" : pick.lsp} · ${rocketName}`;

  const targetEpoch = new Date(pick.net).getTime();

  if (countdownInterval) clearInterval(countdownInterval);

  const tick = () => {
    let diffSec = Math.max(0, Math.floor((targetEpoch - Date.now()) / 1000));
    const d = Math.floor(diffSec / 86400);
    diffSec -= d * 86400;
    const h = Math.floor(diffSec / 3600);
    diffSec -= h * 3600;
    const m = Math.floor(diffSec / 60);
    const s = diffSec - m * 60;

    const countEl = $("launch-count");
    if (!countEl) return;

    if (d > 0) {
      countEl.textContent = `T− ${d}d ${h}h ${m}m`;
    } else {
      countEl.textContent = `T− ${h}h ${m}m ${String(s).padStart(2, "0")}s`;
    }
  };

  tick();
  countdownInterval = setInterval(tick, 1000);
}
