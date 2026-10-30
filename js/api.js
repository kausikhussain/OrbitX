// ==========================================================================
// NASA NeoWs (Near Earth Object Web Service) Client
// Robust caching, configurable API key, stale-request cancellation & fallback.
// ==========================================================================

const DEFAULT_API_KEY = "JzNSq7Webv1x2EiQ0tQujRgoYnmXdUZph3AdR2V0";

export function getApiKey() {
  try {
    return window.ORBIT_WATCH_API_KEY || localStorage.getItem("nasa_api_key") || DEFAULT_API_KEY;
  } catch (_) {
    return DEFAULT_API_KEY;
  }
}

export function setApiKey(key) {
  try {
    if (key) localStorage.setItem("nasa_api_key", key);
    else localStorage.removeItem("nasa_api_key");
  } catch (_) {}
}

export const LUNAR_DISTANCE_KM = 384400;

function mapNeo(neo) {
  const ca = (neo.close_approach_data && neo.close_approach_data[0]) || null;
  const dm = neo.estimated_diameter && neo.estimated_diameter.meters
    ? neo.estimated_diameter.meters
    : { estimated_diameter_min: 20, estimated_diameter_max: 50 };

  const minD = dm.estimated_diameter_min || 20;
  const maxD = dm.estimated_diameter_max || 50;

  return {
    id: neo.id || String(Math.random()),
    name: (neo.name || "").replace(/[()]/g, "").trim(),
    designation: neo.designation || neo.name || "Unknown",
    diameterM: (minD + maxD) / 2,
    diameterMinM: minD,
    diameterMaxM: maxD,
    hazardous: Boolean(neo.is_potentially_hazardous_asteroid),
    missKm: ca ? parseFloat(ca.miss_distance.kilometers) : 5e6,
    velocityKmh: ca ? parseFloat(ca.relative_velocity.kilometers_per_hour) : 42000,
    time: ca ? (ca.close_approach_date_full || ca.close_approach_date) : "",
    epochMs: ca ? ca.epoch_date_close_approach : null,
    magnitudeH: neo.absolute_magnitude_h !== undefined ? neo.absolute_magnitude_h : null,
    url: neo.nasa_jpl_url || `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(neo.name || "")}`,
  };
}

// Realistic sample asteroids (authentic catalog designations and physical estimates)
// used when NASA is rate-limited, offline, or inaccessible.
const SAMPLE = [
  { id: "s1", name: "2024 JV8", designation: "2024 JV8", diameterM: 34, diameterMinM: 25, diameterMaxM: 55, hazardous: false, missKm: 912000, velocityKmh: 28400, time: "Today 04:12 UTC", magnitudeH: 24.8, url: "https://cneos.jpl.nasa.gov/" },
  { id: "s2", name: "2019 UO7", designation: "2019 UO7", diameterM: 155, diameterMinM: 110, diameterMaxM: 240, hazardous: true, missKm: 4890000, velocityKmh: 61200, time: "Today 07:45 UTC", magnitudeH: 21.2, url: "https://cneos.jpl.nasa.gov/" },
  { id: "s3", name: "2013 GM3", designation: "2013 GM3", diameterM: 88, diameterMinM: 60, diameterMaxM: 135, hazardous: false, missKm: 2140000, velocityKmh: 33900, time: "Today 09:03 UTC", magnitudeH: 22.6, url: "https://cneos.jpl.nasa.gov/" },
  { id: "s4", name: "2025 AC2", designation: "2025 AC2", diameterM: 12, diameterMinM: 8, diameterMaxM: 18, hazardous: false, missKm: 386000, velocityKmh: 45700, time: "Today 11:58 UTC", magnitudeH: 26.9, url: "https://cneos.jpl.nasa.gov/" },
  { id: "s5", name: "467460 2006 JF42", designation: "467460", diameterM: 420, diameterMinM: 310, diameterMaxM: 690, hazardous: true, missKm: 26300000, velocityKmh: 40600, time: "Today 13:22 UTC", magnitudeH: 19.1, url: "https://cneos.jpl.nasa.gov/" },
  { id: "s6", name: "2021 XT4", designation: "2021 XT4", diameterM: 61, diameterMinM: 42, diameterMaxM: 95, hazardous: false, missKm: 7420000, velocityKmh: 52100, time: "Today 15:47 UTC", magnitudeH: 23.4, url: "https://cneos.jpl.nasa.gov/" },
  { id: "s7", name: "2018 PN22", designation: "2018 PN22", diameterM: 23, diameterMinM: 16, diameterMaxM: 36, hazardous: false, missKm: 1560000, velocityKmh: 21800, time: "Today 18:30 UTC", magnitudeH: 25.5, url: "https://cneos.jpl.nasa.gov/" },
  { id: "s8", name: "2020 SW6", designation: "2020 SW6", diameterM: 190, diameterMinM: 130, diameterMaxM: 290, hazardous: false, missKm: 14800000, velocityKmh: 68400, time: "Today 20:15 UTC", magnitudeH: 20.8, url: "https://cneos.jpl.nasa.gov/" },
  { id: "s9", name: "2016 RF34", designation: "2016 RF34", diameterM: 47, diameterMinM: 32, diameterMaxM: 72, hazardous: false, missKm: 5230000, velocityKmh: 37200, time: "Today 22:51 UTC", magnitudeH: 24.1, url: "https://cneos.jpl.nasa.gov/" },
];

let activeAbortController = null;

export async function fetchAsteroids(dateStr, options = {}) {
  const forceRefresh = Boolean(options.forceRefresh);
  const today = dateStr || new Date().toISOString().slice(0, 10);
  const cacheKey = "orbitwatch-v3-" + today;

  // Check cache first (unless force refresh requested)
  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list) && list.length) {
          return { asteroids: list, source: "cached", date: today };
        }
      }
    } catch (_) {}
  }

  // Cancel any prior in-flight request to avoid race conditions on rapid date switching
  if (activeAbortController) {
    activeAbortController.abort();
  }
  activeAbortController = new AbortController();
  const signal = activeAbortController.signal;

  try {
    const key = getApiKey();
    const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${key}`;
    
    // Set 12-second timeout
    const timeoutId = setTimeout(() => {
      activeAbortController.abort();
    }, 12000);

    const res = await fetch(url, { signal }).finally(() => clearTimeout(timeoutId));
    if (!res.ok) throw new Error("NASA API responded " + res.status);
    
    const data = await res.json();
    const days = data.near_earth_objects || {};
    const list = Object.values(days).flat().map(mapNeo)
      .sort((a, b) => a.missKm - b.missKm);

    if (!list.length) throw new Error("No objects returned for this date in NASA feed");

    try {
      localStorage.setItem(cacheKey, JSON.stringify(list));
    } catch (_) {}

    return { asteroids: list, source: "live", date: today };
  } catch (err) {
    if (signal.aborted && err.name === "AbortError") {
      throw err; // Allow caller to ignore aborted requests
    }

    console.warn("[OrbitWatch] NASA API query unavailable, serving reference fallback:", err.message);

    // Build realistic sample data with current relative times
    const baseEpoch = new Date(today + "T00:00:00Z").getTime() || Date.now();
    const sampleList = SAMPLE.map((s, i) => ({
      ...s,
      epochMs: baseEpoch + (i + 1) * 2.4 * 3600 * 1000,
    })).sort((a, b) => a.missKm - b.missKm);

    return {
      asteroids: sampleList,
      source: "sample",
      date: today,
      errorDetail: err.message,
    };
  }
}
