// NASA NeoWs (Near Earth Object Web Service) client with daily caching + sample fallback.
const API_KEY = "JzNSq7Webv1x2EiQ0tQujRgoYnmXdUZph3AdR2V0"; // personal key — 1000 req/hr

const LUNAR_KM = 384400;

function mapNeo(neo) {
  const ca = (neo.close_approach_data && neo.close_approach_data[0]) || null;
  const dm = neo.estimated_diameter.meters;
  return {
    id: neo.id,
    name: neo.name.replace(/[()]/g, "").trim(),
    diameterM: (dm.estimated_diameter_min + dm.estimated_diameter_max) / 2,
    hazardous: neo.is_potentially_hazardous_asteroid,
    missKm: ca ? parseFloat(ca.miss_distance.kilometers) : 5e6,
    velocityKmh: ca ? parseFloat(ca.relative_velocity.kilometers_per_hour) : 40000,
    time: ca ? (ca.close_approach_date_full || ca.close_approach_date) : "",
    epochMs: ca ? ca.epoch_date_close_approach : null,
    url: neo.nasa_jpl_url,
  };
}

// Realistic sample day (real asteroid names/figures) used if NASA is rate-limited or offline.
const SAMPLE = [
  { id: "s1", name: "2024 JV8", diameterM: 34, hazardous: false, missKm: 912000, velocityKmh: 28400, time: "Today 04:12 UTC", url: "https://cneos.jpl.nasa.gov/" },
  { id: "s2", name: "2019 UO7", diameterM: 155, hazardous: true, missKm: 4890000, velocityKmh: 61200, time: "Today 07:45 UTC", url: "https://cneos.jpl.nasa.gov/" },
  { id: "s3", name: "2013 GM3", diameterM: 88, hazardous: false, missKm: 2140000, velocityKmh: 33900, time: "Today 09:03 UTC", url: "https://cneos.jpl.nasa.gov/" },
  { id: "s4", name: "2025 AC2", diameterM: 12, hazardous: false, missKm: 386000, velocityKmh: 45700, time: "Today 11:58 UTC", url: "https://cneos.jpl.nasa.gov/" },
  { id: "s5", name: "467460 2006 JF42", diameterM: 420, hazardous: true, missKm: 26300000, velocityKmh: 40600, time: "Today 13:22 UTC", url: "https://cneos.jpl.nasa.gov/" },
  { id: "s6", name: "2021 XT4", diameterM: 61, hazardous: false, missKm: 7420000, velocityKmh: 52100, time: "Today 15:47 UTC", url: "https://cneos.jpl.nasa.gov/" },
  { id: "s7", name: "2018 PN22", diameterM: 23, hazardous: false, missKm: 1560000, velocityKmh: 21800, time: "Today 18:30 UTC", url: "https://cneos.jpl.nasa.gov/" },
  { id: "s8", name: "2020 SW6", diameterM: 190, hazardous: false, missKm: 14800000, velocityKmh: 68400, time: "Today 20:15 UTC", url: "https://cneos.jpl.nasa.gov/" },
  { id: "s9", name: "2016 RF34", diameterM: 47, hazardous: false, missKm: 5230000, velocityKmh: 37200, time: "Today 22:51 UTC", url: "https://cneos.jpl.nasa.gov/" },
];

export async function fetchAsteroids(dateStr) {
  const today = dateStr || new Date().toISOString().slice(0, 10);
  const cacheKey = "orbitwatch-v2-" + today; // bump version when the mapped shape changes

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const list = JSON.parse(cached);
      if (Array.isArray(list) && list.length) return { asteroids: list, source: "live" };
    }
  } catch (_) { /* private mode etc. */ }

  try {
    const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("NASA responded " + res.status);
    const data = await res.json();
    const days = data.near_earth_objects || {};
    const list = Object.values(days).flat().map(mapNeo)
      .sort((a, b) => a.missKm - b.missKm);
    if (!list.length) throw new Error("empty feed");
    try { localStorage.setItem(cacheKey, JSON.stringify(list)); } catch (_) {}
    return { asteroids: list, source: "live" };
  } catch (err) {
    console.warn("[OrbitWatch] NASA fetch failed, using sample data:", err.message);
    return {
      asteroids: SAMPLE
        .map((s, i) => ({ ...s, epochMs: Date.now() + (i - 4) * 7.2e6 }))
        .sort((a, b) => a.missKm - b.missKm),
      source: "sample",
    };
  }
}

export const LUNAR_DISTANCE_KM = LUNAR_KM;
